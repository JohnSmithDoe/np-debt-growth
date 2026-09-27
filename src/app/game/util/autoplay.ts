import type { Consultancy } from '../model/consultancy.model';
import {
  FINAL_SKILL_ID,
  SECRET_SKILL_ID,
  SKILL_BY_ID,
  SKILL_NODES,
} from '../model/skill.model';
import type { PurchaseId } from '../model/balance/progression';
import { PURCHASE_IDS } from '../model/balance/progression';
import { SPAWNED_TICKET_IDS, SPAWNERS } from '../model/spawner.model';
import { advise, apply } from './advisor';
import * as economy from './economy';
import * as purchase from './purchase';
import type { SimPolicy } from './sim';
import { flow } from './sim';

/**
 * A whole run with no board: earn what `sim.flow` says, spend like a player.
 * The policy is data, so the pacing can be measured for more than one player.
 */

export interface AutoplayPolicy extends SimPolicy {
  /** Never spend more than this share of the budget on one purchase. */
  readonly spendFraction: number;
  readonly spendEveryMs: number;
  /** Bought first, in order, before anything else on the tree. */
  readonly openingPath: readonly string[];
  /** Hold story points for the next ADR once it is this many seconds of SP away. */
  readonly saveForAdrSec: number;
}

export const DEFAULT_POLICY: AutoplayPolicy = {
  clicksPerSec: 1,
  spendFraction: 0.25,
  spendEveryMs: 5_000,
  openingPath: ['radius', 'capacity', 'duration'],
  saveForAdrSec: 0,
};

export interface LedgerMark {
  readonly at: number;
  readonly handClosed: number;
  readonly crewClosed: number;
  readonly handEuro: number;
  readonly crewEuro: number;
}

export interface Run {
  readonly end: Consultancy;
  /** Milestone label → run ms it was first reached. */
  readonly reached: ReadonlyMap<string, number>;
  /** One state every `sampleEveryMs`. */
  readonly samples: readonly Consultancy[];
  readonly ledger: readonly LedgerMark[];
}

export type Milestone = readonly [string, (state: Consultancy) => boolean];

const STEP_MS = 1_000;
const SAMPLE_EVERY_MS = 30_000;

export type Spender = (
  state: Consultancy,
  policy: AutoplayPolicy
) => Consultancy;

export function autoplay(
  start: Consultancy,
  milestones: readonly Milestone[],
  limitMs: number,
  policy: AutoplayPolicy = DEFAULT_POLICY,
  spender: Spender = spend
): Run {
  let state = start;
  const reached = new Map<string, number>();
  const samples: Consultancy[] = [];
  const ledger: LedgerMark[] = [];
  let mark = { handClosed: 0, crewClosed: 0, handEuro: 0, crewEuro: 0 };
  let spentAt = -Infinity;

  for (let at = STEP_MS; at <= limitMs; at += STEP_MS) {
    state = earn(state, policy, STEP_MS / 1000, (f, seconds) => {
      mark = {
        handClosed: mark.handClosed + f.handPerSec * seconds,
        crewClosed: mark.crewClosed + f.crewPerSec * seconds,
        handEuro: mark.handEuro + f.handEuroPerSec * seconds,
        crewEuro: mark.crewEuro + f.crewEuroPerSec * seconds,
      };
    });
    if (at - spentAt >= policy.spendEveryMs) {
      state = spender(state, policy);
      spentAt = at;
    }
    for (const [label, holds] of milestones) {
      if (!reached.has(label) && holds(state)) reached.set(label, at);
    }
    if (at % SAMPLE_EVERY_MS === 0) {
      samples.push(state);
      ledger.push({ at, ...mark });
    }
    if (reached.size === milestones.length) break;
  }
  return { end: state, reached, samples, ledger };
}

function earn(
  state: Consultancy,
  policy: SimPolicy,
  seconds: number,
  book: (f: ReturnType<typeof flow>, seconds: number) => void
): Consultancy {
  const f = flow(state, policy);
  book(f, seconds);
  const euros = f.euroPerSec * seconds;
  const awards = economy.pendingAwards(state);
  return {
    ...state,
    budget: state.budget + euros,
    storyPoints: state.storyPoints + f.spPerSec * seconds,
    achievements: [...state.achievements, ...awards.map((award) => award.id)],
    lifetimeBilled: state.lifetimeBilled + euros,
    lifetimeWorkBilled: state.lifetimeWorkBilled + euros,
    lifetimeCrewBilled: state.lifetimeCrewBilled + f.crewEuroPerSec * seconds,
    lifetimeClosed:
      state.lifetimeClosed + (f.handPerSec + f.crewPerSec) * seconds,
    runMs: state.runMs + seconds * 1000,
    lastTick: state.lastTick + seconds * 1000,
  };
}

/** Buys greedily, cheapest first, until nothing affordable is left. */
export function spend(state: Consultancy, policy: AutoplayPolicy): Consultancy {
  let next = state;
  if ((next.skills['duration'] ?? 0) < 1) {
    for (const id of policy.openingPath)
      next = purchase.buySkill(next, id) ?? next;
  }
  const saving = savingForAdr(next, policy);
  next = buyCheapest(next, (s) => skillOffers(s, saving));
  for (
    let id = purchase.nextAdrNodeId(next);
    id;
    id = purchase.nextAdrNodeId(next)
  ) {
    const bought = purchase.buySkill(next, id);
    if (!bought) break;
    next = bought;
  }
  const budgetCap = (s: Consultancy): number => s.budget * policy.spendFraction;
  next = buyCheapest(next, (s) =>
    PURCHASE_IDS.filter(
      (line) => economy.canBuyLine(s, line) && wants(s, line)
    ).map((line) => ({
      cost: economy.lineCost(s, line),
      cap: budgetCap(s),
      buy: () => purchase.buyLine(s, line),
    }))
  );
  next = buyCheapest(next, (s) =>
    SPAWNERS.filter((row) => economy.canBuySpawner(s, row.adr)).map((row) => ({
      cost: economy.spawnerCost(s, row.adr),
      cap: budgetCap(s),
      buy: () => purchase.buySpawner(s, row.adr),
    }))
  );
  next = buyCheapest(next, (s) =>
    SPAWNED_TICKET_IDS.filter((id) => economy.canBuyIncome(s, id)).map(
      (id) => ({
        cost: economy.incomeCost(s, id),
        cap: budgetCap(s),
        buy: () => purchase.buyIncome(s, id),
      })
    )
  );
  return next;
}

const ADVISED_BUYS_PER_SPEND = 200;

/** Buys whatever the advisor names while it is affordable, and saves otherwise. */
export function advisedSpend(
  state: Consultancy,
  policy: AutoplayPolicy
): Consultancy {
  let next = state;
  for (let n = 0; n < ADVISED_BUYS_PER_SPEND; n += 1) {
    const advice = advise(next, policy);
    const due = [advice.sp, advice.eur].find((pick) => pick?.waitSec === 0);
    const bought = due ? apply(next, due.buy) : null;
    if (!bought) return next;
    next = bought;
  }
  return next;
}

interface Offer {
  readonly cost: number;
  readonly cap: number;
  readonly buy: () => Consultancy | null;
}

function buyCheapest(
  state: Consultancy,
  offers: (state: Consultancy) => readonly Offer[]
): Consultancy {
  let next = state;
  for (;;) {
    const best = offers(next)
      .filter((offer) => offer.cost <= offer.cap)
      .sort((a, b) => a.cost - b.cost)[0];
    const bought = best?.buy();
    if (!bought) return next;
    next = bought;
  }
}

function savingForAdr(state: Consultancy, policy: AutoplayPolicy): boolean {
  const id = purchase.nextAdrNodeId(state);
  if (id === null || policy.saveForAdrSec <= 0) return false;
  const short = economy.skillRankCost(state, id) - state.storyPoints;
  return short <= flow(state, policy).spPerSec * policy.saveForAdrSec;
}

/** Tree nodes are bought in SP, the whole balance available unless it is held for an ADR. */
function skillOffers(state: Consultancy, saving: boolean): readonly Offer[] {
  return SKILL_NODES.filter(
    (node) =>
      node.id !== SECRET_SKILL_ID && purchase.skillAvailable(state, node.id)
  ).map((node) => {
    const eur = SKILL_BY_ID.get(node.id)?.currency === 'eur';
    return {
      cost: economy.skillRankCost(state, node.id),
      cap: eur
        ? node.id === FINAL_SKILL_ID
          ? state.budget
          : state.budget * DEFAULT_POLICY.spendFraction
        : saving
          ? 0
          : state.storyPoints,
      buy: () => purchase.buySkill(state, node.id),
    };
  });
}

function wants(state: Consultancy, line: PurchaseId): boolean {
  switch (line) {
    case 'junior':
    case 'senior':
      return (
        state.levels[line] < economy.lineCap(state, line) &&
        economy.crewCeilingPerSec(state) < economy.ceilingPerSec(state) * 0.5
      );
    case 'velocity':
      return true;
    case 'kit':
      return economy.kitNext(state) !== null;
    case 'manager':
      return (
        state.levels.manager < economy.lineCap(state, 'manager') &&
        state.tier >= 2
      );
  }
}

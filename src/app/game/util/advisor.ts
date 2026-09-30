/*
 * ADR_SLACK: 0 stalls in tier 1, the first junior pays back too late for a
 * one-step estimate; 0.5 dawdles, a run 4 min longer. Measured best at 0.2
 * with POCKET_SHARE 0.05.
 */
import type { Consultancy } from '../model/consultancy.model';
import {
  FINAL_SKILL_ID,
  SECRET_SKILL_ID,
  SKILL_NODES,
} from '../model/skill.model';
import { MAX_TIER } from '../model/tier.model';
import type { TicketTypeId } from '../model/ticket.model';
import type { PurchaseId } from '../model/balance/progression';
import { PURCHASE_IDS } from '../model/balance/progression';
import { SPAWNED_TICKET_IDS, SPAWNERS } from '../model/spawner.model';
import * as economy from './economy';
import * as purchase from './purchase';
import type { Flow, SimPolicy } from './sim';
import { flow } from './sim';

export type Buy =
  | { readonly kind: 'skill'; readonly id: string }
  | { readonly kind: 'credit'; readonly id: string }
  | { readonly kind: 'line'; readonly line: PurchaseId }
  | { readonly kind: 'spawner'; readonly adr: number }
  | { readonly kind: 'income'; readonly id: TicketTypeId };

type Currency = 'eur' | 'sp';

export interface Pick {
  readonly buy: Buy;
  readonly currency: Currency;
  readonly cost: number;
  readonly waitSec: number;
  readonly perSec: number;
  readonly score: number;
  readonly then: Buy | null;
  readonly spare?: true;
}

export interface Advice {
  readonly eur: Pick | null;
  readonly sp: Pick | null;
}

const SCORE_FLOOR = 1e-9;

const RATE_FLOOR = 0.1;
const UNLIMITED = 1e300;

export function buyKey(buy: Buy): string {
  switch (buy.kind) {
    case 'skill':
      return `skill:${buy.id}`;
    case 'credit':
      return `credit:${buy.id}`;
    case 'line':
      return `line:${buy.line}`;
    case 'spawner':
      return `spawner:${buy.adr}`;
    case 'income':
      return `income:${buy.id}`;
  }
}

export function apply(state: Consultancy, buy: Buy): Consultancy | null {
  switch (buy.kind) {
    case 'skill':
      return purchase.buySkill(state, buy.id);
    case 'credit':
      return purchase.approveOnCredit(state, buy.id);
    case 'line':
      return purchase.buyLine(state, buy.line);
    case 'spawner':
      return purchase.buySpawner(state, buy.adr);
    case 'income':
      return purchase.buyIncome(state, buy.id);
  }
}

function costOf(
  state: Consultancy,
  buy: Buy
): { currency: Currency; cost: number } {
  switch (buy.kind) {
    case 'skill':
      return { currency: 'sp', cost: economy.skillRankCost(state, buy.id) };
    case 'credit':
      return { currency: 'sp', cost: state.storyPoints };
    case 'line':
      return { currency: 'eur', cost: economy.lineCost(state, buy.line) };
    case 'spawner':
      return { currency: 'eur', cost: economy.spawnerCost(state, buy.adr) };
    case 'income':
      return { currency: 'eur', cost: economy.incomeCost(state, buy.id) };
  }
}

function offers(state: Consultancy): Buy[] {
  const rich = { ...state, budget: UNLIMITED, storyPoints: UNLIMITED };
  const out: Buy[] = [];
  for (const node of SKILL_NODES) {
    if (node.id === SECRET_SKILL_ID || node.id === FINAL_SKILL_ID) continue;
    if (purchase.skillAvailable(state, node.id))
      out.push({ kind: 'skill', id: node.id });
  }
  for (const line of PURCHASE_IDS) {
    if (line === 'kit' && economy.kitNext(state) === null) continue;
    if (economy.canBuyLine(rich, line)) out.push({ kind: 'line', line });
  }
  for (const row of SPAWNERS) {
    if (economy.canBuySpawner(rich, row.adr))
      out.push({ kind: 'spawner', adr: row.adr });
  }
  for (const id of SPAWNED_TICKET_IDS) {
    if (economy.canBuyIncome(rich, id)) out.push({ kind: 'income', id });
  }
  return out;
}

interface Rates {
  readonly eur: number;
  readonly sp: number;
}

const ratesOf = (f: Flow): Rates => ({
  eur: Math.max(RATE_FLOOR, f.euroPerSec),
  sp: Math.max(RATE_FLOOR, f.spPerSec),
});

function held(state: Consultancy, currency: Currency): number {
  return currency === 'eur' ? state.budget : state.storyPoints;
}

function waitFor(
  state: Consultancy,
  rates: Rates,
  currency: Currency,
  cost: number
): number {
  return Math.max(0, cost - held(state, currency)) / rates[currency];
}

interface Candidate {
  readonly buy: Buy;
  readonly then: Buy | null;
  readonly currency: Currency;
  readonly cost: number;
  readonly score: number;
}

function rank(state: Consultancy, policy: SimPolicy): Candidate[] {
  const now = ratesOf(flow(state, policy));
  const spMatters = state.tier < MAX_TIER;
  const rich = { ...state, budget: UNLIMITED, storyPoints: UNLIMITED };
  const open = offers(state);
  const before = new Set(open.map(buyKey));

  const growth = (after: Consultancy): number => {
    const next = ratesOf(flow(after, policy));
    return (
      Math.log(next.eur / now.eur) +
      (spMatters ? Math.log(next.sp / now.sp) : 0)
    );
  };
  const spent = (eur: number, sp: number): number =>
    eur / now.eur + sp / now.sp;

  const out: Candidate[] = [];
  for (const buy of open) {
    const { currency, cost } = costOf(state, buy);
    const after = apply(rich, buy);
    if (!after || !Number.isFinite(cost)) continue;
    const eur = currency === 'eur' ? cost : 0;
    const sp = currency === 'sp' ? cost : 0;
    let best: Candidate = {
      buy,
      then: null,
      currency,
      cost,
      score: growth(after) / Math.max(1e-9, spent(eur, sp)),
    };
    for (const next of offers(after)) {
      if (before.has(buyKey(next))) continue;
      const opened = apply(after, next);
      const price = costOf(after, next);
      if (!opened || !Number.isFinite(price.cost)) continue;
      const score =
        growth(opened) /
        Math.max(
          1e-9,
          spent(
            eur + (price.currency === 'eur' ? price.cost : 0),
            sp + (price.currency === 'sp' ? price.cost : 0)
          )
        );
      if (score > best.score) best = { ...best, then: next, score };
    }
    if (best.score > SCORE_FLOOR) out.push(best);
  }
  return out.sort((a, b) => b.score - a.score);
}

interface Goal {
  readonly buy: Buy;
  readonly currency: Currency;
  readonly cost: number;
}

function goalOf(state: Consultancy, id: string): Goal {
  const buy: Buy = { kind: 'skill', id };
  return { buy, ...costOf(state, buy) };
}

function secondsTo(
  state: Consultancy,
  policy: SimPolicy,
  goal: Goal,
  buy: Buy | null
): number {
  const rates = ratesOf(flow(state, policy));
  if (buy === null) return waitFor(state, rates, goal.currency, goal.cost);
  const { currency, cost } = costOf(state, buy);
  if (currency !== goal.currency) return Number.POSITIVE_INFINITY;
  const funded = {
    ...state,
    budget: currency === 'eur' ? Math.max(state.budget, cost) : UNLIMITED,
    storyPoints:
      currency === 'sp' ? Math.max(state.storyPoints, cost) : UNLIMITED,
  };
  const after = apply(funded, buy);
  if (!after) return Number.POSITIVE_INFINITY;
  const left =
    currency === 'eur'
      ? { ...after, storyPoints: state.storyPoints }
      : { ...after, budget: state.budget };
  return (
    waitFor(state, rates, currency, cost) +
    waitFor(left, ratesOf(flow(after, policy)), goal.currency, goal.cost)
  );
}

const ADR_SLACK = 0.2;

function towards(
  state: Consultancy,
  policy: SimPolicy,
  ranked: readonly Candidate[],
  goal: Goal,
  slack: number | null
): Pick {
  const direct = secondsTo(state, policy, goal, null);
  let best: Candidate = { ...goal, then: null, score: 0 };
  let fastest = direct;
  for (const c of ranked) {
    if (c.currency !== goal.currency || buyKey(c.buy) === buyKey(goal.buy))
      continue;
    const eta = secondsTo(state, policy, goal, c.buy);
    if (slack !== null && eta <= direct * (1 + slack))
      return toPick(state, policy, c);
    if (slack === null && eta < fastest) {
      fastest = eta;
      best = c;
    }
  }
  return toPick(state, policy, best);
}

function toPick(state: Consultancy, policy: SimPolicy, c: Candidate): Pick {
  const f = flow(state, policy);
  return {
    buy: c.buy,
    currency: c.currency,
    cost: c.cost,
    waitSec: waitFor(state, ratesOf(f), c.currency, c.cost),
    perSec: c.currency === 'eur' ? f.euroPerSec : f.spPerSec,
    score: c.score,
    then: c.then,
  };
}

function spare(state: Consultancy, policy: SimPolicy): Pick | null {
  let cheapest: Candidate | null = null;
  for (const buy of offers(state)) {
    const { currency, cost } = costOf(state, buy);
    if (currency !== 'sp' || !Number.isFinite(cost)) continue;
    if (!cheapest || cost < cheapest.cost)
      cheapest = { buy, then: null, currency, cost, score: 0 };
  }
  return cheapest ? { ...toPick(state, policy, cheapest), spare: true } : null;
}

const POCKET_SHARE = 0.05;

function pocketChange(
  state: Consultancy,
  policy: SimPolicy,
  goal: Goal
): Pick | null {
  const limit = goal.cost * POCKET_SHARE;
  let cheapest: Candidate | null = null;
  for (const buy of offers(state)) {
    const cost = costOf(state, buy);
    if (cost.currency !== goal.currency || !(cost.cost <= limit)) continue;
    if (!cheapest || cost.cost < cheapest.cost)
      cheapest = { buy, then: null, ...cost, score: 0 };
  }
  return cheapest ? toPick(state, policy, cheapest) : null;
}

export function advise(state: Consultancy, policy: SimPolicy): Advice {
  if (state.endedAt > 0) return { eur: null, sp: null };
  const ranked = rank(state, policy);
  const top = (currency: Currency): Pick | null => {
    const found = ranked.find((c) => c.currency === currency);
    return found ? toPick(state, policy, found) : null;
  };
  const goal = purchase.nextAdrNodeId(state) ?? FINAL_SKILL_ID;
  if (purchase.creditOffer(state, goal) !== null) {
    const credit: Candidate = {
      buy: { kind: 'credit', id: goal },
      then: null,
      currency: 'sp',
      cost: state.storyPoints,
      score: 0,
    };
    return { eur: top('eur'), sp: toPick(state, policy, credit) };
  }
  const target = goalOf(state, goal);
  const sp = purchase.skillAvailable(state, goal)
    ? (pocketChange(state, policy, target) ??
      towards(state, policy, ranked, target, ADR_SLACK))
    : (top('sp') ?? spare(state, policy));
  return { eur: top('eur'), sp };
}

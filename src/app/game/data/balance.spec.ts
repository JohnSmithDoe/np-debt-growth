import { describe, expect, it } from 'vitest';

import { GameStore } from './game.store';

import type { BoardTicket } from '../model/board.model';
import { ticketMix } from '../model/board.model';
import type { Consultancy } from '../model/consultancy.model';
import { freshConsultancy } from '../model/consultancy.model';
import { SAVE_VERSION } from '../model/game.consts';
import {
  SECRET_SKILL_ID,
  SKILL_BY_ID,
  SKILL_NODES,
} from '../model/skill.model';
import type { TicketTypeId } from '../model/ticket.model';
import { TICKET_TYPES } from '../model/ticket.model';
import { DEBT_TIERS } from '../model/tier.model';
import type { PurchaseId } from '../model/balance/progression';
import { TRAIT_IDS } from '../model/senior.model';

/** Design bound: no single trait may make a senior worth more than this many. */
const TRAIT_D21_CEILING = 1.25;
import { pickWithin } from '../util/board';
import * as economy from '../util/economy';

const CREW_EURO_FLOOR = 0.15;
const CREW_EURO_CAP = 0.95;

const CREW_EURO_WINDOW_FLOOR = 0.05;
const WINDOW_MARKS = 4;

const CLICKS_PER_SEC = Number(process.env['CB_CPS'] ?? 1);
const STEP_MS = 100;
const MAX_SESSION_MS = Number(process.env['CB_MAXMS'] ?? 4 * 60 * 60 * 1000);
const PURCHASE_SPEND_FRACTION = 0.25;
const PROCESS_PATH = ['root', 'radius', 'capacity', 'duration'] as const;

function everySkill(): Record<string, number> {
  return Object.fromEntries(
    SKILL_NODES.filter((node) => node.id !== SECRET_SKILL_ID).map((node) => [
      node.id,
      node.levels.length,
    ])
  );
}

const MILESTONES = [
  ['first junior', (s: Consultancy) => s.levels.junior >= 1],
  ['tier 1', (s: Consultancy) => s.tier >= 1],
  ['tier 2', (s: Consultancy) => s.tier >= 2],
  ['tier 3', (s: Consultancy) => s.tier >= 3],
  ['tier 4', (s: Consultancy) => s.tier >= 4],
  ['tier 5', (s: Consultancy) => s.tier >= 5],
  ['tier 6', (s: Consultancy) => s.tier >= 6],
  ['tier 7', (s: Consultancy) => s.tier >= 7],
  ['tier 8', (s: Consultancy) => s.tier >= 8],
] as const;

const UNORDERED_MILESTONES = [
  ['longer rounds', (s: Consultancy) => (s.skills['duration'] ?? 0) >= 1],
  [
    'tree opened',
    (s: Consultancy) =>
      SKILL_NODES.every(
        (n) =>
          n.id === SECRET_SKILL_ID ||
          n.heading === true ||
          (s.skills[n.id] ?? 0) >= 1
      ),
  ],
] as const;

interface Share {
  readonly at: number;
  readonly crew: number;
  readonly hand: number;
  readonly board: number;
  readonly auto: number;
  readonly crewEuro: number;
  readonly handEuro: number;
  readonly autoEuro: number;
  readonly retainerEuro: number;
}

interface Scored {
  readonly seq: number;
  readonly tier: number;
  readonly billed: number;
  readonly target: number | null;
}

class Playthrough {
  readonly store = new GameStore();
  readonly samples: Consultancy[] = [];
  readonly reached = new Map<string, number>();
  readonly billed = new Map<string, number>();
  readonly clicked = new Map<string, number>();
  readonly rounded = new Map<string, number>();
  readonly ledger: Share[] = [];
  readonly rounds: Scored[] = [];

  #now = 0;
  #handCredit = 0;
  #crew = 0;
  #hand = 0;
  #board = 0;
  #crewEuro = 0;
  #handEuro = 0;
  #retainerEuro = 0;
  #auto = 0;
  #autoEuro = 0;
  #clicks = 0;
  #rounds = 0;

  constructor() {
    let seed = Number(process.env['CB_SEED'] ?? 1);
    this.store.seedRandom(
      () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648
    );
    this.store.hydrate(freshConsultancy(0, SAVE_VERSION));
  }

  run(limitMs = MAX_SESSION_MS): this {
    const steps = Math.round(limitMs / STEP_MS);
    for (let step = 0; step < steps; step += 1) {
      this.#step();
      if (this.#finished()) break;
    }
    return this;
  }

  #finished(): boolean {
    return MILESTONES.every(([label]) => this.reached.has(label));
  }

  #step(): void {
    this.#now += STEP_MS;

    const atStep = this.store.lifetimeClosed();
    const euroAtStep = this.#inSprint();
    const autoAtStep = this.store.autoClosed();
    const autoEuroAtStep = this.store.autoValue();
    this.store.advanceTo(this.#now);
    const afterCrew = this.store.lifetimeClosed();
    const euroAfterCrew = this.#inSprint();
    const auto = this.store.autoClosed() - autoAtStep;
    const autoEuro = this.store.autoValue() - autoEuroAtStep;
    this.#auto += auto;
    this.#autoEuro += autoEuro;
    this.#crew += afterCrew - atStep - auto;
    this.#crewEuro += Math.max(0, euroAfterCrew - euroAtStep - autoEuro);

    this.#retainerEuro = this.store.retainerBilled();

    const byHand = this.#handsOn() ? this.#playerClicks(STEP_MS / 1000) : 0;
    this.#hand += byHand;
    this.#handEuro += Math.max(0, this.#inSprint() - euroAfterCrew);
    this.#board += this.store.lifetimeClosed() - afterCrew - byHand;

    this.#turnRound();
    this.#record();
  }

  #turnRound(): void {
    if (this.store.phase() === 'collecting') return;
    this.#score();
    this.#spend();
    this.store.startRound(this.#now);
    this.#rounds += 1;
  }

  #score(): void {
    const outcome = this.store.lastRound();
    if (!outcome || this.rounds.at(-1)?.seq === outcome.seq) return;
    this.rounds.push({
      seq: outcome.seq,
      tier: this.store.snapshot().tier,
      billed: outcome.billed,
      target: this.store.lastTarget(),
    });
  }

  #handsOn(): boolean {
    return this.store.running();
  }

  #playerClicks(seconds: number): number {
    this.#handCredit += CLICKS_PER_SEC * seconds;
    const clicks = Math.floor(this.#handCredit);
    if (clicks <= 0) return 0;
    this.#handCredit -= clicks;

    let taken = 0;
    for (let click = 0; click < clicks; click += 1) {
      const aim = this.#aim();
      if (!aim) break;
      const ids = pickWithin(
        this.store.board,
        aim.x,
        aim.y,
        economy.clickRadius(this.store.snapshot())
      );
      if (ids.length === 0) break;
      this.#clicks += 1;
      taken += this.store.harvest(ids).taken.length;
    }
    return taken;
  }

  #aim(): BoardTicket | null {
    const state = this.store.snapshot();
    const worth = (id: TicketTypeId): number =>
      (TICKET_TYPES[id].effect === 'decline' ? 1e12 : 0) +
      (TICKET_TYPES[id].handOnly ? 1e9 : 0) +
      economy.ticketValue(state, id);
    let best: BoardTicket | null = null;
    for (const ticket of this.store.board.tickets) {
      if (!best || worth(ticket.type) > worth(best.type)) best = ticket;
    }
    return best;
  }

  #inSprint(): number {
    const state = this.store.snapshot();
    return economy.sprintPayout(
      { ...state, escalated: false },
      ticketMix(this.store.sprint()),
      state.lastTick
    );
  }

  #spend(): void {
    this.#promote();
    this.#buySkills();
    while (this.store.unlockNextTier());
  }

  #promote(): void {
    if (!this.store.promotionOffered()) return;
    const state = this.store.snapshot();
    const starved = economy.juniorSpawnRate(state) === 0;
    const share = starved ? 1 : PURCHASE_SPEND_FRACTION;
    if (economy.promotionCost(state) > state.budget * share) return;
    this.store.promote();
  }

  #buySkills(): void {
    if ((this.store.snapshot().skills['duration'] ?? 0) < 1) {
      for (const id of PROCESS_PATH) this.store.buySkill(id);
    }
    for (;;) {
      const state = this.store.snapshot();
      const next = SKILL_NODES.filter((node) => {
        if (!this.store.skillAvailable(node.id)) return false;
        const cost = this.store.skillRankCost(node.id);
        if (node.currency !== 'eur') return cost <= state.storyPoints;
        const lines = (
          node.levels[this.store.skillRank(node.id)]?.effects ?? []
        ).flatMap((effect) => (effect.kind === 'line' ? [effect.line] : []));
        if (lines.some((line) => !this.#wants(state, line))) return false;
        if (lines.some((line) => economy.deskLimited(state, line))) {
          return false;
        }
        return cost <= state.budget * PURCHASE_SPEND_FRACTION;
      }).sort(
        (a, b) =>
          this.store.skillRankCost(a.id) - this.store.skillRankCost(b.id)
      )[0];
      if (!next || !this.store.buySkill(next.id)) return;
    }
  }

  #wants(state: Consultancy, line: PurchaseId): boolean {
    const ceiling = economy.ceilingPerSec(state);
    switch (line) {
      case 'copilot':
        return true;
      case 'junior':
      case 'senior':
        return (
          economy.freeDesks(state) >= 1 &&
          economy.crewCeilingPerSec(state) < ceiling * 0.5
        );
      case 'velocity':
        return economy.velocityUnlocked(state);
      case 'kit':
        return economy.kitNext(state) !== null;
      case 'manager':
        return economy.freeDesks(state) >= 1 && state.tier >= 2;
    }
  }

  #record(): void {
    const state = this.store.snapshot();
    for (const [label, holds] of [...MILESTONES, ...UNORDERED_MILESTONES]) {
      if (!this.reached.has(label) && holds(state)) {
        this.reached.set(label, this.#now);
        this.clicked.set(label, this.#clicks);
        this.rounded.set(label, this.#rounds);
        this.billed.set(label, state.lifetimeBilled);
      }
    }
    if (this.#now % 30_000 !== 0) return;
    this.samples.push(state);
    this.ledger.push({
      at: this.#now,
      crew: this.#crew,
      hand: this.#hand,
      board: this.#board,
      auto: this.#auto,
      crewEuro: this.#crewEuro,
      handEuro: this.#handEuro,
      autoEuro: this.#autoEuro,
      retainerEuro: this.#retainerEuro,
    });
  }
}

function report(table: string): void {
  process.stdout.write(`\n${table}\n`);
}

function shareAt(atMs: number): Share {
  return (
    run.ledger.filter((entry) => entry.at <= atMs).at(-1) ?? run.ledger[0]!
  );
}

const EMPTY_SHARE: Share = {
  at: 0,
  crew: 0,
  hand: 0,
  board: 0,
  auto: 0,
  crewEuro: 0,
  handEuro: 0,
  autoEuro: 0,
  retainerEuro: 0,
};

function euroTotal(from: Share, to: Share): number {
  return (
    to.crewEuro -
    from.crewEuro +
    (to.handEuro - from.handEuro) +
    (to.autoEuro - from.autoEuro) +
    (to.retainerEuro - from.retainerEuro)
  );
}

function autoEuroShare(from: Share, to: Share): number {
  const total = euroTotal(from, to);
  return total === 0 ? 0 : (to.autoEuro - from.autoEuro) / total;
}

function crewEuroShare(from: Share, to: Share): number {
  const crew =
    to.crewEuro - from.crewEuro + (to.retainerEuro - from.retainerEuro);
  const total = euroTotal(from, to);
  return total === 0 ? 0 : crew / total;
}

function crewShare(from: Share, to: Share): number {
  const total =
    to.crew - from.crew + (to.hand - from.hand) + (to.board - from.board);
  return total === 0 ? 0 : (to.crew - from.crew) / total;
}

function fullyLevelled(
  juniors: number,
  seniors: number,
  tier: number
): Consultancy {
  const fresh = freshConsultancy(0, SAVE_VERSION);
  return {
    ...fresh,
    levels: {
      ...fresh.levels,
      junior: juniors,
      senior: seniors,
      copilot: 1,
    },
    skills: everySkill(),
    tier,
  };
}

const run = new Playthrough().run();

describe('the crew earns its keep, and never all of it', () => {
  const whole = (): { from: Share; to: Share } => ({
    from: EMPTY_SHARE,
    to: run.ledger.at(-1)!,
  });

  it('delivers a floor of the money — the thing D21 never asserted', () => {
    const { from, to } = whole();
    expect(crewEuroShare(from, to)).toBeGreaterThan(CREW_EURO_FLOOR);
  });

  it('leaves the player a share worth clicking for', () => {
    const { from, to } = whole();
    expect(crewEuroShare(from, to)).toBeLessThan(CREW_EURO_CAP);
  });

  it('pays a retainer that is a floor and never the line', () => {
    const late = fullyLevelled(57, 23, 8);
    const retainer = economy.retainerPerSec(late) * 10;
    const aRoundOfWork =
      economy.sprintSlots(late) *
      economy.ticketValue(late, DEBT_TIERS.at(-1)!.ticket);

    expect(retainer).toBeGreaterThan(0);
    expect(retainer).toBeLessThan(aRoundOfWork * 0.01);
  });

  it('holds the floor across the back half of the run', () => {
    const marks = run.ledger.filter(
      (share) => share.at >= (run.ledger.at(-1)?.at ?? 0) / 2
    );
    for (const [at, mark] of marks.entries()) {
      if (at < WINDOW_MARKS) continue;
      expect(crewEuroShare(marks[at - WINDOW_MARKS]!, mark)).toBeGreaterThan(
        CREW_EURO_WINDOW_FLOOR
      );
    }
  });
});

describe("the crew's delivered share", () => {
  it('accounts for every close the run banked', () => {
    const last = run.ledger.at(-1)!;
    expect(last.crew + last.hand + last.board + last.auto).toBe(
      run.samples.at(-1)!.lifetimeClosed
    );
  });

  it('never credits the crew with work before there is a crew', () => {
    const firstJunior = run.reached.get('first junior')!;
    expect(crewShare(EMPTY_SHARE, shareAt(firstJunior))).toBe(0);
  });

  it.runIf(process.env['CB_SHARE'])('reports the share it measured', () => {
    const marks = run.ledger.filter((share) => share.at % 300_000 === 0);
    const rows = marks.map((share, n) => {
      const since = n === 0 ? EMPTY_SHARE : marks[n - 1]!;
      return [
        (share.at / 60_000).toFixed(0).padStart(5),
        (crewShare(since, share) * 100).toFixed(1).padStart(8),
        (crewEuroShare(since, share) * 100).toFixed(1).padStart(9),
        (autoEuroShare(since, share) * 100).toFixed(1).padStart(8),
        (crewEuroShare(EMPTY_SHARE, share) * 100).toFixed(1).padStart(8),
        String(share.crew - since.crew).padStart(10),
        String(share.hand - since.hand).padStart(10),
        String(share.board - since.board).padStart(10),
      ].join('');
    });
    report(
      `  min  window%   crew EUR%  auto EUR%    run EUR%      crew      hand     board\n${rows.join('\n')}`
    );
  });
});

describe('the crew ceiling counts everyone', () => {
  it('rises when a senior is hired, not only a junior', () => {
    const bare = fullyLevelled(10, 0, 1);
    const staffed = fullyLevelled(10, 3, 1);
    expect(economy.crewCeilingPerSec(staffed)).toBeGreaterThan(
      economy.crewCeilingPerSec(bare)
    );
    expect(economy.crewCeilingPerSec(bare)).toBeCloseTo(
      economy.juniorCeilingPerSec(bare),
      6
    );
  });

  it('buys a bench at most TRAIT_D21_CEILING over a traitless one', () => {
    const capped = fullyLevelled(57, 23, 8);
    const worst: Consultancy = {
      ...capped,
      roster: Array.from({ length: 23 }, () => ({
        poolSeat: 0,
        traits: ['closer' as const],
      })),
    };
    expect(economy.seniorCeilingPerSec(worst)).toBeCloseTo(
      economy.seniorCeilingPerSec(capped) * TRAIT_D21_CEILING,
      6
    );
  });

  it('never lets an account manager into the D21 bound (D41)', () => {
    const closers = fullyLevelled(10, 4, 1);
    const managed: Consultancy = {
      ...closers,
      levels: { ...closers.levels, manager: 8 },
    };
    expect(economy.crewCeilingPerSec(managed)).toBe(
      economy.crewCeilingPerSec(closers)
    );
  });

  it('spends a desk a closer would otherwise sit at (D36)', () => {
    const closers = fullyLevelled(10, 4, 1);
    const managed: Consultancy = {
      ...closers,
      levels: { ...closers.levels, manager: 8 },
    };
    expect(economy.freeDesks(managed)).toBe(economy.freeDesks(closers) - 8);
    expect(economy.needsDesk('manager')).toBe(true);
  });

  it('keeps every trait inside TRAIT_D21_CEILING', () => {
    const state = fullyLevelled(0, 1, 8);
    for (const trait of TRAIT_IDS) {
      expect(economy.traitFactor(state, trait)).toBeLessThanOrEqual(
        TRAIT_D21_CEILING + 1e-9
      );
    }
  });

  it('never lets the roster and the bench disagree', () => {
    for (const state of run.samples) {
      expect(state.roster.length).toBeLessThanOrEqual(state.levels.senior);
    }
  });
});

describe('the regime migration (C5)', () => {
  it('starts spawn-limited — below the bucket and below a human hand', () => {
    const start = freshConsultancy(0, SAVE_VERSION);
    expect(economy.totalSpawnRate(start)).toBeLessThan(
      economy.ceilingPerSec(start)
    );
    expect(economy.totalSpawnRate(start)).toBeLessThan(CLICKS_PER_SEC);
  });

  it('ends bucket-limited for a player who never buys capacity', () => {
    const end = run.store.snapshot();
    expect(end.tier).toBe(DEBT_TIERS.length);

    const unbought = { ...end, skills: { ...end.skills, capacity: 0 } };
    expect(economy.totalSpawnRate(unbought)).toBeGreaterThan(
      economy.ceilingPerSec(unbought) * 2
    );
  });
});

describe('supply is priced against the bucket (D25)', () => {
  it('lets a euro buy comparable supply and drain', () => {
    const start = freshConsultancy(0, SAVE_VERSION);
    const supplyNode = SKILL_BY_ID.get('supply')!;
    const drainNode = SKILL_BY_ID.get('capacity')!;

    for (let level = 1; level <= 3; level += 1) {
      const supplied = { ...start, skills: { supply: level } };
      const drained = { ...start, skills: { capacity: level } };
      const supply =
        (economy.totalSpawnRate(supplied) - economy.totalSpawnRate(start)) /
        supplyNode.levels[level - 1]!.cost;
      const drain =
        (economy.ceilingPerSec(drained) - economy.ceilingPerSec(start)) /
        drainNode.levels[level - 1]!.cost;

      // The band widened when the ceiling moved from a 10 s round to the
      // haul. Owed a proper retune — docs/rework-garbage-growth.md §9 step 6.
      expect(supply, `level ${level}`).toBeGreaterThan(drain * 0.15);
      expect(supply, `level ${level}`).toBeLessThan(drain * 3);
    }
  });

  it('keeps every level of supply worth buying', () => {
    const start = freshConsultancy(0, SAVE_VERSION);
    const supply = SKILL_BY_ID.get('supply')!;
    let billable = 0;

    for (let level = 0; level <= supply.levels.length; level += 1) {
      const state = { ...start, skills: { supply: level, capacity: level } };
      const next = Math.min(
        economy.totalSpawnRate(state),
        economy.ceilingPerSec(state)
      );
      expect(next, `level ${level}`).toBeGreaterThan(billable);
      billable = next;
    }
  });
});

describe("an unattended run keeps cycling (C1's successor)", () => {
  const SPAN_MS =
    economy.haulMs({
      ...fullyLevelled(40, 4, 5),
      skills: everySkill(),
    }) * 30;

  const unattended = (skills: Record<string, number>): number => {
    const store = new GameStore();
    store.hydrate({ ...fullyLevelled(40, 4, 5), skills });
    for (let ms = 100; ms <= SPAN_MS; ms += 100) store.advanceTo(ms);
    return store.budget();
  };

  const pressing = (skills: Record<string, number>): number => {
    const store = new GameStore();
    store.hydrate({ ...fullyLevelled(40, 4, 5), skills });
    for (let ms = 100; ms <= SPAN_MS; ms += 100) {
      store.advanceTo(ms);
      store.startRound(ms);
    }
    return store.budget();
  };

  it('keeps earning with nobody pressing anything', () => {
    const idle = unattended(everySkill());
    expect(idle).toBeGreaterThan(0);
  });

  it('hauls again and again for a player who never touches a button', () => {
    const store = new GameStore();
    store.hydrate(fullyLevelled(40, 4, 5));
    for (let ms = 100; ms <= SPAN_MS; ms += 100) store.advanceTo(ms);
    expect(store.lifetimeRounds()).toBeGreaterThan(1);
  });

  const attended = (skills: Record<string, number>): number => {
    const store = new GameStore();
    store.hydrate({ ...fullyLevelled(40, 4, 5), skills });
    let credit = 0;
    for (let ms = 100; ms <= SPAN_MS; ms += 100) {
      store.advanceTo(ms);
      store.startRound(ms);
      credit += CLICKS_PER_SEC / 10;
      const clicks = Math.floor(credit);
      if (clicks <= 0) continue;
      credit -= clicks;
      for (let click = 0; click < clicks; click += 1) {
        const aim = store.board.tickets[0];
        if (!aim) break;
        const ids = pickWithin(
          store.board,
          aim.x,
          aim.y,
          economy.clickRadius(store.snapshot())
        );
        if (ids.length === 0) break;
        store.harvest(ids);
      }
    }
    return store.budget();
  };

  it('leaves an attentive player ahead of an idle one', () => {
    expect(attended(everySkill())).toBeGreaterThan(unattended(everySkill()));
  });
});

describe('the session arc', () => {
  it('reaches every milestone, in order, inside one sitting', () => {
    const times = MILESTONES.map(([label]) => {
      const at = run.reached.get(label);
      expect(at, `${label} was never reached`).toBeDefined();
      return at!;
    });

    for (let n = 1; n < times.length; n += 1) {
      expect(
        times[n]!,
        `${MILESTONES[n]![0]} must not precede ${MILESTONES[n - 1]![0]}`
      ).toBeGreaterThanOrEqual(times[n - 1]!);
    }
  });

  it('walks every branch of the tree at least once', () => {
    const end = run.store.snapshot();
    const tracks = new Map<string, boolean>();
    for (const node of SKILL_NODES) {
      if (node.id === SECRET_SKILL_ID || node.id === 'root') continue;
      const track = node.track;
      tracks.set(
        track,
        (tracks.get(track) ?? false) || (end.skills[node.id] ?? 0) > 0
      );
    }
    for (const [track, walked] of tracks) {
      expect(walked, `track ${track} was never entered`).toBe(true);
    }
  });

  it('lengthens the round only once there is a crew to fill it', () => {
    expect(run.reached.get('longer rounds')).toBeGreaterThan(
      run.reached.get('first junior')!
    );
  });

  it.runIf(process.env['CB_CLOCK'])('reports the clock it measured', () => {
    const rows = [...MILESTONES, ...UNORDERED_MILESTONES].map(([label]) => {
      const at = run.reached.get(label);
      const clicks = run.clicked.get(label);
      const rounds = run.rounded.get(label);
      const when = at === undefined ? '—' : (at / 60_000).toFixed(1);
      const cost = clicks === undefined ? '—' : String(clicks);
      const round = rounds === undefined ? '—' : String(rounds);
      return `${when.padStart(6)}${cost.padStart(9)}${round.padStart(8)}  ${label}`;
    });
    const end = run.store.snapshot();
    const unbought = SKILL_NODES.filter(
      (node) =>
        node.id !== SECRET_SKILL_ID &&
        node.heading !== true &&
        (end?.skills[node.id] ?? 0) === 0
    ).map((node) => `${node.id}@${node.levels[0]?.cost ?? 0}`);
    report(
      `  min   clicks  rounds  milestone\n${rows.join('\n')}\n` +
        `  SP ${Math.round(end.storyPoints)}` +
        `  unbought: ${unbought.join(' ') || 'none'}`
    );
  });

  it.runIf(process.env['CB_INCOME'])('reports the income it measured', () => {
    const marks = run.samples.filter((_, n) => (n + 1) % 10 === 0);
    const rows = marks.map((state, n) => {
      const since = n === 0 ? undefined : marks[n - 1];
      const perMin = (state.lifetimeBilled - (since?.lifetimeBilled ?? 0)) / 5;
      const next = DEBT_TIERS.find((tier) => tier.index === state.tier + 1);
      const owes = next ? next.unlockCost / Math.max(perMin, 1) : 0;
      return [
        String((n + 1) * 5).padStart(5),
        formatSci(perMin).padStart(12),
        formatSci(state.budget).padStart(12),
        String(state.tier).padStart(6),
        (next ? formatSci(next.unlockCost) : '—').padStart(12),
        (next ? owes.toFixed(1) : '—').padStart(9),
      ].join('');
    });
    report(
      `  min       EUR/min      budget  tier  next unlock  owes min\n${rows.join('\n')}`
    );
  });

  it.runIf(process.env['CB_LADDER'])('reports the ladder it measured', () => {
    const rungs = DEBT_TIERS.map((tier) => ({
      tier,
      round: run.rounded.get(`tier ${tier.index}`),
      billed: run.billed.get(`tier ${tier.index}`),
    }));

    let fromRound = run.rounded.get('first junior') ?? 0;
    let fromBilled = run.billed.get('first junior') ?? 0;
    const rows = rungs.map(({ tier, round, billed }, n) => {
      const reached = round !== undefined && billed !== undefined;
      const gap = reached ? round - fromRound : undefined;
      const perRound =
        reached && gap !== undefined && gap > 0
          ? (billed - fromBilled) / gap
          : undefined;
      const next = rungs[n + 1]?.tier;
      const owes =
        next && perRound !== undefined && perRound > 0
          ? next.unlockCost / perRound
          : undefined;
      if (reached) {
        fromRound = round;
        fromBilled = billed;
      }
      return [
        `ADR-${tier.index}`.padStart(6),
        formatSci(tier.unlockCost).padStart(13),
        (round === undefined ? '—' : String(round)).padStart(7),
        (gap === undefined ? '—' : String(gap)).padStart(5),
        (perRound === undefined ? '—' : formatSci(perRound)).padStart(12),
        (owes === undefined ? '—' : owes.toFixed(1)).padStart(11),
      ].join('');
    });

    const reached = rungs.filter((rung) => rung.round !== undefined).length;
    const last = rungs.findLast((rung) => rung.round !== undefined);
    report(
      `  rung         cost  round  gap   EUR/round  owes rnds\n${rows.join('\n')}\n` +
        `  reached ${reached}/${DEBT_TIERS.length}` +
        `  in ${last?.round ?? 0} rounds`
    );
  });
});

function formatSci(value: number): string {
  return value >= 1e6 ? value.toExponential(2) : Math.round(value).toString();
}

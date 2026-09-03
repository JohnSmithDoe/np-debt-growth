import { describe, expect, it } from 'vitest';

import type { Consultancy } from '../model/consultancy.model';
import { freshConsultancy, resumed } from '../model/consultancy.model';
import {
  FEED_LINES_PER_SEC,
  MAX_CATCHUP_MS,
  SAVE_VERSION,
} from '../model/game.consts';
import {
  OFFICE_NODE_IDS,
  SECRET_SKILL_ID,
  SKILL_BY_ID,
} from '../model/skill.model';
import { tierAt } from '../model/tier.model';
import type { PurchaseId } from '../model/balance/progression';
import { DESKS_PER_PLATE } from '../model/balance/crew';
import {
  ROUND_LENGTH_BASE_MS,
  SPRINT_OVERFLOW_RATE,
} from '../model/balance/round';
import { addTicket } from '../util/board';
import { overflowFactor, sprintSlots } from '../util/economy';
import { GameStore } from './game.store';

function rooms(count: number): Record<string, number> {
  return Object.fromEntries(
    OFFICE_NODE_IDS.slice(0, count).map((id) => [id, 1])
  );
}

function billRound(store: GameStore): number {
  const before = store.budget();
  for (let at = 100; at <= ROUND_LENGTH_BASE_MS; at += 100) store.advanceTo(at);
  return store.budget() - before;
}

function storeWith(
  overrides: Partial<Omit<Consultancy, 'levels'>> & {
    readonly levels?: Partial<Record<PurchaseId, number>>;
  } = {}
): GameStore {
  const store = new GameStore();
  const fresh = freshConsultancy(0, SAVE_VERSION);
  store.hydrate({
    ...fresh,
    ...overrides,
    levels: { ...fresh.levels, ...overrides.levels },
  });
  return store;
}

const AUTOMATED = { root: 1, a1: 1, a2: 1, a3: 1 };

function click(store: GameStore, id: Parameters<typeof addTicket>[1]): boolean {
  const ticket = addTicket(store.board, id);
  if (!ticket) return false;
  return store.harvest([ticket.id]).taken.length === 1;
}

describe('the free Copilot (C3)', () => {
  it('comes with tier 1, so Story Points are reachable without buying one', () => {
    const store = storeWith({ budget: tierAt(1)!.unlockCost });
    expect(store.levels().copilot).toBe(0);
    expect(store.unlockNextTier()).toBe(true);
    expect(store.tier()).toBe(1);
    expect(store.levels().copilot).toBe(1);
  });

  it('is granted once — tier 2 hands out nothing', () => {
    const store = storeWith({
      tier: 1,
      levels: { copilot: 1 },
      budget: tierAt(2)!.unlockCost,
    });
    expect(store.unlockNextTier()).toBe(true);
    expect(store.levels().copilot).toBe(1);
  });
});

describe('the sprint (C4, D20, D23)', () => {
  it('takes work past the last slot rather than refusing it (D54)', () => {
    const store = storeWith();
    const slots = sprintSlots(store.snapshot());
    for (let i = 0; i < slots; i += 1) expect(click(store, 'lint')).toBe(true);

    expect(click(store, 'lint')).toBe(true);
    expect(store.sprintCount()).toBe(slots + 1);
    expect(store.board.tickets.length).toBe(0);
  });

  it('prices the overflow down, and never to nothing (D54)', () => {
    const state = storeWith().snapshot();
    const slots = sprintSlots(state);

    expect(overflowFactor(state, slots)).toBe(1);

    const over = overflowFactor(state, slots * 2);
    expect(over).toBeLessThan(1);
    expect(over).toBeGreaterThan(SPRINT_OVERFLOW_RATE);
    expect(overflowFactor(state, slots * 10)).toBeLessThan(over);
    expect(overflowFactor(state, slots * 1000)).toBeGreaterThan(
      SPRINT_OVERFLOW_RATE * 0.99
    );
  });

  it('counts a rare as work, and an event as not (D5, D31)', () => {
    const store = storeWith();
    const slots = sprintSlots(store.snapshot());
    for (let i = 0; i < slots; i += 1) click(store, 'lint');

    expect(click(store, 'incident')).toBe(true);
    expect(store.sprintCount()).toBe(slots + 1);

    expect(click(store, 'hotfix')).toBe(true);
    expect(store.sprintCount()).toBe(slots + 1);
    expect(billRound(store)).toBeGreaterThan(0);
  });

  it("bills at the round's end, and not before (D53)", () => {
    const store = storeWith();
    click(store, 'bug');

    for (let at = 100; at <= ROUND_LENGTH_BASE_MS - 500; at += 100) {
      store.advanceTo(at);
    }
    expect(store.budget()).toBe(0);
    expect(store.running()).toBe(true);

    store.advanceTo(ROUND_LENGTH_BASE_MS);
    expect(store.budget()).toBeGreaterThan(0);
    expect(store.running()).toBe(false);
    expect(store.lastRound()?.seq).toBe(1);
  });

  it('starts the next round empty, and counts it', () => {
    const store = storeWith();
    click(store, 'bug');
    billRound(store);

    expect(store.startRound(ROUND_LENGTH_BASE_MS)).toBe(true);
    expect(store.roundSeq()).toBe(2);
    expect(store.sprintCount()).toBe(0);
    expect(store.board.tickets.length).toBe(0);
  });

  it('keeps the ticket that filled a slot readable after it left the board', () => {
    const store = storeWith();
    const ticket = addTicket(store.board, 'bug')!;
    const written = ticket.title;
    store.harvest([ticket.id]);

    expect(store.board.byId.has(ticket.id)).toBe(false);
    expect(store.sprint()).toEqual([{ type: 'bug', title: written }]);

    billRound(store);
    expect(store.sprint()).toEqual([]);
  });

  it('clears the sky at the bell, so no buff is spent reading the Review', () => {
    const store = storeWith();
    for (let at = 100; at < ROUND_LENGTH_BASE_MS; at += 100)
      store.advanceTo(at);
    expect(click(store, 'hotfix')).toBe(true);
    expect(store.hotfixUntil()).toBeGreaterThan(0);

    store.advanceTo(ROUND_LENGTH_BASE_MS);
    expect(store.hotfixUntil()).toBe(0);
  });

  it('hands a reloaded run the baseline the Review compares against', () => {
    const played = storeWith();
    click(played, 'bug');
    billRound(played);
    const rang = played.lastRound();

    const back = new GameStore();
    back.hydrate(resumed(played.state(), 0));

    expect(back.lastRound()).toBeNull();
    expect(back.previousRound()).toEqual(rang);

    back.startRound(0);
    click(back, 'bug');
    billRound(back);
    expect(back.previousRound()).toEqual(rang);
    expect(back.lastRound()?.seq).toBe(2);
  });

  it('lets one Enterprise Escalation multiply the whole sprint', () => {
    const plain = storeWith();
    click(plain, 'bug');
    click(plain, 'bug');
    const flat = billRound(plain);

    const escalated = storeWith();
    click(escalated, 'bug');
    click(escalated, 'bug');
    click(escalated, 'escalation');
    expect(billRound(escalated)).toBeGreaterThan(flat);
  });
});

describe('purchases', () => {
  it('charges the ladder and refuses what the budget cannot cover', () => {
    const node = SKILL_BY_ID.get('junior')!;
    const store = storeWith({
      budget: node.levels[0]!.cost,
      skills: { root: 1 },
    });
    expect(store.buySkill('junior')).toBe(true);
    expect(store.levels().junior).toBe(1);
    expect(store.budget()).toBe(0);
    expect(store.buySkill('junior')).toBe(false);
    expect(store.levels().junior).toBe(1);
  });

  it('holds a skill behind its prerequisite and its gate', () => {
    const rich = storeWith({ storyPoints: 10_000 });
    expect(rich.buySkill('capacity')).toBe(false);
    expect(rich.buySkill('juniorSpeed')).toBe(false);

    const staffed = storeWith({
      storyPoints: 10_000,
      skills: { root: 1, junior: 1 },
      levels: { junior: 1 },
    });
    expect(staffed.buySkill('juniorSpeed')).toBe(true);
    expect(staffed.storyPoints()).toBe(
      10_000 - SKILL_BY_ID.get('juniorSpeed')!.levels[0]!.cost
    );
  });

  it('never sells the easter egg', () => {
    const store = storeWith({ storyPoints: 10_000 });
    expect(store.buySkill(SECRET_SKILL_ID)).toBe(false);
    expect(store.unlockSecret()).toBe(true);
    expect(store.skillRank(SECRET_SKILL_ID)).toBe(1);
  });

  it('sells a node again at its authored price, and stops at its last level', () => {
    const store = storeWith({ storyPoints: 1_000_000, skills: { root: 1 } });
    const node = SKILL_BY_ID.get('radius')!;

    let last = 0;
    for (const [at, level] of node.levels.entries()) {
      const price = store.skillRankCost('radius');
      expect(price).toBe(level.cost);
      expect(price).toBeGreaterThan(last);
      expect(store.buySkill('radius')).toBe(true);
      expect(store.skillRank('radius')).toBe(at + 1);
      last = price;
    }

    expect(store.buySkill('radius')).toBe(false);
    expect(store.skillRank('radius')).toBe(node.levels.length);
    expect(store.skillRankCost('radius')).toBe(Number.POSITIVE_INFINITY);
  });

  it('opens a branch on the first level, not the last', () => {
    const store = storeWith({ storyPoints: 1_000_000, budget: 1_000_000 });
    expect(store.buySkill('radius')).toBe(false);
    expect(store.buySkill('root')).toBe(true);
    expect(store.buySkill('capacity')).toBe(false);
    expect(store.buySkill('radius')).toBe(true);
    expect(store.buySkill('capacity')).toBe(true);
  });
});

describe('advancing the clock (S3)', () => {
  const idle = (): GameStore => {
    const store = storeWith({
      tier: 1,
      skills: { ...AUTOMATED, capacity: 5 },
      levels: { junior: 200, copilot: 1 },
    });
    for (let n = 0; n < 40; n += 1) click(store, 'lint');
    return store;
  };

  it('costs resolution and not correctness, up to the catch-up window', () => {
    const once = idle();
    once.advanceTo(MAX_CATCHUP_MS);

    const often = idle();
    for (let ms = 100; ms <= MAX_CATCHUP_MS; ms += 100) often.advanceTo(ms);

    expect(once.lifetimeClosed()).toBeGreaterThan(0);
    expect(often.lifetimeClosed()).toBeCloseTo(once.lifetimeClosed(), -1);
  });

  it('resumes after a long stall instead of fast-forwarding it', () => {
    const stalled = idle();
    stalled.advanceTo(10 * MAX_CATCHUP_MS);

    const capped = idle();
    capped.advanceTo(MAX_CATCHUP_MS);

    expect(stalled.lifetimeClosed()).toBeCloseTo(capped.lifetimeClosed(), -1);
    expect(stalled.snapshot().lastTick).toBe(10 * MAX_CATCHUP_MS);
  });

  it('measures per-second income the same however the stretch was stepped', () => {
    const span = ROUND_LENGTH_BASE_MS * 2;
    const even = idle();
    for (let ms = 100; ms <= span; ms += 100) {
      even.advanceTo(ms);
      even.startRound(ms);
    }

    const ragged = idle();
    for (let ms = 1003; ms <= span; ms += 1003) {
      ragged.advanceTo(ms);
      ragged.startRound(ms);
    }
    ragged.advanceTo(span);

    expect(even.perSecond()).toBeGreaterThan(0);
    expect(ragged.perSecond()).toBeGreaterThan(even.perSecond() / 2);
    expect(ragged.perSecond()).toBeLessThan(even.perSecond() * 2);
  });

  it('ignores a clock that has gone backwards', () => {
    const store = storeWith({
      tier: 1,
      skills: { ...AUTOMATED, capacity: 5 },
      levels: { junior: 200, copilot: 1 },
    });
    store.advanceTo(-5_000);
    expect(store.budget()).toBe(0);
  });
});

describe('juniors and the sprint', () => {
  it('fills the sprint from real tickets, and stops when it is full', () => {
    const store = storeWith({
      levels: { junior: 200 },
    });
    for (let ms = 100; ms < ROUND_LENGTH_BASE_MS; ms += 100) {
      for (let n = 0; n < 4; n++) addTicket(store.board, 'lint');
      store.advanceTo(ms);
    }

    expect(store.sprintCount()).toBeGreaterThan(sprintSlots(store.snapshot()));
    expect(store.lifetimeClosed()).toBe(store.sprintCount());
  });

  it("bills through the sprint at the round's end, never around it", () => {
    const store = storeWith({
      tier: 1,
      skills: { ...AUTOMATED, capacity: 5 },
      levels: { junior: 200, copilot: 1 },
    });
    for (let ms = 100; ms <= 600_000; ms += 100) {
      store.advanceTo(ms);
      store.startRound(ms);
    }

    expect(store.budget()).toBeGreaterThan(0);
    expect(store.lifetimeRounds()).toBeGreaterThan(0);
    expect(store.budget()).toBeCloseTo(store.lifetimeBilled(), 6);
  });
});

describe('rooms gate the crew (D36, D56)', () => {
  it('refuses a seat whose room has not been bought', () => {
    const store = storeWith({
      budget: 1_000_000,
      skills: { root: 1, junior: 1 },
      levels: { junior: DESKS_PER_PLATE },
    });
    expect(store.skillAvailable('junior')).toBe(false);
    expect(store.buySkill('junior')).toBe(false);
  });

  it('lets the same seat through once the room is there', () => {
    const store = storeWith({
      budget: 1_000_000,
      skills: { root: 1, radius: 1, capacity: 1, o1: 1, junior: 1 },
      levels: { junior: DESKS_PER_PLATE },
    });
    expect(store.buySkill('junior')).toBe(true);
    expect(store.levels().junior).toBe(DESKS_PER_PLATE + 1);
  });

  it('leaves every line that seats nobody alone', () => {
    const store = storeWith({
      budget: 1_000_000,
      levels: { junior: DESKS_PER_PLATE },
    });
    for (const line of ['copilot', 'velocity', 'kit'] as const) {
      expect(store.deskLimited(line)).toBe(false);
    }
  });

  it('never blocks the Promotion Round on a full floor', () => {
    const store = storeWith({
      budget: 100_000_000,
      levels: { junior: DESKS_PER_PLATE - 1, senior: 1 },
    });
    expect(store.freeDesks()).toBe(0);
    expect(store.promote()).toBe(true);
    expect(store.levels().senior).toBe(DESKS_PER_PLATE);
  });
});

describe('the feed', () => {
  it('names the crew member who closed it', () => {
    const store = storeWith({ levels: { junior: 1 }, skills: rooms(1) });
    for (let n = 0; n < 5; n++) addTicket(store.board, 'lint');

    for (let ms = 100; ms <= 60_000; ms += 100) {
      store.advanceTo(ms);
      store.startRound(ms);
    }
    const closes = store.log().filter((line) => line.kind === 'close');
    expect(closes.length).toBeGreaterThan(0);
    expect(closes[0]).toMatchObject({ close: { by: 'juniors' } });
  });

  it('samples the crew rather than logging all of it', () => {
    const store = storeWith({
      tier: 1,
      skills: { ...AUTOMATED, capacity: 5 },
      levels: { junior: 200, copilot: 1 },
    });

    for (let ms = 100; ms <= 20_000; ms += 100) {
      for (let n = 0; n < 20; n++) addTicket(store.board, 'lint');
      store.advanceTo(ms);
      store.startRound(ms);
    }

    const seconds = 10;
    const before = store.lifetimeClosed();
    const lines = store.log().length;
    for (let ms = 20_100; ms <= 20_000 + seconds * 1000; ms += 100) {
      for (let n = 0; n < 20; n++) addTicket(store.board, 'lint');
      store.advanceTo(ms);
      store.startRound(ms);
    }

    const closed = store.lifetimeClosed() - before;
    const written = store.log().length - lines;
    expect(written).toBeLessThanOrEqual(
      Math.ceil(FEED_LINES_PER_SEC * seconds) + 1
    );
    expect(closed).toBeGreaterThan(written * 3);
  });

  it('never drops the click you made', () => {
    const store = storeWith({
      tier: 1,
      skills: { ...AUTOMATED, capacity: 5 },
      levels: { junior: 200, copilot: 1 },
    });
    for (let ms = 100; ms <= 20_000; ms += 100) store.advanceTo(ms);

    const lines = store.log().length;
    expect(click(store, 'incident')).toBe(true);
    const newest = store.log()[0];
    expect(store.log().length).toBe(lines + 1);
    expect(newest).toMatchObject({ kind: 'close', close: { by: 'you' } });
  });

  it('says nothing about a restored save', () => {
    const store = storeWith({
      tier: 8,
      promoted: true,
      levels: { junior: 200 },
      skills: rooms(8),
    });

    store.advanceTo(200);
    expect(store.log().filter((line) => line.kind === 'note')).toEqual([]);
  });

  it('empties on reset', () => {
    const store = storeWith({ levels: { junior: 1 }, skills: rooms(1) });
    for (let n = 0; n < 5; n++) addTicket(store.board, 'lint');
    for (let ms = 100; ms <= 60_000; ms += 100) store.advanceTo(ms);
    expect(store.log().length).toBeGreaterThan(0);

    store.reset(0);
    expect(store.log()).toEqual([]);
  });
});

describe('the senior hire (D34)', () => {
  const ready = (): GameStore =>
    storeWith({
      budget: 1e6,
      levels: { junior: 1 },
      skills: { ...rooms(4), root: 1, junior: 1 },
    });

  it('seats somebody the moment the square is bought', () => {
    const store = ready();
    expect(store.buySkill('senior')).toBe(true);

    const state = store.snapshot();
    expect(state.levels.senior).toBe(1);
    expect(state.roster.length).toBe(1);
    expect(state.roster[0]?.traits.length).toBe(1);
  });

  it('seats a different person for every desk', () => {
    const store = ready();
    for (let at = 0; at < 4; at += 1)
      expect(store.buySkill('senior')).toBe(true);

    const { roster } = store.snapshot();
    expect(roster.length).toBe(4);
    expect(new Set(roster.map((hire) => hire.traits[0])).size).toBe(4);
  });

  it('leaves the roster alone for a square that seats nobody', () => {
    const store = ready();
    expect(store.buySkill('junior')).toBe(true);
    expect(store.snapshot().roster).toEqual([]);
  });

  it('gives a promoted senior no traits, and no code says so (D33)', () => {
    const store = storeWith({
      budget: 1e7,
      levels: { junior: 4 },
      skills: { ...rooms(8), junior: 1 },
    });
    expect(store.buySkill('senior')).toBe(true);
    expect(store.promote()).toBe(true);

    const state = store.snapshot();
    expect(state.levels.senior).toBe(5);
    expect(state.roster.length).toBe(1);
    expect(state.roster[3]).toBeUndefined();
  });
});

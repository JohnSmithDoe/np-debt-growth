import { describe, expect, it } from 'vitest';

import { resumed } from '../model/consultancy.model';
import { FEED_LINES_PER_SEC, MAX_CATCHUP_MS } from '../model/game.consts';
import {
  DESK_NODE_ID,
  SECRET_SKILL_ID,
  SKILL_BY_ID,
  SKILL_ROOT_ID,
  adrPrice,
} from '../model/skill.model';
import { adrNodeId, DEBT_TIERS, tierAt } from '../model/tier.model';
import { FREE_COPILOTS } from '../model/balance/progression';
import { DESKS_BASE, DESKS_PER_RANK } from '../model/balance/crew';
import { addTicket } from '../util/board';
import { sprintSlots } from '../util/economy';
import { GameStore } from './game.store';
import { rooms, storeWith } from './store.fixture';

const A_WHILE_MS = 10_000;

const AUTOMATED = { root: 1, a1: 1, a2: 1, a3: 1 };

function click(store: GameStore, id: Parameters<typeof addTicket>[1]): boolean {
  const ticket = addTicket(store.board, id);
  if (!ticket) return false;
  return store.harvest([ticket.id]).taken.length === 1;
}

describe('the free Copilot (C3)', () => {
  // The tree is bought with story points now, so the first copilot has to
  // ship with the laptop: without it the first ADR is unreachable.
  it('ships with the run, so Story Points flow from the first close', () => {
    const store = storeWith();
    expect(store.levels().copilot).toBe(FREE_COPILOTS);
    expect(store.tier()).toBe(0);
  });

  it('opens the first rung on story points, not on budget', () => {
    const store = storeWith({
      storyPoints: tierAt(1)!.spCost,
      budget: 0,
      skills: { root: 1 },
    });
    expect(store.unlockNextTier()).toBe(true);
    expect(store.tier()).toBe(1);
  });

  it('refuses a rung the run has not earned the points for', () => {
    const store = storeWith({
      storyPoints: 0,
      budget: 1e9,
      skills: { root: 1 },
    });
    expect(store.unlockNextTier()).toBe(false);
    expect(store.tier()).toBe(0);
  });
});

describe('the sprint (C4, D20, D23)', () => {
  it('refuses work past the last slot — the can is a hard cap', () => {
    const store = storeWith();
    const slots = sprintSlots(store.snapshot());
    for (let i = 0; i < slots; i += 1) expect(click(store, 'lint')).toBe(true);

    expect(click(store, 'lint')).toBe(false);
    expect(store.sprintCount()).toBe(slots);
    expect(store.board.tickets.length).toBe(1);
  });

  it('counts a rare as work, and an event as not (D5, D31)', () => {
    const store = storeWith();
    const slots = sprintSlots(store.snapshot());
    for (let i = 0; i < slots; i += 1) click(store, 'lint');

    expect(click(store, 'incident')).toBe(false);
    expect(store.sprintCount()).toBe(slots);

    expect(click(store, 'hotfix')).toBe(true);
    expect(store.sprintCount()).toBe(slots);
    expect(store.budget()).toBeGreaterThan(0);
  });

  it('pays at pickup, not at a bell', () => {
    const store = storeWith();
    expect(store.budget()).toBe(0);

    click(store, 'bug');
    expect(store.budget()).toBeGreaterThan(0);
    expect(store.running()).toBe(true);
  });

  it('sends the truck when the can fills, and takes it back empty', () => {
    const store = storeWith();
    const slots = sprintSlots(store.snapshot());
    for (let i = 0; i < slots; i += 1) click(store, 'lint');

    store.advanceTo(100);
    expect(store.hauling()).toBe(true);
    expect(store.lastRound()?.seq).toBe(1);

    for (let at = 200; at <= 200 + store.haulMs(); at += 100) {
      store.advanceTo(at);
    }
    expect(store.hauling()).toBe(false);
    expect(store.sprintCount()).toBe(0);
    expect(store.roundSeq()).toBe(2);
  });

  it('leaves the backlog on the board across a haul — debt accumulates', () => {
    const store = storeWith();
    addTicket(store.board, 'lint');
    addTicket(store.board, 'lint');
    const standing = store.board.tickets.length;

    const slots = sprintSlots(store.snapshot());
    for (let i = 0; i < slots; i += 1) click(store, 'lint');
    for (let at = 100; at <= 100 + store.haulMs(); at += 100) {
      store.advanceTo(at);
    }

    expect(store.sprintCount()).toBe(0);
    expect(store.board.tickets.length).toBeGreaterThanOrEqual(standing);
  });

  it('keeps the ticket that filled a slot readable after it left the board', () => {
    const store = storeWith();
    const ticket = addTicket(store.board, 'bug')!;
    const written = ticket.title;
    store.harvest([ticket.id]);

    expect(store.board.byId.has(ticket.id)).toBe(false);
    expect(store.sprint()).toEqual([{ type: 'bug', title: written, lane: 0 }]);
  });

  it('keeps a hotfix on its own clock when a train leaves', () => {
    const store = storeWith();
    expect(click(store, 'hotfix')).toBe(true);
    const until = store.hotfixUntil();
    expect(until).toBeGreaterThan(0);

    const slots = sprintSlots(store.snapshot());
    for (let i = 0; i < slots; i += 1) click(store, 'lint');
    store.advanceTo(100);
    expect(store.hotfixUntil()).toBe(until);
  });

  it('hands a reloaded run the last haul it remembers', () => {
    const played = storeWith();
    const slots = sprintSlots(played.snapshot());
    for (let i = 0; i < slots; i += 1) click(played, 'lint');
    played.advanceTo(100);
    const hauled = played.lastRound();
    expect(hauled).not.toBeNull();

    const back = new GameStore();
    back.hydrate(resumed(played.state(), 0));

    expect(back.lastRound()).toBeNull();
    expect(back.previousRound()).toEqual(hauled);
  });

  it('lets one Enterprise Escalation multiply every close in its window', () => {
    const plain = storeWith();
    click(plain, 'bug');
    click(plain, 'bug');
    const flat = plain.budget();

    const escalated = storeWith();
    click(escalated, 'escalation');
    click(escalated, 'bug');
    click(escalated, 'bug');
    expect(escalated.budget()).toBeGreaterThan(flat);
  });
});

describe('purchases', () => {
  it('unlocks a line on the tree and sells the rest from the rail', () => {
    const node = SKILL_BY_ID.get('junior')!;
    const store = storeWith({
      storyPoints: node.levels[0]!.cost,
      skills: { root: 1, crew: 1 },
    });
    expect(store.buySkill('junior')).toBe(true);
    expect(store.levels().junior).toBe(1);
    expect(store.buySkill('junior')).toBe(false);

    expect(store.canBuyLine('junior')).toBe(false);
    store.grant(store.lineCost('junior'), 0);
    expect(store.buyLine('junior')).toBe(true);
    expect(store.levels().junior).toBe(2);
    expect(store.buyLine('junior')).toBe(false);
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
    const speed = SKILL_BY_ID.get('juniorSpeed')!;
    expect(staffed.storyPoints()).toBe(10_000 - speed.levels[0]!.cost);
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
    const store = storeWith({
      storyPoints: 1_000_000,
      budget: 1_000_000,
      skills: {},
    });
    expect(store.buySkill('radius')).toBe(false);
    expect(store.buySkill('root')).toBe(true);
    expect(store.buySkill('capacity')).toBe(false);
    expect(store.buySkill('radius')).toBe(true);
    expect(store.buySkill('capacity')).toBe(true);
  });

  it('ships the root bought, so the ADR ladder is never stranded', () => {
    const store = storeWith();
    expect(store.skillRank(SKILL_ROOT_ID)).toBe(1);
    expect(store.skillAvailable(adrNodeId(1))).toBe(true);
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
    const span = A_WHILE_MS * 2;
    const even = idle();
    for (let ms = 100; ms <= span; ms += 100) even.advanceTo(ms);

    const ragged = idle();
    for (let ms = 1003; ms <= span; ms += 1003) ragged.advanceTo(ms);
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
    for (let ms = 100; ms < A_WHILE_MS; ms += 100) {
      for (let n = 0; n < 4; n++) addTicket(store.board, 'lint');
      store.advanceTo(ms);
    }

    expect(store.sprintCount()).toBeLessThanOrEqual(
      sprintSlots(store.snapshot())
    );
    expect(store.lifetimeClosed()).toBeGreaterThan(0);
  });

  it("bills through the sprint at the round's end, never around it", () => {
    const store = storeWith({
      tier: 1,
      skills: { ...AUTOMATED, capacity: 5 },
      levels: { junior: 200, copilot: 1 },
      spawners: { 0: 20 },
    });
    for (let ms = 100; ms <= 600_000; ms += 100) store.advanceTo(ms);

    expect(store.budget()).toBeGreaterThan(0);
    expect(store.lifetimeRounds()).toBeGreaterThan(0);
    expect(store.budget()).toBeCloseTo(store.lifetimeBilled(), 6);
  });
});

describe('desks gate the crew (D36, D56)', () => {
  it('refuses a seat the floor has no desk for', () => {
    const store = storeWith({
      budget: 1_000_000,
      skills: { root: 1, junior: 1 },
      levels: { junior: DESKS_BASE },
    });
    expect(store.skillAvailable('junior')).toBe(false);
    expect(store.buySkill('junior')).toBe(false);
  });

  it('adds seats a rank at a time, never by a factor', () => {
    const store = storeWith({
      budget: 1_000_000,
      skills: { root: 1, crew: 1, junior: 1, [DESK_NODE_ID]: 1 },
      levels: { junior: DESKS_BASE },
    });
    expect(store.freeDesks()).toBe(DESKS_PER_RANK);
    expect(store.buyLine('junior')).toBe(true);
    expect(store.levels().junior).toBe(DESKS_BASE + 1);
  });

  it('leaves every line that seats nobody alone', () => {
    const store = storeWith({
      budget: 1_000_000,
      levels: { junior: DESKS_BASE },
    });
    for (const line of ['copilot', 'velocity', 'kit'] as const) {
      expect(store.deskLimited(line)).toBe(false);
    }
  });

  it('never blocks the Promotion Round on a full floor', () => {
    const store = storeWith({
      budget: 100_000_000,
      levels: { junior: DESKS_BASE - 1, senior: 1 },
    });
    expect(store.freeDesks()).toBe(0);
    expect(store.promote()).toBe(true);
    expect(store.levels().senior).toBe(DESKS_BASE);
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
      storyPoints: 1e6,
      levels: { junior: 1 },
      skills: { ...rooms(4), root: 1, crew: 1, junior: 1 },
    });

  it('seats somebody the moment the line is opened', () => {
    const store = ready();
    expect(store.buySkill('senior')).toBe(true);

    const state = store.snapshot();
    expect(state.levels.senior).toBe(1);
    expect(state.roster.length).toBe(1);
    expect(state.roster[0]?.traits.length).toBe(1);
  });

  it('seats a different person for every desk', () => {
    const store = ready();
    expect(store.buySkill('senior')).toBe(true);
    for (let at = 0; at < 3; at += 1)
      expect(store.buyLine('senior')).toBe(true);

    const { roster } = store.snapshot();
    expect(roster.length).toBe(4);
    expect(new Set(roster.map((hire) => hire.traits[0])).size).toBe(4);
  });

  it('leaves the roster alone for a line that seats nobody', () => {
    const store = ready();
    expect(store.buyLine('junior')).toBe(true);
    expect(store.snapshot().roster).toEqual([]);
  });

  it('gives a promoted senior no traits, and no code says so (D33)', () => {
    const store = storeWith({
      budget: 1e7,
      storyPoints: 1e6,
      levels: { junior: 4 },
      skills: { ...rooms(8), root: 1, crew: 1, junior: 1 },
    });
    expect(store.buySkill('senior')).toBe(true);
    expect(store.promote()).toBe(true);

    const state = store.snapshot();
    expect(state.levels.senior).toBe(5);
    expect(state.roster.length).toBe(1);
    expect(state.roster[3]).toBeUndefined();
  });
});

describe('a full can refuses in place (parity #11)', () => {
  it('names what it left behind, and leaves it on the board', () => {
    const store = storeWith();
    const slots = sprintSlots(store.snapshot());
    for (let i = 0; i < slots; i += 1) click(store, 'lint');

    const left = addTicket(store.board, 'lint')!;
    const { taken, refused } = store.harvest([left.id]);

    expect(taken).toEqual([]);
    expect(refused).toEqual([left.id]);
    expect(store.board.byId.has(left.id)).toBe(true);
  });

  it('refuses nothing while there is room', () => {
    const store = storeWith();
    const ticket = addTicket(store.board, 'lint')!;
    expect(store.harvest([ticket.id]).refused).toEqual([]);
  });
});

describe('an ADR is a tree node (parity #23)', () => {
  it('is priced the same on the panel as on the tree', () => {
    const store = storeWith({ skills: { root: 1 } });
    for (let index = 1; index <= DEBT_TIERS.length; index += 1) {
      expect(adrPrice(index)).toBe(DEBT_TIERS[index - 1]!.spCost);
    }
    expect(adrPrice(1)).toBe(store.skillRankCost(adrNodeId(1)));
  });

  it('opens the rung, its spawner line and its ticket in one purchase', () => {
    const store = storeWith({
      storyPoints: tierAt(1)!.spCost,
      skills: { root: 1 },
    });
    expect(store.spawnerUnlocked(1)).toBe(false);

    expect(store.buySkill(adrNodeId(1))).toBe(true);
    expect(store.tier()).toBe(1);
    expect(store.spawnerUnlocked(1)).toBe(true);
    expect(store.skillRank(adrNodeId(1))).toBe(1);
  });

  it('chains the rungs, so none can be skipped', () => {
    const store = storeWith({ storyPoints: 1e9, skills: { root: 1 } });
    expect(store.skillAvailable(adrNodeId(2))).toBe(false);
    store.buySkill(adrNodeId(1));
    expect(store.skillAvailable(adrNodeId(2))).toBe(true);
  });
});

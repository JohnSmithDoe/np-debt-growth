import { describe, expect, it } from 'vitest';

import { TICKET_TYPES } from '../model/ticket.model';
import { NEVER_EXPIRES } from '../model/board.model';
import {
  FACT_COUNTDOWN_MS,
  FACT_EVERY_MS,
  FACT_OFFSET_MS,
  INVITATION_EVERY_MS,
  INVITATION_WINDOW_MS,
} from '../model/balance/weather';
import { BOARD_CAPACITY } from '../model/geometry';
import { addTicket } from '../util/board';
import { sprintSlots } from '../util/economy';
import { GameStore } from './game.store';
import { rooms, storeWith } from './store.fixture';

function run(store: GameStore, from: number, to: number): number {
  for (let at = from + 100; at <= to; at += 100) {
    store.advanceTo(at);
    store.startRound(at);
  }
  return to;
}

describe('invitations', () => {
  it('puts a card on the board, and only from tier 1', () => {
    const early = storeWith({ tier: 0 });
    run(early, 0, INVITATION_EVERY_MS + 2_000);
    expect(invites(early)).toBe(0);

    const store = storeWith({ tier: 1 });
    run(store, 0, INVITATION_EVERY_MS + 500);
    expect(invites(store)).toBe(1);
  });

  it('is declined by one click, and costs nothing', () => {
    const store = storeWith({ tier: 1 });
    run(store, 0, INVITATION_EVERY_MS + 500);
    const card = store.board.tickets.find(
      (ticket) => TICKET_TYPES[ticket.type].effect === 'decline'
    );
    expect(card).toBeDefined();

    const before = store.snapshot();
    store.harvest([card!.id]);
    const after = store.snapshot();
    expect(after.budget).toBe(before.budget);
    expect(after.sprintCount).toBe(before.sprintCount);
    expect(invites(store)).toBe(0);

    run(store, INVITATION_EVERY_MS + 500, INVITATION_EVERY_MS + 20_000);
    expect(store.board.juniors.every((one) => one.phase !== 'meeting')).toBe(
      true
    );
  });

  it('sends the crew to a room when nobody clicks it', () => {
    const store = storeWith({
      tier: 1,
      levels: { junior: 4 },
      skills: rooms(1),
    });
    const at = run(store, 0, INVITATION_EVERY_MS + INVITATION_WINDOW_MS + 500);
    expect(store.board.juniors.some((one) => one.phase === 'meeting')).toBe(
      true
    );

    run(store, at, at + 30_000);
    expect(store.board.juniors.every((one) => one.phase !== 'meeting')).toBe(
      true
    );
  });

  it('still lands on a board that is already full', () => {
    const store = storeWith({ tier: 1 });
    for (let n = 0; n < BOARD_CAPACITY + 50; n++) {
      const card = addTicket(store.board, 'lint');
      if (card) card.lifeLeftMs = NEVER_EXPIRES;
    }

    for (let at = 100; at <= INVITATION_EVERY_MS + 500; at += 100) {
      store.advanceTo(at);
    }

    expect(store.board.tickets.length).toBeGreaterThanOrEqual(BOARD_CAPACITY);
    expect(invites(store)).toBe(1);
  });

  it('never reaches the board once an Account Manager is on the floor', () => {
    const store = storeWith({
      tier: 1,
      levels: { manager: 1 },
      skills: rooms(1),
    });
    run(store, 0, INVITATION_EVERY_MS + 500);
    expect(invites(store)).toBe(0);
  });
});

describe('the two cadences', () => {
  it('lands a fact half a cadence after an invitation, never with it', () => {
    const store = storeWith({ tier: 3 });
    run(store, 0, INVITATION_EVERY_MS + 500);
    expect(invites(store)).toBe(1);
    expect(store.hazardNotice()).toBeNull();

    run(store, INVITATION_EVERY_MS + 500, FIRST_FACT_MS + 500);
    expect(store.hazardNotice()?.landed).toBe(false);
  });
});

describe('facts', () => {
  it('announces itself without putting anything on the board', () => {
    const store = storeWith({ tier: 3, levels: { manager: 1 } });
    run(store, 0, FIRST_FACT_MS + 500);
    expect(invites(store)).toBe(0);
    expect(store.hazardNotice()?.landed).toBe(false);
  });

  it('re-estimates the board it lands on, and bills nothing itself', () => {
    const store = storeWith({
      tier: 3,
      skills: {
        cutRetro: 1,
        cutRefinement: 1,
        cutReview: 1,
        cutSmoke: 1,
        cutFreeze: 1,
      },
    });

    let at = 0;
    while (at < FACT_EVERY_MS * 6 && store.hazardNotice()?.id !== 'grooming') {
      at = run(store, at, at + FACT_COUNTDOWN_MS);
    }
    expect(store.hazardNotice()).toMatchObject({
      id: 'grooming',
      landed: false,
    });

    const cards = Array.from({ length: 30 }, () => {
      const card = addTicket(store.board, 'legacy')!;
      card.lifeLeftMs = NEVER_EXPIRES;
      card.spBonus = 0;
      return card;
    });
    const before = store.snapshot();

    run(store, at, at + FACT_COUNTDOWN_MS + 500);

    expect(cards.every((card) => card.spBonus > 0)).toBe(true);
    expect(store.snapshot().lifetimeBilled).toBe(before.lifetimeBilled);
  });
});

describe('a Prod Freeze', () => {
  it('halves what the sprint will take, and gives it back', () => {
    const store = storeWith({ tier: 3 });
    const open = sprintSlots(store.snapshot());
    expect(store.sprintSlots()).toBe(open);

    const at = run(store, 0, FIRST_FACT_MS + FACT_COUNTDOWN_MS + 500);
    expect(store.sprintSlots()).toBeLessThan(open);

    run(store, at, at + 60_000);
    expect(store.sprintSlots()).toBe(open);
  });
});

describe('the late weather', () => {
  function windTo(store: GameStore, id: string): number {
    let at = 0;
    while (at < FACT_EVERY_MS * 12 && store.hazardNotice()?.id !== id) {
      at = run(store, at, at + FACT_COUNTDOWN_MS);
    }
    expect(store.hazardNotice()?.id).toBe(id);
    return at;
  }

  it('Pager Duty floods rares while the crew is unavailable', () => {
    const store = storeWith({
      tier: 6,
      levels: { junior: 4 },
      skills: rooms(1),
    });
    const at = windTo(store, 'page');
    const landed = run(store, at, at + FACT_COUNTDOWN_MS + 1_000);
    expect(store.board.juniors.some((one) => one.phase === 'meeting')).toBe(
      true
    );
    run(store, landed, landed + 8_000);
    expect(store.board.rares.length).toBeGreaterThan(0);
  });

  it('a Migration Window stops ordinary supply, and only that', () => {
    const store = storeWith({
      tier: 7,
      skills: {
        cutRetro: 1,
        cutRefinement: 1,
        cutReview: 1,
        cutSmoke: 1,
        cutFreeze: 1,
      },
    });
    const at = windTo(store, 'migration');
    store.endRoundNow(at);
    expect(store.hauling()).toBe(true);
    let landedAt = at;
    while (store.sky().supply !== 0 && landedAt < at + FACT_COUNTDOWN_MS * 2) {
      landedAt += 100;
      store.advanceTo(landedAt);
    }
    expect(store.hauling()).toBe(false);
    run(store, landedAt, at + FACT_COUNTDOWN_MS + 500);

    const ordinary = (): number =>
      store.board.tickets.filter(
        (ticket) => !TICKET_TYPES[ticket.type].handOnly
      ).length;

    const held = ordinary();
    run(store, at + FACT_COUNTDOWN_MS + 500, at + FACT_COUNTDOWN_MS + 5_000);
    expect(ordinary()).toBeLessThanOrEqual(held);
    expect(store.sky().supply).toBe(0);

    run(store, at + FACT_COUNTDOWN_MS + 5_000, at + 90_000);
    expect(store.sky().supply).toBe(1);
  });
});

const FIRST_FACT_MS = FACT_EVERY_MS + FACT_OFFSET_MS;

function invites(store: GameStore): number {
  return store.board.tickets.filter(
    (ticket) => TICKET_TYPES[ticket.type].effect === 'decline'
  ).length;
}

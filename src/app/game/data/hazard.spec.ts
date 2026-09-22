import { describe, expect, it } from 'vitest';

import { TICKET_TYPES } from '../model/ticket.model';
import {
  FACT_COUNTDOWN_MS,
  FACT_EVERY_MS,
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

const notes = (store: GameStore, note: string): number =>
  store.log().filter((line) => line.kind === 'note' && line.note === note)
    .length;

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
    expect(notes(store, 'hazard-declined')).toBe(1);

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
    const flooded = (at: number): void => {
      if (!store.startRound(at)) return;
      for (let n = 0; n < BOARD_CAPACITY + 50; n++) {
        addTicket(store.board, 'lint');
      }
    };

    for (let at = 100; at <= INVITATION_EVERY_MS + 500; at += 100) {
      store.advanceTo(at);
      flooded(at);
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
    expect(notes(store, 'hazard-auto-declined')).toBe(1);
  });
});

describe('facts', () => {
  it('announces itself without putting anything on the board', () => {
    const store = storeWith({ tier: 3, levels: { manager: 1 } });
    run(store, 0, FACT_EVERY_MS + 500);
    expect(invites(store)).toBe(0);
    expect(notes(store, 'hazard-due')).toBe(1);
    expect(store.hazardNotice()?.landed).toBe(false);
  });

  it('grooms the board to nothing, bills nothing, and leaves the sprint', () => {
    const store = storeWith({ tier: 3, skills: { duration: 5 } });

    let at = 0;
    while (at < FACT_EVERY_MS * 6 && store.hazardNotice()?.id !== 'grooming') {
      at = run(store, at, at + FACT_COUNTDOWN_MS);
    }
    expect(store.hazardNotice()).toMatchObject({
      id: 'grooming',
      landed: false,
    });

    const doomed = 30;
    for (let n = 0; n < doomed; n += 1) addTicket(store.board, 'lint');
    const saved = store.board.tickets.slice(0, 3).map((ticket) => ticket.id);
    store.harvest(saved);

    const before = store.snapshot();
    const banked = store.sprintValue();
    expect(before.sprintCount).toBeGreaterThanOrEqual(saved.length);
    expect(store.board.tickets.length).toBeGreaterThan(0);

    at = run(store, at, at + FACT_COUNTDOWN_MS + 1_000);

    const after = store.snapshot();
    expect(notes(store, 'hazard-groomed')).toBe(1);
    expect(after.lifetimeBilled).toBe(before.lifetimeBilled);
    expect(after.sprintCount).toBeGreaterThanOrEqual(before.sprintCount);
    expect(store.sprintValue()).toBeGreaterThanOrEqual(banked);
  });
});

describe('a Prod Freeze', () => {
  it('halves what the sprint will take, and gives it back', () => {
    const store = storeWith({ tier: 3 });
    const open = sprintSlots(store.snapshot());
    expect(store.sprintSlots()).toBe(open);

    let at = 0;
    for (let round = 0; round < 4 && store.sprintSlots() === open; round += 1) {
      at = run(store, at, at + FACT_EVERY_MS + FACT_COUNTDOWN_MS + 500);
    }
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
    const store = storeWith({ tier: 7, skills: { duration: 5 } });
    const at = windTo(store, 'migration');
    run(store, at, at + FACT_COUNTDOWN_MS + 500);

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

function invites(store: GameStore): number {
  return store.board.tickets.filter(
    (ticket) => TICKET_TYPES[ticket.type].effect === 'decline'
  ).length;
}

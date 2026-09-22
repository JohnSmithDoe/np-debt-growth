import { describe, expect, it } from 'vitest';

import { GameStore } from './game.store';
import type { Consultancy } from '../model/consultancy.model';
import { freshConsultancy } from '../model/consultancy.model';
import { SAVE_VERSION } from '../model/game.consts';
import { AWARDS } from '../model/award.model';
import { MAX_TIER } from '../model/tier.model';
import { addTicket } from '../util/board';
import * as economy from '../util/economy';
import { HAUL_MS, SPRINT_SLOTS_BASE } from '../model/balance/round';
import {
  ESCALATION_HOLD_MS,
  HOTFIX_MS,
  HOTFIX_MULTIPLIER,
} from '../model/balance/weather';

function storeWith(overrides: Partial<Consultancy> = {}): GameStore {
  const store = new GameStore();
  store.hydrate({ ...freshConsultancy(0, SAVE_VERSION), ...overrides });
  return store;
}

function place(
  store: GameStore,
  type: Parameters<typeof addTicket>[1]
): number {
  const ticket = addTicket(store.board, type);
  expect(ticket).not.toBeNull();
  return ticket!.id;
}

describe('the Hotfix Window (D31)', () => {
  it('doubles what a ticket bills, and stops when it runs out', () => {
    const store = storeWith();
    const before = economy.ticketValue(store.snapshot(), 'bug', 0);

    store.harvest([place(store, 'hotfix')]);
    const state = store.snapshot();
    expect(state.hotfixUntil).toBeGreaterThan(0);

    expect(
      economy.ticketValue(state, 'bug', state.hotfixUntil - 1)
    ).toBeCloseTo(before * HOTFIX_MULTIPLIER, 6);
    expect(economy.ticketValue(state, 'bug', state.hotfixUntil)).toBeCloseTo(
      before,
      6
    );
  });

  it('restarts its clock rather than stacking with itself', () => {
    const store = storeWith({ lastTick: 1_000 });
    store.harvest([place(store, 'hotfix')]);
    const first = store.snapshot().hotfixUntil;

    store.hydrate({ ...store.snapshot(), lastTick: 5_000 });
    store.harvest([place(store, 'hotfix')]);

    expect(store.snapshot().hotfixUntil).toBe(5_000 + HOTFIX_MS);
    expect(store.snapshot().hotfixUntil).toBeLessThan(first + HOTFIX_MS);
  });
});

describe('the held Escalation (D31)', () => {
  it('holds longer than the truck takes, so the window outlives a haul', () => {
    expect(ESCALATION_HOLD_MS).toBeGreaterThan(HAUL_MS);
  });

  it('arms a countdown rather than billing immediately', () => {
    const store = storeWith({ lastTick: 1_000 });
    store.harvest([place(store, 'escalation')]);

    const state = store.snapshot();
    expect(state.escalated).toBe(true);
    expect(state.escalationFiresAt).toBe(1_000 + ESCALATION_HOLD_MS);
    expect(state.budget).toBe(0);
  });

  it('bills itself when the countdown runs out, cadence or no cadence', () => {
    const store = storeWith({ lastTick: 1_000 });
    store.harvest([place(store, 'escalation')]);
    store.harvest([place(store, 'bug')]);
    expect(store.snapshot().sprintCount).toBe(1);

    store.advanceTo(1_000 + ESCALATION_HOLD_MS + 100);

    const state = store.snapshot();
    expect(state.budget).toBeGreaterThan(0);
    expect(state.escalated).toBe(false);
    expect(state.escalationFiresAt).toBe(0);
  });

  it('pays the escalation multiplier on what it caught', () => {
    const store = storeWith({ lastTick: 1_000 });
    store.harvest([place(store, 'escalation')]);
    store.harvest([place(store, 'bug')]);
    const flat = economy.ticketValue(store.snapshot(), 'bug', 1_000);

    store.advanceTo(1_000 + ESCALATION_HOLD_MS + 100);
    expect(store.snapshot().budget).toBeCloseTo(
      flat * economy.escalationMultiplier(store.snapshot()),
      4
    );
  });
});

describe('Quarter End (D31 — C4s one exception)', () => {
  it('bills far more than the sprint has slots for', () => {
    const store = storeWith();
    for (let n = 0; n < SPRINT_SLOTS_BASE + 80; n += 1) place(store, 'bug');
    const onBoard = store.board.tickets.length;

    store.harvest([place(store, 'quarter')]);

    const state = store.snapshot();
    expect(state.budget).toBeGreaterThan(0);
    expect(state.lifetimeClosed).toBeGreaterThan(SPRINT_SLOTS_BASE);
    expect(store.board.tickets.length).toBeLessThan(onBoard);
  });

  it('pays a buried board far more than a clear one', () => {
    const clear = storeWith();
    clear.harvest([place(clear, 'quarter')]);

    const buried = storeWith();
    for (let n = 0; n < 200; n += 1) place(buried, 'bug');
    buried.harvest([place(buried, 'quarter')]);

    expect(buried.snapshot().budget).toBeGreaterThan(
      clear.snapshot().budget * 50
    );
  });
});

describe('a full sprint and the rares (D23, D31)', () => {
  it('never refuses an event, however full the sprint is', () => {
    const store = storeWith({ sprintCount: 999 });
    const harvest = store.harvest([place(store, 'hotfix')]);

    expect(harvest.taken.length).toBe(1);
    expect(store.snapshot().hotfixUntil).toBeGreaterThan(0);
  });

  it('refuses ordinary work with no room left — the can is a hard cap', () => {
    const store = storeWith({ sprintCount: 999 });
    const harvest = store.harvest([place(store, 'bug')]);

    expect(harvest.taken.length).toBe(0);
    expect(harvest.value).toBe(0);
    expect(store.board.tickets.length).toBe(1);
  });
});

describe('awards (D19, D29)', () => {
  it('pays a milestone once and never again', () => {
    const store = storeWith({ lifetimeClosed: 1, lifetimeRounds: 1 });
    store.advanceTo(200);

    const first = store.snapshot();
    expect(first.achievements.length).toBeGreaterThan(0);

    store.advanceTo(400);
    expect(store.snapshot().achievements).toEqual(first.achievements);
    expect(store.snapshot().storyPoints).toBe(first.storyPoints);
  });

  it('grants exactly the Story Points the table says', () => {
    const store = storeWith({ tier: 3, lifetimeClosed: 100 });
    store.advanceTo(200);

    const state = store.snapshot();
    expect(economy.grantedStoryPoints(state)).toBeCloseTo(
      state.achievements.reduce(
        (sum, id) => sum + (AWARDS.find((a) => a.id === id)?.sp ?? 0),
        0
      ),
      6
    );
    expect(state.storyPoints).toBeGreaterThanOrEqual(
      economy.grantedStoryPoints(state)
    );
  });

  it('has no duplicate ids', () => {
    expect(new Set(AWARDS.map((a) => a.id)).size).toBe(AWARDS.length);
  });
});

describe('the ending (D2)', () => {
  it('cannot be closed before the ladder is finished', () => {
    const store = storeWith({ tier: 1 });
    expect(store.canEndRun()).toBe(false);
    expect(store.endRun(1_000)).toBe(false);
  });

  it('closes once, and stays closed', () => {
    const store = storeWith({ tier: MAX_TIER });
    expect(store.endRun(1_000)).toBe(true);
    expect(store.ended()).toBe(true);
    expect(store.endRun(2_000)).toBe(false);
  });
});

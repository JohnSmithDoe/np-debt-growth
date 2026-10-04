import { describe, expect, it } from 'vitest';

import { GameStore } from './game.store';
import type { Consultancy } from '../model/consultancy.model';
import { freshConsultancy } from '../model/consultancy.model';
import { SAVE_VERSION } from '../model/game.consts';
import type { TicketTypeId } from '../model/ticket.model';
import { TICKET_TYPES } from '../model/ticket.model';
import type { Buy } from '../util/advisor';
import { advise } from '../util/advisor';
import { DEFAULT_POLICY, advisedSpend, autoplay } from '../util/autoplay';
import { pickTouching } from '../util/board';
import { inTest } from '../model/board.model';
import * as economy from '../util/economy';
import { flow } from '../util/sim';

const SPAN_MS = 5 * 60_000;
const TOLERANCE = 1.5;

const SEEDS = [11, 23, 57, 91, 3, 41, 77, 99] as const;

const seeded = (start: number = SEEDS[0]): GameStore => {
  const store = new GameStore();
  let seed = start;
  store.seedRandom(
    () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648
  );
  return store;
};

function sweep(store: GameStore, credit: number): number {
  const state = store.snapshot();
  const worth = (id: TicketTypeId): number =>
    (TICKET_TYPES[id].handOnly ? 1e12 : 0) + economy.ticketValue(state, id);
  let left = credit + DEFAULT_POLICY.clicksPerSec / 10;
  while (left >= 1) {
    left -= 1;
    let aim = store.board.tickets[0];
    for (const ticket of store.board.tickets) {
      const better =
        Number(inTest(store.board, ticket)) -
          Number(inTest(store.board, aim!)) ||
        Number(ticket.golden) - Number(aim!.golden) ||
        worth(ticket.type) - worth(aim!.type);
      if (better > 0) aim = ticket;
    }
    if (!aim) break;
    store.harvest(
      pickTouching(store.board, aim.x, aim.y, economy.clickRadius(state))
    );
  }
  return left;
}

function onTheBoard(state: Consultancy): {
  euro: number;
  sp: number;
  closed: number;
} {
  let euro = 0;
  let sp = 0;
  let closed = 0;
  for (const seed of SEEDS) {
    const store = seeded(seed);
    store.hydrate({ ...state, lastTick: 0, runMs: state.runMs });
    let credit = 0;
    for (let ms = 100; ms <= SPAN_MS; ms += 100) {
      store.advanceTo(ms);
      credit = sweep(store, credit);
    }
    const end = store.snapshot();
    euro += end.lifetimeBilled - state.lifetimeBilled;
    sp +=
      end.storyPoints -
      state.storyPoints -
      (end.lifetimeAwardSp - state.lifetimeAwardSp);
    closed += end.lifetimeClosed - state.lifetimeClosed;
  }
  const seconds = (SPAN_MS / 1000) * SEEDS.length;
  return { euro: euro / seconds, sp: sp / seconds, closed: closed / seconds };
}

const LABELS = [
  'tier 1',
  'tier 3',
  'tier 4',
  'tier 5',
  'tier 6',
  'tier 7',
] as const;

const stops = ((): ReadonlyMap<string, Consultancy> => {
  const found = new Map<string, Consultancy>();
  autoplay(
    freshConsultancy(0, SAVE_VERSION),
    LABELS.map((label) => {
      const tier = Number(label.slice(5));
      return [
        label,
        (state: Consultancy) => {
          if (state.tier >= tier && !found.has(label)) found.set(label, state);
          return state.tier >= tier;
        },
      ] as const;
    }),
    4 * 60 * 60 * 1000
  );
  return found;
})();

describe('the sim agrees with the board', () => {
  for (const label of LABELS) {
    it(`prices ${label} within ×${TOLERANCE} of a real board`, () => {
      const state = stops.get(label)!;
      const model = flow(state, DEFAULT_POLICY);
      const board = onTheBoard(state);
      if (process.env['CB_SIM']) {
        process.stdout.write(
          `\n${label}: €/s sim ${model.euroPerSec.toExponential(2)} board ${board.euro.toExponential(2)}` +
            ` · SP/s sim ${model.spPerSec.toFixed(1)} board ${board.sp.toFixed(1)}` +
            ` · closes sim ${(model.handPerSec + model.crewPerSec).toFixed(1)} board ${board.closed.toFixed(1)} wontfix ${model.wontFixPerSec.toFixed(1)}` +
            ` · hand ${model.handPerSec.toFixed(2)} crew ${model.crewPerSec.toFixed(2)} supply ${model.supplyPerSec.toFixed(2)}\n`
        );
      }
      expect(model.euroPerSec / board.euro).toBeGreaterThan(1 / TOLERANCE);
      expect(model.euroPerSec / board.euro).toBeLessThan(TOLERANCE);
      expect(model.spPerSec / board.sp).toBeGreaterThan(1 / TOLERANCE);
      expect(model.spPerSec / board.sp).toBeLessThan(TOLERANCE);
    });
  }
});

function buy(store: GameStore, pick: Buy): boolean {
  switch (pick.kind) {
    case 'skill':
      return store.buySkill(pick.id);
    case 'credit':
      return store.approveOnCredit(pick.id);
    case 'line':
      return store.buyLine(pick.line);
    case 'spawner':
      return store.buySpawner(pick.adr);
    case 'income':
      return store.buyIncome(pick.id);
  }
}

const RUN_LIMIT_MS = 60 * 60_000;
const RUN_TOLERANCE = 1.1;

function acceptedOnTheBoard(): number {
  const store = seeded();
  store.hydrate({ ...freshConsultancy(0, SAVE_VERSION), lastTick: 0 });
  let credit = 0;
  for (let ms = 100; ms <= RUN_LIMIT_MS; ms += 100) {
    store.advanceTo(ms);
    credit = sweep(store, credit);
    if (ms % DEFAULT_POLICY.spendEveryMs === 0) {
      for (;;) {
        const advice = advise(store.snapshot(), DEFAULT_POLICY);
        const due = [advice.sp, advice.eur].find((pick) => pick?.waitSec === 0);
        if (!due || !buy(store, due.buy)) break;
      }
    }
    if (store.snapshot().endedAt > 0) return ms;
  }
  return Infinity;
}

describe('the sim agrees with the board over a whole run', () => {
  it(`accepts within ×${RUN_TOLERANCE} of a real board`, () => {
    const sim = autoplay(
      freshConsultancy(0, SAVE_VERSION),
      [['accepted', (state) => state.endedAt > 0]],
      RUN_LIMIT_MS,
      DEFAULT_POLICY,
      advisedSpend
    ).reached.get('accepted')!;
    const board = acceptedOnTheBoard();
    if (process.env['CB_SIM']) {
      process.stdout.write(
        `\naccepted: sim ${(sim / 60_000).toFixed(1)} min, board ${(board / 60_000).toFixed(1)} min\n`
      );
    }
    expect(board / sim).toBeGreaterThan(1 / RUN_TOLERANCE);
    expect(board / sim).toBeLessThan(RUN_TOLERANCE);
  }, 300_000);
});

import { describe, expect, it } from 'vitest';

import { GameStore } from './game.store';
import type { Consultancy } from '../model/consultancy.model';
import { freshConsultancy } from '../model/consultancy.model';
import { SAVE_VERSION } from '../model/game.consts';
import type { TicketTypeId } from '../model/ticket.model';
import { TICKET_TYPES } from '../model/ticket.model';
import { DEFAULT_POLICY, autoplay } from '../util/autoplay';
import { pickWithin } from '../util/board';
import * as economy from '../util/economy';
import { flow } from '../util/sim';

const SPAN_MS = 5 * 60_000;
/** The sim is a model, not a replay: it has to land within this factor of the board. */
const TOLERANCE = 1.35;

const seeded = (): GameStore => {
  const store = new GameStore();
  let seed = 11;
  store.seedRandom(
    () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648
  );
  return store;
};

/** Plays `state` on a real board for `SPAN_MS`, sweeping like the sim's hand. */
function onTheBoard(state: Consultancy): { euro: number; sp: number } {
  const store = seeded();
  store.hydrate({ ...state, lastTick: 0, runMs: state.runMs });
  const worth = (id: TicketTypeId): number =>
    (TICKET_TYPES[id].handOnly ? 1e12 : 0) +
    economy.ticketValue(store.snapshot(), id);
  let credit = 0;
  for (let ms = 100; ms <= SPAN_MS; ms += 100) {
    store.advanceTo(ms);
    credit += DEFAULT_POLICY.clicksPerSec / 10;
    while (credit >= 1) {
      credit -= 1;
      let aim = store.board.tickets[0];
      for (const ticket of store.board.tickets) {
        const better =
          Number(ticket.golden) - Number(aim!.golden) ||
          worth(ticket.type) - worth(aim!.type);
        if (better > 0) aim = ticket;
      }
      if (!aim) break;
      store.harvest(
        pickWithin(
          store.board,
          aim.x,
          aim.y,
          economy.clickRadius(store.snapshot())
        )
      );
    }
  }
  const end = store.snapshot();
  return {
    euro: (end.lifetimeBilled - state.lifetimeBilled) / (SPAN_MS / 1000),
    sp: (end.storyPoints - state.storyPoints) / (SPAN_MS / 1000),
  };
}

const LABELS = ['tier 1', 'tier 3', 'tier 6'] as const;

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

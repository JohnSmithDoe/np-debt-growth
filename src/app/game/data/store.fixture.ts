import type { ConsultancyPatch } from '../model/consultancy.fixture';
import { consultancy } from '../model/consultancy.fixture';
import { TICK_MS } from '../model/game.consts';
import { OFFICE_NODE_IDS } from '../model/skill.model';
import { GameStore } from './game.store';

export function storeWith(patch: ConsultancyPatch = {}): GameStore {
  const store = new GameStore();
  store.hydrate(consultancy(patch));
  return store;
}

/** Bought office nodes, which is how the floor — and so the desks — grows. */
export function rooms(count: number): Record<string, number> {
  return Object.fromEntries(
    OFFICE_NODE_IDS.slice(0, count).map((id) => [id, 1])
  );
}

/** Walk the clock to `to` in the sub-ticks the real clock would use. */
export function tick(store: GameStore, to: number, from = 0): void {
  for (let at = from + TICK_MS; at <= to; at += TICK_MS) store.advanceTo(at);
}

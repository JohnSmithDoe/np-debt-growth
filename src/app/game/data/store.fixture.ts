import type { ConsultancyPatch } from '../model/consultancy.fixture';
import { consultancy, ranksOf } from '../model/consultancy.fixture';
import { TICK_MS } from '../model/game.consts';
import { GameStore } from './game.store';

export function storeWith(patch: ConsultancyPatch = {}): GameStore {
  const store = new GameStore();
  store.hydrate(consultancy(patch));
  return store;
}

export function rooms(ranks: number): Record<string, number> {
  return { root: 1, crew: 1, junior: 1, ...ranksOf('juniorRoom', ranks) };
}

export function tick(store: GameStore, to: number, from = 0): void {
  for (let at = from + TICK_MS; at <= to; at += TICK_MS) store.advanceTo(at);
}

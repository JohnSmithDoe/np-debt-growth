import type { ConsultancyPatch } from '../model/consultancy.fixture';
import { consultancy } from '../model/consultancy.fixture';
import { TICK_MS } from '../model/game.consts';
import { DESK_NODE_ID, SKILL_BY_ID } from '../model/skill.model';
import { GameStore } from './game.store';

export function storeWith(patch: ConsultancyPatch = {}): GameStore {
  const store = new GameStore();
  store.hydrate(consultancy(patch));
  return store;
}

/** Ranks of the headcount node — the only thing that adds desks. */
export function rooms(ranks: number): Record<string, number> {
  const node = SKILL_BY_ID.get(DESK_NODE_ID);
  return {
    root: 1,
    crew: 1,
    junior: 1,
    [DESK_NODE_ID]: Math.min(ranks, node?.levels.length ?? 0),
  };
}

/** Walk the clock to `to` in the sub-ticks the real clock would use. */
export function tick(store: GameStore, to: number, from = 0): void {
  for (let at = from + TICK_MS; at <= to; at += TICK_MS) store.advanceTo(at);
}

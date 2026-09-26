import type { ConsultancyPatch } from '../model/consultancy.fixture';
import { consultancy } from '../model/consultancy.fixture';
import { TICK_MS } from '../model/game.consts';
import { ROOM_NODE_BY_LINE, SKILL_BY_ID } from '../model/skill.model';
import { GameStore } from './game.store';

export function storeWith(patch: ConsultancyPatch = {}): GameStore {
  const store = new GameStore();
  store.hydrate(consultancy(patch));
  return store;
}

/** Ranks of the junior room node — the only thing that adds junior seats. */
export function rooms(ranks: number): Record<string, number> {
  const room = ROOM_NODE_BY_LINE.junior;
  const node = SKILL_BY_ID.get(room);
  return {
    root: 1,
    crew: 1,
    junior: 1,
    [room]: Math.min(ranks, node?.levels.length ?? 0),
  };
}

/** Walk the clock to `to` in the sub-ticks the real clock would use. */
export function tick(store: GameStore, to: number, from = 0): void {
  for (let at = from + TICK_MS; at <= to; at += TICK_MS) store.advanceTo(at);
}

import type { GameStore } from './game.store';
import type { BoardTicket } from '../model/board.model';
import { inTest } from '../model/board.model';
import { LOGICAL_BOARD } from '../model/geometry';
import { TICKET_TYPES } from '../model/ticket.model';
import { pickTouching } from '../util/board';
import * as economy from '../util/economy';

/** The engaged player `ACTIVE_HAND` stands for, played frame by frame on a real board. */
const HOVER = {
  pxPerSec: 600,
  reactMs: 300,
  seen: 6,
  cycleMs: 10_000,
  onBoardMs: 6_000,
  frames: 6,
} as const;

export type Hand = (store: GameStore, ms: number) => void;

export function hoverHand(seed: number): Hand {
  const at = { x: LOGICAL_BOARD.width / 2, y: LOGICAL_BOARD.height / 2 };
  let aim: BoardTicket | null = null;
  let lookAt = 0;
  let r = seed;
  const rand = (): number =>
    (r = (r * 1103515245 + 12345) % 2147483648) / 2147483648;
  const step = HOVER.pxPerSec / 1000 / HOVER.frames;

  return (store, ms) => {
    const state = store.snapshot();
    const away = ms % HOVER.cycleMs >= HOVER.onBoardMs;
    if (away && !economy.inAcceptance(state)) return;
    const board = store.board;
    const radius = economy.clickRadius(state);
    for (let frame = 0; frame < HOVER.frames; frame += 1) {
      const now = ms + (frame * 100) / HOVER.frames;
      if (
        now >= lookAt ||
        !aim ||
        !board.byId.has(aim.id) ||
        aim.lifeLeftMs === 0
      ) {
        lookAt = now + HOVER.reactMs;
        aim = null;
        let best = -Infinity;
        for (const ticket of board.tickets) {
          if (ticket.lifeLeftMs === 0) continue;
          const handOnly = TICKET_TYPES[ticket.type].handOnly;
          const stands = handOnly || ticket.golden || inTest(board, ticket);
          if (!stands && rand() * board.tickets.length > HOVER.seen) continue;
          const worth = economy.ticketValue(state, ticket.type);
          const score =
            Number(inTest(board, ticket)) * 1e30 +
            Number(ticket.golden) * 1e20 +
            Number(handOnly) * 1e12 +
            worth * (1 - Math.hypot(ticket.x - at.x, ticket.y - at.y) * 1e-9);
          if (score > best) {
            best = score;
            aim = ticket;
          }
        }
      }
      if (aim) {
        const dx = aim.x - at.x;
        const dy = aim.y - at.y;
        const far = Math.hypot(dx, dy);
        const move = Math.min(1, (step * 100) / Math.max(far, 1e-9));
        at.x += dx * move;
        at.y += dy * move;
      }
      store.harvest(pickTouching(board, at.x, at.y, radius));
    }
  };
}

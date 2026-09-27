import type { TicketTypeId } from '../model/ticket.model';
import { TICKET_TYPES, TICKET_TYPE_IDS } from '../model/ticket.model';

const crosses = (fromMs: number, toMs: number, atMs: number): boolean =>
  fromMs < atMs && toMs >= atMs;

export function scriptedSpawns(
  fromMs: number,
  toMs: number
): readonly TicketTypeId[] {
  return TICKET_TYPE_IDS.filter((id) => {
    const at = TICKET_TYPES[id].revealAtMs;
    return at !== undefined && crosses(fromMs, toMs, at);
  });
}

export function heldBack(type: TicketTypeId, fromMs: number): boolean {
  const { revealAtMs } = TICKET_TYPES[type];
  return revealAtMs !== undefined && fromMs < revealAtMs;
}

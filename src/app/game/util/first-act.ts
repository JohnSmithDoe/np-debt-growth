import type { TicketTypeId } from '../model/ticket.model';
import { TICKET_TYPES, TICKET_TYPE_IDS } from '../model/ticket.model';

const crosses = (fromMs: number, toMs: number, atMs: number): boolean =>
  fromMs < atMs && toMs >= atMs;

/** Types whose first card is placed on the beat their reveal lands. */
export function scriptedSpawns(
  fromMs: number,
  toMs: number
): readonly TicketTypeId[] {
  return TICKET_TYPE_IDS.filter((id) => {
    const at = TICKET_TYPES[id].revealAtMs;
    return at !== undefined && crosses(fromMs, toMs, at);
  });
}

export function heldBack(
  type: TicketTypeId,
  fromMs: number,
  tier: number
): boolean {
  const { revealAtMs, revealAtTier } = TICKET_TYPES[type];
  if (revealAtMs !== undefined && fromMs < revealAtMs) return true;
  return revealAtTier !== undefined && tier < revealAtTier;
}

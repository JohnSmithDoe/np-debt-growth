import type { TicketTypeId } from '../model/ticket.model';
import { BUG_REVEAL_TIER, FIRST_INCIDENT_AT_MS } from '../model/balance/flow';

const crosses = (fromMs: number, toMs: number, atMs: number): boolean =>
  fromMs < atMs && toMs >= atMs;

export function scriptedSpawns(
  fromMs: number,
  toMs: number
): readonly TicketTypeId[] {
  return crosses(fromMs, toMs, FIRST_INCIDENT_AT_MS) ? ['incident'] : [];
}

export function heldBack(
  type: TicketTypeId,
  fromMs: number,
  tier: number
): boolean {
  if (type === 'incident') return fromMs < FIRST_INCIDENT_AT_MS;
  if (type === 'bug') return tier < BUG_REVEAL_TIER;
  return false;
}

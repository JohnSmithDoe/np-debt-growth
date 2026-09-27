import { cssHex } from '../../@shared/util/css-hex';
import type { SprintSlot } from '../../game/model/board.model';
import {
  TICKET_TITLE_COUNTS,
  ticketTitleKey,
} from '../../game/model/ticket-copy.model';
import {
  TICKET_TYPE_IDS,
  TICKET_TYPES,
  type TicketTypeId,
} from '../../game/model/ticket.model';

export interface TickerItem {
  readonly key: string;
  readonly titleKey: string;
  readonly colour: string;
}

const TIER_WEIGHT = 2;
const CLOSES_SCANNED = 200;

/** The newest of `closes` not on the track, its type weighted by tier. */
export function nextClosedItem(
  closes: readonly SprintSlot[],
  onTrack: ReadonlySet<string>,
  roll: () => number = Math.random
): TickerItem | null {
  const pick = newestOfType(closes, onTrack, roll);
  return pick ? item(pick, roll) : null;
}

/** Any type's title not on the track. */
export function nextBacklogItem(
  onTrack: ReadonlySet<string>,
  roll: () => number = Math.random
): TickerItem | null {
  const pool = TICKET_TYPE_IDS.flatMap((type) =>
    Array.from({ length: TICKET_TITLE_COUNTS[type] }, (_, at) => ({
      type,
      titleKey: ticketTitleKey(type, at),
    }))
  ).filter((slot) => !onTrack.has(slot.titleKey));
  const pick = pool[Math.floor(roll() * pool.length)];
  return pick ? item(pick, roll) : null;
}

function item(slot: SprintSlot, roll: () => number): TickerItem {
  const type = TICKET_TYPES[slot.type];
  return {
    key: `${type.prefix}-${1000 + Math.floor(roll() * 8999)}`,
    titleKey: slot.titleKey,
    colour: cssHex(type.colour),
  };
}

function newestOfType(
  closes: readonly SprintSlot[],
  onTrack: ReadonlySet<string>,
  roll: () => number
): SprintSlot | undefined {
  const newest = new Map<TicketTypeId, SprintSlot>();
  const from = Math.max(0, closes.length - CLOSES_SCANNED);
  for (let at = closes.length - 1; at >= from; at--) {
    const slot = closes[at] as SprintSlot;
    if (!newest.has(slot.type) && !onTrack.has(slot.titleKey))
      newest.set(slot.type, slot);
  }
  const type = weighted([...newest.keys()], roll);
  return type && newest.get(type);
}

function weighted(
  types: readonly TicketTypeId[],
  roll: () => number
): TicketTypeId | undefined {
  const weights = types.map((id) => TIER_WEIGHT ** TICKET_TYPES[id].tier);
  let left = roll() * weights.reduce((sum, weight) => sum + weight, 0);
  return (
    types.find((_, at) => (left -= weights[at] as number) < 0) ?? types.at(-1)
  );
}

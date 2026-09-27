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

export const TICKER_TIER_SPAN = 2;
const TIER_WEIGHT = 2;
const CLOSES_SCANNED = 200;

export function tickerTypes(tier: number | undefined): TicketTypeId[] {
  if (tier === undefined) return [...TICKET_TYPE_IDS];
  return TICKET_TYPE_IDS.filter((id) => {
    const type = TICKET_TYPES[id];
    return (
      !type.handOnly && type.tier <= tier && type.tier > tier - TICKER_TIER_SPAN
    );
  });
}

/**
 * A type weighted by tier, then its newest recent close not on the track,
 * else one of its titles not on the track.
 */
export function nextTickerItem(
  closes: readonly SprintSlot[],
  types: readonly TicketTypeId[],
  onTrack: ReadonlySet<string>,
  roll: () => number = Math.random
): TickerItem | null {
  const pick =
    fromCloses(closes, onTrack, roll) ?? drawTitle(types, onTrack, roll);
  if (!pick) return null;
  return {
    key: `${TICKET_TYPES[pick.type].prefix}-${1000 + Math.floor(roll() * 8999)}`,
    titleKey: pick.titleKey,
    colour: cssHex(TICKET_TYPES[pick.type].colour),
  };
}

function fromCloses(
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

function drawTitle(
  types: readonly TicketTypeId[],
  onTrack: ReadonlySet<string>,
  roll: () => number
): SprintSlot | undefined {
  const free = (type: TicketTypeId): string[] =>
    Array.from({ length: TICKET_TITLE_COUNTS[type] }, (_, at) =>
      ticketTitleKey(type, at)
    ).filter((key) => !onTrack.has(key));
  const type = weighted(
    types.filter((id) => free(id).length > 0),
    roll
  );
  if (!type) return undefined;
  const keys = free(type);
  return { type, titleKey: keys[Math.floor(roll() * keys.length)] as string };
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

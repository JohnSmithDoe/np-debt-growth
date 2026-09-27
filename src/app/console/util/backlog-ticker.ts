import {
  TICKET_TITLE_COUNTS,
  ticketTitleKey,
} from '../../game/model/ticket-copy.model';
import { TICKET_TYPE_IDS, TICKET_TYPES } from '../../game/model/ticket.model';

export interface TickerItem {
  readonly key: string;
  readonly titleKey: string;
}

export function backlogTicker(
  length: number,
  roll: () => number = Math.random
): TickerItem[] {
  const pool = TICKET_TYPE_IDS.flatMap((type) =>
    Array.from({ length: TICKET_TITLE_COUNTS[type] }, (_, at) => ({
      type,
      at,
    }))
  );
  const items: TickerItem[] = [];
  while (items.length < length && pool.length > 0) {
    const [{ type, at }] = pool.splice(Math.floor(roll() * pool.length), 1) as [
      (typeof pool)[number],
    ];
    items.push({
      key: `${TICKET_TYPES[type].prefix}-${1000 + Math.floor(roll() * 8999)}`,
      titleKey: ticketTitleKey(type, at),
    });
  }
  return items;
}

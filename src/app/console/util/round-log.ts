import type { CloseLine, FeedLine } from '../../game/model/feed.model';
import { TICKET_TYPES } from '../../game/model/ticket.model';

import type { FeedRow, Say } from './feed-row';
import { feedRow } from './feed-row';

export const ROUND_LOG_SLOTS = 3;

const isClose = (line: FeedLine): line is CloseLine => line.kind === 'close';

function worth(line: CloseLine): number {
  const rare = TICKET_TYPES[line.close.type].handOnly ? 1 : 0;
  return rare * Number.MAX_SAFE_INTEGER + line.value;
}

export function roundHighlights(
  lines: readonly FeedLine[],
  escalation: number,
  say: Say,
  slots = ROUND_LOG_SLOTS
): FeedRow[] {
  const closes = lines.filter(isClose);
  const news = lines.filter((line) => !isClose(line));

  const half = Math.floor(slots / 2);
  const newsTake = Math.min(news.length, Math.max(half, slots - closes.length));
  const closeTake = Math.min(closes.length, slots - newsTake);

  return [
    ...(newsTake > 0 ? news.slice(-newsTake) : []),
    ...[...closes].sort((a, b) => worth(b) - worth(a)).slice(0, closeTake),
  ]
    .sort((a, b) => a.seq - b.seq)
    .map((line) => feedRow(line, escalation, say));
}

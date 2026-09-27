import { describe, expect, it } from 'vitest';

import type { FeedLine } from '../../game/model/feed.model';
import type { TicketTypeId } from '../../game/model/ticket.model';

import { ROUND_LOG_SLOTS, roundHighlights } from './round-log';
import { ESCALATION_MULTIPLIER } from '../../game/model/balance/weather';

function close(
  seq: number,
  value: number,
  type: TicketTypeId = 'lint'
): FeedLine {
  return {
    kind: 'close',
    seq,
    titleKey: `title ${seq}`,
    value,
    close: {
      type,
      titleKey: `title ${seq}`,
      golden: false,
      spBonus: 0,
      by: 'you',
      poolSeat: 0,
      woman: false,
      x: 0,
      y: 0,
    },
  };
}

const award = (seq: number): FeedLine => ({
  kind: 'award',
  seq,
  award: 'first-blood',
});

const say = (key: string): string => key;

describe('roundHighlights', () => {
  it('never returns more rows than it has slots for', () => {
    const closes = Array.from({ length: 40 }, (_, i) => close(i, i));
    expect(roundHighlights(closes, ESCALATION_MULTIPLIER, say)).toHaveLength(
      ROUND_LOG_SLOTS
    );
    expect(
      roundHighlights([...closes, award(99)], ESCALATION_MULTIPLIER, say)
    ).toHaveLength(ROUND_LOG_SLOTS);
  });

  it('is empty when the round was', () => {
    expect(roundHighlights([], ESCALATION_MULTIPLIER, say)).toHaveLength(0);
  });

  it('keeps the dearest close, not the latest one', () => {
    const rows = roundHighlights(
      [close(1, 500), close(2, 1), close(3, 2), close(4, 3)],
      ESCALATION_MULTIPLIER,
      say
    );
    expect(rows.map((row) => row.seq)).toContain(1);
  });

  it('keeps a rare close over a dearer common one', () => {
    const rows = roundHighlights(
      [close(1, 9999), close(2, 1, 'incident')],
      ESCALATION_MULTIPLIER,
      say,
      1
    );
    expect(rows.map((row) => row.seq)).toEqual([2]);
  });

  it('reads in the order the round happened', () => {
    const rows = roundHighlights(
      [close(1, 5), award(2), close(3, 9)],
      ESCALATION_MULTIPLIER,
      say
    );
    expect(rows.map((row) => row.seq)).toEqual([1, 2, 3]);
  });

  it('gives news the slots the closes do not need', () => {
    const rows = roundHighlights(
      [award(1), award(2), award(3), award(4)],
      ESCALATION_MULTIPLIER,
      say
    );
    expect(rows.map((row) => row.seq)).toEqual([2, 3, 4]);
  });
});

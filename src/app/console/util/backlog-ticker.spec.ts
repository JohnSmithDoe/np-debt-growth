import { describe, expect, it } from 'vitest';

import { EN } from '../../@shared/util/i18n/catalogue/en';
import type { SprintSlot } from '../../game/model/board.model';
import { ticketTitleKey } from '../../game/model/ticket-copy.model';
import { TICKET_TYPES } from '../../game/model/ticket.model';
import { MAX_TIER } from '../../game/model/tier.model';
import { nextTickerItem, tickerTypes } from './backlog-ticker';

const deal = (count: number, tier?: number): string[] => {
  const onTrack = new Set<string>();
  for (let at = 0; at < count; at++) {
    const item = nextTickerItem([], tickerTypes(tier), onTrack);
    if (item) onTrack.add(item.titleKey);
  }
  return [...onTrack];
};

describe('the backlog ticker', () => {
  it('never shows a title twice, every one in the catalogue', () => {
    const titles = deal(40);

    expect(titles).toHaveLength(40);
    expect(titles.filter((key) => !(key in EN))).toEqual([]);
  });

  it('keys each line like a ticket', () => {
    const item = nextTickerItem([], ['lint'], new Set(), () => 0);

    expect(item?.key).toBe('LINT-1000');
    expect(item?.colour).toBe('#6b7280');
  });

  it('opens on lint and bugs alone', () => {
    expect(tickerTypes(0)).toEqual(['lint', 'bug']);
  });

  it('shows the latest two tiers, never one above', () => {
    for (let tier = 1; tier <= MAX_TIER; tier++) {
      const tiers = tickerTypes(tier).map((id) => TICKET_TYPES[id].tier);

      expect(new Set(tiers)).toEqual(new Set([tier - 1, tier]));
    }
  });

  it('fills a screen at every tier', () => {
    for (let tier = 0; tier <= MAX_TIER; tier++)
      expect(deal(18, tier)).toHaveLength(18);
  });

  it('takes the newest close of a type not already on the track', () => {
    const closes: SprintSlot[] = [
      { type: 'lint', titleKey: ticketTitleKey('lint', 1) },
      { type: 'lint', titleKey: ticketTitleKey('lint', 2) },
      { type: 'lint', titleKey: ticketTitleKey('lint', 3) },
    ];
    const onTrack = new Set([ticketTitleKey('lint', 3)]);

    expect(nextTickerItem(closes, ['bug'], onTrack)?.titleKey).toBe(
      ticketTitleKey('lint', 2)
    );
  });

  it('favours higher tiers without shutting out the lower', () => {
    const closes: SprintSlot[] = [
      { type: 'legacy', titleKey: ticketTitleKey('legacy', 0) },
      ...Array.from({ length: 50 }, (_, at) => ({
        type: 'lint' as const,
        titleKey: ticketTitleKey('lint', at % 20),
      })),
    ];
    const types = Array.from(
      { length: 300 },
      () => nextTickerItem(closes, [], new Set())?.key.split('-')[0]
    );
    const legacy = types.filter((prefix) => prefix === 'LEG').length;

    expect(legacy).toBeGreaterThan(150);
    expect(legacy).toBeLessThan(270);
  });
});

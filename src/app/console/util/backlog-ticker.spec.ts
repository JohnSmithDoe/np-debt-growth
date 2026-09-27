import { describe, expect, it } from 'vitest';

import { EN } from '../../@shared/util/i18n/catalogue/en';
import type { SprintSlot } from '../../game/model/board.model';
import { ticketTitleKey } from '../../game/model/ticket-copy.model';
import { nextBacklogItem, nextClosedItem } from './backlog-ticker';

const lint = (at: number): SprintSlot => ({
  type: 'lint',
  titleKey: ticketTitleKey('lint', at),
});

describe('the backlog ticker', () => {
  it('deals the backlog without a title twice, every one in the catalogue', () => {
    const onTrack = new Set<string>();
    for (let at = 0; at < 40; at++) {
      const item = nextBacklogItem(onTrack);
      if (item) onTrack.add(item.titleKey);
    }

    expect(onTrack.size).toBe(40);
    expect([...onTrack].filter((key) => !(key in EN))).toEqual([]);
  });

  it('keys each line like a ticket, in its colour', () => {
    const item = nextBacklogItem(new Set(), () => 0);

    expect(item?.key).toBe('LINT-1000');
    expect(item?.colour).toBe('#6b7280');
  });

  it('has nothing to say until something is closed', () => {
    expect(nextClosedItem([], new Set())).toBeNull();
  });

  it('takes the newest close not already on the track', () => {
    const onTrack = new Set([lint(3).titleKey]);

    expect(nextClosedItem([lint(1), lint(2), lint(3)], onTrack)?.titleKey).toBe(
      lint(2).titleKey
    );
  });

  it('never repeats a close already on the track', () => {
    const onTrack = new Set([lint(1).titleKey, lint(2).titleKey]);

    expect(nextClosedItem([lint(1), lint(2)], onTrack)).toBeNull();
  });

  it('favours higher tiers without shutting out the lower', () => {
    const closes: SprintSlot[] = [
      { type: 'legacy', titleKey: ticketTitleKey('legacy', 0) },
      ...Array.from({ length: 50 }, (_, at) => lint(at % 20)),
    ];
    const legacy = Array.from({ length: 300 }, () =>
      nextClosedItem(closes, new Set())?.key.startsWith('LEG-')
    ).filter(Boolean).length;

    expect(legacy).toBeGreaterThan(150);
    expect(legacy).toBeLessThan(270);
  });
});

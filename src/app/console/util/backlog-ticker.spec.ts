import { describe, expect, it } from 'vitest';

import { EN } from '../../@shared/util/i18n/catalogue/en';
import { backlogTicker } from './backlog-ticker';

describe('the backlog ticker', () => {
  it('deals the asked length, no title twice, every one in the catalogue', () => {
    const items = backlogTicker(40);

    expect(items).toHaveLength(40);
    expect(new Set(items.map((item) => item.titleKey)).size).toBe(40);
    expect(items.filter((item) => !(item.titleKey in EN))).toEqual([]);
  });

  it('keys each line like a ticket', () => {
    const [first] = backlogTicker(1, () => 0);

    expect(first?.key).toBe('LINT-1000');
  });
});

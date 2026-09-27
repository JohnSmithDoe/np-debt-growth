import { describe, expect, it } from 'vitest';

import { splitLabel } from './board-atlas';

describe('splitLabel', () => {
  it('breaks a hyphenated compound where the lines balance', () => {
    expect(splitLabel('Pizza-Party-Gutschein')).toEqual([
      'PIZZA-PARTY-',
      'GUTSCHEIN',
    ]);
  });

  it('drops the space it breaks at', () => {
    expect(splitLabel('Pizza party voucher')).toEqual([
      'PIZZA PARTY',
      'VOUCHER',
    ]);
  });

  it('keeps an unbreakable word whole', () => {
    expect(splitLabel('Kalendereinladung')).toEqual(['KALENDEREINLADUNG', '']);
  });
});

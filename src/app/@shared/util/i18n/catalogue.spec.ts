import { describe, expect, it } from 'vitest';

import { DE } from './catalogue/de';
import { EN } from './catalogue/en';

describe('the catalogues', () => {
  it('carry exactly the same keys', () => {
    const missingFromDe = Object.keys(EN).filter((key) => !(key in DE));
    const missingFromEn = Object.keys(DE).filter((key) => !(key in EN));

    expect({ missingFromDe, missingFromEn }).toEqual({
      missingFromDe: [],
      missingFromEn: [],
    });
  });

  it('leave no value empty', () => {
    for (const [language, catalogue] of [
      ['en', EN],
      ['de', DE],
    ] as const) {
      const empty = Object.entries(catalogue)
        .filter(([, value]) => value.trim() === '')
        .map(([key]) => `${language}:${key}`);
      expect(empty).toEqual([]);
    }
  });

  it('are not the same file twice', () => {
    const shared = Object.keys(EN).filter((key) => EN[key] === DE[key]);
    expect(shared.length / Object.keys(EN).length).toBeLessThan(0.2);
  });
});

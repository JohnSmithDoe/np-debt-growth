import { existsSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { MAX_TIER } from '../../game/model/tier.model';

import {
  CLOSING_OFFICE_ART,
  officeArtFor,
  officeFilmstrip,
} from './office-art';

describe('the office art', () => {
  const rungs = Array.from({ length: MAX_TIER }, (_, i) => i + 1);

  it('ships a file for every rung, and for the closing shot', () => {
    const urls = [...rungs.map(officeArtFor), CLOSING_OFFICE_ART];
    const missing = urls.filter((url) => !existsSync(`src/${url}`));

    expect(missing).toEqual([]);
  });

  it('never draws one room twice', () => {
    const urls = [
      officeArtFor(0),
      ...rungs.map(officeArtFor),
      CLOSING_OFFICE_ART,
    ];

    expect(new Set(urls).size).toBe(urls.length);
  });

  it('leaves the rungs above the one reached blank', () => {
    const strip = officeFilmstrip(3, false, (i) => `tier ${i}`, 'outside');

    expect(
      strip.filter((frame) => frame.missed).map((frame) => frame.index)
    ).toEqual([4, 5, 6, 7, 8]);
  });

  it('adds the closing shot only once the engagement is closed', () => {
    const open = officeFilmstrip(MAX_TIER, false, String, 'outside');
    const closed = officeFilmstrip(MAX_TIER, true, String, 'outside');

    expect(open.map((frame) => frame.art)).not.toContain(CLOSING_OFFICE_ART);
    expect(closed.at(-1)?.art).toBe(CLOSING_OFFICE_ART);
  });
});

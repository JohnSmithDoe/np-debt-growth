import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  ART_LICENSE_URL,
  CREDITS,
  LICENSE_URL,
  SOURCE_URL,
} from './credit.model';

interface AssetEntry {
  glob: string;
  input: string;
  output: string;
}

const buildAssets = (): AssetEntry[] =>
  JSON.parse(readFileSync('angular.json', 'utf8')).projects['np-debt-growth']
    .architect.build.options.assets;

const sources = (url: string): string[] =>
  buildAssets()
    .filter((asset) => url.startsWith(`${asset.output}/`))
    .map((asset) => join(asset.input, url.slice(asset.output.length + 1)));

describe('credits', () => {
  it('offers the source, as AGPL §13 requires', () => {
    expect(SOURCE_URL).toMatch(/^https:\/\/\S+$/);
  });

  it('names someone and a licence for everything shipped', () => {
    for (const credit of CREDITS) {
      expect(credit.who, credit.what).not.toBe('');
      expect(credit.license, credit.what).not.toBe('');
    }
  });

  it('ships every text it links to', () => {
    const linked = [
      LICENSE_URL,
      ART_LICENSE_URL,
      ...CREDITS.map((credit) => credit.url ?? ''),
    ].filter((url) => url !== '' && !url.startsWith('http'));

    expect(linked.length).toBeGreaterThan(2);
    for (const url of linked) {
      expect(sources(url).some(existsSync), url).toBe(true);
    }
  });
});

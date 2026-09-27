import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  ART_LICENSE_URL,
  ARTIST_ALIASES,
  CREDITS,
  LICENSE_URL,
  LPC_ARTISTS,
  SOURCE_URL,
  UNNAMED_ARTIST,
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

describe('the LPC artists on the closing roll', () => {
  const named = (): Set<string> => {
    const file = readFileSync(
      'src/assets/characters/crew-atlas.credits.txt',
      'utf8'
    );
    const names = new Set<string>();
    let inAuthors = false;
    for (const line of file.split('\n')) {
      if (/^\t- Authors:/.test(line)) inAuthors = true;
      else if (/^\t- /.test(line) || !line.startsWith('\t\t- ')) {
        inAuthors = false;
      } else if (inAuthors) {
        const name = line.slice(4).trim();
        if (name !== UNNAMED_ARTIST) names.add(ARTIST_ALIASES[name] ?? name);
      }
    }
    return names;
  };

  it('names everyone the shipped sheets credit, and no one else', () => {
    expect(new Set(LPC_ARTISTS)).toEqual(named());
  });

  it('names each of them once', () => {
    expect(new Set(LPC_ARTISTS).size).toBe(LPC_ARTISTS.length);
  });
});

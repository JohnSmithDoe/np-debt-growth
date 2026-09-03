import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { CAST } from '../../game/model/cast.model';

const UNIFORM = {
  junior: {
    sleeve: 'shortsleeve',
    garments: [
      'tshirt',
      'tshirt_scoop',
      'tshirt_vneck',
      'tshirt_buttoned',
      'shortsleeve',
      'shortsleeve_polo',
    ],
    colours: [
      'orange',
      'yellow',
      'teal',
      'red',
      'green',
      'sky',
      'pink',
      'rose',
      'all.lpcr.apple',
      'all.lpcr.apricot',
      'all.lpcr.coral',
      'all.lpcr.cyan',
      'all.lpcr.lemon',
      'all.lpcr.mint',
      'all.lpcr.spring',
      'all.lpcr.cerise',
    ],
  },
  senior: {
    sleeve: 'longsleeve',
    garments: [
      'longsleeve',
      'longsleeve2',
      'longsleeve2_buttoned',
      'longsleeve2_vneck',
      'longsleeve2_polo',
      'longsleeve2_cardigan',
      'longsleeve2_scoop',
    ],
    colours: [
      'charcoal',
      'navy',
      'black',
      'slate',
      'forest',
      'all.lpcr.midnight',
      'all.lpcr.shadow',
      'all.lpcr.soot',
      'all.lpcr.indigo',
      'all.lpcr.denim',
      'all.lpcr.plum',
    ],
  },
} as const;

const MANAGER_ONLY = ['neck/', 'hat/', 'torso/clothes/vest'] as const;

const AWAITING_REROLL: readonly string[] = [];

const SKINS: readonly string[] = CAST.map((entry) => entry.skin);

const PRESETS: Readonly<Record<string, { readonly hash: string }>> = JSON.parse(
  readFileSync('.claude/skills/lpc-character/presets.json', 'utf8')
).presets;

const roleOf = (skin: string): keyof typeof UNIFORM | null =>
  skin.startsWith('junior')
    ? 'junior'
    : skin.startsWith('senior')
      ? 'senior'
      : null;

const layersOf = (skin: string): readonly string[] =>
  readFileSync(`art/characters/${skin}.credits.txt`, 'utf8')
    .split('\n')
    .flatMap(
      (line) => /^(?:torso\/clothes|neck|hat)\/[a-z0-9_/]+/.exec(line) ?? []
    );

const garmentsOf = (skin: string): readonly string[] => [
  ...new Set(
    layersOf(skin)
      .filter(
        (layer) =>
          layer.startsWith('torso/clothes/') &&
          !layer.startsWith('torso/clothes/vest')
      )
      .map((layer) => layer.split('/').slice(2, 4).join('/'))
  ),
];

const colourOf = (skin: string): string => {
  const clothes = /clothes=([^&]+)/.exec(PRESETS[skin]?.hash ?? '')?.[1] ?? '';

  return /_(all\.[^_]+)$/.exec(clothes)?.[1] ?? clothes.split('_').at(-1) ?? '';
};

const held = (skins: readonly string[]): readonly string[] =>
  skins.filter((skin) => !AWAITING_REROLL.includes(skin));

describe('the crew wears its role', () => {
  it('ships a credits file for every skin in the cast', () => {
    const missing = SKINS.filter((skin) => {
      try {
        return layersOf(skin).length === 0;
      } catch {
        return true;
      }
    });

    expect(missing).toEqual([]);
  });

  it('dresses juniors short-sleeved and seniors long', () => {
    const wrong = held(SKINS).filter((skin) => {
      const role = roleOf(skin);
      if (role === null) return false;
      const { sleeve, garments } = UNIFORM[role];

      return !garments.some(
        (g) => garmentsOf(skin).join() === `${sleeve}/${g}`
      );
    });

    expect(wrong).toEqual([]);
  });

  it('keeps the two pools in disjoint colour bands', () => {
    const offBand = held(SKINS).filter((skin) => {
      const role = roleOf(skin);

      return (
        role !== null &&
        PRESETS[skin] !== undefined &&
        !UNIFORM[role].colours.some((c) => c === colourOf(skin))
      );
    });

    expect(offBand).toEqual([]);
  });

  it("keeps the manager's badge to managers", () => {
    const wearing = held(SKINS).filter(
      (skin) =>
        roleOf(skin) !== null &&
        layersOf(skin).some((layer) =>
          MANAGER_ONLY.some((badge) => layer.startsWith(badge))
        )
    );

    expect(wearing).toEqual([]);
  });

  it('gives every manager the badge, on the neck and on the head', () => {
    const bare = SKINS.filter(
      (skin) =>
        roleOf(skin) === null &&
        !['neck/', 'hat/'].every((badge) =>
          layersOf(skin).some((layer) => layer.startsWith(badge))
        )
    );

    expect(bare).toEqual([]);
  });

  it('never grows the list of sheets still to re-roll', () => {
    expect(AWAITING_REROLL.length).toBeLessThanOrEqual(0);
    expect(AWAITING_REROLL.every((skin) => SKINS.includes(skin))).toBe(true);
  });
});

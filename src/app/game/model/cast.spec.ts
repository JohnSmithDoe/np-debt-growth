import { describe, expect, it } from 'vitest';

import {
  CAST,
  CAST_PREFIX,
  castIndex,
  castPoolSize,
  crewName,
} from './cast.model';
import type { CrewKind } from './crew.model';

const CREWS: readonly CrewKind[] = ['juniors', 'seniors', 'managers'];

describe('the cast', () => {
  it('gives one seat the same name every time it is asked', () => {
    expect(crewName('juniors', 3, false)).toBe(crewName('juniors', 3, false));
  });

  it('never crosses the pools', () => {
    expect(CAST[castIndex('juniors', 0, false)]?.skin).toMatch(/^junior-m/);
    expect(CAST[castIndex('juniors', 0, true)]?.skin).toMatch(/^junior-f/);
  });

  it('wraps past the pool rather than running out', () => {
    const size = castPoolSize('seniors', false);
    expect(crewName('seniors', size, false)).toBe(
      crewName('seniors', 0, false)
    );
    expect(crewName('seniors', size * 3 + 2, false)).toBe(
      crewName('seniors', 2, false)
    );
  });

  it('keeps a face and its name together past the wrap', () => {
    for (const crew of CREWS) {
      for (const woman of [false, true]) {
        const size = castPoolSize(crew, woman);
        for (let seat = 0; seat < size * 2 + 1; seat += 1) {
          expect(CAST[castIndex(crew, seat, woman)]?.name).toBe(
            crewName(crew, seat, woman)
          );
        }
      }
    }
  });

  it('names every face once, and names none of them nothing', () => {
    const names = CAST.map((entry) => entry.name);
    const skins = CAST.map((entry) => entry.skin);
    expect(new Set(names).size).toBe(CAST.length);
    expect(new Set(skins).size).toBe(CAST.length);
    expect(names).not.toContain('');
  });

  it('puts every row in exactly one pool', () => {
    const pooled = CREWS.reduce(
      (total, crew) =>
        total + castPoolSize(crew, false) + castPoolSize(crew, true),
      0
    );
    expect(pooled).toBe(CAST.length);
  });

  it('derives its pools from the filenames', () => {
    for (const crew of CREWS) {
      const prefix = CAST_PREFIX[crew];
      expect(castPoolSize(crew, false)).toBe(
        CAST.filter((entry) => entry.skin.startsWith(`${prefix}-m`)).length
      );
      expect(castPoolSize(crew, true)).toBe(
        CAST.filter((entry) => entry.skin.startsWith(`${prefix}-f`)).length
      );
    }
  });

  it('stays in the atlas order', () => {
    const skins = CAST.map((entry) => entry.skin);
    expect(skins).toEqual([...skins].sort());
  });
});

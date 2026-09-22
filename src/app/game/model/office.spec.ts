import { describe, expect, it } from 'vitest';

import {
  OFFICE_GRID,
  OFFICE_PLAN,
  OFFICE_PLATES,
  builtPlates,
  nextPlate,
  platesAt,
} from './office.model';
import { OFFICE_NODE_IDS, SKILL_BY_ID } from './skill.model';

describe('the floor plan (D36)', () => {
  it('fills the grid it is laid out on exactly', () => {
    expect(OFFICE_GRID.cols * OFFICE_GRID.rows).toBe(OFFICE_PLATES);
  });

  it('names every plate once', () => {
    expect(new Set(OFFICE_PLAN.map((plate) => plate.id)).size).toBe(
      OFFICE_PLATES
    );
  });

  it('gives the first plate away and sells the rest', () => {
    expect(platesAt(0)).toBe(1);
    expect(platesAt(3)).toBe(4);
    expect(builtPlates(0)).toEqual([OFFICE_PLAN[0]]);
  });

  it('leaves the first bought plate mechanically inert', () => {
    const o1 = SKILL_BY_ID.get(OFFICE_NODE_IDS[0]!);
    expect(o1?.levels[0]?.effects).toEqual([{ kind: 'none' }]);
  });

  it('never promises more plates than the plan draws', () => {
    expect(platesAt(OFFICE_NODE_IDS.length)).toBe(OFFICE_PLATES);
  });

  it('runs out rather than overrunning the plan', () => {
    expect(platesAt(99)).toBe(OFFICE_PLATES);
    expect(nextPlate(OFFICE_PLATES - 1)).toBeNull();
    expect(nextPlate(0)).toBe(OFFICE_PLAN[1]);
  });
});

import { describe, expect, it } from 'vitest';

import {
  OFFICE_GRID,
  OFFICE_PLAN,
  OFFICE_PLATES,
  builtPlates,
  nextPlate,
  platesAt,
} from './office.model';

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

  it('leaves the starting plate mechanically inert', () => {
    expect(OFFICE_PLAN[0]!.effect).toBeNull();
  });

  it('runs out rather than overrunning the plan', () => {
    expect(platesAt(99)).toBe(OFFICE_PLATES);
    expect(nextPlate(OFFICE_PLATES - 1)).toBeNull();
    expect(nextPlate(0)).toBe(OFFICE_PLAN[1]);
  });
});

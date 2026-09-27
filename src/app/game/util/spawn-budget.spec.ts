import { describe, expect, it } from 'vitest';

import { SpawnBudget } from './spawn-budget';

describe('the spawn budget', () => {
  it('starts each line at its own phase, so equal rates do not spawn in step', () => {
    const budget = new SpawnBudget();
    const phases = [0.1, 0.6];
    const steps: Record<string, number[]> = { a: [], b: [] };
    for (let step = 0; step < 40; step++) {
      for (const [at, key] of ['a', 'b'].entries()) {
        const rand = (): number => phases[at] ?? 0;
        if (budget.due(key, 2, 0.1, 12, rand) > 0) steps[key]?.push(step);
      }
    }
    expect(steps['a']).not.toEqual(steps['b']);
    expect(steps['a']?.some((step) => steps['b']?.includes(step))).toBe(false);
  });

  it('keeps the long-run rate', () => {
    const budget = new SpawnBudget();
    let spawned = 0;
    for (let step = 0; step < 1_000; step++) {
      spawned += budget.due('a', 3, 0.1, 12, () => 0.5);
    }
    expect(Math.abs(spawned - 300)).toBeLessThanOrEqual(1);
  });
});

import { describe, expect, it } from 'vitest';

import { ClosePool } from './close-pool';

const pool = (): ClosePool<string> =>
  new ClosePool({ width: 100, height: 100 }, { cols: 2, rows: 2, ms: 300 });

describe('ClosePool', () => {
  it('holds closes until the window has passed', () => {
    const closes = pool();
    closes.add(10, 10, 5, 'lint', 0);
    expect(closes.due(299)).toEqual([]);
    expect(closes.due(300)).toHaveLength(1);
    expect(closes.due(600)).toEqual([]);
  });

  it('sums an area into one close at its centre, led by the type that paid most', () => {
    const closes = pool();
    closes.add(10, 10, 1, 'lint', 0);
    closes.add(10, 10, 1, 'lint', 50);
    closes.add(30, 30, 5, 'bug', 100);
    expect(closes.due(300)).toEqual([
      { x: 50 / 3, y: 50 / 3, value: 7, type: 'bug' },
    ]);
  });

  it('keeps areas apart', () => {
    const closes = pool();
    closes.add(10, 10, 1, 'lint', 0);
    closes.add(90, 90, 2, 'lint', 0);
    closes.add(500, -20, 4, 'lint', 0);
    expect(
      closes
        .due(300)
        .map((close) => close.value)
        .sort()
    ).toEqual([1, 2, 4]);
  });
});

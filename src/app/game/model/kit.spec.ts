import { describe, expect, it } from 'vitest';

import {
  KIT_ITEMS,
  KIT_PLAN,
  boughtKit,
  itemsAt,
  nextKitItem,
} from './kit.model';

describe('the desk kit', () => {
  it('names every item once', () => {
    expect(new Set(KIT_PLAN.map((item) => item.id)).size).toBe(KIT_ITEMS);
  });

  it('sells the first item rather than giving it away', () => {
    expect(itemsAt(0)).toBe(0);
    expect(boughtKit(0)).toEqual([]);
    expect(itemsAt(3)).toBe(3);
    expect(nextKitItem(0)).toBe(KIT_PLAN[0]);
  });

  it('runs out rather than overrunning the plan', () => {
    expect(itemsAt(99)).toBe(KIT_ITEMS);
    expect(nextKitItem(KIT_ITEMS)).toBeNull();
  });

  it('moves value and never throughput', () => {
    for (const item of KIT_PLAN) {
      expect(['ticketValue', 'global', 'escalationHold']).toContain(
        item.effect.kind
      );
    }
  });
});

import { describe, expect, it } from 'vitest';

import { BUG_REVEAL_AT_MS, FIRST_INCIDENT_AT_MS } from '../model/balance/flow';
import { heldBack, scriptedSpawns } from './first-act';

describe('the first act', () => {
  it('places the first P0 exactly once, however the span is walked', () => {
    const walk = (step: number): number => {
      let fired = 0;
      for (let at = 0; at < FIRST_INCIDENT_AT_MS * 2; at += step) {
        fired += scriptedSpawns(at, at + step).length;
      }
      return fired;
    };

    expect(walk(100)).toBe(1);
    expect(walk(FIRST_INCIDENT_AT_MS * 2)).toBe(1);
  });

  it('holds the rate off until its own beat has landed', () => {
    expect(heldBack('incident', 0)).toBe(true);
    expect(heldBack('incident', FIRST_INCIDENT_AT_MS - 1)).toBe(true);
    expect(heldBack('incident', FIRST_INCIDENT_AT_MS)).toBe(false);
  });

  it('keeps Bug Report off the opening board, then lets it run (D14)', () => {
    expect(heldBack('bug', 0)).toBe(true);
    expect(heldBack('bug', BUG_REVEAL_AT_MS)).toBe(false);
    expect(heldBack('lint', 0)).toBe(false);
  });

  it('leaves every other type to its rate', () => {
    for (const type of ['legacy', 'flaky', 'conflict', 'escalation'] as const) {
      expect(heldBack(type, 0)).toBe(false);
    }
  });
});

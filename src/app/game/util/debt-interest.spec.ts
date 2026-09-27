import { describe, expect, it } from 'vitest';

import type { Consultancy } from '../model/consultancy.model';
import { freshConsultancy } from '../model/consultancy.model';
import { ranksOf } from '../model/consultancy.fixture';
import { SAVE_VERSION } from '../model/game.consts';
import { MAX_TIER } from '../model/tier.model';
import { TICKET_TYPES } from '../model/ticket.model';
import {
  DEBT_INTEREST_CAP,
  DEBT_INTEREST_PER_RANK,
} from '../model/balance/flow';
import { debtInterest, interestTarget } from './economy';

const state = (patch: Partial<Consultancy>): Consultancy => ({
  ...freshConsultancy(0, SAVE_VERSION),
  ...patch,
});

const withRanks = (ranks: number): Consultancy =>
  state({ skills: { root: 1, supply: 1, ...ranksOf('debtInterest', ranks) } });

describe('the interest', () => {
  it('is nothing at all until the node is bought', () => {
    expect(debtInterest(state({}))).toBe(0);
  });

  it('opens boringly, rises with every rank, and never reaches the cap', () => {
    const measured = [1, 2, 3].map((ranks) => debtInterest(withRanks(ranks)));
    expect(measured[0]).toBeCloseTo(DEBT_INTEREST_CAP * DEBT_INTEREST_PER_RANK);
    expect(measured[0]).toBeLessThan(0.1);
    for (let at = 1; at < measured.length; at += 1) {
      expect(measured[at]).toBeGreaterThan(measured[at - 1]!);
      expect(measured[at]).toBeLessThan(DEBT_INTEREST_CAP);
    }
  });

  it('leaves room at the top however deep the node is bought', () => {
    const maxed = debtInterest(withRanks(500));
    expect(maxed).toBeLessThan(DEBT_INTEREST_CAP);
    expect(maxed).toBeGreaterThan(DEBT_INTEREST_CAP * 0.5);
    expect(DEBT_INTEREST_CAP).toBeLessThan(0.5);
  });
});

describe('what a promoted spawn arrives as', () => {
  it('climbs exactly one rung, and never onto a rare or an event', () => {
    const at = state({ tier: MAX_TIER });
    for (const id of Object.keys(
      TICKET_TYPES
    ) as (keyof typeof TICKET_TYPES)[]) {
      const target = interestTarget(at, id);
      if (target === null) continue;
      expect(TICKET_TYPES[target].handOnly).toBe(false);
      expect(TICKET_TYPES[target].effect).toBe('value');
      expect(TICKET_TYPES[target].tier).toBeGreaterThanOrEqual(
        TICKET_TYPES[id].tier
      );
    }
  });

  it('reaches one tier above the ladder and no further', () => {
    const tier2 = state({ tier: 2 });
    expect(interestTarget(tier2, 'flaky')).toBe('conflict');
    expect(TICKET_TYPES.conflict.tier).toBe(3);
    expect(interestTarget(tier2, 'conflict')).toBeNull();
  });

  it('has nowhere left to go at the top of the ladder', () => {
    expect(interestTarget(state({ tier: MAX_TIER }), 'swarm')).toBeNull();
  });

  it('never touches a rare, whatever the tier', () => {
    for (const id of [
      'incident',
      'escalation',
      'hotfix',
      'quarter',
      'invite',
    ] as const) {
      expect(interestTarget(state({ tier: MAX_TIER }), id)).toBeNull();
    }
  });
});

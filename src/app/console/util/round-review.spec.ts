import { describe, expect, it } from 'vitest';

import type { RoundOutcome } from '../../game/model/round.model';
import { reviewRound } from './round-review';

const round = (over: Partial<RoundOutcome> = {}): RoundOutcome => ({
  seq: 2,
  billed: 1_000,
  closed: 40,
  closedByCrew: 400,
  filled: 30,
  capacity: 120,
  filledAtMs: -1,
  unbilled: 0,
  durationMs: 60_000,
  skimmed: 0,
  spVelocity: 0,
  spCopilots: 0,
  spAwards: 0,
  ...over,
});

describe('the round review (D53)', () => {
  it('has no delta for the first round there is', () => {
    expect(reviewRound(round({ seq: 1 }), null, null).delta).toBeNull();
  });

  it('states the delta against the round before', () => {
    const review = reviewRound(
      round({ billed: 1_250 }),
      round({ billed: 1_000 }),
      null
    );
    expect(review.delta).toBeCloseTo(0.25, 6);
  });

  it('names capacity when the sprint filled with time to spare', () => {
    const review = reviewRound(
      round({ filledAtMs: 20_000, filled: 120, unbilled: 500 }),
      null,
      null
    );
    expect(review.bound).toBe('capacity');
    expect(review.spareSeconds).toBe(40);
  });

  it('names the hand when the sprint had room and the board did not empty', () => {
    expect(
      reviewRound(round({ filled: 30, unbilled: 400 }), null, null).bound
    ).toBe('hand');
  });

  it('names supply when the board ran dry', () => {
    expect(
      reviewRound(round({ filled: 30, unbilled: 2 }), null, null).bound
    ).toBe('supply');
  });

  it('reports the gross as what landed plus what the skim took', () => {
    const review = reviewRound(
      round({ billed: 900, skimmed: 100, spVelocity: 4 }),
      null,
      null
    );
    expect(review.landed + review.skimmed).toBe(1_000);
    expect(review.points.velocity).toBe(4);
  });

  it('totals the three sources it names', () => {
    const review = reviewRound(
      round({ spVelocity: 4, spCopilots: 0.5, spAwards: 20 }),
      null,
      null
    );
    expect(review.points.total).toBeCloseTo(24.5, 6);
  });

  it('survives a round that earned nothing', () => {
    const review = reviewRound(
      round({ billed: 0 }),
      round({ billed: 0 }),
      null
    );
    expect(review.delta).toBeNull();
    expect(review.crewShare).toBe(0);
  });
});

describe("the client's target", () => {
  it('is met vacuously before one has been set', () => {
    const review = reviewRound(round({ billed: 0 }), null, null);
    expect(review.target).toBeNull();
    expect(review.met).toBe(true);
  });

  it('is met when the round billed exactly the line', () => {
    expect(reviewRound(round({ billed: 1_000 }), null, 1_000).met).toBe(true);
  });

  it('is missed by a single euro under', () => {
    expect(reviewRound(round({ billed: 999 }), null, 1_000).met).toBe(false);
  });

  it('can improve on the last round and still miss', () => {
    const review = reviewRound(
      round({ billed: 800 }),
      round({ billed: 400 }),
      1_000
    );
    expect(review.delta).toBeCloseTo(1, 6);
    expect(review.met).toBe(false);
  });
});

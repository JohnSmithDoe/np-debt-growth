import type { AwardWeight } from '../award.model';

/** Achievements pay euros below this tier, story points from it on. */
export const AWARD_SP_FROM_TIER = 3;

/** One reward unit at tier 0…8: euros below `AWARD_SP_FROM_TIER`, story points from it. */
export const AWARD_UNIT: readonly number[] = [
  100, 2_000, 300_000, 12_000, 15_000, 50_000, 300_000, 300_000, 300_000,
];

export const AWARD_WEIGHT_UNITS: Readonly<Record<AwardWeight, number>> = {
  small: 1,
  medium: 2,
  large: 4,
};

import type { AwardWeight } from '../award.model';

/** Achievements pay euros below this tier, story points from it on. */
export const AWARD_SP_FROM_TIER = 3;

/** One reward unit at tier 0…8: euros below `AWARD_SP_FROM_TIER`, story points from it. */
export const AWARD_UNIT: readonly number[] = [
  100, 2000, 300_000, 29_000, 51_000, 280_000, 480_000, 320_000, 390_000,
];

export const AWARD_WEIGHT_UNITS: Readonly<Record<AwardWeight, number>> = {
  small: 1,
  medium: 2,
  large: 4,
};

/** From this tier a passive achievement pays `AWARD_PASSIVE_SHARE` of its reward. */
export const AWARD_PASSIVE_FROM_TIER = 5;
export const AWARD_PASSIVE_SHARE = 0.25;

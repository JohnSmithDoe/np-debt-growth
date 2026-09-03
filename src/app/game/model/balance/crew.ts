import type { CrewKind } from '../crew.model';

export const JUNIOR_CLOSE_MS = 5_000;
export const JUNIOR_BATCH_BASE = 1;
export const JUNIOR_SWEEP_RADIUS = 40;
export const JUNIOR_WALK_SPEED = 90;
export const JUNIOR_HOME_Y = 440;

export const SENIOR_CLOSE_MS = 10_000;
export const SENIOR_BATCH_BASE = 3;
export const SENIOR_SWEEP_RADIUS = 70;
export const SENIOR_WALK_SPEED = 70;
export const SENIOR_HOME_Y = 424;
export const TRAIT_D21_CEILING = 1.25;

export const MANAGER_CLOSE_MS = 24_000;
export const MANAGER_WALK_SPEED = 110;
export const MANAGER_HOME_Y = 408;

export const JUNIOR_BAND_TOP = 3;
export const SENIOR_BAND_FROM = 2;

export const CREW_WOMAN_EVERY = {
  juniors: 4,
  seniors: 6,
  managers: 3,
  offshore: 4,
} as const satisfies Record<CrewKind, number>;

export const WOMAN_CLOSE_RATE = 2;

export const PROMOTION_PREMIUM = 1.6;

export const DESKS_PER_PLATE = 10;

/**
 * The can. Capacity is a hard cap: once it is full nothing more can be
 * collected until the haul finishes, and the haul is the whole cadence — there
 * is no wall clock.
 */
export const SPRINT_SLOTS_BASE = 100;

/** Each "raise the WIP limit" rank, per lane — the reference's +25 capacity. */
export const WIP_LIMIT_STEP = 25;

/** You start with one swimlane; `cans` opens up to nine more. */
export const LANES_BASE = 1;

export const HAUL_MS = 4_000;

/**
 * The truck can be hurried, but never to nothing: below this the cadence
 * stops being a gate and the can stops meaning anything.
 */
export const HAUL_MIN_MS = 2_500;

/**
 * The can. Capacity is a hard cap: once it is full nothing more can be
 * collected until the haul finishes, and the haul is the whole cadence — there
 * is no wall clock.
 */
export const SPRINT_SLOTS_BASE = 100;

export const HAUL_MS = 4_000;

/**
 * The truck can be hurried, but never to nothing: below this the cadence
 * stops being a gate and the can stops meaning anything.
 */
export const HAUL_MIN_MS = 2_500;

/** `CREW_STATS.retainer` figures are quoted per this window. */
export const RETAINER_PERIOD_MS = 10_000;

/**
 * The can. Capacity is a hard cap: once it is full nothing more can be
 * collected until the haul finishes, and the haul is the whole cadence — there
 * is no wall clock.
 */
export const SPRINT_SLOTS_BASE = 14;

export const HAUL_MS = 4_000;

export const HAUL_MIN_MS = 800;

/** `CREW_STATS.retainer` figures are quoted per this window. */
export const RETAINER_PERIOD_MS = 10_000;

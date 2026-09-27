/**
 * The can. Capacity is a hard cap: once it is full nothing more can be
 * collected until the haul finishes, and the haul is the whole cadence — there
 * is no wall clock.
 */
export const SPRINT_SLOTS_BASE = 100;

/** Each `capacity` rank, per team. */
export const SPRINT_SLOTS_STEP = 25;

export type ReleasePhaseId =
  'freeze' | 'ship' | 'smoke' | 'review' | 'retro' | 'refinement';

export interface ReleasePhase {
  readonly id: ReleasePhaseId;
  readonly ms: number;
}

/**
 * The release train, in running order. cut nodes (`cutRetro` …) skip the
 * ceremonies; `ship` is never cut, so the train never shrinks to nothing.
 */
export const RELEASE_PHASES: readonly ReleasePhase[] = [
  { id: 'freeze', ms: 1_200 },
  { id: 'ship', ms: 1_200 },
  { id: 'smoke', ms: 1_200 },
  { id: 'review', ms: 1_200 },
  { id: 'retro', ms: 1_200 },
  { id: 'refinement', ms: 1_200 },
];

/** The uncut train. */
export const HAUL_MS = RELEASE_PHASES.reduce((sum, phase) => sum + phase.ms, 0);

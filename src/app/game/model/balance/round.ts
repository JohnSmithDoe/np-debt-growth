export const SPRINT_SLOTS_BASE = 100;

export const SPRINT_SLOTS_STEP = 25;

export type ReleasePhaseId =
  'freeze' | 'ship' | 'smoke' | 'review' | 'retro' | 'refinement';

export interface ReleasePhase {
  readonly id: ReleasePhaseId;
  readonly ms: number;
}

export const RELEASE_PHASES: readonly ReleasePhase[] = [
  { id: 'freeze', ms: 1_200 },
  { id: 'ship', ms: 1_200 },
  { id: 'smoke', ms: 1_200 },
  { id: 'review', ms: 1_200 },
  { id: 'retro', ms: 1_200 },
  { id: 'refinement', ms: 1_200 },
];

export const HAUL_MS = RELEASE_PHASES.reduce((sum, phase) => sum + phase.ms, 0);

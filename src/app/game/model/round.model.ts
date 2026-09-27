import type { ReleasePhaseId } from './balance/round';

export function releasePhaseKey(id: ReleasePhaseId, short = false): string {
  return `release.phase.${id}${short ? '.short' : ''}`;
}

/**
 * `hauling` means the release train is away; it blocks collection only — spawning, crew and the clock all keep
 * running through it.
 */
export type RoundPhase = 'collecting' | 'hauling';

export interface RoundOutcome {
  readonly seq: number;
  readonly billed: number;
  readonly closed: number;
  readonly closedByCrew: number;
  readonly filled: number;
  readonly capacity: number;
  readonly filledAtMs: number;
  readonly unbilled: number;
  readonly durationMs: number;
  readonly spVelocity: number;
}

/** A live buff, for the board's banner: what it multiplies, and for how long or how far. */
export type BuffNotice =
  | {
      readonly id: 'escalation' | 'hotfix';
      readonly mult: number;
      readonly msLeft: number;
    }
  | {
      readonly id: 'acceptance';
      readonly mult: number;
      readonly budget: number;
      readonly goal: number;
    };

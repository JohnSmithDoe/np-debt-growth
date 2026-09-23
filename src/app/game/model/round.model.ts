/**
 * One swimlane: its WIP count, and how long its release train is still away.
 * A lane with `releaseLeftMs > 0` takes nothing; the others keep taking.
 */
export interface Lane {
  readonly count: number;
  readonly releaseLeftMs: number;
}

export const EMPTY_LANE: Lane = { count: 0, releaseLeftMs: 0 };

/**
 * `hauling` means every lane's train is away at once; it blocks collection only — spawning, crew and the clock all keep
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
  readonly skimmed: number;
  readonly spVelocity: number;
  readonly spCopilots: number;
  readonly spAwards: number;
}

export type RoundPhase = 'running' | 'review';

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

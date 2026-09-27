import type { ReleasePhaseId } from './balance/round';

export function releasePhaseKey(id: ReleasePhaseId, short = false): string {
  return `release.phase.${id}${short ? '.short' : ''}`;
}

export type RoundPhase = 'collecting' | 'hauling';

export interface RoundOutcome {
  readonly seq: number;
  readonly billed: number;
  readonly filled: number;
  readonly capacity: number;
  readonly filledAtMs: number;
  readonly unbilled: number;
  readonly durationMs: number;
  readonly spVelocity: number;
}

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

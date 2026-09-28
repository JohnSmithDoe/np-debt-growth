import type { ReleasePhaseId } from './balance/round';

export function releasePhaseKey(id: ReleasePhaseId, short = false): string {
  return `release.phase.${id}${short ? '.short' : ''}`;
}

export type RoundPhase = 'collecting' | 'hauling';

export interface RoundOutcome {
  readonly seq: number;
  readonly billed: number;
  readonly durationMs: number;
}

export type BuffNotice =
  | {
      readonly id: 'escalation' | 'hotfix' | 'storm';
      readonly mult: number;
      readonly msLeft: number;
    }
  | {
      readonly id: 'quarter' | 'combo' | 'comboLive' | 'escalationHeld';
    }
  | {
      readonly id: 'acceptance';
      readonly mult: number;
      readonly criterion: {
        readonly index: number;
        readonly line: number;
        readonly of: number;
        readonly done: number;
        readonly msLeft: number;
      } | null;
    };

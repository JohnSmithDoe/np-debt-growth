import type { TicketTypeId } from './ticket.model';
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
    };

/** The acceptance criterion under test, as the console shows it. */
export interface AcceptanceView {
  readonly index: number;
  readonly of: number;
  readonly line: number;
  readonly tickets: readonly TicketTypeId[];
  readonly picked: number;
  readonly goal: number;
  readonly msLeft: number;
  readonly windowMs: number;
  readonly overtime: number;
  readonly clean: readonly number[];
  readonly flagged: readonly number[];
}

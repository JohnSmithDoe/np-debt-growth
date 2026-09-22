import type { RoundOutcome, RoundPhase } from './round.model';
import type { SeniorHire } from './senior.model';
import type { PurchaseId } from './balance/progression';
import { PURCHASE_IDS } from './balance/progression';

export interface Consultancy {
  readonly version: number;
  readonly budget: number;
  readonly storyPoints: number;
  readonly lastTick: number;
  readonly runMs: number;

  readonly phase: RoundPhase;
  readonly roundMs: number;
  readonly haulLeftMs: number;
  readonly roundSeq: number;
  readonly lastOutcome: RoundOutcome | null;

  readonly levels: Readonly<Record<PurchaseId, number>>;
  readonly skills: Readonly<Record<string, number>>;
  readonly promoted: boolean;
  readonly roster: readonly SeniorHire[];
  readonly tier: number;

  readonly sprintCount: number;
  readonly escalated: boolean;
  readonly escalationFiresAt: number;
  readonly hotfixUntil: number;

  readonly achievements: readonly string[];
  readonly endedAt: number;

  readonly lifetimeClosed: number;
  readonly lifetimeBilled: number;
  readonly lifetimeRounds: number;
  readonly lifetimeSkimmed: number;
  readonly lifetimeClosedByWomen: number;
  readonly lifetimeCrewBilled: number;
  readonly lifetimeWorkBilled: number;
}

export function resumed(state: Consultancy, now: number): Consultancy {
  return {
    ...state,
    lastTick: now,
    phase: 'collecting',
    roundMs: 0,
    haulLeftMs: 0,
    sprintCount: 0,
    escalated: false,
    escalationFiresAt: 0,
  };
}

export function freshConsultancy(now: number, version: number): Consultancy {
  return {
    version,
    budget: 0,
    storyPoints: 0,
    lastTick: now,
    runMs: 0,
    phase: 'collecting',
    roundMs: 0,
    haulLeftMs: 0,
    roundSeq: 1,
    lastOutcome: null,
    levels: Object.fromEntries(PURCHASE_IDS.map((id) => [id, 0])) as Record<
      PurchaseId,
      number
    >,
    skills: {},
    promoted: false,
    roster: [],
    tier: 0,
    sprintCount: 0,
    escalated: false,
    escalationFiresAt: 0,
    hotfixUntil: 0,
    achievements: [],
    endedAt: 0,
    lifetimeClosed: 0,
    lifetimeBilled: 0,
    lifetimeRounds: 0,
    lifetimeSkimmed: 0,
    lifetimeClosedByWomen: 0,
    lifetimeCrewBilled: 0,
    lifetimeWorkBilled: 0,
  };
}

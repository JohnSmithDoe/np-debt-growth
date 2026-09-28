/*
 * freshConsultancy ships the skill root bought on purpose: the whole tree,
 * ADR ladder included, hangs off it, so an unbought root strands the run.
 */
import type { RoundOutcome, RoundPhase } from './round.model';
import { SPAWNER_FREE_HEADS } from './spawner.model';
import type { SeniorHire } from './senior.model';
import { SKILL_ROOT_ID } from './skill.model';
import type { PurchaseId } from './balance/progression';
import {
  ACCEPTANCE,
  CRITERION_RETEST_SHARE,
  PURCHASE_IDS,
} from './balance/progression';

export interface PizzaParty {
  readonly x: number;
  readonly y: number;
  readonly until: number;
}

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
  readonly spawners: Readonly<Record<string, number>>;
  readonly income: Readonly<Record<string, number>>;
  readonly roster: readonly SeniorHire[];
  readonly tier: number;

  readonly sprintCount: number;
  readonly escalated: boolean;
  readonly escalationFiresAt: number;
  readonly hotfixUntil: number;
  readonly pizza: PizzaParty | null;

  readonly achievements: readonly string[];
  /** Budget when the closeout was signed; -1 before. */
  readonly signedBudget: number;
  readonly criterion: CriterionRun | null;
  readonly spDebt: number;
  readonly endedAt: number;
  readonly assisted: boolean;

  readonly lifetimeClosed: number;
  readonly lifetimeBilled: number;
  readonly lifetimeRounds: number;
  readonly lifetimeClosedByWomen: number;
  readonly lifetimeClosedByCrew: number;
  readonly lifetimeProdIncidents: number;
  readonly lifetimeReviews: number;
  readonly lifetimeJackpots: number;
}

/** The acceptance criterion under test: its line and what that line has billed since it began. */
export interface CriterionRun {
  readonly index: number;
  readonly line: number;
  readonly sinceMs: number;
  readonly billed: number;
  /** What the line under test must bill for this criterion to sign clean. */
  readonly target: number;
  /** Lines signed clean on their first test, lines re-tested, and criteria that timed out. */
  readonly clean: readonly number[];
  readonly retested: readonly number[];
  /** Re-tests signed clean, and every line signed with findings. */
  readonly passed: readonly number[];
  readonly flagged: readonly number[];
  readonly reflagged: readonly number[];
  readonly findings: number;
}

export const CRITERIA_COUNT = 9;

/** One criterion's billing: a ninth of the way from the signed budget to the goal. */
export function criterionSlice(state: Consultancy): number {
  return (
    (Math.max(1, ACCEPTANCE.goal - state.signedBudget) / CRITERIA_COUNT) *
    CRITERION_RETEST_SHARE
  );
}

export function criteriaTotal(state: Consultancy): number {
  return CRITERIA_COUNT + (state.skills['changeRequest'] ?? 0);
}

export function criteriaPassed(state: Consultancy): number {
  return Math.min(criteriaTotal(state), state.criterion?.index ?? 0);
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
    hotfixUntil: 0,
    pizza: null,
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
    skills: { [SKILL_ROOT_ID]: 1 },
    spawners: { 0: SPAWNER_FREE_HEADS },
    income: {},
    roster: [],
    tier: 0,
    sprintCount: 0,
    escalated: false,
    escalationFiresAt: 0,
    hotfixUntil: 0,
    pizza: null,
    achievements: [],
    signedBudget: -1,
    criterion: null,
    spDebt: 0,
    endedAt: 0,
    assisted: false,
    lifetimeClosed: 0,
    lifetimeBilled: 0,
    lifetimeRounds: 0,
    lifetimeClosedByWomen: 0,
    lifetimeClosedByCrew: 0,
    lifetimeProdIncidents: 0,
    lifetimeReviews: 0,
    lifetimeJackpots: 0,
  };
}

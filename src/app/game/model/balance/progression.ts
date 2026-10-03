import type { TicketTypeId } from '../ticket.model';

export const SP_PER_PICKUP = 1;
export const CREW_SP_MULT = 2;

export const INCOME_CAP = 10;
export const INCOME_COST_STEP = Math.fround(1.65);

export interface IncomeRow {
  readonly first: number;
  readonly add: number;
}

const LINE_ROW_TICKETS: readonly TicketTypeId[] = [
  'lint',
  'legacy',
  'flaky',
  'conflict',
  'slop',
  'rockstar',
  'zombie',
  'rewrite',
  'swarm',
];

export const INCOME_ROWS: Readonly<Partial<Record<TicketTypeId, IncomeRow>>> =
  Object.fromEntries(
    LINE_ROW_TICKETS.map((id, tier) => [
      id,
      { first: 250 * 5 ** tier, add: 3 + tier },
    ])
  );

export const INCOME_COST_OF_SPAWNER = 125;
export const INCOME_VALUE_ADD = 3;

export const ACCEPTANCE = { goal: 2e16, value: 2 } as const;

/**
 * One acceptance criterion per line, lint first. The crew sits in the acceptance meeting; the
 * line under test spawns at CRITERION_SPAWN_PER_SEC whatever its spawners. Every criterion runs
 * its full CRITERION_MS and signs then: clean if the hand has picked up CRITERION_GOAL of the
 * cards spawned for it, with findings if not.
 */
export const CRITERION_BONUS = 2;
export const CRITERION_OVERTIME = 0.5;
export const CRITERION_MS = 15_000;
export const CRITERION_SPAWN_PER_SEC = 2.5;
export const CRITERION_GOAL = 15;

export const CREDIT_FROM_ADR = 4;
export const CREDIT_SHARE = 0.6;
export const CREDIT_INTEREST = 1;
/** Share of every later SP pickup that goes to the debt until it is repaid. */
export const CREDIT_GARNISH = 0.5;

export const PURCHASE_IDS = [
  'junior',
  'senior',
  'velocity',
  'kit',
  'manager',
] as const;

export type PurchaseId = (typeof PURCHASE_IDS)[number];

export const LINE_COST_STEP = 1.15;

export const LINE_PRICE_BY_TIER: readonly number[] = [
  1, 2, 4, 8, 16, 32, 128, 256, 512,
];

/** A line node's price for the rung it sits on: from ADR-3 every tier is quicker than the last. */
export const LINE_RUNG_PRICE: readonly number[] = [
  1, 1, 1, 0.6, 0.3, 0.2, 0.4, 0.55, 0.5,
];

export const LINE_PLAN: Readonly<
  Record<
    PurchaseId,
    { readonly cost: number; readonly cap: number; readonly open?: boolean }
  >
> = {
  junior: { cost: 1000, cap: 10 },
  senior: { cost: 1_200, cap: 10 },
  manager: { cost: 28_000, cap: 5 },
  velocity: { cost: 25, cap: 1, open: true },
  kit: { cost: 400, cap: 6 },
};

import type { TicketTypeId } from '../ticket.model';

/**
 * Story points land at pickup, a flat count per ticket whatever it bills, once
 * the `velocity` row is bought.
 */
export const SP_PER_PICKUP = 1;
/** Crew closes pay this much more SP once `timesheets` is bought. */
export const CREW_SP_MULT = 2;

/**
 * Per-ticket income lines — the rail's third tab. Each rank adds a flat amount
 * before any multiplier: decisive on the cheapest work, nothing on dear work,
 * so it pays to move up a rung and fill old rows later.
 */
export const INCOME_CAP = 10;
/** Single precision, as `SPAWNER_COST_STEP` is. */
export const INCOME_COST_STEP = Math.fround(1.65);

export interface IncomeRow {
  readonly first: number;
  readonly add: number;
}

/**
 * Lint 250 / +3 and legacy 1 250 / +4, carried up the lines on that step: the
 * first rank ×5 a tier, the increment +1.
 */
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

/** Rows not yet measured: this many of the spawner's first head, +3 a rank. */
export const INCOME_COST_OF_SPAWNER = 125;
export const INCOME_VALUE_ADD = 3;

/**
 * Signing off starts the acceptance push instead of ending the run: the
 * board spawns `spawn`× as fast, everything bills `value`× (overtime), and
 * the run ends when the budget reaches `goal`.
 */
export const ACCEPTANCE = { goal: 2e16, spawn: 3, value: 12 } as const;

export const PURCHASE_IDS = [
  'junior',
  'senior',
  'velocity',
  'kit',
  'manager',
] as const;

export type PurchaseId = (typeof PURCHASE_IDS)[number];

/**
 * The rail's repeatable lines. The tree unlocks a line once; every head
 * after that is bought here with euros, on the same 1.15x climb the
 * spawner lines use. `cap` is the start; a crew line's room node adds seats.
 */
export const LINE_COST_STEP = 1.15;

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

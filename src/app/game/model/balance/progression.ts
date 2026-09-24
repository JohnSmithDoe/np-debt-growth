import type { TicketTypeId } from '../ticket.model';

export const COPILOT_SP_PER_CLOSE = 0.013;

/**
 * Story points land at pickup, a flat count per ticket whatever it bills, once
 * the `velocity` row is bought — the reference's one gum per piece of trash.
 */
export const SP_PER_PICKUP = 1;
/** Crew and pipeline closes pay this much more SP once `timesheets` is bought. */
export const CREW_SP_MULT = 2;

/** The run opens with one developer and nothing else; SP comes from `velocity`. */
export const FREE_COPILOTS = 0;

export const PURCHASE_REVEAL_FRACTION = 0.6;

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

/** Measured off the reference: paper 250 / +3, dog 1 250 / +4. */
export const INCOME_ROWS: Readonly<Partial<Record<TicketTypeId, IncomeRow>>> = {
  lint: { first: 250, add: 3 },
  legacy: { first: 1250, add: 4 },
};

/** Rows not yet measured: this many of the spawner's first head, +3 a rank. */
export const INCOME_COST_OF_SPAWNER = 125;
export const INCOME_VALUE_ADD = 3;

export const PURCHASE_IDS = [
  'junior',
  'senior',
  'copilot',
  'velocity',
  'kit',
  'manager',
] as const;

export type PurchaseId = (typeof PURCHASE_IDS)[number];

export const SENIOR_BUYOUT_STEPS = [
  2_400, 3_480, 5_050, 7_320, 11_000, 15_000, 22_000, 32_000, 47_000, 68_000,
] as const;

/**
 * The rail's repeatable lines. The tree unlocks a line once; every head
 * after that is bought here with euros, on the same 1.15x climb the
 * spawner lines use.
 */
export const LINE_COST_STEP = 1.15;

export const LINE_PLAN: Readonly<
  Record<
    PurchaseId,
    { readonly cost: number; readonly cap: number; readonly open?: boolean }
  >
> = {
  junior: { cost: 1000, cap: 50 },
  senior: { cost: 1_200, cap: 50 },
  manager: { cost: 28_000, cap: 50 },
  copilot: { cost: 150, cap: 50 },
  velocity: { cost: 25, cap: 1, open: true },
  kit: { cost: 400, cap: 6 },
};

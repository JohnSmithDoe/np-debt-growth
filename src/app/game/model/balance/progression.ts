export const COPILOT_SP_PER_CLOSE = 0.013;

/**
 * Story points land at pickup, one per euro the ticket bills, once the
 * `velocity` row is bought — the reference's "1 gum per $1".
 */
export const SP_PER_EURO = 1;
/** Crew and pipeline closes pay this much more SP once `timesheets` is bought. */
export const CREW_SP_MULT = 2;

/** The run opens with one developer and nothing else; SP comes from `velocity`. */
export const FREE_COPILOTS = 0;

export const PURCHASE_REVEAL_FRACTION = 0.6;

/**
 * Per-ticket income lines — the rail's third tab. Each rank adds a flat
 * `INCOME_VALUE_ADD` before any multiplier: decisive on the cheapest work,
 * nothing on dear work, so it pays to move up a rung and fill old rows later.
 */
export const INCOME_CAP = 10;
export const INCOME_VALUE_ADD = 3;
export const INCOME_COST_STEP = 1.65;

/** An income line's first rank costs this many of its spawner's first head. */
export const INCOME_COST_OF_SPAWNER = 125;

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
  junior: { cost: 20, cap: 50 },
  senior: { cost: 1_200, cap: 50 },
  manager: { cost: 28_000, cap: 50 },
  copilot: { cost: 150, cap: 50 },
  velocity: { cost: 25, cap: 1, open: true },
  kit: { cost: 400, cap: 6 },
};

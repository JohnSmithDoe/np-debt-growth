export const COPILOT_SP_PER_CLOSE = 0.013;

export const VELOCITY_SKIM_CAP = 0.35;
export const VELOCITY_SKIM_DECAY = 0.88;
export const VELOCITY_SP_PER_EURO = 0.0006;
export const VELOCITY_UNLOCK_TIER = 2;

/** The tree is bought with story points, so the first copilot ships with the laptop. */
export const FREE_COPILOTS = 1;

export const PURCHASE_REVEAL_FRACTION = 0.6;

/**
 * Per-ticket income lines — the rail's third tab. Each rank lifts what that
 * one ticket bills; the line only opens once its spawner is on the path.
 */
export const INCOME_CAP = 10;
export const INCOME_VALUE_STEP = 1.3;
export const INCOME_COST_STEP = 1.75;

/** An income line's first rank costs this many of its spawner's first head. */
export const INCOME_COST_OF_SPAWNER = 16;

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
  Record<PurchaseId, { readonly cost: number; readonly cap: number }>
> = {
  junior: { cost: 20, cap: 50 },
  senior: { cost: 1_200, cap: 50 },
  manager: { cost: 28_000, cap: 50 },
  copilot: { cost: 150, cap: 50 },
  velocity: { cost: 25_000, cap: 10 },
  kit: { cost: 400, cap: 6 },
};

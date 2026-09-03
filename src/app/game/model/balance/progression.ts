export const COPILOT_SP_PER_CLOSE = 0.013;

export const VELOCITY_SKIM_CAP = 0.35;
export const VELOCITY_SKIM_DECAY = 0.88;
export const VELOCITY_SP_PER_EURO = 0.0006;
export const VELOCITY_UNLOCK_TIER = 2;

export const FREE_COPILOT_AT_TIER = 1;

export const PURCHASE_REVEAL_FRACTION = 0.6;

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

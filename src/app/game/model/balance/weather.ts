export const ESCALATION_MULTIPLIER = 5;
export const ESCALATION_HOLD_MS = 9_000;

export const HOTFIX_MULTIPLIER = 2;
export const HOTFIX_MS = 10_000;

/** A buff swept while the other is live extends the other. */
export const COMBO_EXTEND_MS = 3_000;
/** A quarter end billed under both buffs bills the board this many times over. */
export const JACKPOT_BONUS = 10;
/** A jackpot's story points are capped at this many seconds of the build's SP income. */
export const JACKPOT_SP_SEC = 15;

export const INVITATION_EVERY_MS = 120_000;
export const INVITATION_WINDOW_MS = 4_000;
export const FACT_EVERY_MS = 120_000;
export const FACT_COUNTDOWN_MS = 5_000;
export const FACT_OFFSET_MS = 60_000;
/** From this rung both cadences run this many times as often, so the short late tiers still see weather. */
export const LATE_WEATHER_FROM_TIER = 5;
export const LATE_WEATHER_PACE = 2;

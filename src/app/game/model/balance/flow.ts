import { LOGICAL_BOARD } from '../geometry';

export const SPAWN_BURST_CAP = 12;

const CLICK_RADIUS_SHARE = 0.006;
const CLICK_RADIUS_MAX_SHARE = 0.2;
export const CLICK_RADIUS_BASE = LOGICAL_BOARD.width * CLICK_RADIUS_SHARE;
export const CLICK_RADIUS_MAX = LOGICAL_BOARD.width * CLICK_RADIUS_MAX_SHARE;

export const DEBT_INTEREST_PER_RANK = 0.22;
export const DEBT_INTEREST_CAP = 0.25;

export const RELABEL_STEPS_BASE = 1;

/**
 * The pizza party, the reference's Chad: a rare voucher only the player can
 * sweep. The crew near where it was picked up work `PIZZA_RUSH` times faster
 * until the pizza's gone.
 */
export const PIZZA_MS = 12_000;
export const PIZZA_RUSH = 5;
export const PIZZA_RADIUS = 240;

/**
 * Planning poker, the reference's gum angels. Each coach runs a vote that is
 * live for `VOTE_ON_MS` of every `VOTE_CYCLE_MS`, offset from the others; a
 * ticket falling through a live vote is re-estimated upward.
 */
export const VOTE_CYCLE_MS = 4_000;
export const VOTE_ON_MS = 1_400;
export const VOTE_BONUS_BASE = 45;
export const VOTE_BONUS_PER_RANK = 15;
/** Arrivals inside one step are spread by this, so a burst doesn't share one vote. */
export const VOTE_SPREAD_MS = 37;

/**
 * Work nobody reaches is closed as "won't fix" after this long. The debt
 * stays; it just leaves the board. What density the field shows is
 * spawn rate × this, so it tracks what the player bought.
 */
export const TICKET_LIFE_MS = 3_500;
/** An expired card fades this long before it closes; only the hand can still take it. */
export const WONT_FIX_FADE_MS = 900;
/** Golden work waits longer, but not forever: a hoarded board still clears. */
export const GOLDEN_LIFE_MS = 20_000;

export const TIER_BURST = { tier: 3, count: 10 } as const;

/** Golden: rare, worth a fortune, and the crew will not touch it. */
export const GOLDEN_CHANCE_PER_RANK = 0.02;
export const GOLDEN_CHANCE_CAP = 0.2;
export const GOLDEN_VALUE_BASE = 100;
/** Additive, as the reference has it: 100× → 300× over four ranks. */
export const GOLDEN_VALUE_PER_RANK = 50;
/** Once the crew take golden work, this share of what they close turns golden. */
export const GOLDEN_CREW_CONVERSION = 0.05;

/** SP a ticket pays at pickup per `estimates<T>` rank on its line. */
/** Auto-closed work with no lane goes to prod as a P0; this many at once, the rest go stale. */
export const PROD_INCIDENT_LIVE_CAP = 3;

export const ESTIMATE_SP_PER_RANK = 20;
/** Lint and bugs: auto-close bills every card of them, so their estimates pay less. */
export const ESTIMATE_SP_PER_RANK_OPENING = 4;

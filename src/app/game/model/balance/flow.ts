import { LOGICAL_BOARD } from '../geometry';

export const SPAWN_BURST_CAP = 12;

const CLICK_RADIUS_SHARE = 0.006;
const CLICK_RADIUS_MAX_SHARE = 0.2;
export const CLICK_RADIUS_BASE = LOGICAL_BOARD.width * CLICK_RADIUS_SHARE;
export const CLICK_RADIUS_MAX = LOGICAL_BOARD.width * CLICK_RADIUS_MAX_SHARE;

export const DEBT_INTEREST_PER_RANK = 0.22;
export const DEBT_INTEREST_CAP = 0.25;

export const MANAGER_AURA_BASE = 1.5;

export const PIZZA_MS = 12_000;
export const PIZZA_RUSH = 5;
export const PIZZA_RADIUS = 240;

export const VOTE_CYCLE_MS = 4_000;
export const VOTE_ON_MS = 1_400;
export const VOTE_BONUS_BASE = 45;
export const VOTE_BONUS_PER_RANK = 15;
export const VOTE_SPREAD_MS = 37;

export const TICKET_LIFE_MS = 3_500;
export const TICKET_LIFE_BY_TIER: readonly number[] = [
  12_000,
  9_000,
  7_000,
  5_500,
  4_500,
  4_000,
  TICKET_LIFE_MS,
];

export const ticketLifeMs = (tier: number): number =>
  TICKET_LIFE_BY_TIER[Math.min(tier, TICKET_LIFE_BY_TIER.length - 1)]!;
export const WONT_FIX_FADE_MS = 900;
export const GOLDEN_LIFE_MS = 20_000;

export const TIER_BURST = { tier: 3, count: 10 } as const;

export const GOLDEN_VALUE_BASE = 100;
export const GOLDEN_VALUE_PER_RANK = 50;
export const GOLDEN_CREW_CONVERSION = 0.05;

export const HAND_ONLY_RATE_PER_TIER = 0.75;

export const PROD_INCIDENT_LIVE_CAP = 3;

/** From this rung a P0 is priced off the build, not its flat value. */
export const INCIDENT_PAYOUT_FROM_TIER = 2;
/** From INCIDENT_PAYOUT_FROM_TIER a P0 bills this many of the newest rung's tickets. */
export const INCIDENT_TOP_SHARE = 5;
/** On top, a P0 cleared from INCIDENT_PAYOUT_FROM_TIER pays this many seconds of the build's income. */
export const INCIDENT_PAYOUT_SEC = 3;

/** Tier 1's; each tier above doubles it. */
export const ESTIMATE_SP_PER_RANK = 20;
export const ESTIMATE_SP_TIER_GROWTH = 2;
export const ESTIMATE_SP_PER_RANK_OPENING = 4;

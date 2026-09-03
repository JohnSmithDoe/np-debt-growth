import { LOGICAL_BOARD } from '../geometry';

export const SPAWN_BURST_CAP = 12;

const CLICK_RADIUS_SHARE = 0.034;
const CLICK_RADIUS_MAX_SHARE = 0.2;
export const CLICK_RADIUS_BASE = LOGICAL_BOARD.width * CLICK_RADIUS_SHARE;
export const CLICK_RADIUS_MAX = LOGICAL_BOARD.width * CLICK_RADIUS_MAX_SHARE;

export const DEBT_INTEREST_PER_RANK = 0.22;
export const DEBT_INTEREST_CAP = 0.25;

export const RELABEL_STEPS_BASE = 1;

export const AUTO_CLOSE_MS = 3_000;

export const FIRST_INCIDENT_AT_MS = 75_000;
export const BUG_REVEAL_AT_MS = 90_000;

export const TIER_BURST = { tier: 3, count: 10 } as const;

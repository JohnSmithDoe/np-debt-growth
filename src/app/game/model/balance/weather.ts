import { ROUND_LENGTH_BASE_MS } from './round';

export const ESCALATION_MULTIPLIER = 5;
export const ESCALATION_HOLD_MS = ROUND_LENGTH_BASE_MS * 0.6;

export const HOTFIX_MULTIPLIER = 2;
export const HOTFIX_MS = 10_000;

export const INVITATION_EVERY_MS = 120_000;
export const INVITATION_WINDOW_MS = 4_000;
export const FACT_EVERY_MS = 120_000;
export const FACT_COUNTDOWN_MS = 5_000;

export const STORM_INCIDENT_MULT = 100;
export const PAGE_INCIDENT_MULT = 25;
export const MIGRATION_SUPPLY_MULT = 0;
export const FREEZE_SLOT_MULT = 0.5;

export const OFFSHORE_CREW = 5;
export const OFFSHORE_CLOSE_MS = 4_000;
export const OFFSHORE_WALK_SPEED = 130;
export const OFFSHORE_HOME_Y = 392;
export const OFFSHORE_LEAVES = 1;

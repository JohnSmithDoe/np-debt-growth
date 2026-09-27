export const TICK_MS = 100;

/** A longer gap (a hidden tab, a closed app) simulates only this much: the game is active-only. */
export const MAX_CATCHUP_MS = 5_000;

export const SAVE_VERSION = 10;

export const FEED_LINES_PER_SEC = 2.5;
export const FEED_LINE_GAP_MS = 1000 / FEED_LINES_PER_SEC;

export const FEED_LIMIT = 80;

export const BURNDOWN_SAMPLE_MS = 10_000;
export const BURNDOWN_SAMPLES = 512;

export const CLOSE_FLOAT_BUFFER = 64;
export const WONT_FIX_BUFFER = 256;

export const TICK_MS = 100;

export const MAX_CATCHUP_MS = 5_000;

/**
 * Offline progress. Anything past `MAX_CATCHUP_MS` is too long to step at
 * 10 Hz, so it is estimated instead of simulated: the practice keeps working
 * at `OFFLINE_RATE` of its measured throughput, for at most `OFFLINE_MAX_MS`.
 */
export const OFFLINE_FROM_MS = 60_000;
export const OFFLINE_MAX_MS = 4 * 60 * 60 * 1000;
export const OFFLINE_RATE = 0.4;

export const SAVE_VERSION = 4;

export const FEED_LINES_PER_SEC = 2.5;
export const FEED_LINE_GAP_MS = 1000 / FEED_LINES_PER_SEC;

export const FEED_LIMIT = 80;

export const BURNDOWN_SAMPLE_MS = 10_000;
export const BURNDOWN_SAMPLES = 512;

export const CLOSE_FLOAT_BUFFER = 64;
export const WONT_FIX_BUFFER = 256;

export const HOLD_REPEAT = {
  delayMs: 350,
  everyMs: 90,
  fastMs: 40,
  fastAfter: 10,
} as const;

export const holdGapMs = (bought: number): number =>
  bought > HOLD_REPEAT.fastAfter ? HOLD_REPEAT.fastMs : HOLD_REPEAT.everyMs;

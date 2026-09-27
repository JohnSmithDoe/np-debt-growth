export const LOGICAL_BOARD = { width: 1000, height: 460 } as const;

export const TICKET_SLOT = { width: 58, height: 16 } as const;

/** Half the drawn card, in board units, for the hand's touch test. */
export const CARD_HIT = { halfWidth: 29, halfHeight: 16 } as const;
export const RARE_HIT = { halfWidth: 52, halfHeight: 28 } as const;

export const HEAP_OVERFLOW_ROWS = 18;

/** Top field rows new work never scatters into; it lands below the vote beams. */
export const HEAP_SPAWN_GAP_ROWS = 6;

/** Planning-poker beams across the field, one per coach. */
export const VOTE_BEAMS = { top: 100, spacing: 5.5 } as const;

export const BOARD_CAPACITY = 600;

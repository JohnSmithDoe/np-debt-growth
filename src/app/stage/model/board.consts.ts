import { CAST, castIndex } from '../../game/model/cast.model';
import type { CrewKind } from '../../game/model/crew.model';

import type { LpcBlock, LpcSkin } from './lpc-sheet.model';

export const CARD_WIDTH = 56;
export const CARD_HEIGHT = 32;
export const RARE_CARD_WIDTH = 104;
export const RARE_CARD_HEIGHT = 56;

export const HEAP_CAPACITY = 4096;

export const CLAIM_TINT_REACH = 260;

export const CLAIM_TINT_STEPS = 8;

export const CLAIM_SLOTS = 16;

export const FLYER_CAPACITY = 160;
export const RARE_CAPACITY = 24;

export const FALL_MS = 460;
export const HARVEST_MS = 460;

export const RARE_TITLE_WIDTH = 168;
export const RARE_TITLE_OFFSET = 26;

export const RARE_LIFT = 14;

export const SPRINT_STRIP_HEIGHT = 48;
export const SPRINT_PIP_LIMIT = 40;
export const SPRINT_BAR_WIDTH = 300;

export const MAX_FRAME_MS = 250;

export const MODE_FADE_MS = 160;

export const CREW_SMOOTH_MS = 28;

export const CLOSE_FLOATS_PER_FRAME = 6;

export const CREW_SPRITE_LIMIT = 400;

export function crewSkin(
  crew: CrewKind,
  poolSeat: number,
  woman: boolean
): LpcSkin | undefined {
  return CAST[castIndex(crew, poolSeat, woman)]?.skin;
}

export const CREW_BLOCK = {
  walking: 'walk',
  working: 'slash',
  waiting: 'idle',
} as const satisfies Record<string, LpcBlock>;

export const CREW_SCALE = 1;

export const CREW_HIT = { width: 36, height: 54 } as const;

export const GROUND_TILE = {
  cell: 32,
  cells: 8,
  base: 0xc0,
  jitter: 52,
  seam: 0x90,
} as const;

export const GROUND_TIER_INK = [
  0x151c27, 0x171d27, 0x1a1d25, 0x1d1e23, 0x201e21, 0x241e1f, 0x281d1d,
  0x2c1c1b, 0x301b19,
] as const;

export const GROUND_FADE_MS = 1400;

export const officePlateUrl = (id: string): string =>
  `assets/board/office/${id}.png`;

export const OFFICE_SHELLS = [
  { key: 'office-shell-a', url: officePlateUrl('shell') },
  { key: 'office-shell-b', url: officePlateUrl('shell-b') },
] as const;

export const officeShellKey = (index: number): string =>
  OFFICE_SHELLS[index % OFFICE_SHELLS.length]!.key;

export const HOVER_WIDTH = 190;
export const HOVER_GROUND = '#10151c';
export const HOVER_PAD = { x: 6, y: 4 } as const;
export const HOVER_LINE_GAP = 2;
export const HOVER_OFFSET = { x: 14, y: 10, edge: 4 } as const;

export const CLOSE_FLOAT = { size: '13px', rise: 30 } as const;

export const CLICK_RING = {
  width: 1,
  alpha: 0.28,
  flashAlpha: 0.7,
  flashMs: 120,
} as const;

export const BOARD_INK = {
  floorLine: 0x1a212a,
  clickRing: 0x98a1b0,
  strip: 0x161b22,
  stripRule: 0x2a323c,
  pipEmpty: 0x2a323c,
  pipFull: 0x4ade80,
  button: 0x1f6feb,
  buttonIdle: 0x232b35,
  gold: 0xd8b34a,
} as const;

export const BOARD_TEXT = {
  dim: '#5b6675',
  body: '#98a1b0',
  bright: '#e6e9ef',
  gold: '#d8b34a',
  secret: '#2f3846',
} as const;

export const SCREEN_INK = {
  ground: 0x0f1216,
  panel: 0x161a20,
  frame: 0x2a323c,
  locked: 0x1b2129,
  ready: 0x1f6feb,
  owned: 0x2f6f4a,
  maxed: 0xd8b34a,
  wireDead: 0x222a33,
  wireLive: 0x39506b,
  pipEmpty: 0x2a323c,
  pipFull: 0x4ade80,
  ink: 0xe6e9ef,
  ink2: 0x98a1b0,
  ink3: 0x6b7482,
  dim: 0x49525e,
  money: 0xd8b34a,
  points: 0xe06c9f,
  good: 0x5fb37a,
  warn: 0xd99a3f,
  sev0: 0xe05252,
} as const;

export const CARRIED_CARD = {
  width: 22,
  height: 14,
  lift: 66,
  stroke: 0xd8dee9,
  strokeWidth: 1,
} as const;

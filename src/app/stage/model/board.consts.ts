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

export const FLYER_CAPACITY = 320;
export const RARE_CAPACITY = 24;

/** Room for every golden card a full board can hold at the chance cap. */
export const GOLD_GLOW_CAPACITY = 160;
/** A halo behind a golden card, pulsed on the GPU. Scales are of the 64px glow frame. */
export const GOLD_GLOW = {
  scaleX: 1.9,
  scaleY: 1.35,
  swell: 0.3,
  alpha: 0.75,
  flare: 0.25,
  ms: 700,
} as const;

/** New work is thrown on the same hop a harvest takes, slow enough to catch mid-air. */
export const DROP_MS = 1_850;
export const DROP_HOP = 90;

/** A taken card hops `HARVEST_HOP` px, then falls into its slot. */
export const HARVEST_MS = 1_600;
export const HARVEST_HOP = 150;

/** A won't-fix card sinks this far over its fade (`WONT_FIX_FADE_MS`); the hand can still take it. */
export const WONT_FIX_FADE = { sink: 10 } as const;

export const RARE_TITLE_WIDTH = 168;
export const RARE_TITLE_OFFSET = 26;

export const RARE_LIFT = 14;

export const SPRINT_STRIP_HEIGHT = 48;

/** An auto-closing card's tint, full by the time it ships itself. */
export const AUTO_CLOSE_RAMP = { ink: 0x5cff9d, peak: 1 } as const;

export const BUFF_BANNER = {
  size: '16px',
  colour: { escalation: '#d8b34a', hotfix: '#4ade80' },
  pulseMs: 900,
  swell: 0.06,
  fade: 0.12,
  gap: 6,
} as const;
export const SPRINT_PIP_LIMIT = 40;
export const SPRINT_BAR_WIDTH = 420;

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

export const TIER_BACKDROP = {
  tiers: 8,
  alpha: 0.4,
  fadeMs: 1400,
  swapMs: 30_000,
  swapFadeMs: 4000,
} as const;

export const BACKDROP_KINDS = ['office', 'tier'] as const;
export type BackdropKind = (typeof BACKDROP_KINDS)[number];

export const tierBackdropUrl = (tier: number, kind: BackdropKind): string =>
  `assets/board/backdrop/${tier}-${kind}.webp`;

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
export const FLOAT_MS = 750;

/** The sprint strip's payout floats sum a lane's income over this long. */
export const BILL_GROUP_MS = 300;

/** Live payout labels at most; past `small` the oldest is recycled. */
export const FLOAT_CAP = { small: 48, big: 4 } as const;

/** The hand's running total: merged while sweeps land within `windowMs`. */
export const COMBO = {
  windowMs: 320,
  cap: 8,
  lift: 16,
  rise: 36,
  pointsGap: 20,
  moneySize: '18px',
  pointsSize: '14px',
  growPerDouble: 0.14,
  maxGrow: 0.8,
  pop: 1.22,
  popMs: 140,
  holdMs: 220,
  flyMs: 620,
  landScale: 0.55,
  landAlpha: 0.35,
} as const;

/** Payouts with golden or incident work in them, sized to be read. */
export const BIG_FLOAT = {
  size: '24px',
  colour: '#f0c86a',
  stroke: '#d99a3f',
  strokeThickness: 2,
  rise: 46,
  ms: 2_000,
} as const;

/** The ticket title riding under a big payout. */
export const BIG_FLOAT_CAPTION = {
  size: '12px',
  colour: '#f6ecd2',
  stroke: '#1b2029',
  strokeThickness: 3,
  width: 240,
  gap: 2,
  edge: 6,
  everyMs: 1_500,
} as const;

export const SPEECH_BUBBLE = {
  size: '10px',
  ink: '#1b2029',
  ground: '#f2eee3',
  groundHex: 0xf2eee3,
  pad: { x: 5, y: 3 },
  width: 170,
  tail: 5,
  lift: 56,
  edge: 4,
  ms: 7_000,
  fadeMs: 400,
  gapMs: { min: 2_500, max: 5_500 },
  limit: 2,
} as const;

export const CLICK_RING = {
  width: 1,
  alpha: 0.28,
  flashAlpha: 0.7,
  flashMs: 120,
  ink: 0x98a1b0,
  refused: 0xd2604a,
} as const;

/** How long the ring stays red after a sweep the full can turned away. */
export const REFUSED_MS = 220;

/**
 * A full can does not just tint the ring: the work you tried to take hops
 * where it lies and stays there. The refusal is on the card, not the cursor.
 */
export const REFUSAL_BOUNCE = { ms: 260, lift: 9 } as const;

/** Scatter dressing on the floor — drawn, never collectible. */
export const FLOOR_SCATTER = {
  tile: 192,
  count: 26,
  size: 2,
  inks: [0xd8b34a, 0x9fb05a, 0xc9d3e2] as const,
  alpha: 0.5,
} as const;

/**
 * The lane above the board. One band, every line's actors mixed into it, so
 * the crowd on the path is the receipt for everything the rail sold.
 */
/** The planning-poker band, just under the lane the work falls from. */
export const VOTES = {
  /** Screen px from the spawner path's lowest feet to the first beam. */
  belowSpawners: 12,
  amplitude: 3,
  wavelength: 38,
  coachX: 16,
  /** Pixels below the first beam over which a re-estimated card's border fades in. */
  fade: 36,
} as const;

/** `top` and `height` bound the walkers' feet, in screen pixels. */
export const LANE = {
  top: 44,
  height: 40,
  margin: 34,
  scale: 0.7,
  perLine: 50,
  /** Walk speed, px/s, at which the LPC walk cycle plays at its own rate. */
  stride: 48,
} as const;

/** A newly bought walker pops onto the path under a pulsing halo, so the buy is seen landing. */
export const LANE_ARRIVAL = {
  popMs: 520,
  overshoot: 3.2,
  glowMs: 700,
  glowPulses: 3,
  glowScale: { from: 0.8, to: 2.6 },
  glowInk: 0xfff1c9,
} as const;

/** A line of several skins walks as one pack, smaller than a single body. */
export const LANE_PACK = {
  scale: 0.5,
  offsets: [
    { x: 0, y: 0 },
    { x: -13, y: 4 },
    { x: 11, y: 7 },
  ],
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
  laneAway: 0x1b2129,
  train: 0xe6e9ef,
  trainWindow: 0x1f6feb,
  tunnel: 0x07090c,
  tunnelFrame: 0x3a4452,
  vote: 0xa855f7,
  pizza: 0xf97316,
  card: 0xe6e9ef,
  coach: 0x98a1b0,
} as const;

export const BOARD_TEXT = {
  dim: '#5b6675',
  body: '#98a1b0',
  bright: '#e6e9ef',
  gold: '#d8b34a',
  points: '#e06c9f',
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
  wireLit: 0x5fb37a,
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

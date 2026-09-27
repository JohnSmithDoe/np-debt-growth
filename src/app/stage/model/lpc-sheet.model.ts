/*
 * LPC_SKINS follows the atlas packer order (sorted filenames): every spawner-* after the cast.
 */
import type { CastSkin } from '../../game/model/cast.model';
import { CAST } from '../../game/model/cast.model';

import type { SpawnerSkin } from './spawner-skin.model';
import { SPAWNER_SKINS } from './spawner-skin.model';

export const LPC_FRAME = 64;

export const LPC_FOOT = 62;

export const LPC_FRAME_RATE = 12;

const LPC_DIRECTIONS = ['up', 'left', 'down', 'right'] as const;

export type LpcDirection = (typeof LPC_DIRECTIONS)[number];

export const LPC_BLOCKS = {
  walk: { frames: 9 },
  slash: { frames: 6 },
  idle: { frames: 2 },
} as const;

export const PACKED_BLOCKS = ['walk', 'slash', 'idle'] as const;

export type LpcBlock = (typeof PACKED_BLOCKS)[number];

export type LpcAnimation = `${LpcBlock} ${LpcDirection}`;

export const LPC_BLOCK_RATE: Partial<Record<LpcBlock, number>> = {
  slash: 6,
};

export const FRAMES_PER_SKIN = PACKED_BLOCKS.reduce(
  (total, block) => total + LPC_BLOCKS[block].frames * LPC_DIRECTIONS.length,
  0
);

const OFFSETS: Record<LpcBlock, number> = (() => {
  const offsets = {} as Record<LpcBlock, number>;
  let running = 0;
  for (const block of PACKED_BLOCKS) {
    offsets[block] = running;
    running += LPC_BLOCKS[block].frames * LPC_DIRECTIONS.length;
  }
  return offsets;
})();

export type LpcSkin = CastSkin | SpawnerSkin;

export const LPC_SKINS: readonly LpcSkin[] = [
  ...CAST.map((entry) => entry.skin),
  ...SPAWNER_SKINS,
];

export const CREW_ATLAS = {
  key: 'cb-crew',
  url: 'assets/characters/crew-atlas.png',
} as const;

export interface LpcFrames {
  readonly start: number;
  readonly end: number;
}

export function packedFrames(
  skin: LpcSkin,
  animation: LpcAnimation
): LpcFrames {
  const [block, direction] = animation.split(' ') as [LpcBlock, LpcDirection];
  const { frames } = LPC_BLOCKS[block];
  const start =
    LPC_SKINS.indexOf(skin) * FRAMES_PER_SKIN +
    OFFSETS[block] +
    LPC_DIRECTIONS.indexOf(direction) * frames;
  return { start, end: start + frames - 1 };
}

export const FINALE_ATLAS = {
  key: 'cb-finale',
  url: 'assets/characters/finale-atlas.png',
} as const;

export const FINALE_MOVES = {
  'run left': 8,
  'run right': 8,
  'jump down': 5,
  'sit down': 3,
  'emote down': 3,
  'spellcast down': 7,
  'hurt down': 6,
} as const;

export type FinaleMove = keyof typeof FINALE_MOVES;

export const FINALE_MOVE_ORDER = Object.keys(FINALE_MOVES) as FinaleMove[];

export const FINALE_FRAMES_PER_SKIN = FINALE_MOVE_ORDER.reduce(
  (total, move) => total + FINALE_MOVES[move],
  0
);

export function finaleFrames(skin: LpcSkin, move: FinaleMove): LpcFrames {
  let start = LPC_SKINS.indexOf(skin) * FINALE_FRAMES_PER_SKIN;
  for (const earlier of FINALE_MOVE_ORDER) {
    if (earlier === move) break;
    start += FINALE_MOVES[earlier];
  }
  return { start, end: start + FINALE_MOVES[move] - 1 };
}

export function lpcAnimations(block: LpcBlock): readonly LpcAnimation[] {
  return LPC_DIRECTIONS.map((d) => `${block} ${d}` as LpcAnimation);
}

export function lpcFacing(dx: number, dy: number): LpcDirection {
  if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? 'left' : 'right';
  return dy < 0 ? 'up' : 'down';
}

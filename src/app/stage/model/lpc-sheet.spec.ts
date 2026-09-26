import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { CAST } from '../../game/model/cast.model';

import type { LpcSkin } from './lpc-sheet.model';
import {
  CREW_ATLAS,
  FRAMES_PER_SKIN,
  LPC_BLOCKS,
  LPC_SKINS,
  PACKED_BLOCKS,
  lpcAnimations,
  lpcFacing,
  packedFrames,
} from './lpc-sheet.model';

const manifest = JSON.parse(
  readFileSync('src/assets/characters/crew-atlas.json', 'utf8')
) as {
  frame: number;
  cols: number;
  framesPerSkin: number;
  blocks: string[];
  skins: string[];
};

const skinAt = (index: number): LpcSkin => {
  const skin = LPC_SKINS[index];
  if (!skin) throw new Error(`no skin at index ${index}`);
  return skin;
};

describe('crew atlas', () => {
  it('agrees with the packer about the layout', () => {
    expect(manifest.framesPerSkin).toBe(FRAMES_PER_SKIN);
    expect(manifest.blocks).toEqual([...PACKED_BLOCKS]);
    expect(manifest.frame).toBe(64);
  });

  it('lists the cast and the spawners in the order the atlas packed them', () => {
    expect([...LPC_SKINS]).toEqual(manifest.skins);
    expect(LPC_SKINS.slice(0, CAST.length)).toEqual(
      CAST.map((entry) => entry.skin)
    );
  });

  it('starts each skin on its own block of frames', () => {
    expect(packedFrames(skinAt(0), 'walk up').start).toBe(0);
    expect(packedFrames(skinAt(1), 'walk up').start).toBe(FRAMES_PER_SKIN);
    expect(packedFrames(skinAt(7), 'walk up').start).toBe(7 * FRAMES_PER_SKIN);
  });

  it('orders directions up, left, down, right', () => {
    const walk = LPC_BLOCKS.walk.frames;
    const first = skinAt(0);
    expect(packedFrames(first, 'walk left').start).toBe(walk);
    expect(packedFrames(first, 'walk down').start).toBe(2 * walk);
    expect(packedFrames(first, 'walk right').start).toBe(3 * walk);
  });

  it('never runs one animation into the next', () => {
    for (const skin of LPC_SKINS) {
      let expected = LPC_SKINS.indexOf(skin) * FRAMES_PER_SKIN;
      for (const block of PACKED_BLOCKS) {
        for (const animation of lpcAnimations(block)) {
          const { start, end } = packedFrames(skin, animation);
          expect(start).toBe(expected);
          expect(end - start + 1).toBe(LPC_BLOCKS[block].frames);
          expected = end + 1;
        }
      }
    }
  });

  it('keeps every frame inside the atlas', () => {
    const last = packedFrames(skinAt(LPC_SKINS.length - 1), 'idle right');
    expect(last.end).toBe(LPC_SKINS.length * FRAMES_PER_SKIN - 1);
  });

  it('reads a diagonal as its dominant axis', () => {
    expect(lpcFacing(-9, 2)).toBe('left');
    expect(lpcFacing(3, -8)).toBe('up');
    expect(lpcFacing(0, 0)).toBe('right');
  });

  it('points at an atlas that is actually shipped', () => {
    expect(CREW_ATLAS.url).toBe('assets/characters/crew-atlas.png');
    expect(
      readFileSync('src/assets/characters/crew-atlas.png').length
    ).toBeGreaterThan(0);
  });
});

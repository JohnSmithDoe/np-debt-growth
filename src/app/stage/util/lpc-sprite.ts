import * as Phaser from 'phaser';

import type {
  LpcAnimation,
  LpcBlock,
  LpcDirection,
  LpcSkin,
} from '../model/lpc-sheet.model';
import {
  CREW_ATLAS,
  FRAMES_PER_SKIN,
  LPC_BLOCK_RATE,
  LPC_FOOT,
  LPC_FRAME,
  LPC_FRAME_RATE,
  LPC_SKINS,
  PACKED_BLOCKS,
  lpcAnimations,
  lpcFacing,
  packedFrames,
} from '../model/lpc-sheet.model';

const TURN_EPSILON = 0.5;

const animationKey = (skin: LpcSkin, animation: LpcAnimation): string =>
  `${skin}:${animation}`;

export function loadCrewAtlas(scene: Phaser.Scene): void {
  if (scene.textures.exists(CREW_ATLAS.key)) return;
  scene.load.spritesheet(CREW_ATLAS.key, CREW_ATLAS.url, {
    frameWidth: LPC_FRAME,
    frameHeight: LPC_FRAME,
  });
}

export function registerCrewAnimations(scene: Phaser.Scene): void {
  assertAtlas(scene);
  scene.textures
    .get(CREW_ATLAS.key)
    .setFilter(Phaser.Textures.FilterMode.NEAREST);

  for (const skin of LPC_SKINS) {
    for (const block of PACKED_BLOCKS) {
      for (const animation of lpcAnimations(block)) {
        const key = animationKey(skin, animation);
        if (scene.anims.exists(key)) continue;
        scene.anims.create({
          key,
          frames: scene.anims.generateFrameNumbers(
            CREW_ATLAS.key,
            packedFrames(skin, animation)
          ),
          frameRate: LPC_BLOCK_RATE[block] ?? LPC_FRAME_RATE,
          repeat: -1,
        });
      }
    }
  }
}

function assertAtlas(scene: Phaser.Scene): void {
  const image = scene.textures.get(CREW_ATLAS.key).getSourceImage();
  const capacity =
    Math.floor(image.width / LPC_FRAME) * Math.floor(image.height / LPC_FRAME);
  const needed = LPC_SKINS.length * FRAMES_PER_SKIN;
  if (capacity >= needed) return;
  console.warn(
    `[lpc] crew atlas holds ${capacity} frames but ${LPC_SKINS.length} skins ` +
      `need ${needed} — re-run pack-sheets.mjs.`
  );
}

export class LpcSprite extends Phaser.GameObjects.Sprite {
  readonly #skin: LpcSkin;
  #facing: LpcDirection = 'down';

  #block?: LpcBlock;
  #started?: LpcDirection;

  constructor(scene: Phaser.Scene, x: number, y: number, skin: LpcSkin) {
    super(scene, x, y, CREW_ATLAS.key);
    this.#skin = skin;
    this.setOrigin(0.5, LPC_FOOT / LPC_FRAME);
    scene.add.existing(this);
  }

  get facing(): LpcDirection {
    return this.#facing;
  }

  perform(block: LpcBlock): this {
    if (block === this.#block && this.#facing === this.#started) return this;
    this.#block = block;
    this.#started = this.#facing;
    return this.playLpc(`${block} ${this.#facing}` as LpcAnimation);
  }

  aim(dx: number, dy: number): this {
    if (Math.abs(dx) > TURN_EPSILON || Math.abs(dy) > TURN_EPSILON) {
      this.#facing = lpcFacing(dx, dy);
    }
    return this;
  }

  face(direction: LpcDirection): this {
    this.#facing = direction;
    return this;
  }

  playLpc(animation: LpcAnimation): this {
    return this.play(animationKey(this.#skin, animation), true);
  }
}

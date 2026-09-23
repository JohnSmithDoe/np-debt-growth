import * as Phaser from 'phaser';

import {
  FLOOR_SCATTER,
  GROUND_FADE_MS,
  GROUND_TIER_INK,
  GROUND_TILE,
} from '../model/board.consts';

const TILE_KEY = 'cb-ground-tile';
const SCATTER_KEY = 'cb-ground-scatter';

function jitterAt(cell: number): number {
  const noise = Math.sin(cell * 12.9898) * 43758.5453;
  return noise - Math.floor(noise);
}

function bakeTile(scene: Phaser.Scene): void {
  if (scene.textures.exists(TILE_KEY)) scene.textures.remove(TILE_KEY);

  const { cell, cells, base, jitter, seam } = GROUND_TILE;
  const size = cell * cells;
  const texture = scene.textures.createCanvas(TILE_KEY, size, size);
  const ctx = texture?.getContext();
  if (!texture || !ctx) return;

  for (let index = 0; index < cells * cells; index++) {
    const value = Math.round(base + (jitterAt(index) - 0.5) * 2 * jitter);
    ctx.fillStyle = `rgb(${value},${value},${value})`;
    ctx.fillRect(
      (index % cells) * cell,
      Math.floor(index / cells) * cell,
      cell,
      cell
    );
  }

  ctx.fillStyle = `rgb(${seam},${seam},${seam})`;
  for (let line = 0; line < cells; line++) {
    ctx.fillRect(line * cell, 0, 1, size);
    ctx.fillRect(0, line * cell, size, 1);
  }
  texture.refresh();
}

/**
 * The flowers. Scatter that is drawn and never in the board model, so no
 * amount of sweeping can pick it up — the floor reads as a place, not a heap.
 */
function bakeScatter(scene: Phaser.Scene): void {
  if (scene.textures.exists(SCATTER_KEY)) scene.textures.remove(SCATTER_KEY);

  const { tile, count, size, inks } = FLOOR_SCATTER;
  const texture = scene.textures.createCanvas(SCATTER_KEY, tile, tile);
  const ctx = texture?.getContext();
  if (!texture || !ctx) return;

  ctx.clearRect(0, 0, tile, tile);
  for (let speck = 0; speck < count; speck++) {
    const x = jitterAt(speck * 3 + 1) * (tile - size);
    const y = jitterAt(speck * 3 + 2) * (tile - size);
    const ink = inks[Math.floor(jitterAt(speck * 3 + 3) * inks.length)] ?? 0;
    ctx.fillStyle = `#${ink.toString(16).padStart(6, '0')}`;
    ctx.fillRect(Math.round(x), Math.round(y), size, size);
  }
  texture.refresh();
}

function inkAt(tier: number): number {
  const last = GROUND_TIER_INK.length - 1;
  return (
    GROUND_TIER_INK[Math.min(Math.max(tier, 0), last)] ?? GROUND_TIER_INK[0]
  );
}

export class GroundLayer {
  readonly #carpet: Phaser.GameObjects.TileSprite;
  readonly #scatter: Phaser.GameObjects.TileSprite;
  readonly #scene: Phaser.Scene;
  #tier = -1;
  #fade?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, depth: number) {
    bakeTile(scene);
    bakeScatter(scene);
    this.#scene = scene;
    this.#carpet = scene.add
      .tileSprite(0, 0, 1, 1, TILE_KEY)
      .setOrigin(0, 0)
      .setDepth(depth);
    this.#scatter = scene.add
      .tileSprite(0, 0, 1, 1, SCATTER_KEY)
      .setOrigin(0, 0)
      .setAlpha(FLOOR_SCATTER.alpha)
      .setDepth(depth);
  }

  tier(count: number): void {
    if (count === this.#tier) return;
    const from = Phaser.Display.Color.ValueToColor(inkAt(this.#tier));
    const to = Phaser.Display.Color.ValueToColor(inkAt(count));
    const first = this.#tier < 0;
    this.#tier = count;

    this.#fade?.remove();
    if (first) return void this.#carpet.setTint(to.color);

    this.#fade = this.#scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: GROUND_FADE_MS,
      ease: 'Sine.easeInOut',
      onUpdate: (tween) => {
        const mix = Phaser.Display.Color.Interpolate.ColorWithColor(
          from,
          to,
          1,
          tween.getValue() ?? 1
        );
        this.#carpet.setTint(
          Phaser.Display.Color.GetColor(mix.r, mix.g, mix.b)
        );
      },
    });
  }

  layout(
    scale: number,
    offX: number,
    offY: number,
    width: number,
    height: number
  ): void {
    for (const layer of [this.#carpet, this.#scatter]) {
      layer.setSize(width, height);
      layer.tileScaleX = scale;
      layer.tileScaleY = scale;
      layer.tilePositionX = -offX / scale;
      layer.tilePositionY = -offY / scale;
    }
  }

  destroy(): void {
    this.#fade?.remove();
    this.#carpet.destroy();
    this.#scatter.destroy();
  }
}

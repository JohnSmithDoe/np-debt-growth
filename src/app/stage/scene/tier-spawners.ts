import * as Phaser from 'phaser';

import { DEBT_TIERS, tierNameKey } from '../../game/model/tier.model';
import type { SceneDeps } from '../model/scene-deps.model';
import { BOARD_TEXT } from '../model/board.consts';
import { ATLAS_KEY, SPAWNER_FRAMES } from '../util/board-atlas';

const LANE_GAP = 46;

interface Walker {
  readonly frame: string;
  readonly speed: number;
  readonly direction: 1 | -1;
}

const WALKERS: Readonly<Record<number, Walker>> = {
  1: { frame: SPAWNER_FRAMES[0] ?? '', speed: 26, direction: 1 },
  2: { frame: SPAWNER_FRAMES[1] ?? '', speed: 58, direction: -1 },
  3: { frame: SPAWNER_FRAMES[2] ?? '', speed: 40, direction: 1 },
  4: { frame: SPAWNER_FRAMES[3] ?? '', speed: 34, direction: -1 },
  5: { frame: SPAWNER_FRAMES[4] ?? '', speed: 72, direction: 1 },
  6: { frame: SPAWNER_FRAMES[5] ?? '', speed: 18, direction: -1 },
  7: { frame: SPAWNER_FRAMES[6] ?? '', speed: 46, direction: 1 },
  8: { frame: SPAWNER_FRAMES[7] ?? '', speed: 88, direction: -1 },
};

export class TierSpawners {
  readonly #walkers: Phaser.GameObjects.Image[] = [];
  readonly #labels: Phaser.GameObjects.Text[] = [];
  readonly #specs: (Walker | undefined)[] = [];
  readonly #direction: number[] = [];

  #left = 0;
  #right = 0;
  #tier = -1;

  constructor(scene: Phaser.Scene, depth: number, text: SceneDeps['text']) {
    DEBT_TIERS.forEach((tier) => {
      const spec = WALKERS[tier.index];
      this.#specs.push(spec);
      this.#direction.push(spec?.direction ?? 1);
      this.#walkers.push(
        scene.add
          .image(0, 0, ATLAS_KEY, spec?.frame ?? SPAWNER_FRAMES[0])
          .setDepth(depth)
          .setVisible(false)
      );
      this.#labels.push(
        scene.add
          .text(0, 0, text(tierNameKey(tier.index)).toUpperCase(), {
            fontFamily: 'monospace',
            fontSize: '9px',
            color: BOARD_TEXT.dim,
          })
          .setOrigin(0.5, 0)
          .setDepth(depth)
          .setVisible(false)
      );
    });
  }

  layout(left: number, top: number, width: number): void {
    this.#left = left + 40;
    this.#right = left + width - 40;
    this.#walkers.forEach((walker, index) => {
      walker.setPosition(
        Phaser.Math.Between(this.#left, this.#right),
        top + 40 + index * LANE_GAP
      );
    });
  }

  sync(tier: number): void {
    if (tier === this.#tier) return;
    this.#tier = tier;
    const shown = (index: number): boolean =>
      index < tier && this.#specs[index] !== undefined;
    this.#walkers.forEach((walker, index) => walker.setVisible(shown(index)));
    this.#labels.forEach((label, index) => label.setVisible(shown(index)));
  }

  update(deltaMs: number): void {
    for (let index = 0; index < this.#walkers.length; index++) {
      const walker = this.#walkers[index];
      if (!walker?.visible) continue;
      const direction = this.#direction[index] ?? 1;
      const speed = this.#specs[index]?.speed ?? 0;
      walker.x += (speed * direction * deltaMs) / 1000;
      if (walker.x < this.#left || walker.x > this.#right) {
        this.#direction[index] = -direction;
        walker.x = Phaser.Math.Clamp(walker.x, this.#left, this.#right);
      }
      walker.setFlipX(direction < 0);
      this.#labels[index]?.setPosition(walker.x, walker.y + 24);
    }
  }

  originOf(tierIndex: number): Phaser.GameObjects.Image | null {
    const walker = this.#walkers[tierIndex - 1];
    return walker?.visible ? walker : null;
  }

  destroy(): void {
    for (const walker of this.#walkers) walker.destroy();
    for (const label of this.#labels) label.destroy();
  }
}

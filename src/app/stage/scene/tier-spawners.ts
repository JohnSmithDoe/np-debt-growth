import * as Phaser from 'phaser';

import { SPAWNERS } from '../../game/model/spawner.model';
import { LANE } from '../model/board.consts';
import { ATLAS_KEY, SPAWNER_FRAMES } from '../util/board-atlas';

interface Pace {
  readonly speed: number;
  readonly lane: number;
}

/** Stable per-walker pace and height, so a crowd does not march in step. */
function paceOf(adr: number, index: number): Pace {
  const noise = Math.sin((adr * 37 + index * 11 + 1) * 12.9898) * 43758.5453;
  const at = noise - Math.floor(noise);
  return { speed: 16 + at * 74, lane: at };
}

interface Walker {
  readonly image: Phaser.GameObjects.Image;
  readonly speed: number;
  readonly lane: number;
  direction: 1 | -1;
}

/**
 * The path above the board. Every line you buy puts another body on it, so
 * the lane is the receipt for the whole rail — crowd it and the board fills.
 */
export class TierSpawners {
  readonly #scene: Phaser.Scene;
  readonly #depth: number;
  readonly #lines = new Map<number, Walker[]>();
  readonly #counts = new Map<number, number>();

  #left = 0;
  #right = 0;
  #top = 0;

  constructor(scene: Phaser.Scene, depth: number) {
    this.#scene = scene;
    this.#depth = depth;
  }

  layout(left: number, top: number, width: number): void {
    this.#left = left + LANE.margin;
    this.#right = left + width - LANE.margin;
    this.#top = top + LANE.top;
    for (const walkers of this.#lines.values()) {
      walkers.forEach((walker, index) => this.#place(index, walker));
    }
  }

  /** `counts` is the rail's ledger: one walker drawn per head bought, capped. */
  sync(counts: (adr: number) => number): void {
    for (const row of SPAWNERS) {
      const wanted = Math.min(counts(row.adr), LANE.perLine);
      if (this.#counts.get(row.adr) === wanted) continue;
      this.#counts.set(row.adr, wanted);
      this.#fit(row.adr, wanted);
    }
  }

  update(deltaMs: number): void {
    for (const walkers of this.#lines.values()) {
      for (const walker of walkers) {
        const step = (walker.speed * walker.direction * deltaMs) / 1000;
        walker.image.x += step;
        if (walker.image.x < this.#left || walker.image.x > this.#right) {
          walker.direction = walker.direction < 0 ? 1 : -1;
          walker.image.x = Phaser.Math.Clamp(
            walker.image.x,
            this.#left,
            this.#right
          );
        }
        walker.image.setFlipX(walker.direction < 0);
      }
    }
  }

  /** Where a card of this line falls from: one of the bodies that dropped it. */
  originOf(adr: number): Phaser.GameObjects.Image | null {
    const walkers = this.#lines.get(adr);
    if (!walkers || walkers.length === 0) return null;
    const at = Math.floor(Math.random() * walkers.length);
    return walkers[at]?.image ?? null;
  }

  destroy(): void {
    for (const walkers of this.#lines.values()) {
      for (const walker of walkers) walker.image.destroy();
    }
    this.#lines.clear();
    this.#counts.clear();
  }

  #fit(adr: number, wanted: number): void {
    const walkers = this.#lines.get(adr) ?? [];
    this.#lines.set(adr, walkers);

    while (walkers.length > wanted) walkers.pop()?.image.destroy();
    while (walkers.length < wanted) {
      const index = walkers.length;
      const { speed, lane } = paceOf(adr, index);
      const walker: Walker = {
        image: this.#scene.add
          .image(0, 0, ATLAS_KEY, SPAWNER_FRAMES[adr] ?? SPAWNER_FRAMES[0])
          .setScale(LANE.scale)
          .setDepth(this.#depth + (lane < 0.5 ? 0 : 1)),
        speed,
        lane,
        direction: index % 2 === 0 ? 1 : -1,
      };
      walkers.push(walker);
      this.#place(index, walker);
    }
  }

  #place(index: number, walker: Walker): void {
    const span = Math.max(1, this.#right - this.#left);
    const spread = (index + 0.5) / Math.max(1, LANE.perLine);
    walker.image.setPosition(
      this.#left + ((spread + walker.lane) % 1) * span,
      this.#top + walker.lane * LANE.height
    );
  }
}

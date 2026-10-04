import * as Phaser from 'phaser';

import { FLOAT_PUNCH, FLOAT_SPACING } from '../model/board.consts';

export class FloatPool {
  readonly #idle: Phaser.GameObjects.Text[] = [];
  readonly #live: Phaser.GameObjects.Text[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly depth: number,
    private readonly cap: number
  ) {}

  take(
    x: number,
    y: number,
    label: string,
    size: string,
    colour: string
  ): Phaser.GameObjects.Text {
    const text =
      this.#live.length >= this.cap
        ? this.#recycle()
        : (this.#idle.pop() ??
          this.scene.add.text(0, 0, '', {
            fontFamily: 'monospace',
            fontStyle: 'bold',
            stroke: FLOAT_PUNCH.stroke,
            strokeThickness: FLOAT_PUNCH.strokeThickness,
          }));
    text
      .setText(label)
      .setFontSize(size)
      .setColor(colour)
      .setOrigin(0.5)
      .setScale(1)
      .setAlpha(1)
      .setDepth(this.depth)
      .setVisible(true);
    text.setPosition(this.#clearX(x, y, text.width, text.height), y);
    this.#live.push(text);
    return text;
  }

  /** Nearest x clear of live floats level with or just above `y`, which a fresh float would catch up with. Tweens only move y. */
  #clearX(x: number, y: number, width: number, height: number): number {
    const blockers = this.#live.filter(
      (other) =>
        other.alpha > FLOAT_SPACING.minAlpha &&
        other.y - y < (other.height + height) / 2 &&
        y - other.y < (other.height + height) / 2 + FLOAT_SPACING.trail
    );
    if (blockers.length === 0) return x;
    const hits = (at: number): boolean =>
      blockers.some(
        (other) =>
          Math.abs(other.x - at) < (other.width + width) / 2 + FLOAT_SPACING.gap
      );
    const step = width / 2 + FLOAT_SPACING.gap;
    for (let tries = 0; tries <= FLOAT_SPACING.tries; tries++) {
      for (const sign of [1, -1]) {
        const at = x + sign * tries * step;
        if (!hits(at)) return at;
      }
    }
    return x;
  }

  give(text: Phaser.GameObjects.Text): void {
    const at = this.#live.indexOf(text);
    if (at < 0) return;
    this.#live.splice(at, 1);
    this.scene.tweens.killTweensOf(text);
    this.#idle.push(text.setVisible(false));
  }

  destroy(): void {
    for (const text of [...this.#idle, ...this.#live]) text.destroy();
    this.#idle.length = 0;
    this.#live.length = 0;
  }

  #recycle(): Phaser.GameObjects.Text {
    const oldest = this.#live.shift()!;
    this.scene.tweens.killTweensOf(oldest);
    return oldest;
  }
}

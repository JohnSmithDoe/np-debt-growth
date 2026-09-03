import * as Phaser from 'phaser';

import { BOARD_TEXT, MAX_FRAME_MS } from '../model/board.consts';
import type { SceneDeps } from '../model/scene-deps.model';

export abstract class CbScene extends Phaser.Scene {
  protected constructor(
    key: string,
    protected readonly deps: SceneDeps
  ) {
    super(key);
  }

  protected cappedDelta(delta: number): number {
    return Math.min(delta, MAX_FRAME_MS);
  }

  protected pulse(target: Phaser.GameObjects.GameObject): void {
    this.tweens.add({
      targets: target,
      scale: { from: 1, to: 1.16 },
      duration: 90,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  protected floatPayout(
    x: number,
    y: number,
    label: string,
    style: { colour?: string; size?: string; rise?: number } = {}
  ): void {
    const text = this.add
      .text(x, y, label, {
        fontFamily: 'monospace',
        fontSize: style.size ?? '18px',
        color: style.colour ?? BOARD_TEXT.gold,
      })
      .setOrigin(0.5)
      .setDepth(50);

    this.tweens.add({
      targets: text,
      y: y - (style.rise ?? 46),
      alpha: 0,
      duration: 650,
      ease: 'Sine.easeOut',
      onComplete: () => text.destroy(),
    });
  }
}

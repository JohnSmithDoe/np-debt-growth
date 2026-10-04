/*
 * sharpen() must be the first call in create().
 * onLeave covers stop and removal: scene.remove destroys without a shutdown event.
 */
import * as Phaser from 'phaser';

import {
  BIG_FLOAT,
  BIG_FLOAT_CAPTION,
  BOARD_TEXT,
  FLOAT_CAP,
  FLOAT_MS,
  FLOAT_PUNCH,
  MAX_FRAME_MS,
  PAYOUT_FLOAT_SIZE,
} from '../model/board.consts';
import type { SceneDeps } from '../model/scene-deps.model';
import { FloatPool } from '../util/float-pool';

export abstract class CbScene extends Phaser.Scene {
  #floats?: FloatPool;
  #bigLive = 0;

  protected constructor(
    key: string,
    protected readonly deps: SceneDeps
  ) {
    super(key);
  }

  protected get backing(): number {
    return 1 / (this.scale.zoom || 1);
  }

  protected get viewWidth(): number {
    return this.scale.width / this.backing;
  }

  protected get viewHeight(): number {
    return this.scale.height / this.backing;
  }

  protected sharpen(fixedCamera: boolean): void {
    const onAdded = (object: Phaser.GameObjects.GameObject): void => {
      if (object instanceof Phaser.GameObjects.Text) {
        object.setResolution(this.backing);
      }
    };
    this.events.on(Phaser.Scenes.Events.ADDED_TO_SCENE, onAdded);
    this.onLeave(() =>
      this.events.off(Phaser.Scenes.Events.ADDED_TO_SCENE, onAdded)
    );
    if (!fixedCamera) return;
    const fit = (): void => {
      this.cameras.main.setOrigin(0, 0).setZoom(this.backing);
    };
    fit();
    this.scale.on(Phaser.Scale.Events.RESIZE, fit);
    this.onLeave(() => this.scale.off(Phaser.Scale.Events.RESIZE, fit));
  }

  protected onLeave(teardown: () => void): void {
    let done = false;
    const once = (): void => {
      if (done) return;
      done = true;
      teardown();
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, once);
    this.events.once(Phaser.Scenes.Events.DESTROY, once);
  }

  protected get floats(): FloatPool {
    if (!this.#floats) {
      const pool = new FloatPool(this, 50, FLOAT_CAP.small);
      this.#floats = pool;
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        pool.destroy();
        this.#floats = undefined;
        this.#bigLive = 0;
      });
    }
    return this.#floats;
  }

  /** Alpha new floats start at; the board lowers it while an acceptance test runs. */
  protected floatAlpha = 1;

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
  ): Phaser.GameObjects.Text {
    const floats = this.floats;
    const text = floats.take(
      x,
      y,
      label,
      style.size ?? PAYOUT_FLOAT_SIZE,
      style.colour ?? BOARD_TEXT.gold
    );
    text.setAlpha(this.floatAlpha);

    this.#popIn(text);
    this.tweens.add({
      targets: text,
      y: y - (style.rise ?? 46),
      alpha: 0,
      duration: FLOAT_MS,
      ease: 'Sine.easeOut',
      onComplete: () => floats.give(text),
    });
    return text;
  }

  /** False when the cap is reached and nothing was shown. */
  protected floatBig(
    x: number,
    y: number,
    label: string,
    caption?: string
  ): boolean {
    if (this.#bigLive >= FLOAT_CAP.big) return false;
    this.#bigLive += 1;
    const sizes = BIG_FLOAT.sizes;
    const text = this.add
      .text(x, y, label, {
        fontFamily: 'monospace',
        fontStyle: 'bold',
        fontSize: sizes[Math.floor(Math.random() * sizes.length)],
        color: BIG_FLOAT.colour,
        stroke: BIG_FLOAT.stroke,
        strokeThickness: BIG_FLOAT.strokeThickness,
      })
      .setOrigin(0.5)
      .setDepth(51)
      .setAlpha(this.floatAlpha);
    const targets = caption ? [text, this.#caption(text, caption)] : [text];

    this.#popIn(text);
    this.tweens.add({
      targets,
      y: `-=${BIG_FLOAT.rise}`,
      alpha: 0,
      duration: BIG_FLOAT.ms,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.#bigLive -= 1;
        for (const target of targets) target.destroy();
      },
    });
    return true;
  }

  #popIn(text: Phaser.GameObjects.Text): void {
    this.tweens.add({
      targets: text,
      scale: { from: FLOAT_PUNCH.from, to: 1 },
      duration: FLOAT_PUNCH.ms,
      ease: 'Back.easeOut',
      easeParams: [FLOAT_PUNCH.overshoot],
    });
  }

  #caption(
    amount: Phaser.GameObjects.Text,
    caption: string
  ): Phaser.GameObjects.Text {
    const line = this.add
      .text(0, amount.y + amount.height / 2 + BIG_FLOAT_CAPTION.gap, caption, {
        fontFamily: 'monospace',
        fontSize: BIG_FLOAT_CAPTION.size,
        color: BIG_FLOAT_CAPTION.colour,
        stroke: BIG_FLOAT_CAPTION.stroke,
        strokeThickness: BIG_FLOAT_CAPTION.strokeThickness,
        align: 'center',
        wordWrap: { width: BIG_FLOAT_CAPTION.width },
      })
      .setOrigin(0.5, 0)
      .setDepth(51);
    const half = Math.max(line.width, amount.width) / 2;
    const x = Phaser.Math.Clamp(
      amount.x,
      half + BIG_FLOAT_CAPTION.edge,
      this.viewWidth - half - BIG_FLOAT_CAPTION.edge
    );
    amount.setX(x);
    return line.setX(x);
  }
}

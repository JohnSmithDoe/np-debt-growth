import type * as Phaser from 'phaser';

import {
  formatCompactWhole,
  formatMoney,
} from '../../@shared/util/format-quantity';
import { BOARD_TEXT, COMBO } from '../model/board.consts';
import type { PayoutTarget } from '../model/scene-deps.model';
import { FloatPool } from '../util/float-pool';

interface Run {
  value: number;
  sp: number;
  count: number;
  lastAt: number;
  money: Phaser.GameObjects.Text | null;
  points: Phaser.GameObjects.Text | null;
}

/**
 * The hand's takings as one running total under the pointer. It grows while
 * the sweep keeps finding work and flies to its counter once the sweep stops.
 */
export class PayoutCombo {
  readonly #scene: Phaser.Scene;
  readonly #pool: FloatPool;
  readonly #target: (kind: PayoutTarget) => { x: number; y: number } | null;
  #run: Run | null = null;

  constructor(
    scene: Phaser.Scene,
    depth: number,
    target: (kind: PayoutTarget) => { x: number; y: number } | null
  ) {
    this.#scene = scene;
    this.#pool = new FloatPool(scene, depth, COMBO.cap);
    this.#target = target;
  }

  add(
    x: number,
    y: number,
    value: number,
    sp: number,
    count: number,
    now: number
  ): void {
    let run = this.#run;
    if (run && now - run.lastAt > COMBO.windowMs) {
      this.#fly(run);
      run = null;
    }
    run ??= {
      value: 0,
      sp: 0,
      count: 0,
      lastAt: now,
      money: null,
      points: null,
    };
    this.#run = run;

    run.value += value;
    run.sp += sp;
    if (value > 0) run.count += count;
    run.lastAt = now;

    const grow =
      1 +
      Math.min(
        COMBO.maxGrow,
        Math.log2(Math.max(1, run.count)) * COMBO.growPerDouble
      );
    if (run.value > 0) {
      const label =
        run.count > 1
          ? `+${formatMoney(run.value)} ×${run.count}`
          : `+${formatMoney(run.value)}`;
      run.money = this.#write(
        run.money,
        x,
        y - COMBO.lift,
        label,
        COMBO.moneySize,
        BOARD_TEXT.gold,
        grow
      );
    }
    if (run.sp > 0) {
      run.points = this.#write(
        run.points,
        x,
        y - COMBO.lift + COMBO.pointsGap * grow,
        `+${formatCompactWhole(run.sp)} SP`,
        COMBO.pointsSize,
        BOARD_TEXT.points,
        grow
      );
    }
  }

  update(now: number): void {
    const run = this.#run;
    if (!run || now - run.lastAt <= COMBO.windowMs) return;
    this.#run = null;
    this.#fly(run);
  }

  destroy(): void {
    this.#run = null;
    this.#pool.destroy();
  }

  #write(
    text: Phaser.GameObjects.Text | null,
    x: number,
    y: number,
    label: string,
    size: string,
    colour: string,
    grow: number
  ): Phaser.GameObjects.Text {
    const shown = text?.visible
      ? text.setText(label).setPosition(x, y)
      : this.#pool.take(x, y, label, size, colour);
    this.#scene.tweens.killTweensOf(shown);
    shown.setAlpha(1);
    this.#scene.tweens.add({
      targets: shown,
      scale: { from: grow * COMBO.pop, to: grow },
      duration: COMBO.popMs,
      ease: 'Quad.easeOut',
    });
    return shown;
  }

  #fly(run: Run): void {
    this.#send(run.money, 'money');
    this.#send(run.points, 'points');
  }

  #send(text: Phaser.GameObjects.Text | null, kind: PayoutTarget): void {
    if (!text?.visible) return;
    const to = this.#target(kind) ?? { x: text.x, y: text.y - COMBO.rise };
    this.#scene.tweens.killTweensOf(text);
    this.#scene.tweens.add({
      targets: text,
      x: to.x,
      y: to.y,
      scale: text.scale * COMBO.landScale,
      alpha: { from: 1, to: COMBO.landAlpha },
      delay: COMBO.holdMs,
      duration: COMBO.flyMs,
      ease: 'Cubic.easeIn',
      onComplete: () => this.#pool.give(text),
    });
  }
}

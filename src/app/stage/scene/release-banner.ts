import * as Phaser from 'phaser';

import type {
  ReleasePhase,
  ReleasePhaseId,
} from '../../game/model/balance/round';
import { releasePhaseKey } from '../../game/model/round.model';
import { phaseAt } from '../../game/util/economy';
import {
  BIG_FLOAT,
  BIG_FLOAT_CAPTION,
  RELEASE_BANNER,
} from '../model/board.consts';
import type { SceneDeps } from '../model/scene-deps.model';

export class ReleaseBanner {
  readonly #scene: Phaser.Scene;
  readonly #deps: SceneDeps;
  readonly #depth: number;
  readonly #title: Phaser.GameObjects.Text;
  readonly #current: Phaser.GameObjects.Text;
  readonly #hint: Phaser.GameObjects.Text;
  readonly #steps: Phaser.GameObjects.Text[] = [];
  readonly #arrows: Phaser.GameObjects.Text[] = [];
  #shown = false;
  #drawnPhases: readonly ReleasePhase[] | null = null;
  #drawnNow: ReleasePhaseId | null = null;
  #drawnX = NaN;
  #drawnY = NaN;
  #drawnWidth = NaN;

  constructor(scene: Phaser.Scene, deps: SceneDeps, depth: number) {
    this.#scene = scene;
    this.#deps = deps;
    this.#depth = depth;
    this.#title = this.#text(RELEASE_BANNER.titleSize);
    this.#current = this.#text(RELEASE_BANNER.currentSize, true);
    this.#hint = this.#text(RELEASE_BANNER.stepSize);
  }

  update(centreX: number, centreY: number, maxWidth: number): void {
    const left = this.#deps.roundLeftMs();
    if (left <= 0) {
      if (this.#shown) this.#hide();
      return;
    }

    const phases = this.#deps.releasePhases();
    const now = phaseAt(phases, left);
    if (
      this.#shown &&
      phases === this.#drawnPhases &&
      now === this.#drawnNow &&
      centreX === this.#drawnX &&
      centreY === this.#drawnY &&
      maxWidth === this.#drawnWidth
    ) {
      return;
    }
    this.#shown = true;
    this.#drawnPhases = phases;
    this.#drawnNow = now;
    this.#drawnX = centreX;
    this.#drawnY = centreY;
    this.#drawnWidth = maxWidth;

    const at = phases.findIndex((phase) => phase.id === now);
    this.#title.setText(this.#deps.text('board.release.title'));
    this.#current.setText(this.#deps.text(releasePhaseKey(now)));
    this.#hint.setText(this.#deps.text('board.release.hint'));

    while (this.#steps.length < phases.length) {
      this.#steps.push(this.#text(RELEASE_BANNER.stepSize));
      this.#arrows.push(this.#text(RELEASE_BANNER.stepSize).setText('›'));
    }
    const ids = phases.map((phase) => phase.id);
    let width = this.#layoutSteps(ids, at, false);
    if (width > maxWidth) width = this.#layoutSteps(ids, at, true);

    const gap = RELEASE_BANNER.gap;
    const heights = [
      this.#title,
      this.#current,
      this.#steps[0]!,
      this.#hint,
    ].map((t) => t.height);
    const total = heights.reduce((sum, h) => sum + h, 0) + gap * 3;
    let y = centreY - total / 2;
    this.#title.setPosition(centreX, y).setVisible(true);
    y += heights[0]! + gap;
    this.#current.setPosition(centreX, y).setVisible(true);
    y += heights[1]! + gap;
    this.#placeSteps(phases.length, centreX - width / 2, y);
    y += heights[2]! + gap;
    this.#hint.setPosition(centreX, y).setVisible(true);
  }

  destroy(): void {
    for (const object of [
      this.#title,
      this.#current,
      this.#hint,
      ...this.#steps,
      ...this.#arrows,
    ]) {
      object.destroy();
    }
  }

  #layoutSteps(
    ids: readonly Parameters<typeof releasePhaseKey>[0][],
    at: number,
    short: boolean
  ): number {
    let width = 0;
    for (const [index, id] of ids.entries()) {
      const step = this.#steps[index]!;
      step
        .setText(this.#deps.text(releasePhaseKey(id, short)))
        .setColor(index === at ? BIG_FLOAT.colour : BIG_FLOAT_CAPTION.colour)
        .setAlpha(index < at ? RELEASE_BANNER.doneAlpha : 1);
      width += step.width;
      if (index > 0)
        width += this.#arrows[index - 1]!.width + RELEASE_BANNER.stepGap * 2;
    }
    for (let index = ids.length; index < this.#steps.length; index++) {
      this.#steps[index]!.setVisible(false);
      this.#arrows[index - 1]?.setVisible(false);
    }
    return width;
  }

  #placeSteps(count: number, left: number, y: number): void {
    let x = left;
    for (let index = 0; index < count; index++) {
      if (index > 0) {
        const arrow = this.#arrows[index - 1]!;
        x += RELEASE_BANNER.stepGap;
        arrow.setOrigin(0, 0).setPosition(x, y).setVisible(true);
        x += arrow.width + RELEASE_BANNER.stepGap;
      }
      const step = this.#steps[index]!;
      step.setOrigin(0, 0).setPosition(x, y).setVisible(true);
      x += step.width;
    }
  }

  #hide(): void {
    this.#shown = false;
    this.#drawnPhases = null;
    for (const object of [
      this.#title,
      this.#current,
      this.#hint,
      ...this.#steps,
      ...this.#arrows,
    ]) {
      object.setVisible(false);
    }
  }

  #text(size: string, gold = false): Phaser.GameObjects.Text {
    const ink = gold ? BIG_FLOAT : BIG_FLOAT_CAPTION;
    return this.#scene.add
      .text(0, 0, '', {
        fontFamily: 'monospace',
        fontSize: size,
        color: ink.colour,
        stroke: ink.stroke,
        strokeThickness: ink.strokeThickness,
      })
      .setOrigin(0.5, 0)
      .setDepth(this.#depth + 1)
      .setVisible(false);
  }
}

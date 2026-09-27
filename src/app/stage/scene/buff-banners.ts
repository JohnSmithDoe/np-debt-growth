import * as Phaser from 'phaser';

import {
  formatCompactMoney,
  formatQuantity,
} from '../../@shared/util/format-quantity';
import type { BuffNotice } from '../../game/model/round.model';
import { BUFF_BANNER, HOVER_GROUND } from '../model/board.consts';
import type { SceneDeps } from '../model/scene-deps.model';

const IDS: readonly BuffNotice['id'][] = ['acceptance', 'escalation', 'hotfix'];

/** One pulsing line per live buff, stacked upward from `bottom`. */
export class BuffBanners {
  readonly #deps: SceneDeps;
  readonly #lines = new Map<BuffNotice['id'], Phaser.GameObjects.Text>();
  readonly #drawn = new Map<BuffNotice['id'], string>();
  #clock = 0;

  constructor(scene: Phaser.Scene, deps: SceneDeps, depth: number) {
    this.#deps = deps;
    for (const id of IDS) {
      this.#lines.set(
        id,
        scene.add
          .text(0, 0, '', {
            fontFamily: 'monospace',
            fontSize: BUFF_BANNER.size,
            color: BUFF_BANNER.colour[id],
            backgroundColor: HOVER_GROUND,
            padding: { x: 10, y: 5 },
          })
          .setOrigin(0.5, 1)
          .setDepth(depth)
          .setVisible(false)
      );
    }
  }

  update(deltaMs: number, centreX: number, bottom: number): void {
    this.#clock = (this.#clock + deltaMs) % BUFF_BANNER.pulseMs;
    const wave = Math.sin((this.#clock / BUFF_BANNER.pulseMs) * Math.PI * 2);
    const scale = 1 + BUFF_BANNER.swell * wave;
    const alpha = 1 - BUFF_BANNER.fade * (0.5 - wave / 2);

    const live = new Map(this.#deps.buffNotices().map((b) => [b.id, b]));
    let y = bottom;
    for (const id of IDS) {
      const line = this.#lines.get(id)!;
      const notice = live.get(id);
      if (!notice) {
        if (line.visible) line.setVisible(false);
        this.#drawn.delete(id);
        continue;
      }
      const mult = Number.isInteger(notice.mult)
        ? notice.mult
        : formatQuantity(notice.mult);
      const text =
        notice.id === 'acceptance'
          ? this.#deps.text('board.buff.acceptance', {
              mult,
              have: formatCompactMoney(notice.budget),
              goal: formatCompactMoney(notice.goal),
            })
          : this.#deps.text(`board.buff.${notice.id}`, {
              mult,
              seconds: Math.ceil(notice.msLeft / 1000),
            });
      if (this.#drawn.get(id) !== text) {
        this.#drawn.set(id, text);
        line.setText(text);
      }
      line
        .setVisible(true)
        .setPosition(centreX, y)
        .setScale(scale)
        .setAlpha(alpha);
      y -= line.height + BUFF_BANNER.gap;
    }
  }

  destroy(): void {
    for (const line of this.#lines.values()) line.destroy();
  }
}

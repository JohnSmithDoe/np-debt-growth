import * as Phaser from 'phaser';

import {
  formatCompactMoney,
  formatQuantity,
} from '../../@shared/util/format-quantity';
import type { BuffNotice } from '../../game/model/round.model';
import { BUFF_BANNER, HOVER_GROUND } from '../model/board.consts';
import type { SceneDeps } from '../model/scene-deps.model';

const IDS: readonly BuffNotice['id'][] = ['acceptance', 'escalation', 'hotfix'];

interface Drawn {
  shown: boolean;
  mult: number;
  a: number;
  b: number;
}

function noticeOf(
  notices: readonly BuffNotice[],
  id: BuffNotice['id']
): BuffNotice | undefined {
  for (const notice of notices) if (notice.id === id) return notice;
  return undefined;
}

export class BuffBanners {
  readonly #deps: SceneDeps;
  readonly #lines = new Map<BuffNotice['id'], Phaser.GameObjects.Text>();
  readonly #drawn = new Map<BuffNotice['id'], Drawn>();
  #clock = 0;

  constructor(scene: Phaser.Scene, deps: SceneDeps, depth: number) {
    this.#deps = deps;
    for (const id of IDS) {
      this.#drawn.set(id, { shown: false, mult: 0, a: 0, b: 0 });
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

    const notices = this.#deps.buffNotices();
    let y = bottom;
    for (const id of IDS) {
      const line = this.#lines.get(id)!;
      const drawn = this.#drawn.get(id)!;
      const notice = noticeOf(notices, id);
      if (!notice) {
        if (line.visible) line.setVisible(false);
        drawn.shown = false;
        continue;
      }
      const acceptance = notice.id === 'acceptance';
      const a = acceptance ? notice.budget : Math.ceil(notice.msLeft / 1000);
      const b = acceptance ? notice.goal : 0;
      if (
        !drawn.shown ||
        drawn.mult !== notice.mult ||
        drawn.a !== a ||
        drawn.b !== b
      ) {
        drawn.shown = true;
        drawn.mult = notice.mult;
        drawn.a = a;
        drawn.b = b;
        line.setText(this.#format(notice));
      }
      line
        .setVisible(true)
        .setPosition(centreX, y)
        .setScale(scale)
        .setAlpha(alpha);
      y -= line.height + BUFF_BANNER.gap;
    }
  }

  #format(notice: BuffNotice): string {
    const mult = Number.isInteger(notice.mult)
      ? notice.mult
      : formatQuantity(notice.mult);
    return notice.id === 'acceptance'
      ? this.#deps.text('board.buff.acceptance', {
          mult,
          have: formatCompactMoney(notice.budget),
          goal: formatCompactMoney(notice.goal),
        })
      : this.#deps.text(`board.buff.${notice.id}`, {
          mult,
          seconds: Math.ceil(notice.msLeft / 1000),
        });
  }

  destroy(): void {
    for (const line of this.#lines.values()) line.destroy();
  }
}

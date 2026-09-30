import * as Phaser from 'phaser';

import { formatQuantity } from '../../@shared/util/format-quantity';
import type { BuffNotice } from '../../game/model/round.model';
import { SPAWNERS } from '../../game/model/spawner.model';
import { ticketLabelKey } from '../../game/model/ticket.model';
import { BUFF_BANNER, HOVER_GROUND } from '../model/board.consts';
import type { SceneDeps } from '../model/scene-deps.model';

type LineId = 'acceptance' | 'buffs' | 'call';

/** Bottom up; when the board's hazard banner is up the last line gives way. */
const IDS: readonly LineId[] = ['acceptance', 'call', 'buffs'];

const CALLS = ['comboLive', 'combo', 'quarter', 'escalationHeld'] as const;
const CALL_KEYS: Readonly<Record<(typeof CALLS)[number], string>> = {
  comboLive: 'board.buff.combo.live',
  combo: 'board.buff.combo',
  quarter: 'board.buff.quarter',
  escalationHeld: 'board.buff.escalation.held',
};

type Acceptance = Extract<BuffNotice, { id: 'acceptance' }>;
type Timed = Extract<BuffNotice, { msLeft: number }>;

const multOf = (mult: number): string | number =>
  Number.isInteger(mult) ? mult : formatQuantity(mult);

const timed = (
  notices: readonly BuffNotice[],
  id: Timed['id']
): Timed | undefined =>
  notices.find((notice): notice is Timed => notice.id === id);

export class BuffBanners {
  readonly #deps: SceneDeps;
  readonly #lines = new Map<LineId, Phaser.GameObjects.Text>();
  readonly #drawn = new Map<LineId, string>();
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

  update(
    deltaMs: number,
    centreX: number,
    bottom: number,
    width: number,
    lines = IDS.length
  ): void {
    this.#clock = (this.#clock + deltaMs) % BUFF_BANNER.pulseMs;
    const wave = Math.sin((this.#clock / BUFF_BANNER.pulseMs) * Math.PI * 2);
    const scale = 1 + BUFF_BANNER.swell * wave;
    const alpha = 1 - BUFF_BANNER.fade * (0.5 - wave / 2);

    const notices = this.#deps.buffNotices();
    let y = bottom;
    let shown = 0;
    for (const id of IDS) {
      const line = this.#lines.get(id)!;
      const text = shown < lines ? this.#format(id, notices) : '';
      if (text === '') {
        if (line.visible) line.setVisible(false);
        this.#drawn.delete(id);
        continue;
      }
      if (this.#drawn.get(id) !== text) {
        this.#drawn.set(id, text);
        line.setText(text);
      }
      const pulses = id !== 'acceptance';
      const fit = Math.min(1, width / Math.max(1, line.width));
      line
        .setVisible(true)
        .setPosition(centreX, y)
        .setScale((pulses ? scale : 1) * fit)
        .setAlpha(pulses ? alpha : 1);
      y -= line.height * fit + BUFF_BANNER.gap;
      shown += 1;
    }
  }

  #format(id: LineId, notices: readonly BuffNotice[]): string {
    switch (id) {
      case 'acceptance': {
        const notice = notices.find(
          (one): one is Acceptance => one.id === 'acceptance'
        );
        return notice ? this.#acceptance(notice) : '';
      }
      case 'buffs':
        return [timed(notices, 'escalation'), timed(notices, 'hotfix')]
          .filter((notice): notice is Timed => notice !== undefined)
          .map((notice) => this.#timed(notice))
          .join('   ');
      case 'call': {
        const storm = timed(notices, 'storm');
        if (storm) return this.#timed(storm);
        const call = CALLS.find((id) => notices.some((one) => one.id === id));
        return call ? this.#deps.text(CALL_KEYS[call]) : '';
      }
    }
  }

  #timed(notice: Timed): string {
    return this.#deps.text(`board.buff.${notice.id}`, {
      mult: multOf(notice.mult),
      seconds: Math.ceil(notice.msLeft / 1000),
    });
  }

  #acceptance(notice: Acceptance): string {
    const text = this.#deps.text;
    const criterion = notice.criterion;
    const mult = multOf(notice.mult);
    if (!criterion) return text('board.buff.acceptance', { mult });
    const ticket = SPAWNERS[criterion.line]?.produces[0];
    if (!ticket) return text('board.buff.acceptance', { mult });
    return text('board.buff.criterion', {
      n: criterion.index + 1,
      of: criterion.of,
      name: text(`acceptance.criterion.${criterion.line}.label`),
      ticket: text(ticketLabelKey(ticket)).toUpperCase(),
      pct: Math.floor(criterion.done * 100),
      seconds: Math.ceil(criterion.msLeft / 1000),
      mult,
    });
  }

  destroy(): void {
    for (const line of this.#lines.values()) line.destroy();
  }
}

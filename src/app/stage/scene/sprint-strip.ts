import * as Phaser from 'phaser';

import { formatMoney } from '../../@shared/util/format-quantity';
import { TICKET_TYPES } from '../../game/model/ticket.model';
import {
  BOARD_INK,
  BOARD_TEXT,
  SPRINT_BAR_WIDTH,
  SPRINT_STRIP_HEIGHT,
} from '../model/board.consts';
import type { SceneDeps } from '../model/scene-deps.model';

const PIP_HEIGHT = 16;
const LANE_GAP = 6;
const LOCO_WIDTH = 14;
const WAGON_PITCH = 12;
const WAGON_GAP = 2;
const PORTAL_WIDTH = 8;
const TRAIN_STEPS = 1000;
const STATUS_WIDTH = 132;
const STATUS_DOT = 3;
const STATUS_TEXT_X = 12;
const PENDING_WIDTH = 112;
const MIN_BAR_WIDTH = 96;

const PAD = 18;
const BAR_X = 172;
const GAP = 18;

export class SprintStrip {
  readonly #deps: SceneDeps;
  readonly #band: Phaser.GameObjects.Rectangle;
  readonly #rule: Phaser.GameObjects.Rectangle;
  readonly #pips: Phaser.GameObjects.Graphics;
  readonly #slotsLabel: Phaser.GameObjects.Text;
  readonly #pendingLabel: Phaser.GameObjects.Text;
  readonly #cooldown: Phaser.GameObjects.Graphics;
  readonly #statusLabel: Phaser.GameObjects.Text;

  #width = 0;
  #top = 0;
  #barWidth = SPRINT_BAR_WIDTH;
  #statusX = 0;
  #remaining = 0;
  #drawnLanes = '';
  #drawnCooldown = -1;
  #drawnPending = '';
  #drawnClock = '';

  constructor(scene: Phaser.Scene, deps: SceneDeps, depth: number) {
    this.#deps = deps;

    this.#band = scene.add
      .rectangle(0, 0, 10, SPRINT_STRIP_HEIGHT, BOARD_INK.strip)
      .setOrigin(0, 0)
      .setDepth(depth);
    this.#rule = scene.add
      .rectangle(0, 0, 10, 1, BOARD_INK.stripRule)
      .setOrigin(0, 0)
      .setDepth(depth);
    this.#pips = scene.add.graphics().setDepth(depth + 1);
    this.#cooldown = scene.add.graphics().setDepth(depth + 1);

    this.#slotsLabel = this.#text(scene, depth, '11px', BOARD_TEXT.dim);
    this.#pendingLabel = this.#text(scene, depth, '20px', BOARD_TEXT.gold);
    this.#statusLabel = this.#text(scene, depth, '12px', BOARD_TEXT.body);
    this.#statusLabel.setOrigin(0, 0.5);
  }

  get dropX(): number {
    return this.#width * 0.5;
  }

  get dropY(): number {
    return this.#top + SPRINT_STRIP_HEIGHT * 0.45;
  }

  slotX(slot: number): number {
    return this.laneX(this.#deps.sprint()[slot]?.lane ?? 0);
  }

  /** The first lane that is home with room: where unfiled work is headed. */
  get nextLaneX(): number {
    const cap = this.#deps.laneCapacity();
    const lanes = this.#deps.lanes();
    const open = lanes.findIndex(
      (lane) => lane.releaseLeftMs <= 0 && lane.count < cap
    );
    return this.laneX(Math.max(0, open));
  }

  /** Screen x of a lane's bar centre. */
  laneX(lane: number): number {
    const { width } = this.#bar();
    return BAR_X + lane * (width + LANE_GAP) + width / 2;
  }

  /** The newest ticket in the lane under the pointer, for the hover. */
  slotAt(px: number, py: number): number | null {
    if (py < this.#top || py > this.#top + SPRINT_STRIP_HEIGHT) return null;

    const { lanes, width } = this.#bar();
    const step = width + LANE_GAP;
    const lane = Math.floor((px - BAR_X) / step);
    if (lane < 0 || lane >= lanes) return null;
    if (px > BAR_X + lane * step + width) return null;

    const sprint = this.#deps.sprint();
    for (let slot = sprint.length - 1; slot >= 0; slot--) {
      if (sprint[slot]?.lane === lane) return slot;
    }
    return null;
  }

  get slotY(): number {
    return this.#top + SPRINT_STRIP_HEIGHT / 2;
  }

  layout(width: number, height: number): void {
    this.#width = width;
    this.#top = height - SPRINT_STRIP_HEIGHT;

    this.#band.setPosition(0, this.#top).setSize(width, SPRINT_STRIP_HEIGHT);
    this.#rule.setPosition(0, this.#top).setSize(width, 1);
    this.#statusX = width - PAD - STATUS_WIDTH;
    this.#barWidth = Math.max(
      MIN_BAR_WIDTH,
      Math.min(
        SPRINT_BAR_WIDTH,
        this.#statusX - GAP - PENDING_WIDTH - GAP - BAR_X
      )
    );
    this.#slotsLabel.setPosition(PAD, this.#top + 17);
    this.#pendingLabel.setPosition(
      BAR_X + this.#barWidth + GAP,
      this.#top + 11
    );
    this.#statusLabel.setPosition(
      this.#statusX + STATUS_TEXT_X,
      this.#top + SPRINT_STRIP_HEIGHT / 2 - 2
    );

    this.#drawnLanes = '';
    this.#drawnClock = '';
    this.#drawnCooldown = -1;
  }

  update(): void {
    this.#remaining = this.#deps.roundLeftMs();

    this.#refreshSlots();
    this.#refreshPending();
    this.#refreshClock();
    this.#drawCooldown();
  }

  destroy(): void {
    for (const object of [
      this.#band,
      this.#rule,
      this.#pips,
      this.#cooldown,
      this.#slotsLabel,
      this.#pendingLabel,
      this.#statusLabel,
    ]) {
      object.destroy();
    }
  }

  #text(
    scene: Phaser.Scene,
    depth: number,
    size: string,
    colour: string
  ): Phaser.GameObjects.Text {
    return scene.add
      .text(0, 0, '', {
        fontFamily: 'monospace',
        fontSize: size,
        color: colour,
      })
      .setDepth(depth + 1);
  }

  #bar(): { lanes: number; width: number } {
    const lanes = Math.max(1, this.#deps.lanes().length);
    return {
      lanes,
      width: (this.#barWidth - (lanes - 1) * LANE_GAP) / lanes,
    };
  }

  /** One box per swimlane; a lane that is away shows its train crossing it. */
  #refreshSlots(): void {
    const lanes = this.#deps.lanes();
    const cap = this.#deps.laneCapacity();
    const haul = Math.max(1, this.#deps.haulMs());
    const drawn = lanes
      .map((lane) =>
        lane.releaseLeftMs > 0
          ? `r${Math.round((lane.releaseLeftMs / haul) * TRAIN_STEPS)}`
          : `${lane.count}`
      )
      .join(',');
    const key = `${cap}|${this.#deps.tier()}|${drawn}`;
    if (key === this.#drawnLanes) return;
    this.#drawnLanes = key;

    const filled = this.#deps.filled();
    const slots = this.#deps.slots();
    this.#slotsLabel.setText(`${lanes.length} × ${cap}   ${filled} / ${slots}`);
    this.#pips.clear();

    const { width } = this.#bar();
    const y = this.#top + (SPRINT_STRIP_HEIGHT - PIP_HEIGHT) / 2;
    const sprint = this.#deps.sprint();
    const newest = new Map<number, number>();
    for (const slot of sprint) {
      newest.set(slot.lane, TICKET_TYPES[slot.type].colour);
    }

    for (const [index, lane] of lanes.entries()) {
      const x = BAR_X + index * (width + LANE_GAP);
      const away = lane.releaseLeftMs > 0;
      this.#pips.fillStyle(away ? BOARD_INK.laneAway : BOARD_INK.pipEmpty, 1);
      this.#pips.fillRect(x, y, width, PIP_HEIGHT);

      if (away) {
        this.#drawTrain(x, y, width, 1 - lane.releaseLeftMs / haul);
        continue;
      }
      const part = cap <= 0 ? 0 : Math.min(1, lane.count / cap);
      if (part <= 0) continue;
      this.#pips.fillStyle(newest.get(index) ?? BOARD_INK.pipFull, 1);
      this.#pips.fillRect(
        x,
        y + PIP_HEIGHT * (1 - part),
        width,
        PIP_HEIGHT * part
      );
    }
  }

  /** The release train: out of the left tunnel, one wagon per tier, into the right. */
  #drawTrain(x: number, y: number, width: number, progress: number): void {
    const wagons = this.#deps.tier() + 1;
    const length = wagons * WAGON_PITCH + LOCO_WIDTH;
    const from = x + PORTAL_WIDTH;
    const to = x + width - PORTAL_WIDTH;
    const run = Math.min(1, Math.max(0, progress));
    const left = from - length + (to - from + length) * run;
    const loco = left + wagons * WAGON_PITCH;
    const body = WAGON_PITCH - WAGON_GAP;
    const top = y + 3;
    const g = this.#pips;
    const rect = (rx: number, ry: number, rw: number, rh: number): void => {
      const a = Math.max(rx, from);
      const b = Math.min(rx + rw, to);
      if (b > a) g.fillRect(a, ry, b - a, rh);
    };

    g.fillStyle(BOARD_INK.stripRule, 1);
    g.fillRect(from, top + 12, to - from, 1);

    g.fillStyle(BOARD_INK.gold, 1);
    for (let n = 0; n < wagons; n++)
      rect(left + n * WAGON_PITCH, top + 2, body, 7);
    g.fillStyle(BOARD_INK.train, 1);
    rect(loco, top, LOCO_WIDTH, 9);
    rect(loco + 10, top - 3, 3, 3);
    g.fillStyle(BOARD_INK.trainWindow, 1);
    rect(loco + 2, top + 2, 4, 3);

    g.fillStyle(BOARD_INK.strip, 1);
    for (let n = 0; n < wagons; n++) {
      rect(left + n * WAGON_PITCH + 2, top + 9, 3, 3);
      rect(left + n * WAGON_PITCH + body - 3, top + 9, 3, 3);
    }
    for (const wheel of [3, 10]) rect(loco + wheel, top + 9, 3, 3);

    this.#drawPortal(x, y);
    this.#drawPortal(to, y);
  }

  #drawPortal(x: number, y: number): void {
    const g = this.#pips;
    g.fillStyle(BOARD_INK.tunnelFrame, 1);
    g.fillRect(x, y - 4, PORTAL_WIDTH, PIP_HEIGHT + 4);
    g.fillStyle(BOARD_INK.tunnel, 1);
    g.fillRect(x + 2, y, PORTAL_WIDTH - 4, PIP_HEIGHT);
    g.fillRect(x + 3, y - 1, PORTAL_WIDTH - 6, 1);
  }

  #refreshPending(): void {
    const pending = formatMoney(this.#deps.pending());
    if (pending === this.#drawnPending) return;
    this.#drawnPending = pending;
    this.#pendingLabel.setText(pending);
  }

  #refreshClock(): void {
    const running = this.#deps.running();
    const label = running
      ? this.#deps.text('strip.collecting')
      : this.#deps.text('strip.releasing', {
          seconds: Math.ceil(this.#remaining / 1000),
        });
    if (label === this.#drawnClock) return;
    this.#drawnClock = label;
    this.#statusLabel
      .setText(label)
      .setColor(running ? BOARD_TEXT.body : BOARD_TEXT.gold);
  }

  /** Status dot, and while every train is away the time until the first is back. */
  #drawCooldown(): void {
    const length = this.#deps.haulMs();
    const away = this.#remaining > 0;
    const part = away && length > 0 ? this.#remaining / length : 0;
    const drawn = away ? Math.round(part * 200) : -2;
    if (drawn === this.#drawnCooldown) return;
    this.#drawnCooldown = drawn;

    const g = this.#cooldown;
    const y = this.#statusLabel.y;
    g.clear();
    g.fillStyle(away ? BOARD_INK.gold : BOARD_INK.pipFull, 1);
    g.fillCircle(this.#statusX + STATUS_DOT, y, STATUS_DOT);
    if (!away) return;
    const track = STATUS_WIDTH - STATUS_TEXT_X;
    g.fillStyle(BOARD_INK.stripRule, 1);
    g.fillRect(this.#statusX + STATUS_TEXT_X, y + 11, track, 2);
    g.fillStyle(BOARD_INK.gold, 0.9);
    g.fillRect(this.#statusX + STATUS_TEXT_X, y + 11, track * part, 2);
  }
}

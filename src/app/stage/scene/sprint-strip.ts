import * as Phaser from 'phaser';

import {
  formatMoney,
  formatQuantity,
} from '../../@shared/util/format-quantity';
import { ticketLabelKey, TICKET_TYPES } from '../../game/model/ticket.model';
import {
  BOARD_INK,
  BOARD_TEXT,
  SPRINT_BAR_WIDTH,
  SPRINT_STRIP_HEIGHT,
} from '../model/board.consts';
import type { SceneDeps } from '../model/scene-deps.model';

const PIP_HEIGHT = 16;
const LANE_GAP = 6;
const TRAIN_WIDTH = 26;
const CLOCK_WIDTH = 148;
const CLOCK_HEIGHT = 28;

const PAD = 18;
const BAR_X = 172;
const PENDING_X = BAR_X + SPRINT_BAR_WIDTH + 20;
const CLOCK_GAP = 14;

export class SprintStrip {
  readonly #deps: SceneDeps;
  readonly #band: Phaser.GameObjects.Rectangle;
  readonly #rule: Phaser.GameObjects.Rectangle;
  readonly #pips: Phaser.GameObjects.Graphics;
  readonly #slotsLabel: Phaser.GameObjects.Text;
  readonly #pendingLabel: Phaser.GameObjects.Text;
  readonly #escalationLabel: Phaser.GameObjects.Text;
  readonly #escalationName: string;
  #drawnEscalation = '';
  readonly #cooldown: Phaser.GameObjects.Graphics;
  readonly #clock: Phaser.GameObjects.Rectangle;
  readonly #clockLabel: Phaser.GameObjects.Text;

  #width = 0;
  #top = 0;
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
    this.#pendingLabel = this.#text(scene, depth, '20px', BOARD_TEXT.bright);
    this.#escalationLabel = this.#text(scene, depth, '12px', BOARD_TEXT.gold);
    this.#escalationLabel.setOrigin(1, 0);
    this.#escalationName = deps
      .text(ticketLabelKey('escalation'))
      .toUpperCase();

    this.#clock = scene.add
      .rectangle(0, 0, CLOCK_WIDTH, CLOCK_HEIGHT, BOARD_INK.buttonIdle)
      .setDepth(depth + 1);
    this.#clockLabel = this.#text(scene, depth + 2, '12px', BOARD_TEXT.bright);
    this.#clockLabel.setOrigin(0.5);
  }

  get dropX(): number {
    return this.#width * 0.5;
  }

  get dropY(): number {
    return this.#top + SPRINT_STRIP_HEIGHT * 0.45;
  }

  slotX(slot: number): number {
    const lane = this.#deps.sprint()[slot]?.lane ?? 0;
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
    this.#slotsLabel.setPosition(PAD, this.#top + 17);
    this.#pendingLabel.setPosition(PENDING_X, this.#top + 11);
    this.#escalationLabel.setPosition(
      width - CLOCK_WIDTH - PAD - CLOCK_GAP,
      this.#top + 16
    );
    this.#clock.setPosition(
      width - CLOCK_WIDTH / 2 - PAD,
      this.#top + SPRINT_STRIP_HEIGHT / 2 - 4
    );
    this.#clockLabel.setPosition(this.#clock.x, this.#clock.y);

    this.#drawnLanes = '';
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
      this.#escalationLabel,
      this.#clock,
      this.#clockLabel,
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
      width: (SPRINT_BAR_WIDTH - (lanes - 1) * LANE_GAP) / lanes,
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
          ? `r${Math.round((lane.releaseLeftMs / haul) * 60)}`
          : `${lane.count}`
      )
      .join(',');
    const key = `${cap}|${drawn}`;
    if (key === this.#drawnLanes) return;
    this.#drawnLanes = key;

    const filled = this.#deps.filled();
    const slots = this.#deps.slots();
    this.#slotsLabel.setText(
      `${lanes.length} × WIP ${cap}   ${filled} / ${slots}`
    );
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

  /** The release train: it pulls the lane's work off to the right, then is gone. */
  #drawTrain(x: number, y: number, width: number, progress: number): void {
    const span = Math.max(0, width - TRAIN_WIDTH);
    const left = x + span * Math.min(1, Math.max(0, progress));
    const top = y + 3;
    const g = this.#pips;
    g.fillStyle(BOARD_INK.gold, 1);
    g.fillRect(left, top + 2, 10, 7);
    g.fillStyle(BOARD_INK.train, 1);
    g.fillRect(left + 12, top, 14, 9);
    g.fillRect(left + 22, top - 3, 3, 3);
    g.fillStyle(BOARD_INK.trainWindow, 1);
    g.fillRect(left + 14, top + 2, 4, 3);
    g.fillStyle(BOARD_INK.strip, 1);
    for (const wheel of [2, 7, 15, 22]) g.fillRect(left + wheel, top + 9, 3, 3);
  }

  #refreshPending(): void {
    const pending = formatMoney(this.#deps.pending());
    if (pending !== this.#drawnPending) {
      this.#drawnPending = pending;
      this.#pendingLabel.setText(pending);
    }
    this.#escalationLabel.setVisible(this.#deps.escalated());

    const escalation = `×${formatQuantity(this.#deps.escalationMultiplier())} ${this.#escalationName}`;
    if (escalation !== this.#drawnEscalation) {
      this.#drawnEscalation = escalation;
      this.#escalationLabel.setText(escalation);
    }
  }

  #refreshClock(): void {
    const label = this.#deps.running()
      ? this.#deps.text('strip.collecting')
      : this.#deps.text('strip.releasing', {
          seconds: Math.ceil(this.#remaining / 1000),
        });
    if (label === this.#drawnClock) return;
    this.#drawnClock = label;
    this.#clockLabel.setText(label);
  }

  #drawCooldown(): void {
    const length = this.#deps.haulMs();
    const width = CLOCK_WIDTH * (length > 0 ? this.#remaining / length : 0);
    const drawn = Math.round(width);
    if (drawn === this.#drawnCooldown) return;
    this.#drawnCooldown = drawn;
    this.#cooldown.clear();
    this.#cooldown.fillStyle(BOARD_INK.gold, this.#remaining > 0 ? 0.9 : 0.25);
    this.#cooldown.fillRect(
      this.#clock.x - CLOCK_WIDTH / 2,
      this.#clock.y + CLOCK_HEIGHT / 2 + 5,
      Math.max(2, width),
      3
    );
  }
}

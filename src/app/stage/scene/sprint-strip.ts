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
  SPRINT_PIP_LIMIT,
  SPRINT_STRIP_HEIGHT,
} from '../model/board.consts';
import type { SceneDeps } from '../model/scene-deps.model';

function clockLabel(leftMs: number, collecting: boolean): string {
  if (collecting) return 'COLLECTING';
  return `TRUCK ${Math.ceil(leftMs / 1000)}s`;
}

const PIP_HEIGHT = 16;
const PIP_GAP = 3;
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
  #drawnFilled = -1;
  #drawnCooldown = -1;
  #drawnSlots = -1;
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
    const { slots, segments, width } = this.#bar();
    const segment = Math.min(
      segments - 1,
      Math.floor((slot * segments) / slots)
    );
    return BAR_X + segment * (width + PIP_GAP) + width / 2;
  }

  slotAt(px: number, py: number): number | null {
    if (py < this.#top || py > this.#top + SPRINT_STRIP_HEIGHT) return null;

    const { slots, segments, width } = this.#bar();
    const step = width + PIP_GAP;
    const segment = Math.floor((px - BAR_X) / step);
    if (segment < 0 || segment >= segments) return null;
    if (px > BAR_X + segment * step + width) return null;
    if ((this.#deps.filled() / slots) * segments - segment <= 0) return null;

    return Math.floor((segment * slots) / segments);
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

    this.#drawnFilled = -1;
    this.#drawnSlots = -1;
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

  #bar(): { slots: number; segments: number; width: number } {
    const slots = Math.max(1, this.#deps.slots());
    const segments = Math.max(1, Math.min(slots, SPRINT_PIP_LIMIT));
    return {
      slots,
      segments,
      width: (SPRINT_BAR_WIDTH - (segments - 1) * PIP_GAP) / segments,
    };
  }

  #refreshSlots(): void {
    const filled = this.#deps.filled();
    const slots = this.#deps.slots();
    if (filled === this.#drawnFilled && slots === this.#drawnSlots) return;
    this.#drawnFilled = filled;
    this.#drawnSlots = slots;

    this.#slotsLabel.setText(`SPRINT  ${filled} / ${slots} slots`);
    this.#pips.clear();

    const { segments, width } = this.#bar();
    const full = slots === 0 ? 0 : (filled / slots) * segments;
    const y = this.#top + (SPRINT_STRIP_HEIGHT - PIP_HEIGHT) / 2;
    const sprint = this.#deps.sprint();

    for (let segment = 0; segment < segments; segment++) {
      const x = BAR_X + segment * (width + PIP_GAP);
      this.#pips.fillStyle(BOARD_INK.pipEmpty, 1);
      this.#pips.fillRect(x, y, width, PIP_HEIGHT);

      const part = Math.max(0, Math.min(1, full - segment));
      if (part <= 0) continue;
      const slot = Math.floor((segment * slots) / segments);
      const held = sprint[slot];
      this.#pips.fillStyle(
        held ? TICKET_TYPES[held.type].colour : BOARD_INK.pipFull,
        1
      );
      this.#pips.fillRect(x, y, width * part, PIP_HEIGHT);
    }
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
    const label = clockLabel(this.#remaining, this.#deps.running());
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

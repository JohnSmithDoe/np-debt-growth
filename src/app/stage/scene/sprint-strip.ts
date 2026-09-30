/*
 * The ghost train sheet engine faces left; the mirrored blit in #trainOf is deliberate.
 */
import * as Phaser from 'phaser';

import { formatCompactMoney } from '../../@shared/util/format-quantity';
import { TICKET_TYPES } from '../../game/model/ticket.model';
import {
  BOARD_INK,
  BOARD_TEXT,
  GHOST_TRAIN,
  SPRINT_BAR_WIDTH,
  SPRINT_STRIP_HEIGHT,
} from '../model/board.consts';
import type { SceneDeps } from '../model/scene-deps.model';

const PIP_HEIGHT = 16;
const BAR_TOP = (SPRINT_STRIP_HEIGHT - PIP_HEIGHT) / 2;
const PORTAL_WIDTH = 8;
const PORTAL_HEIGHT = GHOST_TRAIN.loco.frame.height + 2;
const TRAIN_STEPS = 1000;
const STATUS_WIDTH = 132;
const STATUS_DOT = 3;
const STATUS_TEXT_X = 12;
const PENDING_WIDTH = 112;
const MIN_BAR_WIDTH = 96;
const SEGMENT = { max: 10, min: 8, gap: 2 } as const;

const PAD = 18;
const BAR_MIN_X = 172;
const GAP = 18;

export class SprintStrip {
  static preload(scene: Phaser.Scene): void {
    for (const part of [GHOST_TRAIN.loco, GHOST_TRAIN.car]) {
      scene.load.image(part.key, part.url);
    }
  }

  readonly #scene: Phaser.Scene;
  readonly #depth: number;
  readonly #deps: SceneDeps;
  #train?: Phaser.GameObjects.Image;
  readonly #band: Phaser.GameObjects.Rectangle;
  readonly #rule: Phaser.GameObjects.Rectangle;
  readonly #pips: Phaser.GameObjects.Graphics;
  readonly #slotsLabel: Phaser.GameObjects.Text;
  readonly #pendingLabel: Phaser.GameObjects.Text;
  readonly #cooldown: Phaser.GameObjects.Graphics;
  readonly #statusLabel: Phaser.GameObjects.Text;

  #top = 0;
  #barX = BAR_MIN_X;
  #barWidth = SPRINT_BAR_WIDTH;
  #statusX = 0;
  #remaining = 0;
  #haul = 0;
  #drawnSlots = -1;
  #drawnTier = -1;
  #drawnFilled = -1;
  #drawnTrain = -2;
  #drawnCooldown = -1;
  #drawnPending = '';
  #drawnClock = '';
  #gated = true;

  constructor(scene: Phaser.Scene, deps: SceneDeps, depth: number) {
    this.#scene = scene;
    this.#depth = depth;
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

  get dropY(): number {
    return this.#top + BAR_TOP + PIP_HEIGHT / 2;
  }

  get barX(): number {
    return this.#barX + this.#barWidth / 2;
  }

  slotAt(px: number, py: number): number | null {
    if (py < this.#top || py > this.#top + SPRINT_STRIP_HEIGHT) return null;
    if (px < this.#barX || px > this.#barX + this.#barWidth) return null;
    const held = this.#deps.sprint().length;
    return held > 0 ? held - 1 : null;
  }

  get slotY(): number {
    return this.#top + BAR_TOP + PIP_HEIGHT / 2;
  }

  layout(width: number, height: number): void {
    this.#top = height - SPRINT_STRIP_HEIGHT;

    this.#band.setPosition(0, this.#top).setSize(width, SPRINT_STRIP_HEIGHT);
    this.#rule.setPosition(0, this.#top).setSize(width, 1);
    this.#statusX = width - PAD - STATUS_WIDTH;
    const centre = width / 2;
    const half = Math.min(
      SPRINT_BAR_WIDTH / 2,
      centre - BAR_MIN_X,
      this.#statusX - GAP - PENDING_WIDTH - GAP - centre
    );
    this.#barWidth = Math.max(MIN_BAR_WIDTH, half * 2);
    this.#barX = Math.round(centre - this.#barWidth / 2);
    this.#slotsLabel.setPosition(PAD, this.#top + 17);
    this.#pendingLabel.setPosition(
      this.#barX + this.#barWidth + GAP,
      this.#top + 11
    );
    this.#statusLabel.setPosition(
      this.#statusX + STATUS_TEXT_X,
      this.#top + SPRINT_STRIP_HEIGHT / 2 - 2
    );

    this.#drawnSlots = -1;
    this.#drawnClock = '';
    this.#drawnCooldown = -1;
  }

  update(): void {
    this.#remaining = this.#deps.roundLeftMs();
    this.#haul = this.#deps.haulMs();

    const gated = this.#deps.trainRuns();
    if (gated !== this.#gated) this.#gate(gated);
    if (gated) {
      this.#refreshSlots();
      this.#refreshPending();
    }
    this.#refreshClock();
    this.#drawCooldown();
  }

  #gate(gated: boolean): void {
    this.#gated = gated;
    this.#pips.setVisible(gated);
    this.#slotsLabel.setVisible(gated);
    this.#pendingLabel.setVisible(gated);
    if (!gated) this.#parkTrain();
    this.#drawnSlots = -1;
    this.#drawnClock = '';
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
      ...(this.#train ? [this.#train] : []),
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

  #refreshSlots(): void {
    const haul = Math.max(1, this.#haul);
    const filled = this.#deps.filled();
    const slots = this.#deps.slots();
    const away = this.#remaining > 0;
    const train = away
      ? Math.round((this.#remaining / haul) * TRAIN_STEPS)
      : -1;
    const tier = this.#deps.tier();
    if (
      slots === this.#drawnSlots &&
      tier === this.#drawnTier &&
      filled === this.#drawnFilled &&
      train === this.#drawnTrain
    ) {
      return;
    }
    this.#drawnSlots = slots;
    this.#drawnTier = tier;
    this.#drawnFilled = filled;
    this.#drawnTrain = train;

    this.#slotsLabel.setText(`${filled} / ${slots}`);
    this.#pips.clear();

    const width = this.#barWidth;
    const newest = this.#deps.sprint().at(-1);
    this.#drawSegments(
      this.#barX,
      this.#top + BAR_TOP,
      width,
      slots <= 0 ? 0 : Math.min(1, filled / slots),
      newest ? TICKET_TYPES[newest.type].colour : BOARD_INK.pipFull
    );
    if (away) {
      this.#drawTrain(this.#barX, this.#top, width, 1 - this.#remaining / haul);
    } else {
      this.#parkTrain();
    }
  }

  #drawSegments(
    x: number,
    y: number,
    width: number,
    part: number,
    colour: number
  ): void {
    const count = Math.max(
      1,
      Math.min(
        SEGMENT.max,
        Math.floor((width + SEGMENT.gap) / (SEGMENT.min + SEGMENT.gap))
      )
    );
    const each = (width - (count - 1) * SEGMENT.gap) / count;
    for (let at = 0; at < count; at++) {
      const left = x + at * (each + SEGMENT.gap);
      this.#pips.fillStyle(BOARD_INK.pipEmpty, 1);
      this.#pips.fillRect(left, y, each, PIP_HEIGHT);
      const fill = Math.min(1, Math.max(0, part * count - at));
      if (fill <= 0) continue;
      this.#pips.fillStyle(colour, 1);
      this.#pips.fillRect(left, y, each * fill, PIP_HEIGHT);
    }
  }

  #drawTrain(x: number, rail: number, width: number, progress: number): void {
    const cars = this.#deps.tier() + 1;
    const pitch = GHOST_TRAIN.car.frame.width + GHOST_TRAIN.gap;
    const length = cars * pitch + GHOST_TRAIN.loco.frame.width;
    const from = x + PORTAL_WIDTH;
    const to = x + width - PORTAL_WIDTH;
    const run = Math.min(1, Math.max(0, progress));
    const left = from - length + (to - from + length) * run;

    this.#pips.fillStyle(BOARD_INK.stripRule, 1);
    this.#pips.fillRect(from, rail, to - from, 1);

    const train = this.#trainOf(cars);
    const a = Math.max(left, from);
    const b = Math.min(left + length, to);
    if (b > a) {
      train
        .setPosition(Math.round(left), rail)
        .setCrop(a - left, 0, b - a, train.height)
        .setVisible(true);
    } else {
      train.setVisible(false);
    }

    this.#drawPortal(x, rail);
    this.#drawPortal(to, rail);
  }

  #parkTrain(): void {
    this.#train?.setVisible(false);
  }

  #trainOf(cars: number): Phaser.GameObjects.Image {
    const key = `${GHOST_TRAIN.loco.key}-${cars}`;
    if (!this.#scene.textures.exists(key)) this.#composeTrain(key, cars);
    this.#train ??= this.#scene.add
      .image(0, 0, key)
      .setOrigin(0, 1)
      .setDepth(this.#depth + 1);
    if (this.#train.texture.key !== key) this.#train.setTexture(key);
    return this.#train;
  }

  #composeTrain(key: string, cars: number): void {
    const { loco, car, gap } = GHOST_TRAIN;
    const pitch = car.frame.width + gap;
    const height = Math.max(loco.frame.height, car.frame.height);
    const canvas = this.#scene.textures.createCanvas(
      key,
      cars * pitch + loco.frame.width,
      height
    );
    if (!canvas) return;
    const ctx = canvas.getContext();
    const sheet = (art: typeof loco | typeof car): CanvasImageSource =>
      this.#scene.textures.get(art.key).getSourceImage() as CanvasImageSource;
    const blit = (art: typeof loco | typeof car, x: number): void => {
      const f = art.frame;
      ctx.drawImage(
        sheet(art),
        f.x,
        f.y,
        f.width,
        f.height,
        x,
        height - f.height,
        f.width,
        f.height
      );
    };
    for (let n = 0; n < cars; n++) blit(car, n * pitch);
    ctx.save();
    ctx.translate(cars * pitch + loco.frame.width, 0);
    ctx.scale(-1, 1);
    blit(loco, 0);
    ctx.restore();
    canvas.refresh();
  }

  #drawPortal(x: number, rail: number): void {
    const g = this.#pips;
    const top = rail - PORTAL_HEIGHT;
    g.fillStyle(BOARD_INK.tunnelFrame, 1);
    g.fillRect(x, top - 2, PORTAL_WIDTH, PORTAL_HEIGHT + 3);
    g.fillStyle(BOARD_INK.tunnel, 1);
    g.fillRect(x + 2, top, PORTAL_WIDTH - 4, PORTAL_HEIGHT + 1);
  }

  #refreshPending(): void {
    const pending = formatCompactMoney(this.#deps.pending());
    if (pending === this.#drawnPending) return;
    this.#drawnPending = pending;
    this.#pendingLabel.setText(pending);
  }

  #refreshClock(): void {
    const running = this.#deps.running();
    const label = this.#deps.text(
      !this.#gated
        ? 'strip.shipping'
        : running
          ? 'strip.collecting'
          : 'strip.releasing'
    );
    if (label === this.#drawnClock) return;
    this.#drawnClock = label;
    this.#statusLabel
      .setText(label)
      .setColor(this.#remaining > 0 ? BOARD_TEXT.gold : BOARD_TEXT.body);
  }

  #drawCooldown(): void {
    const length = this.#haul;
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

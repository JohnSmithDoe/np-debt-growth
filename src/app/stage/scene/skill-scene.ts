import * as Phaser from 'phaser';

import {
  formatCompactWhole,
  formatWhole,
} from '../../@shared/util/format-quantity';
import { SCREEN_INK } from '../model/board.consts';
import type { HitRect } from '../model/hit-rect.model';
import type { SceneDeps } from '../model/scene-deps.model';
import type { SkillNodeView, SkillView } from '../model/skill-view.model';
import { IconPool } from '../util/icon-pool';
import { LabelPool } from '../util/label-pool';
import { GLYPH_CELL, GLYPH_SIZE, PIXEL_FONT } from '../util/pixel-font';
import {
  SKILL_ICON_FILES,
  SKILL_ICON_SIZE,
  skillIconKey,
  skillIconOf,
  skillIconUrl,
} from '../model/skill-icon.model';
import { SKILL_ROOT_ID } from '../../game/model/skill.model';
import { skillBadge, skillCode } from '../util/skill-copy';
import type { SkillSquare, SquareState } from '../util/skill-layout';
import {
  revealSquares,
  SKILL_GRAPH,
  skillSquare,
  SQUARE,
  squareAt,
} from '../util/skill-layout';
import { PanZoomScene } from './pan-zoom-scene';

const CODE_SCALE = 2;
const ICON_BOX = SKILL_ICON_SIZE;
const ICON_ALPHA: Readonly<Record<SquareState, number>> = {
  owned: 1,
  open: 0.55,
  box: 0.2,
};
const ICON_CY = 21;
const CODE_TOP = 7;
const PIP = { top: 38, height: 4, width: 8, gap: 3, perRow: 5 } as const;
const PIP_ROWS = { top: 37, height: 3, gap: 1 } as const;
const BAND = { scale: 2 } as const;
const BADGE = { inset: 2 } as const;

const PAD = 128;
const STROKE = 4;
const HOVER_STROKE = 6;
const PRICE_TOP = SQUARE - STROKE - GLYPH_CELL;
const PRICE_ROOM = SQUARE - STROKE * 2;
const WASH = 0.18;
const grow = (square: HitRect): number => square.width / SQUARE;

const TIP = {
  width: 250,
  pad: 8,
  leading: 14,
  offset: 10,
  minGlyphPx: 13,
} as const;

const PULSE = {
  depth: 2.5,
  gap: 3,
  width: 3,
  periodMs: 1400,
  low: 0.15,
  high: 0.9,
} as const;
const WIRE = { width: 2, lit: 3, glow: 9, glowAlpha: 0.18 } as const;
const FIT_MARGIN = 96;

const HOVER_DEPTH = 2.2;
const TIP_DEPTH = 30;
const TEXT_DEPTH = 31;

const INK = {
  code: 0xe6e9ef,
  codeDim: 0x8d97a6,
  effect: 0xc9d0dc,
  blurb: 0xaab3c2,
  band: 0x8d97a6,
  box: 0x3d4450,
} as const;

const CODE_INK: Readonly<Record<SquareState, number>> = {
  owned: INK.code,
  open: INK.codeDim,
  box: INK.box,
};

const FILL: Readonly<Record<SquareState, number>> = {
  owned: SCREEN_INK.panel,
  open: SCREEN_INK.locked,
  box: SCREEN_INK.ground,
};

const WASH_FILL: Readonly<Record<'owned' | 'open', number>> = {
  owned: mix(FILL.owned, SCREEN_INK.points, WASH),
  open: mix(FILL.open, SCREEN_INK.points, WASH),
};

export class SkillScene extends PanZoomScene {
  static readonly KEY = 'skills';

  #wires?: Phaser.GameObjects.Graphics;
  #frames?: Phaser.GameObjects.Graphics;
  #pulse?: Phaser.GameObjects.Graphics;
  #buyable: readonly SkillSquare[] = [];
  #icons?: IconPool;
  #hoverFrame?: Phaser.GameObjects.Graphics;
  #tipPanel?: Phaser.GameObjects.Graphics;
  #tipText?: LabelPool;

  #drawn?: SkillView;
  #byId: ReadonlyMap<string, SkillNodeView> = new Map();
  #shown: ReadonlyMap<string, SquareState> = new Map();
  #glyph = 7;

  constructor(deps: SceneDeps) {
    super(SkillScene.KEY, deps);
  }

  protected get content(): { readonly width: number; readonly height: number } {
    return SKILL_GRAPH;
  }

  preload(): void {
    for (const icon of SKILL_ICON_FILES) {
      this.load.image(skillIconKey(icon), skillIconUrl(icon));
    }
  }

  create(): void {
    this.sharpen(false);
    this.frame();
    this.#measureGlyph();

    this.#wires = this.add.graphics().setDepth(1);
    this.#frames = this.add.graphics().setDepth(2);
    this.#pulse = this.add.graphics().setDepth(PULSE.depth);
    this.#icons = new IconPool(this, 3);
    this.#hoverFrame = this.add.graphics().setDepth(HOVER_DEPTH);
    this.#tipPanel = this.add.graphics().setDepth(TIP_DEPTH);
    this.#tipText = new LabelPool(this, TEXT_DEPTH);

    this.#take(this.deps.skillView());
    this.reframe();
    this.#openOnBuyable();
    this.redraw();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.#teardown());
  }

  override update(time: number): void {
    const view = this.deps.skillView();
    if (view !== this.#drawn) {
      this.#take(view);
      this.reframe();
      this.redraw();
    }
    this.#drawPulse(time);
  }

  #take(view: SkillView): void {
    this.#drawn = view;
    const byId = new Map(view.nodes.map((node) => [node.id, node]));
    this.#byId = byId;
    this.#shown = revealSquares(
      (id) => byId.get(id)?.rank ?? 0,
      (id) => byId.get(id)?.available ?? true
    );
    const buyable = new Set(
      view.nodes.filter((node) => node.buyable).map((node) => node.id)
    );
    this.#buyable = SKILL_GRAPH.squares.filter(
      (square) => buyable.has(square.id) && this.#shown.get(square.id) !== 'box'
    );
  }

  #drawPulse(time: number): void {
    const pulse = this.#pulse;
    if (!pulse) return;
    pulse.clear();
    if (this.#buyable.length === 0) return;
    const wave = (1 + Math.sin((time / PULSE.periodMs) * Math.PI * 2)) / 2;
    const alpha = PULSE.low + (PULSE.high - PULSE.low) * wave;
    const out = PULSE.gap + PULSE.width / 2;
    pulse.lineStyle(PULSE.width, SCREEN_INK.ready, alpha);
    for (const square of this.#buyable) {
      pulse.strokeRect(
        square.x - out,
        square.y - out,
        square.width + out * 2,
        square.height + out * 2
      );
    }
  }

  #openOnBuyable(): void {
    const squares = this.#buyable;
    if (squares.length === 0) return this.#centreOnRoot();
    const left = Math.min(...squares.map((square) => square.x));
    const top = Math.min(...squares.map((square) => square.y));
    const right = Math.max(...squares.map((square) => square.x + square.width));
    const bottom = Math.max(
      ...squares.map((square) => square.y + square.height)
    );
    this.fitTo(
      {
        id: 'buyable',
        x: left,
        y: top,
        width: right - left,
        height: bottom - top,
      },
      FIT_MARGIN
    );
  }

  protected override reframe(): void {
    const root = skillSquare(SKILL_ROOT_ID);
    if (!root) return;
    const centre = { x: root.x + root.width / 2, y: root.y + root.height / 2 };
    const shown = [
      root,
      ...SKILL_GRAPH.squares.filter((square) => this.#shown.has(square.id)),
    ];

    const reach = (pick: (rect: HitRect) => number): number =>
      Math.max(...shown.map(pick));
    const half = {
      x: Math.max(
        reach((rect) => Math.abs(rect.x - centre.x)),
        reach((rect) => Math.abs(rect.x + rect.width - centre.x))
      ),
      y: Math.max(
        reach((rect) => Math.abs(rect.y - centre.y)),
        reach((rect) => Math.abs(rect.y + rect.height - centre.y))
      ),
    };

    const width = Math.max((half.x + PAD) * 2, this.viewWidth);
    const height = Math.max((half.y + PAD) * 2, this.viewHeight);
    this.cameras.main.setBounds(
      centre.x - width / 2,
      centre.y - height / 2,
      width,
      height
    );
  }

  #centreOnRoot(): void {
    this.#centreOn(skillSquare(SKILL_ROOT_ID));
  }

  #centreOn(square: HitRect | undefined): void {
    if (!square) return;
    const camera = this.cameras.main;
    camera.setScroll(
      square.x + square.width / 2 - camera.width / 2,
      square.y + square.height / 2 - camera.height / 2
    );
  }

  #measureGlyph(): void {
    const probe = this.add.bitmapText(0, 0, PIXEL_FONT, 'M'.repeat(20));
    this.#glyph = probe.width / 20;
    probe.destroy();
  }

  protected redraw(): void {
    const view = this.#drawn;
    const frames = this.#frames;
    const wires = this.#wires;
    if (!view || !frames || !wires) return;

    const byId = this.#byId;
    frames.clear();
    wires.clear();
    this.#icons?.release();
    this.releaseLabels();

    for (const lit of [false, true]) {
      for (const square of SKILL_GRAPH.squares) {
        const state = this.#shown.get(square.id);
        const node = byId.get(square.id);
        if (state === undefined || !node) continue;
        this.#drawWire(wires, square, state, node, lit);
        if (!lit) this.#drawSquare(frames, square, node, state);
      }
    }

    this.#drawBands(view);
    this.redrawHover();
  }

  protected redrawHover(): void {
    this.#drawHoverFrame();
    this.#drawTip(this.#byId);
  }

  #drawHoverFrame(): void {
    const layer = this.#hoverFrame;
    if (!layer) return;
    layer.clear();
    const id = this.hovered;
    if (id === null) return;
    const square = skillSquare(id);
    const state = this.#shown.get(id);
    const node = this.#byId.get(id);
    if (!square || state === undefined || !node) return;
    this.#frame(layer, square, this.#edgeColour(node, state), HOVER_STROKE);
  }

  #drawWire(
    wires: Phaser.GameObjects.Graphics,
    square: SkillSquare,
    state: SquareState,
    node: SkillNodeView,
    lit: boolean
  ): void {
    if (square.parent === null) return;
    const parentOwned = this.#shown.get(square.parent) === 'owned';
    if ((state === 'owned' && parentOwned) !== lit) return;
    if (lit) {
      this.#strokeWire(
        wires,
        square,
        WIRE.glow,
        SCREEN_INK.wireLit,
        WIRE.glowAlpha
      );
      this.#strokeWire(wires, square, WIRE.lit, SCREEN_INK.wireLit, 1);
      return;
    }
    const colour =
      parentOwned && node.buyable
        ? SCREEN_INK.ready
        : state === 'owned' || parentOwned
          ? SCREEN_INK.wireLive
          : SCREEN_INK.wireDead;
    this.#strokeWire(wires, square, WIRE.width, colour, 1);
  }

  #strokeWire(
    wires: Phaser.GameObjects.Graphics,
    square: SkillSquare,
    width: number,
    colour: number,
    alpha: number
  ): void {
    const [first, ...rest] = square.wire;
    if (!first) return;
    wires.lineStyle(width, colour, alpha);
    wires.beginPath();
    wires.moveTo(first.x, first.y);
    for (const point of rest) wires.lineTo(point.x, point.y);
    wires.strokePath();
  }

  #drawSquare(
    frames: Phaser.GameObjects.Graphics,
    square: SkillSquare,
    node: SkillNodeView,
    state: SquareState
  ): void {
    frames.fillStyle(this.#fillFor(state));
    frames.fillRect(square.x, square.y, square.width, square.height);
    this.#frame(frames, square, this.#edgeColour(node, state), STROKE);

    if (!this.#stampIcon(square, state)) {
      const code = skillCode(node.label);
      const k = grow(square);
      this.label(
        square.x +
          (square.width - code.length * this.#glyph * CODE_SCALE * k) / 2,
        square.y + CODE_TOP * k,
        code,
        CODE_INK[state],
        square.width,
        CODE_SCALE * k
      );
    }

    this.#drawPips(frames, square, node);
    this.#drawPrice(square, node, state);
    this.#drawBadge(square, node, state);
  }

  #drawBadge(
    square: SkillSquare,
    node: SkillNodeView,
    state: SquareState
  ): void {
    const badge = skillBadge(square.node, Math.min(node.rank + 1, node.ranks));
    if (badge === null) return;
    const k = grow(square);
    this.label(
      square.x + square.width - (STROKE + this.#glyph + BADGE.inset) * k,
      square.y + (STROKE + BADGE.inset) * k,
      badge,
      CODE_INK[state],
      square.width,
      k
    );
  }

  #fillFor(state: SquareState): number {
    return state === 'box' ? FILL.box : WASH_FILL[state];
  }

  #drawPips(
    frames: Phaser.GameObjects.Graphics,
    square: SkillSquare,
    node: SkillNodeView
  ): void {
    if (node.ranks === 1) return;
    const rows = Math.ceil(node.ranks / PIP.perRow);
    const { top, height } = rows > 1 ? PIP_ROWS : PIP;

    for (let row = 0; row < rows; row += 1) {
      const first = row * PIP.perRow;
      const count = Math.min(PIP.perRow, node.ranks - first);
      const span = count * PIP.width + (count - 1) * PIP.gap;
      const left = square.x + (square.width - span) / 2;
      for (let at = 0; at < count; at += 1) {
        frames.fillStyle(
          first + at < node.rank ? SCREEN_INK.pipFull : SCREEN_INK.pipEmpty
        );
        frames.fillRect(
          left + at * (PIP.width + PIP.gap),
          square.y + top + row * (height + PIP_ROWS.gap),
          PIP.width,
          height
        );
      }
    }
  }

  #drawPrice(
    square: SkillSquare,
    node: SkillNodeView,
    state: SquareState
  ): void {
    if (node.maxed || node.cost <= 0) return;
    const price = formatCompactWhole(node.cost);

    const k = grow(square);
    this.label(
      square.x + (square.width - price.length * this.#glyph * k) / 2,
      square.y + PRICE_TOP * k,
      price,
      state === 'box' ? INK.box : SCREEN_INK.points,
      PRICE_ROOM * k,
      k
    );
  }

  #drawBands(view: SkillView): void {
    if (!this.labelsVisible(BAND.scale)) return;
    const named = new Map(view.headings.map((one) => [one.id, one.label]));

    for (const band of SKILL_GRAPH.bands) {
      if (!band.over.some((id) => this.#shown.has(id))) continue;
      const label = named.get(band.id);
      if (label === undefined) continue;

      const text = label.toUpperCase();
      this.label(
        band.x + (band.width - text.length * this.#glyph * BAND.scale) / 2,
        band.y,
        text,
        INK.band,
        band.width,
        BAND.scale
      );
    }
  }

  #stampIcon(square: SkillSquare, state: SquareState): boolean {
    const icon = skillIconOf(square.node.id);
    if (icon === null) return false;
    if (!this.labelsVisible(CODE_SCALE)) return true;
    const k = grow(square);
    this.#icons?.stamp(
      square.x + square.width / 2,
      square.y + ICON_CY * k,
      skillIconKey(icon),
      ICON_BOX * k,
      ICON_ALPHA[state]
    );
    return true;
  }

  #frame(
    frames: Phaser.GameObjects.Graphics,
    rect: HitRect,
    colour: number,
    width: number
  ): void {
    frames
      .lineStyle(width, colour, 1)
      .strokeRect(
        rect.x + width / 2,
        rect.y + width / 2,
        rect.width - width,
        rect.height - width
      );
  }

  #edgeColour(node: SkillNodeView, state: SquareState): number {
    if (state === 'box') return SCREEN_INK.wireDead;
    if (state === 'owned') {
      return node.maxed ? SCREEN_INK.maxed : SCREEN_INK.owned;
    }
    if (!node.buyable) return SCREEN_INK.frame;
    return node.credit ? SCREEN_INK.maxed : SCREEN_INK.ready;
  }

  #drawTip(byId: ReadonlyMap<string, SkillNodeView>): void {
    const panel = this.#tipPanel;
    if (!panel) return;
    panel.clear();
    this.#tipText?.release();

    const id = this.hovered;
    if (id === null) return;

    const scale = Math.max(
      1,
      Math.ceil(TIP.minGlyphPx / (GLYPH_SIZE * this.zoom))
    );
    const lines = this.#tipLines(id, byId);
    if (lines.length === 0) return;

    const width = TIP.width * scale;
    const height = (TIP.pad * 2 + lines.length * TIP.leading) * scale;
    const anchor = this.#tipAnchor(id, width, height, scale);

    panel
      .fillStyle(SCREEN_INK.panel, 0.98)
      .fillRect(anchor.x, anchor.y, width, height)
      .lineStyle(scale, SCREEN_INK.frame, 1)
      .strokeRect(anchor.x, anchor.y, width, height);

    for (const [at, line] of lines.entries()) {
      this.#tip(
        anchor.x + TIP.pad * scale,
        anchor.y + (TIP.pad + at * TIP.leading) * scale,
        line.text,
        line.colour,
        scale
      );
    }
  }

  #tipLines(
    id: string,
    byId: ReadonlyMap<string, SkillNodeView>
  ): readonly { text: string; colour: number }[] {
    const state = this.#shown.get(id);
    if (state === undefined) return [];

    const node = byId.get(id);
    if (!node) return [];

    const columns = Math.floor((TIP.width - TIP.pad * 2) / this.#glyph);
    const depth = node.ranks === 1 ? '' : ` ${node.rank}/${node.ranks}`;
    const secret = id === SKILL_ROOT_ID ? this.#drawn?.secret : null;

    const lines = (text: string, colour: number) =>
      wrap(text, columns).map((line) => ({ text: line, colour }));

    return [
      ...lines(`${node.label}${depth}`, INK.code),
      ...lines(
        node.levels[Math.min(node.rank, node.ranks - 1)]?.effect ?? '',
        INK.effect
      ),
      ...lines(this.#tipStatus(node), this.#statusInk(node)),
      ...lines(node.blurb, INK.blurb),
      ...(secret
        ? [
            ...lines(`★ ${secret.label}`, SCREEN_INK.maxed),
            ...lines(secret.blurb, INK.blurb),
          ]
        : []),
    ];
  }

  #tipStatus(node: SkillNodeView): string {
    if (node.maxed) return node.status;
    const price = `${formatWhole(node.cost)} SP`;
    return node.buyable && !node.credit ? price : `${price} — ${node.status}`;
  }

  #statusInk(node: SkillNodeView): number {
    if (node.maxed) return SCREEN_INK.maxed;
    if (!node.buyable) return SCREEN_INK.ink3;
    return node.credit ? SCREEN_INK.maxed : SCREEN_INK.points;
  }

  #tipAnchor(
    id: string,
    width: number,
    height: number,
    scale: number
  ): { x: number; y: number } {
    const rect = skillSquare(id);
    const view = this.cameras.main.worldView;
    const gap = TIP.offset * scale;
    const near = rect ?? { x: view.centerX, y: view.centerY, width: 0 };

    const right = near.x + near.width + gap;
    const x =
      right + width > view.right && near.x - gap - width > view.left
        ? near.x - gap - width
        : right;
    const y = Math.min(Math.max(near.y, view.top + gap), view.bottom - height);
    return { x, y };
  }

  #tip(
    x: number,
    y: number,
    text: string,
    colour: number,
    scale: number
  ): void {
    this.#tipText?.write(x, y, text, colour, Infinity, scale);
  }

  protected hitAt(x: number, y: number): HitRect | null {
    const square = squareAt(x, y);
    const state = square ? this.#shown.get(square.id) : undefined;
    return square && state !== undefined ? square : null;
  }

  protected tap(target: HitRect): boolean {
    const node = this.#byId.get(target.id);
    return node?.buyable === true && this.deps.buySkill(node.id);
  }

  #teardown(): void {
    this.#tipText?.clear();
    this.#tipText = undefined;
    this.#icons?.clear();
    this.#icons = undefined;
    this.#drawn = undefined;
    this.#byId = new Map();
    this.#buyable = [];
  }
}

function mix(base: number, toward: number, amount: number): number {
  let out = 0;
  for (const shift of [16, 8, 0]) {
    const from = (base >> shift) & 0xff;
    const to = (toward >> shift) & 0xff;
    out |= Math.round(from + (to - from) * amount) << shift;
  }
  return out;
}

function wrap(text: string, columns: number): readonly string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const joined = line === '' ? word : `${line} ${word}`;
    if (joined.length <= columns || line === '') {
      line = joined;
      continue;
    }
    lines.push(line);
    line = word;
  }
  if (line !== '') lines.push(line);
  return lines;
}

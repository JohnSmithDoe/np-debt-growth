import * as Phaser from 'phaser';

import {
  formatCompactMoney,
  formatCompactWhole,
  formatMoney,
  formatWhole,
} from '../../@shared/util/format-quantity';
import { SCREEN_INK } from '../model/board.consts';
import type { HitRect } from '../model/hit-rect.model';
import type { SceneDeps } from '../model/scene-deps.model';
import type { SkillNodeView, SkillView } from '../model/skill-view.model';
import { IconPool } from '../util/icon-pool';
import { LabelPool } from '../util/label-pool';
import { GLYPH_CELL, PIXEL_FONT } from '../util/pixel-font';
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
const ICON_DIM = 0.55;
const ICON_CY = 21;
const CODE_TOP = 7;
const PIP = { top: 38, height: 4, width: 8, gap: 3, perRow: 5 } as const;
/** Two rows share the strip between the icon and the price. */
const PIP_ROWS = { top: 37, height: 3, gap: 1 } as const;
const BAND = { scale: 2 } as const;
const BADGE = { inset: 2 } as const;

const PAD = 128;
const STROKE = 4;
const HOVER_STROKE = 6;
const PRICE_TOP = SQUARE - STROKE - GLYPH_CELL;
const PRICE_ROOM = SQUARE - STROKE * 2;
const WASH = 0.18;

const TIP = {
  width: 250,
  pad: 8,
  leading: 14,
  offset: 10,
} as const;

const TIP_DEPTH = 30;
const TEXT_DEPTH = 31;

const INK = {
  code: 0xe6e9ef,
  codeDim: 0x8d97a6,
  effect: 0x9aa3b2,
  blurb: 0x6b7482,
  band: 0x8d97a6,
} as const;

const FILL: Readonly<Record<SquareState, number>> = {
  owned: SCREEN_INK.panel,
  open: SCREEN_INK.locked,
  box: SCREEN_INK.ground,
};

const WASH_FILL: Readonly<
  Record<'owned' | 'open', Readonly<Record<'eur' | 'sp', number>>>
> = {
  owned: {
    eur: mix(FILL.owned, SCREEN_INK.money, WASH),
    sp: mix(FILL.owned, SCREEN_INK.points, WASH),
  },
  open: {
    eur: mix(FILL.open, SCREEN_INK.money, WASH),
    sp: mix(FILL.open, SCREEN_INK.points, WASH),
  },
};

export class SkillScene extends PanZoomScene {
  static readonly KEY = 'skills';

  #wires?: Phaser.GameObjects.Graphics;
  #frames?: Phaser.GameObjects.Graphics;
  #icons?: IconPool;
  #tipPanel?: Phaser.GameObjects.Graphics;
  #tipText?: LabelPool;

  #drawn?: SkillView;
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
    this.frame();
    this.#measureGlyph();

    this.#wires = this.add.graphics().setDepth(1);
    this.#frames = this.add.graphics().setDepth(2);
    this.#icons = new IconPool(this, 3);
    this.#tipPanel = this.add.graphics().setDepth(TIP_DEPTH);
    this.#tipText = new LabelPool(this, TEXT_DEPTH);

    this.#centreOnRoot();
    this.redraw();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.#teardown());
  }

  override update(): void {
    const view = this.deps.skillView();
    if (view !== this.#drawn) {
      this.#drawn = view;
      this.#shown = revealSquares(
        (id) => this.#rankOf(view, id),
        (id) => view.nodes.find((node) => node.id === id)?.available ?? true
      );
      this.reframe();
      this.redraw();
    }
    this.#applyFocus();
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

    const width = Math.max((half.x + PAD) * 2, this.scale.width);
    const height = Math.max((half.y + PAD) * 2, this.scale.height);
    this.cameras.main.setBounds(
      centre.x - width / 2,
      centre.y - height / 2,
      width,
      height
    );
  }

  #rankOf(view: SkillView, nodeId: string): number {
    return view.nodes.find((node) => node.id === nodeId)?.rank ?? 0;
  }

  #centreOnRoot(): void {
    this.#centreOn(skillSquare(SKILL_ROOT_ID));
  }

  #applyFocus(): void {
    const focus = this.deps.takeFocus();
    if (focus === null) return;
    const square = skillSquare(focus);
    if (!square) return;
    this.resetZoom();
    this.#centreOn(square);
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

    const byId = new Map(view.nodes.map((node) => [node.id, node]));
    frames.clear();
    wires.clear();
    this.#icons?.release();
    this.releaseLabels();

    for (const square of SKILL_GRAPH.squares) {
      const state = this.#shown.get(square.id);
      const node = byId.get(square.id);
      if (state === undefined || !node) continue;
      this.#drawWire(wires, square, state);
      this.#drawSquare(frames, square, node, state);
    }

    this.#drawBands(view);
    this.#drawTip(byId);
  }

  #drawWire(
    wires: Phaser.GameObjects.Graphics,
    square: SkillSquare,
    state: SquareState
  ): void {
    if (square.parent === null) return;
    const live =
      state === 'owned' || this.#shown.get(square.parent) === 'owned';
    wires.lineStyle(2, live ? SCREEN_INK.wireLive : SCREEN_INK.wireDead, 1);
    wires.beginPath();
    const [first, ...rest] = square.wire;
    if (!first) return;
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
    frames.fillStyle(this.#fillFor(node, state));
    frames.fillRect(square.x, square.y, SQUARE, SQUARE);
    this.#frame(frames, square, this.#edgeColour(node, state));

    if (state === 'box') return;

    if (!this.#stampIcon(square, state)) {
      const code = skillCode(node.label);
      this.label(
        square.x + (SQUARE - code.length * this.#glyph * CODE_SCALE) / 2,
        square.y + CODE_TOP,
        code,
        state === 'owned' ? INK.code : INK.codeDim,
        SQUARE,
        CODE_SCALE
      );
    }

    this.#drawPips(frames, square, node);
    this.#drawPrice(square, node);
    this.#drawBadge(square, node, state);
  }

  /** `+` adds, `%` compounds — the one thing a shopper reads before the price. */
  #drawBadge(
    square: SkillSquare,
    node: SkillNodeView,
    state: SquareState
  ): void {
    const badge = skillBadge(square.node, Math.min(node.rank + 1, node.ranks));
    if (badge === null) return;
    this.label(
      square.x + SQUARE - STROKE - this.#glyph - BADGE.inset,
      square.y + STROKE + BADGE.inset,
      badge,
      state === 'owned' ? INK.code : INK.codeDim,
      SQUARE
    );
  }

  #fillFor(node: SkillNodeView, state: SquareState): number {
    return state === 'box' ? FILL.box : WASH_FILL[state][node.currency];
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
      const left = square.x + (SQUARE - span) / 2;
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

  #drawPrice(square: SkillSquare, node: SkillNodeView): void {
    if (node.maxed || node.cost <= 0) return;
    const eur = node.currency === 'eur';
    const price = eur
      ? formatCompactMoney(node.cost)
      : formatCompactWhole(node.cost);

    this.label(
      square.x + (SQUARE - price.length * this.#glyph) / 2,
      square.y + PRICE_TOP,
      price,
      eur ? SCREEN_INK.money : SCREEN_INK.points,
      PRICE_ROOM
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
    this.#icons?.stamp(
      square.x + SQUARE / 2,
      square.y + ICON_CY,
      skillIconKey(icon),
      ICON_BOX,
      state === 'owned' ? 1 : ICON_DIM
    );
    return true;
  }

  #frame(
    frames: Phaser.GameObjects.Graphics,
    rect: HitRect,
    colour: number
  ): void {
    const width = rect.id === this.hovered ? HOVER_STROKE : STROKE;
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
    return node.buyable ? SCREEN_INK.ready : SCREEN_INK.frame;
  }

  #drawTip(byId: ReadonlyMap<string, SkillNodeView>): void {
    const panel = this.#tipPanel;
    if (!panel) return;
    panel.clear();
    this.#tipText?.release();

    const id = this.hovered;
    if (id === null) return;

    const scale = Math.max(1, Math.round(1 / this.zoom));
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
    if (state === undefined || state === 'box') return [];

    const node = byId.get(id);
    if (!node) return [];

    const columns = Math.floor((TIP.width - TIP.pad * 2) / this.#glyph);
    const depth = node.ranks === 1 ? '' : ` ${node.rank}/${node.ranks}`;
    const secret = id === SKILL_ROOT_ID ? this.#drawn?.secret : null;

    return [
      { text: `${node.label}${depth}`, colour: INK.code },
      {
        text: node.levels[Math.min(node.rank, node.ranks - 1)]?.effect ?? '',
        colour: INK.effect,
      },
      { text: this.#tipStatus(node), colour: this.#statusInk(node) },
      ...wrap(node.blurb, columns).map((text) => ({
        text,
        colour: INK.blurb,
      })),
      ...(secret
        ? [
            { text: `★ ${secret.label}`, colour: SCREEN_INK.maxed },
            ...wrap(secret.blurb, columns).map((text) => ({
              text,
              colour: INK.blurb,
            })),
          ]
        : []),
    ];
  }

  #tipStatus(node: SkillNodeView): string {
    if (node.maxed) return 'Maxed';
    const price =
      node.currency === 'eur'
        ? formatMoney(node.cost)
        : `${formatWhole(node.cost)} SP`;
    return node.buyable ? price : `${price} — ${node.status}`;
  }

  #statusInk(node: SkillNodeView): number {
    if (node.maxed) return SCREEN_INK.maxed;
    if (!node.buyable) return SCREEN_INK.ink3;
    return node.currency === 'eur' ? SCREEN_INK.money : SCREEN_INK.points;
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
    return square && state !== undefined && state !== 'box' ? square : null;
  }

  protected tap(target: HitRect): boolean {
    const node = this.#drawn?.nodes.find((one) => one.id === target.id);
    return node?.buyable === true && this.deps.buySkill(node.id);
  }

  #teardown(): void {
    this.#tipText?.clear();
    this.#tipText = undefined;
    this.#icons?.clear();
    this.#icons = undefined;
    this.#drawn = undefined;
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

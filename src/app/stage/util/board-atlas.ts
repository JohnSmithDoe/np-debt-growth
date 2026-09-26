import * as Phaser from 'phaser';

import type { TicketType, TicketTypeId } from '../../game/model/ticket.model';
import {
  ticketLabelKey,
  TICKET_TYPES,
  TICKET_TYPE_IDS,
} from '../../game/model/ticket.model';
import type { SceneDeps } from '../model/scene-deps.model';
import {
  BOARD_INK,
  CARD_HEIGHT,
  CARD_WIDTH,
  CLAIM_SLOTS,
  RARE_CARD_HEIGHT,
  RARE_CARD_WIDTH,
} from '../model/board.consts';

export const ATLAS_KEY = 'cb-board-atlas';
const ATLAS_WIDTH = 512;
const ATLAS_HEIGHT = 512;
const PAD = 2;

class Shelf {
  #x = PAD;
  #y = PAD;
  #rowHeight = 0;

  place(width: number, height: number): { x: number; y: number } {
    if (this.#x + width + PAD > ATLAS_WIDTH) {
      this.#y += this.#rowHeight + PAD;
      this.#x = PAD;
      this.#rowHeight = 0;
    }
    const at = { x: this.#x, y: this.#y };
    this.#x += width + PAD;
    this.#rowHeight = Math.max(this.#rowHeight, height);
    return at;
  }
}

export const GLOW_FRAME = 'glow';

export function cardFrame(id: TicketTypeId): string {
  return `card-${id}`;
}

export function claimFrame(slot: number): string {
  return `claim-${slot}`;
}

/** Golden work gets its own card so it reads across a crowded board. */
export function goldFrame(id: TicketTypeId): string {
  return `gold-${id}`;
}

export const GOLD_INK = 0xf2c14e;

/** Work a planning-poker vote re-estimated: its SP bonus, made visible. */
export function voteFrame(id: TicketTypeId): string {
  return `vote-${id}`;
}

/** The vote border alone, laid over a falling card while it fades in. */
export const VOTE_RING_FRAME = 'vote-ring';

export function buildBoardAtlas(
  scene: Phaser.Scene,
  text: SceneDeps['text']
): Phaser.Textures.CanvasTexture {
  const existing = scene.textures.get(ATLAS_KEY);
  if (existing instanceof Phaser.Textures.CanvasTexture) return existing;

  const texture = scene.textures.createCanvas(
    ATLAS_KEY,
    ATLAS_WIDTH,
    ATLAS_HEIGHT
  );
  if (!texture) {
    throw new Error('The board atlas could not be created.');
  }

  const ctx = texture.context;
  ctx.clearRect(0, 0, ATLAS_WIDTH, ATLAS_HEIGHT);
  ctx.textBaseline = 'alphabetic';
  const shelf = new Shelf();

  for (const id of TICKET_TYPE_IDS) {
    const type = TICKET_TYPES[id];
    if (type.handOnly) continue;
    const at = shelf.place(CARD_WIDTH, CARD_HEIGHT);
    drawCard(ctx, at.x, at.y, type.prefix, hex(type.colour));
    texture.add(cardFrame(id), 0, at.x, at.y, CARD_WIDTH, CARD_HEIGHT);

    const gold = shelf.place(CARD_WIDTH, CARD_HEIGHT);
    drawCard(ctx, gold.x, gold.y, type.prefix, hex(GOLD_INK));
    texture.add(goldFrame(id), 0, gold.x, gold.y, CARD_WIDTH, CARD_HEIGHT);

    const vote = shelf.place(CARD_WIDTH, CARD_HEIGHT);
    drawCard(ctx, vote.x, vote.y, type.prefix, hex(type.colour));
    drawVoteRing(ctx, vote.x, vote.y);
    texture.add(voteFrame(id), 0, vote.x, vote.y, CARD_WIDTH, CARD_HEIGHT);
  }

  const ring = shelf.place(CARD_WIDTH, CARD_HEIGHT);
  drawVoteRing(ctx, ring.x, ring.y);
  texture.add(VOTE_RING_FRAME, 0, ring.x, ring.y, CARD_WIDTH, CARD_HEIGHT);

  for (let slot = 0; slot < CLAIM_SLOTS; slot++) {
    const at = shelf.place(CARD_WIDTH, CARD_HEIGHT);
    texture.add(claimFrame(slot), 0, at.x, at.y, CARD_WIDTH, CARD_HEIGHT);
  }

  for (const id of TICKET_TYPE_IDS) {
    const type = TICKET_TYPES[id];
    if (!type.handOnly) continue;
    const at = shelf.place(RARE_CARD_WIDTH, RARE_CARD_HEIGHT);
    drawRareCard(ctx, at.x, at.y, type, hex(type.colour), text);
    texture.add(
      cardFrame(id),
      0,
      at.x,
      at.y,
      RARE_CARD_WIDTH,
      RARE_CARD_HEIGHT
    );
  }

  const glow = shelf.place(64, 64);
  drawGlow(ctx, glow.x, glow.y, 64);
  texture.add(GLOW_FRAME, 0, glow.x, glow.y, 64, 64);

  texture.refresh();
  return texture;
}

export function paintClaimCard(
  texture: Phaser.Textures.CanvasTexture,
  slot: number,
  prefix: string,
  colour: number,
  voted: boolean
): void {
  const frame = texture.get(claimFrame(slot));
  const ctx = texture.context;
  ctx.clearRect(frame.cutX, frame.cutY, CARD_WIDTH, CARD_HEIGHT);
  drawCard(ctx, frame.cutX, frame.cutY, prefix, hex(colour));
  if (voted) drawVoteRing(ctx, frame.cutX, frame.cutY);
}

function hex(colour: number): string {
  return `#${colour.toString(16).padStart(6, '0')}`;
}

function panel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
  stroke: string
): void {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
}

function drawCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  prefix: string,
  colour: string
): void {
  panel(ctx, x, y, CARD_WIDTH, CARD_HEIGHT, '#1b2129', '#2b333d');
  ctx.fillStyle = colour;
  ctx.fillRect(x + 2, y + 2, 3, CARD_HEIGHT - 4);
  ctx.font = `700 ${Math.round(CARD_HEIGHT * 0.31)}px monospace`;
  ctx.fillText(prefix, x + 9, y + CARD_HEIGHT * 0.42);
  ctx.fillStyle = '#39434f';
  ctx.fillRect(x + 9, y + CARD_HEIGHT * 0.58, CARD_WIDTH - 18, 2);
  ctx.fillRect(x + 9, y + CARD_HEIGHT * 0.73, CARD_WIDTH - 26, 2);
}

function drawVoteRing(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number
): void {
  ctx.strokeStyle = hex(BOARD_INK.vote);
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, CARD_WIDTH - 2, CARD_HEIGHT - 2);
}

function drawRareCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  type: TicketType,
  colour: string,
  text: SceneDeps['text']
): void {
  panel(ctx, x, y, RARE_CARD_WIDTH, RARE_CARD_HEIGHT, '#20161a', colour);
  ctx.strokeRect(x + 1.5, y + 1.5, RARE_CARD_WIDTH - 3, RARE_CARD_HEIGHT - 3);
  ctx.fillStyle = colour;
  ctx.fillRect(x + 3, y + 3, RARE_CARD_WIDTH - 6, 14);

  ctx.fillStyle = '#12161b';
  ctx.font = '700 9px monospace';
  ctx.fillText(`!! ${type.prefix} !!`, x + 10, y + 13);

  ctx.fillStyle = colour;
  ctx.font = '700 10px monospace';
  const [first, second] = splitLabel(text(ticketLabelKey(type.id)));
  ctx.fillText(first, x + 8, y + 32);
  ctx.fillText(second, x + 8, y + 45);
}

function splitLabel(label: string): [string, string] {
  const space = label.indexOf(' ');
  if (space < 0) return [label.toUpperCase(), ''];
  return [
    label.slice(0, space).toUpperCase(),
    label.slice(space + 1).toUpperCase(),
  ];
}

function drawGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
): void {
  const radius = size / 2;
  const gradient = ctx.createRadialGradient(
    x + radius,
    y + radius,
    0,
    x + radius,
    y + radius,
    radius
  );
  gradient.addColorStop(0, 'rgba(255,255,255,0.85)');
  gradient.addColorStop(0.45, 'rgba(255,255,255,0.25)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, size, size);
}

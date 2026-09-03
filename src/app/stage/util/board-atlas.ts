import * as Phaser from 'phaser';

import type { TicketType, TicketTypeId } from '../../game/model/ticket.model';
import {
  ticketLabelKey,
  TICKET_TYPES,
  TICKET_TYPE_IDS,
} from '../../game/model/ticket.model';
import type { SceneDeps } from '../model/scene-deps.model';
import {
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
export const SPAWNER_FRAMES = [
  'spawner-1',
  'spawner-2',
  'spawner-3',
  'spawner-4',
  'spawner-5',
  'spawner-6',
  'spawner-7',
  'spawner-8',
] as const;

const SPAWNER_WIDTH = 60;
const SPAWNER_HEIGHT = 44;

export function cardFrame(id: TicketTypeId): string {
  return `card-${id}`;
}

export function claimFrame(slot: number): string {
  return `claim-${slot}`;
}

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
  }

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

  const spawners = [
    drawLegacyService,
    drawCyclist,
    drawOffshoreCrew,
    drawSlopTerminal,
    drawRockstar,
    drawZombieRack,
    drawWreckingBall,
    drawSwarm,
  ];
  spawners.forEach((draw, index) => {
    const at = shelf.place(SPAWNER_WIDTH, SPAWNER_HEIGHT);
    draw(ctx, at.x, at.y);
    texture.add(
      SPAWNER_FRAMES[index] ?? '',
      0,
      at.x,
      at.y,
      SPAWNER_WIDTH,
      SPAWNER_HEIGHT
    );
  });

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
  colour: number
): void {
  const frame = texture.get(claimFrame(slot));
  const ctx = texture.context;
  ctx.clearRect(frame.cutX, frame.cutY, CARD_WIDTH, CARD_HEIGHT);
  drawCard(ctx, frame.cutX, frame.cutY, prefix, hex(colour));
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

function drawLegacyService(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number
): void {
  panel(ctx, x + 6, y + 8, 48, 34, '#242a31', '#4a4034');
  ctx.fillStyle = hex(TICKET_TYPES.legacy.colour);
  for (let row = 0; row < 3; row++) {
    ctx.fillRect(x + 10, y + 13 + row * 9, 40, 2);
  }
  ctx.fillStyle = hex(TICKET_TYPES.bug.colour);
  ctx.fillRect(x + 45, y + 12, 4, 4);
  ctx.strokeStyle = '#151a20';
  ctx.beginPath();
  ctx.moveTo(x + 14, y + 8);
  ctx.lineTo(x + 26, y + 42);
  ctx.stroke();
}

function drawCyclist(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number
): void {
  ctx.strokeStyle = hex(TICKET_TYPES.flaky.colour);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x + 16, y + 32, 9, 0, Math.PI * 2);
  ctx.arc(x + 44, y + 32, 9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 16, y + 32);
  ctx.lineTo(x + 30, y + 20);
  ctx.lineTo(x + 44, y + 32);
  ctx.stroke();
  ctx.fillStyle = '#d7c0a4';
  ctx.fillRect(x + 27, y + 8, 7, 7);
  ctx.fillStyle = hex(TICKET_TYPES.flaky.colour);
  ctx.fillRect(x + 26, y + 16, 9, 8);
}

function drawOffshoreCrew(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number
): void {
  ctx.fillStyle = hex(TICKET_TYPES.conflict.colour);
  ctx.beginPath();
  ctx.moveTo(x + 4, y + 30);
  ctx.lineTo(x + 56, y + 30);
  ctx.lineTo(x + 48, y + 42);
  ctx.lineTo(x + 12, y + 42);
  ctx.closePath();
  ctx.fill();
  panel(
    ctx,
    x + 14,
    y + 16,
    32,
    14,
    '#1d2b40',
    hex(TICKET_TYPES.conflict.colour)
  );
  ctx.fillStyle = '#d7c0a4';
  for (let head = 0; head < 3; head++) {
    ctx.fillRect(x + 17 + head * 11, y + 8, 6, 6);
  }
}

function drawSlopTerminal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number
): void {
  panel(ctx, x + 8, y + 8, 44, 28, '#1b2129', hex(TICKET_TYPES.slop.colour));
  ctx.fillStyle = hex(TICKET_TYPES.slop.colour);
  for (let row = 0; row < 4; row++) {
    ctx.fillRect(x + 12 + (row % 2) * 3, y + 12 + row * 6, 30 - row * 4, 2);
  }
  ctx.fillRect(x + 26, y + 36, 8, 4);
  ctx.fillRect(x + 20, y + 40, 20, 2);
}

function drawRockstar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number
): void {
  ctx.fillStyle = '#d7c0a4';
  ctx.fillRect(x + 24, y + 6, 10, 9);
  ctx.fillStyle = '#12161c';
  ctx.fillRect(x + 24, y + 9, 10, 3);
  ctx.fillStyle = hex(TICKET_TYPES.rockstar.colour);
  ctx.fillRect(x + 21, y + 16, 16, 16);
  ctx.beginPath();
  ctx.moveTo(x + 14, y + 34);
  ctx.lineTo(x + 46, y + 26);
  ctx.lineTo(x + 48, y + 32);
  ctx.lineTo(x + 16, y + 40);
  ctx.closePath();
  ctx.fill();
}

function drawZombieRack(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number
): void {
  panel(ctx, x + 14, y + 4, 32, 38, '#171c24', hex(TICKET_TYPES.zombie.colour));
  ctx.fillStyle = hex(TICKET_TYPES.zombie.colour);
  for (let unit = 0; unit < 4; unit++) {
    ctx.fillRect(x + 18, y + 8 + unit * 9, 24, 5);
  }
  ctx.fillStyle = hex(TICKET_TYPES.bug.colour);
  ctx.fillRect(x + 38, y + 9, 3, 3);
}

function drawWreckingBall(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number
): void {
  ctx.strokeStyle = hex(TICKET_TYPES.rewrite.colour);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 10, y + 4);
  ctx.lineTo(x + 44, y + 4);
  ctx.moveTo(x + 40, y + 4);
  ctx.lineTo(x + 40, y + 22);
  ctx.stroke();
  ctx.fillStyle = hex(TICKET_TYPES.rewrite.colour);
  ctx.beginPath();
  ctx.arc(x + 40, y + 28, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(x + 8, y + 36, 20, 6);
  ctx.fillRect(x + 12, y + 30, 10, 6);
}

function drawSwarm(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = hex(TICKET_TYPES.swarm.colour);
  const agents: readonly [number, number][] = [
    [12, 10],
    [30, 6],
    [46, 14],
    [20, 26],
    [38, 30],
    [28, 40],
  ];
  for (const [dx, dy] of agents) {
    ctx.fillRect(x + dx, y + dy, 8, 6);
    ctx.fillRect(x + dx + 2, y + dy - 3, 4, 3);
  }
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

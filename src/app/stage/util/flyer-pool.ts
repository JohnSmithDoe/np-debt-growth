import * as Phaser from 'phaser';

import { FLYER_CAPACITY } from '../model/board.consts';
import { ATLAS_KEY } from './board-atlas';

export const FLIGHT = {
  drop: 0,
  harvest: 1,
  fade: 2,
} as const;

export type FlightKind = (typeof FLIGHT)[keyof typeof FLIGHT];

export type Arrival = (kind: FlightKind, ticket: number) => void;

const IDLE = -1;

export class FlyerPool {
  readonly #images: Phaser.GameObjects.Image[] = [];
  readonly #free: number[] = [];
  readonly #active: number[] = [];

  readonly #kind = new Int32Array(FLYER_CAPACITY);
  readonly #ticket = new Int32Array(FLYER_CAPACITY);
  readonly #fromX = new Float32Array(FLYER_CAPACITY);
  readonly #fromY = new Float32Array(FLYER_CAPACITY);
  readonly #toX = new Float32Array(FLYER_CAPACITY);
  readonly #toY = new Float32Array(FLYER_CAPACITY);
  readonly #arc = new Float32Array(FLYER_CAPACITY);
  readonly #span = new Float32Array(FLYER_CAPACITY);
  readonly #elapsed = new Float32Array(FLYER_CAPACITY);
  readonly #hold = new Float32Array(FLYER_CAPACITY);
  readonly #falling = new Map<number, number>();

  #onArrive: Arrival = () => undefined;

  constructor(scene: Phaser.Scene, depth: number) {
    for (let slot = FLYER_CAPACITY - 1; slot >= 0; slot--) {
      this.#images.push(
        scene.add.image(0, 0, ATLAS_KEY).setDepth(depth).setVisible(false)
      );
      this.#free.push(slot);
      this.#kind[slot] = IDLE;
    }
  }

  set onArrive(handler: Arrival) {
    this.#onArrive = handler;
  }

  launch(
    frame: string,
    kind: FlightKind,
    ticket: number,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    span: number,
    arc: number,
    hold = 0
  ): boolean {
    const slot = this.#free.pop();
    if (slot === undefined) return false;

    this.#kind[slot] = kind;
    this.#ticket[slot] = ticket;
    this.#fromX[slot] = fromX;
    this.#fromY[slot] = fromY;
    this.#toX[slot] = toX;
    this.#toY[slot] = toY;
    this.#arc[slot] = arc;
    this.#span[slot] = Math.max(1, span);
    this.#elapsed[slot] = 0;
    this.#hold[slot] = hold;
    this.#active.push(slot);
    if (kind === FLIGHT.drop && ticket !== IDLE)
      this.#falling.set(ticket, slot);

    this.#images[slot]
      ?.setFrame(frame)
      .setPosition(fromX, fromY)
      .setRotation(0)
      .setAlpha(1)
      .setVisible(true);
    return true;
  }

  isFalling(ticket: number): boolean {
    return this.#falling.has(ticket);
  }

  /** Tickets still in the air whose card is within `radius` of the pointer. */
  fallingWithin(x: number, y: number, radius: number, into: number[]): void {
    for (const [ticket, slot] of this.#falling) {
      const image = this.#images[slot];
      if (!image || (this.#hold[slot] ?? 0) > 0) continue;
      const dx = image.x - x;
      const dy = image.y - y;
      if (dx * dx + dy * dy <= radius * radius) into.push(ticket);
    }
  }

  /** Ends a drop in the air, without landing it; returns where it was. */
  catch(ticket: number): { x: number; y: number } | null {
    const slot = this.#falling.get(ticket);
    if (slot === undefined) return null;
    const image = this.#images[slot];
    const at = { x: image?.x ?? 0, y: image?.y ?? 0 };
    const index = this.#active.indexOf(slot);
    const last = this.#active.pop() ?? IDLE;
    if (index >= 0 && index < this.#active.length) this.#active[index] = last;
    this.#retire(slot);
    return at;
  }

  update(deltaMs: number): void {
    for (let at = this.#active.length - 1; at >= 0; at--) {
      const slot = this.#active[at] ?? IDLE;
      if (slot === IDLE) continue;

      const hold = this.#hold[slot] ?? 0;
      if (hold > 0) {
        this.#hold[slot] = Math.max(0, hold - deltaMs);
        continue;
      }

      const span = this.#span[slot] ?? 1;
      const elapsed = (this.#elapsed[slot] ?? 0) + deltaMs;
      this.#elapsed[slot] = elapsed;
      const progress = Math.min(1, elapsed / span);
      const eased = ease(this.#kind[slot] ?? FLIGHT.drop, progress);

      const image = this.#images[slot];
      if (image) {
        const fromX = this.#fromX[slot] ?? 0;
        const fromY = this.#fromY[slot] ?? 0;
        image.x = fromX + ((this.#toX[slot] ?? 0) - fromX) * eased;
        image.y =
          fromY +
          ((this.#toY[slot] ?? 0) - fromY) * eased -
          (this.#arc[slot] ?? 0) *
            lift(this.#kind[slot] ?? FLIGHT.drop, progress);
        const kind = this.#kind[slot];
        if (kind === FLIGHT.fade) image.alpha = 1 - progress;
        else
          image.rotation = (1 - progress) * 0.4 * ((slot & 1) === 0 ? 1 : -1);
      }

      if (progress < 1) continue;

      const last = this.#active.pop() ?? IDLE;
      if (at < this.#active.length && last !== IDLE) this.#active[at] = last;
      this.#retire(slot);
      this.#onArrive(
        (this.#kind[slot] ?? FLIGHT.drop) as FlightKind,
        this.#ticket[slot] ?? IDLE
      );
    }
  }

  #retire(slot: number): void {
    this.#images[slot]?.setVisible(false);
    this.#free.push(slot);
    if (this.#kind[slot] === FLIGHT.drop)
      this.#falling.delete(this.#ticket[slot] ?? IDLE);
  }

  destroy(): void {
    for (const image of this.#images) image.destroy();
  }
}

function ease(kind: number, progress: number): number {
  if (kind === FLIGHT.fade) return progress;
  return progress * progress * (3 - 2 * progress);
}

/** A hop: the peak comes at a quarter of the flight, the rest is the fall. */
function lift(kind: number, progress: number): number {
  if (kind === FLIGHT.fade) return 0;
  return Math.sin(Math.PI * Math.sqrt(progress));
}

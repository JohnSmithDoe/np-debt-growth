import * as Phaser from 'phaser';

import { FLYER_CAPACITY, FLYER_CEILING, VOTES } from '../model/board.consts';
import { ATLAS_KEY, VOTE_RING_FRAME } from './board-atlas';

export const FLIGHT = {
  drop: 0,
  harvest: 1,
  fade: 2,
} as const;

export type FlightKind = (typeof FLIGHT)[keyof typeof FLIGHT];

export type Arrival = (kind: FlightKind, ticket: number) => void;

const IDLE = -1;
/** A card taken mid-fade is fully back by this share of its flight. */
const REVIVE_SHARE = 0.35;

export class FlyerPool {
  readonly #images: Phaser.GameObjects.Image[] = [];
  readonly #rings: Phaser.GameObjects.Image[] = [];
  readonly #free: number[] = [];
  readonly #active: number[] = [];

  #kind = new Int32Array(FLYER_CAPACITY);
  #ticket = new Int32Array(FLYER_CAPACITY);
  #fromX = new Float32Array(FLYER_CAPACITY);
  #fromY = new Float32Array(FLYER_CAPACITY);
  #toX = new Float32Array(FLYER_CAPACITY);
  #toY = new Float32Array(FLYER_CAPACITY);
  #arc = new Float32Array(FLYER_CAPACITY);
  #span = new Float32Array(FLYER_CAPACITY);
  #elapsed = new Float32Array(FLYER_CAPACITY);
  #hold = new Float32Array(FLYER_CAPACITY);
  #voted = new Uint8Array(FLYER_CAPACITY);
  #alpha = new Float32Array(FLYER_CAPACITY);
  readonly #falling = new Map<number, number>();

  #onArrive: Arrival = () => undefined;
  #voteTop = 0;

  readonly #scene: Phaser.Scene;
  readonly #depth: number;

  constructor(scene: Phaser.Scene, depth: number) {
    this.#scene = scene;
    this.#depth = depth;
    this.#add(0, FLYER_CAPACITY);
  }

  #add(from: number, to: number): void {
    for (let slot = from; slot < to; slot++) {
      this.#images.push(
        this.#scene.add
          .image(0, 0, ATLAS_KEY)
          .setDepth(this.#depth)
          .setVisible(false)
      );
      this.#rings.push(
        this.#scene.add
          .image(0, 0, ATLAS_KEY, VOTE_RING_FRAME)
          .setDepth(this.#depth)
          .setVisible(false)
      );
      this.#kind[slot] = IDLE;
    }
    for (let slot = to - 1; slot >= from; slot--) this.#free.push(slot);
  }

  #grow(): void {
    const from = this.#images.length;
    const to = Math.min(from * 2, FLYER_CEILING);
    if (to <= from) return;
    this.#kind = widen(this.#kind, new Int32Array(to));
    this.#ticket = widen(this.#ticket, new Int32Array(to));
    this.#fromX = widen(this.#fromX, new Float32Array(to));
    this.#fromY = widen(this.#fromY, new Float32Array(to));
    this.#toX = widen(this.#toX, new Float32Array(to));
    this.#toY = widen(this.#toY, new Float32Array(to));
    this.#arc = widen(this.#arc, new Float32Array(to));
    this.#span = widen(this.#span, new Float32Array(to));
    this.#elapsed = widen(this.#elapsed, new Float32Array(to));
    this.#hold = widen(this.#hold, new Float32Array(to));
    this.#voted = widen(this.#voted, new Uint8Array(to));
    this.#alpha = widen(this.#alpha, new Float32Array(to));
    this.#add(from, to);
  }

  set onArrive(handler: Arrival) {
    this.#onArrive = handler;
  }

  /** Screen y of the first planning-poker beam. */
  set voteTop(y: number) {
    this.#voteTop = y;
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
    hold = 0,
    alpha = 1
  ): boolean {
    if (this.#free.length === 0) this.#grow();
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
    this.#alpha[slot] = alpha;
    this.#active.push(slot);
    if (kind === FLIGHT.drop && ticket !== IDLE)
      this.#falling.set(ticket, slot);

    this.#images[slot]
      ?.setFrame(frame)
      .setPosition(fromX, fromY)
      .setRotation(0)
      .setAlpha(alpha)
      .setVisible(true);
    return true;
  }

  /** The drop crosses the planning-poker beams and comes out re-estimated. */
  markVoted(ticket: number): void {
    const slot = this.#falling.get(ticket);
    if (slot === undefined) return;
    this.#voted[slot] = 1;
    this.#rings[slot]?.setAlpha(0).setVisible(true);
  }

  isFalling(ticket: number): boolean {
    return this.#falling.has(ticket);
  }

  /** Tickets still in the air whose card is within `radius` of the pointer. */
  /** Falling cards the ring touches, by their drawn box. */
  fallingWithin(x: number, y: number, radius: number, into: number[]): void {
    for (const [ticket, slot] of this.#falling) {
      const image = this.#images[slot];
      if (!image || (this.#hold[slot] ?? 0) > 0) continue;
      const dx = Math.max(0, Math.abs(image.x - x) - image.displayWidth / 2);
      const dy = Math.max(0, Math.abs(image.y - y) - image.displayHeight / 2);
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
        const alpha = this.#alpha[slot] ?? 1;
        if (kind === FLIGHT.fade) image.alpha = alpha * (1 - progress);
        else {
          image.rotation = (1 - progress) * 0.4 * ((slot & 1) === 0 ? 1 : -1);
          if (alpha < 1)
            image.alpha =
              alpha + (1 - alpha) * Math.min(1, progress / REVIVE_SHARE);
        }
        if (this.#voted[slot]) this.#followRing(slot, image);
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

  #followRing(slot: number, card: Phaser.GameObjects.Image): void {
    const ring = this.#rings[slot];
    if (!ring) return;
    const crossed = Phaser.Math.Clamp(
      (card.y - this.#voteTop) / VOTES.fade,
      0,
      1
    );
    ring
      .setPosition(card.x, card.y)
      .setRotation(card.rotation)
      .setAlpha(Math.max(ring.alpha, crossed));
  }

  #retire(slot: number): void {
    this.#images[slot]?.setVisible(false);
    this.#rings[slot]?.setVisible(false);
    this.#voted[slot] = 0;
    this.#free.push(slot);
    if (this.#kind[slot] === FLIGHT.drop)
      this.#falling.delete(this.#ticket[slot] ?? IDLE);
  }

  destroy(): void {
    for (const image of this.#images) image.destroy();
    for (const ring of this.#rings) ring.destroy();
  }
}

function widen<T extends Int32Array | Float32Array | Uint8Array>(
  from: T,
  to: T
): T {
  to.set(from);
  return to;
}

function ease(kind: number, progress: number): number {
  if (kind === FLIGHT.fade) return progress;
  return progress * progress * (3 - 2 * progress);
}

/** Share of a harvest spent rising; the apex eases in, the fall accelerates out. */
const HARVEST_APEX = 0.42;

/** A hop: the peak comes at a quarter of the flight, the rest is the fall. */
function lift(kind: number, progress: number): number {
  if (kind === FLIGHT.fade) return 0;
  if (kind === FLIGHT.harvest) return arc(progress, HARVEST_APEX);
  return Math.sin(Math.PI * Math.sqrt(progress));
}

/** Two parabolas meeting at `apex`: finite launch speed, zero speed at the top. */
function arc(progress: number, apex: number): number {
  const t =
    progress < apex ? 1 - progress / apex : (progress - apex) / (1 - apex);
  return 1 - t * t;
}

import * as Phaser from 'phaser';

import { voteBeamY } from '../../game/model/board.model';
import { BOARD_INK, VOTES } from '../model/board.consts';

interface Pulse {
  readonly beam: number;
  readonly x: number;
  age: number;
}

/**
 * Planning poker: one coach per beam at the edge of the path. A beam lights
 * only where, and when, a card it re-estimated falls through it; the
 * simulation decides the vote, the flyer reports the crossing.
 */
export class VoteBeams {
  readonly #graphics: Phaser.GameObjects.Graphics;
  readonly #pulses: Pulse[] = [];
  #width = 0;
  #scale = 1;
  #offY = 0;
  #coaches = -1;
  #stale = true;
  #phase = 0;

  constructor(scene: Phaser.Scene, depth: number) {
    this.#graphics = scene.add.graphics().setDepth(depth);
  }

  layout(width: number, scaleY: number, offY: number): void {
    this.#width = width;
    this.#scale = scaleY;
    this.#offY = offY;
    this.#stale = true;
  }

  pulse(beam: number, x: number): void {
    if (this.#pulses.length >= VOTES.maxPulses) this.#pulses.shift();
    this.#pulses.push({ beam, x, age: 0 });
  }

  update(coaches: number, deltaMs: number): void {
    this.#phase = (this.#phase + deltaMs / 240) % (Math.PI * 2);
    for (const pulse of this.#pulses) pulse.age += deltaMs;
    while (this.#pulses[0] && this.#pulses[0].age >= VOTES.pulseMs) {
      this.#pulses.shift();
    }

    const busy = this.#pulses.length > 0;
    if (!busy && !this.#stale && coaches === this.#coaches) return;
    this.#stale = busy;
    this.#coaches = coaches;

    const g = this.#graphics;
    g.clear();
    const raised = new Set<number>();
    for (const pulse of this.#pulses) raised.add(pulse.beam);
    for (let index = 0; index < coaches; index++) {
      const y = this.#beamY(index);
      this.#rest(y);
      this.#coach(y, raised.has(index));
    }
    for (const pulse of this.#pulses) {
      if (pulse.beam < coaches) this.#flash(pulse);
    }
  }

  destroy(): void {
    this.#graphics.destroy();
  }

  #beamY(index: number): number {
    return this.#offY + voteBeamY(index) * this.#scale;
  }

  #rest(y: number): void {
    const g = this.#graphics;
    g.lineStyle(1, BOARD_INK.vote, 0.12);
    g.lineBetween(VOTES.coachX + 12, y, this.#width, y);
  }

  #flash(pulse: Pulse): void {
    const g = this.#graphics;
    const y = this.#beamY(pulse.beam);
    const life = 1 - pulse.age / VOTES.pulseMs;
    const start = Math.max(VOTES.coachX + 12, pulse.x - VOTES.reach);
    const end = Math.min(this.#width, pulse.x + VOTES.reach);
    const at = (x: number): number =>
      y +
      Math.sin(x / VOTES.wavelength + this.#phase + pulse.beam) *
        VOTES.amplitude *
        life;
    for (let x = start; x < end; x += 6) {
      const next = Math.min(end, x + 6);
      const near = 1 - Math.abs((x + next) / 2 - pulse.x) / VOTES.reach;
      g.lineStyle(2, BOARD_INK.vote, 0.9 * life * Math.max(0, near));
      g.lineBetween(x, at(x), next, at(next));
    }
    g.fillStyle(BOARD_INK.vote, life);
    g.fillCircle(pulse.x, y, 2 + 2 * life);
  }

  #coach(y: number, raised: boolean): void {
    const g = this.#graphics;
    const x = VOTES.coachX;
    g.fillStyle(BOARD_INK.coach, 1);
    g.fillCircle(x, y - 4, 2.5);
    g.fillRect(x - 2, y - 1, 4, 6);
    if (!raised) return;
    g.fillStyle(BOARD_INK.card, 1);
    g.fillRect(x + 4, y - 7, 5, 7);
    g.fillStyle(BOARD_INK.vote, 1);
    g.fillRect(x + 5, y - 5, 3, 3);
  }
}

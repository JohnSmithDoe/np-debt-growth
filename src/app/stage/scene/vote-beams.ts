import * as Phaser from 'phaser';

import { voteBeamY } from '../../game/model/board.model';
import { BOARD_INK, VOTES } from '../model/board.consts';

/**
 * Planning poker: one coach per vote at the edge of the path, and a beam
 * across the board that is lit while that vote is live. The simulation
 * decides who was re-estimated; this only shows it.
 */
export class VoteBeams {
  readonly #graphics: Phaser.GameObjects.Graphics;
  #width = 0;
  #scale = 1;
  #offY = 0;
  #drawn = '';
  #phase = 0;

  constructor(scene: Phaser.Scene, depth: number) {
    this.#graphics = scene.add.graphics().setDepth(depth);
  }

  layout(width: number, scaleY: number, offY: number): void {
    this.#width = width;
    this.#scale = scaleY;
    this.#offY = offY;
    this.#drawn = '';
  }

  update(votes: readonly boolean[], deltaMs: number): void {
    this.#phase = (this.#phase + deltaMs / 240) % (Math.PI * 2);
    const key = votes.map((live) => (live ? 1 : 0)).join('');
    if (key === '' && this.#drawn === '') return;
    if (key === this.#drawn && !votes.some(Boolean)) return;
    this.#drawn = key;

    const g = this.#graphics;
    g.clear();
    for (const [index, live] of votes.entries()) {
      const y = this.#offY + voteBeamY(index) * this.#scale;
      this.#beam(y, live, index);
      this.#coach(y, live);
    }
  }

  destroy(): void {
    this.#graphics.destroy();
  }

  #beam(y: number, live: boolean, index: number): void {
    const g = this.#graphics;
    g.lineStyle(live ? 2 : 1, BOARD_INK.vote, live ? 0.85 : 0.12);
    g.beginPath();
    const start = VOTES.coachX + 12;
    for (let x = start; x <= this.#width; x += 6) {
      const wave = live
        ? Math.sin(x / VOTES.wavelength + this.#phase + index) * VOTES.amplitude
        : 0;
      if (x === start) g.moveTo(x, y + wave);
      else g.lineTo(x, y + wave);
    }
    g.strokePath();
  }

  #coach(y: number, live: boolean): void {
    const g = this.#graphics;
    const x = VOTES.coachX;
    g.fillStyle(BOARD_INK.coach, 1);
    g.fillCircle(x, y - 4, 2.5);
    g.fillRect(x - 2, y - 1, 4, 6);
    if (!live) return;
    g.fillStyle(BOARD_INK.card, 1);
    g.fillRect(x + 4, y - 7, 5, 7);
    g.fillStyle(BOARD_INK.vote, 1);
    g.fillRect(x + 5, y - 5, 3, 3);
  }
}

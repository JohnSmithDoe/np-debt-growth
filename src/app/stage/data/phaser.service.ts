import { Injectable, signal } from '@angular/core';
import * as Phaser from 'phaser';

/** Backing pixels per CSS pixel: whole steps, so pixel art stays even; capped for fill cost. */
function backingScale(): number {
  return Math.min(2, Math.max(1, Math.round(globalThis.devicePixelRatio || 1)));
}

/**
 * The game is sized in backing pixels and shown at CSS size (`zoom` 1/scale);
 * every scene's camera zooms back up, so scenes lay out in CSS pixels.
 */
@Injectable({ providedIn: 'root' })
export class PhaserService {
  #game?: Phaser.Game;
  #initialized = signal(false);

  readonly initialized = this.#initialized.asReadonly();

  get game(): Phaser.Game {
    if (!this.#game) {
      throw new Error('Phaser has not booted — call init() first.');
    }
    return this.#game;
  }

  init(parent: HTMLElement): void {
    if (this.#game) return;
    const scale = backingScale();
    this.#game = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      backgroundColor: '#0f1216',
      pixelArt: true,
      scale: {
        mode: Phaser.Scale.NONE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: parent.clientWidth * scale,
        height: parent.clientHeight * scale,
        zoom: 1 / scale,
      },
      scene: [],
    });
    this.#initialized.set(true);
  }

  resize(width: number, height: number): void {
    const game = this.#game;
    if (!game) return;
    const scale = backingScale();
    game.scale.resize(width * scale, height * scale);
    // NONE mode restyles the canvas only on a zoom refresh.
    game.scale.setZoom(1 / scale);
  }

  destroy(): void {
    this.#game?.destroy(true, false);
    this.#game = undefined;
    this.#initialized.set(false);
  }
}

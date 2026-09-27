/*
 * Sized in backing pixels (whole DPR steps, capped at 2x) and shown at zoom 1/scale;
 * scenes zoom back up and lay out in CSS px. Scale mode NONE restyles the canvas
 * only on a zoom refresh, so setZoom must follow every resize.
 */
import { Injectable, signal } from '@angular/core';
import * as Phaser from 'phaser';

function backingScale(): number {
  return Math.min(2, Math.max(1, Math.round(globalThis.devicePixelRatio || 1)));
}

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
    game.scale.setZoom(1 / scale);
  }

  destroy(): void {
    this.#game?.destroy(true, false);
    this.#game = undefined;
    this.#initialized.set(false);
  }
}

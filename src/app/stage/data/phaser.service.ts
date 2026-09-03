import { Injectable, signal } from '@angular/core';
import * as Phaser from 'phaser';

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
    this.#game = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      backgroundColor: '#0f1216',
      pixelArt: true,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: parent.clientWidth,
        height: parent.clientHeight,
      },
      scene: [],
    });
    this.#initialized.set(true);
  }

  resize(width: number, height: number): void {
    this.#game?.scale.resize(width, height);
  }

  destroy(): void {
    this.#game?.destroy(true, false);
    this.#game = undefined;
    this.#initialized.set(false);
  }
}

import * as Phaser from 'phaser';

import { PIXEL_FONT } from './pixel-font';

export class LabelPool {
  #labels: Phaser.GameObjects.BitmapText[] = [];
  #at = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly depth: number
  ) {}

  write(
    x: number,
    y: number,
    text: string,
    colour: number,
    room = Infinity,
    scale = 1
  ): void {
    const existing = this.#labels[this.#at];
    const label =
      existing ??
      this.scene.add.bitmapText(0, 0, PIXEL_FONT, '').setDepth(this.depth);
    this.#labels[this.#at] = label;
    this.#at += 1;

    label
      .setPosition(x, y)
      .setText(text)
      .setTint(colour)
      .setScale(scale)
      .setVisible(true);
    while (label.displayWidth > room && label.text.length > 1) {
      label.setText(`${label.text.slice(0, -2)}…`);
    }
  }

  release(): void {
    for (const label of this.#labels) label.setVisible(false);
    this.#at = 0;
  }

  clear(): void {
    this.#labels = [];
    this.#at = 0;
  }
}

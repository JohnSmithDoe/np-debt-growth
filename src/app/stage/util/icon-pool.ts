import * as Phaser from 'phaser';

export class IconPool {
  #icons: Phaser.GameObjects.Image[] = [];
  #at = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly depth: number
  ) {}

  stamp(x: number, y: number, key: string, size: number, alpha = 1): void {
    const existing = this.#icons[this.#at];
    const icon =
      existing ?? this.scene.add.image(0, 0, key).setDepth(this.depth);
    this.#icons[this.#at] = icon;
    this.#at += 1;

    icon
      .setTexture(key)
      .setPosition(x, y)
      .setDisplaySize(size, size)
      .setAlpha(alpha)
      .setVisible(true);
  }

  release(): void {
    for (const icon of this.#icons) icon.setVisible(false);
    this.#at = 0;
  }

  clear(): void {
    for (const icon of this.#icons) icon.destroy();
    this.#icons = [];
    this.#at = 0;
  }
}

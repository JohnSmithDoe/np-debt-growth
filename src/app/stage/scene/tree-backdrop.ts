import * as Phaser from 'phaser';

import { TREE_BACKDROP, treeBackdropUrl } from '../model/board.consts';

const keyOf = (tier: number): string => `cb-tree-backdrop-${tier}`;

interface View {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Follows the camera's view, so it covers the screen at any pan and zoom. */
export class TreeBackdrop {
  readonly #scene: Phaser.Scene;
  readonly #front: Phaser.GameObjects.Image;
  readonly #back: Phaser.GameObjects.Image;
  #tier = -1;

  constructor(scene: Phaser.Scene, depth: number) {
    this.#scene = scene;
    const make = (): Phaser.GameObjects.Image =>
      scene.add
        .image(0, 0, '__DEFAULT')
        .setOrigin(0.5, 0.5)
        .setDepth(depth)
        .setAlpha(0)
        .setVisible(false);
    this.#back = make();
    this.#front = make();
  }

  static preload(scene: Phaser.Scene): void {
    for (let tier = 0; tier <= TREE_BACKDROP.tiers; tier++) {
      const key = keyOf(tier);
      if (!scene.textures.exists(key)) {
        scene.load.image(key, treeBackdropUrl(tier));
      }
    }
  }

  tier(tier: number): void {
    const shown = Math.min(tier, TREE_BACKDROP.tiers);
    if (shown === this.#tier) return;
    const first = this.#tier < 0;
    this.#tier = shown;
    this.#show(keyOf(shown), first ? 0 : TREE_BACKDROP.fadeMs);
  }

  follow(camera: Phaser.Cameras.Scene2D.Camera): void {
    const view = {
      x: camera.scrollX + camera.width / 2,
      y: camera.scrollY + camera.height / 2,
      width: camera.width / camera.zoom,
      height: camera.height / camera.zoom,
    };
    this.#fit(this.#front, view);
    this.#fit(this.#back, view);
  }

  destroy(): void {
    this.#scene.tweens.killTweensOf([this.#front, this.#back]);
    this.#front.destroy();
    this.#back.destroy();
  }

  #show(key: string, fadeMs: number): void {
    if (!this.#scene.textures.exists(key)) return;
    const tweens = this.#scene.tweens;
    tweens.killTweensOf([this.#front, this.#back]);

    if (this.#front.visible) {
      this.#back
        .setTexture(this.#front.texture.key)
        .setAlpha(this.#front.alpha)
        .setVisible(true);
      tweens.add({
        targets: this.#back,
        alpha: 0,
        duration: fadeMs,
        ease: 'Sine.easeInOut',
        onComplete: () => this.#back.setVisible(false),
      });
    }

    this.#front.setTexture(key).setVisible(true);
    if (fadeMs <= 0) this.#front.setAlpha(TREE_BACKDROP.alpha);
    else {
      this.#front.setAlpha(0);
      tweens.add({
        targets: this.#front,
        alpha: TREE_BACKDROP.alpha,
        duration: fadeMs,
        ease: 'Sine.easeInOut',
      });
    }
  }

  #fit(image: Phaser.GameObjects.Image, view: View): void {
    if (!image.visible) return;
    const source = image.texture.getSourceImage();
    const cover = Math.max(
      view.width / source.width,
      view.height / source.height
    );
    image
      .setPosition(view.x, view.y)
      .setDisplaySize(source.width * cover, source.height * cover);
  }
}

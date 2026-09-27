import * as Phaser from 'phaser';

import {
  BACKDROP_KINDS,
  type BackdropKind,
  TIER_BACKDROP,
  tierBackdropUrl,
} from '../model/board.consts';

const keyOf = (tier: number, kind: BackdropKind): string =>
  `cb-backdrop-${tier}-${kind}`;

/**
 * The rung's art behind the board, dimmed so the cards stay the subject: its
 * title screen first, then its ADR plate (the empty office at tier 0) and back.
 */
export class TierBackdrop {
  readonly #scene: Phaser.Scene;
  readonly #front: Phaser.GameObjects.Image;
  readonly #back: Phaser.GameObjects.Image;
  #tier = -1;
  #kind: BackdropKind = 'office';
  #swap?: Phaser.Time.TimerEvent;
  #box = { width: 1, height: 1 };

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
    for (let tier = 0; tier <= TIER_BACKDROP.tiers; tier++) {
      for (const kind of BACKDROP_KINDS) {
        scene.load.image(keyOf(tier, kind), tierBackdropUrl(tier, kind));
      }
    }
  }

  tier(tier: number): void {
    const shown = Math.min(tier, TIER_BACKDROP.tiers);
    if (shown === this.#tier) return;
    const first = this.#tier < 0;
    this.#tier = shown;
    this.#kind = 'office';
    this.#show(keyOf(shown, 'office'), first ? 0 : TIER_BACKDROP.fadeMs);

    this.#swap?.remove();
    this.#swap = this.#scene.time.addEvent({
      delay: TIER_BACKDROP.swapMs,
      loop: true,
      callback: () => this.#alternate(),
    });
  }

  layout(width: number, height: number): void {
    this.#box = { width, height };
    this.#fit(this.#front);
    this.#fit(this.#back);
  }

  destroy(): void {
    this.#swap?.remove();
    this.#scene.tweens.killTweensOf([this.#front, this.#back]);
    this.#front.destroy();
    this.#back.destroy();
  }

  #alternate(): void {
    const next: BackdropKind = this.#kind === 'office' ? 'tier' : 'office';
    const key = keyOf(this.#tier, next);
    if (!this.#scene.textures.exists(key)) return;
    this.#kind = next;
    this.#show(key, TIER_BACKDROP.swapFadeMs);
  }

  #show(key: string, fadeMs: number): void {
    const tweens = this.#scene.tweens;
    tweens.killTweensOf([this.#front, this.#back]);

    if (this.#front.visible) {
      this.#back
        .setTexture(this.#front.texture.key)
        .setAlpha(this.#front.alpha)
        .setVisible(true);
      this.#fit(this.#back);
    }

    if (!this.#scene.textures.exists(key)) {
      this.#front.setVisible(false).setAlpha(0);
    } else {
      this.#front.setTexture(key).setVisible(true);
      this.#fit(this.#front);
      if (fadeMs <= 0) this.#front.setAlpha(TIER_BACKDROP.alpha);
      else {
        this.#front.setAlpha(0);
        tweens.add({
          targets: this.#front,
          alpha: TIER_BACKDROP.alpha,
          duration: fadeMs,
          ease: 'Sine.easeInOut',
        });
      }
    }

    if (!this.#back.visible) return;
    if (fadeMs <= 0) return void this.#back.setVisible(false);
    tweens.add({
      targets: this.#back,
      alpha: 0,
      duration: fadeMs,
      ease: 'Sine.easeInOut',
      onComplete: () => this.#back.setVisible(false),
    });
  }

  #fit(image: Phaser.GameObjects.Image): void {
    const { width, height } = this.#box;
    const source = image.texture.getSourceImage();
    const cover = Math.max(width / source.width, height / source.height);
    image
      .setPosition(width / 2, height / 2)
      .setDisplaySize(source.width * cover, source.height * cover);
  }
}

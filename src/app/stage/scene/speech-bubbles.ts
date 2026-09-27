import * as Phaser from 'phaser';

import { SPEECH_BUBBLE } from '../model/board.consts';
import type { CrewLayer, Claim } from './crew-layer';

interface Bubble {
  readonly text: Phaser.GameObjects.Text;
  readonly tail: Phaser.GameObjects.Triangle;
  layer: CrewLayer | null;
  index: number;
  leftMs: number;
}

export class SpeechBubbles {
  readonly #bubbles: Bubble[] = [];
  readonly #text: (key: string) => string;
  readonly #width: () => number;
  readonly #heardLayers: CrewLayer[] = [];
  readonly #heardClaims: Claim[] = [];
  #nextInMs: number = SPEECH_BUBBLE.gapMs.min;

  constructor(
    scene: Phaser.Scene,
    depth: number,
    text: (key: string) => string,
    width: () => number
  ) {
    this.#text = text;
    this.#width = width;
    const { tail } = SPEECH_BUBBLE;
    for (let at = 0; at < SPEECH_BUBBLE.limit; at++) {
      this.#bubbles.push({
        text: scene.add
          .text(0, 0, '', {
            fontFamily: 'monospace',
            fontSize: SPEECH_BUBBLE.size,
            color: SPEECH_BUBBLE.ink,
            backgroundColor: SPEECH_BUBBLE.ground,
            padding: SPEECH_BUBBLE.pad,
            wordWrap: { width: SPEECH_BUBBLE.width },
          })
          .setOrigin(0.5, 1)
          .setDepth(depth)
          .setVisible(false),
        tail: scene.add
          .triangle(
            0,
            0,
            0,
            0,
            tail * 2,
            0,
            tail,
            tail,
            SPEECH_BUBBLE.groundHex
          )
          .setOrigin(0.5, 0)
          .setDepth(depth)
          .setVisible(false),
        layer: null,
        index: 0,
        leftMs: 0,
      });
    }
  }

  hear(layer: CrewLayer): void {
    for (const claim of layer.takeClaims()) {
      this.#heardLayers.push(layer);
      this.#heardClaims.push(claim);
    }
  }

  update(stepMs: number): void {
    this.#nextInMs -= stepMs;
    const heard = this.#heardClaims.length;
    const idle = this.#idle();
    if (this.#nextInMs <= 0 && idle && heard > 0) {
      const pick = Math.floor(Math.random() * heard);
      this.#speak(idle, this.#heardLayers[pick]!, this.#heardClaims[pick]!);
      const { min, max } = SPEECH_BUBBLE.gapMs;
      this.#nextInMs = min + Math.random() * (max - min);
    }
    this.#heardLayers.length = 0;
    this.#heardClaims.length = 0;

    for (const bubble of this.#bubbles) this.#follow(bubble, stepMs);
  }

  destroy(): void {
    for (const bubble of this.#bubbles) {
      bubble.text.destroy();
      bubble.tail.destroy();
    }
  }

  #idle(): Bubble | undefined {
    for (const bubble of this.#bubbles)
      if (bubble.layer === null) return bubble;
    return undefined;
  }

  #speak(bubble: Bubble, layer: CrewLayer, claim: Claim): void {
    bubble.layer = layer;
    bubble.index = claim.index;
    bubble.leftMs = SPEECH_BUBBLE.ms;
    bubble.text.setText(this.#text(claim.titleKey));
  }

  #follow(bubble: Bubble, stepMs: number): void {
    if (bubble.layer === null) return;
    bubble.leftMs -= stepMs;
    const anchor = bubble.layer.anchorOf(bubble.index);
    if (bubble.leftMs <= 0 || anchor === null) return this.#hush(bubble);

    const { text, tail } = bubble;
    const half = text.width / 2;
    const { edge, lift } = SPEECH_BUBBLE;
    const x = Math.min(
      Math.max(anchor.x, half + edge),
      this.#width() - half - edge
    );
    const y = anchor.y - lift;
    const alpha = Math.min(1, bubble.leftMs / SPEECH_BUBBLE.fadeMs);
    text.setPosition(x, y).setAlpha(alpha).setVisible(true);
    tail.setPosition(anchor.x, y).setAlpha(alpha).setVisible(true);
  }

  #hush(bubble: Bubble): void {
    bubble.layer = null;
    bubble.text.setVisible(false);
    bubble.tail.setVisible(false);
  }
}

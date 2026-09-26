import * as Phaser from 'phaser';

import { SPAWNERS } from '../../game/model/spawner.model';
import { LANE, LANE_ARRIVAL, LANE_PACK } from '../model/board.consts';
import { LPC_FOOT } from '../model/lpc-sheet.model';
import { spawnerSkins } from '../model/spawner-skin.model';
import { ATLAS_KEY, GLOW_FRAME } from '../util/board-atlas';
import { LpcSprite } from '../util/lpc-sprite';

interface Pace {
  readonly speed: number;
  readonly lane: number;
}

/** Stable per-walker pace and height, so a crowd does not march in step. */
function paceOf(adr: number, index: number): Pace {
  const noise = Math.sin((adr * 37 + index * 11 + 1) * 12.9898) * 43758.5453;
  const at = noise - Math.floor(noise);
  return { speed: 16 + at * 74, lane: at };
}

interface Walker {
  readonly bodies: readonly LpcSprite[];
  readonly scale: number;
  readonly speed: number;
  readonly lane: number;
  x: number;
  direction: 1 | -1;
  glow: Phaser.GameObjects.Image | null;
}

/**
 * The path above the board. Every line you buy puts another body on it, so
 * the lane is the receipt for the whole rail — crowd it and the board fills.
 */
export class TierSpawners {
  readonly #scene: Phaser.Scene;
  readonly #depth: number;
  readonly #lines = new Map<number, Walker[]>();
  readonly #counts = new Map<number, number>();
  readonly #origin = new Phaser.Math.Vector2();

  #left = 0;
  #right = 0;
  #top = 0;
  /** The first sync restores a save; only walkers bought after it arrive. */
  #primed = false;

  constructor(scene: Phaser.Scene, depth: number) {
    this.#scene = scene;
    this.#depth = depth;
  }

  layout(left: number, top: number, width: number): void {
    this.#left = left + LANE.margin;
    this.#right = left + width - LANE.margin;
    this.#top = top + LANE.top;
    for (const walkers of this.#lines.values()) {
      walkers.forEach((walker, index) => this.#place(index, walker));
    }
  }

  /** `counts` is the rail's ledger: one walker drawn per head bought, capped. */
  sync(counts: (adr: number) => number): void {
    for (const row of SPAWNERS) {
      const wanted = Math.min(counts(row.adr), LANE.perLine);
      if (this.#counts.get(row.adr) === wanted) continue;
      this.#counts.set(row.adr, wanted);
      this.#fit(row.adr, wanted, this.#primed);
    }
    this.#primed = true;
  }

  update(deltaMs: number): void {
    for (const walkers of this.#lines.values()) {
      for (const walker of walkers) {
        walker.x += (walker.speed * walker.direction * deltaMs) / 1000;
        if (walker.x < this.#left || walker.x > this.#right) {
          walker.direction = walker.direction < 0 ? 1 : -1;
          walker.x = Phaser.Math.Clamp(walker.x, this.#left, this.#right);
          this.#walk(walker);
        }
        this.#stand(walker);
      }
    }
  }

  /** Where a card of this line falls from: the chest of a body that dropped it. */
  originOf(adr: number): Phaser.Math.Vector2 | null {
    const walkers = this.#lines.get(adr);
    if (!walkers || walkers.length === 0) return null;
    const walker = walkers[Math.floor(Math.random() * walkers.length)];
    const body = walker?.bodies[0];
    if (!walker || !body) return null;
    return this.#origin.set(body.x, body.y - (LPC_FOOT * walker.scale) / 2);
  }

  destroy(): void {
    for (const walkers of this.#lines.values()) {
      for (const walker of walkers) this.#drop(walker);
    }
    this.#lines.clear();
    this.#counts.clear();
  }

  #fit(adr: number, wanted: number, announce: boolean): void {
    const walkers = this.#lines.get(adr) ?? [];
    this.#lines.set(adr, walkers);

    while (walkers.length > wanted) {
      const walker = walkers.pop();
      if (walker) this.#drop(walker);
    }
    while (walkers.length < wanted) {
      const index = walkers.length;
      const { speed, lane } = paceOf(adr, index);
      const skins = spawnerSkins(adr);
      const scale = LANE.scale * (skins.length > 1 ? LANE_PACK.scale : 1);
      const walker: Walker = {
        bodies: skins.map((skin) =>
          new LpcSprite(this.#scene, 0, 0, skin).setScale(scale)
        ),
        scale,
        speed,
        lane,
        x: 0,
        direction: index % 2 === 0 ? 1 : -1,
        glow: null,
      };
      walker.bodies.forEach((body, at) => {
        const offset = LANE_PACK.offsets[at] ?? LANE_PACK.offsets[0];
        body.anims.timeScale = speed / LANE.stride;
        body.setDepth(this.#depth + (lane * LANE.height + offset.y) / 1000);
      });
      walkers.push(walker);
      if (announce) this.#arrive(walker);
      this.#place(index, walker);
      this.#walk(walker);
    }
  }

  #arrive(walker: Walker): void {
    const glow = this.#scene.add
      .image(0, 0, ATLAS_KEY, GLOW_FRAME)
      .setTint(LANE_ARRIVAL.glowInk)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(this.#depth - 0.01);
    walker.glow = glow;
    this.#scene.tweens.add({
      targets: glow,
      alpha: { from: 1, to: 0, ease: 'Quad.easeIn' },
      scale: LANE_ARRIVAL.glowScale,
      duration: LANE_ARRIVAL.glowMs,
      repeat: LANE_ARRIVAL.glowPulses - 1,
      ease: 'Quad.easeOut',
      onComplete: () => {
        glow.destroy();
        if (walker.glow === glow) walker.glow = null;
      },
    });
    this.#scene.tweens.add({
      targets: walker.bodies,
      scale: { from: 0, to: walker.scale },
      duration: LANE_ARRIVAL.popMs,
      ease: 'Back.easeOut',
      easeParams: [LANE_ARRIVAL.overshoot],
    });
  }

  #place(index: number, walker: Walker): void {
    const span = Math.max(1, this.#right - this.#left);
    const spread = (index + 0.5) / Math.max(1, LANE.perLine);
    walker.x = this.#left + ((spread + walker.lane) % 1) * span;
    this.#stand(walker);
  }

  #stand(walker: Walker): void {
    const foot = this.#top + walker.lane * LANE.height;
    walker.bodies.forEach((body, at) => {
      const offset = LANE_PACK.offsets[at] ?? LANE_PACK.offsets[0];
      const dx = offset.x * walker.direction;
      body.setPosition(walker.x + dx, foot + offset.y);
    });
    walker.glow?.setPosition(walker.x, foot - (LPC_FOOT * walker.scale) / 2);
  }

  #walk(walker: Walker): void {
    for (const body of walker.bodies) {
      body.face(walker.direction < 0 ? 'left' : 'right').perform('walk');
    }
  }

  #drop(walker: Walker): void {
    this.#scene.tweens.killTweensOf(walker.bodies);
    for (const body of walker.bodies) body.destroy();
    if (walker.glow) {
      this.#scene.tweens.killTweensOf(walker.glow);
      walker.glow.destroy();
      walker.glow = null;
    }
  }
}

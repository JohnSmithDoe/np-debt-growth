import * as Phaser from 'phaser';

import type { FinaleAct } from '../../@shared/model/finale.model';
import { MODE_FADE_MS } from '../model/board.consts';
import {
  FINALE_ART,
  FINALE_CAST,
  FINALE_LIGHTS,
  FINALE_MOOD,
  FINALE_PHOTO,
} from '../model/finale.consts';
import type { LpcSkin } from '../model/lpc-sheet.model';
import { LPC_SKINS } from '../model/lpc-sheet.model';
import type { SceneDeps } from '../model/scene-deps.model';
import {
  loadCrewAtlas,
  loadFinaleAtlas,
  LpcSprite,
  registerCrewAnimations,
  registerFinaleAnimations,
  releaseFinaleAtlas,
} from '../util/lpc-sprite';
import { hash01 } from '../util/hash01';
import type { GlowStop } from '../util/radial-glow';
import { paintRadialGlow } from '../util/radial-glow';
import { CbScene } from './cb-scene';

type Role = 'junior' | 'senior' | 'manager' | 'spawner';

type Mood = 'wander' | 'sit' | 'dance' | 'chat' | 'cast';

interface Point {
  readonly x: number;
  readonly y: number;
}

interface Actor {
  readonly sprite: LpcSprite;
  readonly role: Role;
  readonly mood: Mood;
  readonly seed: number;
  readonly enterAt: number;
  entered: boolean;
  target: Point | null;
  speed: number;
  running: boolean;
  arrive: (() => void) | null;
  nextAt: number;
  busy: boolean;
  sitting: boolean;
}

interface Layout {
  readonly width: number;
  readonly height: number;
  readonly unit: number;
  readonly art: { readonly x: number; readonly y: number; readonly s: number };
  readonly rows: readonly number[];
}

const roleOf = (skin: LpcSkin): Role =>
  skin.startsWith('spawner')
    ? 'spawner'
    : skin.startsWith('manager')
      ? 'manager'
      : skin.startsWith('senior')
        ? 'senior'
        : 'junior';

function seeded(index: number): number {
  return hash01(index * 78.233 + 12.9898);
}

const LIGHT_GLOW: readonly GlowStop[] = [
  [0, 1],
  [0.5, 0.45],
  [1, 0],
];

const between = ([low, high]: readonly [number, number], at: number): number =>
  low + (high - low) * at;

export class FinaleScene extends CbScene {
  static readonly KEY = 'finale';

  #actors: Actor[] = [];
  #lights: Phaser.GameObjects.Image[] = [];
  #art?: Phaser.GameObjects.Image;
  #layout?: Layout;
  #elapsed = 0;
  #act: FinaleAct = 'roll';
  #curtainAt = 0;
  #nextCheer = 0;
  #nextCake: number = FINALE_MOOD.cakeEveryMs;

  constructor(deps: SceneDeps) {
    super(FinaleScene.KEY, deps);
  }

  preload(): void {
    loadCrewAtlas(this);
    loadFinaleAtlas(this);
    if (!this.textures.exists(FINALE_ART.key)) {
      this.load.image(FINALE_ART.key, FINALE_ART.url);
    }
  }

  create(): void {
    this.sharpen(true);
    registerCrewAnimations(this);
    registerFinaleAnimations(this);

    const carpet = this.textures.getPixel(2, 2, FINALE_ART.key);
    if (carpet) this.cameras.main.setBackgroundColor(carpet.color);
    this.textures
      .get(FINALE_ART.key)
      .setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.#art = this.add.image(0, 0, FINALE_ART.key).setOrigin(0, 0);

    this.#layout = this.#measure();
    this.#place(this.#layout);
    this.#cast();
    this.#bakeLight();
    this.#lights = FINALE_LIGHTS.inks.map((ink) =>
      this.add
        .image(0, 0, FINALE_LIGHTS.key)
        .setTint(ink)
        .setAlpha(FINALE_LIGHTS.alpha)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(FINALE_LIGHTS.depth)
    );

    const relayout = (): void => {
      this.#layout = this.#measure();
      this.#place(this.#layout);
      if (this.#act === 'curtain') this.#toPhoto();
    };
    this.scale.on(Phaser.Scale.Events.RESIZE, relayout);
    this.onLeave(() => {
      this.scale.off(Phaser.Scale.Events.RESIZE, relayout);
      this.#actors = [];
      this.#lights = [];
      releaseFinaleAtlas(this);
    });

    this.cameras.main.fadeIn(MODE_FADE_MS, 0, 0, 0);
  }

  override update(_time: number, delta: number): void {
    const step = this.cappedDelta(delta);
    this.#elapsed += step;
    const now = this.#elapsed;

    const act = this.deps.finaleAct();
    if (act === 'curtain' && this.#act !== 'curtain') {
      this.#act = 'curtain';
      this.#curtainAt = now;
      this.#nextCheer = now + FINALE_PHOTO.settleMs;
      this.#toPhoto();
    }

    for (const actor of this.#actors) {
      if (!actor.entered) {
        if (now >= actor.enterAt) this.#enter(actor);
        continue;
      }
      if (actor.target) this.#move(actor, step);
      else if (this.#act === 'roll' && !actor.busy && now >= actor.nextAt) {
        this.#mingle(actor, now);
      }
    }

    if (this.#act === 'roll' && now >= this.#nextCake) this.#cake(now);
    if (this.#act === 'curtain') this.#curtainCall(now);
    this.#swing(now);
  }

  #measure(): Layout {
    const width = this.viewWidth;
    const height = this.viewHeight;
    const unit = height >= FINALE_CAST.bigFrom ? 1.5 : 1;
    const front = height - FINALE_PHOTO.bottom * unit;
    const rows = [0, 1, 2, 3].map(
      (row) => front - row * FINALE_PHOTO.rowGap * unit
    );
    const s = Math.min(
      (height * FINALE_ART.heightShare) / FINALE_ART.height,
      (width * FINALE_ART.widthShare) / FINALE_ART.width
    );
    const back = rows[rows.length - 1]!;
    return {
      width,
      height,
      unit,
      art: {
        x: width / 2 - (FINALE_ART.width * s) / 2,
        y: back - 6 * unit - FINALE_ART.footY * s,
        s,
      },
      rows,
    };
  }

  #place(layout: Layout): void {
    this.#art
      ?.setPosition(layout.art.x, layout.art.y)
      .setScale(layout.art.s)
      .setDepth(0);
    for (const actor of this.#actors) actor.sprite.setScale(layout.unit);
  }

  #toScreen(x: number, y: number): Point {
    const { art } = this.#layout!;
    return { x: art.x + x * art.s, y: art.y + y * art.s };
  }

  #cast(): void {
    const order = LPC_SKINS.map((skin, index) => ({ skin, index })).sort(
      (a, b) => seeded(a.index + 500) - seeded(b.index + 500)
    );
    this.#actors = order.map(({ skin, index }, turn) => {
      const role = roleOf(skin);
      const seed = seeded(index);
      const sprite = new LpcSprite(this, -FINALE_CAST.edge, 0, skin)
        .setScale(this.#layout!.unit)
        .setVisible(false);
      return {
        sprite,
        role,
        mood: this.#moodFor(role, seed),
        seed,
        enterAt: turn * FINALE_CAST.enterEveryMs,
        entered: false,
        target: null,
        speed: 0,
        running: false,
        arrive: null,
        nextAt: 0,
        busy: false,
        sitting: false,
      };
    });
  }

  #moodFor(role: Role, seed: number): Mood {
    switch (role) {
      case 'spawner':
        return 'cast';
      case 'manager':
        return 'chat';
      case 'senior':
        return 'dance';
      case 'junior':
        if (seed < FINALE_MOOD.sitShare) return 'sit';
        if (seed < FINALE_MOOD.sitShare + FINALE_MOOD.danceShare) {
          return 'dance';
        }
        return 'wander';
    }
  }

  #spotFor(actor: Actor, pick: number): Point {
    const layout = this.#layout!;
    const unit = layout.unit;
    const spread = (at: number, width: number): number =>
      (at - 0.5) * width * unit;
    switch (actor.mood) {
      case 'cast': {
        const decks = this.#toScreen(FINALE_ART.decks.x, FINALE_ART.decks.y);
        return this.#clamp({
          x: decks.x + spread(pick, 150),
          y: decks.y + 20 * unit + seeded(pick * 91) * 50 * unit,
        });
      }
      case 'chat': {
        const buffet = this.#toScreen(FINALE_ART.buffet.x, FINALE_ART.buffet.y);
        return this.#clamp({
          x: buffet.x + spread(pick, 140),
          y: buffet.y + seeded(pick * 37) * 40 * unit,
        });
      }
      case 'dance':
        return this.#clamp({
          x: layout.width / 2 + spread(pick, 360),
          y: layout.rows[0]! - seeded(pick * 53) * 90 * unit,
        });
      default:
        return this.#floorSpot(pick);
    }
  }

  #floorSpot(pick: number): Point {
    const layout = this.#layout!;
    const left = this.#toScreen(FINALE_ART.left, 0).x;
    const right = this.#toScreen(FINALE_ART.right, 0).x;
    const top = layout.rows[3]!;
    const beside = seeded(pick * 17) < 0.35;
    const across = seeded(pick * 29);
    if (beside) {
      const onLeft = across < 0.5;
      const from = onLeft ? FINALE_CAST.margin : right;
      const to = onLeft ? left : layout.width - FINALE_CAST.margin;
      return this.#clamp({
        x: from + (to - from) * seeded(pick * 43),
        y: top - 140 * layout.unit + seeded(pick * 7) * 140 * layout.unit,
      });
    }
    return this.#clamp({
      x: FINALE_CAST.margin + (layout.width - 2 * FINALE_CAST.margin) * across,
      y: top + (layout.rows[0]! - top) * seeded(pick * 61),
    });
  }

  #clamp(point: Point): Point {
    const layout = this.#layout!;
    return {
      x: Phaser.Math.Clamp(
        point.x,
        FINALE_CAST.margin,
        layout.width - FINALE_CAST.margin
      ),
      y: Phaser.Math.Clamp(point.y, layout.height * 0.35, layout.rows[0]!),
    };
  }

  #enter(actor: Actor): void {
    actor.entered = true;
    const spot = this.#spotFor(actor, actor.seed);
    const fromLeft = spot.x < this.#layout!.width / 2;
    actor.sprite
      .setPosition(
        fromLeft ? -FINALE_CAST.edge : this.#layout!.width + FINALE_CAST.edge,
        spot.y
      )
      .setVisible(true);
    this.#goTo(actor, spot, true, () => this.#settle(actor));
  }

  #goTo(
    actor: Actor,
    target: Point,
    running: boolean,
    arrive: () => void
  ): void {
    actor.target = target;
    actor.running = running;
    actor.speed =
      (running ? FINALE_CAST.runSpeed : FINALE_CAST.walkSpeed) *
      this.#layout!.unit;
    actor.arrive = arrive;
    actor.busy = false;
    actor.sitting = false;
  }

  #move(actor: Actor, step: number): void {
    const target = actor.target!;
    const sprite = actor.sprite;
    const dx = target.x - sprite.x;
    const dy = target.y - sprite.y;
    const distance = Math.hypot(dx, dy);
    const reach = (actor.speed * step) / 1000;

    if (distance <= Math.max(reach, FINALE_CAST.arriveWithin)) {
      sprite.setPosition(target.x, target.y).setDepth(target.y);
      actor.target = null;
      const arrive = actor.arrive;
      actor.arrive = null;
      arrive?.();
      return;
    }

    sprite
      .setPosition(
        sprite.x + (dx / distance) * reach,
        sprite.y + (dy / distance) * reach
      )
      .setDepth(sprite.y);
    if (actor.running) {
      sprite.aim(dx, 0).playFinale(dx < 0 ? 'run left' : 'run right');
    } else {
      sprite.aim(dx, dy).perform('walk');
    }
  }

  #settle(actor: Actor): void {
    const sprite = actor.sprite.face('down');
    const now = this.#elapsed;
    switch (actor.mood) {
      case 'cast':
        sprite.playFinale('spellcast down');
        actor.busy = true;
        break;
      case 'sit':
        sprite.holdFinale('sit down', actor.seed < 0.12 ? 0 : 1);
        actor.sitting = true;
        actor.busy = true;
        break;
      default:
        sprite.perform('idle');
        actor.nextAt = now + between(FINALE_MOOD.wanderRestMs, actor.seed);
    }
  }

  #mingle(actor: Actor, now: number): void {
    const pick = seeded(now + actor.seed * 1000);
    switch (actor.mood) {
      case 'wander':
        this.#goTo(actor, this.#floorSpot(pick), false, () =>
          this.#settle(actor)
        );
        return;
      case 'dance':
        actor.sprite.playFinale('jump down', true);
        actor.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () =>
          actor.sprite.perform('idle')
        );
        actor.nextAt = now + between(FINALE_MOOD.danceEveryMs, pick);
        return;
      case 'chat':
        if (pick < 0.5) {
          actor.sprite.holdFinale('emote down', Math.floor(pick * 6));
        } else {
          actor.sprite.aim(pick < 0.75 ? -1 : 1, 0).perform('idle');
        }
        actor.nextAt = now + between(FINALE_MOOD.chatPoseMs, pick);
        return;
      default:
        return;
    }
  }

  #cake(now: number): void {
    this.#nextCake = now + FINALE_MOOD.cakeEveryMs;
    const idle = this.#actors.filter(
      (actor) =>
        actor.entered && actor.mood === 'wander' && !actor.target && !actor.busy
    );
    const actor = idle[Math.floor(seeded(now) * idle.length)];
    if (!actor) return;
    actor.busy = true;
    actor.sprite.playFinale('hurt down', true);
    this.floatPayout(
      actor.sprite.x,
      actor.sprite.y - 64 * this.#layout!.unit,
      this.deps.text('finale.stage.cake'),
      { size: '13px' }
    );
    this.time.delayedCall(FINALE_MOOD.cakeLieMs, () => {
      if (this.#act !== 'roll' || actor.target) return;
      actor.busy = false;
      actor.sprite.perform('idle');
      actor.nextAt = this.#elapsed;
    });
  }

  #toPhoto(): void {
    const layout = this.#layout!;
    const by = (roles: readonly Role[]): Actor[] =>
      this.#actors
        .filter((actor) => roles.includes(actor.role))
        .sort((a, b) => a.sprite.skin.localeCompare(b.sprite.skin));
    const juniors = by(['junior']);
    const half = Math.ceil(juniors.length / 2);
    const rows: readonly (readonly Actor[])[] = [
      juniors.slice(0, half),
      juniors.slice(half),
      by(['senior']),
      by(['manager', 'spawner']),
    ];

    rows.forEach((row, index) => {
      const spacing = Math.min(
        FINALE_PHOTO.spacing * layout.unit,
        (layout.width * FINALE_PHOTO.widthShare) / Math.max(row.length, 1)
      );
      const start = layout.width / 2 - ((row.length - 1) * spacing) / 2;
      const stagger = index % 2 === 1 ? spacing / 2 : 0;
      row.forEach((actor, at) => {
        const spot = {
          x: Phaser.Math.Clamp(
            start + at * spacing + stagger,
            FINALE_CAST.margin / 2,
            layout.width - FINALE_CAST.margin / 2
          ),
          y: layout.rows[index]!,
        };
        const late = !actor.entered;
        if (late) {
          actor.entered = true;
          actor.sprite
            .setPosition(
              spot.x < layout.width / 2
                ? -FINALE_CAST.edge
                : layout.width + FINALE_CAST.edge,
              spot.y
            )
            .setVisible(true);
        }
        this.#goTo(actor, spot, late, () => {
          actor.busy = true;
          actor.sprite.face('down');
          if (index === 0) {
            actor.sprite.holdFinale('sit down', 1);
            actor.sitting = true;
          } else {
            actor.sprite.perform('idle');
          }
        });
      });
    });
  }

  #curtainCall(now: number): void {
    if (now - this.#curtainAt > FINALE_PHOTO.settleMs) {
      for (const actor of this.#actors) {
        if (actor.target) actor.speed = FINALE_CAST.runSpeed * 4;
      }
    }
    if (now < this.#nextCheer) return;
    this.#nextCheer = now + FINALE_PHOTO.cheerEveryMs;
    for (const actor of this.#actors) {
      if (actor.target || actor.sitting) continue;
      const sprite = actor.sprite;
      if (seeded(now + actor.seed * 77) < FINALE_PHOTO.cheerPoseShare) {
        sprite.holdFinale('emote down', 1);
        this.time.delayedCall(FINALE_PHOTO.cheerPoseMs, () => {
          if (!actor.target) sprite.perform('idle');
        });
      } else {
        sprite.playFinale('jump down', true);
        sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () =>
          sprite.perform('idle')
        );
      }
    }
  }

  #bakeLight(): void {
    if (this.textures.exists(FINALE_LIGHTS.key)) return;
    const size = FINALE_LIGHTS.size;
    const texture = this.textures.createCanvas(FINALE_LIGHTS.key, size, size);
    const ctx = texture?.getContext();
    if (!texture || !ctx) return;
    paintRadialGlow(ctx, 0, 0, size, LIGHT_GLOW);
    texture.refresh();
  }

  #swing(now: number): void {
    const layout = this.#layout!;
    const top = layout.rows[3]! - 120 * layout.unit;
    const floor = layout.rows[0]! - top;
    const scale = (FINALE_LIGHTS.radius * 2 * layout.unit) / FINALE_LIGHTS.size;
    const t = now / 1000;
    this.#lights.forEach((light, index) => {
      const phase = index * 1.7;
      light
        .setPosition(
          layout.width / 2 +
            Math.sin(t * (0.23 + index * 0.05) + phase) * layout.width * 0.45,
          top + floor / 2 + Math.cos(t * (0.31 + index * 0.04) + phase) * floor
        )
        .setScale(scale);
    });
  }
}

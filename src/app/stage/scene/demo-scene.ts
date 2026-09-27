import * as Phaser from 'phaser';

import { LOGICAL_BOARD } from '../../game/model/geometry';
import { BOARD_TEXT, CREW_BLOCK, CREW_SCALE } from '../model/board.consts';
import type { LpcBlock } from '../model/lpc-sheet.model';
import { LPC_SKINS } from '../model/lpc-sheet.model';
import {
  LpcSprite,
  loadCrewAtlas,
  registerCrewAnimations,
} from '../util/lpc-sprite';
import { FloorLayer } from './floor-layer';

const FLOOR_DIR = 'assets/board/demo';
const FLOOR_MANIFEST = 'cb-demo-floors';
const FLOOR_PREFIX = 'cb-demo-floor:';

const START_COUNT = 24;
const ADD_PER_CLICK = 8;
const MAX_COUNT = 200;

const ZOOM = { min: 0.2, max: 4, step: 0.1 };

const SPEED = { min: 40, max: 95 };
const PAUSE_MS = { min: 500, max: 2600 };
const ARRIVED = 2;
const MARGIN = 40;

interface Wanderer {
  readonly sprite: LpcSprite;
  readonly speed: number;
  x: number;
  y: number;
  toX: number;
  toY: number;
  block: LpcBlock;
  waitMs: number;
}

const between = (min: number, max: number): number =>
  min + Math.random() * (max - min);

const isPng = (name: unknown): name is string =>
  typeof name === 'string' && name.endsWith('.png');

export class DemoScene extends Phaser.Scene {
  static readonly KEY = 'demo';

  #scale = 1;
  #offX = 0;
  #offY = 0;
  #width = 0;
  #height = 0;

  #floor?: FloorLayer;
  #readout?: Phaser.GameObjects.Text;
  readonly #crew: Wanderer[] = [];

  #floors: string[] = [];
  #at = 0;
  #zoom = 1;

  #onResize = (): void => this.#layout();
  #onPointerDown = (): void => this.#spawn(ADD_PER_CLICK);
  #onKey = (event: KeyboardEvent): void => this.#command(event.key);

  constructor() {
    super(DemoScene.KEY);
  }

  preload(): void {
    loadCrewAtlas(this);
    FloorLayer.preload(this);

    this.load.json(FLOOR_MANIFEST, `${FLOOR_DIR}/floors.json`);
    this.load.once(`filecomplete-json-${FLOOR_MANIFEST}`, () => {
      const listed: unknown = this.cache.json.get(FLOOR_MANIFEST);
      this.#floors = Array.isArray(listed) ? listed.filter(isPng) : [];
      for (const file of this.#floors) {
        this.load.image(FLOOR_PREFIX + file, `${FLOOR_DIR}/${file}`);
      }
    });
  }

  create(): void {
    this.cameras.main.setOrigin(0, 0).setZoom(1 / (this.scale.zoom || 1));
    registerCrewAnimations(this);
    this.#floor = new FloorLayer(this, 0);
    this.#readout = this.add
      .text(12, 10, '', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: BOARD_TEXT.body,
        lineSpacing: 3,
      })
      .setDepth(100);

    this.#showFloor(0);
    this.#spawn(START_COUNT);
    this.#layout();

    this.scale.on(Phaser.Scale.Events.RESIZE, this.#onResize);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.#onPointerDown);
    this.input.keyboard?.on(
      Phaser.Input.Keyboard.Events.ANY_KEY_DOWN,
      this.#onKey
    );
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.#teardown());
  }

  override update(_time: number, delta: number): void {
    const step = Math.min(delta, 250);
    for (const one of this.#crew) this.#step(one, step);
    this.#readout?.setText([
      `floor ${this.#floors.length ? this.#at + 1 : 0}/${this.#floors.length}  ${this.#floors[this.#at] ?? '(none listed)'}`,
      `zoom ${this.#zoom.toFixed(1)}×  ·  fit ${this.#scale.toFixed(2)}  ·  ${this.#crew.length} on the floor`,
      `← → floor   ↑ ↓ zoom   R reset   click/A add crew   X clear`,
    ]);
  }

  #command(key: string): void {
    switch (key) {
      case 'ArrowRight':
        this.#showFloor(this.#at + 1);
        break;
      case 'ArrowLeft':
        this.#showFloor(this.#at - 1);
        break;
      case 'ArrowUp':
        this.#setZoom(this.#zoom + ZOOM.step);
        break;
      case 'ArrowDown':
        this.#setZoom(this.#zoom - ZOOM.step);
        break;
      case 'r':
      case 'R':
        this.#setZoom(1);
        break;
      case 'a':
      case 'A':
        this.#spawn(ADD_PER_CLICK);
        break;
      case 'x':
      case 'X':
        this.#clear();
        break;
    }
  }

  #showFloor(at: number): void {
    const count = this.#floors.length;
    if (count === 0) return;
    this.#at = ((at % count) + count) % count;
    const file = this.#floors[this.#at];
    if (file) this.#floor?.texture(FLOOR_PREFIX + file);
    this.#place();
  }

  #setZoom(to: number): void {
    this.#zoom = Math.min(ZOOM.max, Math.max(ZOOM.min, to));
    this.#place();
  }

  #step(one: Wanderer, deltaMs: number): void {
    if (one.waitMs > 0) {
      one.waitMs -= deltaMs;
      if (one.waitMs <= 0) this.#retarget(one);
    } else {
      const dx = one.toX - one.x;
      const dy = one.toY - one.y;
      const distance = Math.hypot(dx, dy);
      if (distance <= ARRIVED) {
        one.waitMs = between(PAUSE_MS.min, PAUSE_MS.max);
        one.block =
          Math.random() < 0.5 ? CREW_BLOCK.waiting : CREW_BLOCK.working;
      } else {
        const move = Math.min(distance, (one.speed * deltaMs) / 1000);
        one.x += (dx / distance) * move;
        one.y += (dy / distance) * move;
        one.sprite.aim(dx, dy);
      }
    }

    one.sprite
      .setPosition(
        this.#offX + one.x * this.#scale,
        this.#offY + one.y * this.#scale
      )
      .perform(one.block);
  }

  #retarget(one: Wanderer): void {
    one.toX = between(MARGIN, LOGICAL_BOARD.width - MARGIN);
    one.toY = between(MARGIN, LOGICAL_BOARD.height - MARGIN);
    one.block = CREW_BLOCK.walking;
  }

  #spawn(count: number): void {
    for (let i = 0; i < count && this.#crew.length < MAX_COUNT; i++) {
      const skin =
        LPC_SKINS[Math.floor(Math.random() * LPC_SKINS.length)] ??
        LPC_SKINS[0]!;
      const x = between(MARGIN, LOGICAL_BOARD.width - MARGIN);
      const y = between(MARGIN, LOGICAL_BOARD.height - MARGIN);
      const sprite = new LpcSprite(this, 0, 0, skin);
      sprite.setDepth(10).setScale(CREW_SCALE);
      const one: Wanderer = {
        sprite,
        speed: between(SPEED.min, SPEED.max),
        x,
        y,
        toX: x,
        toY: y,
        block: CREW_BLOCK.walking,
        waitMs: 0,
      };
      this.#retarget(one);
      this.#crew.push(one);
    }
    this.#crew
      .sort((a, b) => a.y - b.y)
      .forEach((one, at) => one.sprite.setDepth(10 + at));
  }

  #clear(): void {
    for (const one of this.#crew) one.sprite.destroy();
    this.#crew.length = 0;
  }

  #place(): void {
    const scale = this.#scale * this.#zoom;
    this.#floor?.layout(
      scale,
      (this.#width - LOGICAL_BOARD.width * scale) / 2,
      (this.#height - LOGICAL_BOARD.height * scale) / 2
    );
  }

  #layout(): void {
    const width = Math.max(1, this.scale.width * this.scale.zoom);
    const height = Math.max(1, this.scale.height * this.scale.zoom);
    if (width === this.#width && height === this.#height) return;
    this.#width = width;
    this.#height = height;

    this.#scale = Math.min(
      width / LOGICAL_BOARD.width,
      height / LOGICAL_BOARD.height
    );
    this.#offX = (width - LOGICAL_BOARD.width * this.#scale) / 2;
    this.#offY = (height - LOGICAL_BOARD.height * this.#scale) / 2;
    this.#place();
  }

  #teardown(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.#onResize);
    this.input.off(Phaser.Input.Events.POINTER_DOWN, this.#onPointerDown);
    this.input.keyboard?.off(
      Phaser.Input.Keyboard.Events.ANY_KEY_DOWN,
      this.#onKey
    );
    this.#clear();
    this.#floor?.destroy();
  }
}

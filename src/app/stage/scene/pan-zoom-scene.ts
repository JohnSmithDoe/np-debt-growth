import * as Phaser from 'phaser';

import { HOLD_REPEAT, holdGapMs } from '../../@shared/model/hold-repeat.model';
import { SCREEN_INK } from '../model/board.consts';
import type { HitRect } from '../model/hit-rect.model';
import type { SceneDeps } from '../model/scene-deps.model';
import { LabelPool } from '../util/label-pool';
import { buildPixelFont } from '../util/pixel-font';
import { CbScene } from './cb-scene';

const PAD = 48;
const DRAG_SLOP = 6;

const ZOOM = { min: 0.4, max: 2, step: 0.02, native: 1 } as const;
const ZOOM_LABELS = 0.8;

const LABEL_SCALES = [1, 2] as const;

const LABEL_DEPTH = 20;
const FLASH_DEPTH = 40;

export abstract class PanZoomScene extends CbScene {
  #zoom: number = ZOOM.native;
  #hover: string | null = null;
  #dragging = false;
  #travel = 0;
  #lastX = 0;
  #lastY = 0;
  #holding?: Phaser.Time.TimerEvent;
  #held = 0;
  #labels?: LabelPool;
  #canvas?: HTMLCanvasElement;

  protected constructor(key: string, deps: SceneDeps) {
    super(key, deps);
  }

  protected abstract get content(): {
    readonly width: number;
    readonly height: number;
  };

  protected abstract hitAt(x: number, y: number): HitRect | null;

  protected abstract tap(target: HitRect): boolean;

  protected abstract redraw(): void;

  protected abstract redrawHover(): void;

  protected get hovered(): string | null {
    return this.#hover;
  }

  protected labelsVisible(scale = 1): boolean {
    return this.#zoom * scale >= ZOOM_LABELS;
  }

  #legible(): string {
    return LABEL_SCALES.map((scale) => this.labelsVisible(scale)).join();
  }

  protected get zoom(): number {
    return this.#zoom;
  }

  protected fitTo(rect: HitRect, margin: number): void {
    const camera = this.cameras.main;
    const fit =
      Math.min(
        camera.width / (rect.width + margin * 2),
        camera.height / (rect.height + margin * 2)
      ) / this.backing;
    const was = this.#legible();
    this.#zoom = Phaser.Math.Clamp(fit, ZOOM_LABELS, ZOOM.native);
    camera.setZoom(this.#zoom * this.backing);
    camera.centerOn(rect.x + rect.width / 2, rect.y + rect.height / 2);
    if (was !== this.#legible()) this.redraw();
  }

  protected frame(): void {
    buildPixelFont(this);
    this.#canvas = this.game.canvas;
    this.#labels = new LabelPool(this, LABEL_DEPTH);
    this.cameras.main.setBackgroundColor(SCREEN_INK.ground);
    this.cameras.main.setZoom(this.#zoom * this.backing);
    this.reframe();
    this.cameras.main.setScroll(
      this.cameras.main.getBounds().x,
      this.cameras.main.getBounds().y
    );
    this.#bindInput();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.#onResize);
    this.onLeave(this.#release);
  }

  protected reframe(): void {
    const camera = this.cameras.main;
    const width = Math.max(this.content.width + PAD * 2, this.viewWidth);
    const height = Math.max(this.content.height + PAD * 2, this.viewHeight);
    camera.setBounds(
      (this.content.width - width) / 2,
      (this.content.height - height) / 2,
      width,
      height
    );
  }

  #onResize = (): void => {
    if (!this.cameras?.main) return;
    this.cameras.main.setZoom(this.#zoom * this.backing);
    this.reframe();
  };

  #onDown = (pointer: Phaser.Input.Pointer): void => {
    this.#dragging = true;
    this.#travel = 0;
    this.#lastX = pointer.x;
    this.#lastY = pointer.y;
    const hit = this.hitAt(pointer.worldX, pointer.worldY);
    if (hit) this.#hold(hit, HOLD_REPEAT.delayMs);
  };

  #hold(target: HitRect, delayMs: number): void {
    this.#holding = this.time.delayedCall(delayMs, () => {
      if (this.#travel > DRAG_SLOP || !this.tap(target)) return this.#letGo();
      this.flash(target);
      this.#held += 1;
      this.#hold(target, holdGapMs(this.#held));
    });
  }

  #letGo(): void {
    this.#holding?.remove();
    this.#holding = undefined;
    this.#held = 0;
  }

  #onMove = (pointer: Phaser.Input.Pointer): void => {
    if (this.#dragging) return this.#drag(pointer);

    const id = this.hitAt(pointer.worldX, pointer.worldY)?.id ?? null;
    if (id === this.#hover) return;
    this.#hover = id;
    this.input.setDefaultCursor(id ? 'pointer' : 'default');
    this.redrawHover();
  };

  #drag(pointer: Phaser.Input.Pointer): void {
    const dx = pointer.x - this.#lastX;
    const dy = pointer.y - this.#lastY;
    this.#lastX = pointer.x;
    this.#lastY = pointer.y;
    this.#travel += Math.abs(dx) + Math.abs(dy);
    const camera = this.cameras.main;
    camera.setScroll(
      camera.scrollX - dx / camera.zoom,
      camera.scrollY - dy / camera.zoom
    );
  }

  #onUp = (pointer: Phaser.Input.Pointer): void => {
    this.#dragging = false;
    const held = this.#held > 0;
    this.#letGo();
    if (held || this.#travel > DRAG_SLOP) return;

    const hit = this.hitAt(pointer.worldX, pointer.worldY);
    if (!hit) return;
    if (!this.tap(hit)) return;
    this.flash(hit);
  };

  #onWheel = (
    pointer: Phaser.Input.Pointer,
    _over: Phaser.GameObjects.GameObject[],
    _dx: number,
    dy: number
  ): void => {
    this.#setZoom(
      this.#zoom * (dy > 0 ? 1 - ZOOM.step : 1 + ZOOM.step),
      pointer
    );
  };

  #setZoom(to: number, pointer: Phaser.Input.Pointer): void {
    const zoom = Phaser.Math.Clamp(to, ZOOM.min, ZOOM.max);
    if (zoom === this.#zoom) return;
    const was = this.#legible();
    this.#zoom = zoom;

    const camera = this.cameras.main;
    camera.setZoom(zoom * this.backing);
    const halfWidth = camera.width / 2;
    const halfHeight = camera.height / 2;
    camera.setScroll(
      pointer.worldX - halfWidth - (pointer.x - halfWidth) / camera.zoom,
      pointer.worldY - halfHeight - (pointer.y - halfHeight) / camera.zoom
    );
    if (was !== this.#legible()) this.redraw();
  }

  protected label(
    x: number,
    y: number,
    text: string,
    colour: number,
    room = Infinity,
    scale = 1
  ): void {
    if (!this.labelsVisible(scale)) return;
    this.#labels?.write(x, y, text, colour, room, scale);
  }

  protected releaseLabels(): void {
    this.#labels?.release();
  }

  protected flash(rect: HitRect): void {
    const ring = this.add
      .rectangle(
        rect.x + rect.width / 2,
        rect.y + rect.height / 2,
        rect.width,
        rect.height
      )
      .setStrokeStyle(2, SCREEN_INK.pipFull)
      .setFillStyle()
      .setDepth(FLASH_DEPTH);
    this.tweens.add({
      targets: ring,
      alpha: 0,
      scale: 1.15,
      duration: 260,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  #bindInput(): void {
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.#onDown);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.#onMove);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.#onUp);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.#onUp);
    this.input.on('wheel', this.#onWheel);
  }

  #release = (): void => {
    this.#letGo();
    this.scale.off(Phaser.Scale.Events.RESIZE, this.#onResize);
    if (this.#canvas) this.#canvas.style.cursor = 'default';
    this.#hover = null;
    this.#labels?.clear();
    this.#labels = undefined;
  };
}

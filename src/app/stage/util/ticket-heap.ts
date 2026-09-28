import * as Phaser from 'phaser';

import type { Board, BoardTicket } from '../../game/model/board.model';
import type { TicketTypeId } from '../../game/model/ticket.model';
import { TICKET_TYPES } from '../../game/model/ticket.model';
import { fadeOf } from '../../game/util/board';
import {
  AUTO_CLOSE_RAMP,
  BOARD_TEXT,
  GOLD_GLOW,
  GOLD_GLOW_CAPACITY,
  HEAP_CAPACITY,
  RARE_CAPACITY,
  REFUSAL_BOUNCE,
  RARE_LIFT,
  RARE_TITLE_OFFSET,
  RARE_TITLE_WIDTH,
  UNDER_TEST,
  WONT_FIX_FADE,
} from '../model/board.consts';
import { spawnerFor } from '../../game/model/spawner.model';
import { LOGICAL_BOARD } from '../../game/model/geometry';
import {
  ATLAS_KEY,
  cardFrame,
  goldFrame,
  GLOW_FRAME,
  GOLD_INK,
  voteFrame,
} from './board-atlas';

export const NONE = -1;

function voted(ticket: BoardTicket): boolean {
  return ticket.spBonus > 0;
}

function sinkOf(fade: number): number {
  return (1 - fade) * WONT_FIX_FADE.sink;
}

/** Hand-only cards sit above falling work (the board's flyers are at 20) so a called card is never buried. */
const DEPTH = { goldGlow: 9, layer: 10, glow: 20.5, rare: 21 } as const;
const RARE_PULSE = 1.09;

/** SpriteGPULayer's vertex shader scales the stored tint mode by 255. */
const GPU_TINT_MODE = (mode: number): number => mode / 255;

type MemberAnimation = Phaser.Types.GameObjects.SpriteGPULayer.MemberAnimation;

function glowPulse(base: number, amplitude: number): MemberAnimation {
  return {
    ease: 'Sine.easeInOut',
    duration: GOLD_GLOW.ms,
    delay: 0,
    base,
    amplitude,
  };
}

export class TicketHeap {
  readonly #scene: Phaser.Scene;
  readonly #layer: Phaser.GameObjects.SpriteGPULayer;
  readonly #member: Partial<Phaser.Types.GameObjects.SpriteGPULayer.Member> =
    {};
  readonly #goldGlows: Phaser.GameObjects.SpriteGPULayer;
  readonly #glowMember: Partial<Phaser.Types.GameObjects.SpriteGPULayer.Member> =
    {};
  readonly #glowScaleX = glowPulse(GOLD_GLOW.scaleX, GOLD_GLOW.swell);
  readonly #glowScaleY = glowPulse(GOLD_GLOW.scaleY, GOLD_GLOW.swell);
  readonly #glowAlpha = glowPulse(0, 0);
  readonly #underTestPulse = {
    ...glowPulse(UNDER_TEST.blend, UNDER_TEST.pulse),
    duration: UNDER_TEST.pulseMs,
  };
  readonly #autoCloseRamp: MemberAnimation = {
    base: 0,
    amplitude: AUTO_CLOSE_RAMP.peak,
    duration: 0,
    ease: 'Linear',
    loop: false,
  };
  readonly #glowFree: number[] = [];
  readonly #glowSlot = new Map<number, number>();

  readonly #free: number[] = [];
  readonly #slotOf = new Map<number, number>();
  readonly #drawn = new Map<number, BoardTicket>();
  readonly #airborne = new Set<number>();
  readonly #rareSlot = new Map<number, number>();

  readonly #bouncing = new Map<number, number>();
  readonly #atlas: Phaser.Textures.CanvasTexture;

  readonly #rareCards: Phaser.GameObjects.Image[] = [];
  readonly #rareTitles: Phaser.GameObjects.Text[] = [];
  readonly #text: (key: string) => string;
  readonly #rareGlows: Phaser.GameObjects.Image[] = [];
  readonly #rareFree: number[] = [];

  #autoClosed: ReadonlySet<TicketTypeId> = new Set();
  #underTest: number | null = null;

  #scaleX = 1;
  #scaleY = 1;
  #offX = 0;
  #offY = 0;

  constructor(scene: Phaser.Scene, text: (key: string) => string) {
    this.#scene = scene;
    this.#text = text;
    this.#atlas = scene.textures.get(
      ATLAS_KEY
    ) as Phaser.Textures.CanvasTexture;
    this.#layer = scene.add
      .spriteGPULayer(this.#atlas, HEAP_CAPACITY)
      .setDepth(DEPTH.layer);
    for (let i = HEAP_CAPACITY - 1; i >= 0; i--) {
      this.#layer.addMember(this.#hiddenMember());
      this.#free.push(i);
    }

    this.#goldGlows = scene.add
      .spriteGPULayer(this.#atlas, GOLD_GLOW_CAPACITY)
      .setDepth(DEPTH.goldGlow)
      .setBlendMode(Phaser.BlendModes.ADD);
    for (let i = GOLD_GLOW_CAPACITY - 1; i >= 0; i--) {
      this.#goldGlows.addMember(this.#hiddenGlow());
      this.#glowFree.push(i);
    }

    for (let slot = 0; slot < RARE_CAPACITY; slot++) {
      this.#rareGlows.push(this.#buildGlow());
      this.#rareCards.push(this.#buildRareCard());
      this.#rareTitles.push(this.#buildRareTitle());
      this.#rareFree.push(slot);
    }
  }

  autoCloses(types: ReadonlySet<TicketTypeId>): void {
    this.#autoClosed = types;
  }

  underTest(line: number | null): void {
    if (line === this.#underTest) return;
    this.#underTest = line;
    this.redraw();
  }

  layout(scaleX: number, scaleY: number, offX: number, offY: number): void {
    this.#scaleX = scaleX;
    this.#scaleY = scaleY;
    this.#offX = offX;
    this.#offY = offY;
    for (const ticket of this.#drawn.values()) this.#draw(ticket);
  }

  redraw(): void {
    for (const ticket of this.#drawn.values()) this.#draw(ticket);
  }

  px(x: number): number {
    return this.#offX + x * this.#scaleX;
  }

  py(y: number): number {
    return this.#offY + y * this.#scaleY;
  }

  sync(
    board: Board,
    onLand: (
      id: number,
      type: TicketTypeId,
      x: number,
      y: number,
      voteMask: number
    ) => boolean,
    onGone: (
      id: number,
      type: TicketTypeId,
      x: number,
      y: number,
      voted: boolean,
      alpha: number
    ) => void
  ): void {
    for (const ticket of board.tickets) {
      if (ticket.lifeLeftMs === 0 && this.#drawn.has(ticket.id)) {
        this.#draw(ticket);
        continue;
      }
      if (this.#drawn.has(ticket.id)) continue;
      const slot = this.#free.pop();
      if (slot === undefined) continue;
      this.#slotOf.set(ticket.id, slot);
      this.#drawn.set(ticket.id, ticket);
      if (
        !onLand(
          ticket.id,
          ticket.type,
          this.px(ticket.x),
          this.py(ticket.y),
          ticket.voteMask
        )
      ) {
        this.#draw(ticket);
      } else {
        this.#airborne.add(ticket.id);
      }
    }

    for (const ticket of this.#drawn.values()) {
      const id = ticket.id;
      if (board.byId.has(id)) continue;
      const fade = Math.max(0, fadeOf(ticket));
      onGone(
        id,
        ticket.type,
        this.px(ticket.x),
        this.py(ticket.y) + sinkOf(fade),
        voted(ticket),
        fade
      );
      this.#drop(id);
    }
  }

  reveal(id: number): void {
    this.#airborne.delete(id);
    const ticket = this.#drawn.get(id);
    if (ticket) this.#draw(ticket);
  }

  bounce(ids: readonly number[]): void {
    for (const id of ids) {
      if (this.#drawn.has(id)) this.#bouncing.set(id, 0);
    }
  }

  update(deltaMs: number): void {
    if (this.#bouncing.size === 0) return;
    for (const id of this.#bouncing.keys()) {
      const next = this.#bouncing.get(id)! + deltaMs;
      if (next >= REFUSAL_BOUNCE.ms) this.#bouncing.delete(id);
      else this.#bouncing.set(id, next);
      const ticket = this.#drawn.get(id);
      if (ticket) this.#draw(ticket);
    }
  }

  #lift(id: number): number {
    const at = this.#bouncing.get(id);
    if (at === undefined) return 0;
    return Math.sin((at / REFUSAL_BOUNCE.ms) * Math.PI) * REFUSAL_BOUNCE.lift;
  }

  titleOf(id: number): string | null {
    const ticket = this.#drawn.get(id);
    return ticket ? this.#text(ticket.titleKey) : null;
  }

  destroy(): void {
    this.#layer.destroy();
    this.#goldGlows.destroy();
    for (const card of this.#rareCards) card.destroy();
    for (const glow of this.#rareGlows) glow.destroy();
    for (const title of this.#rareTitles) title.destroy();
  }

  #drop(id: number): void {
    this.#airborne.delete(id);
    const slot = this.#slotOf.get(id);
    if (slot === undefined) return;
    this.#bouncing.delete(id);
    this.#dropGlow(id);
    const rare = this.#rareSlot.get(id);
    if (rare !== undefined) {
      this.#rareCards[rare]?.setVisible(false);
      this.#rareGlows[rare]?.setVisible(false);
      this.#rareTitles[rare]?.setVisible(false);
      this.#rareFree.push(rare);
      this.#rareSlot.delete(id);
    } else {
      this.#layer.editMember(slot, this.#hiddenMember());
    }
    this.#free.push(slot);
    this.#slotOf.delete(id);
    this.#drawn.delete(id);
  }

  #draw(ticket: BoardTicket): void {
    if (this.#airborne.has(ticket.id)) return;
    const slot = this.#slotOf.get(ticket.id);
    if (slot === undefined) return;
    const fade = fadeOf(ticket);
    const x = this.px(ticket.x);
    const y = this.py(ticket.y) - this.#lift(ticket.id) + sinkOf(fade);

    if (TICKET_TYPES[ticket.type].handOnly) {
      const held = this.#rareSlot.get(ticket.id) ?? this.#rareFree.pop();
      if (held !== undefined) {
        const half = Math.max(
          ((this.#rareCards[held]?.width ?? 0) * RARE_PULSE) / 2,
          RARE_TITLE_WIDTH / 2
        );
        const inside = Math.min(
          Math.max(x, this.px(0) + half),
          this.px(LOGICAL_BOARD.width) - half
        );
        this.#rareSlot.set(ticket.id, held);
        this.#rareCards[held]
          ?.setFrame(cardFrame(ticket.type))
          .setPosition(inside, y - RARE_LIFT)
          .setVisible(true);
        this.#rareGlows[held]
          ?.setPosition(inside, y - RARE_LIFT)
          .setVisible(true);
        const title = this.#rareTitles[held];
        title
          ?.setText(this.#text(ticket.titleKey))
          .setPosition(inside, y - RARE_LIFT + RARE_TITLE_OFFSET);
        title?.setVisible(!this.#titleClashes(held));
        return;
      }
    }

    this.#member.frame = ticket.golden
      ? goldFrame(ticket.type)
      : voted(ticket)
        ? voteFrame(ticket.type)
        : cardFrame(ticket.type);
    this.#member.x = x;
    this.#member.y = y;
    this.#member.rotation = ((ticket.id % 13) - 6) * 0.01;
    this.#member.scaleX = 1;
    this.#member.scaleY = 1;
    this.#member.alpha = fade;
    this.#tintRamp(ticket);
    this.#layer.editMember(slot, this.#member);
    if (ticket.golden) this.#glowUnder(ticket.id, x, y, fade);
  }

  /** A caption that would print over another visible one stays hidden. */
  #titleClashes(slot: number): boolean {
    const title = this.#rareTitles[slot];
    if (!title) return false;
    return this.#rareTitles.some(
      (other, at) =>
        at !== slot &&
        other.visible &&
        Math.abs(other.x - title.x) < RARE_TITLE_WIDTH &&
        Math.abs(other.y - title.y) < Math.max(other.height, title.height)
    );
  }

  #tintRamp(ticket: BoardTicket): void {
    const member = this.#member;
    if (
      this.#underTest !== null &&
      spawnerFor(ticket.type)?.adr === this.#underTest
    ) {
      member.tintTopLeft = UNDER_TEST.ink;
      member.tintTopRight = UNDER_TEST.ink;
      member.tintBottomLeft = UNDER_TEST.ink;
      member.tintBottomRight = UNDER_TEST.ink;
      member.tintBlend = this.#underTestPulse;
      member.tintMode = GPU_TINT_MODE(Phaser.TintModes.SCREEN);
      return;
    }
    member.tintMode = Phaser.TintModes.MULTIPLY;
    if (!this.#autoClosed.has(ticket.type) || ticket.lifeLeftMs <= 0) {
      member.tintBlend = 0;
      return;
    }
    member.tintTopLeft = AUTO_CLOSE_RAMP.ink;
    member.tintTopRight = AUTO_CLOSE_RAMP.ink;
    member.tintBottomLeft = AUTO_CLOSE_RAMP.ink;
    member.tintBottomRight = AUTO_CLOSE_RAMP.ink;
    this.#autoCloseRamp.duration = ticket.lifeLeftMs;
    member.tintBlend = this.#autoCloseRamp;
  }

  #glowUnder(id: number, x: number, y: number, fade: number): void {
    const slot = this.#glowSlot.get(id) ?? this.#glowFree.pop();
    if (slot === undefined) return;
    this.#glowSlot.set(id, slot);
    const delay = (id % 7) * 100;
    this.#glowScaleX.delay = delay;
    this.#glowScaleY.delay = delay;
    this.#glowAlpha.delay = delay;
    this.#glowAlpha.base = GOLD_GLOW.alpha * fade;
    this.#glowAlpha.amplitude = GOLD_GLOW.flare * fade;
    const glow = this.#glowMember;
    glow.frame = GLOW_FRAME;
    glow.x = x;
    glow.y = y;
    glow.rotation = 0;
    glow.scaleX = this.#glowScaleX;
    glow.scaleY = this.#glowScaleY;
    glow.alpha = this.#glowAlpha;
    glow.tintTopLeft = GOLD_INK;
    glow.tintTopRight = GOLD_INK;
    glow.tintBottomLeft = GOLD_INK;
    glow.tintBottomRight = GOLD_INK;
    glow.tintBlend = 1;
    this.#goldGlows.editMember(slot, glow);
  }

  #dropGlow(id: number): void {
    const slot = this.#glowSlot.get(id);
    if (slot === undefined) return;
    this.#goldGlows.editMember(slot, this.#hiddenGlow());
    this.#glowSlot.delete(id);
    this.#glowFree.push(slot);
  }

  #hiddenGlow(): Partial<Phaser.Types.GameObjects.SpriteGPULayer.Member> {
    const glow = this.#glowMember;
    glow.frame = GLOW_FRAME;
    glow.x = 0;
    glow.y = 0;
    glow.rotation = 0;
    glow.scaleX = 0;
    glow.scaleY = 0;
    glow.alpha = 0;
    return glow;
  }

  #hiddenMember(): Partial<Phaser.Types.GameObjects.SpriteGPULayer.Member> {
    this.#member.frame = cardFrame('lint');
    this.#member.x = 0;
    this.#member.y = 0;
    this.#member.rotation = 0;
    this.#member.scaleX = 0;
    this.#member.scaleY = 0;
    this.#member.alpha = 0;
    return this.#member;
  }

  #buildGlow(): Phaser.GameObjects.Image {
    const glow = this.#scene.add
      .image(0, 0, ATLAS_KEY, GLOW_FRAME)
      .setDepth(DEPTH.glow)
      .setScale(2.4)
      .setVisible(false);
    this.#scene.tweens.add({
      targets: glow,
      alpha: { from: 0.35, to: 0.95 },
      scale: { from: 2.1, to: 2.7 },
      duration: 620,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    return glow;
  }

  #buildRareTitle(): Phaser.GameObjects.Text {
    return this.#scene.add
      .text(0, 0, '', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: BOARD_TEXT.bright,
        align: 'center',
        wordWrap: { width: RARE_TITLE_WIDTH },
      })
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.rare)
      .setVisible(false);
  }

  #buildRareCard(): Phaser.GameObjects.Image {
    const card = this.#scene.add
      .image(0, 0, ATLAS_KEY, cardFrame('incident'))
      .setDepth(DEPTH.rare)
      .setVisible(false);
    this.#scene.tweens.add({
      targets: card,
      scale: { from: 1, to: RARE_PULSE },
      duration: 480,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    return card;
  }
}

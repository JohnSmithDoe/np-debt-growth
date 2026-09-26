import * as Phaser from 'phaser';

import type { Board, BoardTicket } from '../../game/model/board.model';
import type { TicketTypeId } from '../../game/model/ticket.model';
import { TICKET_TYPES } from '../../game/model/ticket.model';
import { fadeOf } from '../../game/util/board';
import {
  BOARD_TEXT,
  CLAIM_SLOTS,
  GOLD_GLOW,
  GOLD_GLOW_CAPACITY,
  HEAP_CAPACITY,
  RARE_CAPACITY,
  REFUSAL_BOUNCE,
  RARE_LIFT,
  RARE_TITLE_OFFSET,
  RARE_TITLE_WIDTH,
  WONT_FIX_FADE,
} from '../model/board.consts';
import {
  ATLAS_KEY,
  cardFrame,
  goldFrame,
  claimFrame,
  GLOW_FRAME,
  GOLD_INK,
  paintClaimCard,
  voteFrame,
} from './board-atlas';

export const NONE = -1;

/** Above any 24-bit colour, so a voted claim paint never matches a plain one. */
const VOTED_PAINT = 0x1000000;

function voted(ticket: BoardTicket): boolean {
  return ticket.spBonus > 0;
}

function sinkOf(fade: number): number {
  return (1 - fade) * WONT_FIX_FADE.sink;
}

const DEPTH = { goldGlow: 9, layer: 10, glow: 11, rare: 12 } as const;

export class TicketHeap {
  readonly #scene: Phaser.Scene;
  readonly #layer: Phaser.GameObjects.SpriteGPULayer;
  readonly #member: Partial<Phaser.Types.GameObjects.SpriteGPULayer.Member> =
    {};
  readonly #goldGlows: Phaser.GameObjects.SpriteGPULayer;
  readonly #glowMember: Partial<Phaser.Types.GameObjects.SpriteGPULayer.Member> =
    {};
  readonly #glowFree: number[] = [];
  readonly #glowSlot = new Map<number, number>();

  readonly #free: number[] = [];
  readonly #slotOf = new Map<number, number>();
  readonly #drawn = new Map<number, BoardTicket>();
  readonly #drawnAs = new Map<number, TicketTypeId>();
  readonly #rareSlot = new Map<number, number>();

  readonly #bouncing = new Map<number, number>();
  readonly #claimSlot = new Map<number, number>();
  readonly #claimFree: number[] = [];
  readonly #claimPainted = new Map<number, number>();
  readonly #atlas: Phaser.Textures.CanvasTexture;

  readonly #rareCards: Phaser.GameObjects.Image[] = [];
  readonly #rareTitles: Phaser.GameObjects.Text[] = [];
  readonly #text: (key: string) => string;
  readonly #rareGlows: Phaser.GameObjects.Image[] = [];
  readonly #rareFree: number[] = [];

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
    for (let slot = CLAIM_SLOTS - 1; slot >= 0; slot--) {
      this.#claimFree.push(slot);
    }

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

  get count(): number {
    return this.#drawn.size;
  }

  layout(scaleX: number, scaleY: number, offX: number, offY: number): void {
    this.#scaleX = scaleX;
    this.#scaleY = scaleY;
    this.#offX = offX;
    this.#offY = offY;
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
      voted: boolean
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
      if (this.#drawnAs.get(ticket.id) !== ticket.type) {
        this.#drawnAs.set(ticket.id, ticket.type);
        if (this.#drawn.has(ticket.id)) {
          this.#draw(ticket);
          continue;
        }
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
          voted(ticket)
        )
      ) {
        this.#draw(ticket);
      }
    }

    for (const [id, ticket] of this.#drawn) {
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

  preTint(tints: ReadonlyMap<number, number>): void {
    for (const [id, slot] of this.#claimSlot) {
      if (tints.has(id)) continue;
      this.#releaseClaim(id, slot);
    }

    let repainted = false;
    for (const [id, colour] of tints) {
      const ticket = this.#drawn.get(id);
      if (!ticket || TICKET_TYPES[ticket.type].handOnly) continue;

      let slot = this.#claimSlot.get(id);
      const fresh = slot === undefined;
      if (slot === undefined) {
        slot = this.#claimFree.pop();
        if (slot === undefined) continue;
        this.#claimSlot.set(id, slot);
      }

      const paint = voted(ticket) ? colour | VOTED_PAINT : colour;
      if (this.#claimPainted.get(slot) !== paint) {
        this.#claimPainted.set(slot, paint);
        paintClaimCard(
          this.#atlas,
          slot,
          TICKET_TYPES[ticket.type].prefix,
          colour,
          voted(ticket)
        );
        repainted = true;
      } else if (!fresh) {
        continue;
      }
      this.#draw(ticket);
    }

    if (repainted) this.#atlas.refresh();
  }

  #releaseClaim(id: number, slot: number): void {
    this.#claimSlot.delete(id);
    this.#claimPainted.delete(slot);
    this.#claimFree.push(slot);
    const ticket = this.#drawn.get(id);
    if (ticket) this.#draw(ticket);
  }

  reveal(id: number): void {
    const ticket = this.#drawn.get(id);
    if (ticket) this.#draw(ticket);
  }

  /** The can was full: these hop where they lie and stay on the board. */
  bounce(ids: readonly number[]): void {
    for (const id of ids) {
      if (this.#drawn.has(id)) this.#bouncing.set(id, 0);
    }
  }

  update(deltaMs: number): void {
    if (this.#bouncing.size === 0) return;
    for (const [id, at] of [...this.#bouncing]) {
      const next = at + deltaMs;
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

  positionOf(id: number): { x: number; y: number } | null {
    const ticket = this.#drawn.get(id);
    if (!ticket) return null;
    return { x: this.px(ticket.x), y: this.py(ticket.y) };
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
    const slot = this.#slotOf.get(id);
    if (slot === undefined) return;
    const claim = this.#claimSlot.get(id);
    if (claim !== undefined) {
      this.#claimSlot.delete(id);
      this.#claimPainted.delete(claim);
      this.#claimFree.push(claim);
    }
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
    this.#drawnAs.delete(id);
  }

  #draw(ticket: BoardTicket): void {
    const slot = this.#slotOf.get(ticket.id);
    if (slot === undefined) return;
    const fade = fadeOf(ticket);
    const x = this.px(ticket.x);
    const y = this.py(ticket.y) - this.#lift(ticket.id) + sinkOf(fade);

    if (TICKET_TYPES[ticket.type].handOnly) {
      const held = this.#rareSlot.get(ticket.id) ?? this.#rareFree.pop();
      if (held !== undefined) {
        this.#rareSlot.set(ticket.id, held);
        this.#rareCards[held]
          ?.setFrame(cardFrame(ticket.type))
          .setPosition(x, y - RARE_LIFT)
          .setVisible(true);
        this.#rareGlows[held]?.setPosition(x, y - RARE_LIFT).setVisible(true);
        this.#rareTitles[held]
          ?.setText(this.#text(ticket.titleKey))
          .setPosition(x, y - RARE_LIFT + RARE_TITLE_OFFSET)
          .setVisible(true);
        return;
      }
    }

    const claim = this.#claimSlot.get(ticket.id);
    this.#member.frame =
      claim !== undefined
        ? claimFrame(claim)
        : ticket.golden
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
    this.#layer.editMember(slot, this.#member);
    if (ticket.golden) this.#glowUnder(ticket.id, x, y, fade);
  }

  #glowUnder(id: number, x: number, y: number, fade: number): void {
    const slot = this.#glowSlot.get(id) ?? this.#glowFree.pop();
    if (slot === undefined) return;
    this.#glowSlot.set(id, slot);
    const pulse = {
      ease: 'Sine.easeInOut',
      duration: GOLD_GLOW.ms,
      delay: (id % 7) * 100,
    };
    const glow = this.#glowMember;
    glow.frame = GLOW_FRAME;
    glow.x = x;
    glow.y = y;
    glow.rotation = 0;
    glow.scaleX = {
      ...pulse,
      base: GOLD_GLOW.scaleX,
      amplitude: GOLD_GLOW.swell,
    };
    glow.scaleY = {
      ...pulse,
      base: GOLD_GLOW.scaleY,
      amplitude: GOLD_GLOW.swell,
    };
    glow.alpha = {
      ...pulse,
      base: GOLD_GLOW.alpha * fade,
      amplitude: GOLD_GLOW.flare * fade,
    };
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
      scale: { from: 1, to: 1.09 },
      duration: 480,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    return card;
  }
}

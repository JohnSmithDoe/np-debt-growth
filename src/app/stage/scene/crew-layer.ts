import * as Phaser from 'phaser';

import type { Board, CrewMember } from '../../game/model/board.model';
import { meetingSpot, NO_TICKET } from '../../game/model/board.model';
import { crewName } from '../../game/model/cast.model';
import { TICKET_TYPES } from '../../game/model/ticket.model';
import type { CrewKind } from '../../game/model/crew.model';
import type { SceneDeps } from '../model/scene-deps.model';
import { hireIsWoman, hirePoolSeat } from '../../game/util/economy';
import type { LpcBlock } from '../model/lpc-sheet.model';
import {
  crewSkin,
  CREW_BLOCK,
  CREW_HIT,
  CREW_SCALE,
  CREW_SMOOTH_MS,
  CREW_SPRITE_LIMIT,
  BOARD_TEXT,
  CARRIED_CARD,
} from '../model/board.consts';
import { LpcSprite } from '../util/lpc-sprite';

export interface Claim {
  readonly index: number;
  readonly titleKey: string;
}

export class CrewLayer {
  readonly #sprites: LpcSprite[] = [];
  readonly #held: Phaser.GameObjects.Rectangle[] = [];
  readonly #tally: Phaser.GameObjects.Text;
  readonly #kind: CrewKind;
  readonly #say: SceneDeps['text'];
  readonly #tallyRow: number;
  readonly #scene: Phaser.Scene;
  readonly #depth: number;
  #poolSeatOf: ((seat: number) => number) | null = null;
  #womanEvery = -1;

  readonly #targetX: number[] = [];
  readonly #targetY: number[] = [];
  readonly #block: LpcBlock[] = [];
  readonly #claimedId: number[] = [];
  #claims: Claim[] = [];

  #scaleX = 1;
  #scaleY = 1;
  #offX = 0;
  #offY = 0;
  #shown = 0;
  #counted = -1;
  #crowded = false;
  #placed = 0;

  constructor(
    scene: Phaser.Scene,
    depth: number,
    kind: CrewKind,
    tallyRow: number,
    say: SceneDeps['text']
  ) {
    this.#kind = kind;
    this.#say = say;
    this.#tallyRow = tallyRow;
    this.#scene = scene;
    this.#depth = depth;
    this.#tally = scene.add
      .text(0, 0, '', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: BOARD_TEXT.dim,
      })
      .setDepth(depth)
      .setVisible(false);
  }

  #casting(index: number): { readonly seat: number; readonly woman: boolean } {
    return {
      seat: this.#poolSeatOf?.(index) ?? hirePoolSeat(index, this.#womanEvery),
      woman: hireIsWoman(index, this.#womanEvery),
    };
  }

  #grow(count: number): void {
    for (let index = this.#sprites.length; index < count; index++) {
      const { seat, woman } = this.#casting(index);
      const skin = crewSkin(this.#kind, seat, woman);
      if (!skin) return;
      this.#sprites.push(
        new LpcSprite(this.#scene, 0, 0, skin)
          .setDepth(this.#depth)
          .setScale(CREW_SCALE)
          .setVisible(false)
      );
      this.#held.push(
        this.#scene.add
          .rectangle(0, 0, CARRIED_CARD.width, CARRIED_CARD.height, 0xffffff)
          .setDepth(this.#depth + 1)
          .setStrokeStyle(CARRIED_CARD.strokeWidth, CARRIED_CARD.stroke)
          .setVisible(false)
      );
      this.#targetX.push(0);
      this.#targetY.push(0);
      this.#block.push('idle');
      this.#claimedId.push(NO_TICKET);
    }
  }

  nameAt(px: number, py: number): string | null {
    for (let index = this.#shown - 1; index >= 0; index--) {
      const sprite = this.#sprites[index];
      if (!sprite?.visible) continue;
      if (Math.abs(px - sprite.x) > CREW_HIT.width / 2) continue;
      if (Math.abs(py - sprite.y) > CREW_HIT.height / 2) continue;
      const { seat, woman } = this.#casting(index);
      return crewName(this.#kind, seat, woman);
    }
    return null;
  }

  takeClaims(): readonly Claim[] {
    const due = this.#claims;
    this.#claims = [];
    return due;
  }

  anchorOf(index: number): { x: number; y: number } | null {
    const sprite = index < this.#shown ? this.#sprites[index] : undefined;
    return sprite?.visible ? { x: sprite.x, y: sprite.y } : null;
  }

  get kind(): CrewKind {
    return this.#kind;
  }

  layout(scaleX: number, scaleY: number, offX: number, offY: number): void {
    this.#scaleX = scaleX;
    this.#scaleY = scaleY;
    this.#offX = offX;
    this.#offY = offY;
    this.#tally.setPosition(
      offX + 10,
      Math.max(0, offY) + 10 + this.#tallyRow * 14
    );
  }

  sync(
    board: Board,
    members: readonly CrewMember[],
    womanEvery: number,
    poolSeatOf?: (seat: number) => number
  ): void {
    this.#poolSeatOf = poolSeatOf ?? null;
    if (womanEvery !== this.#womanEvery) {
      for (const sprite of this.#sprites) sprite.destroy();
      for (const card of this.#held) card.destroy();
      this.#sprites.length = 0;
      this.#held.length = 0;
      this.#targetX.length = 0;
      this.#targetY.length = 0;
      this.#block.length = 0;
      this.#claimedId.length = 0;
      this.#placed = 0;
      this.#counted = -1;
      this.#womanEvery = womanEvery;
    }

    const count = members.length;
    if (count !== this.#counted) {
      this.#counted = count;
      this.#shown = Math.min(count, CREW_SPRITE_LIMIT);
      this.#grow(this.#shown);
      this.#crowded = count > CREW_SPRITE_LIMIT;
      for (let index = 0; index < this.#sprites.length; index++) {
        this.#sprites[index]?.setVisible(index < this.#shown);
        if (index >= this.#shown) this.#held[index]?.setVisible(false);
      }
      this.#tally.setVisible(this.#crowded);
      if (this.#crowded) {
        this.#tally.setText(this.#say(`crew.tally.${this.#kind}`, { count }));
      }
    }

    for (let index = 0; index < this.#shown; index++) {
      const member = members[index];
      if (!member) continue;
      const x = this.#offX + member.x * this.#scaleX;
      const y = this.#offY + member.y * this.#scaleY;
      this.#targetX[index] = x;
      this.#targetY[index] = y;
      this.#block[index] = blockFor(board, member);
      const carrying = member.carrying[0];
      const card = this.#held[index];
      card?.setVisible(carrying !== undefined);
      if (carrying) card?.setFillStyle(TICKET_TYPES[carrying.type].colour);
      const claimed =
        member.phase === 'toTicket' ? board.byId.get(member.target) : undefined;
      const claimedId = claimed?.id ?? NO_TICKET;
      if (claimed && claimedId !== this.#claimedId[index]) {
        this.#claims.push({ index, titleKey: claimed.titleKey });
      }
      this.#claimedId[index] = claimedId;
      if (index >= this.#placed) {
        this.#sprites[index]?.setPosition(x, y);
        this.#placed = index + 1;
      }
    }
  }

  update(deltaMs: number): void {
    const ease = 1 - Math.exp(-deltaMs / CREW_SMOOTH_MS);

    for (let index = 0; index < this.#shown; index++) {
      const sprite = this.#sprites[index];
      if (!sprite) continue;
      const dx = (this.#targetX[index] ?? sprite.x) - sprite.x;
      const dy = (this.#targetY[index] ?? sprite.y) - sprite.y;
      sprite.x += dx * ease;
      sprite.y += dy * ease;
      sprite.aim(dx, dy).perform(this.#block[index] ?? 'idle');
      this.#held[index]?.setPosition(sprite.x, sprite.y - CARRIED_CARD.lift);
    }
  }

  destroy(): void {
    for (const sprite of this.#sprites) sprite.destroy();
    for (const card of this.#held) card.destroy();
    this.#tally.destroy();
  }
}

function blockFor(board: Board, member: CrewMember): LpcBlock {
  if (member.phase === 'idle') return CREW_BLOCK.waiting;
  if (member.phase === 'closing') {
    return member.leftMs > 0 ? CREW_BLOCK.working : CREW_BLOCK.waiting;
  }
  if (member.phase === 'meeting') {
    const spot = meetingSpot(member.id);
    const there = member.x === spot.x && member.y === spot.y;
    return there ? CREW_BLOCK.waiting : CREW_BLOCK.walking;
  }
  const ticket = board.byId.get(member.target);
  const arrived = !ticket || (member.x === ticket.x && member.y === ticket.y);
  return arrived ? CREW_BLOCK.waiting : CREW_BLOCK.walking;
}

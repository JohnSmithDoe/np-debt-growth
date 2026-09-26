import * as Phaser from 'phaser';

import {
  formatCompactWhole,
  formatMoney,
} from '../../@shared/util/format-quantity';
import type {
  Board,
  BoardTicket,
  CrewMember,
  SprintSlot,
} from '../../game/model/board.model';
import { pickWithin } from '../../game/util/board';
import { hazardLabelKey } from '../../game/model/hazard.model';
import type { CrewKind } from '../../game/model/crew.model';
import { LOGICAL_BOARD } from '../../game/model/geometry';
import type { TicketTypeId } from '../../game/model/ticket.model';
import { ticketLabelKey, TICKET_TYPES } from '../../game/model/ticket.model';
import { spawnerFor } from '../../game/model/spawner.model';
import {
  BOARD_INK,
  BOARD_TEXT,
  CARD_HEIGHT,
  CARD_WIDTH,
  CLAIM_TINT_REACH,
  CLAIM_TINT_STEPS,
  CLICK_RING,
  REFUSED_MS,
  CLOSE_FLOAT,
  CLOSE_FLOATS_PER_FRAME,
  DROP_HOP,
  DROP_MS,
  HARVEST_HOP,
  HARVEST_MS,
  HOVER_GROUND,
  HOVER_LINE_GAP,
  HOVER_OFFSET,
  HOVER_PAD,
  HOVER_WIDTH,
  RARE_CARD_HEIGHT,
  RARE_CARD_WIDTH,
  RARE_LIFT,
  SPRINT_STRIP_HEIGHT,
  WONT_FIX_FADE,
} from '../model/board.consts';
import type { SceneDeps } from '../model/scene-deps.model';
import { cardFrame, buildBoardAtlas } from '../util/board-atlas';
import { loadCrewAtlas, registerCrewAnimations } from '../util/lpc-sprite';
import { FLIGHT, FlyerPool } from '../util/flyer-pool';
import { NONE, TicketHeap } from '../util/ticket-heap';
import { CrewLayer } from './crew-layer';
import { CbScene } from './cb-scene';
import { GroundLayer } from './ground-layer';
import { SprintStrip } from './sprint-strip';
import { TierSpawners } from './tier-spawners';
import { VoteBeams } from './vote-beams';

interface BoardParts {
  readonly ground: GroundLayer;
  readonly heap: TicketHeap;
  readonly flyers: FlyerPool;
  readonly crew: CrewLayer;
  readonly seniors: CrewLayer;
  readonly managers: CrewLayer;
  readonly spawners: TierSpawners;
  readonly votes: VoteBeams;
  readonly strip: SprintStrip;
}

const DEPTH = {
  floor: 1,
  crew: 15,
  flyer: 20,
  spawner: 22,
  ring: 24,
  strip: 30,
  hover: 60,
} as const;
const MIN_BOARD_HEIGHT = 80;
const SECRET_NOTE = '// TODO(2011): remove before launch';
const HAZARD_BANNER_LIFT = 34;

const CREW_ROLE_KEY: Readonly<Record<CrewKind, string>> = {
  juniors: 'purchase.junior.label',
  seniors: 'hire.line',
  managers: 'purchase.manager.label',
};

const CARD_BOX = { width: CARD_WIDTH, height: CARD_HEIGHT, lift: 0 } as const;
const RARE_BOX = {
  width: RARE_CARD_WIDTH,
  height: RARE_CARD_HEIGHT,
  lift: RARE_LIFT,
} as const;

const PICK_RADIUS = Math.max(
  Math.hypot(CARD_BOX.width, CARD_BOX.height) / 2,
  Math.hypot(RARE_BOX.width / 2, RARE_BOX.height / 2 + RARE_BOX.lift)
);

const stripHoverKey = (slot: number, held: SprintSlot): string =>
  `sprint:${slot}:${held.title}`;

function claimProgress(worker: CrewMember, ticket: BoardTicket): number {
  const gap = Math.hypot(ticket.x - worker.x, ticket.y - worker.y);
  const at = 1 - Math.min(1, gap / CLAIM_TINT_REACH);
  return Math.round(at * CLAIM_TINT_STEPS) / CLAIM_TINT_STEPS;
}

function blendColour(from: number, to: number, at: number): number {
  const mix = (shift: number): number => {
    const a = (from >> shift) & 0xff;
    const b = (to >> shift) & 0xff;
    return Math.round(a + (b - a) * at) << shift;
  };
  return mix(16) | mix(8) | mix(0);
}

function cardAt(
  board: Board,
  ids: readonly number[],
  px: number,
  py: number,
  toScreenX: (x: number) => number,
  toScreenY: (y: number) => number
): number {
  let best = NONE;
  let bestRare = false;
  let closest = Infinity;
  for (const id of ids) {
    const ticket = board.byId.get(id);
    if (!ticket) continue;
    const rare = TICKET_TYPES[ticket.type].handOnly;
    if (bestRare && !rare) continue;
    const box = rare ? RARE_BOX : CARD_BOX;
    const dx = toScreenX(ticket.x) - px;
    const dy = toScreenY(ticket.y) - box.lift - py;
    if (Math.abs(dx) > box.width / 2 || Math.abs(dy) > box.height / 2) continue;
    const distance = dx * dx + dy * dy;
    if (rare === bestRare && distance >= closest) continue;
    closest = distance;
    bestRare = rare;
    best = id;
  }
  return best;
}

export class BoardScene extends CbScene {
  static readonly KEY = 'board';

  #scale = 1;
  #offX = 0;
  #offY = 0;

  #parts?: BoardParts;
  #floorLine?: Phaser.GameObjects.Rectangle;
  #secret?: Phaser.GameObjects.Text;
  #boardHeight = 0;
  #width = 0;
  #height = 0;

  #hover?: Phaser.GameObjects.Text;
  #hovering = '';
  #hoverSlot = NONE;

  #ring?: Phaser.GameObjects.Arc;
  #pizza?: Phaser.GameObjects.Arc;
  #onBoard = false;

  #banner?: Phaser.GameObjects.Text;
  #warning = '';

  #slotFrom = 0;
  #seenSlots = 0;
  readonly #claimedSlots = new Set<number>();

  readonly #preTints = new Map<number, number>();

  #onResize = (): void => this.#layout();
  #onPointerDown = (
    pointer: Phaser.Input.Pointer,
    over: Phaser.GameObjects.GameObject[]
  ): void => {
    if (over.length > 0) return;
    if (pointer.worldY >= this.#boardHeight) return;
    this.#harvest(pointer.worldX, pointer.worldY);
  };
  #onWake = (): void => {
    this.deps.takeCloseFloats();
    this.deps.takeWontFix();
  };
  #wontFix = new Set<number>();
  #onPointerMove = (pointer: Phaser.Input.Pointer): void => {
    this.#readBoard(pointer.worldX, pointer.worldY);
    this.#placeRing(pointer.worldX, pointer.worldY);
    this.#sweepAt = { x: pointer.worldX, y: pointer.worldY };
  };
  /** Where the pointer last was; the sweep runs once a frame from here. */
  #sweepAt: { x: number; y: number } | null = null;
  #refusedUntil = 0;
  #onPointerOut = (): void => {
    this.#onBoard = false;
    this.#clearHover();
  };

  constructor(deps: SceneDeps) {
    super(BoardScene.KEY, deps);
  }

  preload(): void {
    loadCrewAtlas(this);
  }

  create(): void {
    buildBoardAtlas(this, this.deps.text);
    registerCrewAnimations(this);

    this.#floorLine = this.add
      .rectangle(0, 0, 10, 1, BOARD_INK.floorLine)
      .setOrigin(0, 0)
      .setDepth(DEPTH.floor);

    const strip = new SprintStrip(this, this.deps, DEPTH.strip);
    const parts: BoardParts = {
      ground: new GroundLayer(this, DEPTH.floor - 1),
      heap: new TicketHeap(this),
      flyers: new FlyerPool(this, DEPTH.flyer),
      crew: new CrewLayer(this, DEPTH.crew, 'juniors', 0),
      seniors: new CrewLayer(this, DEPTH.crew + 1, 'seniors', 1),
      managers: new CrewLayer(this, DEPTH.crew + 2, 'managers', 2),
      spawners: new TierSpawners(this, DEPTH.spawner),
      votes: new VoteBeams(this, DEPTH.spawner - 1),
      strip,
    };
    parts.flyers.onArrive = (kind, id) => {
      if (kind === FLIGHT.drop) parts.heap.reveal(id);
    };
    this.#parts = parts;

    this.#hover = this.add
      .text(0, 0, '', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: BOARD_TEXT.bright,
        backgroundColor: HOVER_GROUND,
        padding: { x: HOVER_PAD.x, y: HOVER_PAD.y },
        lineSpacing: HOVER_LINE_GAP,
        wordWrap: { width: HOVER_WIDTH },
      })
      .setDepth(DEPTH.hover)
      .setVisible(false);

    this.#banner = this.add
      .text(0, 0, '', {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: BOARD_TEXT.gold,
        backgroundColor: HOVER_GROUND,
        padding: { x: 10, y: 5 },
      })
      .setDepth(DEPTH.hover)
      .setVisible(false);

    this.#ring = this.add
      .circle(0, 0, 1)
      .setStrokeStyle(CLICK_RING.width, BOARD_INK.clickRing, 1)
      .setAlpha(CLICK_RING.alpha)
      .setDepth(DEPTH.ring)
      .setVisible(false);

    this.#pizza = this.add
      .circle(0, 0, 1, BOARD_INK.pizza, 0.12)
      .setStrokeStyle(2, BOARD_INK.pizza, 0.7)
      .setDepth(DEPTH.floor + 1)
      .setVisible(false);

    this.#buildSecret();
    this.#layout();

    this.scale.on(Phaser.Scale.Events.RESIZE, this.#onResize);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.#onPointerDown);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.#onPointerMove);
    this.input.on(Phaser.Input.Events.GAME_OUT, this.#onPointerOut);
    this.events.on(Phaser.Scenes.Events.WAKE, this.#onWake);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.#teardown());
  }

  override update(_time: number, delta: number): void {
    const parts = this.#parts;
    if (!parts) return;

    const step = this.cappedDelta(delta);
    const board = this.deps.board();

    parts.ground.tier(this.deps.tier());
    parts.spawners.sync((adr) => this.deps.spawnerCount(adr));
    this.#openSlots();
    this.#wontFix = new Set(this.deps.takeWontFix());
    parts.heap.sync(
      board,
      (id, type, x, y) => this.#land(parts, id, type, x, y),
      (id, type, x, y) => this.#leave(parts, id, type, x, y)
    );
    this.#preTint(parts, board);
    parts.crew.sync(board, board.juniors, this.deps.womanEvery('juniors'));
    parts.managers.sync(
      board,
      board.managers,
      this.deps.womanEvery('managers')
    );
    parts.seniors.sync(
      board,
      board.seniors,
      this.deps.womanEvery('seniors'),
      (seat) => this.deps.seniorPoolSeat(seat)
    );

    parts.spawners.update(step);
    parts.votes.update(this.deps.votes(), step);
    parts.heap.update(step);
    parts.crew.update(step);
    parts.seniors.update(step);
    parts.managers.update(step);
    parts.flyers.update(step);
    parts.strip.update();
    this.#weather();
    this.#bill(parts);
    this.#floatCloses();
    this.#holdStripHover();
    this.#sweepFrame();
    this.#ring?.setVisible(this.#onBoard && this.deps.showClickRing());
    this.#drawPizza();
  }

  #drawPizza(): void {
    const circle = this.#pizza;
    if (!circle) return;
    const party = this.deps.pizza();
    circle.setVisible(party !== null);
    if (!party) return;
    circle
      .setPosition(
        party.x * this.#scale + this.#offX,
        party.y * this.#scale + this.#offY
      )
      .setRadius(party.radius * this.#scale * (0.35 + 0.65 * party.left));
  }

  #sweepFrame(): void {
    const at = this.#sweepAt;
    if (at && this.#onBoard) this.#sweep(at.x, at.y);

    const ring = this.#ring;
    if (!ring) return;
    ring.setStrokeStyle(
      CLICK_RING.width,
      this.time.now < this.#refusedUntil ? CLICK_RING.refused : CLICK_RING.ink,
      ring.strokeAlpha
    );
  }

  #land(
    parts: BoardParts,
    id: number,
    type: TicketTypeId,
    x: number,
    y: number
  ): boolean {
    const source = parts.spawners.originOf(spawnerFor(type)?.adr ?? -1);
    return parts.flyers.launch(
      cardFrame(type),
      FLIGHT.drop,
      id,
      source?.x ?? x,
      source?.y ?? -40,
      x,
      y,
      DROP_MS,
      DROP_HOP
    );
  }

  #leave(
    parts: BoardParts,
    id: number,
    type: TicketTypeId,
    x: number,
    y: number
  ): void {
    const from = parts.flyers.catch(id) ?? { x, y };
    if (this.#wontFix.has(id)) {
      parts.flyers.launch(
        cardFrame(type),
        FLIGHT.fade,
        NONE,
        from.x,
        from.y,
        from.x,
        from.y + WONT_FIX_FADE.sink,
        WONT_FIX_FADE.ms,
        0
      );
      return;
    }
    if (this.#carried(id)) return;
    const slot = this.#claimSlot(type);
    parts.flyers.launch(
      cardFrame(type),
      FLIGHT.harvest,
      NONE,
      from.x,
      from.y,
      slot === NONE ? parts.strip.nextLaneX : parts.strip.slotX(slot),
      parts.strip.slotY,
      HARVEST_MS,
      HARVEST_HOP
    );
  }

  #preTint(parts: BoardParts, board: Board): void {
    this.#preTints.clear();
    for (const manager of board.managers) {
      if (manager.phase === 'idle') continue;
      const ticket = board.byId.get(manager.target);
      if (!ticket) continue;
      const to = this.deps.relabelTarget(ticket.type);
      if (to === null) continue;
      const at =
        manager.phase === 'closing' ? 1 : claimProgress(manager, ticket);
      if (at <= 0) continue;
      this.#preTints.set(
        ticket.id,
        blendColour(
          TICKET_TYPES[ticket.type].colour,
          TICKET_TYPES[to].colour,
          at
        )
      );
    }
    parts.heap.preTint(this.#preTints);
  }

  #weather(): void {
    const notice = this.deps.hazardNotice();
    const banner = this.#banner;
    if (!banner) return;
    if (!notice) {
      if (this.#warning !== '') {
        this.#warning = '';
        banner.setVisible(false);
      }
      return;
    }

    const name = this.deps.text(hazardLabelKey(notice.id)).toUpperCase();
    const seconds = Math.ceil(notice.msLeft / 1000);
    const text = notice.landed
      ? `${name} · ${seconds}s`
      : `${name} IN ${seconds}s`;
    if (text === this.#warning) return;
    this.#warning = text;
    banner
      .setText(text)
      .setColor(notice.landed ? BOARD_TEXT.bright : BOARD_TEXT.gold)
      .setVisible(true);
    this.#placeBanner();
  }

  #placeBanner(): void {
    const banner = this.#banner;
    if (!banner?.visible) return;
    banner.setPosition(
      (this.#width - banner.width) / 2,
      this.#boardHeight - banner.height - HAZARD_BANNER_LIFT
    );
  }

  #openSlots(): void {
    const filled = this.deps.sprint().length;
    this.#slotFrom = Math.min(this.#seenSlots, filled);
    this.#seenSlots = filled;
    this.#claimedSlots.clear();
  }

  /** A crew pickup is carried off by hand; it reaches its lane on delivery. */
  #carried(id: number): boolean {
    const board = this.deps.board();
    for (const crew of [board.juniors, board.seniors, board.managers]) {
      for (const member of crew) {
        if (member.carrying.some((card) => card.id === id)) return true;
      }
    }
    return false;
  }

  #claimSlot(type: TicketTypeId): number {
    const sprint = this.deps.sprint();
    for (let slot = this.#slotFrom; slot < sprint.length; slot++) {
      if (sprint[slot]?.type !== type || this.#claimedSlots.has(slot)) continue;
      this.#claimedSlots.add(slot);
      return slot;
    }
    return NONE;
  }

  #readBoard(px: number, py: number): void {
    const parts = this.#parts;
    if (!parts) return;
    this.#hoverSlot = NONE;
    if (py >= this.#boardHeight) return this.#readStrip(parts, px, py);

    for (const layer of [parts.managers, parts.seniors, parts.crew]) {
      const name = layer.nameAt(px, py);
      if (!name) continue;
      const ceiling =
        layer.kind === 'managers' ? null : this.deps.crewCeiling(layer.kind);
      this.#showHover(`crew:${layer.kind}:${name}:${ceiling ?? '-'}`, [
        name,
        this.deps.text(CREW_ROLE_KEY[layer.kind]),
        ceiling === null
          ? this.deps.text('crew.takes.nothing')
          : this.deps.text('crew.takes.upTo', {
              ticket: this.deps.text(ticketLabelKey(ceiling)),
            }),
      ]);
      return this.#placeHover(px, py);
    }

    const x = (px - this.#offX) / this.#scale;
    const y = (py - this.#offY) / this.#scale;
    const board = this.deps.board();
    const near = pickWithin(board, x, y, PICK_RADIUS / this.#scale).filter(
      (id) => !parts.flyers.isFalling(id)
    );
    const id = cardAt(
      board,
      near,
      px,
      py,
      (at) => this.#offX + at * this.#scale,
      (at) => this.#offY + at * this.#scale
    );
    const ticket = id === NONE ? undefined : board.byId.get(id);
    const title = id === NONE ? null : parts.heap.titleOf(id);
    if (!ticket || !title) return this.#clearHover();

    this.#showHover(`ticket:${id}`, [
      this.deps.text(ticketLabelKey(ticket.type)),
      title,
    ]);
    this.#placeHover(px, py);
  }

  #readStrip(parts: BoardParts, px: number, py: number): void {
    const slot = parts.strip.slotAt(px, py);
    const held = slot === null ? undefined : this.deps.sprint()[slot];
    if (slot === null || !held) return this.#clearHover();

    this.#hoverSlot = slot;
    this.#showHover(stripHoverKey(slot, held), [
      this.deps.text(ticketLabelKey(held.type)),
      held.title,
    ]);
    this.#placeHover(px, py);
  }

  #holdStripHover(): void {
    if (this.#hoverSlot === NONE) return;
    const held = this.deps.sprint()[this.#hoverSlot];
    if (!held || this.#hovering !== stripHoverKey(this.#hoverSlot, held)) {
      this.#clearHover();
    }
  }

  #showHover(key: string, lines: readonly string[]): void {
    if (key !== this.#hovering) {
      this.#hovering = key;
      this.#hover?.setText([...lines]).setVisible(true);
    }
  }

  #clearHover(): void {
    this.#hoverSlot = NONE;
    if (this.#hovering === '') return;
    this.#hovering = '';
    this.#hover?.setVisible(false);
  }

  #placeRing(px: number, py: number): void {
    this.#onBoard = py < this.#boardHeight;
    if (!this.#onBoard) return;
    this.#ring?.setPosition(px, py).setRadius(this.deps.radius() * this.#scale);
  }

  #placeHover(px: number, py: number): void {
    const hover = this.#hover;
    if (!hover?.visible) return;
    const x = Math.min(
      px + HOVER_OFFSET.x,
      Math.max(0, this.#width - hover.width - HOVER_OFFSET.edge)
    );
    const y = Math.max(HOVER_OFFSET.edge, py - hover.height - HOVER_OFFSET.y);
    hover.setPosition(x, y);
  }

  #harvest(px: number, py: number): void {
    this.#flashRing(px, py);
    this.#sweep(px, py);
  }

  /**
   * The verb: everything under the ring is taken as the pointer passes. A
   * falling card is taken where it is drawn, not where it will land. A full
   * can takes nothing, which is what the refusal tint says.
   */
  #sweep(px: number, py: number): void {
    const parts = this.#parts;
    if (!parts) return;
    const { flyers } = parts;
    const radius = this.deps.radius();
    const ids = pickWithin(
      this.deps.board(),
      (px - this.#offX) / this.#scale,
      (py - this.#offY) / this.#scale,
      radius
    ).filter((id) => !flyers.isFalling(id));
    flyers.fallingWithin(px, py, radius * this.#scale, ids);
    if (ids.length === 0) return;

    const { taken, refused, value, sp, big } = this.deps.harvest(ids);
    if (refused.length > 0) {
      this.#refusedUntil = this.time.now + REFUSED_MS;
      parts.heap.bounce(refused.filter((id) => !flyers.isFalling(id)));
    }
    if (taken.length === 0) return;
    if (value > 0 && big) this.floatBig(px, py - 22, `+${formatMoney(value)}`);
    else if (value > 0) this.floatPayout(px, py - 14, `+${formatMoney(value)}`);
    if (sp > 0) {
      this.floatPayout(px, py + 8, `+${formatCompactWhole(sp)} SP`, {
        colour: BOARD_TEXT.points,
        size: '14px',
      });
    }
  }

  #flashRing(px: number, py: number): void {
    const ring = this.#ring;
    if (!ring?.visible) return;
    this.tweens.killTweensOf(ring);
    ring.setPosition(px, py).setRadius(this.deps.radius() * this.#scale);
    this.tweens.add({
      targets: ring,
      alpha: { from: CLICK_RING.flashAlpha, to: CLICK_RING.alpha },
      duration: CLICK_RING.flashMs,
      ease: 'Quad.easeOut',
    });
  }

  #floatCloses(): void {
    const due = this.deps.takeCloseFloats();
    if (due.length === 0) return;
    const shown = [
      ...due.filter((close) => close.big),
      ...due.filter((close) => !close.big),
    ].slice(0, CLOSE_FLOATS_PER_FRAME);
    for (const close of shown) {
      const x = close.x * this.#scale + this.#offX;
      const y = close.y * this.#scale + this.#offY;
      if (close.big) {
        this.floatBig(x, y, formatMoney(close.value));
        continue;
      }
      this.floatPayout(x, y, formatMoney(close.value), {
        colour: BOARD_TEXT.bright,
        size: CLOSE_FLOAT.size,
        rise: CLOSE_FLOAT.rise,
      });
    }
  }

  #bill(parts: BoardParts): void {
    const payout = this.deps.takePayout();
    if (payout <= 0) return;
    this.floatPayout(
      parts.strip.dropX,
      parts.strip.dropY,
      `+${formatMoney(payout)}`
    );
  }

  #buildSecret(): void {
    const note = this.add
      .text(0, 0, SECRET_NOTE, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: BOARD_TEXT.secret,
      })
      .setDepth(DEPTH.strip + 10)
      .setInteractive({ useHandCursor: true });

    note.once(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      this.deps.unlockSecret();
      this.pulse(note);
      note.setColor(BOARD_TEXT.gold).disableInteractive();
      this.floatPayout(note.x + note.width / 2, note.y, 'You read the code');
    });
    this.#secret = note;
  }

  #layout(): void {
    const parts = this.#parts;
    if (!parts) return;

    const width = Math.max(1, this.scale.width);
    const height = Math.max(1, this.scale.height);
    if (width === this.#width && height === this.#height) return;
    this.#width = width;
    this.#height = height;

    this.#boardHeight = Math.max(
      MIN_BOARD_HEIGHT,
      height - SPRINT_STRIP_HEIGHT
    );

    this.#scale = width / LOGICAL_BOARD.width;
    this.#offX = 0;
    this.#offY = this.#boardHeight - LOGICAL_BOARD.height * this.#scale;

    parts.ground.layout(
      this.#scale,
      this.#offX,
      this.#offY,
      width,
      this.#boardHeight
    );
    parts.strip.layout(width, height);
    parts.heap.layout(this.#scale, this.#offX, this.#offY);
    parts.spawners.layout(0, 0, width);
    parts.votes.layout(width);
    parts.crew.layout(this.#scale, this.#offX, this.#offY);
    parts.seniors.layout(this.#scale, this.#offX, this.#offY);
    parts.managers.layout(this.#scale, this.#offX, this.#offY);

    this.#floorLine?.setPosition(0, this.#boardHeight).setSize(width, 1);
    this.#secret?.setPosition(12, 8);
    this.#placeBanner();
  }

  #teardown(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.#onResize);
    this.input.off(Phaser.Input.Events.POINTER_DOWN, this.#onPointerDown);
    this.input.off(Phaser.Input.Events.POINTER_MOVE, this.#onPointerMove);
    this.input.off(Phaser.Input.Events.GAME_OUT, this.#onPointerOut);
    this.events.off(Phaser.Scenes.Events.WAKE, this.#onWake);
    this.#secret?.removeAllListeners();

    const parts = this.#parts;
    this.#parts = undefined;
    if (!parts) return;
    parts.strip.destroy();
    parts.crew.destroy();
    parts.seniors.destroy();
    parts.managers.destroy();
    parts.spawners.destroy();
    parts.votes.destroy();
    parts.flyers.destroy();
    parts.heap.destroy();
    parts.ground.destroy();
  }
}

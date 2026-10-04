/*
 * #ringScale is sqrt(scaleX * scaleY) so round shapes keep the sim area.
 */
import * as Phaser from 'phaser';

import {
  formatCompactMoney,
  formatCompactWhole,
} from '../../@shared/util/format-quantity';
import type { Board, SprintSlot } from '../../game/model/board.model';
import { inTest } from '../../game/model/board.model';
import { pickTouching, pickWithin } from '../../game/util/board';
import { WONT_FIX_FADE_MS } from '../../game/model/balance/flow';
import { hazardLabelKey } from '../../game/model/hazard.model';
import type { CrewKind } from '../../game/model/crew.model';
import { LOGICAL_BOARD, VOTE_BEAMS } from '../../game/model/geometry';
import type { TicketTypeId } from '../../game/model/ticket.model';
import { ticketLabelKey, TICKET_TYPES } from '../../game/model/ticket.model';
import { spawnerFor } from '../../game/model/spawner.model';
import {
  AURA,
  BOARD_INK,
  BOARD_TEXT,
  CARD_HEIGHT,
  CARD_WIDTH,
  CLICK_RING,
  REFUSED_MS,
  BIG_FLOAT_CAPTION,
  BUFF_BANNER,
  RELEASE_BANNER,
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
  LANE,
  RARE_LIFT,
  SPRINT_STRIP_HEIGHT,
  UNDER_TEST,
  VOTES,
  WONT_FIX_FADE,
} from '../model/board.consts';
import type { HazardNotice, SceneDeps } from '../model/scene-deps.model';
import {
  boardIconUrls,
  buildBoardAtlas,
  cardFrame,
  voteFrame,
} from '../util/board-atlas';
import { loadCrewAtlas, registerCrewAnimations } from '../util/lpc-sprite';
import { ClosePool } from '../util/close-pool';
import { FLIGHT, FlyerPool } from '../util/flyer-pool';
import { NONE, TicketHeap } from '../util/ticket-heap';
import { CrewLayer } from './crew-layer';
import { SpeechBubbles } from './speech-bubbles';
import { BuffBanners } from './buff-banners';
import { CbScene } from './cb-scene';
import { GroundLayer } from './ground-layer';
import { TierBackdrop } from './tier-backdrop';
import { SprintStrip } from './sprint-strip';
import { TierSpawners } from './tier-spawners';
import { ReleaseBanner } from './release-banner';
import { VoteBeams } from './vote-beams';

interface BoardParts {
  readonly ground: GroundLayer;
  readonly backdrop: TierBackdrop;
  readonly heap: TicketHeap;
  readonly flyers: FlyerPool;
  readonly crew: CrewLayer;
  readonly seniors: CrewLayer;
  readonly managers: CrewLayer;
  readonly bubbles: SpeechBubbles;
  readonly spawners: TierSpawners;
  readonly votes: VoteBeams;
  readonly strip: SprintStrip;
  readonly buffs: BuffBanners;
  readonly release: ReleaseBanner;
}

const DEPTH = {
  floor: 1,
  crew: 15,
  flyer: 20,
  spawner: 22,
  ring: 24,
  bubble: 26,
  strip: 30,
  hover: 60,
} as const;
const MIN_BOARD_HEIGHT = 80;
const MIN_SCALE_Y = 0.25;
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

const noticeKey = ({ kind, landed }: HazardNotice): string =>
  `board.hazard.${kind}.${landed ? 'on' : 'due'}`;

const stripHoverKey = (slot: number, held: SprintSlot): string =>
  `sprint:${slot}:${held.titleKey}`;

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

  #scaleX = 1;
  #scaleY = 1;
  #ringScale = 1;
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
  #captionAt = 0;
  #hoverSlot = NONE;

  #ring?: Phaser.GameObjects.Arc;
  #pizza?: Phaser.GameObjects.Arc;
  #auras?: Phaser.GameObjects.Graphics;
  #onBoard = false;

  #banner?: Phaser.GameObjects.Text;
  #warning = '';
  #groomed = false;

  #onResize = (): void => this.#layout();
  #onPointerDown = (
    pointer: Phaser.Input.Pointer,
    over: Phaser.GameObjects.GameObject[]
  ): void => {
    if (over.length > 0) return;
    if (pointer.worldY >= this.#boardHeight) return;
    this.#harvest(pointer.worldX, pointer.worldY);
  };
  readonly #closePool = new ClosePool<TicketTypeId>(LOGICAL_BOARD, {
    cols: CLOSE_FLOAT.cols,
    rows: CLOSE_FLOAT.rows,
    ms: CLOSE_FLOAT.poolMs,
  });
  readonly #tints = new Map<TicketTypeId, string>();
  #onWake = (): void => {
    this.#closePool.clear();
    this.deps.takeCloseFloats();
    this.deps.takeWontFix();
  };
  readonly #wontFix = new Set<number>();
  readonly #carrying = new Set<number>();
  #carryingFresh = false;
  #spawnerCount = (adr: number): number => this.deps.spawnerCount(adr);
  #seniorSeat = (seat: number): number => this.deps.seniorPoolSeat(seat);
  #tested = (id: number): boolean => {
    const board = this.deps.board();
    const ticket = board.byId.get(id);
    return ticket !== undefined && inTest(board, ticket);
  };
  #onLand = (
    id: number,
    type: TicketTypeId,
    x: number,
    y: number,
    voteMask: number
  ): boolean =>
    this.#parts ? this.#land(this.#parts, id, type, x, y, voteMask) : false;
  #onGone = (
    id: number,
    type: TicketTypeId,
    x: number,
    y: number,
    voted: boolean,
    alpha: number
  ): void => {
    if (this.#parts) this.#leave(this.#parts, id, type, x, y, voted, alpha);
  };
  #billing: {
    text: Phaser.GameObjects.Text;
    value: number;
    label: string;
  } | null = null;
  #onPointerMove = (pointer: Phaser.Input.Pointer): void => {
    this.#readBoard(pointer.worldX, pointer.worldY);
    this.#placeRing(pointer.worldX, pointer.worldY);
    this.#sweepAt = { x: pointer.worldX, y: pointer.worldY };
  };
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
    TierBackdrop.preload(this);
    SprintStrip.preload(this);
  }

  create(): void {
    this.sharpen(true);
    buildBoardAtlas(this, this.deps.text);
    registerCrewAnimations(this);
    this.deps.publishIcons(boardIconUrls(this));

    this.#floorLine = this.add
      .rectangle(0, 0, 10, 1, BOARD_INK.floorLine)
      .setOrigin(0, 0)
      .setDepth(DEPTH.floor);

    const strip = new SprintStrip(this, this.deps, DEPTH.strip);
    const parts: BoardParts = {
      ground: new GroundLayer(this, DEPTH.floor - 1),
      backdrop: new TierBackdrop(this, DEPTH.floor - 0.5),
      heap: new TicketHeap(this, (key) => this.deps.text(key)),
      flyers: new FlyerPool(this, DEPTH.flyer),
      crew: new CrewLayer(this, DEPTH.crew, 'juniors', 0, this.deps.text),
      seniors: new CrewLayer(
        this,
        DEPTH.crew + 1,
        'seniors',
        1,
        this.deps.text
      ),
      managers: new CrewLayer(
        this,
        DEPTH.crew + 2,
        'managers',
        2,
        this.deps.text
      ),
      bubbles: new SpeechBubbles(
        this,
        DEPTH.bubble,
        (key) => this.deps.text(key),
        () => this.#width
      ),
      spawners: new TierSpawners(this, DEPTH.spawner),
      votes: new VoteBeams(this, DEPTH.spawner - 1),
      strip,
      buffs: new BuffBanners(this, this.deps, DEPTH.hover - 1),
      release: new ReleaseBanner(this, this.deps, DEPTH.hover - 2),
    };
    parts.flyers.onArrive = (kind, id) => {
      if (kind === FLIGHT.drop) parts.heap.reveal(id);
    };
    parts.flyers.onVote = (beam, x) => parts.votes.pulse(beam, x);
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

    this.#auras = this.add.graphics().setDepth(DEPTH.floor + 1);

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
    parts.backdrop.tier(this.deps.tier());
    parts.spawners.sync(this.#spawnerCount);
    this.#takeWontFix();
    this.#carryingFresh = false;
    parts.heap.sync(board, this.#onLand, this.#onGone);
    parts.heap.autoCloses(this.deps.autoClosed());
    const test = this.deps.underTest();
    this.floatAlpha = test === null ? 1 : UNDER_TEST.others;
    parts.heap.underTest(test);
    parts.flyers.shade(
      test === null ? 1 : UNDER_TEST.others,
      this.#tested,
      UNDER_TEST.ink
    );
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
      this.#seniorSeat
    );
    parts.bubbles.hear(parts.crew);
    parts.bubbles.hear(parts.seniors);
    parts.bubbles.hear(parts.managers);

    parts.spawners.update(step);
    parts.votes.update(
      this.deps.underTest() === null ? this.deps.coaches() : 0,
      step
    );
    parts.heap.update(step);
    parts.crew.update(step);
    parts.seniors.update(step);
    parts.managers.update(step);
    parts.bubbles.update(step);
    parts.flyers.update(step);
    parts.strip.update();
    parts.release.update(
      this.#width / 2,
      this.#boardHeight * RELEASE_BANNER.centre,
      this.#width - 48
    );
    this.#weather(parts);
    this.#buffs(parts, step);
    this.#bill(parts);
    this.#floatCloses();
    this.#holdStripHover();
    this.#sweepFrame();
    this.#ring?.setVisible(this.#onBoard && this.deps.showClickRing());
    this.#drawPizza();
    this.#drawAuras(board);
  }

  #drawPizza(): void {
    const circle = this.#pizza;
    if (!circle) return;
    const party = this.deps.pizza();
    circle.setVisible(party !== null);
    if (!party) return;
    circle
      .setPosition(
        party.x * this.#scaleX + this.#offX,
        party.y * this.#scaleY + this.#offY
      )
      .setRadius(party.radius * this.#ringScale * (0.35 + 0.65 * party.left));
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
    y: number,
    voteMask: number
  ): boolean {
    const source = parts.spawners.originOf(spawnerFor(type)?.adr ?? -1);
    const launched = parts.flyers.launch(
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
    if (launched) parts.flyers.markVoted(id, voteMask);
    return launched;
  }

  #leave(
    parts: BoardParts,
    id: number,
    type: TicketTypeId,
    x: number,
    y: number,
    voted: boolean,
    alpha: number
  ): void {
    const from = parts.flyers.catch(id) ?? { x, y };
    if (TICKET_TYPES[type].handOnly) return;
    const frame = voted ? voteFrame(type) : cardFrame(type);
    if (this.#wontFix.has(id)) {
      if (alpha <= 0) return;
      parts.flyers.launch(
        frame,
        FLIGHT.fade,
        NONE,
        from.x,
        from.y,
        from.x,
        from.y + WONT_FIX_FADE.sink * alpha,
        WONT_FIX_FADE_MS * alpha,
        0,
        0,
        alpha
      );
      return;
    }
    if (this.#carried(id)) return;
    parts.flyers.launch(
      frame,
      FLIGHT.harvest,
      NONE,
      from.x,
      from.y,
      parts.strip.barX,
      parts.strip.slotY,
      HARVEST_MS,
      HARVEST_HOP,
      0,
      alpha
    );
  }

  #drawAuras(board: Board): void {
    const ring = this.#auras;
    if (!ring) return;
    ring.clear();
    const reach = this.deps.managerReach() * this.#ringScale;
    if (reach <= 0) return;
    for (const manager of board.managers) {
      const x = manager.x * this.#scaleX + this.#offX;
      const y = manager.y * this.#scaleY + this.#offY;
      ring.fillStyle(BOARD_INK.aura, AURA.fill).fillCircle(x, y, reach);
      ring
        .lineStyle(AURA.line, BOARD_INK.aura, AURA.stroke)
        .strokeCircle(x, y, reach);
    }
  }

  #weather(parts: BoardParts): void {
    const notice = this.deps.hazardNotice();
    const groomed = notice?.id === 'grooming' && notice.landed;
    if (groomed && !this.#groomed) parts.heap.redraw();
    this.#groomed = groomed;
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
    const text = this.deps.text(noticeKey(notice), { name, seconds });
    if (text === this.#warning) return;
    this.#warning = text;
    banner
      .setText(text)
      .setColor(notice.landed ? BOARD_TEXT.bright : BOARD_TEXT.gold)
      .setVisible(true);
    this.#placeBanner();
  }

  #buffs(parts: BoardParts, step: number): void {
    const banner = this.#banner;
    const bottom = banner?.visible
      ? banner.y - BUFF_BANNER.gap
      : this.#boardHeight - HAZARD_BANNER_LIFT;
    const clear = Math.min(BUFF_BANNER.awardClearance, this.#width / 3);
    parts.buffs.update(
      step,
      (clear + this.#width) / 2,
      bottom,
      this.#width - clear - BUFF_BANNER.gap * 2,
      banner?.visible ? 1 : 2
    );
  }

  #placeBanner(): void {
    const banner = this.#banner;
    if (!banner?.visible) return;
    banner.setPosition(
      (this.#width - banner.width) / 2,
      this.#boardHeight - banner.height - HAZARD_BANNER_LIFT
    );
  }

  #takeWontFix(): void {
    const due = this.deps.takeWontFix();
    if (due.length === 0 && this.#wontFix.size === 0) return;
    this.#wontFix.clear();
    for (const id of due) this.#wontFix.add(id);
  }

  #carried(id: number): boolean {
    if (!this.#carryingFresh) {
      this.#carryingFresh = true;
      this.#gatherCarried(this.deps.board());
    }
    return this.#carrying.has(id);
  }

  #gatherCarried(board: Board): void {
    const carrying = this.#carrying;
    carrying.clear();
    for (const member of board.juniors) {
      for (const card of member.carrying) carrying.add(card.id);
    }
    for (const member of board.seniors) {
      for (const card of member.carrying) carrying.add(card.id);
    }
    for (const member of board.managers) {
      for (const card of member.carrying) carrying.add(card.id);
    }
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

    const x = (px - this.#offX) / this.#scaleX;
    const y = (py - this.#offY) / this.#scaleY;
    const board = this.deps.board();
    const near = pickWithin(
      board,
      x,
      y,
      PICK_RADIUS / this.#scaleX,
      PICK_RADIUS / this.#scaleY
    ).filter((id) => !parts.flyers.isFalling(id));
    const id = cardAt(
      board,
      near,
      px,
      py,
      (at) => this.#offX + at * this.#scaleX,
      (at) => this.#offY + at * this.#scaleY
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
      this.deps.text(held.titleKey),
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
    this.#ring
      ?.setPosition(px, py)
      .setRadius(this.deps.radius() * this.#ringScale);
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

  #sweep(px: number, py: number): void {
    const parts = this.#parts;
    if (!parts) return;
    const { flyers } = parts;
    const ring = this.deps.radius() * this.#ringScale;
    const ids = pickTouching(
      this.deps.board(),
      (px - this.#offX) / this.#scaleX,
      (py - this.#offY) / this.#scaleY,
      ring / this.#scaleX,
      ring / this.#scaleY
    ).filter((id) => !flyers.isFalling(id));
    flyers.fallingWithin(px, py, ring, ids);
    if (ids.length === 0) return;

    const { taken, refused, value, sp, big, headline, declined } =
      this.deps.harvest(ids);
    if (refused.length > 0) {
      this.#refusedUntil = this.time.now + REFUSED_MS;
      parts.heap.bounce(refused.filter((id) => !flyers.isFalling(id)));
    }
    if (taken.length === 0) return;
    if (declined) {
      const meeting = this.deps.text(hazardLabelKey(declined));
      this.floatBig(
        px,
        py - 22,
        this.deps.text('board.declined'),
        this.deps.text('board.declined.caption', { meeting })
      );
    }
    if (value > 0 && big) {
      this.floatBig(
        px,
        py - 22,
        `+${formatCompactMoney(value)}`,
        this.#caption(headline)
      );
    } else if (value > 0)
      this.floatPayout(px, py - 14, `+${formatCompactMoney(value)}`);
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
    ring.setPosition(px, py).setRadius(this.deps.radius() * this.#ringScale);
    this.tweens.add({
      targets: ring,
      alpha: { from: CLICK_RING.flashAlpha, to: CLICK_RING.alpha },
      duration: CLICK_RING.flashMs,
      ease: 'Quad.easeOut',
    });
  }

  #floatCloses(): void {
    const now = this.time.now;
    for (const close of this.deps.takeCloseFloats()) {
      const shown =
        close.big &&
        this.floatBig(
          this.#viewX(close.x),
          this.#viewY(close.y),
          `+${formatCompactMoney(close.value)}`,
          this.#caption(close.headline)
        );
      if (!shown) {
        this.#closePool.add(close.x, close.y, close.value, close.type, now);
      }
    }
    const due = this.#closePool.due(now);
    for (const sum of due.slice(0, CLOSE_FLOATS_PER_FRAME)) {
      this.floatPayout(
        this.#viewX(sum.x),
        this.#viewY(sum.y),
        `+${formatCompactMoney(sum.value)}`,
        {
          colour: this.#tint(sum.type),
          size: CLOSE_FLOAT.size,
          rise: CLOSE_FLOAT.rise,
        }
      );
    }
  }

  #viewX(x: number): number {
    return x * this.#scaleX + this.#offX;
  }

  #viewY(y: number): number {
    return y * this.#scaleY + this.#offY;
  }

  #tint(type: TicketTypeId): string {
    let tint = this.#tints.get(type);
    if (!tint) {
      tint = Phaser.Display.Color.IntegerToColor(
        TICKET_TYPES[type].colour
      ).lighten(CLOSE_FLOAT.lighten).rgba;
      this.#tints.set(type, tint);
    }
    return tint;
  }

  #caption(titleKey: string | null): string | undefined {
    if (titleKey === null || this.time.now < this.#captionAt) return undefined;
    this.#captionAt = this.time.now + BIG_FLOAT_CAPTION.everyMs;
    return this.deps.text(titleKey);
  }

  #bill(parts: BoardParts): void {
    const payout = this.deps.takePayouts();
    if (payout <= 0) return;
    const live = this.#billing;
    if (live && live.text.visible && live.text.text === live.label) {
      live.value += payout;
      live.label = `+${formatCompactMoney(live.value)}`;
      live.text.setText(live.label);
      return;
    }
    const label = `+${formatCompactMoney(payout)}`;
    const text = this.floatPayout(parts.strip.barX, parts.strip.dropY, label);
    this.#billing = { text, value: payout, label };
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
      this.floatPayout(
        note.x + note.width / 2,
        note.y,
        this.deps.text('award.a-secret.label')
      );
    });
    this.#secret = note;
  }

  #layout(): void {
    const parts = this.#parts;
    if (!parts) return;

    const width = Math.max(1, this.viewWidth);
    const height = Math.max(1, this.viewHeight);
    if (width === this.#width && height === this.#height) return;
    this.#width = width;
    this.#height = height;

    this.#boardHeight = Math.max(
      MIN_BOARD_HEIGHT,
      height - SPRINT_STRIP_HEIGHT
    );

    this.#scaleX = width / LOGICAL_BOARD.width;
    const beam = LANE.top + LANE.height + VOTES.belowSpawners;
    this.#scaleY = Math.max(
      MIN_SCALE_Y,
      (this.#boardHeight - beam) / (LOGICAL_BOARD.height - VOTE_BEAMS.top)
    );
    this.#ringScale = Math.sqrt(this.#scaleX * this.#scaleY);
    this.#offX = 0;
    this.#offY = this.#boardHeight - LOGICAL_BOARD.height * this.#scaleY;

    parts.ground.layout(
      this.#scaleX,
      this.#offX,
      this.#offY,
      width,
      this.#boardHeight
    );
    parts.backdrop.layout(width, this.#boardHeight);
    parts.strip.layout(width, height);
    parts.heap.layout(this.#scaleX, this.#scaleY, this.#offX, this.#offY);
    parts.spawners.layout(0, 0, width);
    parts.votes.layout(width, this.#scaleY, this.#offY);
    parts.flyers.beams(this.#offY, this.#scaleY);
    for (const crew of [parts.crew, parts.seniors, parts.managers]) {
      crew.layout(this.#scaleX, this.#scaleY, this.#offX, this.#offY);
    }

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
    parts.buffs.destroy();
    parts.release.destroy();
    parts.crew.destroy();
    parts.seniors.destroy();
    parts.managers.destroy();
    parts.bubbles.destroy();
    parts.spawners.destroy();
    parts.votes.destroy();
    parts.flyers.destroy();
    parts.heap.destroy();
    parts.ground.destroy();
    parts.backdrop.destroy();
    this.#billing = null;
  }
}

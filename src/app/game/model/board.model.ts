import type { TicketTypeId } from './ticket.model';
import type { CrewKind } from './crew.model';
import { TICKET_LIFE_MS } from './balance/flow';
import {
  HEAP_OVERFLOW_ROWS,
  HEAP_SPAWN_GAP_ROWS,
  LOGICAL_BOARD,
  TICKET_SLOT,
  VOTE_BEAMS,
} from './geometry';

export const NO_TICKET = -1;
export const NEVER_EXPIRES = -1;

export type CrewPhase = 'idle' | 'toTicket' | 'closing' | 'meeting';

export interface Carried {
  readonly id: number;
  readonly type: TicketTypeId;
  readonly titleKey: string;
  readonly golden: boolean;
  readonly reborn: boolean;
  readonly spBonus: number;
}

export interface BoardTicket {
  readonly id: number;
  readonly type: TicketTypeId;
  readonly titleKey: string;
  readonly reborn: boolean;
  golden: boolean;
  spBonus: number;
  voteMask: number;
  lifeLeftMs: number;
  fadeLeftMs: number;
  readonly x: number;
  readonly y: number;
  claimedBy: number;
  cell: number;
  at: number;
  poolAt: number;
}

export interface CrewMember {
  readonly id: number;
  phase: CrewPhase;
  target: number;
  leftMs: number;
  carrying: readonly Carried[];
  x: number;
  y: number;
}

export const NO_SEAT = -1;

export type CloseAuthor = 'you' | 'auto' | CrewKind;

export interface Close {
  readonly type: TicketTypeId;
  readonly titleKey: string;
  readonly golden: boolean;
  readonly spBonus: number;
  readonly by: CloseAuthor;
  readonly poolSeat: number;
  readonly woman: boolean;
  readonly x: number;
  readonly y: number;
}

export interface SprintSlot {
  readonly type: TicketTypeId;
  readonly titleKey: string;
}

export type TicketMix = Readonly<Partial<Record<TicketTypeId, number>>>;

export function ticketMix(slots: readonly SprintSlot[]): TicketMix {
  const mix: Partial<Record<TicketTypeId, number>> = {};
  for (const { type } of slots) mix[type] = (mix[type] ?? 0) + 1;
  return mix;
}

export interface CloseFloat {
  readonly x: number;
  readonly y: number;
  readonly value: number;
  readonly big: boolean;
  readonly headline: string | null;
}

export interface Harvest {
  readonly taken: readonly number[];
  readonly refused: readonly number[];
  readonly value: number;
  readonly sp: number;
  readonly big: boolean;
  readonly headline: string | null;
}

export interface Comeback {
  readonly type: TicketTypeId;
  leftMs: number;
}

export interface Board {
  readonly tickets: BoardTicket[];
  readonly claimable: BoardTicket[];
  readonly rares: BoardTicket[];
  readonly juniors: CrewMember[];
  readonly seniors: CrewMember[];
  readonly managers: CrewMember[];
  readonly pending: Comeback[];
  readonly displaced: BoardTicket[];
  readonly byId: Map<number, BoardTicket>;
  readonly crewById: Map<number, CrewMember>;
  readonly grid: Int32Array;
  readonly lowFree: Int32Array;
  nextId: number;
  nextCrewId: number;
  lifeMs: number;
}

export const HEAP_COLS = Math.floor(LOGICAL_BOARD.width / TICKET_SLOT.width);
export const HEAP_FIELD_ROWS = Math.floor(
  LOGICAL_BOARD.height / TICKET_SLOT.height
);
export const HEAP_ROWS = HEAP_FIELD_ROWS + HEAP_OVERFLOW_ROWS;

const HEAP_LEFT = (LOGICAL_BOARD.width - HEAP_COLS * TICKET_SLOT.width) / 2;
const HEAP_FLOOR = LOGICAL_BOARD.height - TICKET_SLOT.height / 2;

export function cellX(col: number): number {
  return HEAP_LEFT + col * TICKET_SLOT.width + TICKET_SLOT.width / 2;
}

export function cellY(row: number): number {
  return HEAP_FLOOR - row * TICKET_SLOT.height;
}

export function voteBeamY(index: number): number {
  return VOTE_BEAMS.top + index * VOTE_BEAMS.spacing;
}

export function voteCount(mask: number): number {
  let count = 0;
  for (let rest = mask; rest !== 0; rest &= rest - 1) count += 1;
  return count;
}

export const HEAP_SPAWN_ROWS = HEAP_FIELD_ROWS - HEAP_SPAWN_GAP_ROWS;

export function meetingSpot(id: number): { x: number; y: number } {
  const column = id % MEETING_ROOM.columns;
  const row = Math.floor(id / MEETING_ROOM.columns) % MEETING_ROOM.rows;
  return {
    x:
      MEETING_ROOM.x +
      (column - (MEETING_ROOM.columns - 1) / 2) * MEETING_ROOM.gap,
    y: MEETING_ROOM.y + row * MEETING_ROOM.gap,
  };
}

const MEETING_ROOM = {
  x: LOGICAL_BOARD.width / 2,
  y: LOGICAL_BOARD.height * 0.62,
  columns: 8,
  rows: 6,
  gap: 26,
} as const;

export function emptyBoard(): Board {
  return {
    tickets: [],
    claimable: [],
    rares: [],
    juniors: [],
    seniors: [],
    managers: [],
    pending: [],
    displaced: [],
    byId: new Map(),
    crewById: new Map(),
    grid: new Int32Array(HEAP_COLS * HEAP_ROWS).fill(NO_TICKET),
    lowFree: new Int32Array(HEAP_COLS),
    nextId: 1,
    nextCrewId: 0,
    lifeMs: TICKET_LIFE_MS,
  };
}

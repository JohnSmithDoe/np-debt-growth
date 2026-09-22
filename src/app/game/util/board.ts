import type {
  Board,
  BoardTicket,
  Carried,
  Close,
  CrewMember,
} from '../model/board.model';
import {
  cellX,
  cellY,
  HEAP_COLS,
  HEAP_ROWS,
  meetingSpot,
  NOT_AUTOMATED,
  NO_TICKET,
} from '../model/board.model';
import { pickTicketTitle } from '../model/ticket-copy.model';
import type { TicketTypeId } from '../model/ticket.model';
import { TICKET_TYPES } from '../model/ticket.model';
import type { CrewRules, CrewSeat, HirePace } from '../model/crew.model';
import { FLAKY_COMEBACK_MS } from '../model/ticket.model';
import { BOARD_CAPACITY, LOGICAL_BOARD } from '../model/geometry';

const OUT_OF_POOL = -1;
const COLUMN_SAMPLES = 4;
const CLAIM_SAMPLES = 4;

export type Closed = readonly Close[];

export interface CrewWork {
  readonly closed: Closed;
  readonly byWomen: number;
}

function bill(board: Board, card: Carried): TicketTypeId {
  if (TICKET_TYPES[card.type].respawns && !card.reborn) {
    board.pending.push({ type: card.type, leftMs: FLAKY_COMEBACK_MS });
  }
  return card.type;
}

function refile(
  board: Board,
  transform: (type: TicketTypeId) => TicketTypeId | null,
  card: Carried,
  rand: () => number
): null {
  const target = transform(card.type);
  const filed = target !== null && !card.relabelled;
  addTicket(
    board,
    filed ? target : card.type,
    rand,
    filed && TICKET_TYPES[target].respawns ? true : card.reborn,
    filed || card.relabelled
  );
  return null;
}

function deliver(
  rules: CrewRules,
  board: Board,
  card: Carried,
  rand: () => number
): TicketTypeId | null {
  if (rules.mode === 'refiler') {
    return rules.transform === null
      ? null
      : refile(board, rules.transform, card, rand);
  }

  const banked = bill(board, card);
  const { leaves } = rules;
  if (leaves) {
    for (let n = 0; n < leaves.count; n += 1) {
      addTicket(board, leaves.type, rand);
    }
  }
  return banked;
}

export function stepBoard(
  board: Board,
  crews: readonly CrewRules[],
  dtMs: number,
  rand: () => number = Math.random,
  room = Number.POSITIVE_INFINITY
): CrewWork {
  returning(board, dtMs, rand);
  return workCrews(board, crews, dtMs, rand, room);
}

export function workCrews(
  board: Board,
  crews: readonly CrewRules[],
  dtMs: number,
  rand: () => number = Math.random,
  room = Number.POSITIVE_INFINITY
): CrewWork {
  const closed: Close[] = [];
  let byWomen = 0;

  for (const rules of crews) {
    const took = work(board, rules, dtMs, rand, room - closed.length);
    closed.push(...took.closed);
    byWomen += took.byWomen;
  }
  return { closed, byWomen };
}

export function addTicket(
  board: Board,
  type: TicketTypeId,
  rand: () => number = Math.random,
  reborn = false,
  relabelled = false,
  golden = false
): BoardTicket | null {
  if (board.tickets.length >= BOARD_CAPACITY && !admittedPastCap(type)) {
    return null;
  }
  const cell = claimCell(board, rand);
  if (cell === NO_TICKET) return null;

  const col = Math.floor(cell / HEAP_ROWS);
  const ticket: BoardTicket = {
    id: board.nextId++,
    type,
    title: pickTicketTitle(type),
    reborn,
    golden,
    relabelled,
    autoLeftMs: NOT_AUTOMATED,
    x: cellX(col),
    y: cellY(cell - col * HEAP_ROWS),
    claimedBy: NO_TICKET,
    cell,
    at: board.tickets.length,
    poolAt: OUT_OF_POOL,
  };
  board.grid[cell] = ticket.id;
  board.tickets.push(ticket);
  board.byId.set(ticket.id, ticket);
  enterPool(board, ticket);
  return ticket;
}

export function removeTicket(board: Board, ticket: BoardTicket): void {
  const claimer = ticket.claimedBy;
  ticket.claimedBy = NO_TICKET;
  if (claimer !== NO_TICKET) dropClaim(board, claimer);
  leavePool(board, ticket);
  freeCell(board, ticket.cell);
  swapOut(board.tickets, ticket.at, setAt);
  board.byId.delete(ticket.id);
}

function returning(board: Board, dtMs: number, rand: () => number): void {
  for (let at = board.pending.length - 1; at >= 0; at--) {
    const due = board.pending[at];
    if (!due) continue;
    due.leftMs -= dtMs;
    if (due.leftMs > 0) continue;
    addTicket(board, due.type, rand, true);
    board.pending.splice(at, 1);
  }
}

function staff(board: Board, rules: CrewRules, rand: () => number): void {
  while (rules.crew.length > rules.size) {
    const gone = rules.crew.pop();
    if (!gone) break;
    release(board, gone.id);
    board.crewById.delete(gone.id);
  }
  while (rules.crew.length < rules.size) {
    const member: CrewMember = {
      id: board.nextCrewId++,
      phase: 'idle',
      target: NO_TICKET,
      leftMs: 0,
      carrying: [],
      x: rand() * LOGICAL_BOARD.width,
      y: rules.homeY,
    };
    rules.crew.push(member);
    board.crewById.set(member.id, member);
  }
}

function startWalk(
  board: Board,
  rules: CrewRules,
  pace: HirePace,
  worker: CrewMember,
  rand: () => number
): void {
  const ticket = claim(board, rules, pace, worker, rand);
  if (!ticket) return;
  ticket.claimedBy = worker.id;
  worker.target = ticket.id;
  worker.phase = 'toTicket';
}

function stepToward(
  worker: CrewMember,
  target: { readonly x: number; readonly y: number },
  step: number
): boolean {
  const dx = target.x - worker.x;
  const dy = target.y - worker.y;
  const distance = Math.hypot(dx, dy);
  if (distance > step) {
    worker.x += (dx / distance) * step;
    worker.y += (dy / distance) * step;
    return false;
  }
  worker.x = target.x;
  worker.y = target.y;
  return true;
}

function deliverClose(
  rules: CrewRules,
  worker: CrewMember,
  board: Board,
  seat: CrewSeat,
  rand: () => number
): CrewWork {
  const { poolSeat, woman } = seat;
  const closed: Close[] = [];

  const handing = worker.carrying;
  worker.carrying = [];

  for (const card of handing) {
    const banked = deliver(rules, board, card, rand);
    if (banked === null) continue;
    closed.push({
      type: banked,
      title: card.title,
      golden: card.golden,
      by: rules.kind,
      poolSeat,
      woman,
      x: worker.x,
      y: worker.y,
    });
  }
  return { closed, byWomen: woman ? closed.length : 0 };
}

function pickUp(
  board: Board,
  rules: CrewRules,
  pace: HirePace,
  worker: CrewMember,
  target: BoardTicket
): void {
  const taken = sweep(board, rules, pace, target, pace.batch);
  worker.carrying = taken.map((ticket) => ({
    type: ticket.type,
    title: ticket.title,
    golden: ticket.golden,
    reborn: ticket.reborn,
    relabelled: ticket.relabelled,
  }));
  for (const ticket of taken) {
    ticket.claimedBy = NO_TICKET;
    removeTicket(board, ticket);
  }
  worker.target = NO_TICKET;
}

export function work(
  board: Board,
  rules: CrewRules,
  dtMs: number,
  rand: () => number = Math.random,
  room = Number.POSITIVE_INFINITY
): CrewWork {
  staff(board, rules, rand);
  const closed: Close[] = [];
  let byWomen = 0;
  const meeting = rules.interrupted;

  for (let index = 0; index < rules.crew.length; index++) {
    const worker = rules.crew[index];
    if (!worker) continue;
    const pace = rules.paces?.[index] ?? rules;

    if (meeting) {
      if (worker.phase !== 'meeting') {
        release(board, worker.id);
        worker.phase = 'meeting';
        worker.target = NO_TICKET;
      }
      stepToward(worker, meetingSpot(worker.id), (pace.speed * dtMs) / 1000);
      continue;
    }
    if (worker.phase === 'meeting') worker.phase = 'idle';

    if (worker.phase === 'idle') {
      startWalk(board, rules, pace, worker, rand);
      continue;
    }

    // Reaching the card files it there and then; the time is spent
    // recovering afterwards, which reads as working rather than idling.
    if (worker.phase === 'toTicket') {
      const target = board.byId.get(worker.target);
      if (!target) {
        dropClaim(board, worker.id);
        continue;
      }
      if (!stepToward(worker, target, (pace.speed * dtMs) / 1000)) continue;
      // The can is full: wait at the card rather than overfilling it.
      if (closed.length >= room) continue;

      const seat = rules.seatOf(index, pace);
      pickUp(board, rules, pace, worker, target);
      const took = deliverClose(rules, worker, board, seat, rand);
      closed.push(...took.closed);
      byWomen += took.byWomen;
      worker.phase = 'closing';
      worker.leftMs = seat.closeMs;
      continue;
    }

    worker.leftMs -= dtMs;
    if (worker.leftMs > 0) continue;
    worker.phase = 'idle';
    worker.leftMs = 0;
  }
  return { closed, byWomen };
}

function sweep(
  board: Board,
  rules: CrewRules,
  pace: HirePace,
  target: BoardTicket,
  room: number
): readonly BoardTicket[] {
  const limit = Math.min(pace.batch, room);
  if (limit <= 1) return [target];

  const near = pickWithin(board, target.x, target.y, pace.sweep)
    .map((id) => board.byId.get(id))
    .filter(
      (ticket): ticket is BoardTicket =>
        ticket !== undefined &&
        ticket !== target &&
        rules.claims(ticket.type) &&
        (!ticket.golden || rules.golden)
    )
    .sort(
      (a, b) =>
        Math.hypot(a.x - target.x, a.y - target.y) -
        Math.hypot(b.x - target.x, b.y - target.y)
    );

  return [target, ...near.slice(0, limit - 1)];
}

export function comeBack(board: Board, ticket: BoardTicket): void {
  if (!TICKET_TYPES[ticket.type].respawns || ticket.reborn) return;
  board.pending.push({ type: ticket.type, leftMs: FLAKY_COMEBACK_MS });
}

export function pickWithin(
  board: Board,
  x: number,
  y: number,
  radius: number
): number[] {
  const found: number[] = [];
  for (const ticket of board.tickets) {
    const dx = ticket.x - x;
    const dy = ticket.y - y;
    if (dx * dx + dy * dy <= radius * radius) found.push(ticket.id);
  }
  return found;
}

function claim(
  board: Board,
  rules: CrewRules,
  pace: HirePace,
  worker: CrewMember,
  rand: () => number
): BoardTicket | null {
  const total = board.claimable.length + (rules.rares ? board.rares.length : 0);
  if (total === 0) return null;

  let best: BoardTicket | null = null;
  let bestAway = Number.POSITIVE_INFINITY;
  for (let sample = 0; sample < CLAIM_SAMPLES; sample++) {
    const at = Math.floor(rand() * total);
    const ticket =
      at < board.claimable.length
        ? board.claimable[at]
        : board.rares[at - board.claimable.length];
    if (!ticket || !rules.claims(ticket.type)) continue;
    if (ticket.golden && !rules.golden) continue;
    if (pace.pick === 'random') {
      leavePool(board, ticket);
      return ticket;
    }
    const rank =
      pace.pick === 'cheapest'
        ? TICKET_TYPES[ticket.type].tier
        : pace.pick === 'dearest'
          ? -TICKET_TYPES[ticket.type].tier
          : Math.hypot(ticket.x - worker.x, ticket.y - worker.y);
    if (rank < bestAway) {
      bestAway = rank;
      best = ticket;
    }
  }
  if (best) {
    leavePool(board, best);
    return best;
  }
  return firstAllowed(board, rules);
}

function firstAllowed(board: Board, rules: CrewRules): BoardTicket | null {
  for (const ticket of board.claimable) {
    if (rules.claims(ticket.type) && (!ticket.golden || rules.golden)) {
      leavePool(board, ticket);
      return ticket;
    }
  }
  if (!rules.rares) return null;
  for (const ticket of board.rares) {
    if (rules.claims(ticket.type) && (!ticket.golden || rules.golden)) {
      leavePool(board, ticket);
      return ticket;
    }
  }
  return null;
}

function dropClaim(board: Board, crewId: number): void {
  const worker = board.crewById.get(crewId);
  if (!worker) return;
  const held = board.byId.get(worker.target);
  if (held?.claimedBy === crewId) {
    held.claimedBy = NO_TICKET;
    enterPool(board, held);
  }
  worker.phase = 'idle';
  worker.target = NO_TICKET;
  worker.carrying = [];
}

function release(board: Board, crewId: number): void {
  dropClaim(board, crewId);
  const worker = board.crewById.get(crewId);
  if (worker) worker.leftMs = 0;
}

function claimCell(board: Board, rand: () => number): number {
  const sampled = lowestFreeCell(board, chooseColumn(board, rand));
  if (sampled !== NO_TICKET) return sampled;

  for (let col = 0; col < HEAP_COLS; col++) {
    const cell = lowestFreeCell(board, col);
    if (cell !== NO_TICKET) return cell;
  }
  return NO_TICKET;
}

function lowestFreeCell(board: Board, col: number): number {
  if (col === NO_TICKET) return NO_TICKET;
  const base = col * HEAP_ROWS;
  let row = board.lowFree[col] ?? 0;
  while (row < HEAP_ROWS && board.grid[base + row] !== NO_TICKET) row++;
  board.lowFree[col] = Math.min(row + 1, HEAP_ROWS);
  return row < HEAP_ROWS ? base + row : NO_TICKET;
}

function chooseColumn(board: Board, rand: () => number): number {
  let best = NO_TICKET;
  let bestRow = HEAP_ROWS;
  for (let sample = 0; sample < COLUMN_SAMPLES; sample++) {
    const col = Math.floor(rand() * HEAP_COLS);
    const row = board.lowFree[col] ?? HEAP_ROWS;
    if (row < bestRow) {
      bestRow = row;
      best = col;
    }
  }
  return best;
}

function freeCell(board: Board, cell: number): void {
  board.grid[cell] = NO_TICKET;
  const col = Math.floor(cell / HEAP_ROWS);
  const row = cell - col * HEAP_ROWS;
  if (row < (board.lowFree[col] ?? 0)) board.lowFree[col] = row;
}

function handOnly(ticket: BoardTicket): boolean {
  return TICKET_TYPES[ticket.type].handOnly;
}

function admittedPastCap(type: TicketTypeId): boolean {
  return TICKET_TYPES[type].effect === 'decline';
}

function poolOf(board: Board, ticket: BoardTicket): BoardTicket[] {
  return handOnly(ticket) ? board.rares : board.claimable;
}

function enterPool(board: Board, ticket: BoardTicket): void {
  const pool = poolOf(board, ticket);
  ticket.poolAt = pool.length;
  pool.push(ticket);
}

function leavePool(board: Board, ticket: BoardTicket): void {
  if (ticket.poolAt === OUT_OF_POOL) return;
  swapOut(poolOf(board, ticket), ticket.poolAt, setPoolAt);
  ticket.poolAt = OUT_OF_POOL;
}

function setAt(ticket: BoardTicket, at: number): void {
  ticket.at = at;
}

function setPoolAt(ticket: BoardTicket, at: number): void {
  ticket.poolAt = at;
}

function swapOut(
  list: BoardTicket[],
  at: number,
  reindex: (moved: BoardTicket, at: number) => void
): void {
  const last = list.pop();
  if (last === undefined || at >= list.length) return;
  list[at] = last;
  reindex(last, at);
}

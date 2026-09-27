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
  HEAP_SPAWN_ROWS,
  meetingSpot,
  NEVER_EXPIRES,
  NO_TICKET,
} from '../model/board.model';
import { pickTicketTitle } from '../model/ticket-copy.model';
import type { TicketTypeId } from '../model/ticket.model';
import { TICKET_TYPES } from '../model/ticket.model';
import type { CrewRules, CrewSeat, HirePace, Rush } from '../model/crew.model';
import { FLAKY_COMEBACK_MS } from '../model/ticket.model';
import {
  BOARD_CAPACITY,
  CARD_HIT,
  LOGICAL_BOARD,
  RARE_HIT,
} from '../model/geometry';
import { GOLDEN_LIFE_MS, WONT_FIX_FADE_MS } from '../model/balance/flow';

const OUT_OF_POOL = -1;
const COLUMN_SAMPLES = 4;
const SCATTER_SAMPLES = 8;
const CLAIM_SAMPLES = 4;
const NO_TYPES: ReadonlySet<TicketTypeId> = new Set();

export type Closed = readonly Close[];

export interface CrewWork {
  readonly closed: Closed;
  readonly byWomen: number;
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
  golden = false
): BoardTicket | null {
  if (board.tickets.length >= BOARD_CAPACITY && !admittedPastCap(type)) {
    if (!displaceOldest(board)) return null;
  }
  const cell = claimCell(board, rand);
  if (cell === NO_TICKET) return null;

  const col = Math.floor(cell / HEAP_ROWS);
  const ticket: BoardTicket = {
    id: board.nextId++,
    type,
    titleKey: pickTicketTitle(type),
    reborn,
    golden,
    spBonus: 0,
    voteMask: 0,
    lifeLeftMs: TICKET_TYPES[type].handOnly
      ? NEVER_EXPIRES
      : golden
        ? GOLDEN_LIFE_MS
        : board.lifeMs,
    fadeLeftMs: WONT_FIX_FADE_MS,
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

function displaceOldest(board: Board): boolean {
  let oldest: BoardTicket | null = null;
  for (const ticket of board.tickets) {
    if (ticket.lifeLeftMs === NEVER_EXPIRES) continue;
    if (ticket.claimedBy !== NO_TICKET) continue;
    if (!oldest || displacesBefore(ticket, oldest)) oldest = ticket;
  }
  if (!oldest) return false;
  removeTicket(board, oldest);
  board.displaced.push(oldest);
  return true;
}

function displacesBefore(a: BoardTicket, b: BoardTicket): boolean {
  if (a.golden !== b.golden) return b.golden;
  return a.lifeLeftMs < b.lifeLeftMs;
}

export function fadeOf(ticket: BoardTicket): number {
  return ticket.lifeLeftMs === 0 ? ticket.fadeLeftMs / WONT_FIX_FADE_MS : 1;
}

export function expireTickets(
  board: Board,
  dtMs: number,
  into: BoardTicket[],
  autoCloses: ReadonlySet<TicketTypeId> = NO_TYPES,
  closing: BoardTicket[] = []
): void {
  into.push(...board.displaced);
  board.displaced.length = 0;
  for (let at = board.tickets.length - 1; at >= 0; at--) {
    const ticket = board.tickets[at];
    if (!ticket || ticket.lifeLeftMs === NEVER_EXPIRES) continue;
    if (ticket.claimedBy !== NO_TICKET) continue;
    if (ticket.lifeLeftMs > 0) {
      ticket.lifeLeftMs = Math.max(0, ticket.lifeLeftMs - dtMs);
      if (ticket.lifeLeftMs > 0) continue;
      if (autoCloses.has(ticket.type)) {
        closing.push(ticket);
        removeTicket(board, ticket);
        continue;
      }
      leavePool(board, ticket);
      continue;
    }
    ticket.fadeLeftMs -= dtMs;
    if (ticket.fadeLeftMs > 0) continue;
    into.push(ticket);
    removeTicket(board, ticket);
  }
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
  seat: CrewSeat
): CrewWork {
  const { poolSeat, woman } = seat;
  const closed: Close[] = [];

  const handing = worker.carrying;
  worker.carrying = [];

  for (const card of handing) {
    comeBack(board, card);
    closed.push({
      type: card.type,
      titleKey: card.titleKey,
      golden: card.golden,
      spBonus: card.spBonus,
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
  target: BoardTicket,
  room: number
): void {
  const taken = sweep(board, rules, pace, target, room);
  worker.carrying = taken.map((ticket) => ({
    id: ticket.id,
    type: ticket.type,
    titleKey: ticket.titleKey,
    golden: ticket.golden,
    spBonus: ticket.spBonus,
    reborn: ticket.reborn,
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
    const dt = rushed(rules.rush, worker) ? dtMs * rules.rush!.mult : dtMs;

    if (meeting) {
      if (worker.phase !== 'meeting') {
        release(board, worker.id);
        worker.phase = 'meeting';
        worker.target = NO_TICKET;
      }
      stepToward(worker, meetingSpot(worker.id), (pace.speed * dt) / 1000);
      continue;
    }
    if (worker.phase === 'meeting') worker.phase = 'idle';

    if (rules.mode === 'overseer') {
      oversee(board, rules, pace, worker, index, dt, rand);
      continue;
    }

    if (worker.phase === 'idle') {
      startWalk(board, rules, pace, worker, rand);
      continue;
    }

    if (worker.phase === 'toTicket') {
      const target = board.byId.get(worker.target);
      if (!target) {
        dropClaim(board, worker.id);
        continue;
      }
      if (!stepToward(worker, target, (pace.speed * dt) / 1000)) continue;
      if (closed.length >= room) continue;

      const seat = rules.seatOf(index, pace);
      pickUp(board, rules, pace, worker, target, room - closed.length);
      const took = deliverClose(rules, worker, board, seat);
      closed.push(...took.closed);
      byWomen += took.byWomen;
      worker.phase = 'closing';
      worker.leftMs = seat.closeMs;
      continue;
    }

    worker.leftMs -= dt;
    if (worker.leftMs > 0) continue;
    worker.phase = 'idle';
    worker.leftMs = 0;
  }
  return { closed, byWomen };
}

function oversee(
  board: Board,
  rules: CrewRules,
  pace: HirePace,
  worker: CrewMember,
  index: number,
  dt: number,
  rand: () => number
): void {
  if (worker.phase === 'idle') {
    worker.target = watchSpot(board, rand);
    if (worker.target !== NO_TICKET) worker.phase = 'toTicket';
    return;
  }
  if (worker.phase === 'toTicket') {
    const spot = board.byId.get(worker.target);
    if (spot && !stepToward(worker, spot, (pace.speed * dt) / 1000)) return;
    worker.phase = 'closing';
    worker.target = NO_TICKET;
    worker.leftMs = rules.seatOf(index, pace).closeMs;
    return;
  }
  worker.leftMs -= dt;
  if (worker.leftMs > 0) return;
  worker.phase = 'idle';
  worker.leftMs = 0;
}

function watchSpot(board: Board, rand: () => number): number {
  const busy: number[] = [];
  for (const crew of [board.juniors, board.seniors]) {
    for (const worker of crew) {
      if (worker.phase === 'toTicket' && board.byId.has(worker.target)) {
        busy.push(worker.target);
      }
    }
  }
  if (busy.length > 0) return busy[Math.floor(rand() * busy.length)]!;
  const any = board.claimable[Math.floor(rand() * board.claimable.length)];
  return any ? any.id : NO_TICKET;
}

export function overseen(
  board: Board,
  x: number,
  y: number,
  radius: number
): boolean {
  for (const manager of board.managers) {
    const dx = manager.x - x;
    const dy = manager.y - y;
    if (dx * dx + dy * dy <= radius * radius) return true;
  }
  return false;
}

function rushed(rush: Rush | null, worker: CrewMember): boolean {
  if (!rush) return false;
  const dx = worker.x - rush.x;
  const dy = worker.y - rush.y;
  return dx * dx + dy * dy <= rush.radius * rush.radius;
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
        ticket.lifeLeftMs !== 0 &&
        takes(rules, ticket)
    )
    .sort(
      (a, b) =>
        Math.hypot(a.x - target.x, a.y - target.y) -
        Math.hypot(b.x - target.x, b.y - target.y)
    );

  return [target, ...near.slice(0, limit - 1)];
}

export function comeBack(
  board: Board,
  ticket: Pick<Carried, 'type' | 'reborn'>
): void {
  if (!TICKET_TYPES[ticket.type].respawns || ticket.reborn) return;
  board.pending.push({ type: ticket.type, leftMs: FLAKY_COMEBACK_MS });
}

export function pickTouching(
  board: Board,
  x: number,
  y: number,
  radius: number,
  radiusY = radius
): number[] {
  const found: number[] = [];
  const rx = Math.max(radius, 1e-6);
  const ry = Math.max(radiusY, 1e-6);
  for (const ticket of board.tickets) {
    const box = handOnly(ticket) ? RARE_HIT : CARD_HIT;
    const dx = Math.max(0, Math.abs(ticket.x - x) - box.halfWidth) / rx;
    const dy = Math.max(0, Math.abs(ticket.y - y) - box.halfHeight) / ry;
    if (dx * dx + dy * dy <= 1) found.push(ticket.id);
  }
  return found;
}

export function pickWithin(
  board: Board,
  x: number,
  y: number,
  radius: number,
  radiusY = radius
): number[] {
  const found: number[] = [];
  for (const ticket of board.tickets) {
    const dx = (ticket.x - x) / radius;
    const dy = (ticket.y - y) / radiusY;
    if (dx * dx + dy * dy <= 1) found.push(ticket.id);
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
  const total = board.claimable.length;
  if (total === 0) return null;

  let best: BoardTicket | null = null;
  let bestAway = Number.POSITIVE_INFINITY;
  for (let sample = 0; sample < CLAIM_SAMPLES; sample++) {
    const at = Math.floor(rand() * total);
    const ticket = board.claimable[at];
    if (!ticket || !takes(rules, ticket)) continue;
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

function takes(rules: CrewRules, ticket: BoardTicket): boolean {
  return rules.claims(ticket.type) && (!ticket.golden || rules.golden);
}

function firstAllowed(board: Board, rules: CrewRules): BoardTicket | null {
  for (const ticket of board.claimable) {
    if (takes(rules, ticket)) {
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
  for (let sample = 0; sample < SCATTER_SAMPLES; sample++) {
    const col = Math.floor(rand() * HEAP_COLS);
    const cell = col * HEAP_ROWS + Math.floor(rand() * HEAP_SPAWN_ROWS);
    if (board.grid[cell] === NO_TICKET) return cell;
  }
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

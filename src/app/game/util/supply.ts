import type { Board, Close } from '../model/board.model';
import { NOT_AUTOMATED, NO_SEAT, NO_TICKET } from '../model/board.model';
import type { Consultancy } from '../model/consultancy.model';
import type { Weather } from '../model/hazard.model';
import { CALM } from '../model/hazard.model';
import { TICKET_TYPES, TICKET_TYPE_IDS } from '../model/ticket.model';
import { SPAWN_BURST_CAP } from '../model/balance/flow';
import { addTicket, comeBack, removeTicket } from './board';
import * as economy from './economy';
import { heldBack, scriptedSpawns } from './first-act';
import type { SpawnBudget } from './spawn-budget';

export function spawnInto(
  board: Board,
  budget: SpawnBudget,
  state: Consultancy,
  seconds: number,
  rand: () => number = Math.random,
  weather: Weather = CALM
): void {
  const from = state.runMs;
  const to = from + seconds * 1000;
  const interest = economy.debtInterest(state);

  for (const id of TICKET_TYPE_IDS) {
    if (heldBack(id, from)) continue;
    const storm = id === 'incident' ? weather.incidentRate : 1;
    const drought = TICKET_TYPES[id].handOnly ? 1 : weather.supply;
    const rate = economy.spawnRate(state, id) * storm * drought;
    if (rate <= 0) continue;
    const due = budget.due(id, rate, seconds, SPAWN_BURST_CAP);
    if (due === 0) continue;
    const dearer = interest > 0 ? economy.interestTarget(state, id) : null;
    for (let n = 0; n < due; n++) {
      const arriving = dearer && rand() < interest ? dearer : id;
      addTicket(board, arriving, rand);
    }
  }

  for (const id of scriptedSpawns(from, to)) addTicket(board, id, rand);
}

export function fileAutomated(
  board: Board,
  state: Consultancy,
  dtMs: number,
  weather: Weather = CALM,
  taken = 0
): Close[] {
  const waitMs = economy.autoCloseMs(state);
  let room = Math.max(0, economy.sprintRoom(state, weather) - taken);
  const closed: Close[] = [];

  for (let at = board.tickets.length - 1; at >= 0; at -= 1) {
    const ticket = board.tickets[at];
    if (!ticket) continue;
    if (!economy.autoCloses(state, ticket.type)) {
      ticket.autoLeftMs = NOT_AUTOMATED;
      continue;
    }
    if (ticket.autoLeftMs === NOT_AUTOMATED) ticket.autoLeftMs = waitMs;
    ticket.autoLeftMs -= dtMs;
    if (ticket.autoLeftMs > 0 || room <= 0) continue;
    if (ticket.claimedBy !== NO_TICKET) continue;

    room -= 1;
    closed.push({
      type: ticket.type,
      title: ticket.title,
      by: 'auto',
      poolSeat: NO_SEAT,
      woman: false,
      x: ticket.x,
      y: ticket.y,
    });
    comeBack(board, ticket);
    removeTicket(board, ticket);
  }
  return closed;
}

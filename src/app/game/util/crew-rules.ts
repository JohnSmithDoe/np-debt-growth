import type { Board } from '../model/board.model';
import type { Consultancy } from '../model/consultancy.model';
import type { Weather } from '../model/hazard.model';
import type { TicketTypeId } from '../model/ticket.model';
import { RETYPE_LADDER, TICKET_TYPES } from '../model/ticket.model';
import type { CrewMember } from '../model/board.model';
import type { CrewKind } from '../model/crew.model';
import type {
  ClaimPick,
  CrewRules,
  CrewSeat,
  HirePace,
} from '../model/crew.model';
import {
  CREW_KINDS,
  CREW_STATS,
  WOMAN_CLOSE_RATE,
} from '../model/balance/crew';
import * as economy from './economy';

function fungibleSeat(
  index: number,
  pace: HirePace,
  womanEvery: number
): CrewSeat {
  const woman = economy.hireIsWoman(index, womanEvery);
  return {
    closeMs: woman ? pace.closeMs / WOMAN_CLOSE_RATE : pace.closeMs,
    poolSeat: economy.hirePoolSeat(index, womanEvery),
    woman,
  };
}

export function crewRules(
  board: Board,
  state: Consultancy,
  weather: Weather
): readonly CrewRules[] {
  return CREW_KINDS.map((kind) => rulesFor(kind, board, state, weather));
}

function rulesFor(
  kind: CrewKind,
  board: Board,
  state: Consultancy,
  weather: Weather
): CrewRules {
  const stats = CREW_STATS[kind];
  const womanEvery = economy.crewWomanEvery(state, kind);
  const transform = kind === 'managers' ? relabel(state) : null;

  return {
    kind,
    crew: crewOf(board, kind),
    size: economy.crewSize(state, kind, weather),
    homeY: stats.homeY,
    mode: stats.mode,
    ...economy.crewPace(state, kind),
    seatOf: (index, pace) => seatOf(state, kind, index, pace, womanEvery),
    claims: transform
      ? (type) => transform(type) !== null
      : economy.crewClaims(state, kind),
    rares: economy.crewTakesRares(state, kind),
    paces: stats.perSeat ? seatPaces(state, kind, weather) : null,
    interrupted: stats.interruptible && weather.meeting,
    transform,
    leaves: leavesOf(state, stats.leaves),
  };
}

function crewOf(board: Board, kind: CrewKind): CrewMember[] {
  if (kind === 'juniors') return board.juniors;
  if (kind === 'seniors') return board.seniors;
  if (kind === 'managers') return board.managers;
  return board.offshore;
}

function seatOf(
  state: Consultancy,
  kind: CrewKind,
  index: number,
  pace: HirePace,
  womanEvery: number
): CrewSeat {
  const seat = fungibleSeat(index, pace, womanEvery);
  if (kind !== 'seniors') return seat;
  return { ...seat, poolSeat: economy.seniorPoolSeat(state, index) };
}

function seatPaces(
  state: Consultancy,
  kind: CrewKind,
  weather: Weather
): readonly HirePace[] {
  const paces: HirePace[] = [];
  const seats = economy.crewSize(state, kind, weather);
  for (let seat = 0; seat < seats; seat += 1) {
    paces.push(economy.crewPace(state, kind, economy.hireAt(state, seat)));
  }
  return paces;
}

function relabel(
  state: Consultancy
): (type: TicketTypeId) => TicketTypeId | null {
  return (type) => economy.relabelTarget(state, type);
}

function leavesOf(state: Consultancy, count: number): CrewRules['leaves'] {
  if (count === 0) return null;
  const type = RETYPE_LADDER.find(
    (id) => TICKET_TYPES[id].tier === state.tier + 1
  );
  return type === undefined ? null : { type, count };
}

export type { ClaimPick, CrewRules, CrewSeat, HirePace };

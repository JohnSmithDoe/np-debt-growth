import type { Board } from '../model/board.model';
import type { Consultancy } from '../model/consultancy.model';
import type { Weather } from '../model/hazard.model';
import type { TicketTypeId } from '../model/ticket.model';
import { RETYPE_LADDER, TICKET_TYPES } from '../model/ticket.model';
import type {
  ClaimPick,
  CrewRules,
  CrewSeat,
  HirePace,
} from '../model/crew.model';
import {
  JUNIOR_HOME_Y,
  MANAGER_HOME_Y,
  SENIOR_HOME_Y,
  WOMAN_CLOSE_RATE,
} from '../model/balance/crew';
import {
  OFFSHORE_CLOSE_MS,
  OFFSHORE_HOME_Y,
  OFFSHORE_LEAVES,
  OFFSHORE_WALK_SPEED,
} from '../model/balance/weather';
import * as economy from './economy';

function pickOf(
  cheapest: boolean,
  dearest: boolean,
  nearest: boolean
): ClaimPick {
  if (cheapest) return 'cheapest';
  if (dearest) return 'dearest';
  if (nearest) return 'nearest';
  return 'random';
}

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
  return [
    offshoreRules(board, state, weather),
    seniorRules(board, state, weather),
    juniorRules(board, state, weather),
    managerRules(board, state),
  ];
}

function juniorRules(
  board: Board,
  state: Consultancy,
  weather: Weather
): CrewRules {
  return {
    kind: 'juniors',
    crew: board.juniors,
    size: state.levels.junior,
    homeY: JUNIOR_HOME_Y,
    mode: 'closer',
    closeMs: economy.juniorCloseMs(state),
    speed: economy.juniorWalkSpeed(state),
    batch: economy.juniorBatch(state),
    sweep: economy.juniorSweepRadius(state),
    seatOf: (index, pace) =>
      fungibleSeat(index, pace, economy.crewWomanEvery(state, 'juniors')),
    claims: economy.crewClaims(state, 'juniors'),
    rares: economy.crewTakesRares(state, 'juniors'),
    pick: pickOf(false, false, economy.claimsNearest(state)),
    paces: null,
    interrupted: weather.meeting,
    transform: null,
    leaves: null,
  };
}

function offshoreRules(
  board: Board,
  state: Consultancy,
  weather: Weather
): CrewRules {
  const leaves = offshoreLeaves(state);
  return {
    kind: 'offshore',
    crew: board.offshore,
    size: weather.offshore,
    homeY: OFFSHORE_HOME_Y,
    mode: 'closer',
    closeMs: OFFSHORE_CLOSE_MS,
    speed: OFFSHORE_WALK_SPEED,
    batch: 1,
    sweep: 0,
    seatOf: (index, pace) =>
      fungibleSeat(index, pace, economy.crewWomanEvery(state, 'offshore')),
    claims: economy.crewClaims(state, 'offshore'),
    rares: economy.crewTakesRares(state, 'offshore'),
    pick: 'random',
    paces: null,
    interrupted: false,
    transform: null,
    leaves: leaves === null ? null : { type: leaves, count: OFFSHORE_LEAVES },
  };
}

function offshoreLeaves(state: Consultancy): TicketTypeId | null {
  return (
    RETYPE_LADDER.find((id) => TICKET_TYPES[id].tier === state.tier + 1) ?? null
  );
}

function seniorRules(
  board: Board,
  state: Consultancy,
  weather: Weather
): CrewRules {
  const paces: HirePace[] = [];
  for (let seat = 0; seat < state.levels.senior; seat += 1) {
    const hire = economy.hireAt(state, seat);
    paces.push({
      closeMs: economy.seniorCloseMs(state, hire),
      speed: economy.seniorWalkSpeed(state, hire),
      batch: economy.seniorBatch(state, hire),
      sweep: economy.seniorSweepRadius(state, hire),
      pick: pickOf(
        false,
        economy.seniorPrefersTop(state, hire),
        economy.seniorClaimsNearest(state, hire)
      ),
    });
  }

  return {
    kind: 'seniors',
    crew: board.seniors,
    size: state.levels.senior,
    homeY: SENIOR_HOME_Y,
    mode: 'closer',
    closeMs: economy.seniorCloseMs(state),
    speed: economy.seniorWalkSpeed(state),
    batch: economy.seniorBatch(state),
    sweep: economy.seniorSweepRadius(state),
    seatOf: (index, pace) => ({
      ...fungibleSeat(index, pace, economy.crewWomanEvery(state, 'seniors')),
      poolSeat: economy.seniorPoolSeat(state, index),
    }),
    claims: economy.crewClaims(state, 'seniors'),
    rares: economy.crewTakesRares(state, 'seniors'),
    pick: pickOf(false, economy.seniorsPreferTop(state), false),
    paces,
    interrupted: weather.meeting,
    transform: null,
    leaves: null,
  };
}

function managerRules(board: Board, state: Consultancy): CrewRules {
  const transform = (type: TicketTypeId): TicketTypeId | null =>
    economy.relabelTarget(state, type);

  return {
    kind: 'managers',
    crew: board.managers,
    size: state.levels.manager,
    homeY: MANAGER_HOME_Y,
    mode: 'refiler',
    closeMs: economy.managerCloseMs(state),
    speed: economy.managerWalkSpeed(state),
    batch: 1,
    sweep: 0,
    seatOf: (index, pace) =>
      fungibleSeat(index, pace, economy.crewWomanEvery(state, 'managers')),
    claims: (type) => transform(type) !== null,
    rares: false,
    pick: pickOf(economy.managersPreferFiller(state), false, false),
    paces: null,
    interrupted: false,
    transform,
    leaves: null,
  };
}

export type { ClaimPick, CrewRules, CrewSeat, HirePace };

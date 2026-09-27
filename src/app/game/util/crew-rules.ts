import type { Board } from '../model/board.model';
import type { Consultancy } from '../model/consultancy.model';
import type { Weather } from '../model/hazard.model';
import type { CrewMember } from '../model/board.model';
import type { CrewKind } from '../model/crew.model';
import type { CrewRules, CrewSeat, HirePace } from '../model/crew.model';
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

type StandingRules = Omit<CrewRules, 'kind' | 'crew' | 'interrupted' | 'rush'>;

const STANDING = new WeakMap<
  object,
  WeakMap<object, WeakMap<object, readonly StandingRules[]>>
>();

function standing(state: Consultancy): readonly StandingRules[] {
  let byLevels = STANDING.get(state.skills);
  if (!byLevels) {
    byLevels = new WeakMap();
    STANDING.set(state.skills, byLevels);
  }
  let byRoster = byLevels.get(state.levels);
  if (!byRoster) {
    byRoster = new WeakMap();
    byLevels.set(state.levels, byRoster);
  }
  let rules = byRoster.get(state.roster);
  if (!rules) {
    rules = CREW_KINDS.map((kind) => standingFor(kind, state));
    byRoster.set(state.roster, rules);
  }
  return rules;
}

export function crewRules(
  board: Board,
  state: Consultancy,
  weather: Weather
): readonly CrewRules[] {
  const rules = standing(state);
  const rush = economy.pizzaRush(state);
  return CREW_KINDS.map((kind, at) => ({
    kind,
    crew: crewOf(board, kind),
    ...rules[at]!,
    interrupted: CREW_STATS[kind].interruptible && weather.meeting,
    rush,
  }));
}

function standingFor(kind: CrewKind, state: Consultancy): StandingRules {
  const stats = CREW_STATS[kind];
  const womanEvery = economy.crewWomanEvery(kind);

  return {
    size: economy.crewSize(state, kind),
    homeY: stats.homeY,
    mode: stats.mode,
    ...economy.crewPace(state, kind),
    seatOf: (index, pace) => seatOf(state, kind, index, pace, womanEvery),
    claims: economy.crewClaims(state, kind),
    golden: economy.crewTakesGolden(state),
    paces: stats.perSeat ? seatPaces(state, kind) : null,
  };
}

function crewOf(board: Board, kind: CrewKind): CrewMember[] {
  if (kind === 'juniors') return board.juniors;
  if (kind === 'seniors') return board.seniors;
  return board.managers;
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

function seatPaces(state: Consultancy, kind: CrewKind): readonly HirePace[] {
  const paces: HirePace[] = [];
  const seats = economy.crewSize(state, kind);
  for (let seat = 0; seat < seats; seat += 1) {
    paces.push(economy.crewPace(state, kind, economy.hireAt(state, seat)));
  }
  return paces;
}

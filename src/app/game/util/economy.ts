import type { Consultancy } from '../model/consultancy.model';
import type { TicketMix } from '../model/board.model';
import { voteBeamY } from '../model/board.model';
import type { Award } from '../model/award.model';
import { AWARDS, AWARD_BY_ID } from '../model/award.model';
import type { OfficePlate } from '../model/office.model';
import { nextPlate, platesAt } from '../model/office.model';
import { castPoolSize } from '../model/cast.model';
import type { Weather } from '../model/hazard.model';
import type { Lane } from '../model/round.model';
import { EMPTY_LANE } from '../model/round.model';
import { CALM } from '../model/hazard.model';
import type { KitItem } from '../model/kit.model';
import { boughtKit, nextKitItem } from '../model/kit.model';
import {
  SPAWNER_BY_ADR,
  SPAWNER_CAP,
  SPAWNER_COST_STEP,
  SPAWNER_FREE_AT_ADR_0,
  spawnerFor,
} from '../model/spawner.model';
import type { SeniorHire, TraitId } from '../model/senior.model';
import { TRAITS, hireFor } from '../model/senior.model';
import type { PaceField, SkillEffect } from '../model/skill.model';
import { OFFICE_NODE_IDS, SKILL_BY_ID } from '../model/skill.model';
import type { TicketType, TicketTypeId } from '../model/ticket.model';
import { ladderUp, TICKET_TYPES, TICKET_TYPE_IDS } from '../model/ticket.model';
import { approachCap } from '../model/balance/curve';
import type { PurchaseId } from '../model/balance/progression';
import type { ClaimPick, CrewKind, HirePace, Rush } from '../model/crew.model';
import type { CrewBand } from '../model/balance/crew';
import {
  CREW_KINDS,
  CREW_STATS,
  WOMAN_CLOSE_RATE,
} from '../model/balance/crew';
import {
  PIZZA_RADIUS,
  PIZZA_RUSH,
  VOTE_BONUS_BASE,
  VOTE_CYCLE_MS,
  VOTE_ON_MS,
  CLICK_RADIUS_BASE,
  CLICK_RADIUS_MAX,
  DEBT_INTEREST_CAP,
  GOLDEN_CHANCE_CAP,
  GOLDEN_CREW_CONVERSION,
  GOLDEN_VALUE_BASE,
  RELABEL_STEPS_BASE,
} from '../model/balance/flow';
import {
  CREW_SP_MULT,
  SP_PER_PICKUP,
  INCOME_CAP,
  INCOME_COST_OF_SPAWNER,
  INCOME_COST_STEP,
  INCOME_ROWS,
  INCOME_VALUE_ADD,
  LINE_COST_STEP,
  LINE_PLAN,
} from '../model/balance/progression';
import {
  HAUL_MIN_MS,
  HAUL_MS,
  LANES_BASE,
  SPRINT_SLOTS_BASE,
} from '../model/balance/round';
import {
  ESCALATION_MULTIPLIER,
  HOTFIX_MULTIPLIER,
} from '../model/balance/weather';

export function officePlates(state: Consultancy): number {
  return platesAt(
    OFFICE_NODE_IDS.filter((id) => skillRank(state, id) > 0).length
  );
}

export function officeNext(state: Consultancy): OfficePlate | null {
  return nextPlate(officePlates(state) - 1);
}

export function officeNextNodeId(state: Consultancy): string | null {
  return OFFICE_NODE_IDS.find((id) => skillRank(state, id) === 0) ?? null;
}

export function kitNext(state: Consultancy): KitItem | null {
  return nextKitItem(state.levels.kit);
}

export function crewSize(state: Consultancy, crew: CrewKind): number {
  return state.levels[CREW_STATS[crew].levelKey];
}

export function skillRank(state: Consultancy, id: string): number {
  const node = SKILL_BY_ID.get(id);
  if (!node) return 0;
  return Math.min(state.skills[id] ?? 0, node.levels.length);
}

export function skillRankCost(state: Consultancy, id: string): number {
  const node = SKILL_BY_ID.get(id);
  const level = node?.levels[skillRank(state, id)];
  return level ? level.cost : Number.POSITIVE_INFINITY;
}

const EXPANDED = new WeakMap<object, readonly SkillEffect[]>();

function ranked(state: Consultancy): readonly SkillEffect[] {
  const cached = EXPANDED.get(state.skills);
  if (cached) return cached;

  const held: SkillEffect[] = [];
  for (const id of Object.keys(state.skills)) {
    const node = SKILL_BY_ID.get(id);
    if (!node) continue;
    for (const level of node.levels.slice(0, skillRank(state, id))) {
      held.push(...level.effects);
    }
  }
  EXPANDED.set(state.skills, held);
  return held;
}

const FITTED = new WeakMap<object, readonly SkillEffect[]>();

function fitted(state: Consultancy): readonly SkillEffect[] {
  const cached = FITTED.get(state.levels);
  if (cached) return cached;

  const held: SkillEffect[] = boughtKit(state.levels.kit).map(
    (item) => item.effect
  );
  FITTED.set(state.levels, held);
  return held;
}

function foldRanks<T>(
  state: Consultancy,
  seed: T,
  apply: (total: T, effect: SkillEffect) => T
): T {
  let total = seed;
  for (const effect of ranked(state)) total = apply(total, effect);
  for (const effect of fitted(state)) total = apply(total, effect);
  return total;
}

function productOf(
  state: Consultancy,
  match: (effect: SkillEffect) => number | null
): number {
  return foldRanks(state, 1, (total, effect) => total * (match(effect) ?? 1));
}

/** `null` means no skill effect tunes the field, so the base value stands. */
type EffectKind = SkillEffect['kind'] | null;

function multOf(state: Consultancy, kind: EffectKind): number {
  if (kind === null) return 1;
  return productOf(state, (e) =>
    e.kind === kind && 'mult' in e ? e.mult : null
  );
}

function sumOf(
  state: Consultancy,
  match: (effect: SkillEffect) => number | null
): number {
  return foldRanks(state, 0, (total, effect) => total + (match(effect) ?? 0));
}

function additive(state: Consultancy, kind: EffectKind, base: number): number {
  if (kind === null) return base;
  return (
    base + sumOf(state, (e) => (e.kind === kind && 'add' in e ? e.add : null))
  );
}

function holds(state: Consultancy, kind: SkillEffect['kind']): boolean {
  return foldRanks(state, false, (on, effect) => on || effect.kind === kind);
}

function globalMultiplier(state: Consultancy): number {
  return multOf(state, 'global');
}

/** One lane's sprint scope: the base plus every `capacity` rank. */
export function laneCapacity(
  state: Consultancy,
  weather: Weather = CALM
): number {
  const slots = additive(state, 'slots', SPRINT_SLOTS_BASE);
  return Math.max(1, Math.floor(slots * weather.slots));
}

export function laneCount(state: Consultancy): number {
  return LANES_BASE + sumOf(state, (e) => (e.kind === 'cans' ? e.add : null));
}

/** Every lane the run owns, including ones bought since the last write. */
export function lanesOf(state: Consultancy): readonly Lane[] {
  const count = laneCount(state);
  if (state.lanes.length >= count) return state.lanes.slice(0, count);
  return [
    ...state.lanes,
    ...Array.from({ length: count - state.lanes.length }, () => EMPTY_LANE),
  ];
}

/** The whole board of lanes: capacity × lanes, as the reference's row of cans. */
export function sprintSlots(
  state: Consultancy,
  weather: Weather = CALM
): number {
  return laneCapacity(state, weather) * laneCount(state);
}

/** Room in the lanes whose train is home; a lane that is away takes nothing. */
export function sprintRoom(
  state: Consultancy,
  weather: Weather = CALM
): number {
  const cap = laneCapacity(state, weather);
  return lanesOf(state).reduce(
    (room, lane) =>
      lane.releaseLeftMs > 0 ? room : room + Math.max(0, cap - lane.count),
    0
  );
}

/**
 * Deals `taken` tickets round-robin into lanes with room, skipping lanes
 * whose train is away. Returns the lane each ticket went to, in order.
 */
export function fillLanes(
  state: Consultancy,
  taken: number,
  weather: Weather = CALM
): { lanes: readonly Lane[]; cursor: number; placed: readonly number[] } {
  const cap = laneCapacity(state, weather);
  const lanes = lanesOf(state).map((lane) => ({ ...lane }));
  const placed: number[] = [];
  let cursor = state.laneCursor % lanes.length;
  for (let n = 0; n < taken; n += 1) {
    let tried = 0;
    while (tried < lanes.length) {
      const lane = lanes[cursor]!;
      if (lane.releaseLeftMs <= 0 && lane.count < cap) break;
      cursor = (cursor + 1) % lanes.length;
      tried += 1;
    }
    if (tried === lanes.length) break;
    lanes[cursor]!.count += 1;
    placed.push(cursor);
    cursor = (cursor + 1) % lanes.length;
  }
  return { lanes, cursor, placed };
}

/**
 * The truck, and the only forced wait in the game. `haulShave` effects
 * hurry it, floored by `HAUL_MIN_MS` so the cadence stays a real gate.
 */
export function haulMs(state: Consultancy): number {
  const shaved = sumOf(state, (e) =>
    e.kind === 'haulShave' ? e.seconds : null
  );
  return Math.max(HAUL_MIN_MS, HAUL_MS - shaved * 1_000);
}

/**
 * The automation-exempt class. Golden work pays a fortune and the crew
 * refuses it, so the player's own sweep stays worth doing however much
 * automation is running — until `goldenCrew` sells the exemption back.
 */
export function goldenChance(state: Consultancy): number {
  const ranks = sumOf(state, (e) => (e.kind === 'goldenChance' ? e.add : null));
  return Math.min(GOLDEN_CHANCE_CAP, ranks);
}

export function goldenMultiplier(state: Consultancy): number {
  return (
    GOLDEN_VALUE_BASE +
    sumOf(state, (e) => (e.kind === 'goldenValue' ? e.add : null))
  );
}

export function crewTakesGolden(state: Consultancy): boolean {
  return holds(state, 'goldenCrew');
}

/** Golden crew turn a share of their ordinary closes golden, not only take the player's. */
export function crewGoldenConversion(state: Consultancy): number {
  return crewTakesGolden(state) ? GOLDEN_CREW_CONVERSION : 0;
}

export function seniorsPreferTop(state: Consultancy): boolean {
  return holds(state, 'topOfBand');
}

export function ceilingPerSec(state: Consultancy): number {
  return sprintSlots(state) / (haulMs(state) / 1000);
}

export function clickRadius(state: Consultancy): number {
  return Math.min(
    CLICK_RADIUS_BASE * multOf(state, 'clickRadius'),
    CLICK_RADIUS_MAX
  );
}

function hotfixMultiplier(state: Consultancy, now: number): number {
  return now < state.hotfixUntil ? HOTFIX_MULTIPLIER : 1;
}

export function ticketValue(
  state: Consultancy,
  id: TicketTypeId,
  now = 0
): number {
  const type = TICKET_TYPES[id];
  const fromSkills = productOf(state, (e) =>
    e.kind === 'ticketValue' && e.target === id ? e.mult : null
  );
  const tierScale = type.scalesWithTier ? Math.max(1, state.tier) : 1;
  return (
    (type.value + incomeBonus(state, id)) *
    fromSkills *
    tierScale *
    globalMultiplier(state) *
    hotfixMultiplier(state, now)
  );
}

export function incomeLevel(state: Consultancy, id: TicketTypeId): number {
  return Math.min(INCOME_CAP, state.income[id] ?? 0);
}

/** What one rank of `id`'s income row adds to its value. */
export function incomeStep(id: TicketTypeId): number {
  return INCOME_ROWS[id]?.add ?? INCOME_VALUE_ADD;
}

export function incomeBonus(state: Consultancy, id: TicketTypeId): number {
  return incomeStep(id) * incomeLevel(state, id);
}

/** An income line opens once its source is on the path, not before. */
export function incomeUnlocked(state: Consultancy, id: TicketTypeId): boolean {
  const row = spawnerFor(id);
  return row !== undefined && spawnerCount(state, row.adr) > 0;
}

export function incomeCost(state: Consultancy, id: TicketTypeId): number {
  const row = spawnerFor(id);
  const level = incomeLevel(state, id);
  if (!row || level >= INCOME_CAP) return Number.POSITIVE_INFINITY;
  const first = INCOME_ROWS[id]?.first ?? row.cost * INCOME_COST_OF_SPAWNER;
  return Math.floor(first * INCOME_COST_STEP ** level);
}

export function canBuyIncome(state: Consultancy, id: TicketTypeId): boolean {
  return (
    incomeUnlocked(state, id) &&
    incomeLevel(state, id) < INCOME_CAP &&
    state.budget >= incomeCost(state, id)
  );
}

/** A line is open once the tree has unlocked it — the rail sells the rest. */
export function lineUnlocked(state: Consultancy, line: PurchaseId): boolean {
  return state.levels[line] > 0 || LINE_PLAN[line].open === true;
}

export function lineCost(state: Consultancy, line: PurchaseId): number {
  const plan = LINE_PLAN[line];
  const held = state.levels[line];
  if (held >= lineCap(state, line)) return Number.POSITIVE_INFINITY;
  return Math.ceil(plan.cost * LINE_COST_STEP ** Math.max(0, held - 1));
}

/** The line's start cap plus every seat its room node has added — never a product. */
export function lineCap(state: Consultancy, line: PurchaseId): number {
  return (
    LINE_PLAN[line].cap +
    sumOf(state, (e) => (e.kind === 'room' && e.line === line ? e.add : null))
  );
}

export function canBuyLine(state: Consultancy, line: PurchaseId): boolean {
  return (
    lineUnlocked(state, line) &&
    state.levels[line] < lineCap(state, line) &&
    state.budget >= lineCost(state, line)
  );
}

export function spawnerCount(state: Consultancy, adr: number): number {
  return state.spawners[String(adr)] ?? 0;
}

/** `1.15^level`, the same shape every line on the rail climbs. */
export function spawnerCost(state: Consultancy, adr: number): number {
  const row = SPAWNER_BY_ADR.get(adr);
  if (!row) return Number.POSITIVE_INFINITY;
  const level = spawnerCount(state, adr);
  if (level >= SPAWNER_CAP) return Number.POSITIVE_INFINITY;
  // The head ADR-0 ships with was free; it does not raise the next one's price.
  const paid = adr === 0 ? Math.max(0, level - SPAWNER_FREE_AT_ADR_0) : level;
  return Math.floor(row.cost * SPAWNER_COST_STEP ** paid);
}

export function spawnerUnlocked(state: Consultancy, adr: number): boolean {
  return adr === 0 || state.tier >= adr;
}

export function canBuySpawner(state: Consultancy, adr: number): boolean {
  return (
    spawnerUnlocked(state, adr) &&
    spawnerCount(state, adr) < SPAWNER_CAP &&
    state.budget >= spawnerCost(state, adr)
  );
}

/**
 * Supply is the crowd on the path: no spawners on a line, no arrivals from
 * it. This is where a euro buys a worse codebase.
 */
function sourceMultiplier(state: Consultancy, type: TicketType): number {
  if (type.handOnly) return 1;
  const row = spawnerFor(type.id);
  if (!row) return state.tier < type.tier ? 0 : 1;
  return spawnerUnlocked(state, row.adr) ? spawnerCount(state, row.adr) : 0;
}

export function spawnRate(state: Consultancy, id: TicketTypeId): number {
  const type = TICKET_TYPES[id];
  if (type.effect === 'crewRush' && !holds(state, 'pizza')) return 0;
  const fromSkills = productOf(state, (e) =>
    e.kind === 'spawnRate' &&
    (e.target === id || (e.target === undefined && !type.handOnly))
      ? e.mult
      : null
  );
  return type.ratePerSec * sourceMultiplier(state, type) * fromSkills;
}

export function closeRate(state: Consultancy, id: TicketTypeId): number {
  return spawnRate(state, id) * (TICKET_TYPES[id].respawns ? 2 : 1);
}

export function totalSpawnRate(state: Consultancy): number {
  return TICKET_TYPE_IDS.reduce((sum, id) => sum + closeRate(state, id), 0);
}

export function juniorSpawnRate(state: Consultancy): number {
  const claims = crewClaims(state, 'juniors');
  return TICKET_TYPE_IDS.reduce(
    (sum, id) => (claims(id) ? sum + closeRate(state, id) : sum),
    0
  );
}

type Aura = Extract<SkillEffect, { kind: 'standupAura' }>;

function auraMultiplier(state: Consultancy): number {
  const juniors = state.levels.junior;
  const ranks = new Map<Aura, number>();
  for (const effect of ranked(state)) {
    if (effect.kind === 'standupAura') {
      ranks.set(effect, (ranks.get(effect) ?? 0) + 1);
    }
  }

  let total = 1;
  for (const [effect, rank] of ranks) {
    total *= Math.min(effect.cap, 1 + effect.perJunior * rank * juniors);
  }
  return total;
}

const paceOf = (
  effect: SkillEffect,
  crew: CrewKind,
  field: PaceField
): number | null =>
  effect.kind === 'pace' && effect.crew === crew && effect.field === field
    ? effect.mult
    : null;

/** A crew's pace multiplier for one field: its skills, then a senior seat's traits. */
function paceMult(
  state: Consultancy,
  crew: CrewKind,
  field: PaceField,
  hire?: SeniorHire
): number {
  let total = productOf(state, (e) => paceOf(e, crew, field));
  for (const trait of hire?.traits ?? []) {
    for (const effect of TRAITS[trait])
      total *= paceOf(effect, crew, field) ?? 1;
  }
  return total;
}

/** Carrying more per trip slows the close down. */
function batchPenalty(state: Consultancy, crew: CrewKind): number {
  return productOf(state, (e) =>
    e.kind === 'batch' && e.crew === crew ? (e.closeMult ?? null) : null
  );
}

export function crewCloseMs(
  state: Consultancy,
  crew: CrewKind,
  hire?: SeniorHire
): number {
  const stats = CREW_STATS[crew];
  const aura = stats.aura ? auraMultiplier(state) : 1;
  const faster = paceMult(state, crew, 'close', hire) * aura;
  return (stats.closeMs * batchPenalty(state, crew)) / faster;
}

export function crewBatch(state: Consultancy, crew: CrewKind): number {
  const added = sumOf(state, (e) =>
    e.kind === 'batch' && e.crew === crew ? e.add : null
  );
  return Math.floor(CREW_STATS[crew].batchBase + added);
}

export function crewSweepRadius(
  state: Consultancy,
  crew: CrewKind,
  hire?: SeniorHire
): number {
  return CREW_STATS[crew].sweepRadius * paceMult(state, crew, 'sweep', hire);
}

export function crewWalkSpeed(
  state: Consultancy,
  crew: CrewKind,
  hire?: SeniorHire
): number {
  return CREW_STATS[crew].walkSpeed * paceMult(state, crew, 'walk', hire);
}

/** Which claim heuristic a crew follows — policy per kind, not a tuning number. */
export function crewPick(
  state: Consultancy,
  crew: CrewKind,
  hire?: SeniorHire
): ClaimPick {
  if (crew === 'managers') {
    return managersPreferFiller(state) ? 'cheapest' : 'random';
  }
  if (crew === 'seniors') {
    if (seniorPrefersTop(state, hire)) return 'dearest';
    return hire && seniorClaimsNearest(state, hire) ? 'nearest' : 'random';
  }
  return claimsNearest(state) ? 'nearest' : 'random';
}

export function crewPace(
  state: Consultancy,
  crew: CrewKind,
  hire?: SeniorHire
): HirePace {
  return {
    closeMs: crewCloseMs(state, crew, hire),
    speed: crewWalkSpeed(state, crew, hire),
    batch: crewBatch(state, crew),
    sweep: crewSweepRadius(state, crew, hire),
    pick: crewPick(state, crew, hire),
  };
}

export function claimsNearest(state: Consultancy): boolean {
  return holds(state, 'nearestClaim');
}

export function hireIsWoman(index: number, every: number): boolean {
  return (index + 1) % every === 0;
}

export function hirePoolSeat(index: number, every: number): number {
  const women = Math.floor((index + 1) / every);
  return hireIsWoman(index, every) ? women - 1 : index - women;
}

export function crewWomanEvery(state: Consultancy, crew: CrewKind): number {
  return CREW_STATS[crew].womanEvery;
}

export function crewClaims(
  state: Consultancy,
  crew: CrewKind
): (type: TicketTypeId) => boolean {
  const skipped = triageSkips(state, crew);
  const band = crewBand(state, crew);
  return (type) => {
    const ticket = TICKET_TYPES[type];
    if (ticket.effect !== 'value') return false;
    if (ticket.handOnly) return false;
    if (ticket.tier < band.from || ticket.tier > band.to) return false;
    return !skipped.has(type);
  };
}

export function crewCeiling(
  state: Consultancy,
  crew: CrewKind
): TicketTypeId | null {
  const claims = crewClaims(state, crew);
  let dearest: TicketTypeId | null = null;
  for (const id of TICKET_TYPE_IDS) {
    if (TICKET_TYPES[id].tier > state.tier) continue;
    if (!claims(id)) continue;
    if (
      dearest === null ||
      TICKET_TYPES[id].value > TICKET_TYPES[dearest].value
    )
      dearest = id;
  }
  return dearest;
}

function crewBand(state: Consultancy, crew: CrewKind): CrewBand {
  const { band } = CREW_STATS[crew];
  if (crew !== 'juniors') return band;
  return { from: band.from, to: additive(state, 'juniorBand', band.to) };
}

function triageSkips(
  state: Consultancy,
  crew: CrewKind
): ReadonlySet<TicketTypeId> {
  return foldRanks(state, new Set<TicketTypeId>(), (all, effect) => {
    if (effect.kind === 'triagePolicy' && effect.crew === crew) {
      all.add(effect.target);
    }
    return all;
  });
}

export function womenAmong(count: number, every: number): number {
  return Math.floor(count / every);
}

export function crewWomen(state: Consultancy): number {
  return CREW_KINDS.reduce(
    (total, crew) =>
      total + womenAmong(crewSize(state, crew), crewWomanEvery(state, crew)),
    0
  );
}

function crewRate(count: number, every: number): number {
  const women = womenAmong(count, every);
  return count - women + women * WOMAN_CLOSE_RATE;
}

/** Closes per second for one worker at the given pace. */
function closesPerSec(rate: number, batch: number, closeMs: number): number {
  return (rate * batch * 1000) / closeMs;
}

export function juniorCeilingPerSec(state: Consultancy): number {
  const juniors = state.levels.junior;
  if (juniors === 0) return 0;
  const rate = crewRate(juniors, crewWomanEvery(state, 'juniors'));
  return closesPerSec(rate, crewBatch(state, 'juniors'), juniorCloseMs(state));
}

export function juniorCloseMs(state: Consultancy): number {
  return crewCloseMs(state, 'juniors');
}

export function juniorBatch(state: Consultancy): number {
  return crewBatch(state, 'juniors');
}

export function juniorSweepRadius(state: Consultancy): number {
  return crewSweepRadius(state, 'juniors');
}

export function juniorWalkSpeed(state: Consultancy): number {
  return crewWalkSpeed(state, 'juniors');
}

export function hireAt(
  state: Consultancy,
  seat: number
): SeniorHire | undefined {
  return state.roster[seat];
}

function hireHolds(
  hire: SeniorHire | undefined,
  kind: SkillEffect['kind']
): boolean {
  return (hire?.traits ?? []).some((trait) =>
    TRAITS[trait].some((effect) => effect.kind === kind)
  );
}

export function seniorCloseMs(state: Consultancy, hire?: SeniorHire): number {
  return crewCloseMs(state, 'seniors', hire);
}

export function seniorWalkSpeed(state: Consultancy, hire?: SeniorHire): number {
  return crewWalkSpeed(state, 'seniors', hire);
}

export function seniorBatch(state: Consultancy): number {
  return crewBatch(state, 'seniors');
}

export function seniorSweepRadius(
  state: Consultancy,
  hire?: SeniorHire
): number {
  return crewSweepRadius(state, 'seniors', hire);
}

export function seniorPrefersTop(
  state: Consultancy,
  hire?: SeniorHire
): boolean {
  return seniorsPreferTop(state) || hireHolds(hire, 'topOfBand');
}

export function seniorClaimsNearest(
  state: Consultancy,
  hire?: SeniorHire
): boolean {
  return claimsNearest(state) || hireHolds(hire, 'nearestClaim');
}

export function seniorCeilingPerSec(state: Consultancy): number {
  const seniors = state.levels.senior;
  if (seniors === 0) return 0;

  const every = crewWomanEvery(state, 'seniors');
  let total = 0;
  for (let seat = 0; seat < seniors; seat += 1) {
    const hire = hireAt(state, seat);
    const rate = hireIsWoman(seat, every) ? WOMAN_CLOSE_RATE : 1;
    total += closesPerSec(rate, seniorBatch(state), seniorCloseMs(state, hire));
  }
  return total;
}

export function traitFactor(state: Consultancy, trait: TraitId): number {
  const hire: SeniorHire = { poolSeat: 0, traits: [trait] };
  const bare = seniorBatch(state) / seniorCloseMs(state);
  return seniorBatch(state) / seniorCloseMs(state, hire) / bare;
}

export function seniorPoolSeat(state: Consultancy, seat: number): number {
  const hire = hireAt(state, seat);
  if (hire) return hire.poolSeat;
  return hirePoolSeat(seat, crewWomanEvery(state, 'seniors'));
}

function openSeat(state: Consultancy): number {
  return state.roster.length;
}

export function nextSeniorHire(state: Consultancy): SeniorHire {
  const seat = openSeat(state);
  const every = crewWomanEvery(state, 'seniors');
  const woman = hireIsWoman(seat, every);
  const taken = state.roster
    .filter((_, at) => hireIsWoman(at, every) === woman)
    .map((hire) => hire.poolSeat);
  return hireFor(seat, taken, castPoolSize('seniors', woman));
}

export function crewCeilingPerSec(state: Consultancy): number {
  return juniorCeilingPerSec(state) + seniorCeilingPerSec(state);
}

export function managerCloseMs(state: Consultancy): number {
  return crewCloseMs(state, 'managers');
}

export function managerWalkSpeed(state: Consultancy): number {
  return crewWalkSpeed(state, 'managers');
}

export function relabelSteps(state: Consultancy): number {
  return Math.max(1, additive(state, 'relabelSteps', RELABEL_STEPS_BASE));
}

export function managersPreferFiller(state: Consultancy): boolean {
  return holds(state, 'relabelFillerFirst');
}

export function debtInterest(state: Consultancy): number {
  const gap = productOf(state, (e) =>
    e.kind === 'debtInterest' ? 1 - e.approach : null
  );
  return approachCap(DEBT_INTEREST_CAP, gap);
}

export function interestTarget(
  state: Consultancy,
  id: TicketTypeId
): TicketTypeId | null {
  return ladderUp(id, 1, state.tier + 1);
}

export function relabelTarget(
  state: Consultancy,
  id: TicketTypeId
): TicketTypeId | null {
  return ladderUp(id, relabelSteps(state), state.tier);
}

export function escalationMultiplier(state: Consultancy): number {
  return ESCALATION_MULTIPLIER * multOf(state, 'escalation');
}

export function closeValue(
  state: Consultancy,
  id: TicketTypeId,
  now = 0
): number {
  const base = ticketValue(state, id, now);
  return state.escalated ? base * escalationMultiplier(state) : base;
}

/** What the tickets held in the lanes were worth; already paid at pickup. */
export function laneWorth(state: Consultancy, mix: TicketMix, now = 0): number {
  let worth = 0;
  for (const id of TICKET_TYPE_IDS) {
    const held = mix[id] ?? 0;
    if (held > 0) worth += held * closeValue(state, id, now);
  }
  return worth;
}

/**
 * SP a close pays at pickup, in whole points; zero until the `velocity` row
 * is bought. Counted per ticket, not per euro: value nodes never touch it.
 */
export function pickupStoryPoints(
  state: Consultancy,
  id: TicketTypeId,
  byCrew: boolean
): number {
  if (!pickupsPaySp(state)) return 0;
  const bonus = sumOf(state, (e) =>
    e.kind === 'spPerClose' && (e.target === undefined || e.target === id)
      ? e.add
      : null
  );
  const crew = byCrew && holds(state, 'crewSp') ? CREW_SP_MULT : 1;
  return (SP_PER_PICKUP + bonus) * crew;
}

/** The live pizza party, if any, as the crew rules take it. */
export function pizzaRush(state: Consultancy): Rush | null {
  const party = state.pizza;
  if (!party || state.lastTick >= party.until) return null;
  return { x: party.x, y: party.y, radius: PIZZA_RADIUS, mult: PIZZA_RUSH };
}

export function pickupsPaySp(state: Consultancy): boolean {
  return state.levels.velocity > 0;
}

export function coachCount(state: Consultancy): number {
  return sumOf(state, (e) => (e.kind === 'coach' ? e.add : null));
}

export function voteBonusPerCrossing(state: Consultancy): number {
  return (
    VOTE_BONUS_BASE + sumOf(state, (e) => (e.kind === 'deck' ? e.add : null))
  );
}

/** Whether coach `index`'s vote is live at `runMs`; the stage draws the same. */
export function voteLive(
  state: Consultancy,
  index: number,
  runMs: number
): boolean {
  const count = Math.max(1, coachCount(state));
  const offset = (index * VOTE_CYCLE_MS) / count;
  return (runMs + offset) % VOTE_CYCLE_MS < VOTE_ON_MS;
}

/** SP a ticket landing at `landingY` earns for every live beam above it. */
export function voteBonus(
  state: Consultancy,
  runMs: number,
  landingY: number
): number {
  const coaches = coachCount(state);
  let live = 0;
  for (let index = 0; index < coaches; index += 1) {
    if (landingY > voteBeamY(index) && voteLive(state, index, runMs)) {
      live += 1;
    }
  }
  return live * voteBonusPerCrossing(state);
}

function awardGranted(state: Consultancy, id: string): boolean {
  return state.achievements.includes(id);
}

export function pendingAwards(state: Consultancy): readonly Award[] {
  return AWARDS.filter(
    (award) => !awardGranted(state, award.id) && award.when(state)
  );
}

export function grantedStoryPoints(state: Consultancy): number {
  return state.achievements.reduce(
    (total, id) => total + (AWARD_BY_ID.get(id)?.sp ?? 0),
    0
  );
}

export function boardPayout(
  state: Consultancy,
  types: readonly TicketTypeId[],
  now: number
): number {
  return types.reduce(
    (total, id) =>
      total +
      (TICKET_TYPES[id].effect === 'value' ? ticketValue(state, id, now) : 0),
    0
  );
}

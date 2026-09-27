import type { Consultancy } from '../model/consultancy.model';
import type { TicketMix } from '../model/board.model';
import { voteBeamY, voteCount } from '../model/board.model';
import type { Award } from '../model/award.model';
import { AWARDS } from '../model/award.model';
import { platesAt } from '../model/office.model';
import { castPoolSize } from '../model/cast.model';
import type { Weather } from '../model/hazard.model';
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
import {
  FINAL_SKILL_ID,
  OFFICE_NODE_IDS,
  SKILL_BY_ID,
} from '../model/skill.model';
import type { TicketType, TicketTypeId } from '../model/ticket.model';
import { ladderUp, TICKET_TYPES, TICKET_TYPE_IDS } from '../model/ticket.model';
import { approachCap } from '../model/balance/curve';
import type { PurchaseId } from '../model/balance/progression';
import { ACCEPTANCE } from '../model/balance/progression';
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
  HAND_ONLY_RATE_PER_TIER,
  CLICK_RADIUS_MAX,
  DEBT_INTEREST_CAP,
  GOLDEN_CHANCE_CAP,
  GOLDEN_CREW_CONVERSION,
  GOLDEN_VALUE_BASE,
  MANAGER_AURA_BASE,
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
  RELEASE_PHASES,
  SPRINT_SLOTS_BASE,
  type ReleasePhase,
  type ReleasePhaseId,
} from '../model/balance/round';
import {
  ESCALATION_HOLD_MS,
  ESCALATION_MULTIPLIER,
  HOTFIX_MULTIPLIER,
} from '../model/balance/weather';

export function officePlates(state: Consultancy): number {
  return platesAt(
    OFFICE_NODE_IDS.filter((id) => skillRank(state, id) > 0).length
  );
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

interface Folded {
  readonly values: Map<string, number>;
  readonly flags: Map<SkillEffect['kind'], boolean>;
  readonly claims: Map<CrewKind, (type: TicketTypeId) => boolean>;
  readonly paces: Map<CrewKind, HirePace>;
  readonly hirePaces: WeakMap<SeniorHire, Map<CrewKind, HirePace>>;
  autoClosed?: ReadonlySet<TicketTypeId>;
  phases?: readonly ReleasePhase[];
}

const FOLDED = new WeakMap<object, WeakMap<object, Folded>>();

function folded(state: Consultancy): Folded {
  let byLevels = FOLDED.get(state.skills);
  if (!byLevels) {
    byLevels = new WeakMap();
    FOLDED.set(state.skills, byLevels);
  }
  let table = byLevels.get(state.levels);
  if (!table) {
    table = {
      values: new Map(),
      flags: new Map(),
      claims: new Map(),
      paces: new Map(),
      hirePaces: new WeakMap(),
    };
    byLevels.set(state.levels, table);
  }
  return table;
}

function memo(state: Consultancy, key: string, compute: () => number): number {
  const values = folded(state).values;
  const hit = values.get(key);
  if (hit !== undefined) return hit;
  const value = compute();
  values.set(key, value);
  return value;
}

function productOf(
  state: Consultancy,
  key: string,
  match: (effect: SkillEffect) => number | null
): number {
  return memo(state, key, () =>
    foldRanks(state, 1, (total, effect) => total * (match(effect) ?? 1))
  );
}

type EffectKind = SkillEffect['kind'] | null;

function multOf(state: Consultancy, kind: EffectKind): number {
  if (kind === null) return 1;
  return productOf(state, `mult:${kind}`, (e) =>
    e.kind === kind && 'mult' in e ? e.mult : null
  );
}

function sumOf(
  state: Consultancy,
  key: string,
  match: (effect: SkillEffect) => number | null
): number {
  return memo(state, key, () =>
    foldRanks(state, 0, (total, effect) => total + (match(effect) ?? 0))
  );
}

function additive(state: Consultancy, kind: EffectKind, base: number): number {
  if (kind === null) return base;
  return (
    base +
    sumOf(state, `add:${kind}`, (e) =>
      e.kind === kind && 'add' in e ? e.add : null
    )
  );
}

function holds(state: Consultancy, kind: SkillEffect['kind']): boolean {
  const flags = folded(state).flags;
  const hit = flags.get(kind);
  if (hit !== undefined) return hit;
  const on = foldRanks(
    state,
    false,
    (held, effect) => held || effect.kind === kind
  );
  flags.set(kind, on);
  return on;
}

function globalMultiplier(state: Consultancy): number {
  const overtime = inAcceptance(state) ? ACCEPTANCE.value : 1;
  return multOf(state, 'global') * overtime;
}

export function sprintSlots(
  state: Consultancy,
  weather: Weather = CALM
): number {
  const slots = additive(state, 'slots', SPRINT_SLOTS_BASE);
  const teams =
    1 + sumOf(state, 'cans', (e) => (e.kind === 'cans' ? e.add : null));
  return Math.max(1, Math.floor(slots * weather.slots)) * teams;
}

export function sprintRoom(
  state: Consultancy,
  weather: Weather = CALM
): number {
  if (state.phase === 'hauling') return 0;
  return Math.max(0, sprintSlots(state, weather) - state.sprintCount);
}

export function releasePhases(state: Consultancy): readonly ReleasePhase[] {
  const table = folded(state);
  if (table.phases) return table.phases;
  const cut = foldRanks(state, new Set<ReleasePhaseId>(), (set, effect) =>
    effect.kind === 'cutCeremony' ? set.add(effect.phase) : set
  );
  table.phases = RELEASE_PHASES.filter(
    (phase) => phase.id === 'ship' || !cut.has(phase.id)
  );
  return table.phases;
}

export function haulMs(state: Consultancy): number {
  return memo(state, 'haul', () =>
    releasePhases(state).reduce((sum, phase) => sum + phase.ms, 0)
  );
}

export function phaseAt(
  phases: readonly ReleasePhase[],
  leftMs: number
): ReleasePhaseId {
  let remaining = phases.reduce((sum, phase) => sum + phase.ms, 0) - leftMs;
  for (const phase of phases) {
    remaining -= phase.ms;
    if (remaining < 0) return phase.id;
  }
  return phases[phases.length - 1]?.id ?? 'ship';
}

export function inAcceptance(state: Consultancy): boolean {
  return state.endedAt === 0 && skillRank(state, FINAL_SKILL_ID) > 0;
}

export function accepted(state: Consultancy): boolean {
  return inAcceptance(state) && state.budget >= ACCEPTANCE.goal;
}

export function goldenChance(state: Consultancy): number {
  const ranks = sumOf(state, 'goldenChance', (e) =>
    e.kind === 'goldenChance' ? e.add : null
  );
  return Math.min(GOLDEN_CHANCE_CAP, ranks);
}

export function goldenMultiplier(state: Consultancy): number {
  return (
    GOLDEN_VALUE_BASE +
    sumOf(state, 'goldenValue', (e) =>
      e.kind === 'goldenValue' ? e.add : null
    )
  );
}

export function crewTakesGolden(state: Consultancy): boolean {
  return holds(state, 'goldenCrew');
}

export function crewGoldenConversion(state: Consultancy): number {
  return crewTakesGolden(state) ? GOLDEN_CREW_CONVERSION : 0;
}

function seniorsPreferTop(state: Consultancy): boolean {
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
  const fromSkills = productOf(state, `value:${id}`, (e) =>
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

export function incomeStep(id: TicketTypeId): number {
  return INCOME_ROWS[id]?.add ?? INCOME_VALUE_ADD;
}

function incomeBonus(state: Consultancy, id: TicketTypeId): number {
  return incomeStep(id) * incomeLevel(state, id);
}

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

export function lineUnlocked(state: Consultancy, line: PurchaseId): boolean {
  return state.levels[line] > 0 || LINE_PLAN[line].open === true;
}

export function lineCost(state: Consultancy, line: PurchaseId): number {
  const plan = LINE_PLAN[line];
  const held = state.levels[line];
  if (held >= lineCap(state, line)) return Number.POSITIVE_INFINITY;
  if (line === 'kit') return kitNext(state)?.cost ?? Number.POSITIVE_INFINITY;
  return Math.ceil(plan.cost * LINE_COST_STEP ** Math.max(0, held - 1));
}

export function lineCap(state: Consultancy, line: PurchaseId): number {
  return (
    LINE_PLAN[line].cap +
    sumOf(state, `room:${line}`, (e) =>
      e.kind === 'room' && e.line === line ? e.add : null
    )
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

export function spawnerCost(state: Consultancy, adr: number): number {
  const row = SPAWNER_BY_ADR.get(adr);
  if (!row) return Number.POSITIVE_INFINITY;
  const level = spawnerCount(state, adr);
  if (level >= SPAWNER_CAP) return Number.POSITIVE_INFINITY;
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

function sourceMultiplier(state: Consultancy, type: TicketType): number {
  if (type.handOnly) return 1;
  const row = spawnerFor(type.id);
  if (!row) return state.tier < type.tier ? 0 : 1;
  return spawnerUnlocked(state, row.adr) ? spawnerCount(state, row.adr) : 0;
}

export function spawnRate(state: Consultancy, id: TicketTypeId): number {
  const type = TICKET_TYPES[id];
  if (type.effect === 'crewRush' && !holds(state, 'pizza')) return 0;
  const fromSkills = productOf(state, `spawn:${id}`, (e) =>
    e.kind === 'spawnRate' &&
    (e.target === id || (e.target === undefined && !type.handOnly))
      ? e.mult
      : null
  );
  const climb = type.handOnly ? 1 + HAND_ONLY_RATE_PER_TIER * state.tier : 1;
  const push = inAcceptance(state) ? ACCEPTANCE.spawn : 1;
  return (
    type.ratePerSec * sourceMultiplier(state, type) * fromSkills * climb * push
  );
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
  return memo(state, 'aura', () => foldAura(state));
}

function foldAura(state: Consultancy): number {
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

function paceMult(
  state: Consultancy,
  crew: CrewKind,
  field: PaceField,
  hire?: SeniorHire
): number {
  let total = productOf(state, `pace:${crew}:${field}`, (e) =>
    paceOf(e, crew, field)
  );
  for (const trait of hire?.traits ?? []) {
    for (const effect of TRAITS[trait])
      total *= paceOf(effect, crew, field) ?? 1;
  }
  return total;
}

function batchPenalty(state: Consultancy, crew: CrewKind): number {
  return productOf(state, `batchClose:${crew}`, (e) =>
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
  const added = sumOf(state, `batchAdd:${crew}`, (e) =>
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

export function crewPick(
  state: Consultancy,
  crew: CrewKind,
  hire?: SeniorHire
): ClaimPick {
  if (crew === 'managers') return 'random';
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
  const table = folded(state);
  let paces = table.paces;
  if (hire) {
    paces = table.hirePaces.get(hire) ?? new Map();
    table.hirePaces.set(hire, paces);
  }
  const hit = paces.get(crew);
  if (hit) return hit;
  const pace = foldPace(state, crew, hire);
  paces.set(crew, pace);
  return pace;
}

function foldPace(
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

function claimsNearest(state: Consultancy): boolean {
  return holds(state, 'nearestClaim');
}

export function hireIsWoman(index: number, every: number): boolean {
  return (index + 1) % every === 0;
}

export function hirePoolSeat(index: number, every: number): number {
  const women = Math.floor((index + 1) / every);
  return hireIsWoman(index, every) ? women - 1 : index - women;
}

export function crewWomanEvery(crew: CrewKind): number {
  return CREW_STATS[crew].womanEvery;
}

export function crewClaims(
  state: Consultancy,
  crew: CrewKind
): (type: TicketTypeId) => boolean {
  const table = folded(state);
  const hit = table.claims.get(crew);
  if (hit) return hit;
  const claims = foldClaims(state, crew);
  table.claims.set(crew, claims);
  return claims;
}

function foldClaims(
  state: Consultancy,
  crew: CrewKind
): (type: TicketTypeId) => boolean {
  const skipped = autoClosed(state);
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

export function autoClosed(state: Consultancy): ReadonlySet<TicketTypeId> {
  const table = folded(state);
  table.autoClosed ??= foldRanks(
    state,
    new Set<TicketTypeId>(),
    (all, effect) => {
      if (effect.kind === 'autoClose') all.add(effect.target);
      return all;
    }
  );
  return table.autoClosed;
}

function womenAmong(count: number, every: number): number {
  return Math.floor(count / every);
}

export function crewWomen(state: Consultancy): number {
  return CREW_KINDS.reduce(
    (total, crew) =>
      total + womenAmong(crewSize(state, crew), crewWomanEvery(crew)),
    0
  );
}

function crewRate(count: number, every: number): number {
  const women = womenAmong(count, every);
  return count - women + women * WOMAN_CLOSE_RATE;
}

function closesPerSec(rate: number, batch: number, closeMs: number): number {
  return (rate * batch * 1000) / closeMs;
}

export function juniorCeilingPerSec(state: Consultancy): number {
  const juniors = state.levels.junior;
  if (juniors === 0) return 0;
  const rate = crewRate(juniors, crewWomanEvery('juniors'));
  return closesPerSec(rate, crewBatch(state, 'juniors'), juniorCloseMs(state));
}

export function juniorCloseMs(state: Consultancy): number {
  return crewCloseMs(state, 'juniors');
}

export function juniorBatch(state: Consultancy): number {
  return crewBatch(state, 'juniors');
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

export function seniorBatch(state: Consultancy): number {
  return crewBatch(state, 'seniors');
}

function seniorPrefersTop(state: Consultancy, hire?: SeniorHire): boolean {
  return seniorsPreferTop(state) || hireHolds(hire, 'topOfBand');
}

function seniorClaimsNearest(state: Consultancy, hire?: SeniorHire): boolean {
  return claimsNearest(state) || hireHolds(hire, 'nearestClaim');
}

export function seniorCeilingPerSec(state: Consultancy): number {
  const seniors = state.levels.senior;
  if (seniors === 0) return 0;

  const every = crewWomanEvery('seniors');
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
  return hirePoolSeat(seat, crewWomanEvery('seniors'));
}

function openSeat(state: Consultancy): number {
  return state.roster.length;
}

export function nextSeniorHire(state: Consultancy): SeniorHire {
  const seat = openSeat(state);
  const every = crewWomanEvery('seniors');
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

export function managerAura(state: Consultancy): number {
  return additive(state, 'managerAura', MANAGER_AURA_BASE);
}

export function managerReach(state: Consultancy): number {
  return crewSweepRadius(state, 'managers');
}

export function debtInterest(state: Consultancy): number {
  const gap = productOf(state, 'debtInterest', (e) =>
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

export function escalationMultiplier(state: Consultancy): number {
  return ESCALATION_MULTIPLIER * multOf(state, 'escalation');
}

export function escalationHoldMs(state: Consultancy): number {
  return (
    ESCALATION_HOLD_MS +
    1000 *
      sumOf(state, 'escalationHold', (e) =>
        e.kind === 'escalationHold' ? e.seconds : null
      )
  );
}

export function closeValue(
  state: Consultancy,
  id: TicketTypeId,
  now = 0
): number {
  const base = ticketValue(state, id, now);
  return state.escalated ? base * escalationMultiplier(state) : base;
}

export function sprintWorth(
  state: Consultancy,
  mix: TicketMix,
  now = 0
): number {
  let worth = 0;
  for (const id of TICKET_TYPE_IDS) {
    const held = mix[id] ?? 0;
    if (held > 0) worth += held * closeValue(state, id, now);
  }
  return worth;
}

export function pickupStoryPoints(
  state: Consultancy,
  id: TicketTypeId,
  byCrew: boolean
): number {
  if (!pickupsPaySp(state)) return 0;
  const bonus = sumOf(state, `sp:${id}`, (e) =>
    e.kind === 'spPerClose' && (e.target === undefined || e.target === id)
      ? e.add
      : null
  );
  const crew = byCrew && holds(state, 'crewSp') ? CREW_SP_MULT : 1;
  return (SP_PER_PICKUP + bonus) * crew;
}

export function pizzaRush(state: Consultancy): Rush | null {
  const party = state.pizza;
  if (!party || state.lastTick >= party.until) return null;
  return { x: party.x, y: party.y, radius: PIZZA_RADIUS, mult: PIZZA_RUSH };
}

export function pickupsPaySp(state: Consultancy): boolean {
  return state.levels.velocity > 0;
}

export function coachCount(state: Consultancy): number {
  return sumOf(state, 'coach', (e) => (e.kind === 'coach' ? e.add : null));
}

export function voteBonusPerCrossing(state: Consultancy): number {
  return (
    VOTE_BONUS_BASE +
    sumOf(state, 'deck', (e) => (e.kind === 'deck' ? e.add : null))
  );
}

export function voteLive(
  state: Consultancy,
  index: number,
  runMs: number
): boolean {
  return liveAt(Math.max(1, coachCount(state)), index, runMs);
}

function liveAt(count: number, index: number, runMs: number): boolean {
  const offset = (index * VOTE_CYCLE_MS) / count;
  return (runMs + offset) % VOTE_CYCLE_MS < VOTE_ON_MS;
}

export function voteMask(
  state: Consultancy,
  runMs: number,
  landingY: number
): number {
  const count = coachCount(state);
  const coaches = Math.min(count, 31);
  const spread = Math.max(1, count);
  let mask = 0;
  for (let index = 0; index < coaches; index += 1) {
    if (landingY > voteBeamY(index) && liveAt(spread, index, runMs)) {
      mask |= 1 << index;
    }
  }
  return mask;
}

export function voteBonus(
  state: Consultancy,
  runMs: number,
  landingY: number
): number {
  return (
    voteCount(voteMask(state, runMs, landingY)) * voteBonusPerCrossing(state)
  );
}

function awardGranted(state: Consultancy, id: string): boolean {
  return state.achievements.includes(id);
}

export function pendingAwards(state: Consultancy): readonly Award[] {
  return AWARDS.filter(
    (award) => !awardGranted(state, award.id) && award.when(state)
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

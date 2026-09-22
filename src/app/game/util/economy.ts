import type { Consultancy } from '../model/consultancy.model';
import type { TicketMix } from '../model/board.model';
import type { Award } from '../model/award.model';
import { AWARDS, AWARD_BY_ID } from '../model/award.model';
import type { OfficePlate } from '../model/office.model';
import { nextPlate, platesAt } from '../model/office.model';
import { castPoolSize } from '../model/cast.model';
import type { Weather } from '../model/hazard.model';
import { CALM } from '../model/hazard.model';
import type { InvoiceLine, SprintInvoice } from '../model/invoice.model';
import type { KitItem } from '../model/kit.model';
import { boughtKit, nextKitItem } from '../model/kit.model';
import type { SeniorHire, TraitId } from '../model/senior.model';
import { TRAITS, hireFor } from '../model/senior.model';
import { tierAt } from '../model/tier.model';
import type { SkillEffect } from '../model/skill.model';
import { OFFICE_NODE_IDS, SKILL_BY_ID } from '../model/skill.model';
import type { TicketType, TicketTypeId } from '../model/ticket.model';
import { ladderUp, TICKET_TYPES, TICKET_TYPE_IDS } from '../model/ticket.model';
import { approachCap } from '../model/balance/curve';
import type { PurchaseId } from '../model/balance/progression';
import type { ClaimPick, CrewKind, HirePace } from '../model/crew.model';
import type { CrewBand } from '../model/balance/crew';
import {
  CREW_KINDS,
  CREW_STATS,
  DESKS_PER_PLATE,
  DESK_LINES,
  PROMOTION_PREMIUM,
  WOMAN_CLOSE_RATE,
} from '../model/balance/crew';
import {
  AUTO_CLOSE_MS,
  CLICK_RADIUS_BASE,
  CLICK_RADIUS_MAX,
  DEBT_INTEREST_CAP,
  RELABEL_STEPS_BASE,
} from '../model/balance/flow';
import {
  COPILOT_SP_PER_CLOSE,
  SENIOR_BUYOUT_STEPS,
  VELOCITY_SKIM_CAP,
  VELOCITY_SKIM_DECAY,
  VELOCITY_SP_PER_EURO,
  VELOCITY_UNLOCK_TIER,
} from '../model/balance/progression';
import {
  ROUND_LENGTH_BASE_MS,
  ROUND_TARGET_OF_BASELINE,
  SPRINT_OVERFLOW_RATE,
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

export function desks(state: Consultancy): number {
  return officePlates(state) * DESKS_PER_PLATE;
}

/** Headcount of a crew kind; the weather staffs whatever has no bought line. */
export function crewSize(
  state: Consultancy,
  crew: CrewKind,
  weather: Weather = CALM
): number {
  const key = CREW_STATS[crew].levelKey;
  return key === null ? weather.offshore : state.levels[key];
}

export function crewCount(state: Consultancy): number {
  return DESK_LINES.reduce((total, line) => total + state.levels[line], 0);
}

export function freeDesks(state: Consultancy): number {
  return Math.max(0, desks(state) - crewCount(state));
}

export function needsDesk(line: PurchaseId): boolean {
  return DESK_LINES.includes(line);
}

export function deskLimited(state: Consultancy, line: PurchaseId): boolean {
  return needsDesk(line) && freeDesks(state) < 1;
}

export function skillRank(state: Consultancy, id: string): number {
  const node = SKILL_BY_ID.get(id);
  if (!node) return 0;
  return Math.min(state.skills[id] ?? 0, node.levels.length);
}

export function skillRankCost(state: Consultancy, id: string): number {
  const node = SKILL_BY_ID.get(id);
  return node?.levels[skillRank(state, id)]?.cost ?? Number.POSITIVE_INFINITY;
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

export function sprintSlots(
  state: Consultancy,
  weather: Weather = CALM
): number {
  const slots = Math.floor(SPRINT_SLOTS_BASE * multOf(state, 'slots'));
  return Math.max(1, Math.floor(slots * weather.slots));
}

export function sprintRoom(
  state: Consultancy,
  weather: Weather = CALM
): number {
  return Math.max(0, sprintSlots(state, weather) - state.sprintCount);
}

export function roundTarget(state: Consultancy): number | null {
  const tier = tierAt(state.tier);
  return tier ? tier.baselinePerRound * ROUND_TARGET_OF_BASELINE : null;
}

export function roundBilled(
  state: Consultancy,
  sprintValue: number,
  boardBilled: number
): number {
  return sprintValue + retainerPerRound(state) + boardBilled;
}

export function retainerPerRound(state: Consultancy): number {
  const heads = CREW_KINDS.reduce(
    (total, crew) => total + crewSize(state, crew) * CREW_STATS[crew].retainer,
    0
  );
  return (
    heads *
    (roundLengthMs(state) / ROUND_LENGTH_BASE_MS) *
    (sprintSlots(state) / SPRINT_SLOTS_BASE)
  );
}

export function roundLengthMs(state: Consultancy): number {
  const bought = sumOf(state, (e) =>
    e.kind === 'roundLength' ? e.seconds : null
  );
  return ROUND_LENGTH_BASE_MS + bought * 1_000;
}

export function seniorsPreferTop(state: Consultancy): boolean {
  return holds(state, 'topOfBand');
}

export function ceilingPerSec(state: Consultancy): number {
  return sprintSlots(state) / (roundLengthMs(state) / 1000);
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
    type.value *
    fromSkills *
    tierScale *
    globalMultiplier(state) *
    hotfixMultiplier(state, now)
  );
}

function sourceMultiplier(state: Consultancy, type: TicketType): number {
  if (type.handOnly || type.tier === 0) return 1;
  return state.tier < type.tier ? 0 : 1;
}

export function spawnRate(state: Consultancy, id: TicketTypeId): number {
  const type = TICKET_TYPES[id];
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

/** Batch effects trade throughput for a slower close; only some crews carry one. */
function batchPenalty(state: Consultancy, kind: EffectKind): number {
  return productOf(state, (e) =>
    e.kind === kind && 'closeMult' in e ? e.closeMult : null
  );
}

export function crewCloseMs(
  state: Consultancy,
  crew: CrewKind,
  hire?: SeniorHire
): number {
  const stats = CREW_STATS[crew];
  const { close, batch } = stats.effects;
  const aura = stats.aura ? auraMultiplier(state) : 1;
  const faster = scaled(multOf(state, close), hire, close) * aura;
  return (stats.closeMs * batchPenalty(state, batch)) / faster;
}

export function crewBatch(
  state: Consultancy,
  crew: CrewKind,
  hire?: SeniorHire
): number {
  const stats = CREW_STATS[crew];
  const { batch } = stats.effects;
  return Math.floor(
    scaled(additive(state, batch, stats.batchBase), hire, batch)
  );
}

export function crewSweepRadius(
  state: Consultancy,
  crew: CrewKind,
  hire?: SeniorHire
): number {
  const stats = CREW_STATS[crew];
  const { sweep } = stats.effects;
  return stats.sweepRadius * scaled(multOf(state, sweep), hire, sweep);
}

export function crewWalkSpeed(
  state: Consultancy,
  crew: CrewKind,
  hire?: SeniorHire
): number {
  const stats = CREW_STATS[crew];
  const { walk } = stats.effects;
  return stats.walkSpeed * scaled(multOf(state, walk), hire, walk);
}

/** Which claim heuristic a crew follows — policy per kind, not a tuning number. */
export function crewPick(
  state: Consultancy,
  crew: CrewKind,
  hire?: SeniorHire
): ClaimPick {
  if (crew === 'offshore') return 'random';
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
    batch: crewBatch(state, crew, hire),
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

/** Promotion refills the senior bench from the junior pool, so it inherits that ratio. */
export function crewWomanEvery(state: Consultancy, crew: CrewKind): number {
  const promotedIn = crew === 'seniors' && state.promoted;
  return CREW_STATS[promotedIn ? 'juniors' : crew].womanEvery;
}

export function crewClaims(
  state: Consultancy,
  crew: CrewKind
): (type: TicketTypeId) => boolean {
  const skipped = triageSkips(state, crew);
  const rares = crewTakesRares(state, crew);
  const band = crewBand(state, crew);
  const automated = new Set(
    TICKET_TYPE_IDS.filter((type) => autoCloses(state, type))
  );
  return (type) => {
    const ticket = TICKET_TYPES[type];
    if (ticket.effect !== 'value') return false;
    if (ticket.handOnly && !rares) return false;
    if (ticket.tier < band.from || ticket.tier > band.to) return false;
    if (automated.has(type)) return false;
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

export function autoCloses(state: Consultancy, type: TicketTypeId): boolean {
  return foldRanks(
    state,
    false,
    (on, effect) =>
      on || (effect.kind === 'autoClose' && effect.target === type)
  );
}

export function autoCloseMs(state: Consultancy): number {
  return AUTO_CLOSE_MS * multOf(state, 'autoCloseSpeed');
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

export function crewTakesRares(_state: Consultancy, crew: CrewKind): boolean {
  return CREW_STATS[crew].takesRares;
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

function scaled(
  base: number,
  hire: SeniorHire | undefined,
  kind: EffectKind
): number {
  if (kind === null || !hire) return base;
  let total = base;
  for (const trait of hire.traits) {
    for (const effect of TRAITS[trait]) {
      if (effect.kind === kind && 'mult' in effect) total *= effect.mult;
    }
  }
  return total;
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

export function seniorBatch(state: Consultancy, hire?: SeniorHire): number {
  return crewBatch(state, 'seniors', hire);
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
    total += closesPerSec(
      rate,
      seniorBatch(state, hire),
      seniorCloseMs(state, hire)
    );
  }
  return total;
}

export function traitFactor(state: Consultancy, trait: TraitId): number {
  const hire: SeniorHire = { poolSeat: 0, traits: [trait] };
  const bare = seniorBatch(state) / seniorCloseMs(state);
  return seniorBatch(state, hire) / seniorCloseMs(state, hire) / bare;
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

export function copilotSpPerClose(state: Consultancy): number {
  const copilots = state.levels.copilot;
  if (copilots === 0) return 0;
  return copilots * COPILOT_SP_PER_CLOSE * multOf(state, 'copilot');
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

export function overflowFactor(state: Consultancy, count: number): number {
  if (count <= 0) return 1;
  const capacity = sprintSlots(state);
  if (count <= capacity) return 1;
  return (capacity + (count - capacity) * SPRINT_OVERFLOW_RATE) / count;
}

/**
 * The one pricing chain a sprint goes through: hotfix, then overflow, then
 * escalation. `sprintPayout` wants only the total, `sprintInvoice` wants each
 * step named — both read it from here so the money and the receipt agree.
 */
interface PricedSprint {
  readonly subtotal: number;
  readonly count: number;
  readonly hotfix: number;
  readonly overflow: number;
  readonly escalation: number;
  readonly gross: number;
}

function priceSprint(
  state: Consultancy,
  subtotal: number,
  count: number,
  now: number
): PricedSprint {
  const hotfix = subtotal * (hotfixMultiplier(state, now) - 1);
  const buffed = subtotal + hotfix;
  const overflow = buffed * (overflowFactor(state, count) - 1);
  const spilled = buffed + overflow;
  const escalation = state.escalated
    ? spilled * (escalationMultiplier(state) - 1)
    : 0;
  return {
    subtotal,
    count,
    hotfix,
    overflow,
    escalation,
    gross: spilled + escalation,
  };
}

export function sprintPayout(
  state: Consultancy,
  mix: TicketMix,
  now = 0
): number {
  const unbuffed: Consultancy = { ...state, hotfixUntil: 0 };
  let subtotal = 0;
  let count = 0;
  for (const id of TICKET_TYPE_IDS) {
    const held = mix[id] ?? 0;
    if (held > 0) {
      subtotal += held * ticketValue(unbuffed, id, now);
      count += held;
    }
  }
  return priceSprint(state, subtotal, count, now).gross;
}

export function sprintInvoice(
  state: Consultancy,
  mix: TicketMix,
  now = 0
): SprintInvoice {
  const unbuffed: Consultancy = { ...state, hotfixUntil: 0 };
  const lines: InvoiceLine[] = [];
  let subtotal = 0;
  let count = 0;
  for (const id of TICKET_TYPE_IDS) {
    const held = mix[id] ?? 0;
    if (held <= 0) continue;
    const each = ticketValue(unbuffed, id, now);
    const total = held * each;
    lines.push({ type: id, count: held, each, total });
    subtotal += total;
    count += held;
  }
  lines.sort((a, b) => b.total - a.total);

  return {
    lines,
    capacity: sprintSlots(state),
    ...priceSprint(state, subtotal, count, now),
  };
}

export function mergeInvoices(
  first: SprintInvoice,
  next: SprintInvoice
): SprintInvoice {
  const byType = new Map(first.lines.map((line) => [line.type, line]));
  for (const line of next.lines) {
    const held = byType.get(line.type);
    byType.set(
      line.type,
      held
        ? {
            ...held,
            count: held.count + line.count,
            total: held.total + line.total,
          }
        : line
    );
  }
  return {
    lines: [...byType.values()].sort((a, b) => b.total - a.total),
    count: first.count + next.count,
    capacity: next.capacity,
    subtotal: first.subtotal + next.subtotal,
    hotfix: first.hotfix + next.hotfix,
    overflow: first.overflow + next.overflow,
    escalation: first.escalation + next.escalation,
    gross: first.gross + next.gross,
  };
}

export function velocitySkim(state: Consultancy): number {
  const level = state.levels.velocity;
  if (level === 0) return 0;
  return approachCap(VELOCITY_SKIM_CAP, VELOCITY_SKIM_DECAY ** level);
}

export function velocityStoryPoints(
  state: Consultancy,
  payout: number
): number {
  return payout * velocitySkim(state) * VELOCITY_SP_PER_EURO;
}

export function velocityUnlocked(state: Consultancy): boolean {
  return state.tier >= VELOCITY_UNLOCK_TIER;
}

export function promotionCost(state: Consultancy): number {
  const juniors = state.levels.junior;
  if (juniors === 0) return Number.POSITIVE_INFINITY;
  const steps = SENIOR_BUYOUT_STEPS;
  const last = steps[steps.length - 1] ?? 0;
  let total = 0;
  for (let n = 0; n < juniors; n += 1) {
    total += steps[state.levels.senior + n] ?? last;
  }
  return total * PROMOTION_PREMIUM;
}

export function promotionOffered(state: Consultancy): boolean {
  return !state.promoted && state.levels.senior > 0 && state.levels.junior > 0;
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

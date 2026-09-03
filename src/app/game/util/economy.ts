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
import type { CrewKind } from '../model/crew.model';
import {
  CREW_WOMAN_EVERY,
  DESKS_PER_PLATE,
  JUNIOR_BAND_TOP,
  JUNIOR_BATCH_BASE,
  JUNIOR_CLOSE_MS,
  JUNIOR_SWEEP_RADIUS,
  JUNIOR_WALK_SPEED,
  MANAGER_CLOSE_MS,
  MANAGER_WALK_SPEED,
  PROMOTION_PREMIUM,
  SENIOR_BAND_FROM,
  SENIOR_BATCH_BASE,
  SENIOR_CLOSE_MS,
  SENIOR_SWEEP_RADIUS,
  SENIOR_WALK_SPEED,
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
  RETAINER_PER_HIRE,
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

function crewCount(state: Consultancy): number {
  return state.levels.junior + state.levels.senior + state.levels.manager;
}

export function freeDesks(state: Consultancy): number {
  return Math.max(0, desks(state) - crewCount(state));
}

export function needsDesk(line: PurchaseId): boolean {
  return line === 'junior' || line === 'senior' || line === 'manager';
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

function multOf(state: Consultancy, kind: SkillEffect['kind']): number {
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

function additive(
  state: Consultancy,
  kind: SkillEffect['kind'],
  base: number
): number {
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
  const heads =
    state.levels.junior * RETAINER_PER_HIRE.juniors +
    state.levels.senior * RETAINER_PER_HIRE.seniors +
    state.levels.manager * RETAINER_PER_HIRE.managers;
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

function juniorEfficiency(state: Consultancy): number {
  return multOf(state, 'junior') * auraMultiplier(state);
}

function juniorBatchPenalty(state: Consultancy): number {
  return productOf(state, (e) =>
    e.kind === 'juniorBatch' ? e.closeMult : null
  );
}

export function juniorCloseMs(state: Consultancy): number {
  return (
    (JUNIOR_CLOSE_MS * juniorBatchPenalty(state)) / juniorEfficiency(state)
  );
}

export function juniorBatch(state: Consultancy): number {
  return Math.floor(additive(state, 'juniorBatch', JUNIOR_BATCH_BASE));
}

export function juniorSweepRadius(state: Consultancy): number {
  return JUNIOR_SWEEP_RADIUS * multOf(state, 'juniorSweep');
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
  return crew === 'seniors' && !state.promoted
    ? CREW_WOMAN_EVERY.seniors
    : CREW_WOMAN_EVERY.juniors;
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

function crewBand(
  state: Consultancy,
  crew: CrewKind
): { readonly from: number; readonly to: number } {
  if (crew === 'juniors') {
    return { from: 0, to: additive(state, 'juniorBand', JUNIOR_BAND_TOP) };
  }
  if (crew === 'seniors') return { from: SENIOR_BAND_FROM, to: Infinity };
  return { from: 0, to: Infinity };
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
  return crew === 'offshore';
}

export function womenAmong(count: number, every: number): number {
  return Math.floor(count / every);
}

export function crewWomen(state: Consultancy): number {
  return (
    womenAmong(state.levels.junior, crewWomanEvery(state, 'juniors')) +
    womenAmong(state.levels.senior, crewWomanEvery(state, 'seniors'))
  );
}

function crewRate(count: number, every: number): number {
  const women = womenAmong(count, every);
  return count - women + women * WOMAN_CLOSE_RATE;
}

export function juniorCeilingPerSec(state: Consultancy): number {
  const juniors = state.levels.junior;
  if (juniors === 0) return 0;
  const rate = crewRate(juniors, crewWomanEvery(state, 'juniors'));
  return (rate * juniorBatch(state) * 1000) / juniorCloseMs(state);
}

export function juniorWalkSpeed(state: Consultancy): number {
  return JUNIOR_WALK_SPEED * multOf(state, 'juniorWalk');
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
  kind: SkillEffect['kind']
): number {
  let total = base;
  for (const trait of hire?.traits ?? []) {
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
  return SENIOR_CLOSE_MS / scaled(multOf(state, 'senior'), hire, 'senior');
}

export function seniorWalkSpeed(state: Consultancy, hire?: SeniorHire): number {
  return (
    SENIOR_WALK_SPEED * scaled(multOf(state, 'seniorWalk'), hire, 'seniorWalk')
  );
}

export function seniorBatch(state: Consultancy, hire?: SeniorHire): number {
  return Math.floor(
    scaled(
      additive(state, 'seniorBatch', SENIOR_BATCH_BASE),
      hire,
      'seniorBatch'
    )
  );
}

export function seniorSweepRadius(
  state: Consultancy,
  hire?: SeniorHire
): number {
  return (
    SENIOR_SWEEP_RADIUS *
    scaled(multOf(state, 'seniorSweep'), hire, 'seniorSweep')
  );
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
    total +=
      (rate * seniorBatch(state, hire) * 1000) / seniorCloseMs(state, hire);
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
  return MANAGER_CLOSE_MS / multOf(state, 'manager');
}

export function managerWalkSpeed(state: Consultancy): number {
  return MANAGER_WALK_SPEED * multOf(state, 'managerWalk');
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

export function sprintPayout(
  state: Consultancy,
  mix: TicketMix,
  now = 0
): number {
  let base = 0;
  let count = 0;
  for (const id of TICKET_TYPE_IDS) {
    const held = mix[id] ?? 0;
    if (held > 0) {
      base += held * ticketValue(state, id, now);
      count += held;
    }
  }
  base *= overflowFactor(state, count);
  return state.escalated ? base * escalationMultiplier(state) : base;
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

  const hotfix = subtotal * (hotfixMultiplier(state, now) - 1);
  const buffed = subtotal + hotfix;
  const overflow = buffed * (overflowFactor(state, count) - 1);
  const spilled = buffed + overflow;
  const escalation = state.escalated
    ? spilled * (escalationMultiplier(state) - 1)
    : 0;

  return {
    lines,
    count,
    capacity: sprintSlots(state),
    subtotal,
    hotfix,
    overflow,
    escalation,
    gross: spilled + escalation,
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

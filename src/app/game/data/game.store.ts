import { computed, Injectable, signal } from '@angular/core';

import type {
  Board,
  BoardTicket,
  Close,
  CloseAuthor,
  CloseFloat,
  Harvest,
  SprintSlot,
} from '../model/board.model';
import {
  emptyBoard,
  NO_SEAT,
  NO_TICKET,
  ticketMix,
} from '../model/board.model';
import type { CrewKind } from '../model/crew.model';
import type { Consultancy } from '../model/consultancy.model';
import { CRITERIA_COUNT, freshConsultancy } from '../model/consultancy.model';
import {
  BURNDOWN_SAMPLES,
  BURNDOWN_SAMPLE_MS,
  CLOSE_FLOAT_BUFFER,
  WONT_FIX_BUFFER,
  MAX_CATCHUP_MS,
  SAVE_VERSION,
  TICK_MS,
} from '../model/game.consts';
import type { Burndown, BurndownSample } from '../model/burndown.model';
import { EMPTY_BURNDOWN } from '../model/burndown.model';
import type { Hazard, HazardId, Weather } from '../model/hazard.model';
import {
  CALM,
  HAZARDS,
  HAZARDS_ENABLED,
  HAZARD_BY_ID,
  hazardDurationMs,
} from '../model/hazard.model';
import type { BuffNotice, RoundOutcome } from '../model/round.model';
import type { SkillLock } from '../model/skill.model';
import { FINAL_SKILL_ID, SECRET_SKILL_ID } from '../model/skill.model';
import { tierAt } from '../model/tier.model';
import type { TicketTypeId } from '../model/ticket.model';
import { TICKET_TYPES } from '../model/ticket.model';

const QUARTER_FROM_TIER = TICKET_TYPES.quarter.tier;
const VOIDED_AT_SIGNOFF: ReadonlySet<TicketTypeId> = new Set([
  'hotfix',
  'escalation',
  'quarter',
]);
import type { KitItem } from '../model/kit.model';
import type { PurchaseId } from '../model/balance/progression';
import type { ReleasePhase } from '../model/balance/round';
import {
  PIZZA_MS,
  PROD_INCIDENT_LIVE_CAP,
  TIER_BURST,
  ticketLifeMs,
} from '../model/balance/flow';
import {
  COMBO_EXTEND_MS,
  JACKPOT_BONUS,
  FACT_COUNTDOWN_MS,
  FACT_EVERY_MS,
  FACT_OFFSET_MS,
  HOTFIX_MS,
  HOTFIX_MULTIPLIER,
  INVITATION_EVERY_MS,
  INVITATION_WINDOW_MS,
} from '../model/balance/weather';
import type { Closed, CrewWork } from '../util/board';
import {
  addTicket,
  comeBack,
  expireTickets,
  overseen,
  removeTicket,
  stepBoard,
} from '../util/board';
import { crewRules } from '../util/crew-rules';
import { spawnInto } from '../util/supply';
import { incidentPayout, underTestRate } from '../util/sim';
import * as economy from '../util/economy';
import * as purchase from '../util/purchase';
import { SpawnBudget } from '../util/spawn-budget';

const crewed = (by: CloseAuthor): boolean => by !== 'you' && by !== 'auto';

const roomIn = (state: Consultancy, slots: number): number =>
  !economy.trainRuns(state)
    ? Infinity
    : state.phase === 'hauling'
      ? 0
      : Math.max(0, slots - state.sprintCount);

const NO_HARVEST: Harvest = {
  taken: [],
  refused: [],
  value: 0,
  sp: 0,
  big: false,
  headline: null,
  declined: null,
};

const NO_WORK: CrewWork = { closed: [], byWomen: 0 };

const samePhases = (
  a: readonly ReleasePhase[],
  b: readonly ReleasePhase[]
): boolean => a.length === b.length && a.every((phase, at) => phase === b[at]);

type Buffs = Pick<
  Consultancy,
  'escalated' | 'escalationFiresAt' | 'hotfixUntil' | 'pizza'
>;

function armBuffs(state: Consultancy, closed: Closed, now: number): Buffs {
  let buffs: Buffs = {
    escalated: state.escalated,
    escalationFiresAt: state.escalationFiresAt,
    hotfixUntil: state.hotfixUntil,
    pizza: state.pizza,
  };

  for (const { type, x, y } of closed) {
    const escalated = buffs.escalated && buffs.escalationFiresAt > now;
    const hotfixed = buffs.hotfixUntil > now;
    switch (TICKET_TYPES[type].effect) {
      case 'sprintMultiplier':
        buffs = {
          ...buffs,
          escalated: true,
          escalationFiresAt: Math.max(
            buffs.escalationFiresAt,
            now + economy.escalationHoldMs(state)
          ),
          hotfixUntil: hotfixed
            ? buffs.hotfixUntil + COMBO_EXTEND_MS
            : buffs.hotfixUntil,
        };
        break;
      case 'hotfixBuff':
        buffs = {
          ...buffs,
          hotfixUntil: Math.max(buffs.hotfixUntil, now + HOTFIX_MS),
          escalationFiresAt: escalated
            ? buffs.escalationFiresAt + COMBO_EXTEND_MS
            : buffs.escalationFiresAt,
        };
        break;
      case 'crewRush':
        buffs = { ...buffs, pizza: { x, y, until: now + PIZZA_MS } };
        break;
      case 'value':
      case 'billBoard':
      case 'decline':
        break;
    }
  }
  return buffs;
}

interface LiveHazard {
  readonly id: HazardId;
  readonly kind: HazardKindOf;
  readonly at: number;
  until: number;
  readonly ticket: number;
  landed: boolean;
}

type HazardKindOf = Hazard['kind'];

/** A pending invitation can still be declined, so it outranks what merely counts down. */
function noticeRank(live: LiveHazard): number {
  if (live.kind === 'invitation') return live.landed ? 2 : 3;
  return live.landed ? 0 : 1;
}

const hazardsOf = (kind: HazardKindOf): readonly Hazard[] =>
  HAZARDS_ENABLED ? HAZARDS.filter((row) => row.kind === kind) : [];

const ELIGIBLE: Record<
  HazardKindOf,
  { readonly all: readonly Hazard[]; tier: number; rows: readonly Hazard[] }
> = {
  invitation: { all: hazardsOf('invitation'), tier: -1, rows: [] },
  fact: { all: hazardsOf('fact'), tier: -1, rows: [] },
};

function eligibleHazards(kind: HazardKindOf, tier: number): readonly Hazard[] {
  const memo = ELIGIBLE[kind];
  if (memo.tier !== tier) {
    memo.tier = tier;
    memo.rows = memo.all.filter((row) => tier >= row.fromTier);
  }
  return memo.rows;
}

interface Cadence {
  readonly every: number;
  readonly needs: number;
  readonly offset: number;
  due: number;
  seq: number;
}

function nextBeat(cadence: Cadence, afterMs: number): number {
  const beats = Math.floor((afterMs - cadence.offset) / cadence.every) + 1;
  return cadence.offset + beats * cadence.every;
}

function armed(cadence: Cadence, runMs: number): number {
  return nextBeat(cadence, runMs + cadence.every / 2);
}

function freshCadence(runMs: number): Record<HazardKindOf, Cadence> {
  const invitation: Cadence = {
    every: INVITATION_EVERY_MS,
    needs: INVITATION_WINDOW_MS,
    offset: 0,
    due: 0,
    seq: 0,
  };
  const fact: Cadence = {
    every: FACT_EVERY_MS,
    needs: FACT_COUNTDOWN_MS,
    offset: FACT_OFFSET_MS,
    due: 0,
    seq: 0,
  };
  invitation.due = armed(invitation, runMs);
  fact.due = armed(fact, runMs);
  return { invitation, fact };
}

interface Reached {
  readonly taken: number[];
  readonly closed: Close[];
  readonly tickets: BoardTicket[];
  readonly quarterEnd: boolean;
}

function reachedBy(board: Board, ids: readonly number[]): Reached {
  const taken: number[] = [];
  const closed: Close[] = [];
  const tickets: BoardTicket[] = [];
  let quarterEnd = false;

  for (const id of ids) {
    const ticket = board.byId.get(id);
    if (!ticket) continue;
    const { effect } = TICKET_TYPES[ticket.type];
    quarterEnd ||= effect === 'billBoard';
    taken.push(id);
    closed.push({
      type: ticket.type,
      titleKey: ticket.titleKey,
      golden: ticket.golden,
      spBonus: ticket.spBonus,
      by: 'you',
      poolSeat: NO_SEAT,
      woman: false,
      x: ticket.x,
      y: ticket.y,
    });
    tickets.push(ticket);
  }
  return { taken, closed, tickets, quarterEnd };
}

const PROBING = ((): boolean => {
  try {
    return globalThis.localStorage?.getItem('cb-probe') === '1';
  } catch {
    return false;
  }
})();

@Injectable({ providedIn: 'root' })
export class GameStore {
  #state = signal<Consultancy>(freshConsultancy(Date.now(), SAVE_VERSION));
  #awarded = signal<readonly string[]>([]);
  #sprint = signal<readonly SprintSlot[]>([]);
  #mix = computed(() => ticketMix(this.#sprint()));
  #closeFloats: CloseFloat[] = [];
  #wontFix: number[] = [];
  #prodIncidents = 0;
  readonly #prodLive = new Set<number>();
  readonly #freshProd = new Set<number>();
  #billed = 0;
  #board = emptyBoard();
  #budget = new SpawnBudget();
  #rand: () => number = Math.random;

  #live: LiveHazard[] = [];
  #sky = signal<Weather>(CALM);
  readonly sky = this.#sky.asReadonly();
  #cadence = freshCadence(0);

  #burndown = signal<Burndown>(EMPTY_BURNDOWN);
  #nextSampleAt = 0;
  #sampleEvery = BURNDOWN_SAMPLE_MS;

  #cycleBilled = 0;
  #rares = signal(0);
  readonly raresTaken = this.#rares.asReadonly();
  #review = signal(0);
  readonly incidentReview = this.#review.asReadonly();
  #outcome = signal<RoundOutcome | null>(null);
  #previous = signal<RoundOutcome | null>(null);

  readonly lastRound = this.#outcome.asReadonly();
  readonly previousRound = this.#previous.asReadonly();

  readonly state = this.#state.asReadonly();
  readonly budget = computed(() => this.#state().budget);
  readonly storyPoints = computed(() => this.#state().storyPoints);
  readonly tier = computed(() => this.#state().tier);
  readonly skills = computed(() => this.#state().skills);
  readonly levels = computed(() => this.#state().levels);

  readonly sprintCount = computed(() => this.#state().sprintCount);
  readonly sprintSlots = computed(() =>
    economy.sprintSlots(this.#state(), this.#sky())
  );
  readonly sprintValue = computed(() =>
    economy.sprintWorth(this.#state(), this.#mix(), this.#state().lastTick)
  );
  readonly hauling = computed(() => this.#state().phase === 'hauling');
  readonly canFull = computed(() => this.sprintCount() >= this.sprintSlots());
  readonly escalated = computed(() => this.#state().escalated);
  readonly crewWomen = computed(() => economy.crewWomen(this.#state()));

  womanEvery(crew: CrewKind): number {
    return economy.crewWomanEvery(crew);
  }
  readonly clickRadius = computed(() => economy.clickRadius(this.#state()));

  readonly perSecond = computed(() => {
    const last = this.#outcome();
    if (last && last.durationMs > 0) {
      return last.billed / (last.durationMs / 1000);
    }
    const state = this.#state();
    return state.runMs > 0 ? state.lifetimeBilled / (state.runMs / 1000) : 0;
  });

  seedRandom(rand: () => number): void {
    this.#rand = rand;
  }

  get board(): Board {
    return this.#board;
  }

  readonly lifetimeClosed = computed(() => this.#state().lifetimeClosed);
  readonly lifetimeBilled = computed(() => this.#state().lifetimeBilled);
  readonly lifetimeRounds = computed(() => this.#state().lifetimeRounds);
  readonly lifetimeClosedByWomen = computed(
    () => this.#state().lifetimeClosedByWomen
  );
  readonly lifetimeClosedByCrew = computed(
    () => this.#state().lifetimeClosedByCrew
  );

  readonly awarded = this.#awarded.asReadonly();
  readonly awardCount = computed(() => this.#awarded().length);

  readonly sprint = this.#sprint.asReadonly();
  pizzaParty(): { x: number; y: number; radius: number; left: number } | null {
    const state = this.#state();
    const rush = economy.pizzaRush(state);
    if (!rush || !state.pizza) return null;
    const left = (state.pizza.until - state.lastTick) / PIZZA_MS;
    return { x: rush.x, y: rush.y, radius: rush.radius, left };
  }

  readonly achievements = computed(() => this.#state().achievements);

  readonly hotfixUntil = computed(() => this.#state().hotfixUntil);

  readonly running = computed(() => this.#state().phase === 'collecting');
  readonly roundSeq = computed(() => this.#state().roundSeq);

  readonly ended = computed(() => this.#state().endedAt > 0);

  readonly inAcceptance = computed(() => economy.inAcceptance(this.#state()));

  advanceTo(now: number): void {
    const state = this.#state();
    const elapsed = now - state.lastTick;
    if (elapsed > 0 && state.endedAt === 0) {
      let at = now - Math.min(elapsed, MAX_CATCHUP_MS);
      while (at < now && this.#state().endedAt === 0) {
        const to = Math.min(at + TICK_MS, now);
        this.#advance((to - at) / 1000, to);
        at = to;
      }
    }
    const done = this.#state();
    if (done.lastTick !== now) this.#state.set({ ...done, lastTick: now });
  }

  rebase(now: number): void {
    this.#state.set({ ...this.#state(), lastTick: now });
  }

  readonly #releasePhases = computed(
    () => {
      const phases = economy.releasePhases(this.#state());
      const open = this.#review();
      return open > 0 ? economy.withReview(phases, open) : phases;
    },
    { equal: samePhases }
  );
  readonly #haulMs = computed(() =>
    this.#releasePhases().reduce((sum, phase) => sum + phase.ms, 0)
  );

  haulMs(): number {
    return this.#haulMs();
  }

  releasePhases(): readonly ReleasePhase[] {
    return this.#releasePhases();
  }

  roundLeftMs(): number {
    return this.#state().haulLeftMs;
  }

  #trainLeaves(state: Consultancy): RoundOutcome {
    const outcome: RoundOutcome = {
      seq: state.roundSeq,
      billed: this.#cycleBilled,
      durationMs: state.roundMs,
    };

    const finished = this.#outcome();
    if (finished) this.#previous.set(finished);
    this.#outcome.set(outcome);
    return outcome;
  }

  endRoundNow(now: number): void {
    const state = this.#state();
    if (state.phase !== 'collecting') return;
    const cap = economy.sprintSlots(state, this.#sky());
    this.#state.set({ ...this.#sendTrain(state, cap), lastTick: now });
  }

  startRound(now: number): boolean {
    const state = this.#state();
    if (state.phase !== 'hauling') return false;
    this.#state.set({ ...this.#trainBack(state), lastTick: now });
    return true;
  }

  #stepBoard(state: Consultancy, dtMs: number, slots: number): CrewWork {
    const weather = this.#sky();
    spawnInto(
      this.#board,
      this.#budget,
      state,
      dtMs / 1000,
      this.#rand,
      weather
    );
    const room = roomIn(state, slots);
    const crews =
      room <= 0
        ? NO_WORK
        : stepBoard(
            this.#board,
            crewRules(this.#board, state, weather),
            dtMs,
            this.#rand,
            room
          );
    const closing = this.#expire(state, dtMs);
    return this.#autoClose(crews, closing, room);
  }

  #expire(state: Consultancy, dtMs: number): readonly BoardTicket[] {
    const gone: BoardTicket[] = [];
    const closing: BoardTicket[] = [];
    expireTickets(this.#board, dtMs, gone, economy.autoClosed(state), closing);
    this.#fade(gone);
    return closing;
  }

  #fade(gone: readonly BoardTicket[]): void {
    for (const ticket of gone) {
      if (this.#wontFix.length >= WONT_FIX_BUFFER) break;
      this.#wontFix.push(ticket.id);
    }
  }

  #autoClose(
    crews: CrewWork,
    closing: readonly BoardTicket[],
    sprintRoom: number
  ): CrewWork {
    if (closing.length === 0) return crews;
    const room = Math.max(0, sprintRoom - crews.closed.length);
    const shipped: Close[] = closing.slice(0, room).map((ticket) => ({
      type: ticket.type,
      titleKey: ticket.titleKey,
      golden: ticket.golden,
      spBonus: ticket.spBonus,
      by: 'auto',
      poolSeat: 0,
      woman: false,
      x: ticket.x,
      y: ticket.y,
    }));
    const toProd = closing.slice(room);
    if (toProd.length > 0) {
      this.#fade(toProd);
      this.#toProd(toProd.length);
    }
    return { closed: crews.closed.concat(shipped), byWomen: crews.byWomen };
  }

  #toProd(count: number): void {
    for (const id of this.#prodLive) {
      if (!this.#board.byId.has(id)) this.#prodLive.delete(id);
    }
    for (let n = 0; n < count; n += 1) {
      const card =
        this.#prodLive.size < PROD_INCIDENT_LIVE_CAP
          ? addTicket(this.#board, 'incident', this.#rand)
          : null;
      if (!card) continue;
      this.#prodLive.add(card.id);
      this.#freshProd.add(card.id);
      this.#prodIncidents += 1;
    }
  }

  #takeProdIncidents(): number {
    const count = this.#prodIncidents;
    this.#prodIncidents = 0;
    return count;
  }

  takeWontFix(): readonly number[] {
    const due = this.#wontFix;
    this.#wontFix = [];
    return due;
  }

  #advance(seconds: number, now: number): void {
    this.#freshProd.clear();
    const state = this.#state();
    const dtMs = seconds * 1000;
    const runMs = state.runMs + dtMs;
    this.#board.lifeMs = ticketLifeMs(state.tier);
    const slots = economy.sprintSlots(state, this.#sky());
    const work = this.#stepBoard(state, dtMs, slots);
    const banked = this.#bank(state, work, now, slots);

    this.#state.set({
      ...banked.next,
      lifetimeProdIncidents:
        banked.next.lifetimeProdIncidents + this.#takeProdIncidents(),
      lastTick: now,
      runMs,
      roundMs: state.roundMs + dtMs,
    });
    this.#stepWeather(runMs, now);
    this.#sampleBurndown(runMs);

    const stepped = this.#state();
    const settled = this.#settle(stepped, dtMs, now);
    if (settled !== stepped) this.#state.set(settled);
  }

  #settle(state: Consultancy, dtMs: number, now: number): Consultancy {
    let next = state;
    if (next.escalationFiresAt > 0 && now >= next.escalationFiresAt) {
      next = { ...next, escalated: false, escalationFiresAt: 0 };
    }
    next = economy.stepCriterion(next, underTestRate);
    next = this.#grantAwards(next);
    next = this.#stepTrain(next, dtMs);
    return economy.accepted(next) ? { ...next, endedAt: now } : next;
  }

  #stepTrain(state: Consultancy, dtMs: number): Consultancy {
    if (!economy.trainRuns(state)) {
      return state.phase === 'hauling' ? this.#trainBack(state) : state;
    }
    if (state.phase === 'hauling') {
      const left = state.haulLeftMs - dtMs;
      return left > 0 ? { ...state, haulLeftMs: left } : this.#trainBack(state);
    }
    const slots = economy.sprintSlots(state, this.#sky());
    return state.sprintCount >= slots ? this.#sendTrain(state, slots) : state;
  }

  #sendTrain(state: Consultancy, cap: number): Consultancy {
    const open = economy.reviewsIncidents(state) ? this.#openIncidents() : 0;
    this.#review.set(open);
    return {
      ...state,
      lastOutcome: this.#trainLeaves(state),
      phase: 'hauling',
      haulLeftMs: this.#haulMs(),
      lifetimeReviews: state.lifetimeReviews + (open > 0 ? 1 : 0),
    };
  }

  #openIncidents(): number {
    let open = 0;
    for (const ticket of this.#board.rares) {
      if (ticket.type === 'incident' && !this.#freshProd.has(ticket.id))
        open += 1;
    }
    return open;
  }

  #trainBack(state: Consultancy): Consultancy {
    this.#sprint.set([]);
    this.#review.set(0);
    this.#cycleBilled = 0;
    return {
      ...state,
      roundMs: 0,
      roundSeq: state.roundSeq + 1,
      lifetimeRounds: state.lifetimeRounds + 1,
      phase: 'collecting',
      haulLeftMs: 0,
      sprintCount: 0,
    };
  }

  #sampleBurndown(runMs: number): void {
    if (runMs < this.#nextSampleAt) return;
    this.#nextSampleAt = runMs + this.#sampleEvery;

    const chart = this.#burndown();
    let samples: readonly BurndownSample[] = [
      ...chart.samples,
      { at: runMs, outstanding: this.#board.tickets.length },
    ];
    if (samples.length > BURNDOWN_SAMPLES) {
      samples = samples.filter((_, at) => at % 2 === 0);
      this.#sampleEvery *= 2;
    }
    this.#burndown.set({ ...chart, samples, runMs });
  }

  #markApproval(tier: number, runMs: number): void {
    this.#burndown.update((chart) => ({
      ...chart,
      approvals: [...chart.approvals, { tier, at: runMs }],
    }));
  }

  readonly burndown = this.#burndown.asReadonly();

  #stepWeather(runMs: number, now: number): void {
    const state = this.#state();
    let cleared = false;

    for (let at = this.#live.length - 1; at >= 0; at -= 1) {
      const live = this.#live[at];
      if (!live) continue;
      if (!live.landed) {
        if (runMs < live.at) continue;
        this.#landHazard(live, runMs, now);
      }
      if (live.landed && runMs >= live.until) {
        this.#live.splice(at, 1);
        cleared = true;
      }
    }

    this.#placeDue('invitation', runMs, state);
    this.#placeDue('fact', runMs, state);
    if (cleared) this.#sky.set(this.#weatherNow());
  }

  #placeDue(kind: HazardKindOf, runMs: number, state: Consultancy): void {
    const cadence = this.#cadence[kind];
    const eligible = eligibleHazards(kind, state.tier);

    if (eligible.length === 0) {
      cadence.due = armed(cadence, runMs);
      return;
    }
    if (runMs < cadence.due) return;

    const row = eligible[cadence.seq % eligible.length];
    if (!row || !this.#place(row, runMs, state)) return;

    cadence.seq += 1;
    cadence.due = nextBeat(cadence, runMs);
  }

  #place(row: Hazard, runMs: number, state: Consultancy): boolean {
    if (
      row.kind === 'invitation' &&
      (state.levels.manager > 0 || economy.inAcceptance(state))
    )
      return true;

    if (row.kind === 'fact') {
      this.#live.push({
        id: row.id,
        kind: row.kind,
        at: runMs + FACT_COUNTDOWN_MS,
        until: 0,
        ticket: NO_TICKET,
        landed: false,
      });
      return true;
    }

    const card = addTicket(this.#board, 'invite', this.#rand);
    if (!card) return false;
    this.#live.push({
      id: row.id,
      kind: row.kind,
      at: runMs + INVITATION_WINDOW_MS,
      until: 0,
      ticket: card.id,
      landed: false,
    });
    return true;
  }

  #landHazard(live: LiveHazard, runMs: number, now: number): void {
    live.landed = true;
    live.until = runMs + hazardDurationMs(live.id);

    const card = this.#board.byId.get(live.ticket);
    if (card) removeTicket(this.#board, card);

    if (live.id === 'grooming') this.#groom();
    else if (live.id === 'migration') this.startRound(now);
    this.#sky.set(this.#weatherNow());
  }

  #groom(): void {
    const bonus = economy.voteBonusPerCrossing(this.#state());
    for (const ticket of this.#board.tickets) {
      if (TICKET_TYPES[ticket.type].effect !== 'value') continue;
      if (TICKET_TYPES[ticket.type].handOnly || ticket.spBonus >= bonus) {
        continue;
      }
      ticket.spBonus = bonus;
    }
  }

  #decline(ticketId: number): HazardId | null {
    const at = this.#live.findIndex((live) => live.ticket === ticketId);
    const live = this.#live[at];
    if (!live) return null;
    this.#live.splice(at, 1);
    this.#sky.set(this.#weatherNow());
    return live.id;
  }

  #weatherNow(): Weather {
    let sky: Weather = CALM;
    for (const live of this.#live) {
      if (!live.landed) continue;
      const row = HAZARD_BY_ID.get(live.id);
      if (row?.weather) sky = { ...sky, ...row.weather };
    }
    return sky;
  }

  buffNotices(): readonly BuffNotice[] {
    const state = this.#state();
    if (state.endedAt > 0) return [];
    const now = state.lastTick;
    const live: BuffNotice[] = [];
    const criterion = economy.criterionNow(state);
    if (economy.inAcceptance(state)) {
      live.push({
        id: 'acceptance',
        mult: economy.overtime(state),
        criterion: criterion && {
          index: criterion.index,
          line: criterion.line,
          of: CRITERIA_COUNT,
          done: criterion.done,
          msLeft: economy.criterionMsLeft(state),
        },
      });
    }
    if (state.escalated && state.escalationFiresAt > now) {
      live.push({
        id: 'escalation',
        mult: economy.escalationMultiplier(state),
        msLeft: state.escalationFiresAt - now,
      });
    }
    if (state.hotfixUntil > now) {
      live.push({
        id: 'hotfix',
        mult: HOTFIX_MULTIPLIER,
        msLeft: state.hotfixUntil - now,
      });
    }
    const held = (type: TicketTypeId): boolean =>
      this.#board.rares.some((ticket) => ticket.type === type);
    const quarter = held('quarter');
    const storm =
      quarter &&
      state.escalated &&
      state.escalationFiresAt > now &&
      state.hotfixUntil > now;
    if (storm) {
      live.push({
        id: 'storm',
        mult: HOTFIX_MULTIPLIER * economy.escalationMultiplier(state),
        msLeft: Math.min(state.escalationFiresAt, state.hotfixUntil) - now,
      });
    } else if (quarter && held('escalation') && state.hotfixUntil > now) {
      live.push({ id: 'comboLive' });
    } else if (quarter && held('escalation') && held('hotfix')) {
      live.push({ id: 'combo' });
    } else if (quarter && held('escalation')) {
      return live;
    } else if (quarter && (state.hotfixUntil > now || state.escalated)) {
      live.push({ id: 'quarter' });
    } else if (
      held('escalation') &&
      !quarter &&
      state.hotfixUntil > now &&
      state.tier >= QUARTER_FROM_TIER
    ) {
      live.push({ id: 'escalationHeld' });
    }
    return live;
  }

  hazardNotice(): {
    readonly id: HazardId;
    readonly kind: HazardKindOf;
    readonly landed: boolean;
    readonly msLeft: number;
  } | null {
    if (this.#state().endedAt > 0) return null;
    const runMs = this.#state().runMs;
    let best: LiveHazard | null = null;
    for (const live of this.#live) {
      if (!best || noticeRank(live) > noticeRank(best)) best = live;
    }
    if (!best) return null;
    return {
      id: best.id,
      kind: best.kind,
      landed: best.landed,
      msLeft: Math.max(0, (best.landed ? best.until : best.at) - runMs),
    };
  }

  #grantAwards(state: Consultancy): Consultancy {
    const due = economy.pendingAwards(state);
    if (due.length === 0) return state;

    const ids = due.map((award) => award.id);
    this.#awarded.update((held) => [...held, ...ids]);
    return { ...state, achievements: [...state.achievements, ...ids] };
  }

  #bank(
    state: Consultancy,
    work: CrewWork,
    now: number,
    slots: number
  ): {
    next: Consultancy;
    value: number;
    sp: number;
    big: boolean;
    headline: string | null;
  } {
    const { closed, byWomen } = work;
    if (closed.length === 0) {
      return { next: state, value: 0, sp: 0, big: false, headline: null };
    }

    const banked = this.#bankWork(state, closed, now);
    const buffs = armBuffs(state, closed, now);

    const placed = economy.trainRuns(state)
      ? Math.min(banked.took.length, roomIn(state, slots))
      : 0;
    if (placed > 0) {
      const slots = banked.took.slice(0, placed);
      this.#sprint.update((held) => [...held, ...slots]);
    }
    const count = state.sprintCount + placed;

    const payout = banked.value;
    const velocitySp = banked.sp;
    for (const worth of banked.worths) this.#bill(worth);
    this.#cycleBilled += payout;

    return {
      next: {
        ...economy.billUnderTest(state, banked.tested),
        ...buffs,
        budget: state.budget + payout,
        sprintCount: count,
        ...economy.repaid(state, velocitySp),
        lifetimeClosed: state.lifetimeClosed + closed.length,
        lifetimeClosedByWomen: state.lifetimeClosedByWomen + byWomen,
        lifetimeClosedByCrew:
          state.lifetimeClosedByCrew +
          closed.filter((close) => crewed(close.by)).length,
        lifetimeBilled: state.lifetimeBilled + payout,
      },
      value: banked.value,
      sp: velocitySp,
      big: banked.big,
      headline: banked.headline,
    };
  }

  #bankWork(
    state: Consultancy,
    closed: Closed,
    now: number
  ): {
    value: number;
    sp: number;
    big: boolean;
    headline: string | null;
    took: SprintSlot[];
    worths: number[];
    tested: number;
  } {
    let value = 0;
    let tested = 0;
    let sp = 0;
    let big = false;
    let headline: string | null = null;
    const took: SprintSlot[] = [];
    const worths: number[] = [];

    const goldenMult = economy.goldenMultiplier(state);
    const conversion = economy.crewGoldenConversion(state);
    const aura = economy.managerAura(state);
    const reach = economy.managerReach(state);
    for (const { type, titleKey, by, x, y, golden, spBonus } of closed) {
      if (TICKET_TYPES[type].effect !== 'value') continue;
      const byCrew = crewed(by);
      const gilded =
        golden || (byCrew && conversion > 0 && this.#rand() < conversion);
      const watched = byCrew && overseen(this.#board, x, y, reach);
      const worth =
        economy.closeValue(state, type, now) *
        (gilded ? goldenMult : 1) *
        (watched ? aura : 1);
      const loud = gilded || type === 'incident';
      big ||= loud;
      if (loud) headline ??= titleKey;
      value += worth;
      if (economy.underTest(state, type)) tested += worth;
      sp +=
        economy.pickupStoryPoints(state, type, byCrew) +
        (economy.pickupsPaySp(state) ? spBonus : 0);
      took.push({ type, titleKey });
      worths.push(worth);
      if (by !== 'you') {
        this.#addCloseFloat(x, y, worth, loud ? titleKey : null);
      }
    }
    return { value, sp, big, headline, took, worths, tested };
  }

  #billWholeBoard(now: number, bonus = 1): number {
    const state = this.#state();
    const resting = this.#board.tickets.filter(
      (ticket) => TICKET_TYPES[ticket.type].effect === 'value' && !ticket.golden
    );
    if (resting.length === 0) return 0;

    const types = resting.map((ticket) => ticket.type);
    const payout = economy.boardPayout(state, types, now) * bonus;
    const tested =
      economy.boardPayout(
        state,
        types.filter((type) => economy.underTest(state, type)),
        now
      ) * bonus;
    for (const ticket of resting) {
      comeBack(this.#board, ticket);
      removeTicket(this.#board, ticket);
    }

    this.#bill(payout);
    const sp =
      bonus > 1
        ? types.reduce(
            (sum, type) => sum + economy.pickupStoryPoints(state, type, false),
            0
          ) * bonus
        : 0;
    this.#state.set({
      ...economy.billUnderTest(state, tested),
      ...economy.repaid(state, sp),
      budget: state.budget + payout,
      lifetimeClosed: state.lifetimeClosed + resting.length,
      lifetimeBilled: state.lifetimeBilled + payout,
    });
    return payout;
  }

  #payIncidents<
    T extends {
      next: Consultancy;
      value: number;
      sp: number;
      big: boolean;
    },
  >(banked: T, tickets: readonly BoardTicket[]): T {
    const state = banked.next;
    if (!economy.reviewsIncidents(state)) return banked;
    const cleared = tickets.filter(
      (ticket) => ticket.type === 'incident'
    ).length;
    if (cleared === 0) return banked;
    const payout = incidentPayout(state);
    const euros = payout.euros * cleared;
    const points = payout.sp * cleared;
    this.#bill(euros);
    return {
      ...banked,
      next: {
        ...state,
        ...economy.repaid(state, points),
        budget: state.budget + euros,
        lifetimeBilled: state.lifetimeBilled + euros,
      },
      value: banked.value + euros,
      sp: banked.sp + points,
      big: true,
    };
  }

  #probeClick(
    now: number,
    reached: number,
    taken: number,
    state: Consultancy
  ): void {
    if (!PROBING) return;
    console.log(
      `CB_CLICK\t${Math.round(now)}\t${reached}\t${taken}\t${state.tier}\t${Math.round(state.lifetimeBilled)}`
    );
  }

  #withinCan(
    state: Consultancy,
    ids: readonly number[]
  ): { allowed: readonly number[]; refused: readonly number[] } {
    let room = economy.sprintRoom(state, this.#sky());
    const allowed: number[] = [];
    const refused: number[] = [];
    for (const id of ids) {
      const ticket = this.#board.byId.get(id);
      if (!ticket) continue;
      if (TICKET_TYPES[ticket.type].effect !== 'value') {
        allowed.push(id);
        continue;
      }
      if (room <= 0) {
        refused.push(id);
        continue;
      }
      room -= 1;
      allowed.push(id);
    }
    return { allowed, refused };
  }

  harvest(ids: readonly number[]): Harvest {
    const state = this.#state();
    const now = state.lastTick;
    if (state.endedAt > 0) return NO_HARVEST;
    const { allowed, refused } = this.#withinCan(state, ids);
    const reached = reachedBy(this.#board, allowed);
    const { taken, closed } = reached;

    this.#probeClick(now, ids.length, taken.length, state);
    if (taken.length === 0) {
      return { ...NO_HARVEST, taken, refused };
    }

    const rares = reached.tickets.filter(
      (ticket) => TICKET_TYPES[ticket.type].handOnly
    ).length;
    if (rares > 0) this.#rares.update((count) => count + rares);
    let declined: HazardId | null = null;
    for (const ticket of reached.tickets) {
      if (TICKET_TYPES[ticket.type].effect === 'decline') {
        declined = this.#decline(ticket.id) ?? declined;
      }
      comeBack(this.#board, ticket);
      removeTicket(this.#board, ticket);
    }
    const banked = this.#bank(
      state,
      { closed, byWomen: 0 },
      now,
      economy.sprintSlots(state, this.#sky())
    );
    const { headline } = banked;
    const { next, value, sp, big } = this.#payIncidents(
      banked,
      reached.tickets
    );
    this.#state.set(next);
    if (!reached.quarterEnd)
      return { taken, refused, value, sp, big, headline, declined };
    const jackpot =
      next.escalated && next.escalationFiresAt > now && next.hotfixUntil > now;
    const billed = this.#billWholeBoard(now, jackpot ? JACKPOT_BONUS : 1);
    if (!jackpot || billed <= 0) {
      return { taken, refused, value, sp, big, headline, declined };
    }
    const after = this.#state();
    this.#state.set({ ...after, lifetimeJackpots: after.lifetimeJackpots + 1 });
    return {
      taken,
      refused,
      value: value + billed,
      sp,
      big: true,
      headline: 'board.jackpot',
      declined,
    };
  }

  takePayouts(): number {
    const paid = this.#billed;
    this.#billed = 0;
    return paid;
  }

  #bill(value: number): void {
    if (value > 0) this.#billed += value;
  }

  #addCloseFloat(
    x: number,
    y: number,
    worth: number,
    headline: string | null
  ): void {
    const big = headline !== null;
    const last = this.#closeFloats.at(-1);
    if (last && last.x === x && last.y === y) {
      this.#closeFloats[this.#closeFloats.length - 1] = {
        x,
        y,
        value: last.value + worth,
        big: last.big || big,
        headline: last.headline ?? headline,
      };
      return;
    }
    if (this.#closeFloats.length >= CLOSE_FLOAT_BUFFER) return;
    this.#closeFloats.push({ x, y, value: worth, big, headline });
  }

  takeCloseFloats(): readonly CloseFloat[] {
    const due = this.#closeFloats;
    this.#closeFloats = [];
    return due;
  }

  seniorPoolSeat(seat: number): number {
    return economy.seniorPoolSeat(this.#state(), seat);
  }

  unlockNextTier(): boolean {
    const id = purchase.nextAdrNodeId(this.#state());
    return id !== null && this.buySkill(id);
  }

  #approve(index: number): void {
    const tier = tierAt(index);
    if (!tier) return;
    this.#burst(index, tier.ticket);
    this.#markApproval(index, this.#state().runMs);
  }

  lineCost(line: PurchaseId): number {
    return economy.lineCost(this.#state(), line);
  }

  kitNext(): KitItem | null {
    return economy.kitNext(this.#state());
  }

  lineCap(line: PurchaseId): number {
    return economy.lineCap(this.#state(), line);
  }

  lineUnlocked(line: PurchaseId): boolean {
    return economy.lineUnlocked(this.#state(), line);
  }

  canBuyLine(line: PurchaseId): boolean {
    return economy.canBuyLine(this.#state(), line);
  }

  buyLine(line: PurchaseId): boolean {
    return this.#commit(purchase.buyLine(this.#state(), line));
  }

  spawnerCount(adr: number): number {
    return economy.spawnerCount(this.#state(), adr);
  }

  spawnerCost(adr: number): number {
    return economy.spawnerCost(this.#state(), adr);
  }

  spawnerUnlocked(adr: number): boolean {
    return economy.spawnerUnlocked(this.#state(), adr);
  }

  canBuySpawner(adr: number): boolean {
    return economy.canBuySpawner(this.#state(), adr);
  }

  buySpawner(adr: number): boolean {
    return this.#commit(purchase.buySpawner(this.#state(), adr));
  }

  incomeLevel(id: TicketTypeId): number {
    return economy.incomeLevel(this.#state(), id);
  }

  incomeStep(id: TicketTypeId): number {
    return economy.incomeStep(id);
  }

  incomeCost(id: TicketTypeId): number {
    return economy.incomeCost(this.#state(), id);
  }

  incomeUnlocked(id: TicketTypeId): boolean {
    return economy.incomeUnlocked(this.#state(), id);
  }

  canBuyIncome(id: TicketTypeId): boolean {
    return economy.canBuyIncome(this.#state(), id);
  }

  buyIncome(id: TicketTypeId): boolean {
    return this.#commit(purchase.buyIncome(this.#state(), id));
  }

  #commit(next: Consultancy | null): boolean {
    if (next === null) return false;
    this.#state.set(economy.recalibrate(next, underTestRate));
    return true;
  }

  #burst(tier: number, type: TicketTypeId): void {
    if (tier !== TIER_BURST.tier) return;
    for (let n = 0; n < TIER_BURST.count; n++)
      addTicket(this.#board, type, this.#rand);
  }

  skillRank(id: string): number {
    return economy.skillRank(this.#state(), id);
  }

  skillRankCost(id: string): number {
    return economy.skillRankCost(this.#state(), id);
  }

  skillAvailable(id: string): boolean {
    return purchase.skillAvailable(this.#state(), id);
  }

  readonly autoClosed = computed(() => economy.autoClosed(this.#state()));

  readonly skillAffordable = computed(() =>
    purchase.anySkillAffordable(this.#state())
  );

  skillLockReason(id: string): SkillLock | null {
    return purchase.skillLockReason(this.#state(), id);
  }

  buySkill(id: string): boolean {
    const before = this.#state().tier;
    if (!this.#commit(purchase.buySkill(this.#state(), id))) return false;
    if (id === FINAL_SKILL_ID) this.#voidVouchers();
    const tier = this.#state().tier;
    if (tier > before) this.#approve(tier);
    return true;
  }

  creditOffer(id: string): number | null {
    return purchase.creditOffer(this.#state(), id);
  }

  readonly spDebt = computed(() => this.#state().spDebt);

  approveOnCredit(id: string): boolean {
    const before = this.#state().tier;
    if (!this.#commit(purchase.approveOnCredit(this.#state(), id)))
      return false;
    if (id === FINAL_SKILL_ID) this.#voidVouchers();
    const tier = this.#state().tier;
    if (tier > before) this.#approve(tier);
    return true;
  }

  /** The closeout voids the hotfixes, escalations and quarter ends held on the board, and every meeting. */
  #voidVouchers(): void {
    for (const ticket of [...this.#board.rares]) {
      if (VOIDED_AT_SIGNOFF.has(ticket.type) || ticket.type === 'invite')
        removeTicket(this.#board, ticket);
    }
    this.#live = this.#live.filter((live) => live.kind !== 'invitation');
    this.#sky.set(this.#weatherNow());
  }

  buyOut(): void {
    const before = this.#state().tier;
    this.#state.set({ ...purchase.buyOut(this.#state()), assisted: true });
    for (let tier = before + 1; tier <= this.#state().tier; tier++)
      this.#approve(tier);
  }

  unlockSecret(): boolean {
    const state = this.#state();
    if (economy.skillRank(state, SECRET_SKILL_ID) > 0) return false;
    this.#state.set({
      ...state,
      skills: { ...state.skills, [SECRET_SKILL_ID]: 1 },
    });
    return true;
  }

  readonly assisted = computed(() => this.#state().assisted);

  /** Debug: accepts the engagement as it stands, which opens the post-mortem. */
  acceptNow(now: number): void {
    const state = this.#state();
    if (state.endedAt > 0) return;
    this.#state.set({ ...state, assisted: true, endedAt: now });
  }

  grant(budget: number, storyPoints: number): void {
    const state = this.#state();
    this.#state.set({
      ...state,
      assisted: true,
      budget: state.budget + budget,
      lifetimeBilled: state.lifetimeBilled + budget,
      storyPoints: state.storyPoints + storyPoints,
    });
  }

  reset(now: number): void {
    const { nextId, nextCrewId } = this.#board;
    this.#board = emptyBoard();
    this.#board.nextId = nextId;
    this.#board.nextCrewId = nextCrewId;
    this.#budget = new SpawnBudget();
    this.#calm(0);
    this.#burndown.set(EMPTY_BURNDOWN);
    this.#nextSampleAt = 0;
    this.#sampleEvery = BURNDOWN_SAMPLE_MS;
    this.#billed = 0;
    this.#awarded.set([]);
    this.#sprint.set([]);
    this.#outcome.set(null);
    this.#previous.set(null);
    this.#closeFloats = [];
    this.#review.set(0);
    this.#state.set(freshConsultancy(now, SAVE_VERSION));
  }

  hydrate(state: Consultancy, burndown?: Burndown): void {
    this.#state.set(state);
    this.#previous.set(state.lastOutcome);
    this.#calm(state.runMs);
    if (burndown) this.#resumeBurndown(burndown);
  }

  #resumeBurndown(chart: Burndown): void {
    const { samples } = chart;
    const last = samples.at(-1);
    const before = samples.at(-2);
    this.#sampleEvery =
      last && before ? last.at - before.at : BURNDOWN_SAMPLE_MS;
    this.#nextSampleAt = last ? last.at + this.#sampleEvery : 0;
    this.#burndown.set(chart);
  }

  #calm(runMs: number): void {
    this.#live = [];
    this.#sky.set(CALM);
    this.#cadence = freshCadence(runMs);
  }

  snapshot(): Consultancy {
    return this.#state();
  }
}

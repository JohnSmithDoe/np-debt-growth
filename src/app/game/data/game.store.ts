import { computed, Injectable, signal } from '@angular/core';

import type {
  Board,
  BoardTicket,
  Close,
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
import { freshConsultancy } from '../model/consultancy.model';
import {
  BURNDOWN_SAMPLES,
  BURNDOWN_SAMPLE_MS,
  CLOSE_FLOAT_BUFFER,
  WONT_FIX_BUFFER,
  FEED_LIMIT,
  FEED_LINE_GAP_MS,
  MAX_CATCHUP_MS,
  OFFLINE_FROM_MS,
  OFFLINE_MAX_MS,
  OFFLINE_RATE,
  SAVE_VERSION,
  TICK_MS,
} from '../model/game.consts';
import type { Burndown, BurndownSample } from '../model/burndown.model';
import { EMPTY_BURNDOWN } from '../model/burndown.model';
import type { FeedLine, NewFeedLine } from '../model/feed.model';
import type { Hazard, HazardId, Weather } from '../model/hazard.model';
import {
  CALM,
  HAZARDS,
  HAZARDS_ENABLED,
  HAZARD_BY_ID,
  hazardDurationMs,
} from '../model/hazard.model';
import type { RoundInvoice, SprintInvoice } from '../model/invoice.model';
import { EMPTY_INVOICE } from '../model/invoice.model';
import type { Lane, RoundOutcome } from '../model/round.model';
import { EMPTY_LANE } from '../model/round.model';
import type { SkillGate } from '../model/skill.model';
import type { SkillLock } from '../model/skill.model';
import {
  FINAL_SKILL_ID,
  SECRET_SKILL_ID,
  SKILL_BY_ID,
  SKILL_NODES,
  skillLabelKey,
  skillParent,
} from '../model/skill.model';
import { adrNodeId, tierAt } from '../model/tier.model';
import type { TicketTypeId } from '../model/ticket.model';
import { TICKET_TYPES } from '../model/ticket.model';
import type { PurchaseId } from '../model/balance/progression';
import { PIZZA_MS, TIER_BURST } from '../model/balance/flow';
import {
  ESCALATION_HOLD_MS,
  FACT_COUNTDOWN_MS,
  FACT_EVERY_MS,
  HOTFIX_MS,
  INVITATION_EVERY_MS,
  INVITATION_WINDOW_MS,
} from '../model/balance/weather';
import type { Closed, CrewWork } from '../util/board';
import {
  addTicket,
  comeBack,
  expireTickets,
  removeTicket,
  stepBoard,
} from '../util/board';
import { crewRules } from '../util/crew-rules';
import { fileAutomated, spawnInto } from '../util/supply';
import { newNotes } from '../util/feed';
import * as economy from '../util/economy';
import { SpawnBudget } from '../util/spawn-budget';

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
    switch (TICKET_TYPES[type].effect) {
      case 'sprintMultiplier':
        buffs = {
          ...buffs,
          escalated: true,
          escalationFiresAt: now + ESCALATION_HOLD_MS,
        };
        break;
      case 'hotfixBuff':
        buffs = { ...buffs, hotfixUntil: now + HOTFIX_MS };
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

interface Cadence {
  readonly every: number;
  readonly needs: number;
  due: number;
  seq: number;
}

function freshCadence(runMs: number): Record<HazardKindOf, Cadence> {
  return {
    invitation: {
      every: INVITATION_EVERY_MS,
      needs: INVITATION_WINDOW_MS,
      due: runMs + INVITATION_EVERY_MS,
      seq: 0,
    },
    fact: {
      every: FACT_EVERY_MS,
      needs: FACT_COUNTDOWN_MS,
      due: runMs + FACT_EVERY_MS,
      seq: 0,
    },
  };
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
      title: ticket.title,
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

function dearest(state: Consultancy, closed: Closed, now: number): Close {
  return closed.reduce((top, next) =>
    economy.ticketValue(state, next.type, now) >
    economy.ticketValue(state, top.type, now)
      ? next
      : top
  );
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
  #log = signal<readonly FeedLine[]>([]);
  #awarded = signal<readonly string[]>([]);
  #autoClosed = signal(0);
  #autoValue = signal(0);
  #sprint = signal<readonly SprintSlot[]>([]);
  #mix = computed(() => ticketMix(this.#sprint()));
  #closeFloats: CloseFloat[] = [];
  #wontFix: number[] = [];
  #wontFixStep = 0;
  #seq = 0;
  #roundFrom = signal(0);
  #roundSlots = signal<readonly SprintSlot[]>([]);
  #lastLineAt = 0;
  #seen = freshConsultancy(Date.now(), SAVE_VERSION);
  #billed = 0;
  #roundBoardBilled = signal(0);
  #roundSprintInvoice: SprintInvoice = EMPTY_INVOICE;
  #invoice = signal<RoundInvoice | null>(null);
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

  #filledAt = -1;
  #retainerBilled = 0;
  #cycleBilled = 0;
  #cycleRetainer = 0;
  #opened = { closed: 0, crewBilled: 0 };
  #roundSp = { velocity: 0, copilots: 0, awards: 0, skimmed: 0 };
  #outcome = signal<RoundOutcome | null>(null);
  #previous = signal<RoundOutcome | null>(null);
  #lastTarget = signal<number | null>(null);

  readonly lastRound = this.#outcome.asReadonly();
  readonly previousRound = this.#previous.asReadonly();
  readonly lastTarget = this.#lastTarget.asReadonly();

  retainerBilled(): number {
    return this.#retainerBilled;
  }

  #assisted = signal(false);

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
    economy.sprintPayout(this.#state(), this.#mix(), this.#state().lastTick)
  );
  readonly hauling = computed(() => this.#state().phase === 'hauling');
  readonly haulLeftMs = computed(() => this.#state().haulLeftMs);
  readonly canFull = computed(() => this.sprintCount() >= this.sprintSlots());
  readonly escalated = computed(() => this.#state().escalated);
  readonly escalationMultiplier = computed(() =>
    economy.escalationMultiplier(this.#state())
  );
  readonly crewWomen = computed(() => economy.crewWomen(this.#state()));

  womanEvery(crew: CrewKind): number {
    return economy.crewWomanEvery(this.#state(), crew);
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

  /** Story points banked per second so far — what an ADR is priced against. */
  readonly pointsPerSecond = computed(() => {
    const state = this.#state();
    if (state.runMs <= 0) return 0;
    return (state.storyPoints + this.#spentPoints()) / (state.runMs / 1000);
  });

  #spentPoints(): number {
    const state = this.#state();
    let spent = 0;
    for (const [id, rank] of Object.entries(state.skills)) {
      const node = SKILL_BY_ID.get(id);
      if (!node || node.currency === 'eur') continue;
      for (const level of node.levels.slice(0, rank)) {
        spent += level.cost;
      }
    }
    return spent;
  }

  seedRandom(rand: () => number): void {
    this.#rand = rand;
  }

  get board(): Board {
    return this.#board;
  }

  readonly log = this.#log.asReadonly();

  readonly roundLog = computed(() => {
    const from = this.#roundFrom();
    return this.#log()
      .filter((line) => line.seq >= from)
      .reverse();
  });

  readonly lifetimeClosed = computed(() => this.#state().lifetimeClosed);
  readonly lifetimeWontFix = computed(() => this.#state().lifetimeWontFix);
  readonly lifetimeBilled = computed(() => this.#state().lifetimeBilled);
  readonly lifetimeRounds = computed(() => this.#state().lifetimeRounds);
  readonly lifetimeSkimmed = computed(() => this.#state().lifetimeSkimmed);
  readonly lifetimeCrewBilled = computed(
    () => this.#state().lifetimeCrewBilled
  );
  readonly crewEarnedShare = computed(() => {
    const all = this.#state().lifetimeWorkBilled;
    return all === 0 ? 0 : this.#state().lifetimeCrewBilled / all;
  });
  readonly lifetimeClosedByWomen = computed(
    () => this.#state().lifetimeClosedByWomen
  );
  readonly promoted = computed(() => this.#state().promoted);
  readonly officePlates = computed(() => economy.officePlates(this.#state()));

  readonly awarded = this.#awarded.asReadonly();
  readonly awardCount = computed(() => this.#awarded().length);

  readonly autoClosed = this.#autoClosed.asReadonly();
  readonly autoValue = this.#autoValue.asReadonly();

  readonly sprint = this.#sprint.asReadonly();
  readonly lanes = computed(() => economy.lanesOf(this.#state()));
  /** Read each frame by the stage. `left` runs 1 → 0 as the pizza goes. */
  pizzaParty(): { x: number; y: number; radius: number; left: number } | null {
    const state = this.#state();
    const rush = economy.pizzaRush(state);
    if (!rush || !state.pizza) return null;
    const left = (state.pizza.until - state.lastTick) / PIZZA_MS;
    return { x: rush.x, y: rush.y, radius: rush.radius, left };
  }

  /** Read each frame by the stage, so not a signal: votes flip on the run clock. */
  votes(): readonly boolean[] {
    const state = this.#state();
    return Array.from({ length: economy.coachCount(state) }, (_, index) =>
      economy.voteLive(state, index, state.runMs)
    );
  }

  readonly laneCapacity = computed(() =>
    economy.laneCapacity(this.#state(), this.#sky())
  );

  readonly roundSprint = this.#roundSlots.asReadonly();
  readonly achievements = computed(() => this.#state().achievements);

  readonly hotfixUntil = computed(() => this.#state().hotfixUntil);
  readonly escalationFiresAt = computed(() => this.#state().escalationFiresAt);

  readonly phase = computed(() => this.#state().phase);
  readonly running = computed(() => this.#state().phase === 'collecting');
  readonly roundSeq = computed(() => this.#state().roundSeq);

  readonly ended = computed(() => this.#state().endedAt > 0);

  /** The run ends when the last upgrade on the tree is bought. */
  canEndRun(): boolean {
    const state = this.#state();
    return state.endedAt === 0 && economy.skillRank(state, FINAL_SKILL_ID) > 0;
  }

  endRun(now: number): boolean {
    if (!this.canEndRun()) return false;
    this.#state.set({ ...this.#state(), endedAt: now });
    return true;
  }

  advanceTo(now: number): void {
    const state = this.#state();
    const elapsed = now - state.lastTick;
    if (elapsed <= 0) {
      this.#state.set({ ...state, lastTick: now });
      return;
    }
    if (elapsed >= OFFLINE_FROM_MS) this.#accrueOffline(elapsed);

    let at = now - Math.min(elapsed, MAX_CATCHUP_MS);
    while (at < now) {
      const to = Math.min(at + TICK_MS, now);
      this.#advance((to - at) / 1000, to);
      at = to;
    }
    this.#state.set({ ...this.#state(), lastTick: now });
  }

  /**
   * The hours away, paid out in one step. Bounded by `OFFLINE_MAX_MS` and
   * discounted by `OFFLINE_RATE`: the floor runs without you, worse than
   * with you.
   */
  #accrueOffline(elapsed: number): void {
    const state = this.#state();
    const away = Math.min(elapsed, OFFLINE_MAX_MS) - MAX_CATCHUP_MS;
    if (away <= 0) return;

    const seconds = (away / 1000) * OFFLINE_RATE;
    const gross = economy.unattendedEuroPerSec(state) * seconds;
    const closed = Math.floor(economy.unattendedClosesPerSec(state) * seconds);
    const retainer = economy.retainerPerSec(state) * seconds;
    const payout = gross + retainer;
    if (payout <= 0) return;

    const points =
      economy.unattendedSpPerSec(state) * seconds +
      economy.copilotSpPerClose(state) * closed;

    this.#retainerBilled += retainer;
    this.#state.set({
      ...state,
      budget: state.budget + payout,
      storyPoints: state.storyPoints + points,
      lifetimeClosed: state.lifetimeClosed + closed,
      lifetimeBilled: state.lifetimeBilled + payout,
      lifetimeCrewBilled: state.lifetimeCrewBilled + gross + retainer,
      lifetimeWorkBilled: state.lifetimeWorkBilled + gross + retainer,
      runMs: state.runMs + away,
    });
    this.#write({
      kind: 'note',
      note: 'offline',
      count: Math.round(away / 60_000),
      money: payout,
    });
  }

  haulMs(): number {
    return economy.haulMs(this.#state());
  }

  roundLeftMs(): number {
    return this.#state().haulLeftMs;
  }

  /**
   * The can filled, so the truck takes it. Collection is dead until it
   * returns, and that wait is the whole cadence — nothing here is on a clock.
   * The money is already paid: it landed per ticket, at pickup.
   */
  #laneLeaves(now: number, cap: number): void {
    const state = this.#state();
    const outcome: RoundOutcome = {
      seq: state.roundSeq,
      billed: this.#cycleBilled,
      closed: state.lifetimeClosed - this.#opened.closed,
      closedByCrew: state.lifetimeCrewBilled - this.#opened.crewBilled,
      filled: cap,
      capacity: cap,
      filledAtMs: this.#filledAt,
      unbilled: this.#board.tickets.length,
      durationMs: state.roundMs,
      skimmed: this.#roundSp.skimmed,
      spVelocity: this.#roundSp.velocity,
      spCopilots: this.#roundSp.copilots,
      spAwards: this.#roundSp.awards,
    };

    this.#invoice.set({
      ...this.#roundSprintInvoice,
      skimmed: -this.#roundSp.skimmed,
      storyPoints: this.#roundSp.velocity,
      retainer: this.#cycleRetainer,
      board: this.#roundBoardBilled(),
      billed: outcome.billed,
    });

    this.#state.set({ ...this.#state(), lastOutcome: outcome, lastTick: now });
    const finished = this.#outcome();
    if (finished) this.#previous.set(finished);
    this.#outcome.set(outcome);
  }

  /** A lane's train is back: that lane is empty and takes work again. */
  #laneReturns(lane: number): void {
    const state = this.#state();
    this.#roundSlots.set(this.#sprint().filter((slot) => slot.lane === lane));
    this.#sprint.update((held) => held.filter((slot) => slot.lane !== lane));
    this.#filledAt = -1;
    this.#opened = {
      closed: state.lifetimeClosed,
      crewBilled: state.lifetimeCrewBilled,
    };
    this.#roundSp = { velocity: 0, copilots: 0, awards: 0, skimmed: 0 };
    this.#roundBoardBilled.set(0);
    this.#roundSprintInvoice = EMPTY_INVOICE;
    this.#roundFrom.set(this.#seq);
    this.#cycleBilled = 0;
    this.#cycleRetainer = 0;
    this.#state.set({
      ...state,
      roundMs: 0,
      roundSeq: state.roundSeq + 1,
      lifetimeRounds: state.lifetimeRounds + 1,
    });
  }

  /** Debug door: send every train that is home. */
  endRoundNow(now: number): void {
    const state = this.#state();
    if (state.phase !== 'collecting') return;
    const cap = economy.laneCapacity(state, this.#sky());
    const haul = economy.haulMs(state);
    const lanes = economy.lanesOf(state).map((lane) => {
      if (lane.releaseLeftMs > 0) return lane;
      this.#laneLeaves(now, cap);
      return { ...lane, releaseLeftMs: haul };
    });
    this.#settleLanes(lanes, now);
  }

  /** Debug door: bring every train back. */
  startRound(now: number): boolean {
    const state = this.#state();
    const lanes = economy.lanesOf(state);
    if (!lanes.some((lane) => lane.releaseLeftMs > 0)) return false;
    const home = lanes.map((lane, index) => {
      if (lane.releaseLeftMs <= 0) return lane;
      this.#laneReturns(index);
      return EMPTY_LANE;
    });
    this.#settleLanes(home, now);
    return true;
  }

  #stepBoard(state: Consultancy, dtMs: number): CrewWork {
    const weather = this.#sky();
    spawnInto(
      this.#board,
      this.#budget,
      state,
      dtMs / 1000,
      this.#rand,
      weather
    );
    // A full can stops the floor: nothing closes until the truck is away.
    const crews =
      economy.sprintRoom(state, weather) <= 0
        ? { closed: [], byWomen: 0 }
        : stepBoard(
            this.#board,
            crewRules(this.#board, state, weather),
            dtMs,
            this.#rand,
            economy.sprintRoom(state, weather)
          );
    const filed = fileAutomated(
      this.#board,
      state,
      dtMs,
      weather,
      crews.closed.length
    );
    this.#expire(dtMs);
    return { closed: [...crews.closed, ...filed], byWomen: crews.byWomen };
  }

  #expire(dtMs: number): void {
    const gone: BoardTicket[] = [];
    expireTickets(this.#board, dtMs, gone);
    this.#wontFixStep = gone.length;
    for (const ticket of gone) {
      if (this.#wontFix.length >= WONT_FIX_BUFFER) break;
      this.#wontFix.push(ticket.id);
    }
  }

  /** Ids closed as won't fix since the last call; the stage fades them. */
  takeWontFix(): readonly number[] {
    const due = this.#wontFix;
    this.#wontFix = [];
    return due;
  }

  #advance(seconds: number, now: number): void {
    const state = this.#state();
    const dtMs = seconds * 1000;
    const work = this.#stepBoard(state, dtMs);
    const banked = this.#bank(state, work, now);
    const retainer = economy.retainerPerSec(state) * seconds;
    this.#retainerBilled += retainer;
    this.#cycleRetainer += retainer;

    this.#state.set({
      ...banked.next,
      budget: banked.next.budget + retainer,
      lifetimeBilled: banked.next.lifetimeBilled + retainer,
      lifetimeCrewBilled: banked.next.lifetimeCrewBilled + retainer,
      lifetimeWorkBilled: banked.next.lifetimeWorkBilled + retainer,
      lifetimeWontFix: banked.next.lifetimeWontFix + this.#wontFixStep,
      lastTick: now,
      runMs: state.runMs + dtMs,
      roundMs: state.roundMs + dtMs,
    });
    this.#logCloses(state, work.closed, now);
    this.#stepWeather(state.runMs + dtMs, now);
    this.#sampleBurndown(this.#state().runMs);

    // Escalation is a live window now, not a bill: the x5 rides every close
    // inside the hold, then lapses.
    const armed = this.#state().escalationFiresAt;
    if (armed > 0 && now >= armed) {
      this.#state.set({
        ...this.#state(),
        escalated: false,
        escalationFiresAt: 0,
      });
    }

    this.#grantAwards();
    this.#note();

    this.#stepLanes(dtMs, now);
  }

  /**
   * Each lane runs its own train: a full lane ships and is locked until the
   * train is back, while the others keep taking. `hauling` is only the case
   * where every train is away at once.
   */
  #stepLanes(dtMs: number, now: number): void {
    const state = this.#state();
    const cap = economy.laneCapacity(state, this.#sky());
    const haul = economy.haulMs(state);
    const lanes = economy.lanesOf(state).map((lane, index) => {
      if (lane.releaseLeftMs > 0) {
        const left = lane.releaseLeftMs - dtMs;
        if (left > 0) return { ...lane, releaseLeftMs: left };
        this.#laneReturns(index);
        return EMPTY_LANE;
      }
      if (lane.count >= cap) {
        this.#laneLeaves(now, cap);
        return { ...lane, releaseLeftMs: haul };
      }
      return lane;
    });
    this.#settleLanes(lanes, now);
  }

  #settleLanes(lanes: readonly Lane[], now: number): void {
    const state = this.#state();
    const away = lanes.every((lane) => lane.releaseLeftMs > 0);
    this.#state.set({
      ...state,
      lanes,
      sprintCount: lanes.reduce((sum, lane) => sum + lane.count, 0),
      phase: away ? 'hauling' : 'collecting',
      haulLeftMs: away
        ? Math.min(...lanes.map((lane) => lane.releaseLeftMs))
        : 0,
      lastTick: now,
    });
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

  readonly invoice = this.#invoice.asReadonly();

  #stepWeather(runMs: number, now: number): void {
    const state = this.#state();

    for (let at = this.#live.length - 1; at >= 0; at -= 1) {
      const live = this.#live[at];
      if (!live) continue;
      if (!live.landed) {
        if (runMs < live.at) continue;
        this.#landHazard(live, runMs, now);
      }
      if (live.landed && runMs >= live.until) this.#live.splice(at, 1);
    }

    this.#placeDue('invitation', runMs, state);
    this.#placeDue('fact', runMs, state);
    this.#sky.set(this.#weatherNow());
  }

  #placeDue(kind: HazardKindOf, runMs: number, state: Consultancy): void {
    const cadence = this.#cadence[kind];
    const eligible = HAZARDS_ENABLED
      ? HAZARDS.filter((row) => row.kind === kind && state.tier >= row.fromTier)
      : [];

    if (eligible.length === 0) {
      cadence.due = runMs + cadence.every;
      return;
    }
    if (runMs < cadence.due) return;

    const row = eligible[cadence.seq % eligible.length];
    if (!row || !this.#place(row, runMs, state)) return;

    cadence.seq += 1;
    cadence.due = runMs + cadence.every;
  }

  #place(row: Hazard, runMs: number, state: Consultancy): boolean {
    if (row.kind === 'invitation' && state.levels.manager > 0) {
      this.#write({
        kind: 'note',
        note: 'hazard-auto-declined',
        hazard: row.id,
        count: 0,
      });
      return true;
    }

    if (row.kind === 'fact') {
      this.#live.push({
        id: row.id,
        kind: row.kind,
        at: runMs + FACT_COUNTDOWN_MS,
        until: 0,
        ticket: NO_TICKET,
        landed: false,
      });
      this.#write({
        kind: 'note',
        note: 'hazard-due',
        hazard: row.id,
        count: FACT_COUNTDOWN_MS / 1000,
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

    if (live.id === 'grooming') {
      this.#groom();
    } else {
      this.#write({
        kind: 'note',
        note: 'hazard-landed',
        hazard: live.id,
        count: Math.round((live.until - runMs) / 1000),
      });
    }
    this.#sky.set(this.#weatherNow());
    void now;
  }

  #groom(): void {
    const doomed = this.#board.tickets.filter(
      (ticket) => TICKET_TYPES[ticket.type].effect === 'value'
    );
    for (const ticket of doomed) removeTicket(this.#board, ticket);
    this.#write({
      kind: 'note',
      note: 'hazard-groomed',
      hazard: 'grooming',
      count: doomed.length,
    });
  }

  #decline(ticketId: number): void {
    const at = this.#live.findIndex((live) => live.ticket === ticketId);
    const live = this.#live[at];
    if (!live) return;
    this.#live.splice(at, 1);
    this.#write({
      kind: 'note',
      note: 'hazard-declined',
      hazard: live.id,
      count: Math.round(hazardDurationMs(live.id) / 1000),
    });
    this.#sky.set(this.#weatherNow());
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

  hazardNotice(): {
    readonly id: HazardId;
    readonly landed: boolean;
    readonly msLeft: number;
  } | null {
    const runMs = this.#state().runMs;
    let best: LiveHazard | null = null;
    for (const live of this.#live) {
      if (live.kind !== 'fact') continue;
      if (!best || (!live.landed && best.landed)) best = live;
    }
    if (!best) return null;
    return {
      id: best.id,
      landed: best.landed,
      msLeft: Math.max(0, (best.landed ? best.until : best.at) - runMs),
    };
  }

  #note(): void {
    const settled = this.#state();
    for (const note of newNotes(this.#seen, settled)) {
      const routine = note.note === 'hired';
      if (routine && !this.#admits(settled.lastTick)) continue;
      this.#write({ kind: 'note', ...note });
    }
    this.#seen = settled;
  }

  #grantAwards(): void {
    const state = this.#state();
    const due = economy.pendingAwards(state);
    if (due.length === 0) return;

    const lump = due.reduce((sum, award) => sum + award.sp, 0);
    this.#roundSp.awards += lump;
    this.#state.set({
      ...state,
      storyPoints: state.storyPoints + lump,
      achievements: [...state.achievements, ...due.map((award) => award.id)],
    });
    for (const award of due) this.#write({ kind: 'award', award: award.id });
    this.#awarded.update((ids) => [...ids, ...due.map((award) => award.id)]);
  }

  #bank(
    state: Consultancy,
    work: CrewWork,
    now: number
  ): { next: Consultancy; value: number; sp: number } {
    const { closed, byWomen } = work;
    if (closed.length === 0) return { next: state, value: 0, sp: 0 };

    const banked = this.#bankWork(state, closed, now);
    const buffs = armBuffs(state, closed, now);
    const copilotSp = economy.copilotSpPerClose(state) * closed.length;
    this.#roundSp.copilots += copilotSp;

    const fill = economy.fillLanes(state, banked.took.length, this.#sky());
    if (fill.placed.length > 0) {
      const slots = fill.placed.map((lane, at) => ({
        ...banked.took[at]!,
        lane,
      }));
      this.#sprint.update((held) => [...held, ...slots]);
    }
    const count = fill.lanes.reduce((sum, lane) => sum + lane.count, 0);
    if (
      this.#filledAt < 0 &&
      count >= economy.sprintSlots(state, this.#sky())
    ) {
      this.#filledAt = state.roundMs;
    }

    // Money and story points land here, per ticket, at pickup — the can only rate-limits.
    const payout = banked.value;
    const velocitySp = banked.sp;
    this.#billed += payout;
    this.#cycleBilled += payout;
    this.#roundSp.velocity += velocitySp;

    return {
      next: {
        ...state,
        ...buffs,
        budget: state.budget + payout,
        sprintCount: count,
        lanes: fill.lanes,
        laneCursor: fill.cursor,
        storyPoints: state.storyPoints + copilotSp + velocitySp,
        lifetimeClosed: state.lifetimeClosed + closed.length,
        lifetimeClosedByWomen: state.lifetimeClosedByWomen + byWomen,
        lifetimeBilled: state.lifetimeBilled + payout,
        lifetimeCrewBilled: state.lifetimeCrewBilled + banked.crew,
        lifetimeWorkBilled: state.lifetimeWorkBilled + banked.value,
      },
      value: banked.value,
      sp: velocitySp,
    };
  }

  #bankWork(
    state: Consultancy,
    closed: Closed,
    now: number
  ): {
    value: number;
    crew: number;
    sp: number;
    took: Omit<SprintSlot, 'lane'>[];
  } {
    let value = 0;
    let crew = 0;
    let sp = 0;
    let auto = 0;
    let autoCount = 0;
    const took: Omit<SprintSlot, 'lane'>[] = [];

    const goldenMult = economy.goldenMultiplier(state);
    const conversion = economy.crewGoldenConversion(state);
    for (const { type, title, by, x, y, golden, spBonus } of closed) {
      if (TICKET_TYPES[type].effect !== 'value') continue;
      const gilded =
        golden || (by !== 'you' && conversion > 0 && this.#rand() < conversion);
      const worth =
        economy.closeValue(state, type, now) * (gilded ? goldenMult : 1);
      value += worth;
      sp +=
        economy.pickupStoryPoints(state, worth, by !== 'you') +
        (economy.pickupsPaySp(state) ? spBonus : 0);
      took.push({ type, title });
      if (by === 'auto') {
        auto += worth;
        autoCount += 1;
      } else if (by !== 'you') {
        crew += worth;
        this.#addCloseFloat(x, y, worth);
      }
    }
    if (autoCount > 0) {
      this.#autoClosed.update((n) => n + autoCount);
      this.#autoValue.update((n) => n + auto);
    }
    return { value, crew, sp, took };
  }

  #billWholeBoard(now: number): number {
    const state = this.#state();
    const resting = this.#board.tickets.filter(
      (ticket) => TICKET_TYPES[ticket.type].effect === 'value'
    );
    if (resting.length === 0) return 0;

    const payout = economy.boardPayout(
      state,
      resting.map((ticket) => ticket.type),
      now
    );
    for (const ticket of resting) {
      comeBack(this.#board, ticket);
      removeTicket(this.#board, ticket);
    }

    this.#billed += payout;
    this.#roundBoardBilled.update((paid) => paid + payout);
    this.#state.set({
      ...state,
      budget: state.budget + payout,
      lifetimeClosed: state.lifetimeClosed + resting.length,
      lifetimeBilled: state.lifetimeBilled + payout,
    });
    return payout;
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

  /**
   * The can is a hard cap. Value tickets past the brim are left where they
   * are — the scene bounces them in place rather than taking them.
   */
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
    const { allowed, refused } = this.#withinCan(state, ids);
    const reached = reachedBy(this.#board, allowed);
    const { taken, closed } = reached;

    this.#probeClick(now, ids.length, taken.length, state);
    if (taken.length === 0) return { taken, refused, value: 0, sp: 0 };

    for (const ticket of reached.tickets) {
      if (TICKET_TYPES[ticket.type].effect === 'decline') {
        this.#decline(ticket.id);
      }
      comeBack(this.#board, ticket);
      removeTicket(this.#board, ticket);
    }
    const { next, value, sp } = this.#bank(state, { closed, byWomen: 0 }, now);
    this.#state.set(next);
    this.#lastLineAt = now;
    this.#logClose(state, dearest(state, closed, now), now);
    if (reached.quarterEnd) this.#billWholeBoard(now);
    return { taken, refused, value, sp };
  }

  takePayout(): number {
    const paid = this.#billed;
    this.#billed = 0;
    return paid;
  }

  #addCloseFloat(x: number, y: number, worth: number): void {
    const last = this.#closeFloats.at(-1);
    if (last && last.x === x && last.y === y) {
      this.#closeFloats[this.#closeFloats.length - 1] = {
        x,
        y,
        value: last.value + worth,
      };
      return;
    }
    if (this.#closeFloats.length >= CLOSE_FLOAT_BUFFER) return;
    this.#closeFloats.push({ x, y, value: worth });
  }

  takeCloseFloats(): readonly CloseFloat[] {
    const due = this.#closeFloats;
    this.#closeFloats = [];
    return due;
  }

  seniorPoolSeat(seat: number): number {
    return economy.seniorPoolSeat(this.#state(), seat);
  }

  freeDesks(): number {
    return economy.freeDesks(this.#state());
  }

  deskLimited(line: PurchaseId): boolean {
    return economy.deskLimited(this.#state(), line);
  }

  promotionCost(): number {
    return economy.promotionCost(this.#state());
  }

  promotionOffered(): boolean {
    return economy.promotionOffered(this.#state());
  }

  promote(): boolean {
    const state = this.#state();
    const cost = economy.promotionCost(state);
    if (!economy.promotionOffered(state) || state.budget < cost) return false;
    this.#state.set({
      ...state,
      budget: state.budget - cost,
      promoted: true,
      levels: {
        ...state.levels,
        junior: 0,
        senior: state.levels.senior + state.levels.junior,
      },
    });
    return true;
  }

  /** The rung is a tree node; this is the same purchase, reached from the rail. */
  unlockNextTier(): boolean {
    const next = tierAt(this.#state().tier + 1);
    return next !== undefined && this.buySkill(adrNodeId(next.index));
  }

  /** The rung landed: the board gets its first cards of the new type. */
  #approve(index: number): void {
    const tier = tierAt(index);
    if (!tier) return;
    this.#burst(index, tier.ticket);
    this.#markApproval(index, this.#state().runMs);
  }

  lineCost(line: PurchaseId): number {
    return economy.lineCost(this.#state(), line);
  }

  lineCap(line: PurchaseId): number {
    return economy.lineCap(line);
  }

  lineUnlocked(line: PurchaseId): boolean {
    return economy.lineUnlocked(this.#state(), line);
  }

  canBuyLine(line: PurchaseId): boolean {
    return economy.canBuyLine(this.#state(), line);
  }

  /** Another head on an already-open line, bought live from the rail. */
  buyLine(line: PurchaseId): boolean {
    const state = this.#state();
    if (!economy.canBuyLine(state, line)) return false;
    const cost = economy.lineCost(state, line);
    const levels = { ...state.levels, [line]: state.levels[line] + 1 };
    this.#state.set({
      ...state,
      budget: state.budget - cost,
      levels,
      roster:
        line === 'senior'
          ? [...state.roster, economy.nextSeniorHire(state)]
          : state.roster,
    });
    return true;
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

  /** Hire another developer: more of them, more debt, more to bill for. */
  buySpawner(adr: number): boolean {
    const state = this.#state();
    if (!economy.canBuySpawner(state, adr)) return false;
    const cost = economy.spawnerCost(state, adr);
    this.#state.set({
      ...state,
      budget: state.budget - cost,
      spawners: {
        ...state.spawners,
        [String(adr)]: economy.spawnerCount(state, adr) + 1,
      },
    });
    return true;
  }

  incomeLevel(id: TicketTypeId): number {
    return economy.incomeLevel(this.#state(), id);
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

  /** Bill more for one kind of work — the rail's third tab. */
  buyIncome(id: TicketTypeId): boolean {
    const state = this.#state();
    if (!economy.canBuyIncome(state, id)) return false;
    const cost = economy.incomeCost(state, id);
    this.#state.set({
      ...state,
      budget: state.budget - cost,
      income: {
        ...state.income,
        [id]: economy.incomeLevel(state, id) + 1,
      },
    });
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

  cheapestSpSquare(): number | null {
    let cheapest: number | null = null;
    for (const node of SKILL_NODES) {
      if ((node.currency ?? 'sp') !== 'sp') continue;
      if (!this.skillAvailable(node.id)) continue;
      const cost = economy.skillRankCost(this.#state(), node.id);
      if (cheapest === null || cost < cheapest) cheapest = cost;
    }
    return cheapest;
  }

  skillAvailable(id: string): boolean {
    const state = this.#state();
    const node = SKILL_BY_ID.get(id);
    if (!node || node.granted === true) return false;
    if (economy.skillRank(state, id) >= node.levels.length) return false;
    const parent = skillParent(id);
    if (parent !== null && economy.skillRank(state, parent) === 0) {
      return false;
    }
    if (this.#deskShort(id)) return false;
    return this.#gateReason(node.gate) === null;
  }

  #deskShort(id: string): boolean {
    const state = this.#state();
    const node = SKILL_BY_ID.get(id);
    const next = node?.levels[economy.skillRank(state, id)];
    return (next?.effects ?? []).some(
      (effect) =>
        effect.kind === 'line' && economy.deskLimited(state, effect.line)
    );
  }

  skillLockReason(id: string): SkillLock | null {
    const state = this.#state();
    const node = SKILL_BY_ID.get(id);
    if (!node) return { key: 'skill.lock.unknown' };
    if (economy.skillRank(state, id) >= node.levels.length) return null;

    const gate = this.#gateReason(node.gate);
    if (gate !== null) return gate;
    if (this.#deskShort(id)) return { key: 'skill.lock.needs-desk' };
    const parent = skillParent(id);
    if (parent !== null && economy.skillRank(state, parent) === 0) {
      return {
        key: 'skill.lock.blocked',
        params: { by: skillLabelKey(parent) },
        resolveParams: ['by'],
      };
    }
    const cost = economy.skillRankCost(state, id);
    const held =
      SKILL_BY_ID.get(id)?.currency === 'eur'
        ? state.budget
        : state.storyPoints;
    if (held < cost) return { key: 'skill.lock.underfunded' };
    return null;
  }

  #gateReason(gate: SkillGate | undefined): SkillLock | null {
    const state = this.#state();
    switch (gate) {
      case undefined:
        return null;
      case 'junior':
        return state.levels.junior === 0
          ? { key: 'skill.lock.needs-junior' }
          : null;
      case 'senior':
        return state.levels.senior === 0
          ? { key: 'skill.lock.needs-senior' }
          : null;
      case 'manager':
        return state.levels.manager === 0
          ? { key: 'skill.lock.needs-manager' }
          : null;
      default: {
        const needed = Number(gate.slice(4));
        return state.tier < needed
          ? { key: 'skill.lock.needs-adr', params: { adr: needed } }
          : null;
      }
    }
  }

  buySkill(id: string): boolean {
    const state = this.#state();
    const cost = economy.skillRankCost(state, id);
    if (!this.skillAvailable(id)) return false;

    const eur = SKILL_BY_ID.get(id)?.currency === 'eur';
    if (eur ? state.budget < cost : state.storyPoints < cost) return false;

    const node = SKILL_BY_ID.get(id);
    const bought = node?.levels[economy.skillRank(state, id)];
    const levels = { ...state.levels };
    let tier = state.tier;
    for (const effect of bought?.effects ?? []) {
      if (effect.kind === 'line') levels[effect.line] += 1;
      if (effect.kind === 'adr') tier = Math.max(tier, effect.adr);
    }

    const roster =
      levels.senior > state.levels.senior
        ? [...state.roster, economy.nextSeniorHire(state)]
        : state.roster;

    this.#state.set({
      ...state,
      budget: eur ? state.budget - cost : state.budget,
      storyPoints: eur ? state.storyPoints : state.storyPoints - cost,
      levels,
      roster,
      tier,
      skills: { ...state.skills, [id]: economy.skillRank(state, id) + 1 },
      endedAt: id === FINAL_SKILL_ID ? state.lastTick : state.endedAt,
    });
    if (tier > state.tier) this.#approve(tier);
    return true;
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

  readonly assisted = this.#assisted.asReadonly();

  grant(budget: number, storyPoints: number): void {
    this.#assisted.set(true);
    const state = this.#state();
    this.#state.set({
      ...state,
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
    this.#assisted.set(false);
    this.#billed = 0;
    this.#roundBoardBilled.set(0);
    this.#roundSprintInvoice = EMPTY_INVOICE;
    this.#invoice.set(null);
    this.#seq = 0;
    this.#roundFrom.set(0);
    this.#roundSlots.set([]);
    this.#lastLineAt = 0;
    this.#log.set([]);
    this.#awarded.set([]);
    this.#autoClosed.set(0);
    this.#autoValue.set(0);
    this.#sprint.set([]);
    this.#retainerBilled = 0;
    this.#filledAt = -1;
    this.#opened = { closed: 0, crewBilled: 0 };
    this.#outcome.set(null);
    this.#previous.set(null);
    this.#lastTarget.set(null);
    this.#closeFloats = [];
    this.#state.set(freshConsultancy(now, SAVE_VERSION));
    this.#seen = this.#state();
  }

  #write(line: NewFeedLine): void {
    const entry = { ...line, seq: this.#seq++ };
    this.#log.update((feed) => [entry, ...feed].slice(0, FEED_LIMIT));
  }

  #admits(now: number): boolean {
    if (now - this.#lastLineAt < FEED_LINE_GAP_MS) return false;
    this.#lastLineAt = now;
    return true;
  }

  #logCloses(state: Consultancy, closed: Closed, now: number): void {
    if (closed.length === 0 || !this.#admits(now)) return;
    this.#logClose(state, dearest(state, closed, now), now);
  }

  #logClose(state: Consultancy, close: Close, now: number): void {
    this.#write({
      kind: 'close',
      close,
      title: close.title,
      value: economy.closeValue(state, close.type, now),
    });
  }

  hydrate(state: Consultancy): void {
    this.#state.set(state);
    this.#seen = state;
    this.#previous.set(state.lastOutcome);
    this.#calm(state.runMs);
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

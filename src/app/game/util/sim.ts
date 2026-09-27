/*
 * Not modelled: quarter bills, pizza, prod incidents, weather; each moves a
 * real board's euros by 10 % at most.
 */
import type { Consultancy } from '../model/consultancy.model';
import type { CrewKind } from '../model/crew.model';
import type { TicketTypeId } from '../model/ticket.model';
import { TICKET_TYPES, TICKET_TYPE_IDS } from '../model/ticket.model';
import {
  HEAP_COLS,
  HEAP_FIELD_ROWS,
  HEAP_SPAWN_ROWS,
} from '../model/board.model';
import {
  BOARD_CAPACITY,
  CARD_HIT,
  LOGICAL_BOARD,
  TICKET_SLOT,
} from '../model/geometry';
import {
  GOLDEN_LIFE_MS,
  ticketLifeMs,
  VOTE_CYCLE_MS,
  VOTE_ON_MS,
  WONT_FIX_FADE_MS,
} from '../model/balance/flow';
import { HOTFIX_MS, HOTFIX_MULTIPLIER } from '../model/balance/weather';
import * as economy from './economy';
import { heldBack } from './first-act';

export interface SimPolicy {
  readonly clicksPerSec: number;
}

export interface Flow {
  readonly euroPerSec: number;
  readonly spPerSec: number;
  readonly supplyPerSec: number;
  readonly handPerSec: number;
  readonly crewPerSec: number;
  readonly handEuroPerSec: number;
  readonly crewEuroPerSec: number;
  readonly wontFixPerSec: number;
}

interface Stream {
  readonly type: TicketTypeId;
  readonly golden: boolean;
  readonly reborn: boolean;
  readonly worth: number;
  left: number;
  hand: number;
  crew: number;
  auto: number;
}

const BOARD_AREA = LOGICAL_BOARD.width * LOGICAL_BOARD.height;
const DENSITY_PASSES = 8;
const OVERSEER_FOCUS = 1;
const FIELD_CELLS = HEAP_COLS * HEAP_FIELD_ROWS;
const SPAWN_CELLS = HEAP_COLS * HEAP_SPAWN_ROWS;

const CLOSERS: readonly CrewKind[] = ['seniors', 'juniors'];

function streams(state: Consultancy): Stream[] {
  const interest = economy.debtInterest(state);
  const gold = economy.goldenChance(state);
  const goldMult = economy.goldenMultiplier(state);
  const supply = new Map<TicketTypeId, number>();

  for (const id of TICKET_TYPE_IDS) {
    if (TICKET_TYPES[id].effect !== 'value') continue;
    if (heldBack(id, state.runMs)) continue;
    const rate = economy.spawnRate(state, id);
    if (rate <= 0) continue;
    const dearer = interest > 0 ? economy.interestTarget(state, id) : null;
    const moved = dearer ? rate * interest : 0;
    supply.set(id, (supply.get(id) ?? 0) + rate - moved);
    if (dearer) supply.set(dearer, (supply.get(dearer) ?? 0) + moved);
  }

  const out: Stream[] = [];
  for (const [type, rate] of supply) {
    const value = economy.ticketValue(state, type);
    const stream = { type, hand: 0, crew: 0, auto: 0 };
    out.push({
      ...stream,
      golden: false,
      reborn: false,
      worth: value,
      left: rate * (1 - gold),
    });
    if (gold > 0) {
      out.push({
        ...stream,
        golden: true,
        reborn: false,
        worth: value * goldMult,
        left: rate * gold,
      });
    }
    if (TICKET_TYPES[type].respawns) {
      out.push({
        ...stream,
        golden: false,
        reborn: true,
        worth: value,
        left: 0,
      });
    }
  }
  return out.sort((a, b) => b.worth - a.worth);
}

const MEAN_WALK = ((): number => {
  const cols = 30;
  const rows = 14;
  const points: [number, number][] = [];
  for (let c = 0; c < cols; c += 1) {
    for (let r = 0; r < rows; r += 1) {
      points.push([
        ((c + 0.5) * LOGICAL_BOARD.width) / cols,
        ((r + 0.5) * LOGICAL_BOARD.height) / rows,
      ]);
    }
  }
  let sum = 0;
  for (const [ax, ay] of points) {
    for (const [bx, by] of points) sum += Math.hypot(ax - bx, ay - by);
  }
  return sum / (points.length * points.length);
})();

const reachMemo = new Map<number, number>();

function cellsInReach(radius: number): number {
  const known = reachMemo.get(radius);
  if (known !== undefined) return known;
  const { width, height } = TICKET_SLOT;
  const cols = Math.floor(radius / width);
  const rows = Math.floor(radius / height);
  let sum = 0;
  for (let col = 0; col < HEAP_COLS; col += 1) {
    for (let row = 0; row < HEAP_FIELD_ROWS; row += 1) {
      for (let dc = -cols; dc <= cols; dc += 1) {
        const c = col + dc;
        if (c < 0 || c >= HEAP_COLS) continue;
        for (let dr = -rows; dr <= rows; dr += 1) {
          const r = row + dr;
          if ((dc === 0 && dr === 0) || r < 0 || r >= HEAP_FIELD_ROWS) continue;
          if ((dc * width) ** 2 + (dr * height) ** 2 <= radius * radius)
            sum += 1;
        }
      }
    }
  }
  const mean = sum / FIELD_CELLS;
  reachMemo.set(radius, mean);
  return mean;
}

const touchMemo = new Map<number, number>();

function cellsTouched(radius: number): number {
  const known = touchMemo.get(radius);
  if (known !== undefined) return known;
  const { width, height } = TICKET_SLOT;
  const cols = Math.ceil((radius + CARD_HIT.halfWidth) / width);
  const rows = Math.ceil((radius + CARD_HIT.halfHeight) / height);
  let sum = 0;
  for (let col = 0; col < HEAP_COLS; col += 1) {
    for (let row = 0; row < HEAP_FIELD_ROWS; row += 1) {
      for (let dc = -cols; dc <= cols; dc += 1) {
        const c = col + dc;
        if (c < 0 || c >= HEAP_COLS) continue;
        for (let dr = -rows; dr <= rows; dr += 1) {
          const r = row + dr;
          if ((dc === 0 && dr === 0) || r < 0 || r >= HEAP_FIELD_ROWS) continue;
          const dx = Math.max(0, Math.abs(dc * width) - CARD_HIT.halfWidth);
          const dy = Math.max(0, Math.abs(dr * height) - CARD_HIT.halfHeight);
          if (dx * dx + dy * dy <= radius * radius) sum += 1;
        }
      }
    }
  }
  const mean = sum / FIELD_CELLS;
  touchMemo.set(radius, mean);
  return mean;
}

function spreadOver(density: number): number {
  return Math.min(FIELD_CELLS, Math.max(SPAWN_CELLS, density));
}

const CLAIM_SAMPLES = 4;

function crewCapacity(
  state: Consultancy,
  crew: CrewKind,
  density: number,
  share: number
): number {
  const ceiling =
    crew === 'juniors'
      ? economy.juniorCeilingPerSec(state)
      : economy.seniorCeilingPerSec(state);
  const claimable = density * share;
  if (ceiling <= 0 || claimable < 1) return 0;

  const hire = crew === 'seniors' ? economy.hireAt(state, 0) : undefined;
  const pick = economy.crewPick(state, crew, hire);
  const samples = Math.max(1, CLAIM_SAMPLES * share);
  const walk =
    pick === 'nearest' ? 0.5 * Math.sqrt(BOARD_AREA / samples) : MEAN_WALK;
  const closeMs = economy.crewCloseMs(state, crew);
  const walkMs = (walk / economy.crewWalkSpeed(state, crew)) * 1000;

  const batch = economy.crewBatch(state, crew);
  const sweep = economy.crewSweepRadius(state, crew);
  const near = (claimable * cellsInReach(sweep)) / spreadOver(density);
  const filled = Math.min(batch, 1 + near) / batch;

  return (ceiling * filled * closeMs) / (closeMs + walkMs);
}

function overseenShare(state: Consultancy): number {
  const managers = economy.crewSize(state, 'managers');
  if (managers === 0) return 0;
  const reach = economy.managerReach(state);
  return Math.min(
    1,
    (OVERSEER_FOCUS * managers * Math.PI * reach * reach) / BOARD_AREA
  );
}

function takeMixed(
  pool: readonly Stream[],
  amount: number,
  into: 'hand' | 'crew'
): void {
  const left = pool.reduce((sum, s) => sum + s.left, 0);
  if (left <= 0 || amount <= 0) return;
  const share = Math.min(1, amount / left);
  for (const s of pool) {
    const take = s.left * share;
    s[into] += take;
    s.left -= take;
  }
}

function collect(
  state: Consultancy,
  policy: SimPolicy,
  all: readonly Stream[],
  density: number,
  reach: number
): void {
  const crewGold = economy.crewTakesGolden(state);
  for (const crew of CLOSERS) {
    const claims = economy.crewClaims(state, crew);
    const pool = all.filter((s) => claims(s.type) && (!s.golden || crewGold));
    const share =
      pool.reduce((sum, s) => sum + s.left, 0) /
      Math.max(
        1e-9,
        all.reduce((sum, s) => sum + s.left, 0)
      );
    takeMixed(pool, crewCapacity(state, crew, density, share), 'crew');
  }

  let aimed = policy.clicksPerSec;
  for (const s of all) {
    if (aimed <= 0) break;
    const take = Math.min(aimed, s.left);
    s.hand += take;
    s.left -= take;
    aimed -= take;
  }
  const radius = economy.clickRadius(state);
  const onField = Math.min(density, FIELD_CELLS);
  const others =
    (Math.max(0, onField - 1) * cellsTouched(radius)) /
    (spreadOver(density) - 1);
  takeMixed(all, policy.clicksPerSec * others, 'hand');

  const auto = economy.autoClosed(state);
  for (const s of all) {
    if (!auto.has(s.type)) continue;
    const lived = s.golden ? s.left : s.left * reach;
    s.auto += lived;
    s.left -= lived;
  }
}

interface Occupancy {
  readonly density: number;
  readonly reach: number;
}

function occupancy(
  all: readonly Stream[],
  arrivals: readonly number[],
  lifeMs: number
): Occupancy {
  const fadeSec = WONT_FIX_FADE_MS / 1000;
  let held = 0;
  let fading = 0;
  let unclaimed = 0;
  all.forEach((s, at) => {
    const life = (s.golden ? GOLDEN_LIFE_MS : lifeMs) / 1000;
    held += life * (arrivals[at]! - (s.hand + s.crew) / 2);
    fading += fadeSec * s.left;
    if (!s.golden) unclaimed += life * (s.left + s.auto);
  });
  const over = Math.max(0, held - BOARD_CAPACITY);
  return {
    density: Math.min(BOARD_CAPACITY, held + fading),
    reach: unclaimed > 0 ? Math.max(0, 1 - over / unclaimed) : 1,
  };
}

function windowOpen(
  state: Consultancy,
  id: TicketTypeId,
  windowMs: number
): number {
  if (heldBack(id, state.runMs)) return 0;
  return 1 - Math.exp((-economy.spawnRate(state, id) * windowMs) / 1000);
}

function buffs(state: Consultancy): number {
  const escalated = windowOpen(
    state,
    'escalation',
    economy.escalationHoldMs(state)
  );
  const hotfixed = windowOpen(state, 'hotfix', HOTFIX_MS);
  return (
    (1 + escalated * (economy.escalationMultiplier(state) - 1)) *
    (1 + hotfixed * (HOTFIX_MULTIPLIER - 1))
  );
}

function comebacks(all: readonly Stream[], arrivals: number[]): void {
  all.forEach((s, at) => {
    if (!s.reborn) return;
    arrivals[at] = all.reduce(
      (sum, o) =>
        o.type === s.type && !o.reborn ? sum + o.hand + o.crew : sum,
      0
    );
  });
}

export function flow(state: Consultancy, policy: SimPolicy): Flow {
  const all = streams(state);
  const arrivals = all.map((s) => s.left);
  const lifeMs = ticketLifeMs(state.tier);
  const lifeSec = lifeMs / 1000;

  let board: Occupancy = {
    density: Math.min(
      BOARD_CAPACITY,
      arrivals.reduce((sum, rate) => sum + rate, 0) * lifeSec
    ),
    reach: 1,
  };
  for (let pass = 0; pass < DENSITY_PASSES; pass += 1) {
    all.forEach((s, at) => {
      s.left = arrivals[at]!;
      s.hand = 0;
      s.crew = 0;
      s.auto = 0;
    });
    collect(state, policy, all, board.density, board.reach);
    board = occupancy(all, arrivals, lifeMs);
    comebacks(all, arrivals);
  }
  const supplyPerSec = all.reduce(
    (sum, s) => sum + s.left + s.hand + s.crew + s.auto,
    0
  );
  const density = board.density;

  const collected = all.reduce((sum, s) => sum + s.hand + s.crew + s.auto, 0);
  const lanes = economy.ceilingPerSec(state);
  const scale = lanes > 0 ? 1 / (1 + collected / lanes) : 0;

  const conversion = economy.crewGoldenConversion(state);
  const aura = 1 + (economy.managerAura(state) - 1) * overseenShare(state);
  const goldMult = economy.goldenMultiplier(state);
  const buff = buffs(state);
  const pays = economy.pickupsPaySp(state);
  const votes = pays
    ? (economy.coachCount(state) *
        Math.min(1, SPAWN_CELLS / Math.max(1, density)) *
        VOTE_ON_MS *
        economy.voteBonusPerCrossing(state)) /
      VOTE_CYCLE_MS
    : 0;

  let handEuro = 0;
  let crewEuro = 0;
  let sp = 0;
  let hand = 0;
  let crew = 0;
  for (const s of all) {
    const byHand = s.hand * scale;
    const byCrew = s.crew * scale;
    const byAuto = s.auto * scale;
    const crewWorth = s.golden
      ? s.worth
      : s.worth * (1 - conversion) + s.worth * goldMult * conversion;
    handEuro += byHand * s.worth * buff;
    crewEuro += (byCrew * crewWorth * aura + byAuto * s.worth) * buff;
    hand += byHand;
    crew += byCrew + byAuto;
    sp +=
      (byHand + byAuto) * economy.pickupStoryPoints(state, s.type, false) +
      byCrew * economy.pickupStoryPoints(state, s.type, true) +
      (s.golden || s.reborn ? 0 : (byHand + byCrew + byAuto) * votes);
  }

  return {
    euroPerSec: handEuro + crewEuro,
    spPerSec: sp,
    supplyPerSec,
    handPerSec: hand,
    crewPerSec: crew,
    handEuroPerSec: handEuro,
    crewEuroPerSec: crewEuro,
    wontFixPerSec: Math.max(0, supplyPerSec - hand - crew),
  };
}

import type { Consultancy } from '../model/consultancy.model';
import type { CrewKind } from '../model/crew.model';
import type { TicketTypeId } from '../model/ticket.model';
import { TICKET_TYPES, TICKET_TYPE_IDS } from '../model/ticket.model';
import { HEAP_COLS, HEAP_FIELD_ROWS } from '../model/board.model';
import { BOARD_CAPACITY, LOGICAL_BOARD } from '../model/geometry';
import {
  TICKET_LIFE_MS,
  VOTE_CYCLE_MS,
  VOTE_ON_MS,
} from '../model/balance/flow';
import * as economy from './economy';
import { heldBack } from './first-act';

/**
 * The economy without a board: what a state earns per second, as arithmetic.
 *
 *   collected = min(supply, what the hand and the crew reach, what the lanes take)
 *   €/s       = Σ collected × ticketValue (× goldenMultiplier on gold)
 *   SP/s      = Σ collected × pickupStoryPoints + expected planning-poker votes
 *
 * Not counted, so the sim is a floor: hotfix, escalation, quarter bills, pizza,
 * manager relabels.
 */

export interface SimPolicy {
  /** Sweeps the player makes a second; each takes everything in the radius. */
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
  /** Arrivals nobody reached, closed as won't fix. */
  readonly wontFixPerSec: number;
}

interface Stream {
  readonly type: TicketTypeId;
  readonly golden: boolean;
  readonly worth: number;
  left: number;
  hand: number;
  crew: number;
}

const BOARD_AREA = LOGICAL_BOARD.width * LOGICAL_BOARD.height;
const DENSITY_PASSES = 8;
/** Cards past this stack in the overflow rows above the field, out of the sweep. */
const FIELD_CELLS = HEAP_COLS * HEAP_FIELD_ROWS;

/** Closer kinds in claim order; managers relabel rather than close. */
const CLOSERS: readonly CrewKind[] = ['seniors', 'juniors'];

function streams(state: Consultancy): Stream[] {
  const interest = economy.debtInterest(state);
  const gold = economy.goldenChance(state);
  const goldMult = economy.goldenMultiplier(state);
  const supply = new Map<TicketTypeId, number>();

  for (const id of TICKET_TYPE_IDS) {
    if (TICKET_TYPES[id].effect !== 'value') continue;
    if (heldBack(id, state.runMs, state.tier)) continue;
    const rate = economy.closeRate(state, id);
    if (rate <= 0) continue;
    const dearer = interest > 0 ? economy.interestTarget(state, id) : null;
    const moved = dearer ? rate * interest : 0;
    supply.set(id, (supply.get(id) ?? 0) + rate - moved);
    if (dearer) supply.set(dearer, (supply.get(dearer) ?? 0) + moved);
  }

  const out: Stream[] = [];
  for (const [type, rate] of supply) {
    const value = economy.ticketValue(state, type);
    out.push({
      type,
      golden: false,
      worth: value,
      left: rate * (1 - gold),
      hand: 0,
      crew: 0,
    });
    if (gold > 0) {
      out.push({
        type,
        golden: true,
        worth: value * goldMult,
        left: rate * gold,
        hand: 0,
        crew: 0,
      });
    }
  }
  return out.sort((a, b) => b.worth - a.worth);
}

/** Mean distance between two random points on the board, sampled once. */
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

/** How many cards a claim samples before picking one (`board.ts`). */
const CLAIM_SAMPLES = 4;

/**
 * Closes a second one crew kind manages. A worker files on arrival and then
 * recovers for its close time, so the walk to the next card is added to every
 * cycle. Claims sample a few cards: `nearest` walks to the closest of them,
 * every other pick walks a random distance.
 */
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
  const near = (claimable * Math.PI * sweep * sweep) / BOARD_AREA;
  const filled = Math.min(batch, 1 + near) / batch;

  return (ceiling * filled * closeMs) / (closeMs + walkMs);
}

/** Takes up to `amount` from `pool` in proportion to what each stream has left. */
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
  density: number
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

  // Each sweep is aimed at the best card on the field and takes whatever else
  // lies in the radius with it.
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
  const perSweep = (onField * Math.PI * radius * radius) / BOARD_AREA;
  takeMixed(all, policy.clicksPerSec * Math.max(0, perSweep - 1), 'hand');
}

export function flow(state: Consultancy, policy: SimPolicy): Flow {
  const all = streams(state);
  const supplyPerSec = all.reduce((sum, s) => sum + s.left, 0);
  const arrivals = all.map((s) => s.left);
  const lifeSec = TICKET_LIFE_MS / 1000;

  // Cards on the field depend on how fast they are collected, and collection
  // on how many there are: settle it by iterating. A full board pushes its
  // oldest card out for each arrival, so it holds at the cap.
  let density = Math.min(BOARD_CAPACITY, supplyPerSec * lifeSec);
  for (let pass = 0; pass < DENSITY_PASSES; pass += 1) {
    all.forEach((s, at) => {
      s.left = arrivals[at]!;
      s.hand = 0;
      s.crew = 0;
    });
    collect(state, policy, all, density);
    const taken = all.reduce((sum, s) => sum + s.hand + s.crew, 0);
    density = Math.min(
      BOARD_CAPACITY,
      Math.max(0, supplyPerSec - taken / 2) * lifeSec
    );
  }

  const collected = all.reduce((sum, s) => sum + s.hand + s.crew, 0);
  const lanes = economy.ceilingPerSec(state);
  const scale = collected > lanes ? lanes / collected : 1;

  const conversion = economy.crewGoldenConversion(state);
  const goldMult = economy.goldenMultiplier(state);
  const pays = economy.pickupsPaySp(state);
  const votes = pays
    ? (economy.coachCount(state) *
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
    const crewWorth = s.golden
      ? s.worth
      : s.worth * (1 - conversion) + s.worth * goldMult * conversion;
    handEuro += byHand * s.worth;
    crewEuro += byCrew * crewWorth;
    hand += byHand;
    crew += byCrew;
    sp +=
      byHand * economy.pickupStoryPoints(state, s.type, false) +
      byCrew * economy.pickupStoryPoints(state, s.type, true) +
      (s.golden ? 0 : (byHand + byCrew) * votes);
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

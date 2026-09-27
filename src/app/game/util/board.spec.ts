import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import {
  cellY,
  emptyBoard,
  HEAP_COLS,
  HEAP_ROWS,
  HEAP_SPAWN_ROWS,
  NO_TICKET,
} from '../model/board.model';
import type { Board, BoardTicket, Close } from '../model/board.model';
import type { Consultancy } from '../model/consultancy.model';
import { freshConsultancy } from '../model/consultancy.model';
import { SAVE_VERSION } from '../model/game.consts';
import { CALM } from '../model/hazard.model';
import type { PurchaseId } from '../model/balance/progression';
import { CREW_STATS } from '../model/balance/crew';
import {
  GOLDEN_LIFE_MS,
  TICKET_LIFE_MS,
  WONT_FIX_FADE_MS,
} from '../model/balance/flow';
import { PURCHASE_IDS } from '../model/balance/progression';
import { SPRINT_SLOTS_BASE } from '../model/balance/round';
import { BOARD_CAPACITY, CARD_HIT, LOGICAL_BOARD } from '../model/geometry';

const WALK_MS = (LOGICAL_BOARD.width / CREW_STATS.juniors.walkSpeed) * 1000 * 2;
const SENIOR_WALK_MS =
  (LOGICAL_BOARD.width / CREW_STATS.seniors.walkSpeed) * 1000 * 2;
const WALK_AND_CLOSE_LIMIT_MS = 120_000;
import type { TicketTypeId } from '../model/ticket.model';
import {
  addTicket,
  expireTickets,
  fadeOf,
  pickTouching,
  pickWithin,
  overseen,
  removeTicket,
  workCrews as stepCrews,
} from './board';
import { crewRules } from './crew-rules';

import {
  crewCeilingPerSec,
  juniorCloseMs,
  managerCloseMs,
  seniorBatch,
  seniorCloseMs,
  sprintSlots,
} from './economy';

function workCrews(
  board: Parameters<typeof stepCrews>[0],
  state: Consultancy,
  dtMs: number,
  rand?: () => number,
  weather = CALM
): ReturnType<typeof stepCrews> {
  return stepCrews(board, crewRules(board, state, weather), dtMs, rand);
}

const STEP_MS = 100;
const BARE = Object.fromEntries(PURCHASE_IDS.map((id) => [id, 0])) as Record<
  PurchaseId,
  number
>;

function stateWith(overrides: Partial<Consultancy> = {}): Consultancy {
  return { ...freshConsultancy(0, SAVE_VERSION), levels: BARE, ...overrides };
}

function cycling(): () => number {
  let n = 0;
  return () => (n = (n * 9301 + 49297) % 233280) / 233280;
}

function fill(
  board: Board,
  type: TicketTypeId,
  count: number,
  rand: () => number
): void {
  for (let n = 0; n < count; n++) addTicket(board, type, rand);
}

function run(
  board: Board,
  start: Consultancy,
  ms: number,
  rand = cycling()
): string[] {
  let state = start;
  const closed: string[] = [];
  for (let at = 0; at < ms; at += STEP_MS) {
    const took = workCrews(board, state, STEP_MS, rand).closed;
    closed.push(...took.map((close) => close.type));
    state = { ...state, sprintCount: state.sprintCount + took.length };
  }
  return closed;
}

function firstClose(
  board: Board,
  state: Consultancy,
  rand: () => number
): readonly string[] {
  for (let at = 0; at < WALK_AND_CLOSE_LIMIT_MS; at += STEP_MS) {
    const took = workCrews(board, state, STEP_MS, rand).closed;
    if (took.length > 0) return took.map((close) => close.type);
  }
  return [];
}

describe('a junior closing a ticket', () => {
  it('files on arrival, then recovers before the next one', () => {
    const board = emptyBoard();
    const state = stateWith({ levels: { ...BARE, junior: 1 } });
    for (let n = 0; n < 5; n++) addTicket(board, 'lint');

    const until = (want: number): number => {
      let elapsed = 0;
      let seen = 0;
      while (seen < want && elapsed < 4 * (juniorCloseMs(state) + WALK_MS)) {
        seen += run(board, state, STEP_MS).length;
        elapsed += STEP_MS;
      }
      return elapsed;
    };

    // The card goes the moment it is reached, and the close time is spent
    // recovering afterwards rather than standing over it first.
    const first = until(1);
    expect(board.tickets.length).toBe(4);
    expect(board.juniors[0]!.phase).toBe('closing');
    expect(board.juniors[0]!.leftMs).toBeGreaterThan(
      juniorCloseMs(state) - 2 * STEP_MS
    );

    // The sustained pace is unchanged.
    const second = until(2) - first;
    expect(second).toBeGreaterThanOrEqual(juniorCloseMs(state));
  });

  it('never takes a hand-only rare — those are yours (C2)', () => {
    const board = emptyBoard();
    const state = stateWith({ levels: { ...BARE, junior: 8 } });
    addTicket(board, 'incident');
    addTicket(board, 'escalation');

    run(board, state, juniorCloseMs(state) + WALK_MS);
    expect(board.tickets.length).toBe(2);
    expect(board.juniors.every((j) => j.phase === 'idle')).toBe(true);
  });

  it('two juniors never claim the same ticket', () => {
    const board = emptyBoard();
    const state = stateWith({ levels: { ...BARE, junior: 4 } });
    addTicket(board, 'lint');

    run(board, state, STEP_MS);
    const working = board.juniors.filter((j) => j.phase !== 'idle');
    expect(working.length).toBe(1);
  });
});

describe('the crew, told how to work', () => {
  const junior = (skills: Record<string, number>): Consultancy =>
    stateWith({ levels: { ...BARE, junior: 1 }, skills });

  it('takes the neighbour once a batch is bought', () => {
    const board = emptyBoard();
    const state = junior({ ticketStacking: 1 });
    const rand = cycling();
    fill(board, 'lint', 400, rand);

    const closed = firstClose(board, state, rand);
    expect(closed.length).toBe(2);
  });

  it('still takes exactly one without it', () => {
    const board = emptyBoard();
    const rand = cycling();
    fill(board, 'lint', 60, rand);

    expect(firstClose(board, junior({}), rand).length).toBe(1);
  });

  it('leaves the type a policy named on the board', () => {
    const board = emptyBoard();
    const state = stateWith({
      levels: { ...BARE, junior: 8 },
      skills: { triagePolicy: 1 },
    });
    fill(board, 'lint', 12, cycling());

    const closed = run(board, state, juniorCloseMs(state) + WALK_MS);
    expect(closed).toEqual([]);
    expect(board.tickets.length).toBe(12);
  });

  it('reaches the rung above the band once reach is bought', () => {
    const board = emptyBoard();
    addTicket(board, 'rockstar');

    const plain = junior({});
    run(board, plain, juniorCloseMs(plain) + WALK_MS);
    expect(board.tickets.length).toBe(1);

    const stretched = junior({ juniorReach: 2 });
    run(board, stretched, juniorCloseMs(stretched) + WALK_MS);
    expect(board.tickets.length).toBe(0);
  });

  it('leaves the events alone even with the rota bought', () => {
    const board = emptyBoard();
    const state = junior({ juniorReach: 2 });
    addTicket(board, 'quarter');

    run(board, state, juniorCloseMs(state) + WALK_MS);
    expect(board.tickets.length).toBe(1);
  });

  it('claims something nearer than the draw would have', () => {
    const far = stateWith({ levels: { ...BARE, junior: 40 } });
    const near = stateWith({
      levels: { ...BARE, junior: 40 },
      skills: { lineOfSight: 1 },
    });

    const walk = (state: Consultancy): number => {
      const heap = emptyBoard();
      fill(heap, 'lint', 400, cycling());
      workCrews(heap, state, STEP_MS, cycling());
      return heap.juniors.reduce((worst, worker) => {
        const ticket = heap.byId.get(worker.target);
        if (!ticket) return worst;
        return worst + Math.hypot(ticket.x - worker.x, ticket.y - worker.y);
      }, 0);
    };

    expect(walk(near)).toBeLessThan(walk(far));
  });
});

describe('a close says who did it', () => {
  const closesOf = (
    board: Board,
    state: Consultancy,
    ms: number
  ): readonly Close[] => {
    const rand = cycling();
    const closed: Close[] = [];
    for (let at = 0; at < ms; at += STEP_MS) {
      const took = workCrews(board, state, STEP_MS, rand).closed;
      closed.push(...took);
      state = { ...state, sprintCount: state.sprintCount + took.length };
    }
    return closed;
  };

  it('credits the crew and the seat that closed it', () => {
    const board = emptyBoard();
    const state = stateWith({ levels: { ...BARE, junior: 1 } });
    for (let n = 0; n < 5; n++) addTicket(board, 'lint');

    const [close] = closesOf(board, state, juniorCloseMs(state) + WALK_MS);
    expect(close).toMatchObject({ by: 'juniors', poolSeat: 0, woman: false });
  });

  it('keeps byWomen equal to the closes the women did', () => {
    const board = emptyBoard();
    const state = stateWith({ levels: { ...BARE, junior: 8 } });
    for (let n = 0; n < 40; n++) addTicket(board, 'lint');

    const rand = cycling();
    let counted = 0;
    let credited = 0;
    for (let at = 0; at < juniorCloseMs(state) * 4; at += STEP_MS) {
      const work = workCrews(board, state, STEP_MS, rand);
      counted += work.closed.filter((close) => close.woman).length;
      credited += work.byWomen;
    }
    expect(counted).toBe(credited);
    expect(credited).toBeGreaterThan(0);
  });

  it('credits a sweep to the one senior who swept', () => {
    const board = emptyBoard();
    const state = stateWith({
      levels: { ...BARE, senior: 1 },
      skills: { e1: 3 },
    });
    fill(board, 'conflict', 40, cycling());

    const closes = closesOf(board, state, seniorCloseMs(state) + WALK_MS);
    expect(closes.length).toBeGreaterThan(1);
    expect(new Set(closes.map((close) => close.poolSeat)).size).toBe(1);
    expect(closes.every((close) => close.by === 'seniors')).toBe(true);
  });
});

describe('a click takes the card, never the work', () => {
  const soloJunior = (): { board: Board; state: Consultancy } => {
    const board = emptyBoard();
    const state = stateWith({ levels: { ...BARE, junior: 1 } });
    fill(board, 'lint', 20, cycling());
    return { board, state };
  };

  it('takes the card off the board the moment it is reached', () => {
    const { board, state } = soloJunior();
    const rand = cycling();
    const step = (): number =>
      workCrews(board, state, STEP_MS, rand).closed.length;

    step();
    const worker = board.juniors[0]!;
    const before = board.tickets.length;
    while (worker.phase !== 'closing') step();

    expect(board.tickets.length).toBe(before - 1);
    expect(worker.target).toBe(NO_TICKET);
    expect(worker.carrying.length).toBe(0);
    expect(board.tickets.some((t) => t.claimedBy === worker.id)).toBe(false);
  });

  it('frees the cell it took, so the heap can accept another', () => {
    const { board, state } = soloJunior();
    const rand = cycling();
    const step = (): void => void workCrews(board, state, STEP_MS, rand);

    step();
    const worker = board.juniors[0]!;
    while (worker.phase !== 'closing') step();

    const room = addTicket(board, 'lint', cycling());
    expect(room).not.toBeNull();
  });

  it('closes where the card was, not back at a desk', () => {
    const { board, state } = soloJunior();
    const rand = cycling();
    let closed = 0;
    for (let at = 0; at < juniorCloseMs(state) + 4 * WALK_MS; at += STEP_MS) {
      closed += workCrews(board, state, STEP_MS, rand).closed.length;
    }
    expect(closed).toBeGreaterThan(0);
    expect(board.juniors[0]!.y).not.toBe(CREW_STATS.juniors.homeY);
  });

  it('still loses the work when the worker is taken off the job', () => {
    const { board, state } = soloJunior();
    const rand = cycling();
    const meeting = { ...CALM, meeting: true };

    workCrews(board, state, STEP_MS, rand);
    const worker = board.juniors[0]!;
    while (worker.phase !== 'closing') workCrews(board, state, STEP_MS, rand);

    workCrews(board, state, STEP_MS, rand, meeting);
    expect(worker.leftMs).toBe(0);
  });
});

describe('a senior closing a patch', () => {
  const seniorState = (overrides: Partial<Consultancy> = {}): Consultancy =>
    stateWith({ levels: { ...BARE, senior: 1 }, ...overrides });

  it('takes several tickets in one close, not one', () => {
    const board = emptyBoard();
    const state = seniorState();
    const rand = cycling();
    fill(board, 'conflict', 40, rand);

    const closed = firstClose(board, state, rand);
    expect(closed.length).toBeGreaterThan(1);
    expect(closed.length).toBeLessThanOrEqual(seniorBatch(state));
  });

  it('leaves the hand-only rare where it lies', () => {
    const board = emptyBoard();
    const state = seniorState();
    addTicket(board, 'incident');

    run(board, state, seniorCloseMs(state) + SENIOR_WALK_MS);
    expect(board.tickets.length).toBe(1);
  });

  it('goes for the biggest rung first once the War Room is bought (E4)', () => {
    const board = emptyBoard();
    const rand = cycling();
    fill(board, 'conflict', 8, rand);
    fill(board, 'swarm', 8, rand);

    const state = seniorState({ skills: { e4: 1 } });
    run(board, state, STEP_MS);
    expect(board.byId.get(board.seniors[0]!.target)!.type).toBe('swarm');
  });

  it('sweeps its whole batch, full sprint or not (D54)', () => {
    const board = emptyBoard();
    const state = stateWith({
      levels: { ...BARE, senior: 1 },
      sprintCount: SPRINT_SLOTS_BASE - 1,
    });
    for (let n = 0; n < 40; n++) addTicket(board, 'conflict');

    const closed = run(board, state, seniorCloseMs(state) + SENIOR_WALK_MS);
    expect(closed.length).toBeGreaterThanOrEqual(seniorBatch(state));
  });

  it('leaves the filler to the juniors', () => {
    const board = emptyBoard();
    const state = seniorState();
    for (let n = 0; n < 20; n++) addTicket(board, 'lint');

    run(board, state, seniorCloseMs(state) + SENIOR_WALK_MS);
    expect(board.tickets.length).toBe(20);
  });

  it.each(['escalation', 'hotfix', 'quarter'] as const)(
    'leaves the %s event on the board for the player (§6.6)',
    (event) => {
      const board = emptyBoard();
      const state = seniorState({ skills: { e4: 1 } });
      addTicket(board, event);

      const closed = run(board, state, seniorCloseMs(state) + SENIOR_WALK_MS);
      expect(closed).toEqual([]);
      expect(board.tickets.length).toBe(1);
    }
  );
});

describe('a full sprint (C1)', () => {
  it('keeps closing past capacity rather than standing still', () => {
    const board = emptyBoard();
    const state = stateWith({
      levels: { ...BARE, junior: 3 },
      sprintCount: SPRINT_SLOTS_BASE,
    });
    for (let n = 0; n < 5; n++) addTicket(board, 'bug');

    const closed = run(board, state, juniorCloseMs(state) + 2 * WALK_MS);
    expect(closed.length).toBeGreaterThan(0);
    expect(board.juniors.every((j) => j.carrying.length === 0)).toBe(true);
  });

  it('closes everything it can reach, and the sprint takes it all', () => {
    const board = emptyBoard();
    const slots = sprintSlots(stateWith({ levels: BARE }));
    const state = stateWith({ levels: { ...BARE, junior: slots + 40 } });
    for (let n = 0; n < slots + 40; n++) addTicket(board, 'bug');

    const closed = run(board, state, juniorCloseMs(state) + 2 * WALK_MS);
    expect(closed.length).toBeGreaterThan(slots);
  });
});

describe('the player and the crew race for the same board (D5)', () => {
  it('a harvested ticket frees the junior walking to it', () => {
    const board = emptyBoard();
    const state = stateWith({ levels: { ...BARE, junior: 1 } });
    const ticket = addTicket(board, 'legacy')!;

    run(board, state, STEP_MS);
    expect(board.juniors[0]!.target).toBe(ticket.id);

    removeTicket(board, ticket);
    expect(board.juniors[0]!.phase).toBe('idle');
    expect(board.tickets).toEqual([]);
    expect(board.claimable).toEqual([]);
  });

  it('leaves the board consistent after a hundred random removals', () => {
    const board = emptyBoard();
    const state = stateWith({ levels: { ...BARE, junior: 12, senior: 3 } });
    const rand = cycling();

    for (let round = 0; round < 100; round++) {
      addTicket(board, round % 3 === 0 ? 'incident' : 'lint');
      run(board, state, STEP_MS, rand);
      const victim = board.tickets[Math.floor(rand() * board.tickets.length)];
      if (victim) removeTicket(board, victim);
    }

    expect(board.byId.size).toBe(board.tickets.length);
    expect(board.tickets.every((t, at) => t.at === at)).toBe(true);
    expect(board.claimable.every((t, at) => t.poolAt === at)).toBe(true);
    expect(board.rares.every((t, at) => t.poolAt === at)).toBe(true);
    for (const ticket of board.claimable) {
      expect(board.byId.get(ticket.id)).toBe(ticket);
      expect(ticket.claimedBy).toBe(-1);
      expect(ticket.type).not.toBe('incident');
    }
    for (const ticket of board.rares) {
      expect(board.byId.get(ticket.id)).toBe(ticket);
      expect(ticket.claimedBy).toBe(-1);
      expect(ticket.type).toBe('incident');
    }
  });
});

describe('the board fills up', () => {
  it('pushes the oldest card out for new work once full', () => {
    const board = emptyBoard();
    for (let n = 0; n < BOARD_CAPACITY; n++) addTicket(board, 'lint');
    const oldest = board.tickets[0]!;
    oldest.lifeLeftMs = 1;
    const newest = addTicket(board, 'legacy');

    expect(newest).not.toBeNull();
    expect(board.tickets.length).toBe(BOARD_CAPACITY);
    expect(board.byId.has(oldest.id)).toBe(false);

    const gone: BoardTicket[] = [];
    expireTickets(board, 0, gone);
    expect(gone).toEqual([oldest]);
  });

  it('keeps a golden card for its own, longer life', () => {
    const board = emptyBoard();
    const gold = addTicket(board, 'lint', Math.random, false, true)!;
    expireTickets(board, TICKET_LIFE_MS * 2, []);
    expect(board.byId.has(gold.id)).toBe(true);

    const gone: BoardTicket[] = [];
    expireTickets(board, GOLDEN_LIFE_MS, gone);
    expireTickets(board, WONT_FIX_FADE_MS, gone);
    expect(gone).toEqual([gold]);
  });

  it('fades an expired card out of the crew pool, closing it only after the fade', () => {
    const board = emptyBoard();
    const card = addTicket(board, 'lint')!;
    const gone: BoardTicket[] = [];

    expireTickets(board, TICKET_LIFE_MS, gone);
    expect(gone).toEqual([]);
    expect(board.byId.has(card.id)).toBe(true);
    expect(board.claimable).toEqual([]);
    expect(fadeOf(card)).toBe(1);

    expireTickets(board, WONT_FIX_FADE_MS / 2, gone);
    expect(fadeOf(card)).toBeCloseTo(0.5);

    expireTickets(board, WONT_FIX_FADE_MS / 2, gone);
    expect(gone).toEqual([card]);
    expect(board.byId.has(card.id)).toBe(false);
  });

  it('pushes a golden card out only once nothing else is left', () => {
    const board = emptyBoard();
    const gold = addTicket(board, 'lint', Math.random, false, true)!;
    gold.lifeLeftMs = 1;
    for (let n = 1; n < BOARD_CAPACITY; n++) addTicket(board, 'lint');
    addTicket(board, 'legacy');
    expect(board.byId.has(gold.id)).toBe(true);

    const hoard = emptyBoard();
    for (let n = 0; n < BOARD_CAPACITY; n++) {
      addTicket(hoard, 'lint', Math.random, false, true);
    }
    expect(addTicket(hoard, 'lint')).not.toBeNull();
  });

  it('never pushes out a claimed or hand-only card', () => {
    const board = emptyBoard();
    for (let n = 0; n < BOARD_CAPACITY; n++) addTicket(board, 'incident');
    expect(addTicket(board, 'lint')).toBeNull();
  });

  it('still admits an invitation, which is not supply', () => {
    const board = emptyBoard();
    for (let n = 0; n < BOARD_CAPACITY + 50; n++) addTicket(board, 'lint');

    const invite = addTicket(board, 'invite');
    expect(invite).not.toBeNull();
    expect(board.tickets.length).toBe(BOARD_CAPACITY + 1);
  });

  it('has more cells in the grid than the cap it enforces', () => {
    expect(HEAP_COLS * HEAP_ROWS).toBeGreaterThan(BOARD_CAPACITY);
  });

  it('scatters a sparse board below the vote beams instead of the floor', () => {
    const board = emptyBoard();
    fill(board, 'lint', 30, cycling());
    const ys = board.tickets.map((ticket) => ticket.y);
    const top = cellY(HEAP_SPAWN_ROWS - 1);
    const high = ys.filter((y) => y < (top + cellY(0)) / 2).length;

    expect(high).toBeGreaterThan(5);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(top);
  });
});

describe('throughput', () => {
  it('stays under crewCeilingPerSec, and walking is what costs it', () => {
    const board = emptyBoard();
    const state = stateWith({ levels: { ...BARE, junior: 20, senior: 4 } });
    const rand = cycling();
    const seconds = 3000;

    let closed = 0;
    for (let at = 0; at < seconds * 1000; at += STEP_MS) {
      while (board.tickets.length < 60) addTicket(board, 'conflict', rand);
      closed += workCrews(board, state, STEP_MS, rand).closed.length;
    }

    const measured = closed / seconds;
    const ceiling = crewCeilingPerSec(state);
    expect(measured).toBeLessThan(ceiling);
    expect(measured).toBeGreaterThan(ceiling * 0.4);
  });
});

describe('an account manager', () => {
  const managed = (levels: Partial<typeof BARE> = {}): Consultancy =>
    stateWith({ levels: { ...BARE, manager: 1, ...levels }, tier: 4 });

  it('closes nothing and leaves the cards as they were', () => {
    const board = emptyBoard();
    const state = managed();
    fill(board, 'lint', 5, cycling());

    const closed = run(board, state, managerCloseMs(state) * 3 + WALK_MS);
    expect(closed).toEqual([]);
    expect(board.tickets.map((t) => t.type)).toEqual(Array(5).fill('lint'));
    expect(board.tickets.every((t) => t.claimedBy === NO_TICKET)).toBe(true);
  });

  it('walks to where a closer is headed and stands over it', () => {
    const board = emptyBoard();
    const state = managed({ junior: 1 });
    fill(board, 'lint', 3, cycling());

    const rand = cycling();
    let stood = false;
    for (let at = 0; at < WALK_MS * 2 && !stood; at += STEP_MS) {
      workCrews(board, state, STEP_MS, rand);
      stood = board.managers[0]?.phase === 'closing';
    }
    expect(stood).toBe(true);
  });

  it('moves on once it has stood for its close time', () => {
    const board = emptyBoard();
    const state = managed();
    fill(board, 'lint', 3, cycling());

    const rand = cycling();
    const seen = new Set<string>();
    for (let at = 0; at < managerCloseMs(state) * 3 + WALK_MS; at += STEP_MS) {
      workCrews(board, state, STEP_MS, rand);
      seen.add(board.managers[0]!.phase);
    }
    expect([...seen]).toEqual(
      expect.arrayContaining(['toTicket', 'closing', 'idle'])
    );
  });

  it('covers the close it stands over, and nothing past its reach', () => {
    const board = emptyBoard();
    const state = managed();
    run(board, state, STEP_MS);
    const manager = board.managers[0]!;
    manager.x = 300;
    manager.y = 200;

    expect(overseen(board, 300 + 50, 200, 60)).toBe(true);
    expect(overseen(board, 300 + 70, 200, 60)).toBe(false);
  });
});

const BOARD_SOURCE = 'src/app/game/util/board.ts';

describe('the board prices nothing (S8)', () => {
  it('reaches neither the economy nor the consultancy', async () => {
    const source = await readFile(BOARD_SOURCE, 'utf8');
    expect(source).not.toMatch(/from '\.\/(economy|crew-rules|supply)'/);
    expect(source).not.toMatch(/consultancy\.model/);
  });
});

describe('the hand takes what the ring touches', () => {
  it('takes a card whose box the ring grazes, centre outside it', () => {
    const board = emptyBoard();
    const card = addTicket(board, 'lint')!;
    const x = card.x + CARD_HIT.halfWidth + 3;

    expect(pickWithin(board, x, card.y, 5)).toEqual([]);
    expect(pickTouching(board, x, card.y, 5)).toEqual([card.id]);
  });

  it('misses a card the ring does not reach', () => {
    const board = emptyBoard();
    const card = addTicket(board, 'lint')!;
    const x = card.x + CARD_HIT.halfWidth + 6;

    expect(pickTouching(board, x, card.y, 5)).toEqual([]);
  });
});

describe('an auto-closed type', () => {
  it('leaves the board for the store to bill instead of fading', () => {
    const board = emptyBoard();
    const card = addTicket(board, 'lint')!;
    const gone: BoardTicket[] = [];
    const closing: BoardTicket[] = [];

    expireTickets(board, TICKET_LIFE_MS, gone, new Set(['lint']), closing);
    expect(closing).toEqual([card]);
    expect(gone).toEqual([]);
    expect(board.byId.has(card.id)).toBe(false);
  });
});

import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import {
  emptyBoard,
  HEAP_COLS,
  HEAP_ROWS,
  NO_TICKET,
} from '../model/board.model';
import type { Board, Close } from '../model/board.model';
import type { Consultancy } from '../model/consultancy.model';
import { freshConsultancy } from '../model/consultancy.model';
import { SAVE_VERSION } from '../model/game.consts';
import { CALM } from '../model/hazard.model';
import type { PurchaseId } from '../model/balance/progression';
import { CREW_STATS } from '../model/balance/crew';
import { AUTO_CLOSE_MS } from '../model/balance/flow';
import { PURCHASE_IDS } from '../model/balance/progression';
import { SPRINT_SLOTS_BASE } from '../model/balance/round';
import { BOARD_CAPACITY, LOGICAL_BOARD } from '../model/geometry';

const WALK_MS = (LOGICAL_BOARD.width / CREW_STATS.juniors.walkSpeed) * 1000 * 2;
const SENIOR_WALK_MS =
  (LOGICAL_BOARD.width / CREW_STATS.seniors.walkSpeed) * 1000 * 2;
const WALK_AND_CLOSE_LIMIT_MS = 120_000;
import type { TicketTypeId } from '../model/ticket.model';
import { TICKET_TYPES } from '../model/ticket.model';
import { addTicket, removeTicket, workCrews as stepCrews } from './board';
import { crewRules } from './crew-rules';
import { fileAutomated } from './supply';

import {
  autoCloseMs,
  crewClaims,
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
    const filed = fileAutomated(board, state, STEP_MS, CALM, took.length);
    closed.push(...[...took, ...filed].map((close) => close.type));
    state = {
      ...state,
      sprintCount: state.sprintCount + took.length + filed.length,
    };
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

function settle(
  board: Board,
  state: Consultancy,
  ms: number,
  rand = cycling()
): void {
  run(board, state, ms, rand);
  for (let at = 0; at < WALK_AND_CLOSE_LIMIT_MS * 2; at += STEP_MS) {
    const busy = [...board.managers, ...board.juniors, ...board.seniors].some(
      (worker) => worker.carrying.length > 0
    );
    if (!busy) return;
    workCrews(board, state, STEP_MS, rand);
  }
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
    fill(board, 'lint', 60, rand);

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
    addTicket(board, 'slop');

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
    fill(board, 'flaky', 40, cycling());

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
    fill(board, 'flaky', 40, rand);

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
    fill(board, 'flaky', 8, rand);
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
    for (let n = 0; n < 40; n++) addTicket(board, 'flaky');

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

describe('a ticket that closes itself', () => {
  const automated = (skills: Record<string, number>): Consultancy =>
    stateWith({ levels: { ...BARE, junior: 4 }, tier: 4, skills });

  it('lands, waits, and files itself into the sprint', () => {
    const board = emptyBoard();
    const state = automated({ autoLint: 1 });
    fill(board, 'lint', 6, cycling());

    expect(run(board, state, autoCloseMs(state) / 2)).toEqual([]);
    expect(board.tickets.length).toBe(6);

    const closed = run(board, state, autoCloseMs(state) * 2);
    expect(closed.length).toBeGreaterThan(0);
    expect(closed.every((type) => type === 'lint')).toBe(true);
  });

  it('does nothing to a type nobody automated', () => {
    const board = emptyBoard();
    fill(board, 'lint', 6, cycling());

    const bare = stateWith({ levels: { ...BARE }, tier: 4 });
    expect(run(board, bare, AUTO_CLOSE_MS * 4)).toEqual([]);
    expect(board.tickets.length).toBe(6);
  });

  it('is not claimed by the crew any more', () => {
    const state = automated({ autoLint: 1 });
    expect(crewClaims(state, 'juniors')('lint')).toBe(false);
    expect(crewClaims(state, 'offshore')('lint')).toBe(false);
  });

  it('waits for room rather than billing past a full sprint', () => {
    const board = emptyBoard();
    const state = {
      ...automated({ autoLint: 1 }),
      sprintCount: sprintSlots(stateWith()) + 99,
    };
    fill(board, 'lint', 6, cycling());

    expect(run(board, state, autoCloseMs(state) * 3)).toEqual([]);
    expect(board.tickets.length).toBe(6);
  });
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
  it('drops the overflow rather than queueing it', () => {
    const board = emptyBoard();
    for (let n = 0; n < BOARD_CAPACITY + 50; n++) addTicket(board, 'lint');
    expect(board.tickets.length).toBe(BOARD_CAPACITY);
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
});

describe('throughput', () => {
  it('stays under crewCeilingPerSec, and walking is what costs it', () => {
    const board = emptyBoard();
    const state = stateWith({ levels: { ...BARE, junior: 20, senior: 4 } });
    const rand = cycling();
    const seconds = 3000;

    let closed = 0;
    for (let at = 0; at < seconds * 1000; at += STEP_MS) {
      while (board.tickets.length < 60) addTicket(board, 'flaky', rand);
      closed += workCrews(board, state, STEP_MS, rand).closed.length;
    }

    const measured = closed / seconds;
    const ceiling = crewCeilingPerSec(state);
    expect(measured).toBeLessThan(ceiling);
    expect(measured).toBeGreaterThan(ceiling * 0.4);
  });
});

describe('an account manager (D41)', () => {
  const managed = (skills: Record<string, number> = {}): Consultancy =>
    stateWith({
      levels: { ...BARE, manager: 1 },
      tier: 4,
      skills,
    });

  it('files a ticket as something dearer and closes nothing', () => {
    const board = emptyBoard();
    const state = managed();
    addTicket(board, 'lint');

    settle(board, state, managerCloseMs(state) + 3 * WALK_MS);
    expect(board.tickets.length).toBe(1);
    const filed = board.tickets[0]!;
    expect(filed.type).not.toBe('lint');
    expect(TICKET_TYPES[filed.type].value).toBeGreaterThan(
      TICKET_TYPES.lint.value
    );
  });

  it('files it at most once, however long it is left there', () => {
    const board = emptyBoard();
    const state = managed();
    addTicket(board, 'lint');

    settle(board, state, managerCloseMs(state) * 6 + 6 * WALK_MS);
    const filed = board.tickets[0]!;
    expect(filed.relabelled).toBe(true);
    expect(filed.type).toBe('bug');
  });

  it('never files a ticket as a tier the player has not unlocked', () => {
    const board = emptyBoard();
    const state = stateWith({
      levels: { ...BARE, manager: 1 },
      tier: 0,
      skills: { h3: 2 },
    });
    addTicket(board, 'lint');

    run(board, state, managerCloseMs(state) * 3 + 3 * WALK_MS);
    expect(board.tickets.every((t) => TICKET_TYPES[t.type].tier <= 0)).toBe(
      true
    );
  });

  it('leaves the rares and the events where they are', () => {
    const board = emptyBoard();
    const state = managed();
    addTicket(board, 'incident');
    addTicket(board, 'quarter');

    run(board, state, managerCloseMs(state) + WALK_MS);
    expect(board.tickets.map((t) => t.type).sort()).toEqual([
      'incident',
      'quarter',
    ]);
    expect(board.managers.every((m) => m.phase === 'idle')).toBe(true);
  });

  it('keeps working while the sprint has no room at all', () => {
    const board = emptyBoard();
    const state = stateWith({
      levels: { ...BARE, manager: 1 },
      tier: 4,
      sprintCount: sprintSlots(stateWith()) + 99,
    });
    addTicket(board, 'lint');

    settle(board, state, managerCloseMs(state) + 3 * WALK_MS);
    expect(board.tickets[0]!.relabelled).toBe(true);
  });

  it('never buys a comeback by re-filing into one', () => {
    const board = emptyBoard();
    const state = stateWith({
      levels: { ...BARE, manager: 1 },
      tier: 2,
      skills: { h3: 2 },
    });
    fill(board, 'bug', 6, cycling());

    run(board, state, managerCloseMs(state) * 3 + WALK_MS);
    expect(board.pending).toEqual([]);
  });

  it('leaves the pools consistent after re-filing', () => {
    const board = emptyBoard();
    const state = managed({ h3: 1 });
    fill(board, 'lint', 30, cycling());

    run(board, state, managerCloseMs(state) * 4 + WALK_MS);
    const pooled = board.claimable.length + board.rares.length;
    const held = board.tickets.filter((t) => t.claimedBy !== NO_TICKET).length;
    expect(pooled + held).toBe(board.tickets.length);
    board.claimable.forEach((t, at) => expect(t.poolAt).toBe(at));
    board.rares.forEach((t, at) => expect(t.poolAt).toBe(at));
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

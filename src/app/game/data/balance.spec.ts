import { describe, expect, it } from 'vitest';

import { GameStore } from './game.store';

import type { Consultancy } from '../model/consultancy.model';
import { freshConsultancy } from '../model/consultancy.model';
import { SAVE_VERSION } from '../model/game.consts';
import {
  FINAL_SKILL_ID,
  SECRET_SKILL_ID,
  SKILL_BY_ID,
  SKILL_NODES,
  adrPrice,
} from '../model/skill.model';
import { DEBT_TIERS } from '../model/tier.model';
import { SPAWNERS } from '../model/spawner.model';
import { HAZARDS_ENABLED } from '../model/hazard.model';
import { TRAIT_IDS } from '../model/senior.model';

/** Design bound: no single trait may make a senior worth more than this many. */
const TRAIT_D21_CEILING = 1.25;
import { HAUL_MIN_MS, HAUL_MS } from '../model/balance/round';
import { pickWithin } from '../util/board';
import * as economy from '../util/economy';
import type { LedgerMark } from '../util/autoplay';
import { DEFAULT_POLICY, autoplay } from '../util/autoplay';

const CREW_EURO_FLOOR = 0.15;
const CREW_EURO_CAP = 0.95;

/** Re-measure when the weather comes back: it staffs offshore crew. */
const CREW_EURO_WINDOW_FLOOR = HAZARDS_ENABLED ? 0.05 : 0.04;
const WINDOW_MARKS = 4;

const CLICKS_PER_SEC = Number(
  process.env['CB_CPS'] ?? DEFAULT_POLICY.clicksPerSec
);
/** Gold is worth twice all ordinary work, so watching for it should show. */
const ATTENTION_MARGIN = 1.5;
/** Long enough for an unwatched floor to fill a lane or two on its own. */
const IDLE_CYCLE_MS = 10 * 60_000;
const MAX_SESSION_MS = Number(process.env['CB_MAXMS'] ?? 4 * 60 * 60 * 1000);

function everySkill(): Record<string, number> {
  return Object.fromEntries(
    SKILL_NODES.filter((node) => node.id !== SECRET_SKILL_ID).map((node) => [
      node.id,
      node.levels.length,
    ])
  );
}

const MILESTONES = [
  // The reference's order: the first new spawner (750) before the rats (~1 200).
  ['tier 1', (s: Consultancy) => s.tier >= 1],
  ['first junior', (s: Consultancy) => s.levels.junior >= 1],
  ['tier 2', (s: Consultancy) => s.tier >= 2],
  ['tier 3', (s: Consultancy) => s.tier >= 3],
  ['tier 4', (s: Consultancy) => s.tier >= 4],
  ['tier 5', (s: Consultancy) => s.tier >= 5],
  ['tier 6', (s: Consultancy) => s.tier >= 6],
  ['tier 7', (s: Consultancy) => s.tier >= 7],
  ['tier 8', (s: Consultancy) => s.tier >= 8],
  // The run ends on a purchase, so the purchase is the last milestone.
  ['signed off', (s: Consultancy) => (s.skills[FINAL_SKILL_ID] ?? 0) > 0],
] as const;

const UNORDERED_MILESTONES = [
  ['faster truck', (s: Consultancy) => (s.skills['duration'] ?? 0) >= 1],
  [
    'tree opened',
    (s: Consultancy) =>
      SKILL_NODES.every(
        (n) =>
          n.id === SECRET_SKILL_ID ||
          n.heading === true ||
          (s.skills[n.id] ?? 0) >= 1
      ),
  ],
] as const;

const EMPTY_MARK: LedgerMark = {
  at: 0,
  handClosed: 0,
  crewClosed: 0,
  handEuro: 0,
  crewEuro: 0,
};

function report(table: string): void {
  process.stdout.write(`\n${table}\n`);
}

function markAt(atMs: number): LedgerMark {
  return run.ledger.filter((mark) => mark.at <= atMs).at(-1) ?? EMPTY_MARK;
}

function crewEuroShare(from: LedgerMark, to: LedgerMark): number {
  const crew = to.crewEuro - from.crewEuro;
  const total = crew + to.handEuro - from.handEuro;
  return total === 0 ? 0 : crew / total;
}

function crewShare(from: LedgerMark, to: LedgerMark): number {
  const crew = to.crewClosed - from.crewClosed;
  const total = crew + to.handClosed - from.handClosed;
  return total === 0 ? 0 : crew / total;
}

function fullyLevelled(
  juniors: number,
  seniors: number,
  tier: number
): Consultancy {
  const fresh = freshConsultancy(0, SAVE_VERSION);
  return {
    ...fresh,
    levels: { ...fresh.levels, junior: juniors, senior: seniors, velocity: 1 },
    skills: everySkill(),
    spawners: Object.fromEntries(
      SPAWNERS.filter((row) => row.adr <= tier).map((row) => [
        String(row.adr),
        10,
      ])
    ),
    tier,
  };
}

const run = autoplay(
  freshConsultancy(0, SAVE_VERSION),
  [...MILESTONES, ...UNORDERED_MILESTONES],
  MAX_SESSION_MS,
  { ...DEFAULT_POLICY, clicksPerSec: CLICKS_PER_SEC }
);

describe('the crew earns its keep, and never all of it', () => {
  it('delivers a floor of the money', () => {
    expect(crewEuroShare(EMPTY_MARK, run.ledger.at(-1)!)).toBeGreaterThan(
      CREW_EURO_FLOOR
    );
  });

  it('leaves the player a share worth clicking for', () => {
    expect(crewEuroShare(EMPTY_MARK, run.ledger.at(-1)!)).toBeLessThan(
      CREW_EURO_CAP
    );
  });

  it('holds the floor across the back half of the run', () => {
    const marks = run.ledger.filter(
      (mark) => mark.at >= (run.ledger.at(-1)?.at ?? 0) / 2
    );
    for (const [at, mark] of marks.entries()) {
      if (at < WINDOW_MARKS) continue;
      expect(crewEuroShare(marks[at - WINDOW_MARKS]!, mark)).toBeGreaterThan(
        CREW_EURO_WINDOW_FLOOR
      );
    }
  });

  it('never credits the crew with work before there is a crew', () => {
    const firstJunior = run.reached.get('first junior')!;
    expect(crewShare(EMPTY_MARK, markAt(firstJunior - 1_000))).toBe(0);
  });

  it.runIf(process.env['CB_SHARE'])('reports the share it measured', () => {
    const marks = run.ledger.filter((mark) => mark.at % 300_000 === 0);
    const rows = marks.map((mark, n) => {
      const since = n === 0 ? EMPTY_MARK : marks[n - 1]!;
      return [
        (mark.at / 60_000).toFixed(0).padStart(5),
        (crewShare(since, mark) * 100).toFixed(1).padStart(10),
        (crewEuroShare(since, mark) * 100).toFixed(1).padStart(11),
        (crewEuroShare(EMPTY_MARK, mark) * 100).toFixed(1).padStart(10),
      ].join('');
    });
    report(`  min  crew closes%  crew EUR%  run EUR%\n${rows.join('\n')}`);
  });
});

describe('the crew ceiling counts everyone', () => {
  it('rises when a senior is hired, not only a junior', () => {
    const bare = fullyLevelled(10, 0, 1);
    const staffed = fullyLevelled(10, 3, 1);
    expect(economy.crewCeilingPerSec(staffed)).toBeGreaterThan(
      economy.crewCeilingPerSec(bare)
    );
    expect(economy.crewCeilingPerSec(bare)).toBeCloseTo(
      economy.juniorCeilingPerSec(bare),
      6
    );
  });

  it('buys a bench at most TRAIT_D21_CEILING over a traitless one', () => {
    const capped = fullyLevelled(57, 23, 8);
    const worst: Consultancy = {
      ...capped,
      roster: Array.from({ length: 23 }, () => ({
        poolSeat: 0,
        traits: ['closer' as const],
      })),
    };
    expect(economy.seniorCeilingPerSec(worst)).toBeCloseTo(
      economy.seniorCeilingPerSec(capped) * TRAIT_D21_CEILING,
      6
    );
  });

  it('never lets an account manager into the D21 bound (D41)', () => {
    const closers = fullyLevelled(10, 4, 1);
    const managed: Consultancy = {
      ...closers,
      levels: { ...closers.levels, manager: 8 },
    };
    expect(economy.crewCeilingPerSec(managed)).toBe(
      economy.crewCeilingPerSec(closers)
    );
  });

  it('spends a desk a closer would otherwise sit at (D36)', () => {
    const closers = fullyLevelled(10, 4, 1);
    const managed: Consultancy = {
      ...closers,
      levels: { ...closers.levels, manager: 8 },
    };
    expect(economy.freeDesks(managed)).toBe(economy.freeDesks(closers) - 8);
    expect(economy.needsDesk('manager')).toBe(true);
  });

  it('keeps every trait inside TRAIT_D21_CEILING', () => {
    const state = fullyLevelled(0, 1, 8);
    for (const trait of TRAIT_IDS) {
      expect(economy.traitFactor(state, trait)).toBeLessThanOrEqual(
        TRAIT_D21_CEILING + 1e-9
      );
    }
  });

  it('never lets the roster and the bench disagree', () => {
    for (const state of run.samples) {
      expect(state.roster.length).toBeLessThanOrEqual(state.levels.senior);
    }
  });
});

describe('the regime migration (C5)', () => {
  it('starts spawn-limited — below the bucket and below a human hand', () => {
    const start = freshConsultancy(0, SAVE_VERSION);
    expect(economy.totalSpawnRate(start)).toBeLessThan(
      economy.ceilingPerSec(start)
    );
    expect(economy.totalSpawnRate(start)).toBeLessThan(CLICKS_PER_SEC);
  });
});

describe('supply is priced against the bucket (D25)', () => {
  // The reference's opening never meets the cap: you don't know there is one.
  it('opens with a lane far wider than the path can fill', () => {
    const start = freshConsultancy(0, SAVE_VERSION);
    expect(economy.ceilingPerSec(start)).toBeGreaterThan(
      economy.totalSpawnRate(start) * 10
    );
  });

  it("keeps every level of a line's throw-two worth buying", () => {
    const start = freshConsultancy(0, SAVE_VERSION);
    const spawn = SKILL_BY_ID.get('spawnLint')!;
    let billable = 0;

    for (let level = 0; level <= spawn.levels.length; level += 1) {
      const state = { ...start, skills: { spawnLint: level, capacity: level } };
      const next = Math.min(
        economy.totalSpawnRate(state),
        economy.ceilingPerSec(state)
      );
      expect(next, `level ${level}`).toBeGreaterThan(billable);
      billable = next;
    }
  });
});

describe("an unattended run keeps cycling (C1's successor)", () => {
  const SPAN_MS =
    economy.haulMs({
      ...fullyLevelled(40, 4, 5),
      skills: everySkill(),
    }) * 30;

  const seeded = (): GameStore => {
    const store = new GameStore();
    let seed = 7;
    store.seedRandom(
      () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648
    );
    return store;
  };

  const unattended = (skills: Record<string, number>): number => {
    const store = seeded();
    store.hydrate({ ...fullyLevelled(40, 4, 5), skills });
    for (let ms = 100; ms <= SPAN_MS; ms += 100) store.advanceTo(ms);
    return store.budget();
  };

  it('keeps earning with nobody pressing anything', () => {
    const idle = unattended(everySkill());
    expect(idle).toBeGreaterThan(0);
  });

  it('hauls again and again for a player who never touches a button', () => {
    const store = new GameStore();
    store.hydrate(fullyLevelled(40, 4, 5));
    for (let ms = 100; ms <= IDLE_CYCLE_MS; ms += 100) store.advanceTo(ms);
    expect(store.lifetimeRounds()).toBeGreaterThan(1);
  });

  const attended = (skills: Record<string, number>): number => {
    const store = seeded();
    store.hydrate({ ...fullyLevelled(40, 4, 5), skills });
    let credit = 0;
    for (let ms = 100; ms <= SPAN_MS; ms += 100) {
      store.advanceTo(ms);
      store.startRound(ms);
      credit += CLICKS_PER_SEC / 10;
      const clicks = Math.floor(credit);
      if (clicks <= 0) continue;
      credit -= clicks;
      for (let click = 0; click < clicks; click += 1) {
        // Scan for gold first: it is the work the crew refuse.
        const aim =
          store.board.tickets.find((ticket) => ticket.golden) ??
          store.board.tickets[0];
        if (!aim) break;
        const ids = pickWithin(
          store.board,
          aim.x,
          aim.y,
          economy.clickRadius(store.snapshot())
        );
        if (ids.length === 0) break;
        store.harvest(ids);
      }
    }
    return store.budget();
  };

  // Before the crew are cleared for gold, the hand is what collects it. After,
  // the reference's cursor only hurries things along, so no margin is owed.
  const beforeGoldenCrew = (): Record<string, number> => ({
    ...everySkill(),
    goldenCrew: 0,
    signoff: 0,
  });

  it('leaves an attentive player well ahead of an idle one, until the crew take gold', () => {
    const idle = unattended(beforeGoldenCrew());
    const hand = attended(beforeGoldenCrew());
    if (process.env['CB_HAND'])
      report(`hand ${(hand / idle).toFixed(2)}× idle`);
    expect(hand).toBeGreaterThan(idle * ATTENTION_MARGIN);
  });
});

describe('the session arc', () => {
  it('reaches every milestone, in order, inside one sitting', () => {
    const times = MILESTONES.map(([label]) => {
      const at = run.reached.get(label);
      expect(at, `${label} was never reached`).toBeDefined();
      return at!;
    });

    for (let n = 1; n < times.length; n += 1) {
      expect(
        times[n]!,
        `${MILESTONES[n]![0]} must not precede ${MILESTONES[n - 1]![0]}`
      ).toBeGreaterThanOrEqual(times[n - 1]!);
    }
  });

  it('walks every branch of the tree at least once', () => {
    const end = run.end;
    const tracks = new Map<string, boolean>();
    for (const node of SKILL_NODES) {
      if (node.id === SECRET_SKILL_ID || node.id === 'root') continue;
      const track = node.track;
      tracks.set(
        track,
        (tracks.get(track) ?? false) || (end.skills[node.id] ?? 0) > 0
      );
    }
    for (const [track, walked] of tracks) {
      expect(walked, `track ${track} was never entered`).toBe(true);
    }
  });

  it('finishes inside a sitting, not a coffee break', () => {
    const at = run.reached.get('signed off');
    expect(at, 'the run never bought the last upgrade').toBeDefined();
    // The reference is finished in about an hour. Wide enough that ordinary
    // tuning does not trip it, tight enough to catch the curve collapsing.
    expect(at! / 60_000).toBeGreaterThan(35);
    expect(at! / 60_000).toBeLessThan(100);
  });

  it('spaces the late rungs, instead of stacking them', () => {
    const gap = (from: string, to: string): number =>
      (run.reached.get(to)! - run.reached.get(from)!) / 60_000;

    for (const [from, to] of [
      ['tier 4', 'tier 5'],
      ['tier 5', 'tier 6'],
      ['tier 6', 'tier 7'],
      ['tier 7', 'tier 8'],
      ['tier 8', 'signed off'],
    ] as const) {
      expect(gap(from, to), `${from} to ${to}`).toBeGreaterThan(2);
    }
  });

  it('leaves nothing on the tree unbought by the time it signs off', () => {
    const end = run.end;
    const unbought = SKILL_NODES.filter(
      (node) =>
        node.id !== SECRET_SKILL_ID &&
        node.heading !== true &&
        (end.skills[node.id] ?? 0) === 0
    );
    expect(unbought.map((node) => node.id)).toEqual([]);
  });

  it('never hurries the truck away entirely', () => {
    const hurried = { ...fullyLevelled(40, 4, 8), skills: everySkill() };
    expect(economy.haulMs(hurried)).toBeGreaterThanOrEqual(HAUL_MIN_MS);
    expect(economy.haulMs(hurried)).toBeLessThan(HAUL_MS);
  });

  it.runIf(process.env['CB_CLOCK'])('reports the clock it measured', () => {
    const rows = [...MILESTONES, ...UNORDERED_MILESTONES].map(([label]) => {
      const at = run.reached.get(label);
      const when = at === undefined ? '—' : (at / 60_000).toFixed(1);
      return `${when.padStart(6)}  ${label}`;
    });
    const unbought = SKILL_NODES.filter(
      (node) =>
        node.id !== SECRET_SKILL_ID &&
        node.heading !== true &&
        (run.end.skills[node.id] ?? 0) === 0
    ).map((node) => `${node.id}@${node.levels[0]?.cost ?? 0}`);
    report(
      `  min  milestone\n${rows.join('\n')}\n` +
        `  SP ${Math.round(run.end.storyPoints)}` +
        `  unbought: ${unbought.join(' ') || 'none'}`
    );
  });

  it.runIf(process.env['CB_INCOME'])('reports the income it measured', () => {
    const marks = run.samples.filter((_, n) => (n + 1) % 10 === 0);
    const rows = marks.map((state, n) => {
      const since = n === 0 ? undefined : marks[n - 1];
      const perMin = (state.lifetimeBilled - (since?.lifetimeBilled ?? 0)) / 5;
      const spPerMin = (state.storyPoints - (since?.storyPoints ?? 0)) / 5;
      const next = DEBT_TIERS.find((tier) => tier.index === state.tier + 1);
      const owes = next ? adrPrice(next.index) / Math.max(spPerMin, 1) : 0;
      return [
        String((n + 1) * 5).padStart(5),
        formatSci(perMin).padStart(12),
        formatSci(state.budget).padStart(12),
        formatSci(spPerMin).padStart(10),
        formatSci(state.storyPoints).padStart(10),
        String(state.tier).padStart(6),
        (next ? formatSci(adrPrice(next.index)) : '—').padStart(12),
        (next ? owes.toFixed(1) : '—').padStart(9),
      ].join('');
    });
    report(
      `  min       EUR/min      budget     SP/min        SP  tier  next unlock  owes min\n${rows.join('\n')}`
    );
  });

  it.runIf(process.env['CB_LADDER'])('reports the ladder it measured', () => {
    let from = run.reached.get('first junior') ?? 0;
    const rows = DEBT_TIERS.map((tier) => {
      const at = run.reached.get(`tier ${tier.index}`);
      const gap = at === undefined ? undefined : (at - from) / 60_000;
      if (at !== undefined) from = at;
      return [
        `ADR-${tier.index}`.padStart(6),
        formatSci(adrPrice(tier.index)).padStart(13),
        (at === undefined ? '—' : (at / 60_000).toFixed(1)).padStart(7),
        (gap === undefined ? '—' : gap.toFixed(1)).padStart(7),
      ].join('');
    });
    report(`  rung         cost    min    gap\n${rows.join('\n')}`);
  });
});

function formatSci(value: number): string {
  return value >= 1e6 ? value.toExponential(2) : Math.round(value).toString();
}

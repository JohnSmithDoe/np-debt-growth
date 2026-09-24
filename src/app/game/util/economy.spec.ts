import { describe, expect, it } from 'vitest';

import type { Consultancy } from '../model/consultancy.model';
import { consultancy } from '../model/consultancy.fixture';
import { castPoolSize, crewName } from '../model/cast.model';
import { SKILL_BY_ID } from '../model/skill.model';
import { TICKET_TYPES, TICKET_TYPE_IDS } from '../model/ticket.model';
import type { CrewKind } from '../model/crew.model';
import {
  CREW_KINDS,
  CREW_STATS,
  DESKS_PER_RANK,
  WOMAN_CLOSE_RATE,
} from '../model/balance/crew';
import {
  INCOME_CAP,
  INCOME_VALUE_ADD,
  SENIOR_BUYOUT_STEPS,
} from '../model/balance/progression';
import {
  ceilingPerSec,
  desks,
  haulMs,
  incomeCost,
  incomeLevel,
  incomeUnlocked,
  ticketValue,
  retainerPerSec,
  closeRate,
  crewCeilingPerSec,
  juniorCeilingPerSec,
  juniorSpawnRate,
  seniorBatch,
  seniorCeilingPerSec,
  seniorCloseMs,
  crewCeiling,
  crewClaims,
  crewWomanEvery,
  hireIsWoman,
  hirePoolSeat,
  juniorBatch,
  juniorCloseMs,
  spawnRate,
  spawnerCost,
  sprintSlots,
  totalSpawnRate,
} from './economy';

const LADDER_MIN_RATIO = 1.15;

describe('the senior buyout ladder (D33)', () => {
  it('climbs faster than a linear effect does', () => {
    for (let n = 1; n < SENIOR_BUYOUT_STEPS.length; n += 1) {
      expect(
        SENIOR_BUYOUT_STEPS[n]! / SENIOR_BUYOUT_STEPS[n - 1]!
      ).toBeGreaterThan(LADDER_MIN_RATIO);
    }
  });

  it('prices more seats than the tree can sell', () => {
    expect(SENIOR_BUYOUT_STEPS.length).toBeGreaterThan(5);
  });
});

describe('the can (C4)', () => {
  it('is bounded by the haul, because the truck is the only forced wait', () => {
    const state = consultancy({ skills: { capacity: 2 } });
    expect(ceilingPerSec(state)).toBeCloseTo(
      sprintSlots(state) / (haulMs(state) / 1000),
      6
    );

    expect(ceilingPerSec({ ...state })).toBeGreaterThan(0);
  });
});

describe('the junior pool (C2)', () => {
  it('excludes the hand-only rares that juniors are told to ignore', () => {
    const state = consultancy({
      tier: 3,
      levels: { junior: 5 },
    });
    const rares = TICKET_TYPE_IDS.filter((id) => TICKET_TYPES[id].handOnly);
    expect(rares.length).toBeGreaterThan(0);
    expect(juniorSpawnRate(state)).toBeLessThan(totalSpawnRate(state));
  });
});

describe('hand-only rares are weather, not a source (D5)', () => {
  it('does not let any € purchase make one arrive faster', () => {
    const rares = TICKET_TYPE_IDS.filter((id) => TICKET_TYPES[id].handOnly);
    expect(rares.length).toBeGreaterThan(0);

    const bought = consultancy({
      tier: 3,
      levels: { junior: 40, senior: 40, copilot: 40 },
      skills: { supply: 5, capacity: 5, spawnLint: 1, spawnBug: 1, pizza: 1 },
    });
    for (const id of rares) {
      expect(spawnRate(bought, id)).toBeCloseTo(TICKET_TYPES[id].ratePerSec, 6);
    }
  });

  it('still answers to the skill that exists to move them', () => {
    const base = consultancy({ tier: 1 });
    const skilled = consultancy({ tier: 1, skills: { spawnEscalation: 1 } });
    expect(spawnRate(skilled, 'escalation')).toBeGreaterThan(
      spawnRate(base, 'escalation')
    );
  });
});

describe('a respawning type', () => {
  it('yields two closes per spawn', () => {
    const state = consultancy({ tier: 2 });
    expect(TICKET_TYPES.flaky.respawns).toBe(true);
    expect(closeRate(state, 'flaky')).toBeCloseTo(
      spawnRate(state, 'flaky') * 2,
      6
    );
  });

  it('leaves every other type alone', () => {
    const state = consultancy({ tier: 3 });
    for (const id of TICKET_TYPE_IDS.filter((t) => !TICKET_TYPES[t].respawns)) {
      expect(closeRate(state, id)).toBeCloseTo(spawnRate(state, id), 6);
    }
  });
});

describe('what the crew can close', () => {
  const crew = (
    junior: number,
    senior: number,
    skills: Record<string, number> = {}
  ): Consultancy =>
    consultancy({
      levels: { junior, senior },
      skills,
    });

  const heads = (
    n: number,
    every: number = CREW_STATS.juniors.womanEvery
  ): number => {
    const women = Math.floor(n / every);
    return n - women + women * WOMAN_CLOSE_RATE;
  };

  it('is bounded by close time however skilled the crew is', () => {
    const skilled = crew(100, 0, { juniorSpeed: 1, juniorPresence: 1 });
    expect(juniorCeilingPerSec(skilled)).toBeGreaterThan(
      juniorCeilingPerSec(crew(100, 0))
    );
    const speed = SKILL_BY_ID.get('juniorSpeed')!.levels[0]!.effects.reduce(
      (all, effect) => all * (effect.kind === 'junior' ? effect.mult : 1),
      1
    );
    const aura = SKILL_BY_ID.get('juniorPresence')!.levels[0]!.effects.reduce(
      (all, effect) => all * (effect.kind === 'standupAura' ? effect.cap : 1),
      1
    );
    expect(juniorCeilingPerSec(skilled)).toBeCloseTo(
      (heads(100) * speed * aura * 1000) / CREW_STATS.juniors.closeMs,
      6
    );
  });

  it('compounds a node with the levels it owns', () => {
    const owned = SKILL_BY_ID.get('juniorSpeed')!.levels.slice(0, 3);
    const product = owned.reduce(
      (total, level) =>
        total *
        level.effects.reduce(
          (each, effect) => each * (effect.kind === 'junior' ? effect.mult : 1),
          1
        ),
      1
    );
    expect(juniorCeilingPerSec(crew(10, 0, { juniorSpeed: 3 }))).toBeCloseTo(
      (heads(10) * product * 1000) / CREW_STATS.juniors.closeMs,
      6
    );
  });

  it('spends an aura rank on reaching its cap, never on passing it', () => {
    const node = SKILL_BY_ID.get('juniorPresence')!;
    const auras = node.levels.flatMap((level) =>
      level.effects.filter((effect) => effect.kind === 'standupAura')
    );
    const capped = auras.reduce((all, effect) => all * effect.cap, 1);
    const maxed = crew(500, 0, { juniorPresence: node.levels.length });
    expect(juniorCeilingPerSec(maxed)).toBeCloseTo(
      (heads(500) * capped * 1000) / CREW_STATS.juniors.closeMs,
      6
    );
    expect(
      juniorCeilingPerSec(crew(8, 0, { juniorPresence: 3 }))
    ).toBeGreaterThan(juniorCeilingPerSec(crew(8, 0, { ticketStacking: 1 })));
  });

  it('counts the women on the crew rather than averaging them away', () => {
    expect(juniorCeilingPerSec(crew(4, 0))).toBeCloseTo(
      (5 * 1000) / CREW_STATS.juniors.closeMs,
      6
    );
    expect(juniorCeilingPerSec(crew(4, 0))).toBeGreaterThan(
      juniorCeilingPerSec(crew(3, 0)) * (4 / 3)
    );
  });

  it('reads a promoted bench at the juniors ratio', () => {
    const bench = { ...crew(0, 12), promoted: false };
    const promoted = { ...bench, promoted: true };
    expect(seniorCeilingPerSec(promoted)).toBeGreaterThan(
      seniorCeilingPerSec(bench)
    );
    expect(seniorCeilingPerSec(promoted)).toBeCloseTo(
      (heads(12) * seniorBatch(promoted) * 1000) / seniorCloseMs(promoted),
      6
    );
  });

  it('never counts a rank past the node it belongs to', () => {
    const maxed = SKILL_BY_ID.get('juniorSpeed')!.levels.length;
    expect(
      juniorCeilingPerSec(crew(10, 0, { juniorSpeed: maxed + 5 }))
    ).toBeCloseTo(juniorCeilingPerSec(crew(10, 0, { juniorSpeed: maxed })), 6);
  });

  it('adds the senior sweep at its full batch', () => {
    const state = crew(0, 4);
    expect(seniorCeilingPerSec(state)).toBeCloseTo(
      (heads(4, CREW_STATS.seniors.womanEvery) * seniorBatch(state) * 1000) /
        seniorCloseMs(state),
      6
    );
    expect(crewCeilingPerSec(crew(10, 4))).toBeCloseTo(
      juniorCeilingPerSec(crew(10, 4)) + seniorCeilingPerSec(crew(10, 4)),
      6
    );
  });

  it('counts nothing for a crew that was never hired', () => {
    expect(crewCeilingPerSec(crew(0, 0))).toBe(0);
  });

  it('never lets a junior batch raise the bound it is counted in', () => {
    const bare = juniorCeilingPerSec(crew(40, 0));
    for (let rank = 1; rank <= 8; rank += 1) {
      expect(
        juniorCeilingPerSec(crew(40, 0, { ticketStacking: rank }))
      ).toBeLessThanOrEqual(bare);
    }
  });

  it('takes more tickets per close for the same closes per second', () => {
    const stacked = crew(40, 0, { ticketStacking: 1 });
    expect(juniorBatch(stacked)).toBe(juniorBatch(crew(40, 0)) + 1);
    expect(juniorCloseMs(stacked)).toBeCloseTo(
      juniorCloseMs(crew(40, 0)) * 2,
      6
    );
  });

  it('is blind to a triage policy and to rare access', () => {
    const bare = crew(40, 0);
    expect(juniorCeilingPerSec(crew(40, 0, { triagePolicy: 1 }))).toBeCloseTo(
      juniorCeilingPerSec(bare),
      6
    );
    expect(juniorCeilingPerSec(crew(40, 0, { juniorReach: 2 }))).toBeCloseTo(
      juniorCeilingPerSec(bare),
      6
    );
  });
});

describe('what a crew is allowed to claim', () => {
  const claims = (skills: Record<string, number> = {}) =>
    crewClaims(consultancy({ skills }), 'juniors');

  it('keeps every event off both crews (§6.6)', () => {
    for (const crew of ['juniors', 'seniors'] as const) {
      const may = crewClaims(consultancy(), crew);
      expect(may('escalation')).toBe(false);
      expect(may('hotfix')).toBe(false);
      expect(may('quarter')).toBe(false);
    }
  });

  it('keeps the P0s away from every crew that takes a desk', () => {
    expect(claims()('incident')).toBe(false);
    expect(crewClaims(consultancy(), 'seniors')('incident')).toBe(false);
    expect(claims({ juniorReach: 2 })('incident')).toBe(false);
  });

  it('still lets the contractors take them', () => {
    expect(crewClaims(consultancy(), 'offshore')('incident')).toBe(true);
  });

  it('splits the ladder between the two crews, overlapping in the middle', () => {
    const senior = crewClaims(consultancy(), 'seniors');
    expect(claims()('lint')).toBe(true);
    expect(senior('lint')).toBe(false);
    expect(claims()('swarm')).toBe(false);
    expect(senior('swarm')).toBe(true);
    expect(claims()('flaky')).toBe(true);
    expect(senior('flaky')).toBe(true);
  });

  it('lets reach stretch a junior one rung past the band', () => {
    expect(claims()('slop')).toBe(false);
    expect(claims({ juniorReach: 2 })('slop')).toBe(true);
  });

  it('drops the type a policy named, and only that one (§6.5)', () => {
    const may = claims({ triagePolicy: 1 });
    expect(may('lint')).toBe(false);
    expect(may('bug')).toBe(true);
  });

  it('takes the skipped type out of the junior spawn rate', () => {
    const busy = consultancy({ skills: { supply: 3 }, tier: 1 });
    const policed = { ...busy, skills: { ...busy.skills, triagePolicy: 1 } };
    expect(juniorSpawnRate(policed)).toBeLessThan(juniorSpawnRate(busy));
    expect(totalSpawnRate(policed)).toBeCloseTo(totalSpawnRate(busy), 6);
  });
});

describe('walking a gendered pool', () => {
  const crews: readonly CrewKind[] = CREW_KINDS;

  it('draws every woman in the pool rather than one of them', () => {
    for (const crew of crews) {
      const every = crewWomanEvery(consultancy(), crew);
      const size = castPoolSize(crew, true);
      const drawn = new Set<string>();
      for (let seat = 0; seat < every * size; seat += 1) {
        if (!hireIsWoman(seat, every)) continue;
        drawn.add(crewName(crew, hirePoolSeat(seat, every), true));
      }
      expect(drawn.size).toBe(size);
    }
  });

  it('draws from the pool the hire belongs to', () => {
    const every = CREW_STATS.juniors.womanEvery;
    for (let seat = 0; seat < 40; seat += 1) {
      const woman = hireIsWoman(seat, every);
      const name = crewName('juniors', hirePoolSeat(seat, every), woman);
      const pool = Array.from(
        { length: castPoolSize('juniors', woman) },
        (_, at) => crewName('juniors', at, woman)
      );
      expect(pool).toContain(name);
    }
  });
});

describe('what a body may take (crewCeiling)', () => {
  const late = consultancy({ tier: 8, levels: { junior: 3, senior: 3 } });

  it('puts a junior strictly below a senior once the ladder has rungs', () => {
    const junior = crewCeiling(late, 'juniors');
    const senior = crewCeiling(late, 'seniors');
    expect(junior).not.toBeNull();
    expect(senior).not.toBeNull();
    expect(TICKET_TYPES[senior!].value).toBeGreaterThan(
      TICKET_TYPES[junior!].value
    );
  });

  it('reaches furthest for the contractors, who have no band at all', () => {
    const offshore = crewCeiling(late, 'offshore');
    const senior = crewCeiling(late, 'seniors');
    expect(TICKET_TYPES[offshore!].value).toBeGreaterThanOrEqual(
      TICKET_TYPES[senior!].value
    );
  });

  it('never names a ticket the tier has not unlocked', () => {
    for (let tier = 0; tier <= 8; tier += 1) {
      const at = consultancy({ tier, levels: { junior: 2, senior: 2 } });
      for (const crew of ['juniors', 'seniors', 'offshore'] as const) {
        const ceiling = crewCeiling(at, crew);
        if (ceiling === null) continue;
        expect(TICKET_TYPES[ceiling].tier).toBeLessThanOrEqual(tier);
      }
    }
  });

  it('falls when automation retires the rung it named', () => {
    const early = consultancy({ tier: 1, levels: { junior: 2 } });
    expect(crewCeiling(early, 'juniors')).toBe('legacy');

    const automated = consultancy({
      tier: 1,
      levels: { junior: 2 },
      skills: { copilot: 1, autoLint: 1, autoBug: 1, autoLegacy: 1 },
    });
    expect(crewCeiling(automated, 'juniors')).toBeNull();
  });
});

describe('the retainer', () => {
  it('bills per second now, because there is no round to bill per', () => {
    const at = consultancy({ tier: 2, levels: { junior: 3 } });
    expect(retainerPerSec(at)).toBeGreaterThan(0);
    expect(retainerPerSec(consultancy({ tier: 2 }))).toBe(0);
  });
});

describe('the can has two axes (parity #13, #14)', () => {
  const slots = (skills: Record<string, number>): number =>
    sprintSlots(consultancy({ skills }));

  it('adds slots a rank at a time, and never scales them', () => {
    const one = slots({ capacity: 1 });
    const two = slots({ capacity: 2 });
    const node = SKILL_BY_ID.get('capacity')!;
    const added = (rank: number): number => {
      const level = node.levels[rank - 1]!.effects[0]!;
      return 'add' in level ? level.add : 0;
    };

    expect(one - slots({})).toBe(added(1));
    expect(two - one).toBe(added(2));
  });

  it('adds a whole swimlane per can, at the same WIP limit', () => {
    const bare = slots({ capacity: 3 });
    expect(slots({ capacity: 3, cans: 1 })).toBe(bare * 2);
    expect(slots({ capacity: 3, cans: 2 })).toBe(bare * 3);
  });

  it('adds desks by the rank, mirroring the reference worker node', () => {
    const none = desks(consultancy());
    expect(desks(consultancy({ skills: { headcount: 1 } })) - none).toBe(
      DESKS_PER_RANK
    );
    expect(desks(consultancy({ skills: { headcount: 3 } })) - none).toBe(
      DESKS_PER_RANK * 3
    );
  });
});

describe('the rates tab (parity #25)', () => {
  const staffed = (income: Record<string, number>): Consultancy =>
    consultancy({ spawners: { 0: 1, 1: 1 }, tier: 1, income });

  it('stays shut until its source is on the path', () => {
    expect(incomeUnlocked(consultancy({ spawners: {} }), 'lint')).toBe(false);
    expect(incomeUnlocked(staffed({}), 'lint')).toBe(true);
    expect(incomeUnlocked(staffed({}), 'swarm')).toBe(false);
  });

  it('adds a flat amount to only the ticket it names', () => {
    const rated = staffed({ lint: 4 });
    const flat = staffed({});
    expect(ticketValue(rated, 'lint') - ticketValue(flat, 'lint')).toBeCloseTo(
      INCOME_VALUE_ADD * 4,
      6
    );
    expect(ticketValue(rated, 'bug')).toBe(ticketValue(flat, 'bug'));
  });

  it('prices the opening heads as the reference does, rounded down', () => {
    const prices = Array.from({ length: 10 }, (_, head) =>
      spawnerCost(consultancy({ spawners: { 0: head + 1 } }), 0)
    );
    expect(prices).toEqual([2, 2, 2, 3, 3, 4, 4, 5, 6, 7]);
    expect(spawnerCost(consultancy({ spawners: { 0: 49 } }), 0)).toBe(1638);
  });

  it('prices the paper row at the reference: 250, 412, 680, 1 123, 1 853', () => {
    const prices = [0, 1, 2, 3, 4].map((rank) =>
      incomeCost(staffed({ lint: rank }), 'lint')
    );
    expect(prices).toEqual([250, 412, 680, 1123, 1853]);
  });

  it('stops at the cap, and asks more for every rank up to it', () => {
    expect(incomeLevel(staffed({ lint: 99 }), 'lint')).toBe(INCOME_CAP);
    expect(incomeCost(staffed({ lint: INCOME_CAP }), 'lint')).toBe(Infinity);

    let last = 0;
    for (let rank = 0; rank < INCOME_CAP; rank += 1) {
      const cost = incomeCost(staffed({ lint: rank }), 'lint');
      expect(cost, `rank ${rank}`).toBeGreaterThan(last);
      last = cost;
    }
  });
});

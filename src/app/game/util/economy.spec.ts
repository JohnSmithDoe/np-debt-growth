import { describe, expect, it } from 'vitest';

import type { Consultancy } from '../model/consultancy.model';
import { freshConsultancy } from '../model/consultancy.model';
import { SAVE_VERSION } from '../model/game.consts';
import { castPoolSize, crewName } from '../model/cast.model';
import { SKILL_BY_ID } from '../model/skill.model';
import { TICKET_TYPES, TICKET_TYPE_IDS } from '../model/ticket.model';
import type { PurchaseId } from '../model/balance/progression';
import type { CrewKind } from '../model/crew.model';
import {
  CREW_WOMAN_EVERY,
  JUNIOR_CLOSE_MS,
  WOMAN_CLOSE_RATE,
} from '../model/balance/crew';
import { SENIOR_BUYOUT_STEPS } from '../model/balance/progression';
import { ROUND_TARGET_OF_BASELINE } from '../model/balance/round';
import { DEBT_TIERS } from '../model/tier.model';
import {
  ceilingPerSec,
  closeRate,
  crewCeilingPerSec,
  juniorCeilingPerSec,
  juniorSpawnRate,
  seniorBatch,
  seniorCeilingPerSec,
  seniorCloseMs,
  crewCeiling,
  crewClaims,
  hireIsWoman,
  hirePoolSeat,
  juniorBatch,
  juniorCloseMs,
  retainerPerRound,
  roundBilled,
  roundLengthMs,
  roundTarget,
  spawnRate,
  sprintSlots,
  totalSpawnRate,
} from './economy';

function consultancy(
  overrides: Partial<Omit<Consultancy, 'levels'>> & {
    readonly levels?: Partial<Record<PurchaseId, number>>;
  } = {}
): Consultancy {
  const fresh = freshConsultancy(0, SAVE_VERSION);
  return {
    ...fresh,
    ...overrides,
    levels: { ...fresh.levels, ...overrides.levels },
  };
}

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

describe('the bucket (C4)', () => {
  it("drains at slots per ROUND, so time is capacity's rival (D53)", () => {
    const state = consultancy({ skills: { capacity: 2 } });
    expect(ceilingPerSec(state)).toBeCloseTo(
      sprintSlots(state) / (roundLengthMs(state) / 1000),
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
      skills: { supply: 5, capacity: 5, spawnLint: 1, spawnBug: 1 },
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
    every: number = CREW_WOMAN_EVERY.juniors
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
      (heads(100) * speed * aura * 1000) / JUNIOR_CLOSE_MS,
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
      (heads(10) * product * 1000) / JUNIOR_CLOSE_MS,
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
      (heads(500) * capped * 1000) / JUNIOR_CLOSE_MS,
      6
    );
    expect(
      juniorCeilingPerSec(crew(8, 0, { juniorPresence: 3 }))
    ).toBeGreaterThan(juniorCeilingPerSec(crew(8, 0, { ticketStacking: 1 })));
  });

  it('counts the women on the crew rather than averaging them away', () => {
    expect(juniorCeilingPerSec(crew(4, 0))).toBeCloseTo(
      (5 * 1000) / JUNIOR_CLOSE_MS,
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
      (heads(4, CREW_WOMAN_EVERY.seniors) * seniorBatch(state) * 1000) /
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
  const crews = Object.keys(CREW_WOMAN_EVERY) as CrewKind[];

  it('draws every woman in the pool rather than one of them', () => {
    for (const crew of crews) {
      const every = CREW_WOMAN_EVERY[crew];
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
    const every = CREW_WOMAN_EVERY.juniors;
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

describe("the client's line (round target)", () => {
  it('is unset until the first ADR is signed', () => {
    expect(roundTarget(consultancy({ tier: 0 }))).toBeNull();
  });

  it('is the rung baseline times the one coefficient', () => {
    for (const tier of DEBT_TIERS) {
      expect(roundTarget(consultancy({ tier: tier.index }))).toBeCloseTo(
        tier.baselinePerRound * ROUND_TARGET_OF_BASELINE,
        6
      );
    }
  });

  it('does not move with the round count', () => {
    const early = consultancy({ tier: 3, roundSeq: 4 });
    const late = consultancy({ tier: 3, roundSeq: 40 });
    expect(roundTarget(early)).toBe(roundTarget(late));
  });

  it('counts the sprint, the retainer and the board', () => {
    const at = consultancy({ tier: 2, levels: { junior: 3 } });
    expect(roundBilled(at, 500, 200)).toBeCloseTo(
      500 + retainerPerRound(at) + 200,
      6
    );
  });
});

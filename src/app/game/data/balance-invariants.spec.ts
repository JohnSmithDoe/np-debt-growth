import { describe, expect, it } from 'vitest';

import { consultancy } from '../model/consultancy.fixture';
import { KIT_ITEMS, KIT_PLAN } from '../model/kit.model';
import { RETYPE_LADDER, TICKET_TYPES } from '../model/ticket.model';
import { SKILL_BY_ID } from '../model/skill.model';
import { ADR_HEADING_ID, DEBT_TIERS, adrNodeId } from '../model/tier.model';
import { CREW_KINDS, CREW_STATS } from '../model/balance/crew';
import { LINE_PLAN } from '../model/balance/progression';
import * as economy from '../util/economy';

/**
 * Relationships the tuning tables have to keep, whatever the numbers become.
 * These are the guard rails for a balance pass: they say nothing about what a
 * knob should be, only that a change has not broken the shape of the ladder.
 */
describe('the debt tier ladder', () => {
  it('asks more for every rung than the one below', () => {
    for (let n = 1; n < DEBT_TIERS.length; n += 1) {
      expect(DEBT_TIERS[n]!.spCost).toBeGreaterThan(DEBT_TIERS[n - 1]!.spCost);
    }
  });

  it('hangs every rung on the tree, chained to the one below', () => {
    for (const tier of DEBT_TIERS) {
      const node = SKILL_BY_ID.get(adrNodeId(tier.index));
      expect(node, `ADR-${tier.index} has no square`).toBeDefined();
      expect(node!.levels[0]!.cost).toBe(tier.spCost);
      expect(node!.requires).toBe(
        tier.index === 1 ? ADR_HEADING_ID : adrNodeId(tier.index - 1)
      );
    }
  });

  it('numbers its rungs by position, so tierAt cannot drift', () => {
    DEBT_TIERS.forEach((tier, at) => expect(tier.index).toBe(at + 1));
  });

  it('names a ticket that the rung actually unlocks', () => {
    for (const tier of DEBT_TIERS) {
      expect(TICKET_TYPES[tier.ticket].tier).toBe(tier.index);
    }
  });
});

describe('the retype ladder', () => {
  it('pays more at every step up, so no rung is dominated', () => {
    for (let n = 1; n < RETYPE_LADDER.length; n += 1) {
      expect(TICKET_TYPES[RETYPE_LADDER[n]!].value).toBeGreaterThan(
        TICKET_TYPES[RETYPE_LADDER[n - 1]!].value
      );
    }
  });

  it('climbs by tier, so a relabel never walks backwards', () => {
    for (let n = 1; n < RETYPE_LADDER.length; n += 1) {
      expect(TICKET_TYPES[RETYPE_LADDER[n]!].tier).toBeGreaterThanOrEqual(
        TICKET_TYPES[RETYPE_LADDER[n - 1]!].tier
      );
    }
  });
});

describe('the crew table', () => {
  it('carries a row for every crew kind', () => {
    expect(CREW_KINDS.length).toBe(new Set(CREW_KINDS).size);
    for (const kind of CREW_KINDS) {
      expect(CREW_STATS[kind]).toBeDefined();
    }
  });

  /** The record is only a tuning surface if the accessors read it. */
  it('is what the game reads, not a decorative duplicate', () => {
    const fresh = consultancy();
    for (const kind of CREW_KINDS) {
      expect(economy.crewWomanEvery(fresh, kind)).toBe(
        CREW_STATS[kind].womanEvery
      );
      expect(economy.crewTakesRares(fresh, kind)).toBe(
        CREW_STATS[kind].takesRares
      );
    }
  });

  it('paces every kind from its own row', () => {
    const fresh = consultancy();
    for (const kind of CREW_KINDS) {
      const pace = economy.crewPace(fresh, kind);
      expect(pace.closeMs).toBeCloseTo(CREW_STATS[kind].closeMs, 6);
      expect(pace.speed).toBeCloseTo(CREW_STATS[kind].walkSpeed, 6);
      expect(pace.batch).toBe(CREW_STATS[kind].batchBase);
      expect(pace.sweep).toBeCloseTo(CREW_STATS[kind].sweepRadius, 6);
    }
  });
});

describe('the kit ladder', () => {
  it('sells exactly as many items as the rail has heads to sell', () => {
    expect(KIT_PLAN.length).toBe(LINE_PLAN.kit.cap);
  });

  it('names every item once', () => {
    expect(new Set(KIT_PLAN.map((item) => item.id)).size).toBe(KIT_ITEMS);
  });
});

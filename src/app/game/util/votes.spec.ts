import { describe, expect, it } from 'vitest';

import { consultancy } from '../model/consultancy.fixture';
import {
  VOTE_BONUS_BASE,
  VOTE_BONUS_PER_RANK,
  VOTE_CYCLE_MS,
  VOTE_ON_MS,
} from '../model/balance/flow';
import { cellY, emptyBoard, voteBeamY, voteCount } from '../model/board.model';
import { SpawnBudget } from './spawn-budget';
import { spawnInto } from './supply';
import * as economy from './economy';

const FLOOR = cellY(0);

describe('planning poker', () => {
  it('holds no vote until a coach is hired', () => {
    expect(economy.voteBonus(consultancy(), 0, FLOOR)).toBe(0);
  });

  it('pays each live vote once, and nothing between votes', () => {
    const five = consultancy({ skills: { coaches: 1 } });
    for (let ms = 0; ms < VOTE_CYCLE_MS; ms += 50) {
      const live = Array.from({ length: economy.coachCount(five) }, (_, beam) =>
        economy.voteLive(five, beam, ms)
      ).filter(Boolean).length;
      expect(economy.voteBonus(five, ms, FLOOR)).toBe(live * VOTE_BONUS_BASE);
    }
    expect(economy.voteLive(five, 0, VOTE_ON_MS + 1)).toBe(false);
  });

  it('passes over work that lands above its beam', () => {
    const two = consultancy({ skills: { coaches: 1 } });
    const between = (voteBeamY(0) + voteBeamY(1)) / 2;
    for (let ms = 0; ms < VOTE_CYCLE_MS; ms += 50) {
      expect(economy.voteBonus(two, ms, voteBeamY(0) - 1)).toBe(0);
      expect(economy.voteBonus(two, ms, between)).toBe(
        economy.voteLive(two, 0, ms) ? VOTE_BONUS_BASE : 0
      );
    }
  });

  it('adds the deck per vote, and every coach votes on its own beat', () => {
    const state = consultancy({ skills: { coaches: 1, deck: 1 } });
    const perVote =
      VOTE_BONUS_BASE + economy.coachCount(state) * VOTE_BONUS_PER_RANK;
    expect(economy.voteBonusPerCrossing(state)).toBe(perVote);

    let seen = 0;
    for (let ms = 0; ms < VOTE_CYCLE_MS; ms += 50) {
      seen = Math.max(seen, economy.voteBonus(state, ms, FLOOR) / perVote);
    }
    expect(seen).toBeGreaterThanOrEqual(1);
    expect(seen).toBeLessThan(economy.coachCount(state));
  });

  it('names the beams it pays for, so the stage can light those and no others', () => {
    const state = consultancy({ skills: { coaches: 1, deck: 1 } });
    const between = (voteBeamY(1) + voteBeamY(2)) / 2;
    for (let ms = 0; ms < VOTE_CYCLE_MS; ms += 50) {
      const mask = economy.voteMask(state, ms, between);
      expect(mask & ~0b11).toBe(0);
      for (const beam of [0, 1]) {
        expect(Boolean(mask & (1 << beam))).toBe(
          economy.voteLive(state, beam, ms)
        );
      }
      expect(economy.voteBonus(state, ms, between)).toBe(
        voteCount(mask) * economy.voteBonusPerCrossing(state)
      );
    }
  });

  it('carries the mask on every spawned ticket it pays', () => {
    const state = consultancy({
      tier: 0,
      spawners: { 0: 40 },
      skills: { coaches: 1 },
    });
    const board = emptyBoard();
    const budget = new SpawnBudget();
    for (let step = 0; step < 100; step += 1) {
      spawnInto(board, budget, { ...state, runMs: step * 100 }, 0.1);
    }
    expect(board.tickets.some((ticket) => ticket.voteMask !== 0)).toBe(true);
    for (const ticket of board.tickets) {
      expect(ticket.spBonus).toBe(
        voteCount(ticket.voteMask) * economy.voteBonusPerCrossing(state)
      );
    }
  });

  it('never re-estimates golden work', () => {
    const state = consultancy({
      tier: 0,
      spawners: { 0: 40 },
      skills: { golden: 1, coaches: 1, coaches6: 1, deck: 1, deck6: 1 },
    });
    const board = emptyBoard();
    const budget = new SpawnBudget();
    for (let step = 0; step < 200; step += 1) {
      spawnInto(
        board,
        budget,
        { ...state, runMs: step * 100 },
        0.1,
        () => 0.001
      );
    }
    const golden = board.tickets.filter((ticket) => ticket.golden);
    expect(golden.length).toBeGreaterThan(0);
    expect(golden.every((ticket) => ticket.spBonus === 0)).toBe(true);
  });
});

describe('the pizza party', () => {
  it('sends no voucher until the node is bought', () => {
    expect(economy.spawnRate(consultancy(), 'pizza')).toBe(0);
    expect(
      economy.spawnRate(consultancy({ skills: { pizza: 1 } }), 'pizza')
    ).toBeGreaterThan(0);
  });

  it('rushes the crew only while the pizza lasts', () => {
    const party = { x: 100, y: 100, until: 5_000 };
    expect(
      economy.pizzaRush(consultancy({ pizza: party, lastTick: 4_000 }))
    ).not.toBeNull();
    expect(
      economy.pizzaRush(consultancy({ pizza: party, lastTick: 5_000 }))
    ).toBeNull();
  });
});

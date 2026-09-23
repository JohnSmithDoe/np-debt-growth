import { describe, expect, it } from 'vitest';

import { consultancy } from '../model/consultancy.fixture';
import {
  VOTE_BONUS_BASE,
  VOTE_BONUS_PER_RANK,
  VOTE_CYCLE_MS,
  VOTE_ON_MS,
} from '../model/balance/flow';
import { emptyBoard } from '../model/board.model';
import { SpawnBudget } from './spawn-budget';
import { spawnInto } from './supply';
import * as economy from './economy';

describe('planning poker (the reference gum angels)', () => {
  it('holds no vote until a coach is hired', () => {
    expect(economy.voteBonus(consultancy(), 0)).toBe(0);
  });

  it('pays each live vote once, and nothing between votes', () => {
    const one = consultancy({ skills: { coaches: 1 } });
    expect(economy.voteBonus(one, 0)).toBe(VOTE_BONUS_BASE);
    expect(economy.voteBonus(one, VOTE_ON_MS + 1)).toBe(0);
    expect(economy.voteBonus(one, VOTE_CYCLE_MS)).toBe(VOTE_BONUS_BASE);
  });

  it('adds the deck per vote, and every coach votes on its own beat', () => {
    const state = consultancy({ skills: { coaches: 4, deck: 2 } });
    const perVote = VOTE_BONUS_BASE + 2 * VOTE_BONUS_PER_RANK;
    expect(economy.voteBonusPerCrossing(state)).toBe(perVote);

    let seen = 0;
    for (let ms = 0; ms < VOTE_CYCLE_MS; ms += 50) {
      seen = Math.max(seen, economy.voteBonus(state, ms) / perVote);
    }
    expect(seen).toBeGreaterThanOrEqual(1);
    expect(seen).toBeLessThan(4);
  });

  it('never re-estimates golden work', () => {
    const state = consultancy({
      tier: 0,
      spawners: { 0: 40 },
      skills: { golden: 1, coaches: 10, deck: 10 },
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

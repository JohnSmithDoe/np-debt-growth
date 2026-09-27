import { describe, expect, it } from 'vitest';

import { consultancy, ranksOf } from '../model/consultancy.fixture';
import { emptyBoard } from '../model/board.model';
import { addTicket, work } from './board';
import { crewRules } from './crew-rules';
import { CALM } from '../model/hazard.model';
import * as economy from './economy';

describe('golden work (the automation-exempt class)', () => {
  it('does not arrive until it is bought', () => {
    expect(economy.goldenChance(consultancy())).toBe(0);
    expect(
      economy.goldenChance(consultancy({ skills: { golden: 1 } }))
    ).toBeCloseTo(0.02, 6);
  });

  it('pays far more than the same ticket plain', () => {
    const bought = consultancy({ skills: { golden: 1 } });
    expect(economy.goldenMultiplier(bought)).toBeGreaterThan(50);
  });

  it('climbs additively, 100× to 300× over the ladder', () => {
    const at = (ranks: number): number =>
      economy.goldenMultiplier(
        consultancy({ skills: { golden: 1, ...ranksOf('goldenValue', ranks) } })
      );
    expect(at(0)).toBe(100);
    expect(at(1)).toBe(150);
    expect(at(4)).toBe(300);
  });

  it('turns a share of the crew’s closes golden once they are cleared', () => {
    expect(
      economy.crewGoldenConversion(consultancy({ skills: { golden: 1 } }))
    ).toBe(0);
    expect(
      economy.crewGoldenConversion(
        consultancy({ skills: { golden: 1, goldenValue: 1, goldenCrew: 1 } })
      )
    ).toBeCloseTo(0.05, 6);
  });

  it('is left on the board by a crew that has no clearance', () => {
    const state = consultancy({ levels: { junior: 8 }, skills: { golden: 1 } });
    const board = emptyBoard();
    addTicket(board, 'lint', () => 0.5, false, true);

    const [rules] = crewRules(board, state, CALM).filter(
      (row) => row.kind === 'juniors'
    );
    expect(rules?.golden).toBe(false);

    for (let step = 0; step < 400; step += 1) {
      work(board, rules!, 100, () => 0.5);
    }
    expect(board.tickets.length).toBe(1);
  });

  it('is taken once the clearance is bought', () => {
    const state = consultancy({
      levels: { junior: 8 },
      skills: { golden: 1, goldenValue: 1, goldenCrew: 1 },
    });
    const board = emptyBoard();
    addTicket(board, 'lint', () => 0.5, false, true);

    const [rules] = crewRules(board, state, CALM).filter(
      (row) => row.kind === 'juniors'
    );
    expect(rules?.golden).toBe(true);
  });
});

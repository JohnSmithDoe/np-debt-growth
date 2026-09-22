import { describe, expect, it } from 'vitest';

import type { TicketMix } from '../model/board.model';
import type { Consultancy } from '../model/consultancy.model';
import { consultancy } from '../model/consultancy.fixture';
import { SPRINT_SLOTS_BASE } from '../model/balance/round';
import { HOTFIX_MS } from '../model/balance/weather';
import { sprintInvoice, sprintPayout } from './economy';

describe('the itemised invoice', () => {
  const mix: TicketMix = { lint: 5, bug: 4, legacy: 3 };
  const over: TicketMix = { lint: SPRINT_SLOTS_BASE + 40, bug: 6 };

  const cases: readonly (readonly [string, Consultancy, TicketMix, number])[] =
    [
      ['a plain sprint', consultancy(), mix, 0],
      ['an empty sprint', consultancy(), {}, 0],
      ['over capacity', consultancy(), over, 0],
      [
        'a Hotfix Window open at the bell',
        consultancy({ hotfixUntil: HOTFIX_MS }),
        mix,
        1,
      ],
      ['an Escalation armed', consultancy({ escalated: true }), mix, 0],
      [
        'all three at once',
        consultancy({ hotfixUntil: HOTFIX_MS, escalated: true }),
        over,
        1,
      ],
    ];

  for (const [name, state, held, now] of cases) {
    it(`reconciles with sprintPayout — ${name}`, () => {
      const invoice = sprintInvoice(state, held, now);
      expect(invoice.gross).toBeCloseTo(sprintPayout(state, held, now), 6);
    });

    it(`sums its own lines and terms — ${name}`, () => {
      const invoice = sprintInvoice(state, held, now);
      const lines = invoice.lines.reduce((sum, line) => sum + line.total, 0);
      expect(lines).toBeCloseTo(invoice.subtotal, 6);
      expect(
        invoice.subtotal +
          invoice.hotfix +
          invoice.overflow +
          invoice.escalation
      ).toBeCloseTo(invoice.gross, 6);
    });
  }

  it('signs the overflow as a cost and the buffs as gains', () => {
    const spilled = sprintInvoice(consultancy(), over, 0);
    expect(spilled.overflow).toBeLessThan(0);
    expect(spilled.hotfix).toBe(0);

    const buffed = sprintInvoice(
      consultancy({ hotfixUntil: HOTFIX_MS, escalated: true }),
      mix,
      1
    );
    expect(buffed.hotfix).toBeGreaterThan(0);
    expect(buffed.escalation).toBeGreaterThan(0);
    expect(buffed.overflow).toBe(0);
  });

  it('reads dearest first, because that is the line worth reading', () => {
    const { lines } = sprintInvoice(consultancy(), mix, 0);
    const totals = lines.map((line) => line.total);
    expect([...totals].sort((a, b) => b - a)).toEqual(totals);
  });
});

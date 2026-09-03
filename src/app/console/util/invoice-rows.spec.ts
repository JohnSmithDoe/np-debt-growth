import { describe, expect, it } from 'vitest';

import type { RoundInvoice } from '../../game/model/invoice.model';
import { EMPTY_INVOICE } from '../../game/model/invoice.model';
import { invoiceRows } from './invoice-rows';

const invoice = (over: Partial<RoundInvoice> = {}): RoundInvoice => ({
  ...EMPTY_INVOICE,
  ...over,
});

const keys = (document: RoundInvoice): string[] =>
  invoiceRows(document).map((row) => row.key);

describe('the invoice, in words', () => {
  const oneLine = invoice({
    lines: [{ type: 'lint', count: 4, each: 1, total: 4 }],
    count: 4,
    capacity: 14,
    subtotal: 4,
    gross: 4,
    billed: 4,
  });

  it('drops a term the round never had', () => {
    expect(keys(oneLine)).toEqual(['lint']);
  });

  it('omits a subtotal that sums one line and is followed by nothing', () => {
    expect(keys(oneLine)).not.toContain('subtotal');
  });

  it('prints the subtotal once there is more than one thing to add up', () => {
    expect(
      keys(
        invoice({
          ...oneLine,
          lines: [
            { type: 'lint', count: 4, each: 1, total: 4 },
            { type: 'bug', count: 2, each: 4, total: 8 },
          ],
        })
      )
    ).toContain('subtotal');

    expect(keys(invoice({ ...oneLine, retainer: 20 }))).toContain('subtotal');
  });

  it('keeps every term that is in play, in the order the code applies them', () => {
    const rich = invoice({
      lines: [
        { type: 'conflict', count: 9, each: 90, total: 810 },
        { type: 'lint', count: 4, each: 1, total: 4 },
      ],
      count: 13,
      capacity: 14,
      subtotal: 814,
      hotfix: 814,
      overflow: -100,
      escalation: 2000,
      gross: 3528,
      skimmed: -300,
      storyPoints: 42,
      retainer: 120,
      board: 5000,
      billed: 8348,
    });
    expect(keys(rich)).toEqual([
      'conflict',
      'lint',
      'subtotal',
      'hotfix',
      'overflow',
      'escalation',
      'board',
      'retainer',
      'skimmed',
    ]);
  });

  it('marks a cost as spent and a gain as not', () => {
    const rows = invoiceRows(
      invoice({ ...oneLine, overflow: -100, hotfix: 50 })
    );
    const by = new Map(rows.map((row) => [row.key, row]));
    expect(by.get('overflow')?.negative).toBe(true);
    expect(by.get('hotfix')?.negative).toBe(false);
    expect(by.get('overflow')?.value.startsWith('−')).toBe(true);
  });

  it('says nothing at all about a round that never billed', () => {
    expect(invoiceRows(EMPTY_INVOICE)).toEqual([]);
  });
});

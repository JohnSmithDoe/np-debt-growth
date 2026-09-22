import type { RoundInvoice } from '../../game/model/invoice.model';
import { TICKET_TYPES, ticketLabelKey } from '../../game/model/ticket.model';
import { formatMoney, formatPoints } from '../../@shared/util/format-quantity';

export interface InvoiceRow {
  readonly key: string;
  readonly labelKey: string | null;
  readonly label: string;
  readonly detail: string;
  readonly value: string;
  readonly negative: boolean;
  readonly rule: boolean;
}

const money = (value: number): string =>
  `${value < 0 ? '−' : ''}${formatMoney(Math.abs(value))}`;

const term = (
  key: string,
  label: string,
  detail: string,
  value: number,
  options: { readonly rule?: boolean; readonly always?: boolean } = {}
): InvoiceRow | null =>
  value === 0 && options.always !== true
    ? null
    : {
        key,
        labelKey: null,
        label,
        detail,
        value: money(value),
        negative: value < 0,
        rule: options.rule ?? false,
      };

const listed = (rows: readonly (InvoiceRow | null)[]): InvoiceRow[] =>
  rows.filter((row): row is InvoiceRow => row !== null);

export function invoiceRows(invoice: RoundInvoice): readonly InvoiceRow[] {
  const work = invoice.lines.map((line) => ({
    key: line.type,
    labelKey: ticketLabelKey(line.type),
    label: TICKET_TYPES[line.type].prefix,
    detail: `${line.count} × ${formatMoney(line.each)}`,
    value: money(line.total),
    negative: false,
    rule: false,
  }));

  const weather = listed([
    term('hotfix', 'Hotfix Window', 'open at the bell', invoice.hotfix),
    term(
      'escalation',
      'Enterprise Escalation',
      'the whole sprint, repriced',
      invoice.escalation
    ),
    term('board', 'Quarter End', 'the board, billed outright', invoice.board),
    term('retainer', 'Retainer', 'per head on the floor', invoice.retainer),
    term(
      'skimmed',
      'Velocity Accounting',
      `booked as ${formatPoints(invoice.storyPoints)} SP`,
      invoice.skimmed,
      { rule: true }
    ),
  ]);

  const sums = work.length > 1 || weather.length > 0;

  return [
    ...work,
    ...(sums
      ? listed([
          term('subtotal', 'Work triaged', '', invoice.subtotal, {
            rule: true,
            always: true,
          }),
        ])
      : []),
    ...weather,
  ];
}

import type { TicketTypeId } from './ticket.model';

export interface InvoiceLine {
  readonly type: TicketTypeId;
  readonly count: number;
  readonly each: number;
  readonly total: number;
}

export interface SprintInvoice {
  readonly lines: readonly InvoiceLine[];
  readonly count: number;
  readonly capacity: number;
  readonly subtotal: number;
  readonly hotfix: number;
  readonly escalation: number;
  readonly gross: number;
}

export interface RoundInvoice extends SprintInvoice {
  readonly skimmed: number;
  readonly storyPoints: number;
  readonly retainer: number;
  readonly board: number;
  readonly billed: number;
}

export const EMPTY_INVOICE: RoundInvoice = {
  lines: [],
  count: 0,
  capacity: 0,
  subtotal: 0,
  hotfix: 0,
  escalation: 0,
  gross: 0,
  skimmed: 0,
  storyPoints: 0,
  retainer: 0,
  board: 0,
  billed: 0,
};

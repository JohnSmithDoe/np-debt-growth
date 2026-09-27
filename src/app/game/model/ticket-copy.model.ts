import type { TicketTypeId } from './ticket.model';

export const TICKET_TITLE_COUNTS: Readonly<Record<TicketTypeId, number>> = {
  lint: 20,
  bug: 20,
  legacy: 20,
  flaky: 20,
  conflict: 20,
  slop: 20,
  rockstar: 20,
  zombie: 20,
  rewrite: 20,
  swarm: 20,
  incident: 20,
  escalation: 20,
  pizza: 6,
  hotfix: 8,
  quarter: 6,
  invite: 10,
};

export const ticketTitleKey = (id: TicketTypeId, index: number): string =>
  `ticket.title.${id}.${index}`;

export function pickTicketTitle(id: TicketTypeId): string {
  const count = TICKET_TITLE_COUNTS[id];
  const index = Math.min(
    count - 1,
    Math.max(0, Math.floor(Math.random() * count))
  );
  return ticketTitleKey(id, index);
}

import type { TicketTypeId } from './ticket.model';

/**
 * An ADR is a tree node: it unlocks the spawner line and the ticket type
 * together, and it is paid for in story points like every other node.
 */
export interface DebtTier {
  readonly index: number;
  readonly spCost: number;
  readonly ticket: TicketTypeId;
}

export const tierNameKey = (index: number): string => `tier.${index}.name`;
export const tierBlurbKey = (index: number): string => `tier.${index}.blurb`;

export const DEBT_TIERS: readonly DebtTier[] = [
  { index: 1, spCost: 750, ticket: 'legacy' },
  { index: 2, spCost: 10_000, ticket: 'flaky' },
  { index: 3, spCost: 300_000, ticket: 'conflict' },
  { index: 4, spCost: 500_000, ticket: 'slop' },
  { index: 5, spCost: 800_000, ticket: 'rockstar' },
  { index: 6, spCost: 1_200_000, ticket: 'zombie' },
  { index: 7, spCost: 1_400_000, ticket: 'rewrite' },
  { index: 8, spCost: 1_600_000, ticket: 'swarm' },
];

export const MAX_TIER = DEBT_TIERS.length;

export function tierAt(index: number): DebtTier | undefined {
  return DEBT_TIERS[index - 1];
}

/** The tree node that approves a rung; `adrNodeId(3)` is ADR-3's square. */
export const adrNodeId = (index: number): string => `adr${index}`;

export const ADR_HEADING_ID = 'adrs';

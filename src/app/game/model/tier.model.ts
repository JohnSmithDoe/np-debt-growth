import type { TicketTypeId } from './ticket.model';

export interface DebtTier {
  readonly index: number;
  readonly spCost: number;
  readonly ticket: TicketTypeId;
}

export const tierNameKey = (index: number): string => `tier.${index}.name`;
export const tierBlurbKey = (index: number): string => `tier.${index}.blurb`;

export const ACCEPTANCE_EPIC_KEY = 'epic.acceptance.name';
export const epicNameKey = (index: number): string => `epic.${index}.name`;
export const epicKey = (tier: number, accepting: boolean): string =>
  accepting ? ACCEPTANCE_EPIC_KEY : epicNameKey(tier);

export type AdrPart = 'context' | 'decision' | 'consequences';
export const ADR_PARTS: readonly AdrPart[] = [
  'context',
  'decision',
  'consequences',
];
export const adrPartKey = (index: number, part: AdrPart): string =>
  `adr.${index}.${part}`;

export const DEBT_TIERS: readonly DebtTier[] = [
  { index: 1, spCost: 350, ticket: 'legacy' },
  { index: 2, spCost: 6000, ticket: 'flaky' },
  { index: 3, spCost: 45_000, ticket: 'conflict' },
  { index: 4, spCost: 120_000, ticket: 'slop' },
  { index: 5, spCost: 160_000, ticket: 'rockstar' },
  { index: 6, spCost: 480_000, ticket: 'zombie' },
  { index: 7, spCost: 2_600_000, ticket: 'rewrite' },
  { index: 8, spCost: 5_400_000, ticket: 'swarm' },
];

export const MAX_TIER = DEBT_TIERS.length;

export function tierAt(index: number): DebtTier | undefined {
  return DEBT_TIERS[index - 1];
}

export const adrNodeId = (index: number): string => `adr${index}`;

export const ADR_HEADING_ID = 'adrs';

import type { TicketTypeId } from './ticket.model';

export interface DebtTier {
  readonly index: number;
  readonly unlockCost: number;
  readonly ticket: TicketTypeId;
  readonly baselinePerRound: number;
}

export const tierNameKey = (index: number): string => `tier.${index}.name`;
export const tierBlurbKey = (index: number): string => `tier.${index}.blurb`;

export const DEBT_TIERS: readonly DebtTier[] = [
  {
    index: 1,
    unlockCost: 130,
    ticket: 'legacy',
    baselinePerRound: 203,
  },
  {
    index: 2,
    unlockCost: 650,
    ticket: 'flaky',
    baselinePerRound: 900,
  },
  {
    index: 3,
    unlockCost: 3_500,
    ticket: 'conflict',
    baselinePerRound: 6_300,
  },
  {
    index: 4,
    unlockCost: 20_000,
    ticket: 'slop',
    baselinePerRound: 34_600,
  },
  {
    index: 5,
    unlockCost: 140_000,
    ticket: 'rockstar',
    baselinePerRound: 281_000,
  },
  {
    index: 6,
    unlockCost: 2_200_000,
    ticket: 'zombie',
    baselinePerRound: 1_490_000,
  },
  {
    index: 7,
    unlockCost: 110_000_000,
    ticket: 'rewrite',
    baselinePerRound: 12_200_000,
  },
  {
    index: 8,
    unlockCost: 280_000_000,
    ticket: 'swarm',
    baselinePerRound: 77_000_000,
  },
];

export const MAX_TIER = DEBT_TIERS.length;

export function tierAt(index: number): DebtTier | undefined {
  return DEBT_TIERS[index - 1];
}

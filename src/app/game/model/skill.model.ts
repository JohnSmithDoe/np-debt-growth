import type { TicketTypeId } from './ticket.model';
import type { PurchaseId } from './balance/progression';
import type { CrewKind } from './crew.model';
import {
  DEBT_INTEREST_PER_RANK,
  GOLDEN_VALUE_PER_RANK,
  VOTE_BONUS_PER_RANK,
} from './balance/flow';
import { WIP_LIMIT_STEP } from './balance/round';
import { DESKS_PER_RANK } from './balance/crew';
import { ADR_HEADING_ID, DEBT_TIERS, adrNodeId } from './tier.model';

export type SkillEffect =
  | { readonly kind: 'none' }
  | { readonly kind: 'clickRadius'; readonly mult: number }
  | { readonly kind: 'slots'; readonly add: number }
  | { readonly kind: 'cans'; readonly add: number }
  | { readonly kind: 'desks'; readonly add: number }
  | { readonly kind: 'adr'; readonly adr: number }
  | { readonly kind: 'roundLength'; readonly seconds: number }
  | { readonly kind: 'junior'; readonly mult: number }
  | { readonly kind: 'juniorWalk'; readonly mult: number }
  | {
      readonly kind: 'standupAura';
      readonly perJunior: number;
      readonly cap: number;
    }
  | {
      readonly kind: 'juniorBatch';
      readonly add: number;
      readonly closeMult: number;
    }
  | { readonly kind: 'juniorSweep'; readonly mult: number }
  | { readonly kind: 'juniorBand'; readonly add: number }
  | {
      readonly kind: 'triagePolicy';
      readonly crew: CrewKind;
      readonly target: TicketTypeId;
    }
  | { readonly kind: 'nearestClaim' }
  | { readonly kind: 'autoClose'; readonly target: TicketTypeId }
  | { readonly kind: 'autoCloseSpeed'; readonly mult: number }
  | { readonly kind: 'runners'; readonly add: number }
  | {
      readonly kind: 'spPerClose';
      readonly add: number;
      readonly target?: TicketTypeId;
    }
  | { readonly kind: 'crewSp' }
  | { readonly kind: 'pizza' }
  | { readonly kind: 'coach'; readonly add: number }
  | { readonly kind: 'deck'; readonly add: number }
  | { readonly kind: 'senior'; readonly mult: number }
  | { readonly kind: 'seniorWalk'; readonly mult: number }
  | { readonly kind: 'seniorBatch'; readonly add: number }
  | { readonly kind: 'seniorSweep'; readonly mult: number }
  | { readonly kind: 'topOfBand' }
  | { readonly kind: 'copilot'; readonly mult: number }
  | { readonly kind: 'manager'; readonly mult: number }
  | { readonly kind: 'managerWalk'; readonly mult: number }
  | { readonly kind: 'relabelSteps'; readonly add: number }
  | { readonly kind: 'relabelFillerFirst' }
  | {
      readonly kind: 'ticketValue';
      readonly target: TicketTypeId;
      readonly mult: number;
    }
  | { readonly kind: 'escalation'; readonly mult: number }
  | {
      readonly kind: 'spawnRate';
      readonly target?: TicketTypeId;
      readonly mult: number;
    }
  | { readonly kind: 'debtInterest'; readonly approach: number }
  | { readonly kind: 'global'; readonly mult: number }
  | { readonly kind: 'goldenChance'; readonly add: number }
  | { readonly kind: 'goldenValue'; readonly add: number }
  | { readonly kind: 'goldenCrew' }
  | { readonly kind: 'line'; readonly line: PurchaseId };

export type SkillGate =
  | 'junior'
  | 'senior'
  | 'manager'
  | 'tier1'
  | 'tier2'
  | 'tier3'
  | 'tier4'
  | 'tier5'
  | 'tier6'
  | 'tier7'
  | 'tier8';

export type SkillTrack =
  'root' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'N' | 'O' | 'secret';

export type SkillCurrency = 'sp' | 'eur';

export interface SkillLevel {
  readonly cost: number;
  readonly effects: readonly SkillEffect[];
}

export interface SkillNode {
  readonly id: string;
  readonly track: SkillTrack;
  readonly currency?: SkillCurrency;
  readonly requires: string | null;
  readonly gate?: SkillGate;
  readonly granted?: boolean;
  readonly heading?: boolean;
  readonly levels: readonly SkillLevel[];
}

export interface SkillLock {
  readonly key: string;
  readonly params?: Readonly<Record<string, string | number>>;
  readonly resolveParams?: readonly string[];
}

export const skillLabelKey = (id: string, level = 1): string =>
  `skill.${id}.${level}.label`;

export const skillBlurbKey = (id: string): string => `skill.${id}.blurb`;

/**
 * One node per ADR, chained. Approving it opens that rung's spawner line and
 * the ticket type it drops — the two arrive together, as one purchase.
 */
const ADR_NODES: readonly SkillNode[] = DEBT_TIERS.map((tier) => ({
  id: adrNodeId(tier.index),
  track: 'N' as const,
  requires: tier.index === 1 ? ADR_HEADING_ID : adrNodeId(tier.index - 1),
  levels: [
    { cost: tier.spCost, effects: [{ kind: 'adr' as const, adr: tier.index }] },
  ],
}));

export const SKILL_NODES: readonly SkillNode[] = [
  {
    id: 'root',
    track: 'root',
    requires: null,
    levels: [{ cost: 0, effects: [{ kind: 'none' }] }],
  },

  { id: 'hand', track: 'A', requires: 'root', heading: true, levels: [] },
  { id: 'crew', track: 'B', requires: 'root', heading: true, levels: [] },
  { id: 'tooling', track: 'F', requires: 'root', heading: true, levels: [] },
  { id: 'debt', track: 'D', requires: 'root', heading: true, levels: [] },
  { id: 'client', track: 'C', requires: 'root', heading: true, levels: [] },
  { id: 'office', track: 'O', requires: 'root', heading: true, levels: [] },
  {
    id: ADR_HEADING_ID,
    track: 'N',
    requires: 'root',
    heading: true,
    levels: [],
  },
  ...ADR_NODES,

  {
    id: 'radius',
    track: 'A',
    requires: 'hand',
    levels: [
      { cost: 100, effects: [{ kind: 'clickRadius', mult: 1.25 }] },
      { cost: 440, effects: [{ kind: 'clickRadius', mult: 1.28 }] },
      { cost: 1650, effects: [{ kind: 'clickRadius', mult: 1.22 }] },
    ],
  },
  {
    id: 'capacity',
    track: 'A',
    requires: 'radius',
    levels: [
      120, 300, 750, 1900, 4800, 12_000, 30_000, 75_000, 190_000, 480_000,
    ].map((cost) => ({
      cost,
      effects: [{ kind: 'slots' as const, add: WIP_LIMIT_STEP }],
    })),
  },
  {
    id: 'cans',
    track: 'A',
    requires: 'capacity',
    gate: 'tier1',
    levels: [
      1500, 1800, 5400, 16_000, 48_000, 140_000, 420_000, 1_250_000, 3_750_000,
    ].map((cost) => ({ cost, effects: [{ kind: 'cans' as const, add: 1 }] })),
  },
  {
    id: 'duration',
    track: 'A',
    requires: 'radius',
    levels: [
      { cost: 80, effects: [{ kind: 'roundLength', seconds: 3 }] },
      { cost: 300, effects: [{ kind: 'roundLength', seconds: 5 }] },
      { cost: 900, effects: [{ kind: 'roundLength', seconds: 7 }] },
      { cost: 2600, effects: [{ kind: 'roundLength', seconds: 9 }] },
      { cost: 7000, effects: [{ kind: 'roundLength', seconds: 11 }] },
    ],
  },
  {
    id: 'lineOfSight',
    track: 'A',
    requires: 'radius',
    levels: [{ cost: 600, effects: [{ kind: 'nearestClaim' }] }],
  },

  {
    id: 'junior',
    track: 'B',
    requires: 'crew',
    levels: [{ cost: 1200, effects: [{ kind: 'line', line: 'junior' }] }],
  },
  {
    id: 'headcount',
    track: 'B',
    requires: 'juniorSpeed',
    levels: [20_000, 60_000, 180_000, 540_000, 1_600_000].map((cost) => ({
      cost,
      effects: [{ kind: 'desks' as const, add: DESKS_PER_RANK }],
    })),
  },
  {
    id: 'juniorSpeed',
    track: 'B',
    requires: 'junior',
    gate: 'junior',
    levels: [
      {
        cost: 1500,
        effects: [
          { kind: 'junior', mult: 1.25 },
          { kind: 'juniorWalk', mult: 1.2 },
        ],
      },
      {
        cost: 4000,
        effects: [
          { kind: 'junior', mult: 1.22 },
          { kind: 'juniorWalk', mult: 1.18 },
        ],
      },
      {
        cost: 10_000,
        effects: [
          { kind: 'junior', mult: 1.2 },
          { kind: 'juniorWalk', mult: 1.15 },
        ],
      },
    ],
  },
  {
    id: 'juniorReach',
    track: 'B',
    requires: 'junior',
    gate: 'junior',
    levels: [
      { cost: 120, effects: [{ kind: 'juniorSweep', mult: 1.3 }] },
      {
        cost: 450,
        effects: [
          { kind: 'juniorSweep', mult: 1.25 },
          { kind: 'juniorBand', add: 1 },
        ],
      },
      { cost: 1500, effects: [{ kind: 'juniorSweep', mult: 1.2 }] },
    ],
  },
  {
    id: 'juniorPresence',
    track: 'B',
    requires: 'junior',
    gate: 'junior',
    levels: [
      {
        cost: 200,
        effects: [{ kind: 'standupAura', perJunior: 0.02, cap: 1.5 }],
      },
      {
        cost: 1200,
        effects: [{ kind: 'standupAura', perJunior: 0.015, cap: 1.6 }],
      },
    ],
  },
  {
    id: 'ticketStacking',
    track: 'B',
    requires: 'juniorPresence',
    gate: 'junior',
    levels: [
      { cost: 700, effects: [{ kind: 'juniorBatch', add: 1, closeMult: 2 }] },
    ],
  },

  {
    id: 'senior',
    track: 'E',
    requires: 'junior',
    levels: [{ cost: 600, effects: [{ kind: 'line', line: 'senior' }] }],
  },
  {
    id: 'seniorSpeed',
    track: 'E',
    requires: 'senior',
    gate: 'senior',
    levels: [
      {
        cost: 400,
        effects: [
          { kind: 'senior', mult: 1.22 },
          { kind: 'seniorWalk', mult: 1.2 },
        ],
      },
      {
        cost: 1300,
        effects: [
          { kind: 'senior', mult: 1.2 },
          { kind: 'seniorWalk', mult: 1.18 },
        ],
      },
      {
        cost: 4000,
        effects: [
          { kind: 'senior', mult: 1.18 },
          { kind: 'seniorWalk', mult: 1.15 },
        ],
      },
    ],
  },
  {
    id: 'seniorReach',
    track: 'E',
    requires: 'senior',
    gate: 'senior',
    levels: [
      { cost: 550, effects: [{ kind: 'seniorSweep', mult: 1.25 }] },
      { cost: 1700, effects: [{ kind: 'seniorSweep', mult: 1.2 }] },
      { cost: 5000, effects: [{ kind: 'seniorSweep', mult: 1.18 }] },
    ],
  },
  {
    id: 'seniorPresence',
    track: 'E',
    requires: 'senior',
    gate: 'senior',
    levels: [
      { cost: 900, effects: [{ kind: 'seniorBatch', add: 1 }] },
      { cost: 2600, effects: [{ kind: 'seniorBatch', add: 1 }] },
      { cost: 7500, effects: [{ kind: 'topOfBand' }] },
    ],
  },

  {
    id: 'manager',
    track: 'H',
    requires: 'senior',
    levels: [{ cost: 9000, effects: [{ kind: 'line', line: 'manager' }] }],
  },
  {
    id: 'managerSpeed',
    track: 'H',
    requires: 'manager',
    gate: 'manager',
    levels: [
      {
        cost: 700,
        effects: [
          { kind: 'manager', mult: 1.25 },
          { kind: 'managerWalk', mult: 1.2 },
        ],
      },
      {
        cost: 2000,
        effects: [
          { kind: 'manager', mult: 1.22 },
          { kind: 'managerWalk', mult: 1.18 },
        ],
      },
      {
        cost: 6000,
        effects: [
          { kind: 'manager', mult: 1.2 },
          { kind: 'managerWalk', mult: 1.15 },
        ],
      },
    ],
  },
  {
    id: 'relabel',
    track: 'H',
    requires: 'manager',
    gate: 'manager',
    levels: [
      { cost: 1100, effects: [{ kind: 'relabelSteps', add: 1 }] },
      { cost: 3300, effects: [{ kind: 'relabelFillerFirst' }] },
      { cost: 9000, effects: [{ kind: 'relabelSteps', add: 1 }] },
    ],
  },

  {
    id: 'copilot',
    track: 'F',
    requires: 'tooling',
    levels: [{ cost: 200, effects: [{ kind: 'line', line: 'copilot' }] }],
  },
  {
    id: 'copilotYield',
    track: 'F',
    requires: 'copilot',
    levels: [
      { cost: 40, effects: [{ kind: 'copilot', mult: 1.4 }] },
      { cost: 160, effects: [{ kind: 'copilot', mult: 1.3 }] },
      { cost: 550, effects: [{ kind: 'copilot', mult: 1.25 }] },
      { cost: 1800, effects: [{ kind: 'copilot', mult: 1.2 }] },
      { cost: 5500, effects: [{ kind: 'copilot', mult: 1.18 }] },
    ],
  },
  {
    id: 'automationSpeed',
    track: 'F',
    requires: 'autoLint',
    levels: [
      { cost: 800, effects: [{ kind: 'autoCloseSpeed', mult: 0.8 }] },
      { cost: 2400, effects: [{ kind: 'autoCloseSpeed', mult: 0.8 }] },
      { cost: 7000, effects: [{ kind: 'autoCloseSpeed', mult: 0.8 }] },
    ],
  },
  {
    id: 'runners',
    track: 'F',
    requires: 'autoLint',
    levels: [600, 2200, 8000, 28_000, 90_000].map((cost) => ({
      cost,
      effects: [{ kind: 'runners' as const, add: 3 }],
    })),
  },
  {
    id: 'autoLint',
    track: 'F',
    requires: 'copilot',
    levels: [{ cost: 350, effects: [{ kind: 'autoClose', target: 'lint' }] }],
  },
  {
    id: 'autoBug',
    track: 'F',
    requires: 'autoLint',
    levels: [{ cost: 1100, effects: [{ kind: 'autoClose', target: 'bug' }] }],
  },
  {
    id: 'autoLegacy',
    track: 'F',
    requires: 'autoLint',
    gate: 'tier3',
    levels: [
      { cost: 3000, effects: [{ kind: 'autoClose', target: 'legacy' }] },
    ],
  },
  {
    id: 'autoFlaky',
    track: 'F',
    requires: 'autoLint',
    gate: 'tier4',
    levels: [{ cost: 3800, effects: [{ kind: 'autoClose', target: 'flaky' }] }],
  },
  {
    id: 'autoConflict',
    track: 'F',
    requires: 'autoLint',
    gate: 'tier5',
    levels: [
      { cost: 8000, effects: [{ kind: 'autoClose', target: 'conflict' }] },
    ],
  },

  {
    id: 'supply',
    track: 'D',
    requires: 'debt',
    levels: [
      { cost: 2200, effects: [{ kind: 'spawnRate', mult: 1.2 }] },
      { cost: 3300, effects: [{ kind: 'spawnRate', mult: 1.28 }] },
      { cost: 4950, effects: [{ kind: 'spawnRate', mult: 1.25 }] },
      { cost: 7425, effects: [{ kind: 'spawnRate', mult: 1.22 }] },
      { cost: 11_137, effects: [{ kind: 'spawnRate', mult: 1.2 }] },
    ],
  },
  {
    id: 'debtInterest',
    track: 'D',
    requires: 'supply',
    levels: [
      {
        cost: 600,
        effects: [{ kind: 'debtInterest', approach: DEBT_INTEREST_PER_RANK }],
      },
      {
        cost: 1900,
        effects: [{ kind: 'debtInterest', approach: DEBT_INTEREST_PER_RANK }],
      },
      {
        cost: 5600,
        effects: [{ kind: 'debtInterest', approach: DEBT_INTEREST_PER_RANK }],
      },
    ],
  },
  {
    id: 'triagePolicy',
    track: 'D',
    requires: 'supply',
    levels: [
      {
        cost: 500,
        effects: [{ kind: 'triagePolicy', crew: 'juniors', target: 'lint' }],
      },
      {
        cost: 1600,
        effects: [{ kind: 'triagePolicy', crew: 'seniors', target: 'bug' }],
      },
    ],
  },
  {
    id: 'spawnLint',
    track: 'D',
    requires: 'supply',
    levels: [
      {
        cost: 120,
        effects: [{ kind: 'spawnRate', target: 'lint', mult: 1.4 }],
      },
    ],
  },
  {
    id: 'spawnBug',
    track: 'D',
    requires: 'spawnLint',
    levels: [
      { cost: 400, effects: [{ kind: 'spawnRate', target: 'bug', mult: 1.4 }] },
    ],
  },
  {
    id: 'spawnLegacy',
    track: 'D',
    requires: 'spawnBug',
    gate: 'tier1',
    levels: [
      {
        cost: 4400,
        effects: [{ kind: 'spawnRate', target: 'legacy', mult: 1.2 }],
      },
    ],
  },
  {
    id: 'spawnFlaky',
    track: 'D',
    requires: 'spawnBug',
    gate: 'tier3',
    levels: [
      {
        cost: 2300,
        effects: [{ kind: 'spawnRate', target: 'flaky', mult: 1.35 }],
      },
    ],
  },
  {
    id: 'spawnConflict',
    track: 'D',
    requires: 'spawnBug',
    gate: 'tier4',
    levels: [
      {
        cost: 4500,
        effects: [{ kind: 'spawnRate', target: 'conflict', mult: 1.35 }],
      },
    ],
  },
  {
    id: 'spawnEscalation',
    track: 'D',
    requires: 'spawnBug',
    gate: 'tier5',
    levels: [
      {
        cost: 8500,
        effects: [{ kind: 'spawnRate', target: 'escalation', mult: 1.5 }],
      },
    ],
  },
  {
    id: 'spawnIncident',
    track: 'D',
    requires: 'spawnBug',
    gate: 'tier6',
    levels: [
      {
        cost: 14_000,
        effects: [{ kind: 'spawnRate', target: 'incident', mult: 1.4 }],
      },
    ],
  },

  {
    id: 'income',
    track: 'C',
    requires: 'valueLint',
    levels: [
      { cost: 1100, effects: [{ kind: 'global', mult: 1.5 }] },
      { cost: 1375, effects: [{ kind: 'global', mult: 1.5 }] },
      { cost: 2600, effects: [{ kind: 'global', mult: 1.1 }] },
      { cost: 7500, effects: [{ kind: 'global', mult: 1.1 }] },
      { cost: 20_000, effects: [{ kind: 'global', mult: 1.12 }] },
    ],
  },
  {
    id: 'escalation',
    track: 'C',
    requires: 'income',
    levels: [
      { cost: 1300, effects: [{ kind: 'escalation', mult: 1.4 }] },
      { cost: 4000, effects: [{ kind: 'escalation', mult: 1.3 }] },
      { cost: 12_000, effects: [{ kind: 'escalation', mult: 1.25 }] },
    ],
  },
  {
    id: 'estimates',
    track: 'C',
    requires: 'valueLint',
    levels: [75, 112, 168, 253, 379].map((cost) => ({
      cost,
      effects: [
        { kind: 'spPerClose' as const, add: 2, target: 'lint' as const },
      ],
    })),
  },
  {
    id: 'estimatesLegacy',
    track: 'C',
    requires: 'valueLegacy',
    gate: 'tier1',
    levels: [400, 600, 900, 1350, 2025].map((cost) => ({
      cost,
      effects: [
        { kind: 'spPerClose' as const, add: 2, target: 'legacy' as const },
      ],
    })),
  },
  {
    id: 'coaches',
    track: 'C',
    requires: 'estimates',
    gate: 'tier2',
    levels: [
      2000, 5000, 12_000, 30_000, 75_000, 180_000, 450_000, 1_100_000,
      2_700_000, 6_500_000,
    ].map((cost) => ({ cost, effects: [{ kind: 'coach' as const, add: 1 }] })),
  },
  {
    id: 'deck',
    track: 'C',
    requires: 'coaches',
    levels: [
      3000, 7000, 16_000, 40_000, 100_000, 250_000, 600_000, 1_500_000,
      3_500_000, 8_000_000,
    ].map((cost) => ({
      cost,
      effects: [{ kind: 'deck' as const, add: VOTE_BONUS_PER_RANK }],
    })),
  },
  {
    id: 'pizza',
    track: 'B',
    requires: 'timesheets',
    gate: 'tier5',
    levels: [{ cost: 200_000, effects: [{ kind: 'pizza' }] }],
  },
  {
    id: 'timesheets',
    track: 'B',
    requires: 'juniorSpeed',
    gate: 'tier2',
    levels: [{ cost: 15_000, effects: [{ kind: 'crewSp' }] }],
  },
  {
    id: 'valueLint',
    track: 'C',
    requires: 'client',
    levels: [
      {
        cost: 25,
        effects: [{ kind: 'ticketValue', target: 'lint', mult: 2 }],
      },
      {
        cost: 2500,
        effects: [{ kind: 'ticketValue', target: 'lint', mult: 2 }],
      },
    ],
  },
  {
    id: 'valueBug',
    track: 'C',
    requires: 'valueLint',
    levels: [
      { cost: 500, effects: [{ kind: 'ticketValue', target: 'bug', mult: 2 }] },
    ],
  },
  {
    id: 'valueLegacy',
    track: 'C',
    requires: 'valueBug',
    gate: 'tier1',
    levels: [
      {
        cost: 1500,
        effects: [{ kind: 'ticketValue', target: 'legacy', mult: 2 }],
      },
      {
        cost: 2200,
        effects: [{ kind: 'ticketValue', target: 'legacy', mult: 1.5 }],
      },
    ],
  },
  {
    id: 'valueFlaky',
    track: 'C',
    requires: 'valueBug',
    gate: 'tier3',
    levels: [
      {
        cost: 3000,
        effects: [{ kind: 'ticketValue', target: 'flaky', mult: 2 }],
      },
    ],
  },
  {
    id: 'valueConflict',
    track: 'C',
    requires: 'valueBug',
    gate: 'tier4',
    levels: [
      {
        cost: 6000,
        effects: [{ kind: 'ticketValue', target: 'conflict', mult: 2 }],
      },
    ],
  },
  {
    id: 'valueSlop',
    track: 'C',
    requires: 'valueBug',
    gate: 'tier5',
    levels: [
      {
        cost: 11_000,
        effects: [{ kind: 'ticketValue', target: 'slop', mult: 1.8 }],
      },
    ],
  },
  {
    id: 'valueIncident',
    track: 'C',
    requires: 'valueBug',
    gate: 'tier6',
    levels: [
      {
        cost: 20_000,
        effects: [{ kind: 'ticketValue', target: 'incident', mult: 2 }],
      },
    ],
  },
  {
    id: 'valueZombie',
    track: 'C',
    requires: 'valueBug',
    gate: 'tier7',
    levels: [
      {
        cost: 35_000,
        effects: [{ kind: 'ticketValue', target: 'zombie', mult: 1.8 }],
      },
    ],
  },

  {
    id: 'assurance',
    track: 'G',
    requires: 'escalation',
    gate: 'tier6',
    levels: [
      { cost: 7000, effects: [{ kind: 'global', mult: 1.15 }] },
      { cost: 18_000, effects: [{ kind: 'global', mult: 1.15 }] },
      { cost: 45_000, effects: [{ kind: 'global', mult: 1.15 }] },
    ],
  },
  {
    id: 'stretch',
    track: 'G',
    requires: 'juniorReach',
    gate: 'tier5',
    levels: [{ cost: 10_000, effects: [{ kind: 'juniorBand', add: 1 }] }],
  },

  {
    id: 'o1',
    track: 'O',
    requires: 'office',
    levels: [{ cost: 80, effects: [{ kind: 'none' }] }],
  },
  {
    id: 'o2',
    track: 'O',
    requires: 'o1',
    levels: [{ cost: 380, effects: [{ kind: 'slots', add: 14 }] }],
  },
  {
    id: 'o3',
    track: 'O',
    requires: 'o1',
    levels: [{ cost: 1000, effects: [{ kind: 'juniorWalk', mult: 1.2 }] }],
  },
  {
    id: 'o4',
    track: 'O',
    requires: 'o1',
    levels: [{ cost: 3750, effects: [{ kind: 'spawnRate', mult: 1.1 }] }],
  },
  {
    id: 'o5',
    track: 'O',
    requires: 'o1',
    levels: [{ cost: 15_000, effects: [{ kind: 'seniorSweep', mult: 1.2 }] }],
  },
  {
    id: 'o6',
    track: 'O',
    requires: 'o1',
    levels: [{ cost: 50_000, effects: [{ kind: 'global', mult: 1.05 }] }],
  },
  {
    id: 'o7',
    track: 'O',
    requires: 'o1',
    levels: [{ cost: 175_000, effects: [{ kind: 'escalation', mult: 1.25 }] }],
  },
  {
    id: 'kit',
    track: 'O',
    requires: 'o1',
    levels: [{ cost: 400, effects: [{ kind: 'line', line: 'kit' }] }],
  },

  {
    id: 'golden',
    track: 'A',
    requires: 'radius',
    gate: 'tier1',
    levels: [{ cost: 2000, effects: [{ kind: 'goldenChance', add: 0.02 }] }],
  },
  {
    id: 'goldenValue',
    track: 'A',
    requires: 'golden',
    levels: [
      {
        cost: 2000,
        effects: [{ kind: 'goldenValue', add: GOLDEN_VALUE_PER_RANK }],
      },
      {
        cost: 9000,
        effects: [{ kind: 'goldenValue', add: GOLDEN_VALUE_PER_RANK }],
      },
      {
        cost: 38_000,
        effects: [{ kind: 'goldenValue', add: GOLDEN_VALUE_PER_RANK }],
      },
      {
        cost: 160_000,
        effects: [{ kind: 'goldenValue', add: GOLDEN_VALUE_PER_RANK }],
      },
    ],
  },
  {
    id: 'goldenCrew',
    track: 'A',
    requires: 'goldenValue',
    gate: 'tier6',
    levels: [{ cost: 400_000, effects: [{ kind: 'goldenCrew' }] }],
  },

  {
    id: 'signoff',
    track: 'G',
    requires: 'goldenCrew',
    gate: 'tier8',
    levels: [{ cost: 30_000_000, effects: [{ kind: 'none' }] }],
  },

  {
    id: 'secret',
    track: 'secret',
    requires: null,
    granted: true,
    levels: [{ cost: 0, effects: [{ kind: 'global', mult: 1.1 }] }],
  },
];

export const SKILL_BY_ID: ReadonlyMap<string, SkillNode> = new Map(
  SKILL_NODES.map((node) => [node.id, node])
);

/** What approving ADR `index` costs: the node's own price, exactly as the tree shows it. */
export function adrPrice(index: number): number {
  const node = SKILL_BY_ID.get(adrNodeId(index));
  const level = node?.levels[0];
  return level ? level.cost : Number.POSITIVE_INFINITY;
}

export const SECRET_SKILL_ID = 'secret';

/** Buying this closes the engagement — it is the run's last purchase. */
export const FINAL_SKILL_ID = 'signoff';

export const isSkillHeading = (id: string): boolean =>
  SKILL_BY_ID.get(id)?.heading === true;

export const SKILL_HEADING_IDS: readonly string[] = SKILL_NODES.filter(
  (node) => node.heading === true
).map((node) => node.id);

export function skillParent(id: string): string | null {
  return COLLAPSED.get(id) ?? null;
}

const COLLAPSED: ReadonlyMap<string, string | null> = new Map(
  SKILL_NODES.map((node) => {
    const seen = new Set<string>([node.id]);
    let at = node.requires;
    while (at !== null && isSkillHeading(at)) {
      if (seen.has(at)) {
        throw new Error(`${node.id} climbs through ${at} twice: headings loop`);
      }
      seen.add(at);
      at = SKILL_BY_ID.get(at)?.requires ?? null;
    }
    return [node.id, at];
  })
);

export const ADR_NODE_IDS: readonly string[] = ADR_NODES.map((node) => node.id);

/** The one node that adds desks; `Rattenpopulation`'s opposite number. */
export const DESK_NODE_ID = 'headcount';

export const OFFICE_HEADING_ID = 'office';

export const OFFICE_NODE_IDS: readonly string[] = SKILL_NODES.filter(
  (node) => node.track === 'O' && node.heading !== true
).map((node) => node.id);

export const AUTO_CLOSE_NODE_IDS: readonly string[] = SKILL_NODES.filter(
  (node) =>
    node.levels.some((level) =>
      level.effects.some((effect) => effect.kind === 'autoClose')
    )
).map((node) => node.id);

export const SKILL_ROOT_ID = 'root';

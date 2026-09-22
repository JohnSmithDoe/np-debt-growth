import type { TicketTypeId } from './ticket.model';
import type { PurchaseId } from './balance/progression';
import type { CrewKind } from './crew.model';
import { DEBT_INTEREST_PER_RANK } from './balance/flow';
import { KIT_PLAN } from './kit.model';

export type SkillEffect =
  | { readonly kind: 'none' }
  | { readonly kind: 'clickRadius'; readonly mult: number }
  | { readonly kind: 'slots'; readonly mult: number }
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
  | { readonly kind: 'goldenValue'; readonly mult: number }
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
  'root' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'O' | 'secret';

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
    id: 'radius',
    track: 'A',
    requires: 'hand',
    levels: [
      { cost: 3, effects: [{ kind: 'clickRadius', mult: 1.35 }] },
      { cost: 12, effects: [{ kind: 'clickRadius', mult: 1.28 }] },
      { cost: 45, effects: [{ kind: 'clickRadius', mult: 1.22 }] },
    ],
  },
  {
    id: 'capacity',
    track: 'A',
    currency: 'eur',
    requires: 'radius',
    levels: [
      { cost: 40, effects: [{ kind: 'slots', mult: 1.6 }] },
      { cost: 200, effects: [{ kind: 'slots', mult: 1.55 }] },
      { cost: 1_200, effects: [{ kind: 'slots', mult: 1.5 }] },
      { cost: 7_000, effects: [{ kind: 'slots', mult: 1.45 }] },
      { cost: 40_000, effects: [{ kind: 'slots', mult: 1.4 }] },
    ],
  },
  {
    id: 'duration',
    track: 'A',
    requires: 'radius',
    levels: [
      { cost: 8, effects: [{ kind: 'roundLength', seconds: 3 }] },
      { cost: 30, effects: [{ kind: 'roundLength', seconds: 5 }] },
      { cost: 90, effects: [{ kind: 'roundLength', seconds: 7 }] },
      { cost: 260, effects: [{ kind: 'roundLength', seconds: 9 }] },
      { cost: 700, effects: [{ kind: 'roundLength', seconds: 11 }] },
    ],
  },
  {
    id: 'lineOfSight',
    track: 'A',
    requires: 'radius',
    levels: [{ cost: 60, effects: [{ kind: 'nearestClaim' }] }],
  },

  {
    id: 'junior',
    track: 'B',
    currency: 'eur',
    requires: 'crew',
    levels: [
      { cost: 20, effects: [{ kind: 'line', line: 'junior' }] },
      { cost: 80, effects: [{ kind: 'line', line: 'junior' }] },
      { cost: 350, effects: [{ kind: 'line', line: 'junior' }] },
      { cost: 1_500, effects: [{ kind: 'line', line: 'junior' }] },
      { cost: 7_000, effects: [{ kind: 'line', line: 'junior' }] },
    ],
  },
  {
    id: 'juniorSpeed',
    track: 'B',
    requires: 'junior',
    gate: 'junior',
    levels: [
      {
        cost: 6,
        effects: [
          { kind: 'junior', mult: 1.25 },
          { kind: 'juniorWalk', mult: 1.2 },
        ],
      },
      {
        cost: 25,
        effects: [
          { kind: 'junior', mult: 1.22 },
          { kind: 'juniorWalk', mult: 1.18 },
        ],
      },
      {
        cost: 80,
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
      { cost: 12, effects: [{ kind: 'juniorSweep', mult: 1.3 }] },
      {
        cost: 45,
        effects: [
          { kind: 'juniorSweep', mult: 1.25 },
          { kind: 'juniorBand', add: 1 },
        ],
      },
      { cost: 150, effects: [{ kind: 'juniorSweep', mult: 1.2 }] },
    ],
  },
  {
    id: 'juniorPresence',
    track: 'B',
    requires: 'junior',
    gate: 'junior',
    levels: [
      {
        cost: 20,
        effects: [{ kind: 'standupAura', perJunior: 0.02, cap: 1.5 }],
      },
      {
        cost: 120,
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
      { cost: 70, effects: [{ kind: 'juniorBatch', add: 1, closeMult: 2 }] },
    ],
  },

  {
    id: 'senior',
    track: 'E',
    currency: 'eur',
    requires: 'junior',
    levels: [
      { cost: 1_200, effects: [{ kind: 'line', line: 'senior' }] },
      { cost: 4_500, effects: [{ kind: 'line', line: 'senior' }] },
      { cost: 18_000, effects: [{ kind: 'line', line: 'senior' }] },
      { cost: 70_000, effects: [{ kind: 'line', line: 'senior' }] },
      { cost: 260_000, effects: [{ kind: 'line', line: 'senior' }] },
    ],
  },
  {
    id: 'seniorSpeed',
    track: 'E',
    requires: 'senior',
    gate: 'senior',
    levels: [
      {
        cost: 40,
        effects: [
          { kind: 'senior', mult: 1.22 },
          { kind: 'seniorWalk', mult: 1.2 },
        ],
      },
      {
        cost: 130,
        effects: [
          { kind: 'senior', mult: 1.2 },
          { kind: 'seniorWalk', mult: 1.18 },
        ],
      },
      {
        cost: 400,
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
      { cost: 55, effects: [{ kind: 'seniorSweep', mult: 1.25 }] },
      { cost: 170, effects: [{ kind: 'seniorSweep', mult: 1.2 }] },
      { cost: 500, effects: [{ kind: 'seniorSweep', mult: 1.18 }] },
    ],
  },
  {
    id: 'seniorPresence',
    track: 'E',
    requires: 'senior',
    gate: 'senior',
    levels: [
      { cost: 90, effects: [{ kind: 'seniorBatch', add: 1 }] },
      { cost: 260, effects: [{ kind: 'seniorBatch', add: 1 }] },
      { cost: 750, effects: [{ kind: 'topOfBand' }] },
    ],
  },

  {
    id: 'manager',
    track: 'H',
    currency: 'eur',
    requires: 'senior',
    levels: [
      { cost: 28_000, effects: [{ kind: 'line', line: 'manager' }] },
      { cost: 80_000, effects: [{ kind: 'line', line: 'manager' }] },
      { cost: 95_000, effects: [{ kind: 'line', line: 'manager' }] },
      { cost: 320_000, effects: [{ kind: 'line', line: 'manager' }] },
      { cost: 1_000_000, effects: [{ kind: 'line', line: 'manager' }] },
    ],
  },
  {
    id: 'managerSpeed',
    track: 'H',
    requires: 'manager',
    gate: 'manager',
    levels: [
      {
        cost: 70,
        effects: [
          { kind: 'manager', mult: 1.25 },
          { kind: 'managerWalk', mult: 1.2 },
        ],
      },
      {
        cost: 200,
        effects: [
          { kind: 'manager', mult: 1.22 },
          { kind: 'managerWalk', mult: 1.18 },
        ],
      },
      {
        cost: 600,
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
      { cost: 110, effects: [{ kind: 'relabelSteps', add: 1 }] },
      { cost: 330, effects: [{ kind: 'relabelFillerFirst' }] },
      { cost: 900, effects: [{ kind: 'relabelSteps', add: 1 }] },
    ],
  },

  {
    id: 'copilot',
    track: 'F',
    currency: 'eur',
    requires: 'tooling',
    levels: [
      { cost: 150, effects: [{ kind: 'line', line: 'copilot' }] },
      { cost: 600, effects: [{ kind: 'line', line: 'copilot' }] },
      { cost: 2_500, effects: [{ kind: 'line', line: 'copilot' }] },
      { cost: 10_000, effects: [{ kind: 'line', line: 'copilot' }] },
      { cost: 40_000, effects: [{ kind: 'line', line: 'copilot' }] },
    ],
  },
  {
    id: 'copilotYield',
    track: 'F',
    requires: 'copilot',
    levels: [
      { cost: 4, effects: [{ kind: 'copilot', mult: 1.4 }] },
      { cost: 16, effects: [{ kind: 'copilot', mult: 1.3 }] },
      { cost: 55, effects: [{ kind: 'copilot', mult: 1.25 }] },
      { cost: 180, effects: [{ kind: 'copilot', mult: 1.2 }] },
      { cost: 550, effects: [{ kind: 'copilot', mult: 1.18 }] },
    ],
  },
  {
    id: 'automationSpeed',
    track: 'F',
    requires: 'autoLint',
    levels: [
      { cost: 80, effects: [{ kind: 'autoCloseSpeed', mult: 0.8 }] },
      { cost: 240, effects: [{ kind: 'autoCloseSpeed', mult: 0.8 }] },
      { cost: 700, effects: [{ kind: 'autoCloseSpeed', mult: 0.8 }] },
    ],
  },
  {
    id: 'autoLint',
    track: 'F',
    requires: 'copilot',
    levels: [{ cost: 35, effects: [{ kind: 'autoClose', target: 'lint' }] }],
  },
  {
    id: 'autoBug',
    track: 'F',
    requires: 'autoLint',
    levels: [{ cost: 110, effects: [{ kind: 'autoClose', target: 'bug' }] }],
  },
  {
    id: 'autoLegacy',
    track: 'F',
    requires: 'autoLint',
    gate: 'tier3',
    levels: [{ cost: 300, effects: [{ kind: 'autoClose', target: 'legacy' }] }],
  },
  {
    id: 'autoFlaky',
    track: 'F',
    requires: 'autoLint',
    gate: 'tier4',
    levels: [{ cost: 380, effects: [{ kind: 'autoClose', target: 'flaky' }] }],
  },
  {
    id: 'autoConflict',
    track: 'F',
    requires: 'autoLint',
    gate: 'tier5',
    levels: [
      { cost: 800, effects: [{ kind: 'autoClose', target: 'conflict' }] },
    ],
  },

  {
    id: 'supply',
    track: 'D',
    currency: 'eur',
    requires: 'debt',
    levels: [
      { cost: 25, effects: [{ kind: 'spawnRate', mult: 1.3 }] },
      { cost: 100, effects: [{ kind: 'spawnRate', mult: 1.28 }] },
      { cost: 450, effects: [{ kind: 'spawnRate', mult: 1.25 }] },
      { cost: 2_000, effects: [{ kind: 'spawnRate', mult: 1.22 }] },
      { cost: 9_000, effects: [{ kind: 'spawnRate', mult: 1.2 }] },
    ],
  },
  {
    id: 'debtInterest',
    track: 'D',
    requires: 'supply',
    levels: [
      {
        cost: 60,
        effects: [{ kind: 'debtInterest', approach: DEBT_INTEREST_PER_RANK }],
      },
      {
        cost: 190,
        effects: [{ kind: 'debtInterest', approach: DEBT_INTEREST_PER_RANK }],
      },
      {
        cost: 560,
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
        cost: 50,
        effects: [{ kind: 'triagePolicy', crew: 'juniors', target: 'lint' }],
      },
      {
        cost: 160,
        effects: [{ kind: 'triagePolicy', crew: 'seniors', target: 'bug' }],
      },
    ],
  },
  {
    id: 'spawnLint',
    track: 'D',
    requires: 'supply',
    levels: [
      { cost: 12, effects: [{ kind: 'spawnRate', target: 'lint', mult: 1.4 }] },
    ],
  },
  {
    id: 'spawnBug',
    track: 'D',
    requires: 'spawnLint',
    levels: [
      { cost: 40, effects: [{ kind: 'spawnRate', target: 'bug', mult: 1.4 }] },
    ],
  },
  {
    id: 'spawnLegacy',
    track: 'D',
    requires: 'spawnBug',
    gate: 'tier2',
    levels: [
      {
        cost: 120,
        effects: [{ kind: 'spawnRate', target: 'legacy', mult: 1.35 }],
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
        cost: 230,
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
        cost: 450,
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
        cost: 850,
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
        cost: 1400,
        effects: [{ kind: 'spawnRate', target: 'incident', mult: 1.4 }],
      },
    ],
  },

  {
    id: 'income',
    track: 'C',
    requires: 'client',
    levels: [
      { cost: 25, effects: [{ kind: 'global', mult: 1.12 }] },
      { cost: 85, effects: [{ kind: 'global', mult: 1.1 }] },
      { cost: 260, effects: [{ kind: 'global', mult: 1.1 }] },
      { cost: 750, effects: [{ kind: 'global', mult: 1.1 }] },
      { cost: 2000, effects: [{ kind: 'global', mult: 1.12 }] },
    ],
  },
  {
    id: 'escalation',
    track: 'C',
    requires: 'income',
    levels: [
      { cost: 130, effects: [{ kind: 'escalation', mult: 1.4 }] },
      { cost: 400, effects: [{ kind: 'escalation', mult: 1.3 }] },
      { cost: 1200, effects: [{ kind: 'escalation', mult: 1.25 }] },
    ],
  },
  {
    id: 'velocity',
    track: 'C',
    currency: 'eur',
    requires: 'income',
    gate: 'tier2',
    levels: [
      { cost: 25_000, effects: [{ kind: 'line', line: 'velocity' }] },
      { cost: 80_000, effects: [{ kind: 'line', line: 'velocity' }] },
      { cost: 250_000, effects: [{ kind: 'line', line: 'velocity' }] },
      { cost: 700_000, effects: [{ kind: 'line', line: 'velocity' }] },
      { cost: 1_800_000, effects: [{ kind: 'line', line: 'velocity' }] },
    ],
  },
  {
    id: 'valueLint',
    track: 'C',
    requires: 'income',
    levels: [
      { cost: 15, effects: [{ kind: 'ticketValue', target: 'lint', mult: 2 }] },
    ],
  },
  {
    id: 'valueBug',
    track: 'C',
    requires: 'valueLint',
    levels: [
      { cost: 50, effects: [{ kind: 'ticketValue', target: 'bug', mult: 2 }] },
    ],
  },
  {
    id: 'valueLegacy',
    track: 'C',
    requires: 'valueBug',
    gate: 'tier2',
    levels: [
      {
        cost: 150,
        effects: [{ kind: 'ticketValue', target: 'legacy', mult: 2 }],
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
        cost: 300,
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
        cost: 600,
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
        cost: 1100,
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
        cost: 2000,
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
        cost: 3500,
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
      { cost: 700, effects: [{ kind: 'global', mult: 1.15 }] },
      { cost: 1800, effects: [{ kind: 'global', mult: 1.15 }] },
      { cost: 4500, effects: [{ kind: 'global', mult: 1.15 }] },
    ],
  },
  {
    id: 'stretch',
    track: 'G',
    requires: 'juniorReach',
    gate: 'tier5',
    levels: [{ cost: 1000, effects: [{ kind: 'juniorBand', add: 1 }] }],
  },

  {
    id: 'o1',
    track: 'O',
    currency: 'eur',
    requires: 'office',
    levels: [{ cost: 300, effects: [{ kind: 'none' }] }],
  },
  {
    id: 'o2',
    track: 'O',
    currency: 'eur',
    requires: 'o1',
    levels: [{ cost: 1_500, effects: [{ kind: 'slots', mult: 1.1 }] }],
  },
  {
    id: 'o3',
    track: 'O',
    currency: 'eur',
    requires: 'o1',
    levels: [{ cost: 4_000, effects: [{ kind: 'juniorWalk', mult: 1.2 }] }],
  },
  {
    id: 'o4',
    track: 'O',
    currency: 'eur',
    requires: 'o1',
    levels: [{ cost: 15_000, effects: [{ kind: 'spawnRate', mult: 1.1 }] }],
  },
  {
    id: 'o5',
    track: 'O',
    currency: 'eur',
    requires: 'o1',
    levels: [{ cost: 60_000, effects: [{ kind: 'seniorSweep', mult: 1.2 }] }],
  },
  {
    id: 'o6',
    track: 'O',
    currency: 'eur',
    requires: 'o1',
    levels: [{ cost: 200_000, effects: [{ kind: 'global', mult: 1.05 }] }],
  },
  {
    id: 'o7',
    track: 'O',
    currency: 'eur',
    requires: 'o1',
    levels: [{ cost: 700_000, effects: [{ kind: 'escalation', mult: 1.25 }] }],
  },
  {
    id: 'kit',
    track: 'O',
    currency: 'eur',
    requires: 'o1',
    levels: KIT_PLAN.map((item) => ({
      cost: item.cost,
      effects: [{ kind: 'line', line: 'kit' }],
    })),
  },

  {
    id: 'golden',
    track: 'A',
    requires: 'radius',
    gate: 'tier2',
    levels: [
      { cost: 900, effects: [{ kind: 'goldenChance', add: 0.02 }] },
      { cost: 6_000, effects: [{ kind: 'goldenChance', add: 0.02 }] },
    ],
  },
  {
    id: 'goldenValue',
    track: 'A',
    requires: 'golden',
    levels: [
      { cost: 4_000, effects: [{ kind: 'goldenValue', mult: 1.5 }] },
      { cost: 22_000, effects: [{ kind: 'goldenValue', mult: 1.5 }] },
      { cost: 120_000, effects: [{ kind: 'goldenValue', mult: 1.5 }] },
      { cost: 650_000, effects: [{ kind: 'goldenValue', mult: 1.5 }] },
    ],
  },
  {
    id: 'goldenCrew',
    track: 'A',
    requires: 'goldenValue',
    gate: 'tier6',
    levels: [{ cost: 900_000, effects: [{ kind: 'goldenCrew' }] }],
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

export const SECRET_SKILL_ID = 'secret';

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

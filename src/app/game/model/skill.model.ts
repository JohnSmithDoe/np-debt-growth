import type { TicketTypeId } from './ticket.model';
import type { PurchaseId } from './balance/progression';
import type { CrewKind } from './crew.model';
import {
  DEBT_INTEREST_PER_RANK,
  ESTIMATE_SP_PER_RANK,
  ESTIMATE_SP_PER_RANK_OPENING,
  GOLDEN_VALUE_PER_RANK,
  VOTE_BONUS_PER_RANK,
} from './balance/flow';
import { HAUL_SHAVE_PER_RANK, SPRINT_SLOTS_STEP } from './balance/round';
import { ROOM_SEATS } from './balance/crew';
import { ADR_HEADING_ID, DEBT_TIERS, adrNodeId } from './tier.model';

/** What a crew pace effect speeds up. */
export type PaceField = 'close' | 'walk' | 'sweep';

export type SkillEffect =
  | { readonly kind: 'none'; readonly floorPlate?: true }
  | { readonly kind: 'clickRadius'; readonly mult: number }
  | { readonly kind: 'slots'; readonly add: number }
  | { readonly kind: 'cans'; readonly add: number }
  | {
      readonly kind: 'room';
      readonly line: CrewLine;
      readonly add: number;
    }
  | { readonly kind: 'adr'; readonly adr: number }
  | { readonly kind: 'haulShave'; readonly seconds: number }
  | {
      readonly kind: 'standupAura';
      readonly perJunior: number;
      readonly cap: number;
    }
  | {
      readonly kind: 'pace';
      readonly crew: CrewKind;
      readonly field: PaceField;
      readonly mult: number;
    }
  | {
      readonly kind: 'batch';
      readonly crew: CrewKind;
      readonly add: number;
      /** Carrying more costs time: the close takes this much longer. */
      readonly closeMult?: number;
    }
  | { readonly kind: 'juniorBand'; readonly add: number }
  | { readonly kind: 'autoClose'; readonly target: TicketTypeId }
  | { readonly kind: 'nearestClaim' }
  | {
      readonly kind: 'spPerClose';
      readonly add: number;
      readonly target?: TicketTypeId;
    }
  | { readonly kind: 'crewSp' }
  | { readonly kind: 'pizza' }
  | { readonly kind: 'coach'; readonly add: number }
  | { readonly kind: 'deck'; readonly add: number }
  | { readonly kind: 'topOfBand' }
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

export type SkillTrack =
  'root' | 'A' | 'B' | 'C' | 'D' | 'E' | 'G' | 'H' | 'N' | 'O' | 'secret';

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
  /** Nodes that must be fully bought first, on top of `requires`. */
  readonly maxed?: readonly string[];
  readonly granted?: boolean;
  readonly heading?: boolean;
  readonly levels: readonly SkillLevel[];
}

export interface SkillLock {
  readonly key: string;
  readonly params?: Readonly<
    Record<string, string | number | readonly string[]>
  >;
  /** Params holding catalogue keys; a list resolves to its labels, comma-joined. */
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

/** The line each ADR opens, by tier; a line's nodes hang off its ADR. */
const LINE_TICKETS: readonly TicketTypeId[] = [
  'lint',
  'legacy',
  'flaky',
  'conflict',
  'slop',
  'rockstar',
  'zombie',
  'rewrite',
  'swarm',
];

/** First price of each line's first ×2; ADR-0 and ADR-1 are measured. */
const LINE_DOUBLE_COST = [
  25, 1500, 3000, 6000, 11_000, 20_000, 35_000, 70_000, 140_000,
];

/** First-rank prices double a tier, as the reference's do (+50 % income 1 100 → 2 200). */
const perTier = (base: number, tier: number): number => base * 2 ** tier;

/** The estimates node's first rank: paper 75, dog 400, then doubling a tier. */
const lineEstimate = (tier: number): number =>
  tier === 0 ? 75 : 400 * 2 ** (tier - 1);

/**
 * `ranks` steps of `+step`, additive: rank k multiplies by (1 + k·step) /
 * (1 + (k−1)·step), so five +20 % ranks end at exactly ×2.
 */
const additiveRanks = (ranks: number, step: number): readonly number[] =>
  Array.from(
    { length: ranks },
    (_, k) => (1 + (k + 1) * step) / (1 + k * step)
  );

const priced = (first: number, step: number, rank: number): number =>
  Math.floor(first * step ** rank);

const LINE_RANKS = 5;

const capitalised = (id: string): string => id[0]!.toUpperCase() + id.slice(1);

/**
 * Every line's upgrades, one shape: `value` ×2 opens `spawn` (5 × +20 %,
 * ending at ×2), `income` (5 × +50 %, ×3.5) and `estimates` (5 × +SP); all
 * three maxed open `double`, a second ×2.
 */
const LINE_NODES: readonly SkillNode[] = LINE_TICKETS.flatMap(
  (ticket, tier) => {
    const name = capitalised(ticket);
    const value = `value${name}`;
    const spawn = `spawn${name}`;
    const income = `income${name}`;
    const estimates = `estimates${name}`;
    const heading = `${ticket}Line`;
    return [
      ...(tier === 0
        ? []
        : [
            {
              id: heading,
              track: 'C' as const,
              requires: adrNodeId(tier),
              heading: true,
              levels: [],
            },
          ]),
      {
        id: value,
        track: 'C' as const,
        requires: tier === 0 ? 'client' : heading,
        levels: [
          {
            cost: LINE_DOUBLE_COST[tier]!,
            effects: [
              { kind: 'ticketValue' as const, target: ticket, mult: 2 },
            ],
          },
        ],
      },
      {
        id: spawn,
        track: 'D' as const,
        requires: value,
        levels: additiveRanks(LINE_RANKS, 0.2).map((mult, rank) => ({
          cost: priced(perTier(2200, tier), 1.25, rank),
          effects: [{ kind: 'spawnRate' as const, target: ticket, mult }],
        })),
      },
      {
        id: income,
        track: 'C' as const,
        requires: value,
        levels: additiveRanks(LINE_RANKS, 0.5).map((mult, rank) => ({
          cost: priced(perTier(1100, tier), 1.25, rank),
          effects: [{ kind: 'ticketValue' as const, target: ticket, mult }],
        })),
      },
      {
        id: estimates,
        track: 'C' as const,
        requires: value,
        levels: Array.from({ length: LINE_RANKS }, (_, rank) => ({
          cost: priced(lineEstimate(tier), 1.5, rank),
          effects: [
            {
              kind: 'spPerClose' as const,
              add:
                tier === 0
                  ? ESTIMATE_SP_PER_RANK_OPENING
                  : ESTIMATE_SP_PER_RANK,
              target: ticket,
            },
          ],
        })),
      },
      {
        id: `double${name}`,
        track: 'C' as const,
        requires: estimates,
        maxed: [spawn, income, estimates],
        levels: [
          {
            cost: perTier(2500, tier),
            effects: [
              { kind: 'ticketValue' as const, target: ticket, mult: 2 },
            ],
          },
        ],
      },
    ];
  }
);

export const SKILL_NODES: readonly SkillNode[] = [
  {
    id: 'root',
    track: 'root',
    requires: null,
    levels: [{ cost: 0, effects: [{ kind: 'none' }] }],
  },

  { id: 'hand', track: 'A', requires: 'root', heading: true, levels: [] },
  { id: 'crew', track: 'B', requires: 'adr1', heading: true, levels: [] },
  { id: 'debt', track: 'D', requires: 'adr4', heading: true, levels: [] },
  { id: 'client', track: 'C', requires: 'root', heading: true, levels: [] },
  { id: 'office', track: 'O', requires: 'root', heading: true, levels: [] },
  { id: 'poker', track: 'C', requires: 'adr2', heading: true, levels: [] },
  { id: 'partner', track: 'A', requires: 'adr2', heading: true, levels: [] },
  { id: 'seniors', track: 'E', requires: 'adr3', heading: true, levels: [] },
  { id: 'managers', track: 'H', requires: 'adr4', heading: true, levels: [] },
  { id: 'morale', track: 'B', requires: 'adr5', heading: true, levels: [] },
  { id: 'incidents', track: 'D', requires: 'adr6', heading: true, levels: [] },
  {
    id: ADR_HEADING_ID,
    track: 'N',
    requires: 'root',
    heading: true,
    levels: [],
  },
  ...ADR_NODES,
  ...LINE_NODES,

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
      effects: [{ kind: 'slots' as const, add: SPRINT_SLOTS_STEP }],
    })),
  },
  {
    id: 'cans',
    track: 'A',
    requires: 'adr1',
    levels: [
      1500, 1800, 5400, 16_000, 48_000, 140_000, 420_000, 1_250_000, 3_750_000,
    ].map((cost) => ({ cost, effects: [{ kind: 'cans' as const, add: 1 }] })),
  },
  {
    id: 'duration',
    track: 'A',
    requires: 'radius',
    levels: [80, 300, 900, 2600, 7000].map((cost) => ({
      cost,
      effects: [{ kind: 'haulShave' as const, seconds: HAUL_SHAVE_PER_RANK }],
    })),
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
    id: 'juniorRoom',
    track: 'B',
    requires: 'juniorSpeed',
    levels: [20_000, 60_000, 180_000].map((cost) => ({
      cost,
      effects: [{ kind: 'room' as const, line: 'junior', add: ROOM_SEATS }],
    })),
  },
  {
    id: 'juniorSpeed',
    track: 'B',
    requires: 'junior',
    levels: [
      {
        cost: 1500,
        effects: [
          { kind: 'pace', crew: 'juniors', field: 'close', mult: 1.25 },
          { kind: 'pace', crew: 'juniors', field: 'walk', mult: 1.2 },
        ],
      },
      {
        cost: 4000,
        effects: [
          { kind: 'pace', crew: 'juniors', field: 'close', mult: 1.22 },
          { kind: 'pace', crew: 'juniors', field: 'walk', mult: 1.18 },
        ],
      },
      {
        cost: 10_000,
        effects: [
          { kind: 'pace', crew: 'juniors', field: 'close', mult: 1.2 },
          { kind: 'pace', crew: 'juniors', field: 'walk', mult: 1.15 },
        ],
      },
    ],
  },
  {
    id: 'juniorReach',
    track: 'B',
    requires: 'junior',
    levels: [
      {
        cost: 120,
        effects: [{ kind: 'pace', crew: 'juniors', field: 'sweep', mult: 1.3 }],
      },
      {
        cost: 450,
        effects: [
          { kind: 'pace', crew: 'juniors', field: 'sweep', mult: 1.25 },
          { kind: 'juniorBand', add: 1 },
        ],
      },
      {
        cost: 1500,
        effects: [{ kind: 'pace', crew: 'juniors', field: 'sweep', mult: 1.2 }],
      },
    ],
  },
  {
    id: 'juniorPresence',
    track: 'B',
    requires: 'junior',
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
    levels: [
      {
        cost: 700,
        effects: [{ kind: 'batch', crew: 'juniors', add: 1, closeMult: 2 }],
      },
    ],
  },

  {
    id: 'senior',
    track: 'E',
    requires: 'seniors',
    levels: [{ cost: 240_000, effects: [{ kind: 'line', line: 'senior' }] }],
  },
  {
    id: 'seniorRoom',
    track: 'E',
    requires: 'seniorSpeed',
    levels: [100_000, 300_000, 900_000].map((cost) => ({
      cost,
      effects: [{ kind: 'room' as const, line: 'senior', add: ROOM_SEATS }],
    })),
  },
  {
    id: 'seniorSpeed',
    track: 'E',
    requires: 'senior',
    levels: [
      {
        cost: 16_000,
        effects: [
          { kind: 'pace', crew: 'seniors', field: 'close', mult: 1.22 },
          { kind: 'pace', crew: 'seniors', field: 'walk', mult: 1.2 },
        ],
      },
      {
        cost: 52_000,
        effects: [
          { kind: 'pace', crew: 'seniors', field: 'close', mult: 1.2 },
          { kind: 'pace', crew: 'seniors', field: 'walk', mult: 1.18 },
        ],
      },
      {
        cost: 160_000,
        effects: [
          { kind: 'pace', crew: 'seniors', field: 'close', mult: 1.18 },
          { kind: 'pace', crew: 'seniors', field: 'walk', mult: 1.15 },
        ],
      },
    ],
  },
  {
    id: 'seniorReach',
    track: 'E',
    requires: 'senior',
    levels: [
      {
        cost: 22_000,
        effects: [
          { kind: 'pace', crew: 'seniors', field: 'sweep', mult: 1.25 },
        ],
      },
      {
        cost: 68_000,
        effects: [{ kind: 'pace', crew: 'seniors', field: 'sweep', mult: 1.2 }],
      },
      {
        cost: 200_000,
        effects: [
          { kind: 'pace', crew: 'seniors', field: 'sweep', mult: 1.18 },
        ],
      },
    ],
  },
  {
    id: 'seniorPresence',
    track: 'E',
    requires: 'senior',
    levels: [
      { cost: 36_000, effects: [{ kind: 'batch', crew: 'seniors', add: 1 }] },
      { cost: 104_000, effects: [{ kind: 'batch', crew: 'seniors', add: 1 }] },
      { cost: 300_000, effects: [{ kind: 'topOfBand' }] },
    ],
  },

  {
    id: 'manager',
    track: 'H',
    requires: 'managers',
    levels: [{ cost: 360_000, effects: [{ kind: 'line', line: 'manager' }] }],
  },
  {
    id: 'managerSpeed',
    track: 'H',
    requires: 'manager',
    levels: [
      {
        cost: 28_000,
        effects: [
          { kind: 'pace', crew: 'managers', field: 'close', mult: 1.25 },
          { kind: 'pace', crew: 'managers', field: 'walk', mult: 1.2 },
        ],
      },
      {
        cost: 80_000,
        effects: [
          { kind: 'pace', crew: 'managers', field: 'close', mult: 1.22 },
          { kind: 'pace', crew: 'managers', field: 'walk', mult: 1.18 },
        ],
      },
      {
        cost: 240_000,
        effects: [
          { kind: 'pace', crew: 'managers', field: 'close', mult: 1.2 },
          { kind: 'pace', crew: 'managers', field: 'walk', mult: 1.15 },
        ],
      },
    ],
  },
  {
    id: 'relabel',
    track: 'H',
    requires: 'manager',
    levels: [
      { cost: 44_000, effects: [{ kind: 'relabelSteps', add: 1 }] },
      { cost: 132_000, effects: [{ kind: 'relabelFillerFirst' }] },
      { cost: 360_000, effects: [{ kind: 'relabelSteps', add: 1 }] },
    ],
  },
  {
    id: 'managerRoom',
    track: 'H',
    requires: 'managerSpeed',
    levels: [
      {
        cost: 600_000,
        effects: [{ kind: 'room', line: 'manager', add: ROOM_SEATS }],
      },
    ],
  },

  {
    id: 'debtInterest',
    track: 'D',
    requires: 'debt',
    levels: [
      {
        cost: 24_000,
        effects: [{ kind: 'debtInterest', approach: DEBT_INTEREST_PER_RANK }],
      },
      {
        cost: 76_000,
        effects: [{ kind: 'debtInterest', approach: DEBT_INTEREST_PER_RANK }],
      },
      {
        cost: 224_000,
        effects: [{ kind: 'debtInterest', approach: DEBT_INTEREST_PER_RANK }],
      },
    ],
  },
  {
    id: 'triagePolicy',
    track: 'D',
    requires: 'junior',
    levels: [
      {
        cost: 500,
        effects: [{ kind: 'autoClose', target: 'lint' }],
      },
      {
        cost: 1600,
        effects: [{ kind: 'autoClose', target: 'bug' }],
      },
    ],
  },
  {
    id: 'spawnEscalation',
    track: 'D',
    requires: 'adr6',
    levels: [
      {
        cost: 255_000,
        effects: [{ kind: 'spawnRate', target: 'escalation', mult: 1.5 }],
      },
    ],
  },
  {
    id: 'spawnIncident',
    track: 'D',
    requires: 'incidents',
    levels: [
      {
        cost: 420_000,
        effects: [{ kind: 'spawnRate', target: 'incident', mult: 1.4 }],
      },
    ],
  },

  {
    id: 'escalation',
    track: 'C',
    requires: 'valueBug',
    levels: [
      { cost: 1300, effects: [{ kind: 'escalation', mult: 1.4 }] },
      { cost: 4000, effects: [{ kind: 'escalation', mult: 1.3 }] },
      { cost: 12_000, effects: [{ kind: 'escalation', mult: 1.25 }] },
    ],
  },
  {
    id: 'coaches',
    track: 'C',
    requires: 'poker',
    levels: [
      600, 1800, 5400, 16_200, 48_600, 145_800, 437_400, 1_312_200, 3_936_600,
      11_809_800,
    ].map((cost) => ({ cost, effects: [{ kind: 'coach' as const, add: 1 }] })),
  },
  {
    id: 'deck',
    track: 'C',
    requires: 'coaches',
    levels: [
      900, 2700, 8100, 24_300, 72_900, 218_700, 656_100, 1_968_300, 5_904_900,
      17_714_700,
    ].map((cost) => ({
      cost,
      effects: [{ kind: 'deck' as const, add: VOTE_BONUS_PER_RANK }],
    })),
  },
  {
    id: 'pizza',
    track: 'B',
    requires: 'morale',
    levels: [{ cost: 600_000, effects: [{ kind: 'pizza' }] }],
  },
  {
    id: 'timesheets',
    track: 'B',
    requires: 'morale',
    levels: [{ cost: 450_000, effects: [{ kind: 'crewSp' }] }],
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
    id: 'valueIncident',
    track: 'C',
    requires: 'incidents',
    levels: [
      {
        cost: 600_000,
        effects: [{ kind: 'ticketValue', target: 'incident', mult: 2 }],
      },
    ],
  },

  {
    id: 'assurance',
    track: 'G',
    requires: 'adr8',
    levels: [
      { cost: 105_000, effects: [{ kind: 'global', mult: 1.15 }] },
      { cost: 270_000, effects: [{ kind: 'global', mult: 1.15 }] },
      { cost: 675_000, effects: [{ kind: 'global', mult: 1.15 }] },
    ],
  },
  {
    id: 'stretch',
    track: 'G',
    requires: 'adr7',
    levels: [{ cost: 300_000, effects: [{ kind: 'juniorBand', add: 1 }] }],
  },

  {
    id: 'o1',
    track: 'O',
    requires: 'office',
    levels: [{ cost: 80, effects: [{ kind: 'none', floorPlate: true }] }],
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
    levels: [
      {
        cost: 1000,
        effects: [{ kind: 'pace', crew: 'juniors', field: 'walk', mult: 1.2 }],
      },
    ],
  },
  {
    id: 'o4',
    track: 'O',
    requires: 'o1',
    levels: [{ cost: 3750, effects: [{ kind: 'none', floorPlate: true }] }],
  },
  {
    id: 'o5',
    track: 'O',
    requires: 'o1',
    levels: [
      {
        cost: 15_000,
        effects: [{ kind: 'pace', crew: 'seniors', field: 'sweep', mult: 1.2 }],
      },
    ],
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
    requires: 'partner',
    levels: [{ cost: 50_000, effects: [{ kind: 'goldenChance', add: 0.02 }] }],
  },
  {
    id: 'goldenValue',
    track: 'A',
    requires: 'golden',
    levels: [
      {
        cost: 6000,
        effects: [{ kind: 'goldenValue', add: GOLDEN_VALUE_PER_RANK }],
      },
      {
        cost: 27_000,
        effects: [{ kind: 'goldenValue', add: GOLDEN_VALUE_PER_RANK }],
      },
      {
        cost: 114_000,
        effects: [{ kind: 'goldenValue', add: GOLDEN_VALUE_PER_RANK }],
      },
      {
        cost: 480_000,
        effects: [{ kind: 'goldenValue', add: GOLDEN_VALUE_PER_RANK }],
      },
    ],
  },
  {
    id: 'goldenCrew',
    track: 'A',
    requires: 'adr7',
    levels: [{ cost: 800_000, effects: [{ kind: 'goldenCrew' }] }],
  },

  {
    id: 'signoff',
    track: 'G',
    currency: 'eur',
    requires: 'adr8',
    levels: [{ cost: 20_000_000_000_000, effects: [{ kind: 'none' }] }],
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

/** Each crew line's `Rattenpopulation`. */
export const ROOM_NODE_BY_LINE = {
  junior: 'juniorRoom',
  senior: 'seniorRoom',
  manager: 'managerRoom',
} as const satisfies Partial<Record<PurchaseId, string>>;

export type CrewLine = keyof typeof ROOM_NODE_BY_LINE;

export const CREW_LINES = Object.keys(ROOM_NODE_BY_LINE) as CrewLine[];

export const OFFICE_HEADING_ID = 'office';

/** The office plates; `kit` sits on the office track but is a rail line, not a plate. */
export const OFFICE_NODE_IDS: readonly string[] = SKILL_NODES.filter(
  (node) => node.track === 'O' && node.heading !== true && node.id !== 'kit'
).map((node) => node.id);

export const SKILL_ROOT_ID = 'root';

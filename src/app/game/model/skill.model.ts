import type { TicketTypeId } from './ticket.model';
import type { PurchaseId } from './balance/progression';
import { LINE_PRICE_BY_TIER } from './balance/progression';
import type { CrewKind } from './crew.model';
import {
  DEBT_INTEREST_PER_RANK,
  ESTIMATE_SP_PER_RANK,
  ESTIMATE_SP_PER_RANK_OPENING,
  ESTIMATE_SP_TIER_GROWTH,
  GOLDEN_VALUE_PER_RANK,
  VOTE_BONUS_PER_RANK,
} from './balance/flow';
import { SPRINT_SLOTS_STEP, type ReleasePhaseId } from './balance/round';
import { ROOM_SEATS } from './balance/crew';
import { ADR_HEADING_ID, DEBT_TIERS, adrNodeId } from './tier.model';

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
  | { readonly kind: 'cutCeremony'; readonly phase: ReleasePhaseId }
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
  | { readonly kind: 'managerAura'; readonly add: number }
  | {
      readonly kind: 'ticketValue';
      readonly target: TicketTypeId;
      readonly mult: number;
    }
  | { readonly kind: 'escalation'; readonly mult: number }
  | { readonly kind: 'escalationHold'; readonly seconds: number }
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

export interface SkillLevel {
  readonly cost: number;
  readonly effects: readonly SkillEffect[];
}

export interface SkillNode {
  readonly id: string;
  readonly track: SkillTrack;
  readonly requires: string | null;
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
  readonly resolveParams?: readonly string[];
}

export const skillLabelKey = (id: string, level = 1): string =>
  `skill.${id}.${level}.label`;

const TIERED_NODE =
  /^(capacity|cans|juniorRoom|seniorRoom|managerRoom|goldenValue|debtInterest)\d+$/;

export const skillFamily = (id: string): string =>
  TIERED_NODE.exec(id)?.[1] ?? id;

export const skillBlurbKey = (id: string): string =>
  `skill.${skillFamily(id)}.blurb`;

const ADR_NODES: readonly SkillNode[] = DEBT_TIERS.map((tier) => ({
  id: adrNodeId(tier.index),
  track: 'N' as const,
  requires: tier.index === 1 ? ADR_HEADING_ID : adrNodeId(tier.index - 1),
  levels: [
    { cost: tier.spCost, effects: [{ kind: 'adr' as const, adr: tier.index }] },
  ],
}));

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

const LINE_DOUBLE_COST = [
  25, 1500, 3000, 6000, 11_000, 20_000, 35_000, 70_000, 140_000,
];

const perTier = (base: number, tier: number): number =>
  base * LINE_PRICE_BY_TIER[tier]!;

const lineEstimate = (tier: number): number =>
  tier === 0 ? 75 : 400 * 2 ** (tier - 1);

const additiveRanks = (ranks: number, step: number): readonly number[] =>
  Array.from(
    { length: ranks },
    (_, k) => (1 + (k + 1) * step) / (1 + k * step)
  );

const priced = (first: number, step: number, rank: number): number =>
  Math.floor(first * step ** rank);

const LINE_RANKS = 5;

const capitalised = (id: string): string => id[0]!.toUpperCase() + id.slice(1);

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
                  : ESTIMATE_SP_PER_RANK *
                    ESTIMATE_SP_TIER_GROWTH ** (tier - 1),
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

interface SprintRung {
  readonly capacity: readonly number[];
  readonly cans: readonly number[];
  readonly cut?: readonly [ReleasePhaseId, number];
}

const SPRINT_RUNGS: readonly SprintRung[] = [
  { capacity: [120, 300], cans: [], cut: ['retro', 80] },
  { capacity: [750], cans: [1500, 1800], cut: ['refinement', 300] },
  { capacity: [1900], cans: [5400], cut: ['review', 900] },
  { capacity: [8000], cans: [25_000], cut: ['smoke', 4000] },
  { capacity: [12_000], cans: [48_000], cut: ['freeze', 7000] },
  { capacity: [30_000], cans: [140_000] },
  { capacity: [1_000_000], cans: [3_000_000] },
  { capacity: [2_000_000], cans: [6_000_000] },
  { capacity: [3_000_000], cans: [9_000_000] },
];

const SPRINT_NODES: readonly SkillNode[] = SPRINT_RUNGS.flatMap(
  ({ capacity, cans, cut }, tier) => {
    const requires = tier === 0 ? 'radius' : adrNodeId(tier);
    const suffix = tier === 0 ? '' : String(tier);
    return [
      {
        id: `capacity${suffix}`,
        track: 'A' as const,
        requires,
        levels: capacity.map((cost) => ({
          cost,
          effects: [{ kind: 'slots' as const, add: SPRINT_SLOTS_STEP }],
        })),
      },
      ...(cans.length === 0
        ? []
        : [
            {
              id: `cans${suffix}`,
              track: 'A' as const,
              requires,
              levels: cans.map((cost) => ({
                cost,
                effects: [{ kind: 'cans' as const, add: 1 }],
              })),
            },
          ]),
      ...(cut === undefined
        ? []
        : [
            {
              id: `cut${capitalised(cut[0])}`,
              track: 'A' as const,
              requires,
              levels: [
                {
                  cost: cut[1],
                  effects: [{ kind: 'cutCeremony' as const, phase: cut[0] }],
                },
              ],
            },
          ]),
    ];
  }
);

const seats = (line: CrewLine): SkillEffect => ({
  kind: 'room',
  line,
  add: ROOM_SEATS,
});

const rung = (
  family: string,
  track: SkillTrack,
  tier: number,
  opener: string,
  cost: number,
  effects: readonly SkillEffect[]
): SkillNode => ({
  id: `${family}${tier}`,
  track,
  requires: adrNodeId(tier),
  maxed: [opener],
  levels: [{ cost, effects }],
});

const goldenRate: SkillEffect = {
  kind: 'goldenValue',
  add: GOLDEN_VALUE_PER_RANK,
};
const interest: SkillEffect = {
  kind: 'debtInterest',
  approach: DEBT_INTEREST_PER_RANK,
};

const RUNG_NODES: readonly SkillNode[] = [
  rung('juniorRoom', 'B', 2, 'junior', 20_000, [seats('junior')]),
  rung('juniorRoom', 'B', 3, 'junior', 60_000, [seats('junior')]),
  rung('juniorRoom', 'B', 4, 'junior', 180_000, [seats('junior')]),
  rung('seniorRoom', 'E', 3, 'senior', 100_000, [seats('senior')]),
  rung('seniorRoom', 'E', 4, 'senior', 300_000, [seats('senior')]),
  rung('seniorRoom', 'E', 5, 'senior', 900_000, [seats('senior')]),
  rung('managerRoom', 'H', 5, 'manager', 600_000, [seats('manager')]),
  rung('goldenValue', 'A', 3, 'goldenValue', 40_000, [goldenRate]),
  rung('goldenValue', 'A', 5, 'goldenValue', 1_000_000, [goldenRate]),
  rung('goldenValue', 'A', 7, 'goldenValue', 8_000_000, [goldenRate]),
  rung('debtInterest', 'D', 6, 'debtInterest', 4_000_000, [interest]),
  rung('debtInterest', 'D', 7, 'debtInterest', 8_000_000, [interest]),
  rung('spawnIncident', 'D', 7, 'spawnIncident', 8_000_000, [
    { kind: 'spawnRate', target: 'escalation', mult: 1.5 },
  ]),
  rung('spawnIncident', 'D', 8, 'spawnIncident', 12_000_000, [
    { kind: 'ticketValue', target: 'incident', mult: 2 },
  ]),
];

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
  { id: 'poker', track: 'C', requires: 'adr5', heading: true, levels: [] },
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
  ...SPRINT_NODES,
  ...RUNG_NODES,
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
    levels: [{ cost: 60_000, effects: [{ kind: 'line', line: 'senior' }] }],
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
          { kind: 'pace', crew: 'managers', field: 'sweep', mult: 1.25 },
          { kind: 'pace', crew: 'managers', field: 'walk', mult: 1.2 },
        ],
      },
      {
        cost: 80_000,
        effects: [
          { kind: 'pace', crew: 'managers', field: 'sweep', mult: 1.22 },
          { kind: 'pace', crew: 'managers', field: 'walk', mult: 1.18 },
        ],
      },
      {
        cost: 240_000,
        effects: [
          { kind: 'pace', crew: 'managers', field: 'sweep', mult: 1.2 },
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
      { cost: 44_000, effects: [{ kind: 'managerAura', add: 0.25 }] },
      { cost: 132_000, effects: [{ kind: 'managerAura', add: 0.25 }] },
      { cost: 360_000, effects: [{ kind: 'managerAura', add: 0.5 }] },
    ],
  },

  {
    id: 'debtInterest',
    track: 'D',
    requires: 'debt',
    levels: [{ cost: 24_000, effects: [interest] }],
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
    id: 'spawnIncident',
    track: 'D',
    requires: 'incidents',
    levels: [
      {
        cost: 255_000,
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
      400_000, 640_000, 1_020_000, 1_640_000, 2_620_000, 4_190_000, 6_710_000,
      10_700_000, 17_200_000, 27_500_000,
    ].map((cost) => ({ cost, effects: [{ kind: 'coach' as const, add: 1 }] })),
  },
  {
    id: 'deck',
    track: 'C',
    requires: 'coaches',
    levels: [
      600_000, 960_000, 1_540_000, 2_460_000, 3_930_000, 6_290_000, 10_100_000,
      16_100_000, 25_800_000, 41_200_000,
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
    track: 'B',
    requires: 'juniorReach',
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
    levels: [{ cost: 6000, effects: [goldenRate] }],
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
    requires: 'adr8',
    levels: [{ cost: 9_000_000, effects: [{ kind: 'none' }] }],
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

export function adrPrice(index: number): number {
  const node = SKILL_BY_ID.get(adrNodeId(index));
  const level = node?.levels[0];
  return level ? level.cost : Number.POSITIVE_INFINITY;
}

export const SECRET_SKILL_ID = 'secret';

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

export type CrewLine = Extract<PurchaseId, 'junior' | 'senior' | 'manager'>;

export const skillFamilyIds = (family: string): readonly string[] =>
  SKILL_NODES.filter((node) => skillFamily(node.id) === family).map(
    (node) => node.id
  );

export const OFFICE_NODE_IDS: readonly string[] = SKILL_NODES.filter(
  (node) => node.track === 'O' && node.heading !== true && node.id !== 'kit'
).map((node) => node.id);

export const SKILL_ROOT_ID = 'root';

import type { Consultancy } from './consultancy.model';
import { ACCEPTANCE } from './balance/progression';
import { FINAL_SKILL_ID, OFFICE_NODE_IDS } from './skill.model';
import { SPAWNERS } from './spawner.model';

export type AwardWeight = 'small' | 'medium' | 'large';

export interface Award {
  readonly id: string;
  readonly kind: 'milestone' | 'achievement';
  readonly weight: AwardWeight;
  readonly when: (state: Consultancy) => boolean;
}

export const awardLabelKey = (id: string): string => `award.${id}.label`;
export const awardBlurbKey = (id: string): string => `award.${id}.blurb`;

export const AWARDS: readonly Award[] = [
  {
    id: 'm-first-close',
    kind: 'milestone',
    weight: 'small',
    when: (s) => s.lifetimeClosed >= 1,
  },
  {
    id: 'm-first-invoice',
    kind: 'milestone',
    weight: 'small',
    when: (s) => s.lifetimeRounds >= 1,
  },
  {
    id: 'm-first-hire',
    kind: 'milestone',
    weight: 'small',
    when: (s) => s.levels.junior >= 1,
  },
  {
    id: 'm-hundred',
    kind: 'milestone',
    weight: 'small',
    when: (s) => s.lifetimeClosed >= 100,
  },
  {
    id: 'm-tier1',
    kind: 'milestone',
    weight: 'small',
    when: (s) => s.tier >= 1,
  },
  {
    id: 'm-tier2',
    kind: 'milestone',
    weight: 'medium',
    when: (s) => s.tier >= 2,
  },
  {
    id: 'm-tier3',
    kind: 'milestone',
    weight: 'medium',
    when: (s) => s.tier >= 3,
  },
  {
    id: 'm-tier4',
    kind: 'milestone',
    weight: 'medium',
    when: (s) => s.tier >= 4,
  },
  {
    id: 'm-tier5',
    kind: 'milestone',
    weight: 'medium',
    when: (s) => s.tier >= 5,
  },
  {
    id: 'm-tier6',
    kind: 'milestone',
    weight: 'large',
    when: (s) => s.tier >= 6,
  },
  {
    id: 'm-tier7',
    kind: 'milestone',
    weight: 'large',
    when: (s) => s.tier >= 7,
  },
  {
    id: 'm-tier8',
    kind: 'milestone',
    weight: 'large',
    when: (s) => s.tier >= 8,
  },

  {
    id: 'a-250',
    kind: 'achievement',
    weight: 'small',
    when: (s) => s.lifetimeClosed >= 250,
  },
  {
    id: 'a-first-thousand-billed',
    kind: 'achievement',
    weight: 'small',
    when: (s) => s.lifetimeBilled >= 1_000,
  },
  {
    id: 'a-works-on-my-machine',
    kind: 'achievement',
    weight: 'medium',
    when: (s) => s.lifetimeProdIncidents >= 1,
  },
  {
    id: 'a-500',
    kind: 'achievement',
    weight: 'small',
    when: (s) => s.lifetimeClosed >= 500,
  },
  {
    id: 'a-ten-thousand-billed',
    kind: 'achievement',
    weight: 'small',
    when: (s) => s.lifetimeBilled >= 10_000,
  },
  {
    id: 'a-sprints-fifty',
    kind: 'achievement',
    weight: 'small',
    when: (s) => s.lifetimeRounds >= 50,
  },
  {
    id: 'a-thousand',
    kind: 'achievement',
    weight: 'medium',
    when: (s) => s.lifetimeClosed >= 1_000,
  },
  {
    id: 'a-war-room',
    kind: 'achievement',
    weight: 'medium',
    when: (s) => s.levels.senior > 0 && (s.skills['escalation'] ?? 0) > 0,
  },
  {
    id: 'a-bench',
    kind: 'achievement',
    weight: 'medium',
    when: (s) => s.levels.junior + s.levels.senior >= 20,
  },
  {
    id: 'a-skimmer',
    kind: 'achievement',
    weight: 'medium',
    when: (s) => s.levels.velocity >= 1,
  },
  {
    id: 'a-million',
    kind: 'achievement',
    weight: 'medium',
    when: (s) => s.lifetimeBilled >= 1_000_000,
  },
  {
    id: 'a-ten-thousand',
    kind: 'achievement',
    weight: 'medium',
    when: (s) => s.lifetimeClosed >= 10_000,
  },
  {
    id: 'a-office',
    kind: 'achievement',
    weight: 'medium',
    when: (s) => OFFICE_NODE_IDS.every((id) => (s.skills[id] ?? 0) > 0),
  },
  {
    id: 'a-hundred-thousand',
    kind: 'achievement',
    weight: 'medium',
    when: (s) => s.lifetimeClosed >= 100_000,
  },
  {
    id: 'a-billion',
    kind: 'achievement',
    weight: 'large',
    when: (s) => s.lifetimeBilled >= 1_000_000_000,
  },
  {
    id: 'a-hundred-billion',
    kind: 'achievement',
    weight: 'large',
    when: (s) => s.lifetimeBilled >= 1e11,
  },
  {
    id: 'a-trillion',
    kind: 'achievement',
    weight: 'large',
    when: (s) => s.lifetimeBilled >= 1e12,
  },
  {
    id: 'a-ten-trillion',
    kind: 'achievement',
    weight: 'large',
    when: (s) => s.lifetimeBilled >= 1e13,
  },
  {
    id: 'a-hundred-trillion',
    kind: 'achievement',
    weight: 'large',
    when: (s) => s.lifetimeBilled >= 1e14,
  },
  {
    id: 'a-quadrillion',
    kind: 'achievement',
    weight: 'large',
    when: (s) => s.lifetimeBilled >= 1e15,
  },
  {
    id: 'a-ten-quadrillion',
    kind: 'achievement',
    weight: 'large',
    when: (s) => s.lifetimeBilled >= 1e16,
  },
  {
    id: 'a-perfect-storm',
    kind: 'achievement',
    weight: 'large',
    when: (s) => s.lifetimeJackpots >= 1,
  },
  {
    id: 'a-incident-review',
    kind: 'achievement',
    weight: 'medium',
    when: (s) => s.lifetimeReviews >= 1,
  },
  {
    id: 'a-on-credit',
    kind: 'achievement',
    weight: 'medium',
    when: (s) => s.spDebt > 0,
  },
  {
    id: 'a-change-request',
    kind: 'achievement',
    weight: 'medium',
    when: (s) => (s.skills['changeRequest'] ?? 0) > 0,
  },
  {
    id: 'a-scope-creep',
    kind: 'achievement',
    weight: 'large',
    when: (s) => (s.skills['changeRequest'] ?? 0) >= 5,
  },
  {
    id: 'a-findings',
    kind: 'achievement',
    weight: 'medium',
    when: (s) => (s.criterion?.findings ?? 0) > 0,
  },
  {
    id: 'a-over-budget',
    kind: 'achievement',
    weight: 'large',
    when: (s) =>
      (s.skills[FINAL_SKILL_ID] ?? 0) > 0 &&
      s.criterion !== null &&
      s.budget >= ACCEPTANCE.goal,
  },
  {
    id: 'a-ladder',
    kind: 'achievement',
    weight: 'large',
    when: (s) => s.tier >= 8,
  },
  {
    id: 'a-million-tickets',
    kind: 'achievement',
    weight: 'large',
    when: (s) => s.lifetimeClosed >= 500_000,
  },
  {
    id: 'a-rate-card',
    kind: 'achievement',
    weight: 'large',
    when: (s) => (s.skills['incomeLint'] ?? 0) >= 5,
  },
  {
    id: 'a-secret',
    kind: 'achievement',
    weight: 'medium',
    when: (s) => (s.skills['secret'] ?? 0) > 0,
  },
  ...SPAWNERS.map((_, line): Award => ({
    id: refoundAwardId(line),
    kind: 'milestone',
    weight: 'small',
    when: (s) => s.criterion?.reflagged.includes(line) === true,
  })),
  ...SPAWNERS.map((_, line): Award => ({
    id: findingsAwardId(line),
    kind: 'milestone',
    weight: 'small',
    when: (s) => s.criterion?.flagged.includes(line) === true,
  })),
  ...SPAWNERS.map((_, line): Award => ({
    id: retestAwardId(line),
    kind: 'milestone',
    weight: 'medium',
    when: (s) => s.criterion?.passed.includes(line) === true,
  })),
  ...SPAWNERS.map((_, line): Award => ({
    id: criterionAwardId(line),
    kind: 'milestone',
    weight: line === SPAWNERS.length - 1 ? 'large' : 'medium',
    when: (s) => s.criterion?.clean.includes(line) === true,
  })),
];

export function retestAwardId(line: number): string {
  return `c-retest-${line}`;
}

export function refoundAwardId(line: number): string {
  return `c-refound-${line}`;
}

export function findingsAwardId(line: number): string {
  return `c-findings-${line}`;
}

export function criterionAwardId(line: number): string {
  return `c-criterion-${line}`;
}

export const AWARD_BY_ID: ReadonlyMap<string, Award> = new Map(
  AWARDS.map((award) => [award.id, award])
);

export const ACHIEVEMENTS: readonly Award[] = AWARDS.filter(
  (award) => award.kind === 'achievement'
);

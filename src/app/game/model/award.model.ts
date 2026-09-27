import type { Consultancy } from './consultancy.model';
import { OFFICE_NODE_IDS } from './skill.model';

export type AwardWeight = 'small' | 'medium' | 'large';

export interface Award {
  readonly id: string;
  readonly kind: 'milestone' | 'achievement';
  readonly label: string;
  readonly blurb: string;
  readonly weight: AwardWeight;
  readonly when: (state: Consultancy) => boolean;
}

export const AWARDS: readonly Award[] = [
  {
    id: 'm-first-close',
    kind: 'milestone',
    label: 'First ticket triaged',
    blurb: 'Somebody had to.',
    weight: 'small',
    when: (s) => s.lifetimeClosed >= 1,
  },
  {
    id: 'm-first-invoice',
    kind: 'milestone',
    label: 'First invoice raised',
    blurb: 'The engagement is now revenue-generating.',
    weight: 'small',
    when: (s) => s.lifetimeRounds >= 1,
  },
  {
    id: 'm-first-hire',
    kind: 'milestone',
    label: 'Headcount approved',
    blurb: 'One junior. The requisition took four weeks.',
    weight: 'small',
    when: (s) => s.levels.junior >= 1,
  },
  {
    id: 'm-hundred',
    kind: 'milestone',
    label: 'One hundred tickets closed',
    blurb: 'Velocity is trending in the right direction.',
    weight: 'small',
    when: (s) => s.lifetimeClosed >= 100,
  },
  {
    id: 'm-tier1',
    kind: 'milestone',
    label: 'ADR-1 approved',
    blurb: 'The framework is now load-bearing and unmaintained.',
    weight: 'small',
    when: (s) => s.tier >= 1,
  },
  {
    id: 'm-tier2',
    kind: 'milestone',
    label: 'ADR-2 approved',
    blurb: 'The duplication is now a pattern, and patterns are best practice.',
    weight: 'medium',
    when: (s) => s.tier >= 2,
  },
  {
    id: 'm-tier3',
    kind: 'milestone',
    label: 'ADR-3 approved',
    blurb: 'Delivery is now distributed across every timezone at once.',
    weight: 'medium',
    when: (s) => s.tier >= 3,
  },
  {
    id: 'm-tier4',
    kind: 'milestone',
    label: 'ADR-4 approved',
    blurb: 'Nobody on the engagement can say which lines a person wrote.',
    weight: 'medium',
    when: (s) => s.tier >= 4,
  },
  {
    id: 'm-tier5',
    kind: 'milestone',
    label: 'ADR-5 approved',
    blurb: 'Throughput per head has never been higher. Bus factor: one.',
    weight: 'medium',
    when: (s) => s.tier >= 5,
  },
  {
    id: 'm-tier6',
    kind: 'milestone',
    label: 'ADR-6 approved',
    blurb: 'The services are load-bearing and nobody knows what they bear.',
    weight: 'large',
    when: (s) => s.tier >= 6,
  },
  {
    id: 'm-tier7',
    kind: 'milestone',
    label: 'ADR-7 approved',
    blurb: 'Two systems, one truth, and we are paid to reconcile them.',
    weight: 'large',
    when: (s) => s.tier >= 7,
  },
  {
    id: 'm-tier8',
    kind: 'milestone',
    label: 'ADR-8 approved',
    blurb: 'There is no tier after this one.',
    weight: 'large',
    when: (s) => s.tier >= 8,
  },

  {
    id: 'a-250',
    kind: 'achievement',
    label: 'Two hundred and fifty',
    blurb: 'Close 250 work items. The board does not look any emptier.',
    weight: 'small',
    when: (s) => s.lifetimeClosed >= 250,
  },
  {
    id: 'a-first-thousand-billed',
    kind: 'achievement',
    label: 'Four figures billed',
    blurb: 'Bill €1,000. The engagement is now worth having.',
    weight: 'small',
    when: (s) => s.lifetimeBilled >= 1_000,
  },
  {
    id: 'a-works-on-my-machine',
    kind: 'achievement',
    label: 'Works on my machine',
    blurb:
      'An auto-closed ticket found every train away and shipped straight to prod.',
    weight: 'medium',
    when: (s) => s.lifetimeProdIncidents >= 1,
  },
  {
    id: 'a-500',
    kind: 'achievement',
    label: 'Five hundred',
    blurb: 'Close 500 work items. Two hundred and fifty of them came back.',
    weight: 'small',
    when: (s) => s.lifetimeClosed >= 500,
  },
  {
    id: 'a-ten-thousand-billed',
    kind: 'achievement',
    label: 'Five figures billed',
    blurb: 'Bill €10,000. Somebody upstairs has noticed the account.',
    weight: 'small',
    when: (s) => s.lifetimeBilled >= 10_000,
  },
  {
    id: 'a-sprints-fifty',
    kind: 'achievement',
    label: 'Fifty sprints',
    blurb: 'Fifty ceremonies. Fifty burndown charts. One codebase, worse.',
    weight: 'small',
    when: (s) => s.lifetimeRounds >= 50,
  },
  {
    id: 'a-thousand',
    kind: 'achievement',
    label: 'Thousand-ticket engagement',
    blurb: 'Close 1,000 work items.',
    weight: 'medium',
    when: (s) => s.lifetimeClosed >= 1_000,
  },
  {
    id: 'a-war-room',
    kind: 'achievement',
    label: 'Standing war room',
    blurb: 'Put a senior on the escalations and leave the rest to the crew.',
    weight: 'medium',
    when: (s) => s.levels.senior > 0 && (s.skills['escalation'] ?? 0) > 0,
  },
  {
    id: 'a-bench',
    kind: 'achievement',
    label: 'Bench of twenty',
    blurb: 'Twenty developers on the floor at once.',
    weight: 'medium',
    when: (s) => s.levels.junior + s.levels.senior >= 20,
  },
  {
    id: 'a-skimmer',
    kind: 'achievement',
    label: 'Creative accounting',
    blurb: 'Book billed revenue as Story Points. Finance signed off.',
    weight: 'medium',
    when: (s) => s.levels.velocity >= 1,
  },
  {
    id: 'a-million',
    kind: 'achievement',
    label: 'Seven figures billed',
    blurb: 'Bill €1,000,000 across the engagement.',
    weight: 'medium',
    when: (s) => s.lifetimeBilled >= 1_000_000,
  },
  {
    id: 'a-ten-thousand',
    kind: 'achievement',
    label: 'Five figures of tickets',
    blurb: 'Close 10,000 work items. None of them are fixed.',
    weight: 'medium',
    when: (s) => s.lifetimeClosed >= 10_000,
  },
  {
    id: 'a-office',
    kind: 'achievement',
    label: 'The whole floor',
    blurb: 'Fit out every plate. There is nowhere left to put anyone.',
    weight: 'medium',
    when: (s) => OFFICE_NODE_IDS.every((id) => (s.skills[id] ?? 0) > 0),
  },
  {
    id: 'a-hundred-thousand',
    kind: 'achievement',
    label: 'Six figures of tickets',
    blurb: 'Close 100,000 work items. The backlog has never been longer.',
    weight: 'medium',
    when: (s) => s.lifetimeClosed >= 100_000,
  },
  {
    id: 'a-billion',
    kind: 'achievement',
    label: 'Ten figures billed',
    blurb: 'Bill €1,000,000,000. The engagement is now the client.',
    weight: 'large',
    when: (s) => s.lifetimeBilled >= 1_000_000_000,
  },
  {
    id: 'a-ladder',
    kind: 'achievement',
    label: 'Every decision approved',
    blurb: 'All eight ADRs. There was never a cleanup path.',
    weight: 'large',
    when: (s) => s.tier >= 8,
  },
  {
    id: 'a-million-tickets',
    kind: 'achievement',
    label: 'Seven figures of tickets',
    blurb: 'Close 1,000,000 work items. The client has stopped reading them.',
    weight: 'large',
    when: (s) => s.lifetimeClosed >= 1_000_000,
  },
  {
    id: 'a-rate-card',
    kind: 'achievement',
    label: 'The rate card, revised',
    blurb: 'Five revisions. It has still never gone down.',
    weight: 'large',
    when: (s) => (s.skills['incomeLint'] ?? 0) >= 5,
  },
  {
    id: 'a-secret',
    kind: 'achievement',
    label: 'You read the code',
    blurb: 'Nobody has opened that file since 2011.',
    weight: 'medium',
    when: (s) => (s.skills['secret'] ?? 0) > 0,
  },
];

export const AWARD_BY_ID: ReadonlyMap<string, Award> = new Map(
  AWARDS.map((award) => [award.id, award])
);

export const ACHIEVEMENTS: readonly Award[] = AWARDS.filter(
  (award) => award.kind === 'achievement'
);

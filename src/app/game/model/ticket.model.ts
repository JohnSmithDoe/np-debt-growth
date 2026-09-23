export type TicketTypeId =
  | 'lint'
  | 'bug'
  | 'legacy'
  | 'flaky'
  | 'conflict'
  | 'slop'
  | 'rockstar'
  | 'zombie'
  | 'rewrite'
  | 'swarm'
  | 'incident'
  | 'escalation'
  | 'hotfix'
  | 'quarter'
  | 'invite'
  | 'pizza';

export type TicketEffect =
  | 'value'
  | 'sprintMultiplier'
  | 'hotfixBuff'
  | 'billBoard'
  | 'decline'
  | 'crewRush';

export interface TicketType {
  readonly id: TicketTypeId;
  readonly prefix: string;
  readonly value: number;
  readonly ratePerSec: number;
  readonly tier: number;
  readonly handOnly: boolean;
  readonly respawns: boolean;
  readonly effect: TicketEffect;
  readonly scalesWithTier: boolean;
  readonly colour: number;
}

export const ticketLabelKey = (id: string): string => `ticket.type.${id}`;

export const TICKET_TYPES: Readonly<Record<TicketTypeId, TicketType>> = {
  lint: {
    id: 'lint',
    prefix: 'LINT',
    value: 1,
    ratePerSec: 0.18,
    tier: 0,
    handOnly: false,
    respawns: false,
    effect: 'value',
    scalesWithTier: false,
    colour: 0x6b7280,
  },
  bug: {
    id: 'bug',
    prefix: 'BUG',
    value: 4,
    ratePerSec: 0.08,
    tier: 0,
    handOnly: false,
    respawns: false,
    effect: 'value',
    scalesWithTier: false,
    colour: 0xe05252,
  },
  legacy: {
    id: 'legacy',
    prefix: 'LEG',
    value: 12,
    ratePerSec: 0.9,
    tier: 1,
    handOnly: false,
    respawns: false,
    effect: 'value',
    scalesWithTier: false,
    colour: 0xb08040,
  },
  flaky: {
    id: 'flaky',
    prefix: 'FLAKE',
    value: 30,
    ratePerSec: 1.6,
    tier: 2,
    handOnly: false,
    respawns: true,
    effect: 'value',
    scalesWithTier: false,
    colour: 0x8b5cf6,
  },
  conflict: {
    id: 'conflict',
    prefix: 'CONF',
    value: 90,
    ratePerSec: 5,
    tier: 3,
    handOnly: false,
    respawns: false,
    effect: 'value',
    scalesWithTier: false,
    colour: 0x3b82f6,
  },
  slop: {
    id: 'slop',
    prefix: 'SLOP',
    value: 260,
    ratePerSec: 7,
    tier: 4,
    handOnly: false,
    respawns: false,
    effect: 'value',
    scalesWithTier: false,
    colour: 0x14b8a6,
  },
  rockstar: {
    id: 'rockstar',
    prefix: 'PUSH',
    value: 1_400,
    ratePerSec: 9.5,
    tier: 5,
    handOnly: false,
    respawns: false,
    effect: 'value',
    scalesWithTier: false,
    colour: 0xec4899,
  },
  zombie: {
    id: 'zombie',
    prefix: 'PAGE',
    value: 6_000,
    ratePerSec: 13,
    tier: 6,
    handOnly: false,
    respawns: true,
    effect: 'value',
    scalesWithTier: false,
    colour: 0x84cc16,
  },
  rewrite: {
    id: 'rewrite',
    prefix: 'MIGR',
    value: 26_000,
    ratePerSec: 17,
    tier: 7,
    handOnly: false,
    respawns: false,
    effect: 'value',
    scalesWithTier: false,
    colour: 0xf97316,
  },
  swarm: {
    id: 'swarm',
    prefix: 'AGENT',
    value: 110_000,
    ratePerSec: 22,
    tier: 8,
    handOnly: false,
    respawns: false,
    effect: 'value',
    scalesWithTier: false,
    colour: 0xa855f7,
  },
  incident: {
    id: 'incident',
    prefix: 'P0',
    value: 150,
    ratePerSec: 0.008,
    tier: 0,
    handOnly: true,
    respawns: false,
    effect: 'value',
    scalesWithTier: true,
    colour: 0xff3b30,
  },
  escalation: {
    id: 'escalation',
    prefix: 'ESC',
    value: 0,
    ratePerSec: 0.0015,
    tier: 0,
    handOnly: true,
    respawns: false,
    effect: 'sprintMultiplier',
    scalesWithTier: false,
    colour: 0xd8b34a,
  },
  hotfix: {
    id: 'hotfix',
    prefix: 'HOT',
    value: 0,
    ratePerSec: 0.006,
    tier: 0,
    handOnly: true,
    respawns: false,
    effect: 'hotfixBuff',
    scalesWithTier: false,
    colour: 0x22c55e,
  },
  quarter: {
    id: 'quarter',
    prefix: 'QTR',
    value: 0,
    ratePerSec: 0.0012,
    tier: 2,
    handOnly: true,
    respawns: false,
    effect: 'billBoard',
    scalesWithTier: false,
    colour: 0xf59e0b,
  },
  invite: {
    id: 'invite',
    prefix: 'INVITE',
    value: 0,
    ratePerSec: 0,
    tier: 0,
    handOnly: true,
    respawns: false,
    effect: 'decline',
    scalesWithTier: false,
    colour: 0x8aa4c8,
  },
  pizza: {
    id: 'pizza',
    prefix: 'PIZZA',
    value: 0,
    ratePerSec: 0.012,
    tier: 0,
    handOnly: true,
    respawns: false,
    effect: 'crewRush',
    scalesWithTier: false,
    colour: 0xf97316,
  },
};

export const TICKET_TYPE_IDS = Object.keys(
  TICKET_TYPES
) as readonly TicketTypeId[];

export const RETYPE_LADDER: readonly TicketTypeId[] = TICKET_TYPE_IDS.filter(
  (id) => !TICKET_TYPES[id].handOnly && TICKET_TYPES[id].effect === 'value'
).sort((a, b) => TICKET_TYPES[a].tier - TICKET_TYPES[b].tier);

export function ladderUp(
  from: TicketTypeId,
  steps: number,
  maxTier: number
): TicketTypeId | null {
  const at = RETYPE_LADDER.indexOf(from);
  if (at < 0) return null;

  const reach = Math.min(RETYPE_LADDER.length - 1, at + steps);
  let best: TicketTypeId | null = null;
  for (let up = at + 1; up <= reach; up += 1) {
    const next = RETYPE_LADDER[up];
    if (next && TICKET_TYPES[next].tier <= maxTier) best = next;
  }
  return best;
}

export const FLAKY_COMEBACK_MS = 1400;

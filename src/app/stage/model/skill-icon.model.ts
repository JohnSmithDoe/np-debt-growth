const OWN_ICONS: readonly string[] = [
  'root',
  'radius',
  'capacity',
  'cans',
  'lineOfSight',
  'junior',
  'juniorSpeed',
  'juniorReach',
  'juniorPresence',
  'ticketStacking',
  'timesheets',
  'pizza',
  'stretch',
  'senior',
  'seniorSpeed',
  'seniorReach',
  'seniorPresence',
  'manager',
  'managerSpeed',
  'relabel',
  'debtInterest',
  'triagePolicy',
  'spawnIncident',
  'escalation',
  'coaches',
  'deck',
  'valueBug',
  'assurance',
  'golden',
  'goldenValue',
  'goldenCrew',
  'signoff',
  'secret',
  'o1',
  'o2',
  'o3',
  'o4',
  'o5',
  'o6',
  'o7',
  'kit',
  'adr1',
  'adr2',
  'adr3',
  'adr4',
  'adr5',
  'adr6',
  'adr7',
  'adr8',
];

const LINE_KINDS = ['value', 'spawn', 'income', 'estimates', 'double'] as const;
const LINE_NODE = /^(value|spawn|income|estimates|double)[A-Z]/;

const ROOM_ICON = 'headcount';
const ROOM_NODE = /^(junior|senior|manager)Room$/;

const TIERED_NODE = /^(capacity|cans)\d+$/;
const CUT_NODE = /^cut[A-Z]/;
const CUT_ICON = 'duration';

const OWN = new Set(OWN_ICONS);

export function skillIconOf(nodeId: string): string | null {
  if (OWN.has(nodeId)) return nodeId;
  if (ROOM_NODE.test(nodeId)) return ROOM_ICON;
  const family = TIERED_NODE.exec(nodeId)?.[1];
  if (family !== undefined) return family;
  if (CUT_NODE.test(nodeId)) return CUT_ICON;
  const kind = LINE_NODE.exec(nodeId)?.[1];
  return kind === undefined ? null : `line-${kind}`;
}

export const SKILL_ICON_FILES: readonly string[] = [
  ...OWN_ICONS,
  ROOM_ICON,
  CUT_ICON,
  ...LINE_KINDS.map((kind) => `line-${kind}`),
];

export const SKILL_ICON_SIZE = 32;

export const skillIconKey = (icon: string): string => `skill-icon-${icon}`;
export const skillIconUrl = (icon: string): string =>
  `assets/skills/${icon}.png`;

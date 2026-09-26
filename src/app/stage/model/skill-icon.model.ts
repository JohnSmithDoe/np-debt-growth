/** Nodes drawn with their own icon, `assets/skills/<id>.png`. */
const OWN_ICONS: readonly string[] = [
  'root',
  'radius',
  'capacity',
  'cans',
  'duration',
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
  'spawnEscalation',
  'spawnIncident',
  'escalation',
  'coaches',
  'deck',
  'valueBug',
  'valueIncident',
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

/** Every line's five nodes share one icon per kind, `assets/skills/line-<kind>.png`. */
const LINE_KINDS = ['value', 'spawn', 'income', 'estimates', 'double'] as const;
const LINE_NODE = /^(value|spawn|income|estimates|double)[A-Z]/;

/** Every crew line's room node shares the one headcount icon. */
const ROOM_ICON = 'headcount';
const ROOM_NODE = /^(junior|senior|manager)Room$/;

const OWN = new Set(OWN_ICONS);

export function skillIconOf(nodeId: string): string | null {
  if (OWN.has(nodeId)) return nodeId;
  if (ROOM_NODE.test(nodeId)) return ROOM_ICON;
  const kind = LINE_NODE.exec(nodeId)?.[1];
  return kind === undefined ? null : `line-${kind}`;
}

export const SKILL_ICON_FILES: readonly string[] = [
  ...OWN_ICONS,
  ROOM_ICON,
  ...LINE_KINDS.map((kind) => `line-${kind}`),
];

export const SKILL_ICON_SIZE = 32;

export const skillIconKey = (icon: string): string => `skill-icon-${icon}`;
export const skillIconUrl = (icon: string): string =>
  `assets/skills/${icon}.png`;

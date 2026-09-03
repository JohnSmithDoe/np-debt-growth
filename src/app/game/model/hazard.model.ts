import {
  FREEZE_SLOT_MULT,
  MIGRATION_SUPPLY_MULT,
  OFFSHORE_CREW,
  PAGE_INCIDENT_MULT,
  STORM_INCIDENT_MULT,
} from './balance/weather';

export type HazardKind = 'invitation' | 'fact';

export type HazardId =
  | 'all-hands'
  | 'reorg'
  | 'compliance'
  | 'retro'
  | 'grooming'
  | 'storm'
  | 'freeze'
  | 'offshore'
  | 'page'
  | 'migration';

export interface Weather {
  readonly meeting: boolean;
  readonly incidentRate: number;
  readonly slots: number;
  readonly offshore: number;
  readonly supply: number;
}

export const CALM: Weather = {
  meeting: false,
  incidentRate: 1,
  slots: 1,
  offshore: 0,
  supply: 1,
};

export interface Hazard {
  readonly id: HazardId;
  readonly kind: HazardKind;
  readonly fromTier: number;
  readonly durationMs: number;
  readonly weather?: Partial<Weather>;
}

export const HAZARDS: readonly Hazard[] = [
  {
    id: 'all-hands',
    kind: 'invitation',
    fromTier: 1,
    durationMs: 10_000,
    weather: { meeting: true },
  },
  {
    id: 'compliance',
    kind: 'invitation',
    fromTier: 1,
    durationMs: 6_000,
    weather: { meeting: true },
  },
  {
    id: 'retro',
    kind: 'invitation',
    fromTier: 1,
    durationMs: 8_000,
    weather: { meeting: true },
  },
  {
    id: 'reorg',
    kind: 'invitation',
    fromTier: 1,
    durationMs: 10_000,
    weather: { meeting: true },
  },
  {
    id: 'offshore',
    kind: 'fact',
    fromTier: 2,
    durationMs: 60_000,
    weather: { offshore: OFFSHORE_CREW },
  },
  {
    id: 'freeze',
    kind: 'fact',
    fromTier: 3,
    durationMs: 25_000,
    weather: { slots: FREEZE_SLOT_MULT },
  },
  {
    id: 'storm',
    kind: 'fact',
    fromTier: 3,
    durationMs: 30_000,
    weather: { incidentRate: STORM_INCIDENT_MULT },
  },
  { id: 'grooming', kind: 'fact', fromTier: 3, durationMs: 0 },
  {
    id: 'page',
    kind: 'fact',
    fromTier: 6,
    durationMs: 12_000,
    weather: { incidentRate: PAGE_INCIDENT_MULT, meeting: true },
  },
  {
    id: 'migration',
    kind: 'fact',
    fromTier: 7,
    durationMs: 15_000,
    weather: { supply: MIGRATION_SUPPLY_MULT },
  },
];

export const HAZARD_BY_ID = new Map(HAZARDS.map((row) => [row.id, row]));

export function hazardDurationMs(id: HazardId): number {
  return HAZARD_BY_ID.get(id)?.durationMs ?? 0;
}

export const hazardLabelKey = (id: HazardId): string => `hazard.${id}.label`;

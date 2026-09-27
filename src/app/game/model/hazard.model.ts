export type HazardKind = 'invitation' | 'fact';

export type HazardId =
  | 'all-hands'
  | 'reorg'
  | 'compliance'
  | 'retro'
  | 'grooming'
  | 'storm'
  | 'freeze'
  | 'page'
  | 'migration';

export interface Weather {
  readonly meeting: boolean;
  readonly incidentRate: number;
  readonly slots: number;
  readonly supply: number;
}

export const CALM: Weather = {
  meeting: false,
  incidentRate: 1,
  slots: 1,
  supply: 1,
};

export interface Hazard {
  readonly id: HazardId;
  readonly kind: HazardKind;
  readonly fromTier: number;
  readonly durationMs: number;
  readonly weather?: Partial<Weather>;
}

export const HAZARDS_ENABLED = true;

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
    id: 'freeze',
    kind: 'fact',
    fromTier: 3,
    durationMs: 25_000,
    weather: { slots: 0.5 },
  },
  {
    id: 'storm',
    kind: 'fact',
    fromTier: 3,
    durationMs: 15_000,
    weather: { incidentRate: 20 },
  },
  { id: 'grooming', kind: 'fact', fromTier: 3, durationMs: 8_000 },
  {
    id: 'page',
    kind: 'fact',
    fromTier: 6,
    durationMs: 12_000,
    weather: { incidentRate: 10, meeting: true },
  },
  {
    id: 'migration',
    kind: 'fact',
    fromTier: 7,
    durationMs: 10_000,
    weather: { supply: 0 },
  },
];

export const HAZARD_BY_ID = new Map(HAZARDS.map((row) => [row.id, row]));

export function hazardDurationMs(id: HazardId): number {
  return HAZARD_BY_ID.get(id)?.durationMs ?? 0;
}

export const hazardLabelKey = (id: HazardId): string => `hazard.${id}.label`;

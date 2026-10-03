export interface OfficePlate {
  readonly id: string;
}

export const officeLabelKey = (id: string): string => `office.${id}.label`;
export const officeBlurbKey = (id: string): string => `office.${id}.blurb`;

export const OFFICE_PLAN: readonly OfficePlate[] = [
  { id: 'bullpen-a' },
  { id: 'server' },
  { id: 'meeting' },
  { id: 'kitchen' },
  { id: 'war-room' },
  { id: 'archive' },
  { id: 'corner-office' },
];

export const OFFICE_GRID = { cols: 4, rows: 2 } as const;

export const OFFICE_PLATES = OFFICE_PLAN.length;

export function platesAt(level: number): number {
  return Math.min(OFFICE_PLATES, 1 + Math.max(0, level));
}

export function builtPlates(level: number): readonly OfficePlate[] {
  return OFFICE_PLAN.slice(0, platesAt(level));
}

export function nextPlate(level: number): OfficePlate | null {
  return OFFICE_PLAN[platesAt(level)] ?? null;
}

import type { SkillEffect } from './skill.model';

export interface OfficePlate {
  readonly id: string;
  readonly effect: SkillEffect | null;
}

export const officeLabelKey = (id: string): string => `office.${id}.label`;
export const officeBlurbKey = (id: string): string => `office.${id}.blurb`;

export const OFFICE_PLAN: readonly OfficePlate[] = [
  {
    id: 'bullpen-a',
    effect: null,
  },
  {
    id: 'bullpen-b',
    effect: null,
  },
  {
    id: 'meeting',
    effect: { kind: 'slots', mult: 1.1 },
  },
  {
    id: 'kitchen',
    effect: { kind: 'juniorWalk', mult: 1.2 },
  },
  {
    id: 'server',
    effect: { kind: 'spawnRate', mult: 1.1 },
  },
  {
    id: 'war-room',
    effect: { kind: 'seniorSweep', mult: 1.2 },
  },
  {
    id: 'archive',
    effect: { kind: 'global', mult: 1.05 },
  },
  {
    id: 'corner-office',
    effect: { kind: 'escalation', mult: 1.25 },
  },
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

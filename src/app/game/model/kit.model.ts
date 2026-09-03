import type { SkillEffect } from './skill.model';

export type KitEffect = Extract<
  SkillEffect,
  { kind: 'ticketValue' | 'global' | 'escalation' }
>;

export interface KitItem {
  readonly id: string;
  readonly effect: KitEffect;
}

export const kitLabelKey = (id: string): string => `kit.${id}.label`;
export const kitBlurbKey = (id: string): string => `kit.${id}.blurb`;

export const KIT_PLAN: readonly KitItem[] = [
  {
    id: 'monitor',
    effect: { kind: 'ticketValue', target: 'lint', mult: 1.8 },
  },
  {
    id: 'standing-desk',
    effect: { kind: 'global', mult: 1.03 },
  },
  {
    id: 'keyboard',
    effect: { kind: 'ticketValue', target: 'bug', mult: 1.6 },
  },
  {
    id: 'ide-licence',
    effect: { kind: 'ticketValue', target: 'legacy', mult: 1.6 },
  },
  {
    id: 'ci-tier',
    effect: { kind: 'ticketValue', target: 'flaky', mult: 1.7 },
  },
  {
    id: 'observability',
    effect: { kind: 'escalation', mult: 1.25 },
  },
];

export const KIT_ITEMS = KIT_PLAN.length;

export function itemsAt(level: number): number {
  return Math.min(KIT_ITEMS, Math.max(0, level));
}

export function boughtKit(level: number): readonly KitItem[] {
  return KIT_PLAN.slice(0, itemsAt(level));
}

export function nextKitItem(level: number): KitItem | null {
  return KIT_PLAN[itemsAt(level)] ?? null;
}

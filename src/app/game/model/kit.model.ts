import type { SkillEffect } from './skill.model';

export type KitEffect = Extract<
  SkillEffect,
  { kind: 'ticketValue' | 'global' | 'escalation' }
>;

export interface KitItem {
  readonly id: string;
  readonly cost: number;
  readonly effect: KitEffect;
}

export const kitLabelKey = (id: string): string => `kit.${id}.label`;
export const kitBlurbKey = (id: string): string => `kit.${id}.blurb`;

/**
 * One row per kit item: its price and what fitting it does. The `kit` skill
 * node builds its levels from this, so the ladder cannot outrun the plan.
 */
export const KIT_PLAN: readonly KitItem[] = [
  {
    id: 'monitor',
    cost: 3_000,
    effect: { kind: 'ticketValue', target: 'lint', mult: 1.8 },
  },
  {
    id: 'standing-desk',
    cost: 12_000,
    effect: { kind: 'global', mult: 1.03 },
  },
  {
    id: 'keyboard',
    cost: 45_000,
    effect: { kind: 'ticketValue', target: 'bug', mult: 1.6 },
  },
  {
    id: 'ide-licence',
    cost: 160_000,
    effect: { kind: 'ticketValue', target: 'legacy', mult: 1.6 },
  },
  {
    id: 'ci-tier',
    cost: 550_000,
    effect: { kind: 'ticketValue', target: 'flaky', mult: 1.7 },
  },
  {
    id: 'observability',
    cost: 1_900_000,
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

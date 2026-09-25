import type { SkillEffect } from './skill.model';

export type TraitId = 'closer' | 'sweeper' | 'runner' | 'firefighter' | 'scout';

export const TRAIT_IDS: readonly TraitId[] = [
  'closer',
  'sweeper',
  'runner',
  'firefighter',
  'scout',
];

export const TRAITS: Readonly<Record<TraitId, readonly SkillEffect[]>> = {
  closer: [{ kind: 'pace', crew: 'seniors', field: 'close', mult: 1.25 }],
  sweeper: [{ kind: 'pace', crew: 'seniors', field: 'sweep', mult: 1.4 }],
  runner: [{ kind: 'pace', crew: 'seniors', field: 'walk', mult: 1.5 }],
  firefighter: [{ kind: 'topOfBand' }],
  scout: [{ kind: 'nearestClaim' }],
};

export interface SeniorHire {
  readonly poolSeat: number;
  readonly traits: readonly TraitId[];
}

export const traitLabelKey = (id: TraitId): string => `trait.${id}.label`;
export const traitBlurbKey = (id: TraitId): string => `trait.${id}.blurb`;

export function hireFor(
  seat: number,
  taken: readonly number[],
  poolSize: number
): SeniorHire {
  const used = new Set(taken);
  let poolSeat = seat % Math.max(1, poolSize);
  for (let at = 0; at < poolSize; at += 1) {
    if (!used.has(at)) {
      poolSeat = at;
      break;
    }
  }

  return { poolSeat, traits: [TRAIT_IDS[seat % TRAIT_IDS.length]!] };
}

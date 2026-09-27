import type { Consultancy } from './consultancy.model';
import { freshConsultancy } from './consultancy.model';
import { SAVE_VERSION } from './game.consts';
import type { PurchaseId } from './balance/progression';
import { skillFamilyIds } from './skill.model';

export type ConsultancyPatch = Partial<Omit<Consultancy, 'levels'>> & {
  readonly levels?: Partial<Record<PurchaseId, number>>;
};

export function consultancy(patch: ConsultancyPatch = {}): Consultancy {
  const fresh = freshConsultancy(0, SAVE_VERSION);
  return {
    ...fresh,
    ...patch,
    levels: { ...fresh.levels, ...patch.levels },
  };
}

export function ranksOf(family: string, ranks: number): Record<string, number> {
  return Object.fromEntries(
    skillFamilyIds(family)
      .slice(0, ranks)
      .map((id) => [id, 1])
  );
}

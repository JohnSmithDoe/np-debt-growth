import type { Consultancy } from './consultancy.model';
import { freshConsultancy } from './consultancy.model';
import { SAVE_VERSION } from './game.consts';
import type { PurchaseId } from './balance/progression';

/** A fresh consultancy with fields patched; `levels` merges instead of replacing. */
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

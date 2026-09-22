import type { CrewKind } from './crew.model';
import type { PurchaseId } from './balance/progression';
import { CREW_STATS } from './balance/crew';
import { COPILOT_SP_PER_CLOSE, VELOCITY_SKIM_CAP } from './balance/progression';

export type EffectParams = Readonly<Record<string, string | number>>;

const closeSeconds = (crew: CrewKind): EffectParams => ({
  seconds: (CREW_STATS[crew].closeMs / 1000) | 0,
});

export const LINE_EFFECT_PARAMS: Readonly<Record<PurchaseId, EffectParams>> = {
  junior: closeSeconds('juniors'),
  senior: closeSeconds('seniors'),
  copilot: { sp: COPILOT_SP_PER_CLOSE },
  velocity: { percent: Math.round(VELOCITY_SKIM_CAP * 100) },
  manager: closeSeconds('managers'),
  kit: {},
};

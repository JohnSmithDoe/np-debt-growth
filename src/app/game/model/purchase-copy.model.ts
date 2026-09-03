import type { PurchaseId } from './balance/progression';
import {
  JUNIOR_CLOSE_MS,
  MANAGER_CLOSE_MS,
  SENIOR_CLOSE_MS,
} from './balance/crew';
import { COPILOT_SP_PER_CLOSE, VELOCITY_SKIM_CAP } from './balance/progression';

export type EffectParams = Readonly<Record<string, string | number>>;

export const LINE_EFFECT_PARAMS: Readonly<Record<PurchaseId, EffectParams>> = {
  junior: { seconds: (JUNIOR_CLOSE_MS / 1000) | 0 },
  senior: { seconds: (SENIOR_CLOSE_MS / 1000) | 0 },
  copilot: { sp: COPILOT_SP_PER_CLOSE },
  velocity: { percent: Math.round(VELOCITY_SKIM_CAP * 100) },
  manager: { seconds: (MANAGER_CLOSE_MS / 1000) | 0 },
  kit: {},
};

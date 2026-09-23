import type { EffectParams } from '../../game/model/purchase-copy.model';

export type NoticeTarget = 'board' | 'review' | 'skills';

export type StepAction = 'startRound';

export interface NextStep {
  readonly id: string;
  readonly target: NoticeTarget;
  readonly titleKey: string;
  readonly titleParams?: EffectParams;
  readonly detailKey: string;
  readonly detailParams?: EffectParams;
  readonly detailMoney?: number;
  readonly detailPoints?: number;
  readonly focus?: string;
  readonly act?: StepAction;
  readonly teaches?: boolean;
}

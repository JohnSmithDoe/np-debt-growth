import type { Consultancy } from '../../game/model/consultancy.model';
import { officeLabelKey } from '../../game/model/office.model';
import { skillLabelKey } from '../../game/model/skill.model';
import { tierAt, tierNameKey } from '../../game/model/tier.model';
import { PURCHASE_REVEAL_FRACTION } from '../../game/model/balance/progression';
import * as economy from '../../game/util/economy';
import type { NextStep } from '../model/step.model';
import { reached } from './reached';

export interface NextRank {
  readonly id: string;
  readonly rank: number;
}

export interface StepGates {
  readonly openSkills: readonly string[];
  readonly nextRank: NextRank | null;
}

export function nextSteps(
  state: Consultancy,
  gates: StepGates
): readonly NextStep[] {
  const steps: NextStep[] = [];
  const affordable = (cost: number): boolean => state.budget >= cost;

  if (state.lifetimeClosed === 0) {
    steps.push({
      id: 'teach:triage',
      target: 'board',
      titleKey: 'step.triage.title',
      detailKey: 'step.triage.detail',
      teaches: true,
    });
  }

  if (state.storyPoints > 0 && Object.keys(state.skills).length === 0) {
    steps.push({
      id: 'teach:skills',
      target: 'skills',
      titleKey: 'step.skills.title',
      detailKey: 'step.skills.detail',
      teaches: true,
    });
  }

  const tier = tierAt(state.tier + 1);
  const inSight =
    tier && affordable(tier.unlockCost * PURCHASE_REVEAL_FRACTION);
  if (tier && inSight) {
    const banked = affordable(tier.unlockCost);
    steps.push({
      id: `adr:${tier.index}`,
      target: 'review',
      titleKey: banked ? 'step.adr.title' : 'step.adr.bank.title',
      titleParams: { index: tier.index },
      detailKey: banked ? 'step.adr.detail' : 'step.adr.bank.detail',
      detailParams: { name: tierNameKey(tier.index) },
      detailMoney: banked ? undefined : tier.unlockCost - state.budget,
    });
  }

  const plate = economy.officeNext(state);
  const room = economy.officeNextNodeId(state);
  if (plate && room !== null && economy.freeDesks(state) < 1) {
    steps.push({
      id: `office:${economy.officePlates(state)}`,
      target: 'skills',
      focus: room,
      titleKey: 'step.floor.title',
      detailKey: 'step.floor.detail',
      detailParams: { plate: officeLabelKey(plate.id) },
    });
  }

  for (const id of gates.openSkills) {
    steps.push({
      id: `skill:${id}`,
      target: 'skills',
      focus: id,
      titleKey: 'step.skill.title',
      titleParams: { skill: skillLabelKey(id) },
      detailKey: 'step.skill.detail',
    });
  }

  if (gates.nextRank) {
    steps.push({
      id: `rank:${gates.nextRank.id}`,
      target: 'skills',
      focus: gates.nextRank.id,
      titleKey: 'step.rank.title',
      titleParams: { skill: skillLabelKey(gates.nextRank.id) },
      detailKey: 'step.rank.detail',
      detailParams: { rank: gates.nextRank.rank },
    });
  }

  const open = reached(state);
  const live = steps.filter((step) => open[step.target]);

  if (live.length === 0) {
    live.push({
      id: 'earn',
      target: 'board',
      titleKey: 'step.earn.title',
      detailKey: 'step.earn.detail',
    });
  }

  return live;
}

import type { Consultancy } from '../model/consultancy.model';
import type { SkillLock } from '../model/skill.model';
import {
  FINAL_SKILL_ID,
  SKILL_BY_ID,
  SKILL_NODES,
  skillLabelKey,
  skillParent,
} from '../model/skill.model';
import { adrNodeId, tierAt } from '../model/tier.model';
import type { TicketTypeId } from '../model/ticket.model';
import type { PurchaseId } from '../model/balance/progression';
import * as economy from './economy';

/**
 * Every purchase as a pure step: the state after it, or `null` if it cannot
 * be bought. The store and the simulator share these, so they cannot drift.
 */

/** The first of `node.maxed` not yet fully bought, if any. */
function unmaxed(state: Consultancy, id: string): readonly string[] {
  return (SKILL_BY_ID.get(id)?.maxed ?? []).filter(
    (need) =>
      economy.skillRank(state, need) <
      (SKILL_BY_ID.get(need)?.levels.length ?? 0)
  );
}

export function skillAvailable(state: Consultancy, id: string): boolean {
  const node = SKILL_BY_ID.get(id);
  if (!node || node.granted === true) return false;
  if (economy.skillRank(state, id) >= node.levels.length) return false;
  const parent = skillParent(id);
  if (parent !== null && economy.skillRank(state, parent) === 0) return false;
  return unmaxed(state, id).length === 0;
}

export function skillLockReason(
  state: Consultancy,
  id: string
): SkillLock | null {
  const node = SKILL_BY_ID.get(id);
  if (!node) return { key: 'skill.lock.unknown' };
  if (economy.skillRank(state, id) >= node.levels.length) return null;

  const parent = skillParent(id);
  if (parent !== null && economy.skillRank(state, parent) === 0) {
    return {
      key: 'skill.lock.blocked',
      params: { by: skillLabelKey(parent) },
      resolveParams: ['by'],
    };
  }
  const short = unmaxed(state, id);
  if (short.length > 0) {
    return {
      key: 'skill.lock.needs-maxed',
      params: { by: short.map((need) => skillLabelKey(need)) },
      resolveParams: ['by'],
    };
  }
  const held = node.currency === 'eur' ? state.budget : state.storyPoints;
  if (held < economy.skillRankCost(state, id)) {
    return { key: 'skill.lock.underfunded' };
  }
  return null;
}

export function buySkill(state: Consultancy, id: string): Consultancy | null {
  if (!skillAvailable(state, id)) return null;
  const node = SKILL_BY_ID.get(id)!;
  const cost = economy.skillRankCost(state, id);
  const eur = node.currency === 'eur';
  if ((eur ? state.budget : state.storyPoints) < cost) return null;

  const rank = economy.skillRank(state, id);
  const levels = { ...state.levels };
  let tier = state.tier;
  for (const effect of node.levels[rank]?.effects ?? []) {
    if (effect.kind === 'line') levels[effect.line] += 1;
    if (effect.kind === 'adr') tier = Math.max(tier, effect.adr);
  }

  return {
    ...state,
    budget: eur ? state.budget - cost : state.budget,
    storyPoints: eur ? state.storyPoints : state.storyPoints - cost,
    levels,
    roster:
      levels.senior > state.levels.senior
        ? [...state.roster, economy.nextSeniorHire(state)]
        : state.roster,
    tier,
    skills: { ...state.skills, [id]: rank + 1 },
    endedAt: id === FINAL_SKILL_ID ? state.lastTick : state.endedAt,
  };
}

/** Whether any tree node could be bought right now. */
export function anySkillAffordable(state: Consultancy): boolean {
  return SKILL_NODES.some((node) => {
    if (!skillAvailable(state, node.id)) return false;
    const held = node.currency === 'eur' ? state.budget : state.storyPoints;
    return held >= economy.skillRankCost(state, node.id);
  });
}

/** The next ADR's tree node, or `null` past the last rung. */
export function nextAdrNodeId(state: Consultancy): string | null {
  const next = tierAt(state.tier + 1);
  return next ? adrNodeId(next.index) : null;
}

export function buyLine(
  state: Consultancy,
  line: PurchaseId
): Consultancy | null {
  if (!economy.canBuyLine(state, line)) return null;
  return {
    ...state,
    budget: state.budget - economy.lineCost(state, line),
    levels: { ...state.levels, [line]: state.levels[line] + 1 },
    roster:
      line === 'senior'
        ? [...state.roster, economy.nextSeniorHire(state)]
        : state.roster,
  };
}

export function buySpawner(
  state: Consultancy,
  adr: number
): Consultancy | null {
  if (!economy.canBuySpawner(state, adr)) return null;
  return {
    ...state,
    budget: state.budget - economy.spawnerCost(state, adr),
    spawners: {
      ...state.spawners,
      [String(adr)]: economy.spawnerCount(state, adr) + 1,
    },
  };
}

export function buyIncome(
  state: Consultancy,
  id: TicketTypeId
): Consultancy | null {
  if (!economy.canBuyIncome(state, id)) return null;
  return {
    ...state,
    budget: state.budget - economy.incomeCost(state, id),
    income: { ...state.income, [id]: economy.incomeLevel(state, id) + 1 },
  };
}

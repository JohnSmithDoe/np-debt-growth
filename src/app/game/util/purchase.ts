import type { Consultancy } from '../model/consultancy.model';
import type { SkillGate, SkillLock } from '../model/skill.model';
import {
  FINAL_SKILL_ID,
  SKILL_BY_ID,
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

function gateReason(
  state: Consultancy,
  gate: SkillGate | undefined
): SkillLock | null {
  switch (gate) {
    case undefined:
      return null;
    case 'junior':
      return state.levels.junior === 0
        ? { key: 'skill.lock.needs-junior' }
        : null;
    case 'senior':
      return state.levels.senior === 0
        ? { key: 'skill.lock.needs-senior' }
        : null;
    case 'manager':
      return state.levels.manager === 0
        ? { key: 'skill.lock.needs-manager' }
        : null;
    default: {
      const needed = Number(gate.slice(4));
      return state.tier < needed
        ? { key: 'skill.lock.needs-adr', params: { adr: needed } }
        : null;
    }
  }
}

/** The first of `node.maxed` not yet fully bought, if any. */
function unmaxed(state: Consultancy, id: string): string | null {
  for (const need of SKILL_BY_ID.get(id)?.maxed ?? []) {
    const levels = SKILL_BY_ID.get(need)?.levels.length ?? 0;
    if (economy.skillRank(state, need) < levels) return need;
  }
  return null;
}

function deskShort(state: Consultancy, id: string): boolean {
  const next = SKILL_BY_ID.get(id)?.levels[economy.skillRank(state, id)];
  return (next?.effects ?? []).some(
    (effect) =>
      effect.kind === 'line' && economy.deskLimited(state, effect.line)
  );
}

export function skillAvailable(state: Consultancy, id: string): boolean {
  const node = SKILL_BY_ID.get(id);
  if (!node || node.granted === true) return false;
  if (economy.skillRank(state, id) >= node.levels.length) return false;
  const parent = skillParent(id);
  if (parent !== null && economy.skillRank(state, parent) === 0) return false;
  if (deskShort(state, id)) return false;
  if (unmaxed(state, id) !== null) return false;
  return gateReason(state, node.gate) === null;
}

export function skillLockReason(
  state: Consultancy,
  id: string
): SkillLock | null {
  const node = SKILL_BY_ID.get(id);
  if (!node) return { key: 'skill.lock.unknown' };
  if (economy.skillRank(state, id) >= node.levels.length) return null;

  const gate = gateReason(state, node.gate);
  if (gate !== null) return gate;
  if (deskShort(state, id)) return { key: 'skill.lock.needs-desk' };
  const parent = skillParent(id);
  if (parent !== null && economy.skillRank(state, parent) === 0) {
    return {
      key: 'skill.lock.blocked',
      params: { by: skillLabelKey(parent) },
      resolveParams: ['by'],
    };
  }
  const short = unmaxed(state, id);
  if (short !== null) {
    return {
      key: 'skill.lock.needs-maxed',
      params: { by: skillLabelKey(short) },
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

export function promote(state: Consultancy): Consultancy | null {
  const cost = economy.promotionCost(state);
  if (!economy.promotionOffered(state) || state.budget < cost) return null;
  return {
    ...state,
    budget: state.budget - cost,
    promoted: true,
    levels: {
      ...state.levels,
      junior: 0,
      senior: state.levels.senior + state.levels.junior,
    },
  };
}

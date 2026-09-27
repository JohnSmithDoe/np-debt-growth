import type { Consultancy } from '../../game/model/consultancy.model';
import {
  ADR_NODE_IDS,
  FINAL_SKILL_ID,
  skillLabelKey,
} from '../../game/model/skill.model';
import { spawnerLabelKey } from '../../game/model/spawner.model';
import { ticketLabelKey } from '../../game/model/ticket.model';
import type { Advice, Buy } from '../../game/util/advisor';
import * as economy from '../../game/util/economy';

/** A translation key and params that are themselves keys. */
export interface Phrase {
  readonly key: string;
  readonly params?: Readonly<Record<string, string>>;
}

export function buyName(state: Consultancy, buy: Buy): Phrase {
  switch (buy.kind) {
    case 'skill':
      return {
        key: skillLabelKey(buy.id, economy.skillRank(state, buy.id) + 1),
      };
    case 'line':
      return { key: `purchase.${buy.line}.label` };
    case 'spawner':
      return { key: spawnerLabelKey(buy.adr) };
    case 'income':
      return {
        key: 'agent.income',
        params: { ticket: ticketLabelKey(buy.id) },
      };
  }
}

/** What the paperclip says it looks like you are trying to do. */
export function goalKey(advice: Advice): string {
  const picks = [advice.sp, advice.eur];
  if (picks.some((p) => p?.buy.kind === 'skill' && p.buy.id === FINAL_SKILL_ID))
    return 'agent.goal.signoff';
  if (
    picks.some(
      (p) => p?.buy.kind === 'skill' && ADR_NODE_IDS.includes(p.buy.id)
    )
  )
    return 'agent.goal.adr';
  return 'agent.goal.bill';
}

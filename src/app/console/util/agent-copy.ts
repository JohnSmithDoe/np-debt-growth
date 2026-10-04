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
    case 'credit':
      return {
        key: 'agent.credit',
        params: { adr: skillLabelKey(buy.id) },
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

const PUSH_QUIPS = 10;
const RETEST_QUIPS = 3;
const QUIP_MS = 8_000;

/** A remark per stretch of game time; re-tests draw from their own pool. */
export function pushQuipKey(runMs: number, retest: boolean): string {
  const at = Math.floor(runMs / QUIP_MS);
  return retest
    ? `agent.push.retest.${at % RETEST_QUIPS}`
    : `agent.push.quip.${at % PUSH_QUIPS}`;
}

export function goalKey(advice: Advice): string {
  const picks = [advice.sp, advice.eur];
  if (picks.some((p) => p?.finishing)) return 'agent.goal.finish';
  if (picks.some((p) => p?.buy.kind === 'skill' && p.buy.id === FINAL_SKILL_ID))
    return 'agent.goal.signoff';
  if (
    picks.some(
      (p) =>
        (p?.buy.kind === 'skill' || p?.buy.kind === 'credit') &&
        ADR_NODE_IDS.includes(p.buy.id)
    )
  )
    return 'agent.goal.adr';
  return 'agent.goal.bill';
}

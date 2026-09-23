import {
  formatMoney,
  formatQuantity,
} from '../../@shared/util/format-quantity';
import { AWARD_BY_ID } from '../../game/model/award.model';
import { crewName } from '../../game/model/cast.model';
import type { FeedLine } from '../../game/model/feed.model';
import type { HazardId } from '../../game/model/hazard.model';
import { traitLabelKey } from '../../game/model/senior.model';
import type { TicketEffect } from '../../game/model/ticket.model';
import { TICKET_TYPES } from '../../game/model/ticket.model';
import {
  ESCALATION_HOLD_MS,
  HOTFIX_MS,
  HOTFIX_MULTIPLIER,
} from '../../game/model/balance/weather';
import { PIZZA_MS, PIZZA_RUSH } from '../../game/model/balance/flow';

export interface CloseRow {
  readonly kind: 'close';
  readonly seq: number;
  readonly who: string;
  readonly key: string;
  readonly title: string;
  readonly value: string;
  readonly rare: boolean;
}

export interface NewsRow {
  readonly kind: 'award' | 'note' | 'alert';
  readonly seq: number;
  readonly mark: string;
  readonly text: string;
  readonly detailKey?: string;
}

export type FeedRow = CloseRow | NewsRow;

function eventLabel(
  effect: TicketEffect,
  escalation: number
): string | undefined {
  switch (effect) {
    case 'sprintMultiplier':
      return `×${formatQuantity(escalation)} sprint`;
    case 'hotfixBuff':
      return `×${HOTFIX_MULTIPLIER} for ${HOTFIX_MS / 1000}s`;
    case 'billBoard':
      return 'bills the board';
    case 'crewRush':
      return `×${PIZZA_RUSH} crew nearby for ${PIZZA_MS / 1000}s`;
    default:
      return undefined;
  }
}

export function feedRow(line: FeedLine, escalation: number): FeedRow {
  switch (line.kind) {
    case 'close': {
      const type = TICKET_TYPES[line.close.type];
      return {
        kind: 'close',
        seq: line.seq,
        who:
          line.close.by === 'you'
            ? 'you'
            : line.close.by === 'auto'
              ? 'CI'
              : crewName(line.close.by, line.close.poolSeat, line.close.woman),
        key: `${type.prefix}-${1000 + (line.seq % 8999)}`,
        title: line.title,
        value: eventLabel(type.effect, escalation) ?? formatMoney(line.value),
        rare: type.handOnly,
      };
    }
    case 'award':
      return {
        kind: 'award',
        seq: line.seq,
        mark: '✦',
        text: AWARD_BY_ID.get(line.award)?.label ?? line.award,
      };
    case 'note':
      switch (line.note) {
        case 'hired':
          return {
            kind: 'note',
            seq: line.seq,
            mark: '✦',
            text: `Someone joined — the bench is ${line.count}`,
          };
        case 'senior-hired':
          return {
            kind: 'note',
            seq: line.seq,
            mark: '✦',
            text: line.hire
              ? `${crewName('seniors', line.hire.poolSeat, line.hire.woman)} joined the bench`
              : `Someone joined — the bench is ${line.count}`,
            ...(line.hire ? { detailKey: traitLabelKey(line.hire.trait) } : {}),
          };
        case 'escalation-armed':
          return {
            kind: 'alert',
            seq: line.seq,
            mark: '⚠',
            text: `Escalation bills in ${ESCALATION_HOLD_MS / 1000}s`,
          };
        case 'hazard-due':
          return {
            kind: 'alert',
            seq: line.seq,
            mark: '⚠',
            text: `${hazardName(line.hazard)} in ${line.count}s`,
          };
        case 'hazard-landed':
          return {
            kind: 'alert',
            seq: line.seq,
            mark: '⚠',
            text: `${hazardName(line.hazard)} — ${line.count}s`,
          };
        case 'hazard-declined':
          return {
            kind: 'note',
            seq: line.seq,
            mark: '✦',
            text: `${hazardName(line.hazard)} — declined · ${line.count}s saved`,
          };
        case 'hazard-auto-declined':
          return {
            kind: 'note',
            seq: line.seq,
            mark: '✦',
            text: `${hazardName(line.hazard)} — declined on your behalf`,
          };
        case 'offline':
          return {
            kind: 'note',
            seq: line.seq,
            mark: '✦',
            text: `The retainer ran for ${line.count} min — ${formatMoney(line.money ?? 0)} banked`,
          };
        case 'hazard-groomed':
          return {
            kind: 'alert',
            seq: line.seq,
            mark: '⚠',
            text: `${line.count} items closed as Won't Fix. Nothing was billed`,
          };
      }
  }
}

const HAZARD_NAME: Readonly<Record<HazardId, string>> = {
  'all-hands': 'All-Hands',
  compliance: 'Compliance Training',
  retro: 'Sprint Retrospective',
  reorg: 'Reorganisation Briefing',
  grooming: 'Backlog Grooming',
  storm: 'Incident Storm',
  freeze: 'Prod Freeze',
  offshore: 'Offshore Onboarding',
  page: 'Pager Duty',
  migration: 'Migration Window',
};

function hazardName(id: HazardId | undefined): string {
  return id ? HAZARD_NAME[id] : 'Weather';
}

import {
  formatMoney,
  formatQuantity,
} from '../../@shared/util/format-quantity';
import { awardLabelKey } from '../../game/model/award.model';
import { crewName } from '../../game/model/cast.model';
import type { FeedLine } from '../../game/model/feed.model';
import type { HazardId } from '../../game/model/hazard.model';
import { hazardLabelKey } from '../../game/model/hazard.model';
import { traitLabelKey } from '../../game/model/senior.model';
import type { TicketEffect } from '../../game/model/ticket.model';
import { TICKET_TYPES } from '../../game/model/ticket.model';
import { HOTFIX_MS, HOTFIX_MULTIPLIER } from '../../game/model/balance/weather';
import { PIZZA_MS, PIZZA_RUSH } from '../../game/model/balance/flow';

export interface CloseRow {
  readonly kind: 'close';
  readonly seq: number;
  readonly who: string;
  readonly key: string;
  readonly titleKey: string;
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

export type Say = (
  key: string,
  params?: Record<string, string | number>
) => string;

function eventLabel(
  effect: TicketEffect,
  escalation: number,
  say: Say
): string | undefined {
  switch (effect) {
    case 'sprintMultiplier':
      return say('feed.effect.sprint', { mult: formatQuantity(escalation) });
    case 'hotfixBuff':
      return say('feed.effect.hotfix', {
        mult: HOTFIX_MULTIPLIER,
        seconds: HOTFIX_MS / 1000,
      });
    case 'billBoard':
      return say('feed.effect.board');
    case 'crewRush':
      return say('feed.effect.pizza', {
        mult: PIZZA_RUSH,
        seconds: PIZZA_MS / 1000,
      });
    default:
      return undefined;
  }
}

export function feedRow(line: FeedLine, escalation: number, say: Say): FeedRow {
  const hazard = (id: HazardId | undefined): string =>
    say(id ? hazardLabelKey(id) : 'feed.weather');
  switch (line.kind) {
    case 'close': {
      const type = TICKET_TYPES[line.close.type];
      return {
        kind: 'close',
        seq: line.seq,
        who:
          line.close.by === 'you' || line.close.by === 'auto'
            ? say(`feed.by.${line.close.by}`)
            : crewName(line.close.by, line.close.poolSeat, line.close.woman),
        key: `${type.prefix}-${1000 + (line.seq % 8999)}`,
        titleKey: line.titleKey,
        value:
          eventLabel(type.effect, escalation, say) ?? formatMoney(line.value),
        rare: type.handOnly,
      };
    }
    case 'award':
      return {
        kind: 'award',
        seq: line.seq,
        mark: '✦',
        text: say(awardLabelKey(line.award)),
      };
    case 'note':
      switch (line.note) {
        case 'hired':
          return {
            kind: 'note',
            seq: line.seq,
            mark: '✦',
            text: say('feed.hired', { count: line.count }),
          };
        case 'senior-hired':
          return {
            kind: 'note',
            seq: line.seq,
            mark: '✦',
            text: line.hire
              ? say('feed.hired.senior', {
                  name: crewName(
                    'seniors',
                    line.hire.poolSeat,
                    line.hire.woman
                  ),
                })
              : say('feed.hired', { count: line.count }),
            ...(line.hire ? { detailKey: traitLabelKey(line.hire.trait) } : {}),
          };
        case 'escalation-armed':
          return {
            kind: 'alert',
            seq: line.seq,
            mark: '⚠',
            text: say('feed.escalation', { seconds: line.count }),
          };
        case 'hazard-due':
          return {
            kind: 'alert',
            seq: line.seq,
            mark: '⚠',
            text: say('feed.hazard.due', {
              hazard: hazard(line.hazard),
              seconds: line.count,
            }),
          };
        case 'hazard-landed':
          return {
            kind: 'alert',
            seq: line.seq,
            mark: '⚠',
            text: say('feed.hazard.landed', {
              hazard: hazard(line.hazard),
              seconds: line.count,
            }),
          };
        case 'hazard-declined':
          return {
            kind: 'note',
            seq: line.seq,
            mark: '✦',
            text: say('feed.hazard.declined', {
              hazard: hazard(line.hazard),
              seconds: line.count,
            }),
          };
        case 'hazard-auto-declined':
          return {
            kind: 'note',
            seq: line.seq,
            mark: '✦',
            text: say('feed.hazard.auto-declined', {
              hazard: hazard(line.hazard),
            }),
          };
        case 'hazard-groomed':
          return {
            kind: 'note',
            seq: line.seq,
            mark: '✦',
            text: say('feed.groomed', { count: line.count }),
          };
      }
  }
}

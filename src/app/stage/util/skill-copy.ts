import { LINE_EFFECT_PARAMS } from '../../game/model/purchase-copy.model';
import type { SkillEffect, SkillNode } from '../../game/model/skill.model';
import { ticketLabelKey } from '../../game/model/ticket.model';
import {
  DEBT_INTEREST_CAP,
  GOLDEN_CREW_CONVERSION,
  PIZZA_MS,
  PIZZA_RUSH,
} from '../../game/model/balance/flow';
import type { SceneDeps } from '../model/scene-deps.model';

interface EffectText {
  readonly key: string;
  readonly params?: Readonly<Record<string, string | number>>;
}

function percent(mult: number): string {
  return `+${Math.round((mult - 1) * 100)}%`;
}

function describe(effect: SkillEffect): EffectText {
  switch (effect.kind) {
    case 'none':
      return { key: 'skill.effect.none' };
    case 'goldenChance':
      return {
        key: 'skill.effect.goldenChance',
        params: { value: percent(1 + effect.add) },
      };
    case 'goldenValue':
      return {
        key: 'skill.effect.goldenValue',
        params: { times: effect.add },
      };
    case 'goldenCrew':
      return {
        key: 'skill.effect.goldenCrew',
        params: { value: `${Math.round(GOLDEN_CREW_CONVERSION * 100)}%` },
      };
    case 'clickRadius':
      return { key: 'skill.effect.clickRadius', params: pct(effect.mult) };
    case 'spPerClose':
      return effect.target === undefined
        ? { key: 'skill.effect.spPerClose', params: { count: effect.add } }
        : {
            key: 'skill.effect.spPerClose.ticket',
            params: { count: effect.add, ticket: effect.target },
          };
    case 'crewSp':
      return { key: 'skill.effect.crewSp' };
    case 'pizza':
      return {
        key: 'skill.effect.pizza',
        params: { times: PIZZA_RUSH, seconds: PIZZA_MS / 1000 },
      };
    case 'coach':
      return { key: 'skill.effect.coach', params: { count: effect.add } };
    case 'deck':
      return { key: 'skill.effect.deck', params: { count: effect.add } };
    case 'slots':
      return { key: 'skill.effect.slots', params: { count: effect.add } };
    case 'cans':
      return { key: 'skill.effect.cans', params: { count: effect.add } };
    case 'desks':
      return { key: 'skill.effect.desks', params: { count: effect.add } };
    case 'adr':
      return { key: 'skill.effect.adr', params: { adr: effect.adr } };
    case 'haulShave':
      return {
        key: 'skill.effect.haulShave',
        params: { seconds: effect.seconds },
      };
    case 'standupAura':
      return {
        key: 'skill.effect.standupAura',
        params: {
          each: percent(1 + effect.perJunior),
          cap: percent(effect.cap),
        },
      };
    case 'pace':
      return {
        key: `skill.effect.pace.${effect.crew}.${effect.field}`,
        params: pct(effect.mult),
      };
    case 'batch':
      if (effect.closeMult !== undefined) {
        return {
          key: 'skill.effect.batch.slower',
          params: { count: effect.add, slower: percent(effect.closeMult) },
        };
      }
      return {
        key:
          effect.add === 1
            ? 'skill.effect.batch.one'
            : 'skill.effect.batch.many',
        params: { count: effect.add },
      };
    case 'juniorBand':
      return {
        key: 'skill.effect.juniorBand',
        params: { count: effect.add },
      };
    case 'triagePolicy':
      return {
        key: `skill.effect.triagePolicy.${effect.crew}`,
        params: { ticket: effect.target },
      };
    case 'nearestClaim':
      return { key: 'skill.effect.nearestClaim' };
    case 'topOfBand':
      return { key: 'skill.effect.topOfBand' };
    case 'relabelSteps':
      return {
        key: 'skill.effect.relabelSteps',
        params: { count: effect.add },
      };
    case 'relabelFillerFirst':
      return { key: 'skill.effect.relabelFillerFirst' };
    case 'ticketValue':
      return {
        key: 'skill.effect.ticketValue',
        params: { pct: percent(effect.mult), ticket: effect.target },
      };
    case 'escalation':
      return { key: 'skill.effect.escalation', params: pct(effect.mult) };
    case 'spawnRate':
      if (effect.mult === 0 && effect.target !== undefined) {
        return {
          key: 'skill.effect.retire',
          params: { ticket: effect.target },
        };
      }
      return effect.target === undefined
        ? { key: 'skill.effect.spawnRate', params: pct(effect.mult) }
        : {
            key: 'skill.effect.spawnRate.ticket',
            params: { pct: percent(effect.mult), ticket: effect.target },
          };
    case 'debtInterest':
      return {
        key: 'skill.effect.debtInterest',
        params: {
          pct: `${Math.round(DEBT_INTEREST_CAP * effect.approach * 100)}%`,
        },
      };
    case 'global':
      return { key: 'skill.effect.global', params: pct(effect.mult) };
    case 'line':
      return {
        key: `purchase.${effect.line}.effect`,
        params: LINE_EFFECT_PARAMS[effect.line],
      };
  }
}

const pct = (mult: number): Readonly<Record<string, string>> => ({
  pct: percent(mult),
});

const BY_LEVEL = new Map<string, string>();

function oneEffect(effect: SkillEffect, text: SceneDeps['text']): string {
  const { key, params } = describe(effect);
  return text(key, {
    ...params,
    ...(params && 'ticket' in params
      ? { ticket: text(ticketLabelKey(String(params['ticket']))) }
      : {}),
  });
}

export function skillEffectText(
  node: SkillNode,
  level: number,
  text: SceneDeps['text']
): string {
  const memo = `${node.id}:${level}`;
  const known = BY_LEVEL.get(memo);
  if (known !== undefined) return known;
  const resolved = (node.levels[level - 1]?.effects ?? [])
    .map((effect) => oneEffect(effect, text))
    .join(' · ');
  BY_LEVEL.set(memo, resolved);
  return resolved;
}

export type SkillBadge = '+' | '%';

/**
 * Additive or multiplicative, at a glance — the reference puts this on every
 * node so a shopper can tell a flat bump from a compounding one.
 */
export function skillBadge(node: SkillNode, level: number): SkillBadge | null {
  const effects = node.levels[level - 1]?.effects ?? [];
  let badge: SkillBadge | null = null;
  for (const effect of effects) {
    if ('mult' in effect) return '%';
    if ('add' in effect || effect.kind === 'haulShave') badge = '+';
  }
  return badge;
}

export function skillCode(label: string): string {
  const words = label
    .split(/[\s-]+/)
    .filter((word) => /^[\p{L}\p{N}]/u.test(word));
  const initials = words.map((word) => word[0] ?? '').join('');
  const code = initials.length >= 2 ? initials : label.slice(0, 2);
  return code.slice(0, 2).toUpperCase();
}

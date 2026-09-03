import { describe, expect, it } from 'vitest';

import { EN } from '../../@shared/util/i18n/catalogue/en';
import { SKILL_NODES } from '../../game/model/skill.model';
import { skillEffectText } from './skill-copy';

const text = (key: string, params?: Record<string, string | number>): string =>
  (EN[key] ?? key).replace(/\{\{(\w+)\}\}/g, (whole, name: string) =>
    params && name in params ? String(params[name]) : whole
  );

describe('what a square promises', () => {
  const sentences = SKILL_NODES.flatMap((node) =>
    node.levels.map((_, at) => ({
      where: `${node.id} rank ${at + 1}`,
      says: skillEffectText(node, at + 1, text),
    }))
  );

  it('leaves no placeholder unfilled', () => {
    const unfilled = sentences.filter((row) => row.says.includes('{{'));

    expect(unfilled).toEqual([]);
  });

  it('never falls back to printing a key', () => {
    const raw = sentences.filter((row) => /^[a-z]+\.[a-z]/i.test(row.says));

    expect(raw).toEqual([]);
  });
});

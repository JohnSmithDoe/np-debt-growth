import { describe, expect, it } from 'vitest';

import { AWARDS } from './award.model';
import { freshConsultancy } from './consultancy.model';
import { SKILL_NODES } from './skill.model';

describe('award predicates', () => {
  const ids = new Set(SKILL_NODES.map((node) => node.id));

  const skillIdsRead = (when: (state: never) => boolean): string[] => {
    const seen: string[] = [];
    const state = {
      ...freshConsultancy(0, 1),
      skills: new Proxy({} as Record<string, number>, {
        get: (target, key) => {
          if (typeof key === 'string') seen.push(key);
          return Reflect.get(target, key) as unknown;
        },
        has: (target, key) => {
          if (typeof key === 'string') seen.push(key);
          return Reflect.has(target, key);
        },
      }),
    };
    when(state as never);
    return seen;
  };

  it('names only skills the tree actually has', () => {
    const unknown = AWARDS.flatMap((award) =>
      skillIdsRead(award.when)
        .filter((id) => !ids.has(id))
        .map((id) => `${award.id} → skills['${id}']`)
    );
    expect(unknown).toEqual([]);
  });
});

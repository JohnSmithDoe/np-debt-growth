import { describe, expect, it } from 'vitest';

import {
  SECRET_SKILL_ID,
  SKILL_NODES,
  SKILL_ROOT_ID,
  skillParent,
} from './skill.model';

describe('the tree as a graph (D39)', () => {
  const onTree = SKILL_NODES.filter((node) => node.id !== SECRET_SKILL_ID);

  it('hangs every node off a parent that exists, and roots exactly one', () => {
    const ids = new Set(SKILL_NODES.map((node) => node.id));
    const rootless = onTree.filter((node) => node.requires === null);

    for (const node of onTree) {
      if (node.requires === null) continue;
      expect(
        ids,
        `${node.id} requires ${node.requires}, which is not a node`
      ).toContain(node.requires);
    }
    expect(rootless.map((node) => node.id)).toEqual([SKILL_ROOT_ID]);
  });

  it('reaches every node from the root, so no edge closes a loop', () => {
    const kids = new Map<string, string[]>();
    for (const node of onTree) {
      if (node.requires === null) continue;
      kids.set(node.requires, [...(kids.get(node.requires) ?? []), node.id]);
    }

    const seen = new Set<string>();
    const walk = (id: string): void => {
      expect(
        seen,
        `${id} is reached twice, so its edges close a loop`
      ).not.toContain(id);
      seen.add(id);
      for (const kid of kids.get(id) ?? []) walk(kid);
    };
    walk(SKILL_ROOT_ID);

    const stranded = onTree.filter((node) => !seen.has(node.id));
    expect(stranded.map((node) => node.id)).toEqual([]);
  });
});

describe('the tree the store actually walks (D39)', () => {
  it('collapses to a tree, rooted once, with no chain that eats itself', () => {
    for (const node of SKILL_NODES) {
      if (node.id === SECRET_SKILL_ID) continue;

      const seen = new Set<string>([node.id]);
      let at = skillParent(node.id);
      while (at !== null) {
        expect(
          seen,
          `${node.id} climbs through ${at} twice, so its parents close a loop`
        ).not.toContain(at);
        seen.add(at);
        at = skillParent(at);
      }
      expect(seen, `${node.id} climbs to nothing`).toContain(SKILL_ROOT_ID);
    }
  });

  it('gives a heading nothing to sell', () => {
    for (const node of SKILL_NODES) {
      if (node.heading !== true) continue;
      expect(node.levels, `${node.id} has a level to buy`).toEqual([]);
      expect(node.requires, `${node.id} heads nothing`).not.toBeNull();
    }
    expect(SKILL_NODES.some((node) => node.heading === true)).toBe(true);
  });
});

describe('the tree as a price list (D27/D56)', () => {
  it('never sells a rank cheaper than its predecessor', () => {
    for (const node of SKILL_NODES) {
      const costs = node.levels.map((level) => level.cost);
      for (let rank = 1; rank < costs.length; rank += 1) {
        expect(
          costs[rank]!,
          `${node.id} rank ${rank + 1} (${costs[rank]}) is not dearer than rank ${rank} (${costs[rank - 1]})`
        ).toBeGreaterThan(costs[rank - 1]!);
      }
    }
  });
});

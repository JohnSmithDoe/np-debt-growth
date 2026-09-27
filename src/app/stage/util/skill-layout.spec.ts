import { describe, expect, it } from 'vitest';

import {
  FINAL_SKILL_ID,
  SECRET_SKILL_ID,
  SKILL_NODES,
  SKILL_ROOT_ID,
} from '../../game/model/skill.model';
import {
  revealSquares,
  SKILL_GRAPH,
  skillSquare,
  SQUARE,
  squareAt,
} from './skill-layout';

const onTree = SKILL_NODES.filter(
  (node) =>
    node.id !== SECRET_SKILL_ID &&
    node.granted !== true &&
    node.heading !== true
);

const ranked = (owned: Record<string, number>) =>
  revealSquares((id) => owned[id] ?? 0);

describe('skill layout', () => {
  it('gives every on-tree node exactly one square', () => {
    expect(SKILL_GRAPH.squares).toHaveLength(onTree.length);
    expect(SKILL_GRAPH.squares.map((square) => square.id).sort()).toEqual(
      onTree.map((node) => node.id).sort()
    );
  });

  it('never lets two squares touch', () => {
    const touching: string[] = [];
    for (const a of SKILL_GRAPH.squares) {
      for (const b of SKILL_GRAPH.squares) {
        if (a.id >= b.id) continue;
        const clear =
          a.x + a.width <= b.x ||
          b.x + b.width <= a.x ||
          a.y + a.height <= b.y ||
          b.y + b.height <= a.y;
        if (!clear) touching.push(`${a.id}/${b.id}`);
      }
    }
    expect(touching).toEqual([]);
  });

  it('hangs exactly four arms off the root, and nothing else is rootless', () => {
    const arms = SKILL_GRAPH.squares.filter(
      (square) => square.parent === SKILL_ROOT_ID
    );
    expect(arms.map((square) => square.id).sort()).toEqual([
      'adr1',
      'o1',
      'radius',
      'valueLint',
    ]);
    const orphans = SKILL_GRAPH.squares.filter(
      (square) => square.parent === null
    );
    expect(orphans.map((square) => square.id)).toEqual([SKILL_ROOT_ID]);
  });

  it('never runs a wire through a square it does not join', () => {
    const crossed: string[] = [];
    for (const square of SKILL_GRAPH.squares) {
      for (let leg = 1; leg < square.wire.length; leg += 1) {
        const [from, to] = [square.wire[leg - 1]!, square.wire[leg]!];
        const length = Math.hypot(to.x - from.x, to.y - from.y);
        for (const other of SKILL_GRAPH.squares) {
          if (other.id === square.id || other.id === square.parent) continue;
          for (let run = 0; run <= length; run += 4) {
            const x = from.x + ((to.x - from.x) * run) / length;
            const y = from.y + ((to.y - from.y) * run) / length;
            if (
              x > other.x &&
              x < other.x + other.width &&
              y > other.y &&
              y < other.y + other.height
            ) {
              crossed.push(
                `${square.parent}->${square.id} through ${other.id}`
              );
              break;
            }
          }
        }
      }
    }
    expect([...new Set(crossed)]).toEqual([]);
  });

  it('bends every wire only at right angles', () => {
    for (const square of SKILL_GRAPH.squares) {
      for (let leg = 1; leg < square.wire.length; leg += 1) {
        const [from, to] = [square.wire[leg - 1]!, square.wire[leg]!];
        expect(from.x === to.x || from.y === to.y).toBe(true);
      }
    }
  });

  it('runs every wire from its parent square to its own', () => {
    for (const square of SKILL_GRAPH.squares) {
      if (square.parent === null) {
        expect(square.wire).toEqual([]);
        continue;
      }
      const parent = skillSquare(square.parent);
      expect(parent).toBeDefined();
      expect(square.wire.at(0)).toEqual({
        x: parent!.x + parent!.width / 2,
        y: parent!.y + parent!.height / 2,
      });
      expect(square.wire.at(-1)).toEqual({
        x: square.x + square.width / 2,
        y: square.y + square.height / 2,
      });
    }
  });

  it('lays the whole map out at or past the origin', () => {
    for (const square of SKILL_GRAPH.squares) {
      expect(square.x).toBeGreaterThanOrEqual(0);
      expect(square.y).toBeGreaterThanOrEqual(0);
      expect(square.x + square.width).toBeLessThanOrEqual(SKILL_GRAPH.width);
      expect(square.y + square.height).toBeLessThanOrEqual(SKILL_GRAPH.height);
    }
  });

  it('sets the final apart: bigger, and well east of everything else', () => {
    const final = skillSquare(FINAL_SKILL_ID)!;
    const rung = skillSquare(final.parent!)!;
    expect(final.width).toBeGreaterThan(SQUARE);
    expect(final.y + final.height / 2).toBe(rung.y + rung.height / 2);
    const others = SKILL_GRAPH.squares.filter((one) => one !== final);
    const east = Math.max(...others.map((one) => one.x + one.width));
    expect(final.x - east).toBeGreaterThan(SQUARE * 2);
  });

  it('hit tests a square by its own corner, and misses the gap', () => {
    for (const square of SKILL_GRAPH.squares) {
      expect(squareAt(square.x, square.y)?.id).toBe(square.id);
    }
    expect(squareAt(SKILL_GRAPH.width, SKILL_GRAPH.height)).toBeNull();
  });
});

describe('skill reveal', () => {
  it('opens as the root, readable, with a box on each arm it would open', () => {
    expect([...ranked({}).entries()].sort()).toEqual([
      ['adr1', 'box'],
      ['o1', 'box'],
      ['radius', 'box'],
      [SKILL_ROOT_ID, 'open'],
      ['valueLint', 'box'],
    ]);
  });

  it('makes the four arms readable once the root is bought', () => {
    const shown = ranked({ root: 1 });

    expect(shown.get(SKILL_ROOT_ID)).toBe('owned');
    for (const arm of ['radius', 'valueLint', 'o1', 'adr1']) {
      expect(shown.get(arm)).toBe('open');
    }
    expect(shown.get('capacity')).toBe('box');
  });

  it('never reads a skill whose parent is unbought', () => {
    const shown = ranked({ root: 1, radius: 1 });

    expect(shown.get('capacity')).toBe('open');
    expect(shown.get('o1')).toBe('open');
    expect(shown.get('o3')).toBe('box');
    expect(shown.get('junior')).toBe('box');
    expect(shown.get('juniorSpeed')).toBeUndefined();
    expect(shown.get('cutRetro')).toBe('open');
  });

  it('reveals through a heading as if it were not there', () => {
    const shown = ranked({ root: 1, adr1: 1 });

    expect(shown.get('junior')).toBe('open');
    expect(shown.get('juniorSpeed')).toBe('box');
    for (const heading of ['crew', 'office', 'hand']) {
      expect(shown.has(heading)).toBe(false);
    }
  });

  it('opens no new square for a rank past the first', () => {
    const first = [...ranked({ root: 1, adr1: 1, junior: 1 }).entries()].sort();
    const maxed = [...ranked({ root: 1, adr1: 1, junior: 5 }).entries()].sort();

    expect(maxed).toEqual(first);
    expect(new Map(maxed).get('juniorSpeed')).toBe('open');
  });

  it('never lets the frontier run more than two deep', () => {
    const shown = ranked({
      root: 1,
      adr1: 1,
      radius: 1,
      capacity: 1,
      junior: 1,
    });
    const parents = new Map(
      SKILL_GRAPH.squares.map((square) => [square.id, square.parent])
    );

    for (const [id, state] of shown) {
      const parent = parents.get(id) ?? null;
      if (parent === null) continue;
      if (state === 'open') expect(shown.get(parent)).toBe('owned');
      if (state === 'box') expect(shown.get(parent)).toBe('open');
    }
  });

  it('keeps a held-back square a box even under an owned parent', () => {
    const owned = { root: 1, valueLint: 1, estimatesLint: 1 };
    const shown = revealSquares(
      (id) => owned[id as keyof typeof owned] ?? 0,
      (id) => id !== 'doubleLint'
    );

    expect(shown.get('doubleLint')).toBe('box');
    expect(shown.get('spawnLint')).toBe('open');
  });
});

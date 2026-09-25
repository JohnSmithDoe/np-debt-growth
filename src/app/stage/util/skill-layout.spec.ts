import { describe, expect, it } from 'vitest';

import {
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
        const apart = Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
        if (apart < SQUARE) touching.push(`${a.id}/${b.id}`);
      }
    }
    expect(touching).toEqual([]);
  });

  it('hangs exactly seven arms off the root, and nothing else is rootless', () => {
    const arms = SKILL_GRAPH.squares.filter(
      (square) => square.parent === SKILL_ROOT_ID
    );
    expect(arms.map((square) => square.id).sort()).toEqual([
      'adr1',
      'debtInterest',
      'junior',
      'o1',
      'radius',
      'triagePolicy',
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
      const [from, to] = [square.wire.at(0), square.wire.at(-1)];
      if (!from || !to) continue;
      const length = Math.hypot(to.x - from.x, to.y - from.y);
      for (const other of SKILL_GRAPH.squares) {
        if (other.id === square.id || other.id === square.parent) continue;
        for (let run = 0; run <= length; run += 4) {
          const x = from.x + ((to.x - from.x) * run) / length;
          const y = from.y + ((to.y - from.y) * run) / length;
          if (
            x > other.x &&
            x < other.x + SQUARE &&
            y > other.y &&
            y < other.y + SQUARE
          ) {
            crossed.push(`${square.parent}->${square.id} through ${other.id}`);
            break;
          }
        }
      }
    }
    expect(crossed).toEqual([]);
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
        x: parent!.x + SQUARE / 2,
        y: parent!.y + SQUARE / 2,
      });
      expect(square.wire.at(-1)).toEqual({
        x: square.x + SQUARE / 2,
        y: square.y + SQUARE / 2,
      });
    }
  });

  it('lays the whole map out at or past the origin', () => {
    for (const square of SKILL_GRAPH.squares) {
      expect(square.x).toBeGreaterThanOrEqual(0);
      expect(square.y).toBeGreaterThanOrEqual(0);
      expect(square.x + SQUARE).toBeLessThanOrEqual(SKILL_GRAPH.width);
      expect(square.y + SQUARE).toBeLessThanOrEqual(SKILL_GRAPH.height);
    }
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
      ['debtInterest', 'box'],
      ['junior', 'box'],
      ['o1', 'box'],
      ['radius', 'box'],
      [SKILL_ROOT_ID, 'open'],
      ['triagePolicy', 'box'],
      ['valueLint', 'box'],
    ]);
  });

  it('makes the seven arms readable once the root is bought', () => {
    const shown = ranked({ root: 1 });

    expect(shown.get(SKILL_ROOT_ID)).toBe('owned');
    for (const arm of [
      'radius',
      'junior',
      'valueLint',
      'debtInterest',
      'triagePolicy',
      'o1',
      'adr1',
    ]) {
      expect(shown.get(arm)).toBe('open');
    }
    expect(shown.get('capacity')).toBe('box');
  });

  it('never reads a skill whose parent is unbought', () => {
    const shown = ranked({ root: 1, radius: 1 });

    expect(shown.get('capacity')).toBe('open');
    expect(shown.get('o1')).toBe('open');
    expect(shown.get('o3')).toBe('box');
    expect(shown.get('senior')).toBe('box');
    expect(shown.get('seniorSpeed')).toBeUndefined();
    expect(shown.get('duration')).toBe('open');
  });

  it('reveals through a heading as if it were not there', () => {
    const shown = ranked({ root: 1 });

    expect(shown.get('junior')).toBe('open');
    expect(shown.get('juniorSpeed')).toBe('box');
    for (const heading of ['crew', 'office', 'hand']) {
      expect(shown.has(heading)).toBe(false);
    }
  });

  it('opens no new square for a rank past the first', () => {
    const first = [...ranked({ root: 1, junior: 1 }).entries()].sort();
    const maxed = [...ranked({ root: 1, junior: 5 }).entries()].sort();

    expect(maxed).toEqual(first);
    expect(new Map(maxed).get('juniorSpeed')).toBe('open');
  });

  it('never lets the frontier run more than two deep', () => {
    const shown = ranked({ root: 1, radius: 1, capacity: 1, junior: 1 });
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
});

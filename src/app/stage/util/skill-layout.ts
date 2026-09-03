import type { SkillNode } from '../../game/model/skill.model';
import {
  isSkillHeading,
  SECRET_SKILL_ID,
  SKILL_NODES,
  SKILL_ROOT_ID,
  skillParent,
} from '../../game/model/skill.model';
import type { HitRect } from '../model/hit-rect.model';
import { hits } from '../model/hit-rect.model';

export const SQUARE = 64;
const LANE_GAP = 30;
const LANE_PITCH = SQUARE + LANE_GAP;
const LAYER_PITCH = SQUARE + 92;
const BAND_HEADROOM = 46;

interface Vec {
  readonly x: number;
  readonly y: number;
}

const ON_TREE = SKILL_NODES.filter(
  (node) =>
    node.id !== SECRET_SKILL_ID &&
    node.granted !== true &&
    node.heading !== true
);

const BY_NODE: ReadonlyMap<string, SkillNode> = new Map(
  ON_TREE.map((node) => [node.id, node])
);

export interface SkillSquare extends HitRect {
  readonly node: SkillNode;
  readonly parent: string | null;
  readonly wire: readonly Vec[];
}

export interface SkillBand {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly over: readonly string[];
}

export interface SkillGraph {
  readonly squares: readonly SkillSquare[];
  readonly bands: readonly SkillBand[];
  readonly width: number;
  readonly height: number;
}

function topology(): {
  children: ReadonlyMap<string, readonly string[]>;
  parents: ReadonlyMap<string, string | null>;
} {
  const children = new Map<string, string[]>();
  const parents = new Map<string, string | null>();

  for (const node of ON_TREE) {
    const parent = skillParent(node.id);
    parents.set(node.id, parent);
    if (parent === null) continue;
    const kids = children.get(parent);
    if (kids) kids.push(node.id);
    else children.set(parent, [node.id]);
  }

  return { children, parents };
}

const { children: CHILDREN, parents: PARENTS } = topology();

function kidsOf(id: string): readonly string[] {
  return CHILDREN.get(id) ?? [];
}

function spanOf(id: string, cache: Map<string, number>): number {
  const known = cache.get(id);
  if (known !== undefined) return known;
  const kids = kidsOf(id);
  const span =
    kids.length === 0
      ? 1
      : kids.reduce((total, kid) => total + spanOf(kid, cache), 0);
  cache.set(id, span);
  return span;
}

interface Cell {
  readonly depth: number;
  readonly lane: number;
  readonly from: number;
  readonly to: number;
}

function place(
  id: string,
  depth: number,
  base: number,
  cells: Map<string, Cell>,
  spans: Map<string, number>
): void {
  const kids = kidsOf(id);
  const to = base + spanOf(id, spans) - 1;

  if (kids.length === 0) {
    cells.set(id, { depth, lane: base, from: base, to });
    return;
  }

  let cursor = base;
  for (const kid of kids) {
    place(kid, depth + 1, cursor, cells, spans);
    cursor += spanOf(kid, spans);
  }

  const first = cells.get(kids[0]!)!;
  const last = cells.get(kids[kids.length - 1]!)!;
  cells.set(id, {
    depth,
    lane: (first.lane + last.lane) / 2,
    from: base,
    to,
  });
}

function elbow(from: Vec, to: Vec): readonly Vec[] {
  const mid = (from.y + to.y) / 2;
  if (from.x === to.x) return [from, to];
  return [from, { x: from.x, y: mid }, { x: to.x, y: mid }, to];
}

function packed(): Map<string, Cell> {
  const heads = kidsOf(SKILL_ROOT_ID);
  const split = Math.ceil(heads.length / 2);
  const rows = [heads.slice(0, split), heads.slice(split)];
  const spans = new Map<string, number>();

  const laid = rows.map((row) => {
    const cells = new Map<string, Cell>();
    let base = 0;
    for (const head of row) {
      place(head, 0, base, cells, spans);
      base += spanOf(head, spans);
    }
    const depth = Math.max(0, ...[...cells.values()].map((one) => one.depth));
    return { cells, lanes: base, depth };
  });

  const lanes = Math.max(...laid.map((row) => row.lanes));
  const out = new Map<string, Cell>();

  for (const [at, row] of laid.entries()) {
    const up = at === 0;
    const shift = (lanes - row.lanes) / 2;
    for (const [id, cell] of row.cells) {
      const away = 1 + cell.depth;
      out.set(id, {
        depth: up ? -away : away,
        lane: cell.lane + shift,
        from: cell.from + shift,
        to: cell.to + shift,
      });
    }
  }

  const headLanes = heads.flatMap((id) => {
    const cell = out.get(id);
    return cell ? [cell.lane] : [];
  });
  out.set(SKILL_ROOT_ID, {
    depth: 0,
    lane: (Math.min(...headLanes) + Math.max(...headLanes)) / 2,
    from: 0,
    to: lanes - 1,
  });

  const floor = Math.min(...[...out.values()].map((one) => one.depth));
  for (const [id, cell] of out)
    out.set(id, { ...cell, depth: cell.depth - floor });
  return out;
}

function build(): SkillGraph {
  const root = BY_NODE.get(SKILL_ROOT_ID);
  if (!root) throw new Error(`No ${SKILL_ROOT_ID} node to hang the map on`);

  const cells = packed();

  const half = SQUARE / 2;
  const top = BAND_HEADROOM + half;
  const centreOf = (id: string): Vec => {
    const cell = cells.get(id);
    if (!cell) return { x: half, y: top };
    return {
      x: half + cell.lane * LANE_PITCH,
      y: top + cell.depth * LAYER_PITCH,
    };
  };

  const squares: SkillSquare[] = [];
  for (const node of ON_TREE) {
    const cell = cells.get(node.id);
    if (!cell) continue;
    const parent = PARENTS.get(node.id) ?? null;
    const centre = centreOf(node.id);
    squares.push({
      id: node.id,
      node,
      x: centre.x - half,
      y: centre.y - half,
      width: SQUARE,
      height: SQUARE,
      parent,
      wire: parent === null ? [] : elbow(centreOf(parent), centre),
    });
  }

  return {
    squares,
    bands: bandsFrom(cells),
    width: Math.max(...squares.map((one) => one.x + SQUARE)) + half,
    height: Math.max(...squares.map((one) => one.y + SQUARE)) + half,
  };
}

function bandsFrom(cells: ReadonlyMap<string, Cell>): readonly SkillBand[] {
  const bands: SkillBand[] = [];

  for (const node of SKILL_NODES) {
    if (node.heading !== true) continue;
    const under = SKILL_NODES.filter(
      (one) => one.requires === node.id && !isSkillHeading(one.id)
    ).map((one) => one.id);

    const spread = under.flatMap((id) => {
      const cell = cells.get(id);
      return cell ? [cell] : [];
    });
    if (spread.length === 0) continue;

    const from = Math.min(...spread.map((cell) => cell.from));
    const to = Math.max(...spread.map((cell) => cell.to));
    const depth = Math.min(...spread.map((cell) => cell.depth));

    bands.push({
      id: node.id,
      x: from * LANE_PITCH,
      y: depth * LAYER_PITCH,
      width: (to - from) * LANE_PITCH + SQUARE,
      over: descendants(cells, under),
    });
  }

  return bands;
}

function descendants(
  cells: ReadonlyMap<string, Cell>,
  roots: readonly string[]
): readonly string[] {
  const out: string[] = [];
  const walk = (id: string): void => {
    if (!cells.has(id)) return;
    out.push(id);
    for (const kid of kidsOf(id)) walk(kid);
  };
  for (const id of roots) walk(id);
  return out;
}

export const SKILL_GRAPH: SkillGraph = build();

const BY_ID: ReadonlyMap<string, SkillSquare> = new Map(
  SKILL_GRAPH.squares.map((square) => [square.id, square])
);

export function skillSquare(id: string): SkillSquare | undefined {
  return BY_ID.get(id);
}

export function squareAt(x: number, y: number): SkillSquare | null {
  for (const square of SKILL_GRAPH.squares) {
    if (hits(square, x, y)) return square;
  }
  return null;
}

export type SquareState = 'owned' | 'open' | 'box';

export function revealSquares(
  rankOf: (nodeId: string) => number
): ReadonlyMap<string, SquareState> {
  const shown = new Map<string, SquareState>();

  const walk = (id: string, from: SquareState): void => {
    const state = stateOf(rankOf(id), from);
    if (state === null) return;
    shown.set(id, state);
    for (const kid of kidsOf(id)) walk(kid, state);
  };

  walk(SKILL_ROOT_ID, 'owned');
  return shown;
}

function stateOf(rank: number, parent: SquareState): SquareState | null {
  if (rank > 0) return 'owned';
  if (parent === 'owned') return 'open';
  return parent === 'open' ? 'box' : null;
}

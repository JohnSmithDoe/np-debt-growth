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
/** Clear space every square keeps from every other. */
const GAP = 45;
/** Rest length of a wire, and the seed's ring step. */
const LINK = 170;
const SEED_RING = 150;
const FIRST_RING = 230;
const RELAX_STEPS = 300;
/** Springs at their floor: separation dominates, so the last overlaps resolve. */
const SETTLE_STEPS = 100;
/** Keeps a settling wire from stretching while squares push off it. */
const SPRING_FLOOR = 0.02;
const MARGIN = SQUARE;
/** A heading's name at band scale: the longest catalogue entry, 25 glyphs of 14 px. */
const BAND_ROOM = 360;
const BAND_HIGH = 24;
/** Band text is drawn from its top edge. */
const BAND_TEXT_TOP = 8;

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

function leavesOf(id: string, cache: Map<string, number>): number {
  const known = cache.get(id);
  if (known !== undefined) return known;
  const kids = kidsOf(id);
  const count =
    kids.length === 0
      ? 1
      : kids.reduce((sum, kid) => sum + leavesOf(kid, cache), 0);
  cache.set(id, count);
  return count;
}

/** Rings by depth, wedges by leaf count: crowded, but pointing the right way. */
function seed(): Map<string, Vec> {
  const leaves = new Map<string, number>();
  const out = new Map<string, Vec>();
  const walk = (id: string, depth: number, from: number, to: number): void => {
    const angle = (from + to) / 2;
    const radius = depth === 0 ? 0 : FIRST_RING + (depth - 1) * SEED_RING;
    out.set(id, { x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
    const kids = kidsOf(id);
    const total = leavesOf(id, leaves);
    let at = from;
    for (const kid of kids) {
      const share = ((to - from) * leavesOf(kid, leaves)) / total;
      walk(kid, depth + 1, at, at + share);
      at += share;
    }
  };
  walk(SKILL_ROOT_ID, 0, -Math.PI, Math.PI);
  return out;
}

/** The arms a heading names: its own children, headings collapsed away. */
const HEADING_ARMS: ReadonlyMap<string, readonly string[]> = new Map(
  SKILL_NODES.filter((node) => node.heading === true).flatMap((node) => {
    const arms = SKILL_NODES.filter(
      (one) =>
        one.requires === node.id &&
        !isSkillHeading(one.id) &&
        BY_NODE.has(one.id)
    ).map((one) => one.id);
    return arms.length === 0 ? [] : [[node.id, arms] as const];
  })
);

const bandBody = (heading: string): string => `band:${heading}`;

interface Body {
  readonly id: string;
  readonly parent: number;
  /** A label's arms; it floats beside their middle. */
  readonly anchors: readonly number[];
  readonly hw: number;
  readonly hh: number;
  x: number;
  y: number;
}

const isLabel = (body: Body): boolean => body.anchors.length > 0;

/** Shove two boxes apart along the shallower axis until `GAP` clears them. */
function separateBoxes(one: Body, two: Body): void {
  const dx = two.x - one.x;
  const dy = two.y - one.y;
  const ox = one.hw + two.hw + GAP - Math.abs(dx);
  const oy = one.hh + two.hh + GAP - Math.abs(dy);
  if (ox <= 0 || oy <= 0) return;
  if (ox < oy) {
    const push = (Math.sign(dx) || 1) * (ox / 2);
    one.x -= push;
    two.x += push;
  } else {
    const push = (Math.sign(dy) || 1) * (oy / 2);
    one.y -= push;
    two.y += push;
  }
}

/** Squares push round, so a crowd spreads in every direction rather than in rows. */
function separateSquares(one: Body, two: Body, pitch: number): void {
  const dx = two.x - one.x;
  const dy = two.y - one.y;
  const deficit = pitch - Math.max(Math.abs(dx), Math.abs(dy));
  if (deficit <= 0) return;
  const length = Math.hypot(dx, dy) || 1;
  const push = deficit / 2 / length;
  one.x -= dx * push;
  one.y -= dy * push;
  two.x += dx * push;
  two.y += dy * push;
}

/** Push a body off a wire it does not belong to. */
function clearWire(body: Body, from: Body, to: Body): void {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = dx * dx + dy * dy;
  if (length === 0) return;
  const t = Math.max(
    0,
    Math.min(1, ((body.x - from.x) * dx + (body.y - from.y) * dy) / length)
  );
  const nx = body.x - (from.x + t * dx);
  const ny = body.y - (from.y + t * dy);

  if (isLabel(body)) {
    const ox = body.hw + GAP / 3 - Math.abs(nx);
    const oy = body.hh + GAP / 3 - Math.abs(ny);
    if (ox <= 0 || oy <= 0) return;
    if (ox < oy) body.x += (Math.sign(nx) || 1) * (ox / 2);
    else body.y += (Math.sign(ny) || 1) * (oy / 2);
    return;
  }

  const room = body.hw * Math.SQRT2 + GAP / 3;
  const off = Math.hypot(nx, ny);
  if (off >= room || off === 0) return;
  const push = (room - off) / 2;
  const [px, py] = [(nx / off) * push, (ny / off) * push];
  body.x += px;
  body.y += py;
  to.x -= px * (1 - t);
  to.y -= py * (1 - t);
  from.x -= px * t;
  from.y -= py * t;
}

/**
 * Deterministic relaxation: squares and heading names shove each other apart
 * until `GAP` clears them, wires spring back towards `LINK`, names cling to
 * their arms, and nothing sits on a wire that is not its own. The root stays.
 */
function relax(start: ReadonlyMap<string, Vec>): Map<string, Vec> {
  const ids = [...start.keys()];
  const index = new Map(ids.map((id, at) => [id, at]));
  const half = SQUARE / 2;
  const bodies: Body[] = ids.map((id) => ({
    id,
    parent: index.get(PARENTS.get(id) ?? '') ?? -1,
    anchors: [],
    hw: half,
    hh: half,
    ...start.get(id)!,
  }));
  const rootStart = start.get(SKILL_ROOT_ID)!;
  for (const [heading, arms] of HEADING_ARMS) {
    const anchors = arms.map((arm) => index.get(arm)!);
    const mid = centroid(anchors.map((at) => bodies[at]!));
    const out = Math.hypot(mid.x - rootStart.x, mid.y - rootStart.y) || 1;
    const lift = LINK / 2;
    bodies.push({
      id: bandBody(heading),
      parent: -1,
      anchors,
      hw: BAND_ROOM / 2,
      hh: BAND_HIGH / 2,
      x: mid.x + ((mid.x - rootStart.x) / out) * lift,
      y: mid.y + ((mid.y - rootStart.y) / out) * lift,
    });
  }

  const pitch = SQUARE + GAP;
  const cling = half + BAND_HIGH / 2 + GAP;
  const rootAt = index.get(SKILL_ROOT_ID)!;

  for (let step = 0; step < RELAX_STEPS + SETTLE_STEPS; step += 1) {
    const spring = Math.max(SPRING_FLOOR, 0.2 * (1 - step / RELAX_STEPS));

    for (const body of bodies) {
      const anchor =
        body.parent >= 0
          ? { at: bodies[body.parent]!, rest: LINK }
          : isLabel(body)
            ? {
                at: centroid(body.anchors.map((at) => bodies[at]!)),
                rest: cling,
              }
            : null;
      if (!anchor) continue;
      const dx = body.x - anchor.at.x;
      const dy = body.y - anchor.at.y;
      const length = Math.hypot(dx, dy) || 1;
      if (isLabel(body) && length < anchor.rest) continue;
      const pull = ((length - anchor.rest) / length) * spring;
      body.x -= dx * pull;
      body.y -= dy * pull;
    }

    for (let a = 0; a < bodies.length; a += 1) {
      for (let b = a + 1; b < bodies.length; b += 1) {
        const one = bodies[a]!;
        const two = bodies[b]!;
        if (isLabel(one) || isLabel(two)) separateBoxes(one, two);
        else separateSquares(one, two, pitch);
      }
    }

    for (const wire of bodies) {
      if (wire.parent < 0) continue;
      const parent = bodies[wire.parent]!;
      for (const body of bodies) {
        if (body === wire || body === parent) continue;
        clearWire(body, parent, wire);
      }
    }

    const root = bodies[rootAt]!;
    const [sx, sy] = [root.x - rootStart.x, root.y - rootStart.y];
    for (const body of bodies) {
      body.x -= sx;
      body.y -= sy;
    }
  }

  return new Map(bodies.map((body) => [body.id, { x: body.x, y: body.y }]));
}

function centroid(points: readonly Vec[]): Vec {
  return {
    x: points.reduce((sum, one) => sum + one.x, 0) / points.length,
    y: points.reduce((sum, one) => sum + one.y, 0) / points.length,
  };
}

function build(): SkillGraph {
  const root = BY_NODE.get(SKILL_ROOT_ID);
  if (!root) throw new Error(`No ${SKILL_ROOT_ID} node to hang the map on`);

  const raw = relax(seed());
  const half = SQUARE / 2;
  const reach = (id: string): Vec =>
    id.startsWith('band:')
      ? { x: BAND_ROOM / 2, y: BAND_HIGH / 2 }
      : { x: half, y: half };
  const left =
    Math.min(...[...raw].map(([id, one]) => one.x - reach(id).x)) - MARGIN;
  const top =
    Math.min(...[...raw].map(([id, one]) => one.y - reach(id).y)) - MARGIN;
  const centres = new Map(
    [...raw].map(([id, one]) => [
      id,
      { x: Math.round(one.x - left), y: Math.round(one.y - top) },
    ])
  );

  const squares: SkillSquare[] = [];
  for (const node of ON_TREE) {
    const centre = centres.get(node.id);
    if (!centre) continue;
    const parent = PARENTS.get(node.id) ?? null;
    const from = parent === null ? undefined : centres.get(parent);
    squares.push({
      id: node.id,
      node,
      x: centre.x - half,
      y: centre.y - half,
      width: SQUARE,
      height: SQUARE,
      parent,
      wire: from ? [from, centre] : [],
    });
  }

  const bands = bandsFrom(centres);
  return {
    squares,
    bands,
    width:
      Math.max(
        ...squares.map((one) => one.x + SQUARE),
        ...bands.map((one) => one.x + one.width)
      ) + MARGIN,
    height:
      Math.max(
        ...squares.map((one) => one.y + SQUARE),
        ...bands.map((one) => one.y + BAND_HIGH)
      ) + MARGIN,
  };
}

function bandsFrom(centres: ReadonlyMap<string, Vec>): readonly SkillBand[] {
  return [...HEADING_ARMS].flatMap(([heading, arms]) => {
    const centre = centres.get(bandBody(heading));
    if (!centre) return [];
    return [
      {
        id: heading,
        x: centre.x - BAND_ROOM / 2,
        y: centre.y - BAND_TEXT_TOP,
        width: BAND_ROOM,
        over: descendants(centres, arms),
      },
    ];
  });
}

function descendants(
  centres: ReadonlyMap<string, Vec>,
  roots: readonly string[]
): readonly string[] {
  const out: string[] = [];
  const walk = (id: string): void => {
    if (!centres.has(id)) return;
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

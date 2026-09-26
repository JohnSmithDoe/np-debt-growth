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
/** One leaf's share of a tree's breadth: a square and the gap beside it. */
const LANE = SQUARE + 30;
/** One step outwards; the gap between layers carries the wire elbows. */
const LAYER = SQUARE + 92;
const MARGIN = SQUARE;
/** A heading's name at band scale: the longest catalogue entry, 25 glyphs of 14 px. */
const BAND_ROOM = 360;
const BAND_HIGH = 24;
/** Band text is drawn from its top edge. */
const BAND_TEXT_TOP = 8;
/** Clear space a heading's name keeps from squares and wires. */
const BAND_CLEAR = 10;

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

/** A rung of the ADR ladder: it runs the spine instead of branching off it. */
const isRung = (id: string): boolean =>
  BY_NODE.get(id)?.levels.some((level) =>
    level.effects.some((effect) => effect.kind === 'adr')
  ) === true;

const branches = (id: string): readonly string[] =>
  kidsOf(id).filter((kid) => !isRung(kid));

/** A subtree's breadth in lanes: one per leaf. */
function breadth(id: string): number {
  const kids = branches(id);
  return kids.length === 0
    ? 1
    : kids.reduce((sum, kid) => sum + breadth(kid), 0);
}

const forestBreadth = (ids: readonly string[]): number =>
  ids.reduce((sum, id) => sum + breadth(id), 0);

/** Where a forest grows from, which way it grows, and which way it spreads. */
interface Frame {
  readonly origin: Vec;
  readonly along: Vec;
  readonly across: Vec;
}

const NORTH: Omit<Frame, 'origin'> = {
  along: { x: 0, y: -1 },
  across: { x: 1, y: 0 },
};
const SOUTH: Omit<Frame, 'origin'> = {
  along: { x: 0, y: 1 },
  across: { x: 1, y: 0 },
};
const WEST: Omit<Frame, 'origin'> = {
  along: { x: -1, y: 0 },
  across: { x: 0, y: 1 },
};

/** Squares whose parent sits a layer above or below them, not beside. */
const STACKED = new Set<string>();

/** A tidy tree: a layer per depth, a lane per leaf, each parent over its children. */
function plantForest(
  ids: readonly string[],
  frame: Frame,
  out: Map<string, Vec>
): void {
  const place = (id: string, depth: number, lane: number): void => {
    const centre = lane + breadth(id) / 2;
    if (frame.along.y !== 0) STACKED.add(id);
    out.set(id, {
      x:
        frame.origin.x +
        frame.along.x * depth * LAYER +
        frame.across.x * centre * LANE,
      y:
        frame.origin.y +
        frame.along.y * depth * LAYER +
        frame.across.y * centre * LANE,
    });
    let at = lane;
    for (const kid of branches(id)) {
      place(kid, depth + 1, at);
      at += breadth(kid);
    }
  };
  let at = -forestBreadth(ids) / 2;
  for (const id of ids) {
    place(id, 1, at);
    at += breadth(id);
  }
}

/** Splits a rung's branches over its two sides, keeping their order, evening the breadth. */
function sides(ids: readonly string[]): [string[], string[]] {
  const up: string[] = [];
  const down: string[] = [];
  for (const id of ids) {
    if (forestBreadth(up) <= forestBreadth(down)) up.push(id);
    else down.push(id);
  }
  return [up, down];
}

function ladderFrom(first: string | undefined): readonly string[] {
  const out: string[] = [];
  for (let rung = first; rung; rung = kidsOf(rung).find(isRung)) out.push(rung);
  return out;
}

/**
 * The root in the middle, one arm per compass point. The ADR ladder is a
 * spine running east, each rung's branches hanging north and south off it;
 * the widest other arm grows west, the two narrower ones north and south.
 */
function seed(): Map<string, Vec> {
  const out = new Map<string, Vec>([[SKILL_ROOT_ID, { x: 0, y: 0 }]]);
  const arms = kidsOf(SKILL_ROOT_ID);
  const [west, north, south] = arms
    .filter((id) => !isRung(id))
    .sort((one, two) => breadth(two) - breadth(one));
  const ladder = ladderFrom(arms.find(isRung));
  const origin = { x: 0, y: 0 };

  if (north) plantForest([north], { ...NORTH, origin }, out);
  if (south) plantForest([south], { ...SOUTH, origin }, out);
  const clearX =
    (Math.max(north ? breadth(north) : 0, south ? breadth(south) : 0) / 2) *
    LANE;
  if (west) {
    const pull = Math.max(
      0,
      clearX + SQUARE / 2 + (LANE - SQUARE) / 2 - 2 * LAYER
    );
    plantForest([west], { ...WEST, origin: { x: -pull, y: 0 } }, out);
  }

  const split = ladder.map((rung) => sides(branches(rung)));
  const half = ([up, down]: [string[], string[]]): [number, number] => [
    (forestBreadth(up) / 2) * LANE,
    (forestBreadth(down) / 2) * LANE,
  ];
  let x = 0;
  ladder.forEach((rung, at) => {
    const [up, down] = half(split[at]!);
    if (at === 0) x = Math.max(LAYER, clearX + Math.max(up, down));
    else {
      const [lastUp, lastDown] = half(split[at - 1]!);
      x += Math.max(LAYER, lastUp + up, lastDown + down);
    }
    out.set(rung, { x, y: 0 });
    const [upIds, downIds] = split[at]!;
    plantForest(upIds, { ...NORTH, origin: { x, y: 0 } }, out);
    plantForest(downIds, { ...SOUTH, origin: { x, y: 0 } }, out);
  });

  return out;
}

/** A wire bent once each way, turning halfway along the axis it grows on. */
function elbow(from: Vec, to: Vec, stacked: boolean): readonly Vec[] {
  if (from.x === to.x || from.y === to.y) return [from, to];
  if (stacked) {
    const mid = Math.round((from.y + to.y) / 2);
    return [from, { x: from.x, y: mid }, { x: to.x, y: mid }, to];
  }
  const mid = Math.round((from.x + to.x) / 2);
  return [from, { x: mid, y: from.y }, { x: mid, y: to.y }, to];
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

interface Box {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

const overlaps = (one: Box, two: Box): boolean =>
  one.left < two.right &&
  two.left < one.right &&
  one.top < two.bottom &&
  two.top < one.bottom;

const boxAround = (centre: Vec, hw: number, hh: number): Box => ({
  left: centre.x - hw,
  top: centre.y - hh,
  right: centre.x + hw,
  bottom: centre.y + hh,
});

/** Clear spots within this many steps beat a spot on a wire; past it, the name sits on one. */
const BAND_NEAR = 3;

/**
 * A heading's name beside its first arm: the nearest spot clear of squares,
 * wires and other names, or failing that of squares and names alone.
 */
function bandCentres(
  centres: ReadonlyMap<string, Vec>,
  wires: readonly (readonly Vec[])[]
): Map<string, Vec> {
  const half = SQUARE / 2;
  const solid: Box[] = [...centres.values()].map((one) =>
    boxAround(one, half, half)
  );
  const wired: Box[] = wires.flatMap((wire) =>
    wire.slice(1).map((to, at) => {
      const from = wire[at]!;
      return {
        left: Math.min(from.x, to.x),
        top: Math.min(from.y, to.y),
        right: Math.max(from.x, to.x),
        bottom: Math.max(from.y, to.y),
      };
    })
  );
  const [hw, hh] = [BAND_ROOM / 2 + BAND_CLEAR, BAND_HIGH / 2 + BAND_CLEAR];
  const clear = (spot: Vec, boxes: readonly Box[]): boolean =>
    !boxes.some((box) => overlaps(box, boxAround(spot, hw, hh)));
  const out = new Map<string, Vec>();

  for (const [heading, arms] of HEADING_ARMS) {
    const arm = centres.get(arms[0]!);
    if (!arm) continue;
    const ring = (far: number): Vec[] => {
      const off = far * 16;
      return [
        { x: arm.x, y: arm.y - half - hh - off },
        { x: arm.x, y: arm.y + half + hh + off },
        { x: arm.x + half + hw + off, y: arm.y },
        { x: arm.x - half - hw - off, y: arm.y },
      ];
    };
    const near = Array.from({ length: BAND_NEAR }, (_, far) =>
      ring(far)
    ).flat();
    const wide = Array.from({ length: 24 }, (_, far) => ring(far)).flat();
    const spot =
      near.find((one) => clear(one, [...solid, ...wired])) ??
      wide.find((one) => clear(one, solid)) ??
      near[0]!;
    out.set(heading, spot);
    solid.push(boxAround(spot, hw, hh));
  }
  return out;
}

function build(): SkillGraph {
  const root = BY_NODE.get(SKILL_ROOT_ID);
  if (!root) throw new Error(`No ${SKILL_ROOT_ID} node to hang the map on`);

  const raw = seed();
  const wireOf = (id: string, at: ReadonlyMap<string, Vec>): readonly Vec[] => {
    const parent = PARENTS.get(id);
    const from = parent ? at.get(parent) : undefined;
    const to = at.get(id);
    return from && to ? elbow(from, to, STACKED.has(id)) : [];
  };
  const named = bandCentres(
    raw,
    [...raw.keys()].map((id) => wireOf(id, raw))
  );

  const half = SQUARE / 2;
  const boxes = [
    ...[...raw.values()].map((one) => boxAround(one, half, half)),
    ...[...named.values()].map((one) =>
      boxAround(one, BAND_ROOM / 2, BAND_HIGH / 2)
    ),
  ];
  const left = Math.min(...boxes.map((box) => box.left)) - MARGIN;
  const top = Math.min(...boxes.map((box) => box.top)) - MARGIN;
  const shift = (one: Vec): Vec => ({
    x: Math.round(one.x - left),
    y: Math.round(one.y - top),
  });
  const centres = new Map([...raw].map(([id, one]) => [id, shift(one)]));

  const squares: SkillSquare[] = [];
  for (const node of ON_TREE) {
    const centre = centres.get(node.id);
    if (!centre) continue;
    squares.push({
      id: node.id,
      node,
      x: centre.x - half,
      y: centre.y - half,
      width: SQUARE,
      height: SQUARE,
      parent: PARENTS.get(node.id) ?? null,
      wire: wireOf(node.id, centres),
    });
  }

  const bands = [...named].map(([heading, centre]) => {
    const at = shift(centre);
    return {
      id: heading,
      x: at.x - BAND_ROOM / 2,
      y: at.y - BAND_TEXT_TOP,
      width: BAND_ROOM,
      over: descendants(centres, HEADING_ARMS.get(heading) ?? []),
    };
  });

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

/** `ready` holds back a square whose parent is owned but whose other terms are not met. */
export function revealSquares(
  rankOf: (nodeId: string) => number,
  ready: (nodeId: string) => boolean = () => true
): ReadonlyMap<string, SquareState> {
  const shown = new Map<string, SquareState>();

  const walk = (id: string, from: SquareState): void => {
    const state = stateOf(rankOf(id), from, () => ready(id));
    if (state === null) return;
    shown.set(id, state);
    for (const kid of kidsOf(id)) walk(kid, state);
  };

  walk(SKILL_ROOT_ID, 'owned');
  return shown;
}

function stateOf(
  rank: number,
  parent: SquareState,
  ready: () => boolean
): SquareState | null {
  if (rank > 0) return 'owned';
  if (parent === 'owned') return ready() ? 'open' : 'box';
  return parent === 'open' ? 'box' : null;
}

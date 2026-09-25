import type { CrewKind, CrewMode } from '../crew.model';
import type { SkillEffect } from '../skill.model';
import type { PurchaseId } from './progression';

/**
 * Claim priority: earlier kinds pick tickets off the board first. Reordering
 * this retunes who gets the dearest work, so it is a balance knob in itself.
 */
export const CREW_KINDS = [
  'offshore',
  'seniors',
  'juniors',
  'managers',
] as const satisfies readonly CrewKind[];

export interface CrewBand {
  readonly from: number;
  readonly to: number;
}

/** Which `SkillEffect` kind tunes each pace field; `null` = no skill reaches it. */
export interface CrewPaceEffects {
  readonly close: SkillEffect['kind'] | null;
  readonly walk: SkillEffect['kind'] | null;
  readonly batch: SkillEffect['kind'] | null;
  readonly sweep: SkillEffect['kind'] | null;
}

export interface CrewStats {
  readonly closeMs: number;
  readonly walkSpeed: number;
  readonly homeY: number;
  readonly batchBase: number;
  readonly sweepRadius: number;
  readonly womanEvery: number;
  readonly band: CrewBand;
  readonly takesRares: boolean;
  readonly mode: CrewMode;
  /** `null` = headcount comes from the weather, not a bought line. */
  readonly levelKey: PurchaseId | null;
  readonly effects: CrewPaceEffects;
  readonly leaves: number;
  /** Meetings pull this crew off the board. */
  readonly interruptible: boolean;
  /** Junior-only: standup aura scales with headcount. */
  readonly aura: boolean;
  /** Seniors carry per-seat traits, so each seat gets its own pace. */
  readonly perSeat: boolean;
}

export const CREW_STATS = {
  juniors: {
    closeMs: 5_000,
    walkSpeed: 90,
    homeY: 440,
    batchBase: 1,
    sweepRadius: 40,
    womanEvery: 4,
    band: { from: 0, to: 3 },
    takesRares: false,
    mode: 'closer',
    levelKey: 'junior',
    effects: {
      close: 'junior',
      walk: 'juniorWalk',
      batch: 'juniorBatch',
      sweep: 'juniorSweep',
    },
    leaves: 0,
    interruptible: true,
    aura: true,
    perSeat: false,
  },
  seniors: {
    closeMs: 10_000,
    walkSpeed: 70,
    homeY: 424,
    batchBase: 3,
    sweepRadius: 70,
    womanEvery: 6,
    band: { from: 2, to: Infinity },
    takesRares: false,
    mode: 'closer',
    levelKey: 'senior',
    effects: {
      close: 'senior',
      walk: 'seniorWalk',
      batch: 'seniorBatch',
      sweep: 'seniorSweep',
    },
    leaves: 0,
    interruptible: true,
    aura: false,
    perSeat: true,
  },
  managers: {
    closeMs: 24_000,
    walkSpeed: 110,
    homeY: 408,
    batchBase: 1,
    sweepRadius: 0,
    womanEvery: 3,
    band: { from: 0, to: Infinity },
    takesRares: false,
    mode: 'refiler',
    levelKey: 'manager',
    effects: {
      close: 'manager',
      walk: 'managerWalk',
      batch: null,
      sweep: null,
    },
    leaves: 0,
    interruptible: false,
    aura: false,
    perSeat: false,
  },
  offshore: {
    closeMs: 4_000,
    walkSpeed: 130,
    homeY: 392,
    batchBase: 1,
    sweepRadius: 0,
    womanEvery: 4,
    band: { from: 0, to: Infinity },
    takesRares: true,
    mode: 'closer',
    levelKey: null,
    effects: { close: null, walk: null, batch: null, sweep: null },
    leaves: 1,
    interruptible: false,
    aura: false,
    perSeat: false,
  },
} as const satisfies Record<CrewKind, CrewStats>;

export const DESK_LINES: readonly PurchaseId[] = CREW_KINDS.flatMap(
  (kind) => CREW_STATS[kind].levelKey ?? []
);

export const WOMAN_CLOSE_RATE = 2;

export const PROMOTION_PREMIUM = 1.6;

/** The floor you start with; the headcount node adds seats on top, never multiplies. */
export const DESKS_BASE = 10;

export const DESKS_PER_RANK = 5;

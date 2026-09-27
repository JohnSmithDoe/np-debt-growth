import type { CrewKind, CrewMode } from '../crew.model';
import type { PurchaseId } from './progression';

export const CREW_KINDS = [
  'seniors',
  'juniors',
  'managers',
] as const satisfies readonly CrewKind[];

export interface CrewBand {
  readonly from: number;
  readonly to: number;
}

export interface CrewStats {
  readonly closeMs: number;
  readonly walkSpeed: number;
  readonly homeY: number;
  readonly batchBase: number;
  readonly sweepRadius: number;
  readonly womanEvery: number;
  readonly band: CrewBand;
  readonly mode: CrewMode;
  readonly levelKey: PurchaseId;
  readonly interruptible: boolean;
  readonly aura: boolean;
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
    band: { from: 0, to: 4 },
    mode: 'closer',
    levelKey: 'junior',
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
    band: { from: 3, to: Infinity },
    mode: 'closer',
    levelKey: 'senior',
    interruptible: true,
    aura: false,
    perSeat: true,
  },
  managers: {
    closeMs: 12_000,
    walkSpeed: 110,
    homeY: 408,
    batchBase: 1,
    sweepRadius: 110,
    womanEvery: 3,
    band: { from: 0, to: Infinity },
    mode: 'overseer',
    levelKey: 'manager',
    interruptible: false,
    aura: false,
    perSeat: false,
  },
} as const satisfies Record<CrewKind, CrewStats>;

export const WOMAN_CLOSE_RATE = 2;

export const ROOM_SEATS = 5;

import type { BuffNotice, Lane } from '../../game/model/round.model';
import type {
  Board,
  CloseFloat,
  Harvest,
  SprintSlot,
} from '../../game/model/board.model';
import type { HazardId } from '../../game/model/hazard.model';
import type { TicketTypeId } from '../../game/model/ticket.model';
import type { CrewKind } from '../../game/model/crew.model';
import type { SkillView } from './skill-view.model';

export interface HazardNotice {
  readonly id: HazardId;
  readonly landed: boolean;
  readonly msLeft: number;
}

export interface SceneDeps {
  text(key: string, params?: Record<string, string | number>): string;
  board(): Board;
  radius(): number;
  showClickRing(): boolean;
  slots(): number;
  filled(): number;
  sprint(): readonly SprintSlot[];
  lanes(): readonly Lane[];
  laneCapacity(): number;
  /** One flag per coach: is that vote live right now. */
  votes(): readonly boolean[];
  /** The live pizza party in board units, with the share of it left. */
  pizza(): { x: number; y: number; radius: number; left: number } | null;
  pending(): number;
  tier(): number;
  spawnerCount(adr: number): number;
  relabelTarget(type: TicketTypeId): TicketTypeId | null;
  crewCeiling(crew: CrewKind): TicketTypeId | null;
  hazardNotice(): HazardNotice | null;
  seniorPoolSeat(seat: number): number;

  buffNotices(): readonly BuffNotice[];
  womanEvery(crew: CrewKind): number;

  harvest(ids: readonly number[]): Harvest;
  /** Types that close themselves when their life runs out. */
  autoClosed(): ReadonlySet<TicketTypeId>;
  running(): boolean;
  roundLeftMs(): number;
  haulMs(): number;
  /** Keyed by lane; `NO_LANE` is billed to the whole strip. */
  takePayouts(): ReadonlyMap<number, number>;
  takeCloseFloats(): readonly CloseFloat[];
  takeWontFix(): readonly number[];
  unlockSecret(): void;
  /** Hands the board's card and crew frames to the DOM rail. */
  publishIcons(icons: {
    readonly tickets: ReadonlyMap<TicketTypeId, string>;
    readonly crew: ReadonlyMap<CrewKind, string>;
    readonly spawners: ReadonlyMap<number, string>;
  }): void;

  skillView(): SkillView;
  buySkill(id: string): boolean;
}

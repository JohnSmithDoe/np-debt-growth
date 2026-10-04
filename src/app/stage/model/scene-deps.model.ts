import type { TreeFocus } from '../../@shared/model/tree-focus.model';
import type { FinaleAct } from '../../@shared/model/finale.model';
import type { BuffNotice } from '../../game/model/round.model';
import type {
  Board,
  CloseFloat,
  Harvest,
  SprintSlot,
} from '../../game/model/board.model';
import type { HazardId, HazardKind } from '../../game/model/hazard.model';
import type { ReleasePhase } from '../../game/model/balance/round';
import type { TicketTypeId } from '../../game/model/ticket.model';
import type { CrewKind } from '../../game/model/crew.model';
import type { SkillView } from './skill-view.model';

export interface HazardNotice {
  readonly id: HazardId;
  readonly kind: HazardKind;
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
  coaches(): number;
  pizza(): { x: number; y: number; radius: number; left: number } | null;
  pending(): number;
  tier(): number;
  spawnerCount(adr: number): number;
  managerReach(): number;
  crewCeiling(crew: CrewKind): TicketTypeId | null;
  hazardNotice(): HazardNotice | null;
  seniorPoolSeat(seat: number): number;

  buffNotices(): readonly BuffNotice[];
  womanEvery(crew: CrewKind): number;

  harvest(ids: readonly number[]): Harvest;
  autoClosed(): ReadonlySet<TicketTypeId>;
  /** The acceptance criterion under test: its cards are the ones spawned for it. */
  underTest(): number | null;
  running(): boolean;
  trainRuns(): boolean;
  roundLeftMs(): number;
  haulMs(): number;
  releasePhases(): readonly ReleasePhase[];
  takePayouts(): number;
  takeCloseFloats(): readonly CloseFloat[];
  takeWontFix(): readonly number[];
  unlockSecret(): void;
  publishIcons(icons: {
    readonly tickets: ReadonlyMap<TicketTypeId, string>;
    readonly marks: ReadonlyMap<'golden' | 'voted', string>;
    readonly crew: ReadonlyMap<CrewKind, string>;
    readonly spawners: ReadonlyMap<number, string>;
  }): void;

  skillView(): SkillView;
  /** The node the console asked the tree to show. */
  treeFocus(): TreeFocus | null;
  buySkill(id: string): boolean;

  finaleAct(): FinaleAct;
}

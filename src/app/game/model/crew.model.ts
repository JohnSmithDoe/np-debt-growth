import type { CrewMember } from './board.model';
import type { TicketTypeId } from './ticket.model';

export type CrewKind = 'juniors' | 'seniors' | 'managers';

export interface HirePace {
  readonly closeMs: number;
  readonly speed: number;
  readonly batch: number;
  readonly sweep: number;
  readonly pick: ClaimPick;
}

export type ClaimPick = 'random' | 'nearest' | 'cheapest' | 'dearest';

export type CrewMode = 'closer' | 'refiler';

export interface CrewSeat {
  readonly closeMs: number;
  readonly poolSeat: number;
  readonly woman: boolean;
}

/** A pizza party: workers inside the circle step `mult` times as fast. */
export interface Rush {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly mult: number;
}

export interface CrewRules extends HirePace {
  readonly kind: CrewKind;
  readonly crew: CrewMember[];
  readonly size: number;
  readonly homeY: number;
  readonly mode: CrewMode;
  readonly claims: (type: TicketTypeId) => boolean;
  /** May this crew kind pick up golden work at all? */
  readonly golden: boolean;
  readonly paces: readonly HirePace[] | null;
  readonly seatOf: (index: number, pace: HirePace) => CrewSeat;
  readonly interrupted: boolean;
  readonly rush: Rush | null;
  readonly transform: ((type: TicketTypeId) => TicketTypeId | null) | null;
}

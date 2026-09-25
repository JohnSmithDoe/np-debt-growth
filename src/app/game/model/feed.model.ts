import type { Close } from './board.model';
import type { HazardId } from './hazard.model';
import type { TraitId } from './senior.model';

export type NoteId =
  | 'hired'
  | 'senior-hired'
  | 'escalation-armed'
  | 'hazard-due'
  | 'hazard-declined'
  | 'hazard-auto-declined'
  | 'hazard-landed'
  | 'hazard-groomed';

export interface HireNote {
  readonly poolSeat: number;
  readonly woman: boolean;
  readonly trait: TraitId;
}

interface FeedBase {
  readonly seq: number;
}

export interface CloseLine extends FeedBase {
  readonly kind: 'close';
  readonly close: Close;
  readonly title: string;
  readonly value: number;
}

export interface AwardLine extends FeedBase {
  readonly kind: 'award';
  readonly award: string;
}

export interface NoteLine extends FeedBase {
  readonly kind: 'note';
  readonly note: NoteId;
  readonly count: number;
  readonly hire?: HireNote;
  readonly hazard?: HazardId;
}

export type FeedLine = CloseLine | AwardLine | NoteLine;

export type NewFeedLine =
  Omit<CloseLine, 'seq'> | Omit<AwardLine, 'seq'> | Omit<NoteLine, 'seq'>;

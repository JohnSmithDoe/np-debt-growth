import type { Consultancy } from '../model/consultancy.model';
import type { HireNote, NoteId } from '../model/feed.model';
import { crewWomanEvery, hireIsWoman } from './economy';

export interface Note {
  readonly note: NoteId;
  readonly count: number;
  readonly hire?: HireNote;
}

const bench = (state: Consultancy): number =>
  state.levels.junior + state.levels.senior;

export function newNotes(
  before: Consultancy,
  after: Consultancy
): readonly Note[] {
  const notes: Note[] = [];

  const chosen = after.roster.length - before.roster.length;
  const hired = bench(after) - bench(before) - chosen;
  if (hired > 0) notes.push({ note: 'hired', count: bench(after) });

  if (chosen > 0) {
    const seat = after.roster.length - 1;
    const hire = after.roster[seat];
    if (hire) {
      notes.push({
        note: 'senior-hired',
        count: after.levels.senior,
        hire: {
          poolSeat: hire.poolSeat,
          woman: hireIsWoman(seat, crewWomanEvery(after, 'seniors')),
          trait: hire.traits[0] ?? 'closer',
        } satisfies HireNote,
      });
    }
  }

  if (before.escalationFiresAt === 0 && after.escalationFiresAt > 0) {
    notes.push({ note: 'escalation-armed', count: 0 });
  }

  return notes;
}

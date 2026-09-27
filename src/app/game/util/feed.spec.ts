import { describe, expect, it } from 'vitest';

import { freshConsultancy } from '../model/consultancy.model';
import { SAVE_VERSION } from '../model/game.consts';
import { newNotes } from './feed';

const fresh = () => freshConsultancy(0, SAVE_VERSION);

describe('the news an award cannot carry', () => {
  it('says nothing when nothing moved', () => {
    const state = fresh();
    expect(newNotes(state, state)).toEqual([]);
  });

  it('announces a hire once, however many were bought', () => {
    const before = fresh();
    const after = {
      ...before,
      levels: { ...before.levels, junior: before.levels.junior + 5 },
    };
    const notes = newNotes(before, after);
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ note: 'hired' });
  });

  it('announces an escalation only as it is armed', () => {
    const idle = fresh();
    const armed = { ...idle, escalationFiresAt: 1000 };
    expect(newNotes(idle, armed)).toEqual([
      { note: 'escalation-armed', count: 6 },
    ]);
    expect(newNotes(armed, { ...armed, escalationFiresAt: 2000 })).toEqual([]);
  });

  it('leaves tiers to the awards', () => {
    const before = fresh();
    expect(newNotes(before, { ...before, tier: before.tier + 3 })).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';

import type { Consultancy } from '../model/consultancy.model';
import { freshConsultancy } from '../model/consultancy.model';
import { SAVE_VERSION } from '../model/game.consts';
import { FINAL_SKILL_ID } from '../model/skill.model';
import { advise } from '../util/advisor';
import {
  DEFAULT_POLICY,
  advisedSpend,
  autoplay,
  spend,
} from '../util/autoplay';

const SIGNED_OFF = [
  ['signed off', (s: Consultancy) => (s.skills[FINAL_SKILL_ID] ?? 0) > 0],
] as const;
const LIMIT_MS = 4 * 60 * 60 * 1000;

describe('advisor', () => {
  it('names an affordable euro buy at the start', () => {
    const start = { ...freshConsultancy(0, SAVE_VERSION), budget: 10 };
    const { eur } = advise(start, DEFAULT_POLICY);
    expect(eur?.currency).toBe('eur');
    expect(eur?.waitSec).toBe(0);
  });

  it('says nothing once the run is signed off', () => {
    const ended = { ...freshConsultancy(0, SAVE_VERSION), endedAt: 1 };
    expect(advise(ended, DEFAULT_POLICY)).toEqual({ eur: null, sp: null });
  });

  it('signs off sooner than buying cheapest first', () => {
    const start = freshConsultancy(0, SAVE_VERSION);
    const at = (spender: typeof spend): number =>
      autoplay(
        start,
        SIGNED_OFF,
        LIMIT_MS,
        DEFAULT_POLICY,
        spender
      ).reached.get('signed off') ?? Number.POSITIVE_INFINITY;
    const advised = at(advisedSpend);
    expect(advised).toBeLessThan(at(spend));
    if (process.env['CB_ADVISOR'])
      process.stdout.write(
        `\nadvised sign-off ${(advised / 60_000).toFixed(1)} min\n`
      );
  }, 180_000);
});

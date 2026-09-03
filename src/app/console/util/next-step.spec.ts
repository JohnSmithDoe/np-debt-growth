import { describe, expect, it } from 'vitest';

import { SAVE_VERSION } from '../../game/model/game.consts';
import type { Consultancy } from '../../game/model/consultancy.model';
import { freshConsultancy } from '../../game/model/consultancy.model';
import { PURCHASE_REVEAL_FRACTION } from '../../game/model/balance/progression';
import { tierAt } from '../../game/model/tier.model';
import type { NextStep } from '../model/step.model';
import type { StepGates } from './next-step';
import { nextSteps } from './next-step';
import { reached } from './reached';

const gates: StepGates = {
  openSkills: [],
  nextRank: null,
};

const state = (patch: Partial<Consultancy>): Consultancy => ({
  ...freshConsultancy(0, SAVE_VERSION),
  phase: 'review',
  ...patch,
});

describe('nextSteps', () => {
  it('opens on the one thing a new player can do', () => {
    const [first] = nextSteps(state({}), gates);
    expect(first?.titleKey).toBe('step.triage.title');
    expect(first?.teaches).toBe(true);
  });

  it('stops teaching triage once something has been triaged', () => {
    const [first] = nextSteps(state({ lifetimeClosed: 3 }), gates);
    expect(first?.id).not.toBe('teach:triage');
  });

  it('names the interval only while it is up', () => {
    const waiting = state({
      lifetimeClosed: 40,
      lifetimeBilled: 50_000,
      budget: 50_000,
      tier: 1,
      phase: 'review',
    });
    expect(
      nextSteps(waiting, gates).some((step) => step.id.startsWith('adr:'))
    ).toBe(true);
    expect(
      nextSteps({ ...waiting, phase: 'running' }, gates).some(
        (step) => step.target === 'review'
      )
    ).toBe(false);
  });

  it('offers the start whenever the interval is up', () => {
    const waiting = state({
      lifetimeClosed: 40,
      lifetimeRounds: 6,
      phase: 'review',
    });
    const [first] = nextSteps(waiting, gates);
    expect(first?.act).toBe('startRound');
    expect(first?.target).toBe('board');

    expect(
      nextSteps({ ...waiting, phase: 'running' }, gates).some(
        (step) => step.act === 'startRound'
      )
    ).toBe(false);
  });

  it('offers nothing from the interval while a round is running', () => {
    const rich = {
      lifetimeClosed: 40,
      lifetimeRounds: 6,
      lifetimeBilled: 400_000,
      budget: 400_000,
    };
    const running = nextSteps(state({ ...rich, phase: 'running' }), gates);
    const interval = nextSteps(state({ ...rich, phase: 'review' }), gates);

    expect(running.some((step) => step.target === 'review')).toBe(false);
    expect(interval.some((step) => step.target === 'review')).toBe(true);
  });

  it('acts only on the board', () => {
    const acting = nextSteps(
      state({ lifetimeClosed: 3, phase: 'review' }),
      gates
    ).filter((step) => step.act !== undefined);
    expect(acting.length).toBeGreaterThan(0);
    expect(acting.every((step) => step.target === 'board')).toBe(true);
  });

  it('names the rung before it is affordable, and what is short', () => {
    const rung = tierAt(1);
    const cost = rung?.unlockCost ?? 0;

    const climbing = (budget: number): NextStep | undefined =>
      nextSteps(
        state({
          lifetimeClosed: 30,
          lifetimeRounds: 4,
          lifetimeBilled: Math.max(budget, cost),
          budget,
        }),
        gates
      ).find((step) => step.id === 'adr:1');

    const far = climbing(cost * PURCHASE_REVEAL_FRACTION - 1);
    expect(far).toBeUndefined();

    const near = climbing(cost * PURCHASE_REVEAL_FRACTION);
    expect(near?.titleKey).toBe('step.adr.bank.title');
    expect(near?.detailMoney).toBeCloseTo(
      cost * (1 - PURCHASE_REVEAL_FRACTION)
    );

    const there = climbing(cost);
    expect(there?.titleKey).toBe('step.adr.title');
    expect(there?.detailMoney).toBeUndefined();
  });

  it('stops naming a rung once it has been taken', () => {
    const climbed = state({
      lifetimeClosed: 30,
      lifetimeRounds: 4,
      lifetimeBilled: 50_000,
      budget: 50_000,
      tier: 1,
    });
    expect(nextSteps(climbed, gates).some((step) => step.id === 'adr:1')).toBe(
      false
    );
  });

  it('falls back to the board rather than saying nothing', () => {
    const broke = state({
      lifetimeClosed: 3,
      lifetimeRounds: 1,
      budget: 0,
      phase: 'running',
    });
    const steps = nextSteps(broke, gates);
    expect(steps).toHaveLength(1);
    expect(steps[0]?.titleKey).toBe('step.earn.title');
  });

  it('falls back to starting the next round when standing in the interval', () => {
    const broke = state({ lifetimeClosed: 3, lifetimeRounds: 1, budget: 0 });
    const steps = nextSteps(broke, gates);
    expect(steps[0]?.act).toBe('startRound');
  });
});

describe('reached', () => {
  it('opens with one screen and no dark rooms', () => {
    expect(reached(state({}))).toEqual({
      board: true,
      review: true,
      skills: false,
    });
  });

  it('keeps Skills on a rank after the points that bought it are gone', () => {
    const spent = state({ storyPoints: 0, skills: { root: 1 } });
    expect(reached(spent).skills).toBe(true);
  });
});

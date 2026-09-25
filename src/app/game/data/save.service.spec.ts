import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { freshConsultancy } from '../model/consultancy.model';
import { SAVE_VERSION } from '../model/game.consts';
import { GameStore } from './game.store';
import { SaveService } from './save.service';

const STORAGE_KEY = 'np-debt-growth/save';

describe('restoring a save', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
  });

  it('does not play the time away', () => {
    const store = TestBed.inject(GameStore);
    const fresh = freshConsultancy(0, SAVE_VERSION);
    store.hydrate({
      ...fresh,
      lastTick: Date.now() - 2 * 60 * 60 * 1000,
      budget: 500,
      tier: 1,
      skills: { root: 1, radius: 1, capacity: 1 },
      levels: { ...fresh.levels, junior: 20 },
      spawners: { 0: 4, 1: 4 },
    });
    TestBed.inject(SaveService).save();
    TestBed.inject(SaveService).restore();

    const now = Date.now();
    expect(store.snapshot().lastTick).toBeGreaterThanOrEqual(now - 1000);
    store.advanceTo(now);
    expect(store.budget()).toBeCloseTo(500, 0);
    expect(store.snapshot().runMs).toBeLessThan(1000);
  });

  it('resumes with an empty sprint', () => {
    const store = TestBed.inject(GameStore);
    const fresh = freshConsultancy(0, SAVE_VERSION);
    store.hydrate({
      ...fresh,
      lastTick: Date.now(),
      budget: 500,
      sprintCount: 6,
      escalated: true,
      escalationFiresAt: 1,
    });
    TestBed.inject(SaveService).save();
    TestBed.inject(SaveService).restore();

    const after = store.snapshot();
    expect(after.sprintCount).toBe(0);
    expect(store.sprintValue()).toBe(0);
    expect(after.escalated).toBe(false);

    store.advanceTo(Date.now());
    expect(store.budget()).toBeCloseTo(500, 0);
    expect(store.snapshot().lifetimeRounds).toBe(0);
  });

  it('starts fresh when the version does not match', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: SAVE_VERSION + 1,
        consultancy: { ...freshConsultancy(0, SAVE_VERSION), budget: 500 },
      })
    );
    TestBed.inject(SaveService).restore();
    expect(TestBed.inject(GameStore).budget()).toBe(0);
  });
});

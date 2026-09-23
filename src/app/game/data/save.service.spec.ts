import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { freshConsultancy } from '../model/consultancy.model';
import { OFFLINE_MAX_MS, SAVE_VERSION } from '../model/game.consts';
import { GameStore } from './game.store';
import { SaveService } from './save.service';

const STORAGE_KEY = 'np-clickbait/save';

describe('restoring a save', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
  });

  it('keeps where the save left off, so the gap can be paid out', () => {
    const store = TestBed.inject(GameStore);
    const fresh = freshConsultancy(0, SAVE_VERSION);
    const left = Date.now() - 2 * 60 * 60 * 1000;
    store.hydrate({
      ...fresh,
      lastTick: left,
      budget: 500,
      tier: 1,
      skills: { root: 1, radius: 1, capacity: 1 },
      levels: { ...fresh.levels, junior: 200, copilot: 1 },
      spawners: { 0: 4, 1: 4 },
    });
    TestBed.inject(SaveService).save();
    TestBed.inject(SaveService).restore();

    expect(store.snapshot().lastTick).toBe(left);

    // Two hours away are estimated in one step, not stepped at 10 Hz.
    store.advanceTo(Date.now());
    expect(store.budget()).toBeGreaterThan(500);
    expect(store.lifetimeRounds()).toBe(0);
  });

  it('never pays out more than the offline window, however long the gap', () => {
    const store = TestBed.inject(GameStore);
    const fresh = freshConsultancy(0, SAVE_VERSION);
    const staffed = {
      ...fresh,
      budget: 0,
      tier: 1,
      skills: { root: 1, radius: 1, capacity: 1 },
      levels: { ...fresh.levels, junior: 200, copilot: 1 },
      spawners: { 0: 4, 1: 4 },
    };
    const now = Date.now();

    store.hydrate({ ...staffed, lastTick: now - OFFLINE_MAX_MS });
    store.advanceTo(now);
    const capped = store.budget();

    const longer = new GameStore();
    longer.hydrate({ ...staffed, lastTick: now - 40 * OFFLINE_MAX_MS });
    longer.advanceTo(now);
    // The live catch-up window still spawns at random, so allow for it.
    expect(longer.budget() / capped).toBeCloseTo(1, 2);
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

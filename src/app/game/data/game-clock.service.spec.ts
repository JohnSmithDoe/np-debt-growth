import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { consultancy } from '../model/consultancy.fixture';
import { GameClock } from './game-clock.service';
import { GameStore } from './game.store';

describe('the game clock', () => {
  let store: GameStore;
  let clock: GameClock;

  beforeEach(() => {
    vi.useFakeTimers({ now: 1_000_000 });
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    store = TestBed.inject(GameStore);
    clock = TestBed.inject(GameClock);
    store.hydrate(
      consultancy({ lastTick: Date.now(), hotfixUntil: Date.now() + 30_000 })
    );
    clock.start();
  });

  afterEach(() => {
    clock.stop();
    vi.useRealTimers();
  });

  it('plays while running', () => {
    vi.advanceTimersByTime(2_000);
    expect(store.snapshot().runMs).toBeGreaterThanOrEqual(1_900);
  });

  it('plays nothing while paused, and does not catch up on resume', () => {
    vi.advanceTimersByTime(1_000);
    const before = store.snapshot().runMs;
    clock.pause();
    vi.advanceTimersByTime(60_000);
    expect(store.snapshot().runMs).toBe(before);

    clock.resume();
    vi.advanceTimersByTime(1_000);
    expect(store.snapshot().runMs - before).toBeLessThanOrEqual(1_100);
  });

  it('holds absolute deadlines still across a pause', () => {
    const left = store.hotfixUntil() - clock.now();
    clock.pause();
    vi.advanceTimersByTime(60_000);
    clock.resume();
    expect(store.hotfixUntil() - clock.now()).toBe(left);
  });
});

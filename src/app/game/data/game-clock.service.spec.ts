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
    clock.pause('tree');
    vi.advanceTimersByTime(60_000);
    expect(store.snapshot().runMs).toBe(before);

    clock.resume('tree');
    vi.advanceTimersByTime(1_000);
    expect(store.snapshot().runMs - before).toBeLessThanOrEqual(1_100);
  });

  it('holds absolute deadlines still across a pause', () => {
    const left = store.hotfixUntil() - clock.now();
    clock.pause('tree');
    vi.advanceTimersByTime(60_000);
    clock.resume('tree');
    expect(store.hotfixUntil() - clock.now()).toBe(left);
  });

  it('does not play the time before it started', () => {
    clock.stop();
    vi.advanceTimersByTime(30_000);
    const before = store.snapshot().runMs;
    clock.start();
    vi.advanceTimersByTime(100);
    expect(store.snapshot().runMs - before).toBeLessThanOrEqual(100);
  });

  it('plays nothing while the tab is hidden', () => {
    const hidden = vi.spyOn(document, 'hidden', 'get');
    vi.advanceTimersByTime(1_000);
    const before = store.snapshot().runMs;
    const left = store.hotfixUntil() - clock.now();

    hidden.mockReturnValue(true);
    document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(60_000);
    expect(store.snapshot().runMs).toBe(before);

    hidden.mockReturnValue(false);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(store.hotfixUntil() - clock.now()).toBe(left);
    hidden.mockRestore();
  });

  it('stays paused for the tree when the tab comes back', () => {
    const hidden = vi.spyOn(document, 'hidden', 'get');
    clock.pause('tree');
    hidden.mockReturnValue(true);
    document.dispatchEvent(new Event('visibilitychange'));
    hidden.mockReturnValue(false);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(clock.paused()).toBe(true);

    clock.resume('tree');
    expect(clock.paused()).toBe(false);
    hidden.mockRestore();
  });
});

import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { SettingsService } from '../../@shared/data/settings.service';
import { GameClock } from '../../game/data/game-clock.service';
import { GameStore } from '../../game/data/game.store';
import { SaveService } from '../../game/data/save.service';
import { tick } from '../../game/data/store.fixture';
import { TICK_MS } from '../../game/model/game.consts';
import { DoorService } from './door.service';
import { TutorialService } from './tutorial.service';

describe('the first-run tour', () => {
  let store: GameStore;
  let clock: GameClock;
  let settings: SettingsService;

  const boot = (): TutorialService => {
    TestBed.inject(SaveService).restore();
    const tour = TestBed.inject(TutorialService);
    TestBed.inject(DoorService).open();
    TestBed.tick();
    return tour;
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    store = TestBed.inject(GameStore);
    clock = TestBed.inject(GameClock);
    settings = TestBed.inject(SettingsService);
  });

  const pickUp = (): void => {
    store.harvest([store.board.tickets[0]!.id]);
    TestBed.tick();
  };

  it('talks while the clock is held: two tickets, the first hire, then the train', () => {
    const tour = boot();
    expect(tour.step()).toBe('hello');
    expect(clock.paused()).toBe(true);

    tour.next();
    expect(tour.step()).toBe('ticket');
    expect(store.board.tickets).toHaveLength(0);

    tour.next();
    expect(tour.step()).toBe('collect');
    expect(store.board.tickets).toHaveLength(1);
    tour.next();
    expect(tour.step()).toBe('collect');
    pickUp();
    expect(tour.step()).toBe('paid');

    tour.next();
    expect(tour.step()).toBe('again');
    pickUp();
    expect(tour.step()).toBe('hire');

    const heads = store.state().spawners[0];
    tour.next();
    expect(tour.step()).toBe('hire');
    expect(store.buySpawner(0)).toBe(true);
    TestBed.tick();
    expect(store.state().spawners[0]).toBe(heads! + 1);
    expect(tour.step()).toBe('sprint');
    expect(clock.paused()).toBe(true);

    tour.next();
    expect(tour.step()).toBe('train');
    expect(store.hauling()).toBe(true);
    expect(clock.paused()).toBe(false);

    const from = store.state().lastTick;
    tick(store, from + store.haulMs() + TICK_MS, from);
    TestBed.tick();
    expect(store.hauling()).toBe(false);
    expect(tour.step()).toBe('back');
    expect(clock.paused()).toBe(true);
    expect(store.awarded()).toContain('m-first-invoice');

    tour.next();
    expect(tour.step()).toBe('goal');
    tour.next();
    expect(tour.step()).toBeNull();
    expect(clock.paused()).toBe(false);
    expect(settings.tutorialDone()).toBe(true);
  });

  it('can be skipped from any line', () => {
    const tour = boot();
    tour.finish();
    expect(tour.step()).toBeNull();
    expect(clock.paused()).toBe(false);
    expect(settings.tutorialDone()).toBe(true);
  });

  it('is never offered twice', () => {
    settings.setTutorialDone();
    expect(boot().step()).toBeNull();
    expect(clock.paused()).toBe(false);
  });

  it('is not offered over a restored save', () => {
    TestBed.inject(SaveService).save();
    expect(boot().step()).toBeNull();
    expect(settings.tutorialDone()).toBe(true);
  });
});

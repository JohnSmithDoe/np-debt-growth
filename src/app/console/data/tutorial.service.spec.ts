import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { SettingsService } from '../../@shared/data/settings.service';
import { GameClock } from '../../game/data/game-clock.service';
import { GameStore } from '../../game/data/game.store';
import { SaveService } from '../../game/data/save.service';
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

  it('talks, throws one ticket, waits for the hand, and holds the clock throughout', () => {
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

    store.harvest([store.board.tickets[0]!.id]);
    TestBed.tick();
    expect(tour.step()).toBe('paid');
    expect(clock.paused()).toBe(true);

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

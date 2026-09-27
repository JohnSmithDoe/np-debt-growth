import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { SettingsService } from '../../@shared/data/settings.service';
import { GameStore } from '../../game/data/game.store';
import { consultancy } from '../../game/model/consultancy.fixture';
import { AgentService } from './agent.service';
import { DoorService } from './door.service';

describe('the agent on auto', () => {
  let store: GameStore;
  let settings: SettingsService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    store = TestBed.inject(GameStore);
    store.hydrate(consultancy({ budget: 1e6 }));
    settings = TestBed.inject(SettingsService);
    TestBed.inject(DoorService).open();
    TestBed.inject(AgentService);
  });

  it('buys nothing while switched off', () => {
    settings.setAgentWarned();
    TestBed.tick();
    expect(store.state().budget).toBe(1e6);
  });

  it('stays off until the warning is read', () => {
    settings.setAgentAuto(true);
    TestBed.tick();
    expect(store.state().budget).toBe(1e6);
  });

  it('spends on its advice once switched on', () => {
    settings.setAgentWarned();
    settings.setAgentAuto(true);
    TestBed.tick();
    expect(store.state().budget).toBeLessThan(1e6);
  });
});

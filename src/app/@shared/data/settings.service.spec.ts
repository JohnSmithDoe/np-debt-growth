import { beforeEach, describe, expect, it } from 'vitest';

import { SETTINGS_KEY } from '../model/settings.model';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  beforeEach(() => localStorage.clear());

  it('defaults every setting an absent record does not mention', () => {
    expect(new SettingsService().showClickRadius()).toBe(true);
  });

  it('defaults rather than throwing on a record that is not one', () => {
    localStorage.setItem(SETTINGS_KEY, 'not json');
    expect(new SettingsService().showClickRadius()).toBe(true);

    localStorage.setItem(SETTINGS_KEY, '"a string"');
    expect(new SettingsService().showClickRadius()).toBe(true);
  });

  it('round-trips a choice through storage', () => {
    const settings = new SettingsService();
    settings.setShowClickRadius(false);

    expect(settings.showClickRadius()).toBe(false);
    expect(new SettingsService().showClickRadius()).toBe(false);
  });

  it('keeps the agent warning read and auto-buy off by default', () => {
    const settings = new SettingsService();
    expect(settings.agentWarned()).toBe(false);
    expect(settings.agentAuto()).toBe(false);

    settings.setAgentWarned();
    settings.setAgentAuto(true);
    const reloaded = new SettingsService();
    expect(reloaded.agentWarned()).toBe(true);
    expect(reloaded.agentAuto()).toBe(true);
  });
});

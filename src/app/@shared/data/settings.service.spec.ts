import { beforeEach, describe, expect, it } from 'vitest';

import { SETTINGS_KEY } from '../model/settings.model';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  beforeEach(() => localStorage.clear());

  it('defaults every setting an absent record does not mention', () => {
    expect(new SettingsService().showClickRadius()).toBe(false);
  });

  it('defaults rather than throwing on a record that is not one', () => {
    localStorage.setItem(SETTINGS_KEY, 'not json');
    expect(new SettingsService().showClickRadius()).toBe(false);

    localStorage.setItem(SETTINGS_KEY, '"a string"');
    expect(new SettingsService().showClickRadius()).toBe(false);
  });

  it('round-trips a choice through storage', () => {
    const settings = new SettingsService();
    settings.setShowClickRadius(true);

    expect(settings.showClickRadius()).toBe(true);
    expect(new SettingsService().showClickRadius()).toBe(true);
  });
});

import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { SettingsService } from '../../../@shared/data/settings.service';
import { SettingsUiService } from '../../data/settings-ui.service';
import { SettingsModalComponent } from './settings-modal.component';

describe('SettingsModalComponent', () => {
  function modal(): SettingsModalComponent {
    return TestBed.createComponent(SettingsModalComponent).componentInstance;
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
  });

  it('opens on the request and closes on dismiss', () => {
    const component = modal();
    const ui = TestBed.inject(SettingsUiService);

    expect(component.shown()).toBe(false);
    ui.open();
    expect(component.shown()).toBe(true);

    component.dismiss();
    expect(component.shown()).toBe(false);
  });

  it('writes the ring through to the settings both screens read', () => {
    const component = modal();

    component.setShowClickRadius(true);

    expect(TestBed.inject(SettingsService).showClickRadius()).toBe(true);
  });

  it('asks for a mute rather than performing one', () => {
    const component = modal();
    const music: boolean[] = [];
    const sfx: boolean[] = [];
    component.musicChange.subscribe((value) => music.push(value));
    component.sfxChange.subscribe((value) => sfx.push(value));

    component.toggleMusic();
    component.toggleSfx();

    expect(music).toEqual([false]);
    expect(sfx).toEqual([false]);
  });

  it('reads a slider as a volume between 0 and 1', () => {
    const component = modal();
    const asked: number[] = [];
    component.sfxVolumeChange.subscribe((value) => asked.push(value));
    const slider = document.createElement('input');
    slider.value = '35';
    slider.addEventListener('input', (event) => component.setSfxVolume(event));

    slider.dispatchEvent(new Event('input'));

    expect(asked).toEqual([0.35]);
  });
});

import { Injectable, computed, signal } from '@angular/core';

import type { Settings } from '../model/settings.model';
import { SETTINGS_DEFAULTS, SETTINGS_KEY } from '../model/settings.model';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  readonly #settings = signal<Settings>(this.#load());

  readonly showClickRadius = computed(
    () => this.#settings().showClickRadius ?? SETTINGS_DEFAULTS.showClickRadius
  );

  readonly showAgent = computed(
    () => this.#settings().showAgent ?? SETTINGS_DEFAULTS.showAgent
  );

  readonly agentAuto = computed(
    () => this.#settings().agentAuto ?? SETTINGS_DEFAULTS.agentAuto
  );

  readonly agentWarned = computed(
    () => this.#settings().agentWarned ?? SETTINGS_DEFAULTS.agentWarned
  );

  readonly railTab = computed(
    () => this.#settings().railTab ?? SETTINGS_DEFAULTS.railTab
  );

  setRailTab(value: string): void {
    this.#write({ ...this.#settings(), railTab: value });
  }

  setShowAgent(value: boolean): void {
    this.#write({ ...this.#settings(), showAgent: value });
  }

  setAgentAuto(value: boolean): void {
    this.#write({ ...this.#settings(), agentAuto: value });
  }

  setAgentWarned(): void {
    this.#write({ ...this.#settings(), agentWarned: true });
  }

  setShowClickRadius(value: boolean): void {
    this.#write({ ...this.#settings(), showClickRadius: value });
  }

  #write(settings: Settings): void {
    this.#settings.set(settings);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {}
  }

  #load(): Settings {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      const parsed: unknown = raw === null ? null : JSON.parse(raw);
      return typeof parsed === 'object' && parsed !== null
        ? (parsed as Settings)
        : {};
    } catch {
      return {};
    }
  }
}

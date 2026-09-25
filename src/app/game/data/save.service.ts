import { inject, Injectable, signal } from '@angular/core';

import type { Consultancy } from '../model/consultancy.model';
import { freshConsultancy, resumed } from '../model/consultancy.model';
import { SAVE_VERSION } from '../model/game.consts';
import { GameStore } from './game.store';

const STORAGE_KEY = 'np-debt-growth/save';
const AUTOSAVE_MS = 10_000;

interface SaveFile {
  readonly version: number;
  readonly consultancy: Consultancy;
}

@Injectable({ providedIn: 'root' })
export class SaveService {
  #store = inject(GameStore);
  #handle?: ReturnType<typeof setInterval>;
  #onPageHide = (): void => this.save();
  #restored = signal(false);

  readonly restored = this.#restored.asReadonly();

  restore(): void {
    const now = Date.now();
    const file = this.#read();
    this.#restored.set(file !== null);
    this.#store.hydrate(
      file
        ? resumed(file.consultancy, now)
        : freshConsultancy(now, SAVE_VERSION)
    );
  }

  start(): void {
    if (this.#handle !== undefined) return;
    this.#handle = setInterval(() => this.save(), AUTOSAVE_MS);
    window.addEventListener('pagehide', this.#onPageHide);
  }

  stop(): void {
    if (this.#handle !== undefined) {
      clearInterval(this.#handle);
      this.#handle = undefined;
    }
    window.removeEventListener('pagehide', this.#onPageHide);
  }

  save(): void {
    const file: SaveFile = {
      version: SAVE_VERSION,
      consultancy: this.#store.snapshot(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(file));
    } catch {}
  }

  wipe(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  #read(): SaveFile | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) return null;
      const parsed: unknown = JSON.parse(raw);
      return this.#isCurrent(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  #isCurrent(value: unknown): value is SaveFile {
    if (typeof value !== 'object' || value === null) return false;
    const file = value as Partial<SaveFile>;
    return (
      file.version === SAVE_VERSION &&
      typeof file.consultancy === 'object' &&
      file.consultancy !== null &&
      typeof file.consultancy.budget === 'number' &&
      typeof file.consultancy.lastTick === 'number' &&
      typeof file.consultancy.phase === 'string'
    );
  }
}

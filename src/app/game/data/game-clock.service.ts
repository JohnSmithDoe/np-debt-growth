import { inject, Injectable } from '@angular/core';

import { TICK_MS } from '../model/game.consts';
import { GameStore } from './game.store';

export type PauseReason = 'tree' | 'hidden' | 'help' | 'record' | 'moment';

@Injectable({ providedIn: 'root' })
export class GameClock {
  #store = inject(GameStore);
  #handle?: ReturnType<typeof setInterval>;
  readonly #holds = new Set<PauseReason>();
  #pausedAt: number | null = null;
  #pausedMs = 0;

  #onVisibility = (): void => {
    if (document.hidden) this.pause('hidden');
    else this.resume('hidden');
  };

  now(): number {
    return (this.#pausedAt ?? Date.now()) - this.#pausedMs;
  }

  paused(): boolean {
    return this.#pausedAt !== null;
  }

  start(): void {
    if (this.#handle !== undefined) return;
    this.#store.rebase(this.now());
    this.#handle = setInterval(() => {
      if (this.#pausedAt === null) this.#store.advanceTo(this.now());
    }, TICK_MS);
    document.addEventListener('visibilitychange', this.#onVisibility);
    this.#onVisibility();
  }

  stop(): void {
    if (this.#handle === undefined) return;
    clearInterval(this.#handle);
    this.#handle = undefined;
    document.removeEventListener('visibilitychange', this.#onVisibility);
  }

  pause(reason: PauseReason): void {
    this.#holds.add(reason);
    this.#pausedAt ??= Date.now();
  }

  resume(reason: PauseReason): void {
    this.#holds.delete(reason);
    if (this.#pausedAt === null || this.#holds.size > 0) return;
    this.#pausedMs += Date.now() - this.#pausedAt;
    this.#pausedAt = null;
  }
}

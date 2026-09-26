import { inject, Injectable } from '@angular/core';

import { TICK_MS } from '../model/game.consts';
import { GameStore } from './game.store';

/**
 * Game time is wall time minus every pause, so the state's absolute deadlines
 * (hotfix, escalation, pizza) stand still while the game does.
 */
@Injectable({ providedIn: 'root' })
export class GameClock {
  #store = inject(GameStore);
  #handle?: ReturnType<typeof setInterval>;
  #pausedAt: number | null = null;
  #pausedMs = 0;

  now(): number {
    return (this.#pausedAt ?? Date.now()) - this.#pausedMs;
  }

  paused(): boolean {
    return this.#pausedAt !== null;
  }

  start(): void {
    if (this.#handle !== undefined) return;
    this.#handle = setInterval(() => {
      if (this.#pausedAt === null) this.#store.advanceTo(this.now());
    }, TICK_MS);
  }

  stop(): void {
    if (this.#handle === undefined) return;
    clearInterval(this.#handle);
    this.#handle = undefined;
  }

  pause(): void {
    this.#pausedAt ??= Date.now();
  }

  resume(): void {
    if (this.#pausedAt === null) return;
    this.#pausedMs += Date.now() - this.#pausedAt;
    this.#pausedAt = null;
  }
}

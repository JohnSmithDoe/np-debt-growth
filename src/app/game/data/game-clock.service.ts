import { inject, Injectable } from '@angular/core';

import { TICK_MS } from '../model/game.consts';
import { GameStore } from './game.store';

@Injectable({ providedIn: 'root' })
export class GameClock {
  #store = inject(GameStore);
  #handle?: ReturnType<typeof setInterval>;

  start(): void {
    if (this.#handle !== undefined) return;
    this.#handle = setInterval(
      () => this.#store.advanceTo(Date.now()),
      TICK_MS
    );
  }

  stop(): void {
    if (this.#handle === undefined) return;
    clearInterval(this.#handle);
    this.#handle = undefined;
  }
}

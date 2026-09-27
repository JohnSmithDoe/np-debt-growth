import { inject, Injectable, signal } from '@angular/core';

import { GameClock } from '../../game/data/game-clock.service';

@Injectable({ providedIn: 'root' })
export class HelpUiService {
  #clock = inject(GameClock);
  readonly #open = signal(false);

  readonly isOpen = this.#open.asReadonly();

  open(): void {
    this.#open.set(true);
    this.#clock.pause('help');
  }

  close(): void {
    if (!this.#open()) return;
    this.#open.set(false);
    this.#clock.resume('help');
  }
}

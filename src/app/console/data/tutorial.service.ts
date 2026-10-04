import { effect, inject, Injectable, signal, untracked } from '@angular/core';

import { SettingsService } from '../../@shared/data/settings.service';
import { GameClock } from '../../game/data/game-clock.service';
import { GameStore } from '../../game/data/game.store';
import { SaveService } from '../../game/data/save.service';
import { NO_TICKET } from '../../game/model/board.model';
import type { TicketTypeId } from '../../game/model/ticket.model';
import { DoorService } from './door.service';

export type TutorialStep = 'hello' | 'ticket' | 'collect' | 'paid' | 'goal';

const NEXT: Readonly<Partial<Record<TutorialStep, TutorialStep>>> = {
  hello: 'ticket',
  paid: 'goal',
};

const LESSON_TICKET: TicketTypeId = 'lint';

/** The paperclip's first-run lesson; the clock is held from the first line to the last. */
@Injectable({ providedIn: 'root' })
export class TutorialService {
  #store = inject(GameStore);
  #clock = inject(GameClock);
  #settings = inject(SettingsService);
  #save = inject(SaveService);
  #door = inject(DoorService);

  readonly #step = signal<TutorialStep | null>(null);
  readonly step = this.#step.asReadonly();
  #closedBefore = 0;

  constructor() {
    effect(() => {
      if (!this.#door.opened() || this.#settings.tutorialDone()) return;
      untracked(() => {
        if (this.#save.restored()) this.#settings.setTutorialDone();
        else this.#begin();
      });
    });
    effect(() => {
      if (this.#step() !== 'collect') return;
      if (this.#store.state().lifetimeClosed > this.#closedBefore)
        this.#step.set('paid');
    });
  }

  next(): void {
    const step = this.#step();
    if (step === 'ticket') return this.#drop();
    if (step === 'goal') return this.finish();
    const next = step ? NEXT[step] : undefined;
    if (next) this.#step.set(next);
  }

  finish(): void {
    if (this.#step() === null) return;
    this.#step.set(null);
    this.#settings.setTutorialDone();
    this.#clock.resume('tutorial');
  }

  #begin(): void {
    if (this.#step() !== null) return;
    this.#clock.pause('tutorial');
    this.#step.set('hello');
  }

  #drop(): void {
    this.#closedBefore = this.#store.state().lifetimeClosed;
    if (this.#store.place(LESSON_TICKET) === NO_TICKET) return this.finish();
    this.#step.set('collect');
  }
}

import { effect, inject, Injectable, signal, untracked } from '@angular/core';

import { SettingsService } from '../../@shared/data/settings.service';
import { GameClock } from '../../game/data/game-clock.service';
import { GameStore } from '../../game/data/game.store';
import { SaveService } from '../../game/data/save.service';
import { NO_TICKET } from '../../game/model/board.model';
import type { Consultancy } from '../../game/model/consultancy.model';
import type { TicketTypeId } from '../../game/model/ticket.model';
import { DoorService } from './door.service';

export type TutorialStep =
  | 'hello'
  | 'ticket'
  | 'collect'
  | 'paid'
  | 'again'
  | 'hire'
  | 'sprint'
  | 'train'
  | 'back'
  | 'goal';

/** What the paperclip's button does; a step without one waits for the player. */
type Action = 'next' | 'throw' | 'send' | 'finish';

const ACTIONS: Readonly<Partial<Record<TutorialStep, Action>>> = {
  hello: 'next',
  ticket: 'throw',
  paid: 'throw',
  sprint: 'send',
  back: 'next',
  goal: 'finish',
};

const FOLLOWS: Readonly<Partial<Record<TutorialStep, TutorialStep>>> = {
  hello: 'ticket',
  ticket: 'collect',
  collect: 'paid',
  paid: 'again',
  again: 'hire',
  hire: 'sprint',
  sprint: 'train',
  train: 'back',
  back: 'goal',
};

const LESSON_TICKET: TicketTypeId = 'lint';
const FIRST_SPAWNER = 0;

const intake = (state: Consultancy): number =>
  state.spawners[FIRST_SPAWNER] ?? 0;

/**
 * The paperclip's first-run lesson. The clock is held whenever it talks; the hand still collects
 * and the shop still sells while it is held. Only the release train runs on the clock.
 */
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
  #intakeBefore = 0;

  constructor() {
    effect(() => {
      if (!this.#door.opened() || this.#settings.tutorialDone()) return;
      untracked(() => {
        if (this.#save.restored()) this.#settings.setTutorialDone();
        else this.#begin();
      });
    });
    effect(() => {
      const step = this.#step();
      const state = this.#store.state();
      const done =
        ((step === 'collect' || step === 'again') &&
          state.lifetimeClosed > this.#closedBefore) ||
        (step === 'hire' && intake(state) > this.#intakeBefore) ||
        (step === 'train' && !this.#store.hauling());
      if (done) untracked(() => this.#advance());
    });
  }

  /** The label of the step's button, or null while it waits for the player. */
  action(step: TutorialStep): Action | null {
    return ACTIONS[step] ?? null;
  }

  next(): void {
    const step = this.#step();
    const action = step ? ACTIONS[step] : undefined;
    switch (action) {
      case 'next':
        return this.#advance();
      case 'throw':
        return this.#throw();
      case 'send':
        return this.#send();
      case 'finish':
        return this.finish();
    }
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

  #advance(): void {
    const step = this.#step();
    const next = step ? FOLLOWS[step] : undefined;
    if (!next) return;
    if (next === 'hire') this.#intakeBefore = intake(this.#store.state());
    if (step === 'train') this.#clock.pause('tutorial');
    this.#step.set(next);
  }

  #throw(): void {
    this.#closedBefore = this.#store.state().lifetimeClosed;
    if (this.#store.place(LESSON_TICKET) === NO_TICKET) return this.finish();
    this.#advance();
  }

  #send(): void {
    this.#store.endRoundNow(this.#clock.now());
    this.#advance();
    if (this.#store.hauling()) this.#clock.resume('tutorial');
  }
}

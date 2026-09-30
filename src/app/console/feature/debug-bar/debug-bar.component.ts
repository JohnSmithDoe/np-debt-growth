import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';

import { FinaleService } from '../../../@shared/data/finale.service';
import { GameClock } from '../../../game/data/game-clock.service';
import { GameStore } from '../../../game/data/game.store';
import { SaveService } from '../../../game/data/save.service';
import { ServiceDoorService } from '../../data/service-door.service';

interface Grant {
  readonly label: string;
  readonly budget: number;
  readonly points: number;
}

const GRANTS: readonly Grant[] = [
  { label: '+€1k', budget: 1_000, points: 0 },
  { label: '+€10M', budget: 10_000_000, points: 0 },
  { label: '+1k SP', budget: 0, points: 1_000 },
  { label: '+10M SP', budget: 0, points: 10_000_000 },
];

const ARMED_MS = 4_000;

@Component({
  selector: 'cb-debug-bar',
  templateUrl: './debug-bar.component.html',
  styleUrl: './debug-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DebugBarComponent {
  #store = inject(GameStore);
  #save = inject(SaveService);
  #clock = inject(GameClock);
  #finale = inject(FinaleService);
  #armTimer?: ReturnType<typeof setTimeout>;

  readonly shown = inject(ServiceDoorService).isOpen;
  readonly armed = signal(false);
  readonly grants = GRANTS;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.#armTimer));
  }

  apply(grant: Grant): void {
    this.#store.grant(grant.budget, grant.points);
  }

  buyOut(): void {
    this.#store.buyOut();
  }

  postMortem(): void {
    this.#store.acceptNow(this.#clock.now());
  }

  finale(): void {
    this.#finale.open();
  }

  reset(): void {
    clearTimeout(this.#armTimer);
    if (!this.armed()) {
      this.armed.set(true);
      this.#armTimer = setTimeout(() => this.armed.set(false), ARMED_MS);
      return;
    }
    this.armed.set(false);
    this.#store.reset(this.#clock.now());
    this.#save.wipe();
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { GameClock } from '../../../game/data/game-clock.service';
import { GameStore } from '../../../game/data/game.store';
import {
  FINAL_SKILL_ID,
  SECRET_SKILL_ID,
} from '../../../game/model/skill.model';
import { BackdropDirective } from '../../ui/backdrop/backdrop.directive';
import { PanelComponent } from '../../ui/panel/panel.component';
import { onRise } from '../../util/on-rise';
import type { MomentCopy, MomentId } from './moment-copy';
import { MOMENT_COPY } from './moment-copy';

@Component({
  selector: 'cb-moment-modal',
  templateUrl: './moment-modal.component.html',
  styleUrl: './moment-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BackdropDirective, PanelComponent, TranslatePipe],
  host: { '(document:keydown.escape)': 'dismiss()' },
})
export class MomentModalComponent {
  #store = inject(GameStore);

  readonly #secretFound = computed(
    () => (this.#store.skills()[SECRET_SKILL_ID] ?? 0) > 0
  );
  readonly #signed = computed(
    () => (this.#store.skills()[FINAL_SKILL_ID] ?? 0) > 0
  );

  #showing = signal<MomentId | null>(null);

  readonly moment = computed<MomentCopy | null>(() => {
    const id = this.#showing();
    return id === null ? null : MOMENT_COPY[id];
  });

  constructor() {
    const clock = inject(GameClock);
    inject(DestroyRef).onDestroy(() => clock.resume('moment'));
    effect(() =>
      this.#showing() === null ? clock.resume('moment') : clock.pause('moment')
    );
    onRise(
      () => Number(this.#secretFound()),
      () => this.#showing.set('secret')
    );
    onRise(
      () => Number(this.#signed()),
      () => this.#showing.set('closeout')
    );
  }

  dismiss(): void {
    this.#showing.set(null);
  }
}

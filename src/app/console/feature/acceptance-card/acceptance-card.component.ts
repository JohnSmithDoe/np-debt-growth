import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { formatQuantity } from '../../../@shared/util/format-quantity';
import { GameStore } from '../../../game/data/game.store';
import { ticketLabelKey } from '../../../game/model/ticket.model';

type Step = 'clean' | 'flagged' | 'now' | 'todo';

const URGENT_SECONDS = 5;

@Component({
  selector: 'cb-acceptance-card',
  templateUrl: './acceptance-card.component.html',
  styleUrl: './acceptance-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
})
export class AcceptanceCardComponent {
  readonly view = inject(GameStore).acceptance;

  readonly ticketKey = ticketLabelKey;

  readonly seconds = computed(() =>
    Math.ceil((this.view()?.msLeft ?? 0) / 1000)
  );
  readonly urgent = computed(() => this.seconds() <= URGENT_SECONDS);

  readonly timeLeft = computed(() => {
    const view = this.view();
    return view ? (view.msLeft / view.windowMs) * 100 : 0;
  });

  readonly progress = computed(() => {
    const view = this.view();
    return view ? Math.min(100, (view.picked / view.goal) * 100) : 0;
  });

  readonly overtime = computed(() => {
    const mult = this.view()?.overtime ?? 0;
    return Number.isInteger(mult) ? mult : formatQuantity(mult);
  });

  readonly steps = computed<readonly Step[]>(() => {
    const view = this.view();
    if (!view) return [];
    return Array.from({ length: view.of }, (_, line) =>
      view.clean.includes(line)
        ? 'clean'
        : view.flagged.includes(line)
          ? 'flagged'
          : line === view.index
            ? 'now'
            : 'todo'
    );
  });
}

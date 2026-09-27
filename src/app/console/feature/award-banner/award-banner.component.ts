import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { GameStore } from '../../../game/data/game.store';
import type { Award, AwardWeight } from '../../../game/model/award.model';
import {
  AWARD_BY_ID,
  awardBlurbKey,
  awardLabelKey,
} from '../../../game/model/award.model';
import { ConfettiComponent } from '../../ui/confetti/confetti.component';
import { TrophyComponent } from '../../ui/trophy/trophy.component';

interface AwardBand {
  readonly ms: number;
  readonly pieces: number;
}

const BANDS: Readonly<Record<AwardWeight, AwardBand>> = {
  small: { ms: 2400, pieces: 0 },
  medium: { ms: 3400, pieces: 8 },
  large: { ms: 4600, pieces: 14 },
};

const STACK = 3;
const HURRY = 0.55;

function continues(
  granted: readonly string[],
  seen: readonly string[]
): boolean {
  return (
    granted.length >= seen.length && seen.every((id, i) => granted[i] === id)
  );
}

interface AwardShow {
  readonly id: string;
  readonly labelKey: string;
  readonly blurbKey: string;
  readonly milestone: boolean;
  readonly weight: AwardWeight;
  readonly pieces: number;
}

@Component({
  selector: 'cb-award-banner',
  templateUrl: './award-banner.component.html',
  styleUrl: './award-banner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ConfettiComponent, TrophyComponent, TranslatePipe],
})
export class AwardBannerComponent {
  #store = inject(GameStore);
  #seen: readonly string[] = [];
  #queue = signal<readonly string[]>([]);
  readonly #timers = new Map<string, ReturnType<typeof setTimeout>>();

  readonly stack = computed<readonly AwardShow[]>(() =>
    this.#queue()
      .slice(0, STACK)
      .flatMap((id) => {
        const award = AWARD_BY_ID.get(id);
        return award ? [this.#show(award)] : [];
      })
  );

  readonly waiting = computed(() => Math.max(0, this.#queue().length - STACK));

  constructor() {
    inject(DestroyRef).onDestroy(() => this.#clearTimers());

    effect(() => {
      const granted = this.#store.awarded();
      const seen = this.#seen;
      this.#seen = granted;

      if (!continues(granted, seen)) {
        this.#clearTimers();
        this.#queue.set([...granted]);
        return;
      }
      const fresh = granted.slice(seen.length);
      if (fresh.length > 0) this.#queue.update((queue) => [...queue, ...fresh]);
    });

    effect(() => {
      const shown = this.#queue().slice(0, STACK);
      const hurry = this.waiting() > 0 ? HURRY : 1;
      for (const [id, timer] of this.#timers) {
        if (shown.includes(id)) continue;
        clearTimeout(timer);
        this.#timers.delete(id);
      }
      for (const id of shown) {
        if (this.#timers.has(id)) continue;
        const { ms } = BANDS[AWARD_BY_ID.get(id)?.weight ?? 'small'];
        this.#timers.set(
          id,
          setTimeout(() => this.dismiss(id), ms * hurry)
        );
      }
    });
  }

  dismiss(id: string): void {
    const timer = this.#timers.get(id);
    if (timer !== undefined) clearTimeout(timer);
    this.#timers.delete(id);
    this.#queue.update((queue) => queue.filter((queued) => queued !== id));
  }

  #clearTimers(): void {
    for (const timer of this.#timers.values()) clearTimeout(timer);
    this.#timers.clear();
  }

  #show(award: Award): AwardShow {
    return {
      id: award.id,
      labelKey: awardLabelKey(award.id),
      blurbKey: awardBlurbKey(award.id),
      milestone: award.kind === 'milestone',
      weight: award.weight,
      pieces: BANDS[award.weight].pieces,
    };
  }
}

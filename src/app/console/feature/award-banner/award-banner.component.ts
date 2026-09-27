import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';

import { GameStore } from '../../../game/data/game.store';
import type { Award, AwardWeight } from '../../../game/model/award.model';
import { AWARD_BY_ID } from '../../../game/model/award.model';
import { ConfettiComponent } from '../../ui/confetti/confetti.component';
import { TrophyComponent } from '../../ui/trophy/trophy.component';

interface AwardBand {
  readonly ms: number;
  readonly pieces: number;
}

const BANDS: Readonly<Record<AwardWeight, AwardBand>> = {
  small: { ms: 3200, pieces: 8 },
  medium: { ms: 4600, pieces: 14 },
  large: { ms: 6000, pieces: 22 },
};

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
  readonly label: string;
  readonly blurb: string;
  readonly milestone: boolean;
  readonly weight: AwardWeight;
  readonly pieces: number;
}

@Component({
  selector: 'cb-award-banner',
  templateUrl: './award-banner.component.html',
  styleUrl: './award-banner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ConfettiComponent, TrophyComponent],
})
export class AwardBannerComponent {
  #store = inject(GameStore);
  #seen: readonly string[] = [];
  #queue = signal<readonly string[]>([]);
  #timer?: ReturnType<typeof setTimeout>;

  readonly #head = computed<string | null>(() => this.#queue()[0] ?? null);

  readonly showing = computed<AwardShow | null>(() => {
    const id = this.#head();
    const award = id === null ? undefined : AWARD_BY_ID.get(id);
    return award ? this.#show(award) : null;
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.#timer));

    effect(() => {
      const granted = this.#store.awarded();
      const seen = this.#seen;
      this.#seen = granted;

      if (!continues(granted, seen)) {
        this.#queue.set([...granted]);
        return;
      }
      const fresh = granted.slice(seen.length);
      if (fresh.length > 0) this.#queue.update((queue) => [...queue, ...fresh]);
    });

    effect(() => {
      const id = this.#head();
      clearTimeout(this.#timer);
      if (id === null) return;
      const { ms } = BANDS[AWARD_BY_ID.get(id)?.weight ?? 'small'];
      this.#timer = setTimeout(() => this.dismiss(), ms);
    });
  }

  dismiss(): void {
    this.#queue.update((queue) => queue.slice(1));
  }

  #show(award: Award): AwardShow {
    return {
      id: award.id,
      label: award.label,
      blurb: award.blurb,
      milestone: award.kind === 'milestone',
      weight: award.weight,
      pieces: BANDS[award.weight].pieces,
    };
  }
}

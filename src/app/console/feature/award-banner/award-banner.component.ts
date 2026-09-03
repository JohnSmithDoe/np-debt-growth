import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';

import { formatWhole } from '../../../@shared/util/format-quantity';
import { GameStore } from '../../../game/data/game.store';
import type { Award } from '../../../game/model/award.model';
import { AWARD_BY_ID } from '../../../game/model/award.model';
import { ConfettiComponent } from '../../ui/confetti/confetti.component';
import { TrophyComponent } from '../../ui/trophy/trophy.component';

type AwardWeight = 'small' | 'medium' | 'large';

interface AwardBand {
  readonly from: number;
  readonly weight: AwardWeight;
  readonly ms: number;
  readonly pieces: number;
}

const SMALLEST: AwardBand = { from: 0, weight: 'small', ms: 3200, pieces: 8 };

const WEIGHTS: readonly AwardBand[] = [
  SMALLEST,
  { from: 10, weight: 'medium', ms: 4600, pieces: 14 },
  { from: 500, weight: 'large', ms: 6000, pieces: 22 },
];

function bandFor(sp: number): AwardBand {
  let band = SMALLEST;
  for (const next of WEIGHTS) if (sp >= next.from) band = next;
  return band;
}

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
  readonly sp: string;
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
      const { ms } = bandFor(AWARD_BY_ID.get(id)?.sp ?? 0);
      this.#timer = setTimeout(() => this.dismiss(), ms);
    });
  }

  dismiss(): void {
    this.#queue.update((queue) => queue.slice(1));
  }

  #show(award: Award): AwardShow {
    const band = bandFor(award.sp);
    return {
      id: award.id,
      label: award.label,
      blurb: award.blurb,
      sp: formatWhole(award.sp),
      milestone: award.kind === 'milestone',
      weight: band.weight,
      pieces: band.pieces,
    };
  }
}

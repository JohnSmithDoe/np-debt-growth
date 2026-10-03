import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import {
  formatCompactMoney,
  formatPoints,
} from '../../../@shared/util/format-quantity';
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
/** Acceptance criteria carry the finale's jokes: never hurried off. */
const CRITERION_PREFIX = 'c-';
const CRITERION_HOLD_MS = 7_000;

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
  readonly reward: AwardRewardShow | null;
}

interface AwardRewardShow {
  readonly key: 'award.reward.euro' | 'award.reward.sp';
  readonly amount: string;
}

interface RewardPop extends AwardRewardShow {
  readonly id: string;
  readonly weight: AwardWeight;
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

  readonly pops = signal<readonly RewardPop[]>([]);

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
      if (fresh.length === 0) return;
      this.#queue.update((queue) => [...queue, ...fresh]);
      const popped = fresh.flatMap((id): RewardPop[] => {
        const award = AWARD_BY_ID.get(id);
        const reward = this.#reward(id);
        return award && reward ? [{ id, weight: award.weight, ...reward }] : [];
      });
      if (popped.length > 0) this.pops.update((pops) => [...pops, ...popped]);
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
        const hold = id.startsWith(CRITERION_PREFIX)
          ? CRITERION_HOLD_MS
          : ms * hurry;
        this.#timers.set(
          id,
          setTimeout(() => this.dismiss(id), hold)
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

  popped(id: string): void {
    this.pops.update((pops) => pops.filter((pop) => pop.id !== id));
  }

  #reward(id: string): AwardRewardShow | null {
    const reward = untracked(this.#store.rewards).get(id);
    if (!reward) return null;
    return reward.currency === 'euro'
      ? { key: 'award.reward.euro', amount: formatCompactMoney(reward.amount) }
      : { key: 'award.reward.sp', amount: formatPoints(reward.amount) };
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
      reward: this.#reward(award.id),
    };
  }
}

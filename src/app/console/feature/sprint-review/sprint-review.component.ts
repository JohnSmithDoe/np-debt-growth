import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { GameStore } from '../../../game/data/game.store';
import { TICKET_TYPES } from '../../../game/model/ticket.model';
import {
  formatMoney,
  formatPoints,
  formatRate,
  formatWhole,
} from '../../../@shared/util/format-quantity';
import { CLIENT_NAME } from '../../model/client.model';
import { PanelComponent } from '../../ui/panel/panel.component';
import { AdrPanelComponent } from '../adr-panel/adr-panel.component';
import { NextStepService } from '../../data/next-step.service';
import { RetroService } from '../../data/retro.service';
import { invoiceRows } from '../../util/invoice-rows';
import { reviewRound } from '../../util/round-review';
import type { NewsRow } from '../../util/feed-row';
import { ROUND_LOG_SLOTS, roundHighlights } from '../../util/round-log';

const END_CONFIRM_MS = 4000;

@Component({
  selector: 'cb-sprint-review',
  imports: [PanelComponent, AdrPanelComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sprint-review.component.html',
  styleUrl: './sprint-review.component.scss',
})
export class SprintReviewComponent {
  readonly #store = inject(GameStore);
  readonly #steps = inject(NextStepService);
  readonly #retro = inject(RetroService);

  readonly startRound = output<void>();
  readonly openTree = output<void>();

  readonly review = computed(() => {
    const last = this.#store.lastRound();
    return last
      ? reviewRound(last, this.#store.previousRound(), this.#store.lastTarget())
      : null;
  });

  readonly nextRound = computed(() => this.#store.roundSeq() + 1);

  readonly target = computed(() => {
    const target = this.review()?.target;
    return target === undefined || target === null ? null : formatMoney(target);
  });

  readonly met = computed(() => this.review()?.met ?? true);

  readonly nextTarget = computed(() => {
    const target = this.#store.roundTarget();
    return target === null ? null : formatMoney(target);
  });

  readonly invoice = computed(() => {
    const document = this.#store.invoice();
    return document ? invoiceRows(document) : [];
  });

  readonly clientName = computed(() => CLIENT_NAME);

  readonly subheading = computed(() => {
    const round = this.review();
    return round ? `Sprint ${round.seq} · closed` : 'The board is waiting';
  });

  readonly billed = computed(() => formatMoney(this.review()?.billed ?? 0));

  readonly delta = computed(() => {
    const delta = this.review()?.delta;
    if (delta === undefined || delta === null) return null;
    const pct = Math.round(delta * 100);
    return `${pct >= 0 ? '+' : '−'}${Math.abs(pct)}%`;
  });

  readonly up = computed(() => (this.review()?.delta ?? 0) >= 0);

  readonly perSecond = computed(() => formatRate(this.#store.perSecond()));

  readonly crewShare = computed(
    () =>
      `The crew earns ${Math.round(this.#store.crewEarnedShare() * 100)}% of everything billed`
  );

  readonly verdict = computed(() => {
    const review = this.review();
    if (!review) return '';
    switch (review.bound) {
      case 'capacity':
        return `The sprint was full with ${Math.round(review.spareSeconds ?? 0)}s to spare — buy capacity.`;
      case 'hand':
        return `The sprint ended with ${formatWhole(review.capacity - review.filled)} slots empty and work still on the board — buy crew, reach, or seconds.`;
      case 'supply':
        return 'The board ran dry before the sprint filled — buy more debt.';
    }
  });

  readonly fill = computed(() => {
    const review = this.review();
    if (!review || review.capacity <= 0) return 0;
    return Math.min(100, (review.filled / review.capacity) * 100);
  });

  readonly unbilled = computed(() => formatWhole(this.review()?.unbilled ?? 0));

  readonly sprintCards = computed(() =>
    this.#store.roundSprint().map((slot, i) => {
      const type = TICKET_TYPES[slot.type];
      return {
        key: i,
        prefix: type.prefix,
        title: slot.title,
        ink: `#${type.colour.toString(16).padStart(6, '0')}`,
        rare: type.handOnly,
      };
    })
  );

  readonly #highlights = computed(() =>
    roundHighlights(
      this.#store.roundLog().filter((line) => line.kind !== 'close'),
      this.#store.escalationMultiplier()
    ).filter((row): row is NewsRow => row.kind !== 'close')
  );

  readonly roundRows = computed(() => {
    const rows = this.#highlights();
    return [
      ...rows,
      ...Array.from({ length: ROUND_LOG_SLOTS - rows.length }, () => null),
    ];
  });

  readonly quiet = computed(() => this.#highlights().length === 0);

  readonly skimShare = computed(() => {
    const round = this.review();
    if (!round) return 0;
    const gross = round.landed + round.skimmed;
    return gross > 0 ? (round.skimmed / gross) * 100 : 0;
  });

  readonly skimmed = computed(() => formatMoney(this.review()?.skimmed ?? 0));

  readonly pointRows = computed(() => {
    const points = this.review()?.points;
    return [
      { label: 'Velocity', value: points?.velocity ?? 0 },
      { label: 'Copilots', value: points?.copilots ?? 0 },
      { label: 'Awards', value: points?.awards ?? 0 },
    ].map((row) => ({
      label: row.label,
      value: row.value > 0 ? formatPoints(row.value) : '—',
    }));
  });

  readonly pointsEarned = computed(() =>
    formatPoints(this.review()?.points.total ?? 0)
  );

  readonly sink = computed(() => {
    const cost = this.#store.cheapestSpSquare();
    if (cost === null) return null;

    const short = cost - this.#store.storyPoints();
    if (short <= 0) return `${formatWhole(cost)} SP · affordable now`;

    const rate = this.review()?.points.total ?? 0;
    if (rate <= 0) return `${formatWhole(cost)} SP · nothing earning yet`;

    const rounds = Math.ceil(short / rate);
    return `${formatWhole(cost)} SP · ${rounds} ${rounds === 1 ? 'round' : 'rounds'} at this rate`;
  });

  readonly waiting = computed(() => this.#steps.countByTarget()['skills'] ?? 0);

  readonly canReadRetro = computed(
    () => !this.#store.ended() && this.#store.lifetimeClosed() > 0
  );

  openRetro(): void {
    this.#retro.open();
  }

  readonly promotionOffered = computed(() => this.#store.promotionOffered());

  readonly promotionCost = computed(() =>
    formatMoney(this.#store.promotionCost())
  );

  readonly canAffordPromotion = computed(
    () => this.#store.budget() >= this.#store.promotionCost()
  );

  readonly juniorCount = computed(() => this.#store.levels().junior);

  readonly promoteArmed = signal(false);
  #promoteTimer?: ReturnType<typeof setTimeout>;

  promote(): void {
    if (!this.promoteArmed()) {
      this.promoteArmed.set(true);
      this.#promoteTimer = setTimeout(
        () => this.promoteArmed.set(false),
        END_CONFIRM_MS
      );
      return;
    }
    clearTimeout(this.#promoteTimer);
    this.promoteArmed.set(false);
    this.#store.promote();
  }

  readonly canEndRun = computed(() => this.#store.canEndRun());

  readonly endArmed = signal(false);
  #endTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.#endTimer);
      clearTimeout(this.#promoteTimer);
    });
  }

  endRun(): void {
    if (!this.endArmed()) {
      this.endArmed.set(true);
      this.#endTimer = setTimeout(
        () => this.endArmed.set(false),
        END_CONFIRM_MS
      );
      return;
    }
    clearTimeout(this.#endTimer);
    this.endArmed.set(false);
    this.#store.endRun(Date.now());
  }
}

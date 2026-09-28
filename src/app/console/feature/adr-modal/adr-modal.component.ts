import { TranslatePipe } from '@ngx-translate/core';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';

import { formatLongDate } from '../../../@shared/util/format-quantity';
import { GameClock } from '../../../game/data/game-clock.service';
import { GameStore } from '../../../game/data/game.store';
import type { DebtTier } from '../../../game/model/tier.model';
import {
  ADR_PARTS,
  adrPartKey,
  epicNameKey,
  tierAt,
  tierNameKey,
} from '../../../game/model/tier.model';
import {
  approvalAt,
  CLIENT_NAME,
  roleKey,
  signatoryKey,
} from '../../model/client.model';
import { BackdropDirective } from '../../ui/backdrop/backdrop.directive';
import { PanelComponent } from '../../ui/panel/panel.component';
import { backdropUrl } from '../../../@shared/util/backdrop-art';
import { officeArtFor } from '../../util/office-art';
import { onRise } from '../../util/on-rise';

interface AdrData {
  readonly tier: DebtTier;
  readonly epic: string;
  readonly parts: readonly {
    readonly heading: string;
    readonly body: string;
  }[];
  readonly approval:
    | { readonly by: string; readonly role: string; readonly date: string }
    | undefined;
  readonly art: string;
  readonly office: string;
}

const LEAVE_MS = 420;

@Component({
  selector: 'cb-adr-modal',
  templateUrl: './adr-modal.component.html',
  styleUrl: './adr-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BackdropDirective, PanelComponent, TranslatePipe],
  host: { '(document:keydown.escape)': 'back()' },
})
export class AdrModalComponent {
  readonly tierNameKey = tierNameKey;
  readonly client = CLIENT_NAME;
  readonly leaveMs = `${LEAVE_MS}ms`;
  #store = inject(GameStore);
  #shownTier = signal<number | null>(null);
  #leaveTimer?: ReturnType<typeof setTimeout>;

  readonly leaving = signal(false);

  constructor() {
    const clock = inject(GameClock);
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.#leaveTimer);
      clock.resume('record');
    });
    onRise(this.#store.tier, (tier) => this.#shownTier.set(tier));
    effect(() =>
      this.#shownTier() === null
        ? clock.resume('record')
        : clock.pause('record')
    );
  }

  readonly record = computed<AdrData | null>(() => {
    const shown = this.#shownTier();
    return shown === null ? null : this.#read(shown);
  });

  #read(tier: number): AdrData | null {
    const debtTier = tierAt(tier);
    if (!debtTier) return null;
    const approval = approvalAt(tier);
    return {
      tier: debtTier,
      epic: epicNameKey(tier),
      parts: ADR_PARTS.map((part) => ({
        heading: `adr.${part}`,
        body: adrPartKey(tier, part),
      })),
      approval: approval && {
        by: signatoryKey(approval.by),
        role: roleKey(approval.role),
        date: formatLongDate(approval.date),
      },
      art: backdropUrl(tier, 'tier'),
      office: officeArtFor(tier),
    };
  }

  back(): void {
    if (!this.record() || this.leaving()) return;
    this.leaving.set(true);
    this.#leaveTimer = setTimeout(() => {
      this.leaving.set(false);
      this.#shownTier.set(null);
    }, LEAVE_MS);
  }
}

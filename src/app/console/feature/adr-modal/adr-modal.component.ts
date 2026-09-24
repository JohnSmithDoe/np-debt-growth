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

import { formatWhole } from '../../../@shared/util/format-quantity';
import { GameStore } from '../../../game/data/game.store';
import type { DebtTier } from '../../../game/model/tier.model';
import { tierAt, tierNameKey } from '../../../game/model/tier.model';
import type { Approval } from '../../model/client.model';
import { approvalAt, CLIENT_NAME } from '../../model/client.model';
import { AdrUiService } from '../../data/adr-ui.service';
import { BackdropDirective } from '../../ui/backdrop/backdrop.directive';
import { PanelComponent } from '../../ui/panel/panel.component';
import { officeArtFor } from '../../util/office-art';
import type { AdrCopy } from './adr-copy';
import { ADR_COPY } from './adr-copy';
import { adrPrice } from '../../../game/model/skill.model';

interface AdrData {
  readonly tier: DebtTier;
  readonly copy: AdrCopy;
  readonly approval: Approval | undefined;
  readonly art: string;
  readonly office: string;
  readonly signed: boolean;
  readonly cost: string;
  readonly affordable: boolean;
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
  #ui = inject(AdrUiService);
  #lastSeenTier = this.#store.tier();
  #shownTier = signal<number | null>(null);
  #leaveTimer?: ReturnType<typeof setTimeout>;

  readonly leaving = signal(false);

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.#leaveTimer));
    effect(() => {
      const tier = this.#store.tier();
      if (tier > this.#lastSeenTier) this.#shownTier.set(tier);
      this.#lastSeenTier = tier;
    });
  }

  readonly record = computed<AdrData | null>(() => {
    const shown = this.#shownTier();
    if (shown !== null) return this.#read(shown, true);
    if (!this.#ui.isOpen()) return null;
    return this.#read(this.#store.tier() + 1, false);
  });

  #read(tier: number, signed: boolean): AdrData | null {
    const debtTier = tierAt(tier);
    const copy = ADR_COPY[tier];
    if (!debtTier || !copy) return null;
    return {
      tier: debtTier,
      copy,
      approval: signed ? approvalAt(tier) : undefined,
      art: `assets/art/tier/${tier}.png`,
      office: officeArtFor(tier),
      signed,
      cost: `${formatWhole(adrPrice(tier))} SP`,
      affordable: this.#store.state().storyPoints >= adrPrice(tier),
    };
  }

  approve(): void {
    this.#store.unlockNextTier();
    this.#ui.close();
  }

  back(): void {
    if (this.leaving()) return;
    this.leaving.set(true);
    this.#leaveTimer = setTimeout(() => {
      this.leaving.set(false);
      this.#shownTier.set(null);
      this.#ui.close();
    }, LEAVE_MS);
  }
}

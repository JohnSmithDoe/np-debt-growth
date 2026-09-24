import { TranslatePipe } from '@ngx-translate/core';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';

import {
  formatDuration,
  formatWhole,
} from '../../../@shared/util/format-quantity';
import { GameStore } from '../../../game/data/game.store';
import { ticketLabelKey } from '../../../game/model/ticket.model';
import {
  DEBT_TIERS,
  tierAt,
  tierBlurbKey,
  tierNameKey,
} from '../../../game/model/tier.model';
import { AdrUiService } from '../../data/adr-ui.service';
import { officeArtFor } from '../../util/office-art';
import { adrPrice } from '../../../game/model/skill.model';

interface NextRecord {
  readonly index: number;
  readonly nameKey: string;
  readonly blurbKey: string;
  readonly ticketKey: string;
  readonly cost: string;
  readonly affordable: boolean;
  readonly timeToAfford: string;
  readonly art: string;
}

@Component({
  selector: 'cb-adr-panel',
  templateUrl: './adr-panel.component.html',
  styleUrl: './adr-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
})
export class AdrPanelComponent {
  #store = inject(GameStore);
  #ui = inject(AdrUiService);

  readonly tier = this.#store.tier;
  readonly total = DEBT_TIERS.length;

  readonly next = computed<NextRecord | null>(() => {
    const state = this.#store.state();
    const tier = tierAt(state.tier + 1);
    if (!tier) return null;

    const price = adrPrice(tier.index);
    const affordable = state.storyPoints >= price;
    const perSecond = this.#store.pointsPerSecond();
    return {
      index: tier.index,
      nameKey: tierNameKey(tier.index),
      blurbKey: tierBlurbKey(tier.index),
      ticketKey: ticketLabelKey(tier.ticket),
      cost: `${formatWhole(price)} SP`,
      affordable,
      timeToAfford:
        affordable || perSecond <= 0
          ? '—'
          : formatDuration((price - state.storyPoints) / perSecond),
      art: officeArtFor(tier.index),
    };
  });

  open(): void {
    this.#ui.open();
  }
}

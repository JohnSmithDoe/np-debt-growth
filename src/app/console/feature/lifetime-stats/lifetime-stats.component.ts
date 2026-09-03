import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import {
  formatMoney,
  formatWhole,
} from '../../../@shared/util/format-quantity';
import { GameStore } from '../../../game/data/game.store';
import { MAX_TIER, tierAt, tierNameKey } from '../../../game/model/tier.model';
import { PanelComponent } from '../../ui/panel/panel.component';

interface Stat {
  readonly label: string;
  readonly value: string;
  readonly tone: 'money' | 'plain';
}

interface Rung {
  readonly nameKey: string;
  readonly index: number;
  readonly cost: string;
  readonly pct: number;
  readonly done: boolean;
}

@Component({
  selector: 'cb-lifetime-stats',
  templateUrl: './lifetime-stats.component.html',
  styleUrl: './lifetime-stats.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PanelComponent, TranslatePipe],
})
export class LifetimeStatsComponent {
  #store = inject(GameStore);

  readonly rung = computed<Rung>(() => {
    const state = this.#store.state();
    const next = tierAt(state.tier + 1);
    if (!next) {
      return {
        nameKey: tierNameKey(MAX_TIER),
        index: MAX_TIER,
        cost: '',
        pct: 100,
        done: true,
      };
    }
    return {
      nameKey: tierNameKey(next.index),
      index: next.index,
      cost: formatMoney(next.unlockCost),
      pct: Math.min(100, (state.budget / next.unlockCost) * 100),
      done: false,
    };
  });

  readonly stats = computed<Stat[]>(() => {
    const closed = this.#store.lifetimeClosed();
    const billed = this.#store.lifetimeBilled();
    const sprints = this.#store.lifetimeRounds();
    const skimmed = this.#store.lifetimeSkimmed();
    const perSprint = sprints === 0 ? 0 : billed / sprints;
    return [
      { label: 'Tickets closed', value: formatWhole(closed), tone: 'plain' },
      { label: 'Sprints closed', value: formatWhole(sprints), tone: 'plain' },
      { label: 'Total billed', value: formatMoney(billed), tone: 'money' },
      {
        label: 'Mean per sprint',
        value: formatMoney(perSprint),
        tone: 'money',
      },
      {
        label: 'Skimmed to SP',
        value: skimmed > 0 ? formatMoney(skimmed) : '—',
        tone: 'money',
      },
      {
        label: 'Crew’s share',
        value: `${Math.round(this.#store.crewEarnedShare() * 100)}%`,
        tone: 'plain',
      },
    ];
  });
}

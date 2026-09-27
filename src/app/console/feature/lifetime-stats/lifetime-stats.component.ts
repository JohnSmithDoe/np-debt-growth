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
import { adrPrice } from '../../../game/model/skill.model';

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
    const price = adrPrice(next.index);
    return {
      nameKey: tierNameKey(next.index),
      index: next.index,
      cost: `${formatWhole(price)} SP`,
      pct: Math.min(100, (state.storyPoints / price) * 100),
      done: false,
    };
  });

  readonly stats = computed<Stat[]>(() => {
    const closed = this.#store.lifetimeClosed();
    const billed = this.#store.lifetimeBilled();
    const sprints = this.#store.lifetimeRounds();
    const perSprint = sprints === 0 ? 0 : billed / sprints;
    return [
      { label: 'stats.closed', value: formatWhole(closed), tone: 'plain' },
      {
        label: 'stats.wont-fix',
        value: formatWhole(this.#store.lifetimeWontFix()),
        tone: 'plain',
      },
      { label: 'stats.sprints', value: formatWhole(sprints), tone: 'plain' },
      { label: 'stats.billed', value: formatMoney(billed), tone: 'money' },
      {
        label: 'stats.per-sprint',
        value: formatMoney(perSprint),
        tone: 'money',
      },
      {
        label: 'stats.crew-share',
        value: `${Math.round(this.#store.crewEarnedShare() * 100)}%`,
        tone: 'plain',
      },
    ];
  });
}

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { formatCompactMoney } from '../../../@shared/util/format-quantity';
import { GameStore } from '../../../game/data/game.store';
import type { PurchaseId } from '../../../game/model/balance/progression';
import { PURCHASE_IDS } from '../../../game/model/balance/progression';
import {
  SPAWNER_CAP,
  SPAWNERS,
  spawnerBlurbKey,
  spawnerLabelKey,
} from '../../../game/model/spawner.model';
import { PanelComponent } from '../../ui/panel/panel.component';

type Tab = 'supply' | 'crew';

interface LineRow {
  readonly line: PurchaseId;
  readonly name: string;
  readonly held: number;
  readonly cap: number;
  readonly cost: string;
  readonly maxed: boolean;
  readonly affordable: boolean;
}

interface SupplyRow {
  readonly adr: number;
  readonly name: string;
  readonly blurb: string;
  readonly held: number;
  readonly cap: number;
  readonly cost: string;
  readonly maxed: boolean;
  readonly affordable: boolean;
}

@Component({
  selector: 'cb-supply-panel',
  templateUrl: './supply-panel.component.html',
  styleUrl: './supply-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PanelComponent],
})
export class SupplyPanelComponent {
  #store = inject(GameStore);
  #text = inject(TranslateService);

  readonly rows = computed<readonly SupplyRow[]>(() => {
    this.#store.state();
    return SPAWNERS.filter((row) => this.#store.spawnerUnlocked(row.adr)).map(
      (row) => {
        const held = this.#store.spawnerCount(row.adr);
        const maxed = held >= SPAWNER_CAP;
        return {
          adr: row.adr,
          name: this.#text.instant(spawnerLabelKey(row.adr)),
          blurb: this.#text.instant(spawnerBlurbKey(row.adr)),
          held,
          cap: SPAWNER_CAP,
          cost: maxed
            ? 'MAX'
            : formatCompactMoney(this.#store.spawnerCost(row.adr)),
          maxed,
          affordable: this.#store.canBuySpawner(row.adr),
        };
      }
    );
  });

  readonly locked = computed(() => {
    this.#store.state();
    return SPAWNERS.filter((row) => !this.#store.spawnerUnlocked(row.adr))
      .length;
  });

  readonly tab = signal<Tab>('supply');

  readonly crew = computed<readonly LineRow[]>(() => {
    this.#store.state();
    return PURCHASE_IDS.filter((line) => this.#store.lineUnlocked(line)).map(
      (line) => {
        const held = this.#store.levels()[line];
        const cap = this.#store.lineCap(line);
        const maxed = held >= cap;
        return {
          line,
          name: this.#text.instant(`purchase.${line}.label`),
          held,
          cap,
          cost: maxed ? 'MAX' : formatCompactMoney(this.#store.lineCost(line)),
          maxed,
          affordable: this.#store.canBuyLine(line),
        };
      }
    );
  });

  show(tab: Tab): void {
    this.tab.set(tab);
  }

  buy(adr: number): void {
    this.#store.buySpawner(adr);
  }

  hire(line: PurchaseId): void {
    this.#store.buyLine(line);
  }
}

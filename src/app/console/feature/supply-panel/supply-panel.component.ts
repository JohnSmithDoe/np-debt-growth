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
import {
  INCOME_CAP,
  PURCHASE_IDS,
} from '../../../game/model/balance/progression';
import { LINE_EFFECT_PARAMS } from '../../../game/model/purchase-copy.model';
import type { TicketTypeId } from '../../../game/model/ticket.model';
import { ticketLabelKey } from '../../../game/model/ticket.model';
import {
  SPAWNED_TICKET_IDS,
  SPAWNER_CAP,
  SPAWNERS,
  spawnerBlurbKey,
  spawnerLabelKey,
} from '../../../game/model/spawner.model';
import { PanelComponent } from '../../ui/panel/panel.component';

const TABS = ['supply', 'income', 'crew'] as const;

type Tab = (typeof TABS)[number];

const MAXED = 'MAX';

/** One shop row, whatever tab it sits in. */
const SP_UNLOCK: PurchaseId = 'velocity';

interface Row {
  readonly key: string;
  readonly name: string;
  readonly blurb: string;
  readonly locked: boolean;
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

  readonly tab = signal<Tab>('supply');

  // Resolved per render: the catalogue is lazily imported, so a field
  // initialiser would read the keys back raw.
  readonly tabs = computed<readonly { id: Tab; label: string }[]>(() => {
    this.#store.state();
    return TABS.map((id) => ({ id, label: this.#say(`rail.tab.${id}`) }));
  });

  readonly supply = computed<readonly Row[]>(() => {
    this.#store.state();
    return [...this.#unlockRow(), ...this.#spawnerRows()];
  });

  /** The SP unlock sits beside the first head until bought, then leaves the rail. */
  #unlockRow(): readonly Row[] {
    if (this.#store.levels()[SP_UNLOCK] > 0) return [];
    return [
      {
        key: SP_UNLOCK,
        name: this.#say(`purchase.${SP_UNLOCK}.label`),
        blurb: this.#say(
          `purchase.${SP_UNLOCK}.effect`,
          LINE_EFFECT_PARAMS[SP_UNLOCK]
        ),
        locked: false,
        held: 0,
        cap: 1,
        cost: formatCompactMoney(this.#store.lineCost(SP_UNLOCK)),
        maxed: false,
        affordable: this.#store.canBuyLine(SP_UNLOCK),
      },
    ];
  }

  #spawnerRows(): readonly Row[] {
    return SPAWNERS.filter((row) => this.#store.spawnerUnlocked(row.adr)).map(
      (row) => {
        const held = this.#store.spawnerCount(row.adr);
        const maxed = held >= SPAWNER_CAP;
        return {
          key: String(row.adr),
          name: this.#say(spawnerLabelKey(row.adr)),
          blurb: this.#say(spawnerBlurbKey(row.adr)),
          locked: false,
          held,
          cap: SPAWNER_CAP,
          cost: maxed
            ? MAXED
            : formatCompactMoney(this.#store.spawnerCost(row.adr)),
          maxed,
          affordable: this.#store.canBuySpawner(row.adr),
        };
      }
    );
  }

  readonly locked = computed(() => {
    this.#store.state();
    return SPAWNERS.filter((row) => !this.#store.spawnerUnlocked(row.adr))
      .length;
  });

  /** Rates: bill more for one kind of work, once its source is on the path. */
  readonly income = computed<readonly Row[]>(() => {
    this.#store.state();
    return SPAWNED_TICKET_IDS.filter((id) =>
      this.#store.incomeUnlocked(id)
    ).map((id) => {
      const held = this.#store.incomeLevel(id);
      const maxed = held >= INCOME_CAP;
      return {
        key: id,
        name: this.#say(ticketLabelKey(id)),
        blurb: this.#rateBlurb(id),
        locked: false,
        held,
        cap: INCOME_CAP,
        cost: maxed ? MAXED : formatCompactMoney(this.#store.incomeCost(id)),
        maxed,
        affordable: this.#store.canBuyIncome(id),
      };
    });
  });

  readonly rateLocked = computed(() => {
    this.#store.state();
    return SPAWNED_TICKET_IDS.filter((id) => !this.#store.incomeUnlocked(id))
      .length;
  });

  readonly crew = computed<readonly Row[]>(() => {
    this.#store.state();
    // Locked lines stay on show — an empty tab reads as broken, not as
    // "these open on the tree".
    return PURCHASE_IDS.filter((line) => line !== SP_UNLOCK).map((line) => {
      const locked = !this.#store.lineUnlocked(line);
      const held = this.#store.levels()[line];
      const cap = this.#store.lineCap(line);
      const maxed = held >= cap;
      return {
        key: line,
        name: this.#say(`purchase.${line}.label`),
        blurb: this.#say(`purchase.${line}.effect`, LINE_EFFECT_PARAMS[line]),
        locked,
        held,
        cap,
        cost: locked
          ? 'on the tree'
          : maxed
            ? MAXED
            : formatCompactMoney(this.#store.lineCost(line)),
        maxed,
        affordable: this.#store.canBuyLine(line),
      };
    });
  });

  readonly rows = computed<readonly Row[]>(() => {
    switch (this.tab()) {
      case 'supply':
        return this.supply();
      case 'income':
        return this.income();
      case 'crew':
        return this.crew();
    }
  });

  show(tab: Tab): void {
    this.tab.set(tab);
  }

  buy(key: string): void {
    switch (this.tab()) {
      case 'supply':
        if (key === SP_UNLOCK) this.#store.buyLine(SP_UNLOCK);
        else this.#store.buySpawner(Number(key));
        return;
      case 'income':
        this.#store.buyIncome(key as TicketTypeId);
        return;
      case 'crew':
        this.#store.buyLine(key as PurchaseId);
        return;
    }
  }

  #rateBlurb(id: TicketTypeId): string {
    return this.#say('rail.income.effect', {
      pct: formatCompactMoney(this.#store.incomeStep(id)),
      ticket: this.#say(ticketLabelKey(id)),
    });
  }

  #say(key: string, params?: Record<string, string | number>): string {
    return this.#text.instant(key, params);
  }
}

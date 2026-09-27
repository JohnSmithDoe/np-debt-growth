/* Translated labels resolve inside computeds: the catalogue loads lazily, so a field initialiser reads raw keys. */
import {
  HOLD_REPEAT,
  holdGapMs,
} from '../../../@shared/model/hold-repeat.model';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { BoardIcons } from '../../../@shared/data/board-icons.service';
import { SettingsService } from '../../../@shared/data/settings.service';
import {
  formatCompactMoney,
  formatDuration,
} from '../../../@shared/util/format-quantity';
import { GameStore } from '../../../game/data/game.store';
import type { PurchaseId } from '../../../game/model/balance/progression';
import type { Consultancy } from '../../../game/model/consultancy.model';
import {
  INCOME_CAP,
  PURCHASE_IDS,
} from '../../../game/model/balance/progression';
import type { KitEffect } from '../../../game/model/kit.model';
import { kitLabelKey } from '../../../game/model/kit.model';
import { LINE_EFFECT_PARAMS } from '../../../game/model/purchase-copy.model';
import type { TicketTypeId } from '../../../game/model/ticket.model';
import { ticketLabelKey } from '../../../game/model/ticket.model';
import {
  SPAWNED_TICKET_IDS,
  SPAWNER_CAP,
  SPAWNER_FREE_HEADS,
  SPAWNERS,
  spawnerBlurbKey,
  spawnerLabelKey,
} from '../../../game/model/spawner.model';
import * as economy from '../../../game/util/economy';
import { BillingRateService } from '../../data/billing-rate.service';
import { PanelComponent } from '../../ui/panel/panel.component';
import { sameRecord } from '../../util/same-record';

const TABS = ['supply', 'income', 'crew'] as const;

type Tab = (typeof TABS)[number];

const SP_UNLOCK: PurchaseId = 'velocity';

const TEASED = 2;

interface Row {
  readonly key: string;
  readonly name: string;
  readonly blurb: string;
  readonly locked: boolean;
  readonly teaser?: boolean;
  readonly first?: boolean;
  readonly held: number;
  readonly cap: number;
  readonly cost: string;
  readonly maxed: boolean;
  readonly price: number | null;
  readonly icon?: {
    readonly url: string;
    readonly kind: 'card' | 'crew' | 'art';
  };
}

const LINE_CREW: Partial<Record<PurchaseId, string>> = {
  junior: 'juniors',
  senior: 'seniors',
  manager: 'managers',
};

const LINE_ART: Partial<Record<PurchaseId, string>> = {
  kit: 'assets/skills/kit.png',
};

const CREW_ROWS: readonly PurchaseId[] = [
  'kit',
  ...PURCHASE_IDS.filter((line) => line !== 'kit' && line !== SP_UNLOCK),
];

const maxedLast = (rows: readonly Row[]): readonly Row[] => [
  ...rows.filter((row) => !row.maxed),
  ...rows.filter((row) => row.maxed),
];

const percent = (mult: number): string => `+${Math.round((mult - 1) * 100)}%`;

const samePriced = (a: Consultancy, b: Consultancy): boolean =>
  a.tier === b.tier &&
  sameRecord(a.levels, b.levels) &&
  sameRecord(a.skills, b.skills) &&
  sameRecord(a.spawners, b.spawners) &&
  sameRecord(a.income, b.income);

type Affordable = Readonly<Record<Tab, ReadonlySet<string>>>;

const sameSet = (a: ReadonlySet<string>, b: ReadonlySet<string>): boolean =>
  a.size === b.size && [...a].every((key) => b.has(key));

const sameAffordable = (a: Affordable, b: Affordable): boolean =>
  TABS.every((tab) => sameSet(a[tab], b[tab]));

@Component({
  selector: 'cb-supply-panel',
  templateUrl: './supply-panel.component.html',
  styleUrl: './supply-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PanelComponent, TranslatePipe],
})
export class SupplyPanelComponent {
  #store = inject(GameStore);
  #text = inject(TranslateService);
  #icons = inject(BoardIcons);

  #settings = inject(SettingsService);
  #rate = inject(BillingRateService).perSec;

  readonly tab = computed<Tab>(() => {
    const saved = this.#settings.railTab();
    return TABS.find((tab) => tab === saved) ?? 'supply';
  });
  readonly flash = signal<{ key: string; beat: number } | null>(null);

  #holdTimer: ReturnType<typeof setTimeout> | undefined;

  readonly #priced = computed(() => this.#store.state(), {
    equal: samePriced,
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.release());
  }

  readonly tabs = computed<
    readonly { id: Tab; label: string; buyable: boolean }[]
  >(() => {
    this.#catalogue();
    const affordable = this.#affordable();
    return TABS.map((id) => ({
      id,
      label: this.#say(`rail.tab.${id}`),
      buyable: affordable[id].size > 0,
    }));
  });

  readonly #affordable = computed<Affordable>(
    () => {
      const budget = this.#store.budget();
      const keys = (rows: readonly Row[]): ReadonlySet<string> =>
        new Set(
          rows
            .filter((row) => row.price !== null && budget >= row.price)
            .map((row) => row.key)
        );
      return {
        supply: keys(this.supply()),
        income: keys(this.income()),
        crew: keys(this.crew()),
      };
    },
    { equal: sameAffordable }
  );

  readonly affordable = computed(() => this.#affordable()[this.tab()]);

  readonly supply = computed<readonly Row[]>(() => {
    this.#catalogue();
    const state = this.#priced();
    return [
      ...this.#unlockRow(state),
      ...this.#spawnerRows(state),
      ...this.#spawnerTeasers(state),
    ];
  });

  #spawnerTeasers(state: Consultancy): readonly Row[] {
    return SPAWNERS.filter((row) => !economy.spawnerUnlocked(state, row.adr))
      .slice(0, TEASED)
      .map((row) => ({
        key: `teaser:${row.adr}`,
        name: this.#say(spawnerLabelKey(row.adr)),
        blurb: this.#say('rail.teaser.adr', { adr: row.adr }),
        locked: true,
        teaser: true,
        held: 0,
        cap: SPAWNER_CAP,
        cost: `ADR-${row.adr}`,
        maxed: false,
        price: null,
        icon: this.#walkerOf(row.adr),
      }));
  }

  #unlockRow(state: Consultancy): readonly Row[] {
    if (state.levels[SP_UNLOCK] > 0) return [];
    const price = economy.lineCost(state, SP_UNLOCK);
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
        cost: formatCompactMoney(price),
        maxed: false,
        price: this.#linePrice(state, SP_UNLOCK, price),
      },
    ];
  }

  #spawnerRows(state: Consultancy): readonly Row[] {
    return SPAWNERS.filter((row) =>
      economy.spawnerUnlocked(state, row.adr)
    ).map((row) => {
      const held = economy.spawnerCount(state, row.adr);
      const maxed = held >= SPAWNER_CAP;
      const price = economy.spawnerCost(state, row.adr);
      return {
        key: String(row.adr),
        name: this.#say(spawnerLabelKey(row.adr)),
        blurb: this.#say(spawnerBlurbKey(row.adr)),
        locked: false,
        held,
        cap: SPAWNER_CAP,
        cost: maxed ? this.#say('rail.maxed') : formatCompactMoney(price),
        maxed,
        price: maxed ? null : price,
        first: row.adr === 0 && held <= SPAWNER_FREE_HEADS,
        icon: this.#walkerOf(row.adr),
      };
    });
  }

  readonly locked = computed(() => {
    const state = this.#priced();
    const locked = SPAWNERS.filter(
      (row) => !economy.spawnerUnlocked(state, row.adr)
    ).length;
    return Math.max(0, locked - TEASED);
  });

  readonly income = computed<readonly Row[]>(() => {
    this.#catalogue();
    const state = this.#priced();
    const teasers = SPAWNED_TICKET_IDS.filter(
      (id) => !economy.incomeUnlocked(state, id)
    )
      .slice(0, TEASED)
      .map((id): Row => ({
        key: `teaser:${id}`,
        name: this.#say(ticketLabelKey(id)),
        blurb: this.#say('rail.income.locked'),
        locked: true,
        teaser: true,
        held: 0,
        cap: INCOME_CAP,
        cost: '—',
        maxed: false,
        price: null,
        icon: this.#cardOf(id),
      }));
    return [...this.#rateRows(state), ...teasers];
  });

  #rateRows(state: Consultancy): readonly Row[] {
    return SPAWNED_TICKET_IDS.filter((id) =>
      economy.incomeUnlocked(state, id)
    ).map((id) => {
      const held = economy.incomeLevel(state, id);
      const maxed = held >= INCOME_CAP;
      const price = economy.incomeCost(state, id);
      return {
        key: id,
        name: this.#say(ticketLabelKey(id)),
        blurb: this.#rateBlurb(id),
        locked: false,
        held,
        cap: INCOME_CAP,
        cost: maxed ? this.#say('rail.maxed') : formatCompactMoney(price),
        maxed,
        price: maxed ? null : price,
        icon: this.#cardOf(id),
      };
    });
  }

  readonly rateLocked = computed(() => {
    const state = this.#priced();
    const locked = SPAWNED_TICKET_IDS.filter(
      (id) => !economy.incomeUnlocked(state, id)
    ).length;
    return Math.max(0, locked - TEASED);
  });

  readonly crew = computed<readonly Row[]>(() => {
    this.#catalogue();
    const state = this.#priced();
    return CREW_ROWS.map((line) => {
      const locked = !economy.lineUnlocked(state, line);
      const held = state.levels[line];
      const cap = economy.lineCap(state, line);
      const maxed = held >= cap;
      const price = economy.lineCost(state, line);
      return {
        key: line,
        name: this.#say(`purchase.${line}.label`),
        blurb:
          line === 'kit'
            ? this.#kitBlurb(state)
            : this.#say(`purchase.${line}.effect`, LINE_EFFECT_PARAMS[line]),
        locked,
        held,
        cap,
        cost: locked
          ? this.#say('rail.on-tree')
          : maxed
            ? this.#say('rail.maxed')
            : formatCompactMoney(price),
        maxed,
        price: this.#linePrice(state, line, price),
        icon:
          this.#icon('art', LINE_ART[line]) ??
          this.#icon(
            'crew',
            this.#icons.icons().crew.get(LINE_CREW[line] ?? '')
          ),
      };
    });
  });

  readonly rows = computed<readonly Row[]>(() =>
    maxedLast(this.#tabRows(this.tab()))
  );

  readonly etas = computed<ReadonlyMap<string, string>>(() => {
    const budget = this.#store.budget();
    const rate = this.#rate();
    const etas = new Map<string, string>();
    if (rate <= 0) return etas;
    for (const row of this.rows()) {
      if (row.price === null || budget >= row.price) continue;
      etas.set(
        row.key,
        this.#say('rail.eta', {
          time: formatDuration((row.price - budget) / rate),
        })
      );
    }
    return etas;
  });

  #tabRows(tab: Tab): readonly Row[] {
    switch (tab) {
      case 'supply':
        return this.supply();
      case 'income':
        return this.income();
      case 'crew':
        return this.crew();
    }
  }

  show(tab: Tab): void {
    this.#settings.setRailTab(tab);
  }

  pick(event: MouseEvent, key: string): void {
    if (event.detail === 0) this.#buy(this.tab(), key);
  }

  press(event: PointerEvent, key: string): void {
    if (event.button !== 0) return;
    this.release();
    const tab = this.tab();
    if (!this.#buy(tab, key)) return;
    let bought = 1;
    const again = (): void => {
      if (!this.#buy(tab, key)) return this.release();
      bought += 1;
      this.#holdTimer = setTimeout(again, holdGapMs(bought));
    };
    this.#holdTimer = setTimeout(again, HOLD_REPEAT.delayMs);
  }

  release(): void {
    clearTimeout(this.#holdTimer);
    this.#holdTimer = undefined;
  }

  #buy(tab: Tab, key: string): boolean {
    const bought = this.#purchase(tab, key);
    if (bought) {
      this.flash.update((last) => ({
        key,
        beat: last?.key === key ? last.beat + 1 : 0,
      }));
    }
    return bought;
  }

  #purchase(tab: Tab, key: string): boolean {
    switch (tab) {
      case 'supply':
        return key === SP_UNLOCK
          ? this.#store.buyLine(SP_UNLOCK)
          : this.#store.buySpawner(Number(key));
      case 'income':
        return this.#store.buyIncome(key as TicketTypeId);
      case 'crew':
        return this.#store.buyLine(key as PurchaseId);
    }
  }

  #linePrice(
    state: Consultancy,
    line: PurchaseId,
    price: number
  ): number | null {
    return economy.lineUnlocked(state, line) &&
      state.levels[line] < economy.lineCap(state, line)
      ? price
      : null;
  }

  #rateBlurb(id: TicketTypeId): string {
    return this.#say('rail.income.effect', {
      pct: formatCompactMoney(economy.incomeStep(id)),
      ticket: this.#say(ticketLabelKey(id)),
    });
  }

  #kitBlurb(state: Consultancy): string {
    const item = economy.kitNext(state);
    if (item === null) return this.#say('purchase.kit.done');
    return this.#say('purchase.kit.next', {
      item: this.#say(kitLabelKey(item.id)),
      effect: this.#kitEffect(item.effect),
    });
  }

  #kitEffect(effect: KitEffect): string {
    switch (effect.kind) {
      case 'ticketValue':
        return this.#say('skill.effect.ticketValue', {
          pct: percent(effect.mult),
          ticket: this.#say(ticketLabelKey(effect.target)),
        });
      case 'global':
        return this.#say('skill.effect.global', { pct: percent(effect.mult) });
      case 'escalationHold':
        return this.#say('skill.effect.escalationHold', {
          seconds: effect.seconds,
        });
    }
  }

  #walkerOf(adr: number): Row['icon'] | undefined {
    return this.#icon('crew', this.#icons.icons().spawners.get(adr));
  }

  #cardOf(id: TicketTypeId | undefined): Row['icon'] | undefined {
    return id === undefined
      ? undefined
      : this.#icon('card', this.#icons.icons().tickets.get(id));
  }

  #icon(
    kind: NonNullable<Row['icon']>['kind'],
    url: string | undefined
  ): Row['icon'] | undefined {
    return url === undefined ? undefined : { url, kind };
  }

  #catalogue(): void {
    this.#text.currentLang();
    this.#text.isLoading();
  }

  #say(key: string, params?: Record<string, string | number>): string {
    return this.#text.instant(key, params);
  }
}

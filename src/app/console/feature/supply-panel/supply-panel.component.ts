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
import { formatCompactMoney } from '../../../@shared/util/format-quantity';
import { GameStore } from '../../../game/data/game.store';
import type { PurchaseId } from '../../../game/model/balance/progression';
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
  SPAWNERS,
  spawnerBlurbKey,
  spawnerLabelKey,
} from '../../../game/model/spawner.model';
import { PanelComponent } from '../../ui/panel/panel.component';

const TABS = ['supply', 'income', 'crew'] as const;

type Tab = (typeof TABS)[number];

const MAXED = 'MAX';

/** Holding a row keeps buying: a pause, then a repeat that speeds up. */
const HOLD = { delayMs: 350, everyMs: 90, fastMs: 40, fastAfter: 10 } as const;

const SP_UNLOCK: PurchaseId = 'velocity';

/** Locked rows shown ahead as silhouettes; the rest are a count. */
const TEASED = 2;

interface Row {
  readonly key: string;
  readonly name: string;
  readonly blurb: string;
  readonly locked: boolean;
  /** Not buyable yet: drawn as a silhouette of what is coming. */
  readonly teaser?: boolean;
  readonly held: number;
  readonly cap: number;
  readonly cost: string;
  readonly maxed: boolean;
  readonly affordable: boolean;
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

const percent = (mult: number): string => `+${Math.round((mult - 1) * 100)}%`;

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

  readonly tab = signal<Tab>('supply');
  /** The last row bought, and a count so repeat buys restart the flash. */
  readonly flash = signal<{ key: string; beat: number } | null>(null);

  #holdTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.release());
  }

  // Resolved per render: the catalogue is lazily imported, so a field
  // initialiser would read the keys back raw.
  readonly tabs = computed<
    readonly { id: Tab; label: string; buyable: boolean }[]
  >(() => {
    this.#store.state();
    const rows: Record<Tab, readonly Row[]> = {
      supply: this.supply(),
      income: this.income(),
      crew: this.crew(),
    };
    return TABS.map((id) => ({
      id,
      label: this.#say(`rail.tab.${id}`),
      buyable: rows[id].some((row) => row.affordable),
    }));
  });

  readonly supply = computed<readonly Row[]>(() => {
    this.#store.state();
    return [
      ...this.#unlockRow(),
      ...this.#spawnerRows(),
      ...this.#spawnerTeasers(),
    ];
  });

  #spawnerTeasers(): readonly Row[] {
    return SPAWNERS.filter((row) => !this.#store.spawnerUnlocked(row.adr))
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
        affordable: false,
        icon: this.#cardOf(row.produces[0]),
      }));
  }

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
          icon: this.#cardOf(row.produces[0]),
        };
      }
    );
  }

  readonly locked = computed(() => {
    this.#store.state();
    const locked = SPAWNERS.filter(
      (row) => !this.#store.spawnerUnlocked(row.adr)
    ).length;
    return Math.max(0, locked - TEASED);
  });

  /** Rates: bill more for one kind of work, once its source is on the path. */
  readonly income = computed<readonly Row[]>(() => {
    this.#store.state();
    const teasers = SPAWNED_TICKET_IDS.filter(
      (id) => !this.#store.incomeUnlocked(id)
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
        affordable: false,
        icon: this.#cardOf(id),
      }));
    return [...this.#rateRows(), ...teasers];
  });

  #rateRows(): readonly Row[] {
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
        icon: this.#cardOf(id),
      };
    });
  }

  readonly rateLocked = computed(() => {
    this.#store.state();
    const locked = SPAWNED_TICKET_IDS.filter(
      (id) => !this.#store.incomeUnlocked(id)
    ).length;
    return Math.max(0, locked - TEASED);
  });

  readonly crew = computed<readonly Row[]>(() => {
    this.#store.state();
    // Locked lines stay on show — an empty tab reads as broken, not as
    // "these open on the tree".
    return CREW_ROWS.map((line) => {
      const locked = !this.#store.lineUnlocked(line);
      const held = this.#store.levels()[line];
      const cap = this.#store.lineCap(line);
      const maxed = held >= cap;
      return {
        key: line,
        name: this.#say(`purchase.${line}.label`),
        blurb:
          line === 'kit'
            ? this.#kitBlurb()
            : this.#say(`purchase.${line}.effect`, LINE_EFFECT_PARAMS[line]),
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
        icon:
          this.#icon('art', LINE_ART[line]) ??
          this.#icon(
            'crew',
            this.#icons.icons().crew.get(LINE_CREW[line] ?? '')
          ),
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

  /** Keyboard activation only; a pointer buys through `press`. */
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
      this.#holdTimer = setTimeout(
        again,
        bought > HOLD.fastAfter ? HOLD.fastMs : HOLD.everyMs
      );
    };
    this.#holdTimer = setTimeout(again, HOLD.delayMs);
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

  #rateBlurb(id: TicketTypeId): string {
    return this.#say('rail.income.effect', {
      pct: formatCompactMoney(this.#store.incomeStep(id)),
      ticket: this.#say(ticketLabelKey(id)),
    });
  }

  #kitBlurb(): string {
    const item = this.#store.kitNext();
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

  #say(key: string, params?: Record<string, string | number>): string {
    return this.#text.instant(key, params);
  }
}

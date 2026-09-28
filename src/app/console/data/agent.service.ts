import { computed, effect, inject, Injectable, untracked } from '@angular/core';

import { SettingsService } from '../../@shared/data/settings.service';
import { GameStore } from '../../game/data/game.store';
import type { Consultancy } from '../../game/model/consultancy.model';
import type { Advice, Buy, Pick } from '../../game/util/advisor';
import { advise } from '../../game/util/advisor';
import { DEFAULT_POLICY } from '../../game/util/autoplay';
import { sameRecord } from '../util/same-record';
import { DoorService } from './door.service';

const REFRESH_MS = 2_000;

function samePurchases(a: Consultancy, b: Consultancy): boolean {
  return (
    a.tier === b.tier &&
    a.endedAt === b.endedAt &&
    Math.floor(a.runMs / REFRESH_MS) === Math.floor(b.runMs / REFRESH_MS) &&
    sameRecord(a.levels, b.levels) &&
    sameRecord(a.skills, b.skills) &&
    sameRecord(a.spawners, b.spawners) &&
    sameRecord(a.income, b.income)
  );
}

export function affordable(state: Consultancy, pick: Pick): boolean {
  const held = pick.currency === 'eur' ? state.budget : state.storyPoints;
  return held >= pick.cost;
}

@Injectable({ providedIn: 'root' })
export class AgentService {
  #store = inject(GameStore);
  #settings = inject(SettingsService);
  #door = inject(DoorService);

  readonly #priced = computed(() => this.#store.state(), {
    equal: samePurchases,
  });

  readonly advice = computed<Advice>(() =>
    advise(this.#priced(), DEFAULT_POLICY)
  );

  readonly auto = computed(
    () =>
      this.#settings.showAgent() &&
      this.#settings.agentWarned() &&
      this.#settings.agentAuto()
  );

  constructor() {
    effect(() => {
      if (!this.auto() || !this.#door.opened()) return;
      const state = this.#store.state();
      const { sp, eur } = this.advice();
      untracked(() => {
        for (const pick of [sp, eur]) {
          if (pick && affordable(state, pick)) this.buy(pick.buy);
        }
      });
    });
  }

  buy(buy: Buy): boolean {
    switch (buy.kind) {
      case 'credit':
        return this.#store.approveOnCredit(buy.id);
      case 'skill':
        return this.#store.buySkill(buy.id);
      case 'line':
        return this.#store.buyLine(buy.line);
      case 'spawner':
        return this.#store.buySpawner(buy.adr);
      case 'income':
        return this.#store.buyIncome(buy.id);
    }
  }
}

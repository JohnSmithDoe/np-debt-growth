import { computed, inject, Injectable } from '@angular/core';

import { GameStore } from '../../game/data/game.store';
import type { Consultancy } from '../../game/model/consultancy.model';
import type { Advice, Buy } from '../../game/util/advisor';
import { advise } from '../../game/util/advisor';
import { DEFAULT_POLICY } from '../../game/util/autoplay';

const REFRESH_MS = 2_000;

function sameRecord(
  a: Readonly<Record<string, number>>,
  b: Readonly<Record<string, number>>
): boolean {
  if (a === b) return true;
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length && keys.every((k) => a[k] === b[k])
  );
}

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

@Injectable({ providedIn: 'root' })
export class AgentService {
  #store = inject(GameStore);

  readonly #priced = computed(() => this.#store.state(), {
    equal: samePurchases,
  });

  readonly advice = computed<Advice>(() =>
    advise(this.#priced(), DEFAULT_POLICY)
  );

  buy(buy: Buy): boolean {
    switch (buy.kind) {
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

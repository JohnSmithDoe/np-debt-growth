import { effect, inject, Injectable, signal } from '@angular/core';

import { GameStore } from '../../game/data/game.store';

const RATE_WINDOW_MS = 10_000;

@Injectable({ providedIn: 'root' })
export class BillingRateService {
  readonly #samples: { at: number; billed: number }[] = [];
  readonly #perSec = signal(0);
  readonly perSec = this.#perSec.asReadonly();

  constructor() {
    const store = inject(GameStore);
    effect(() => this.#sample(store.state()));
  }

  #sample({
    runMs,
    lifetimeBilled,
  }: {
    runMs: number;
    lifetimeBilled: number;
  }): void {
    const samples = this.#samples;
    const newest = samples.at(-1);
    if (newest && runMs < newest.at) samples.length = 0;
    if (newest?.at === runMs) return;
    samples.push({ at: runMs, billed: lifetimeBilled });
    while (samples.length > 2 && runMs - samples[1]!.at >= RATE_WINDOW_MS) {
      samples.shift();
    }
    const oldest = samples[0]!;
    const span = runMs - oldest.at;
    this.#perSec.set(
      span > 0 ? ((lifetimeBilled - oldest.billed) * 1000) / span : 0
    );
  }
}

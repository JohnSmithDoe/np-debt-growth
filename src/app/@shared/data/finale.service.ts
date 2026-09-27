import { Injectable, signal } from '@angular/core';

import type { FinaleAct } from '../model/finale.model';

@Injectable({ providedIn: 'root' })
export class FinaleService {
  readonly #act = signal<FinaleAct>('closed');

  readonly act = this.#act.asReadonly();

  open(): void {
    this.#act.set('roll');
  }

  curtain(): void {
    if (this.#act() === 'roll') this.#act.set('curtain');
  }

  close(): void {
    this.#act.set('closed');
  }
}

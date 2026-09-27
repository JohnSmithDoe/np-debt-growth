import { Injectable, signal } from '@angular/core';

import type { StageMode } from '../model/stage-mode.model';

@Injectable({ providedIn: 'root' })
export class StageModeService {
  #mode = signal<StageMode>('board');

  readonly mode = this.#mode.asReadonly();

  request(mode: StageMode): void {
    this.#mode.set(mode);
  }

  toBoard(): void {
    this.request('board');
  }
}

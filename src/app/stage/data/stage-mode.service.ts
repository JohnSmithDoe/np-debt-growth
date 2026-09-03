import { Injectable, signal } from '@angular/core';

import type { StageMode } from '../model/stage-mode.model';

@Injectable({ providedIn: 'root' })
export class StageModeService {
  #mode = signal<StageMode>('board');
  #focus: string | null = null;

  readonly mode = this.#mode.asReadonly();

  request(mode: StageMode, focus: string | null = null): void {
    this.#focus = focus;
    this.#mode.set(mode);
  }

  takeFocus(): string | null {
    const focus = this.#focus;
    this.#focus = null;
    return focus;
  }

  toBoard(): void {
    this.request('board');
  }
}

import { Injectable, signal } from '@angular/core';

import type { TreeFocus } from '../model/tree-focus.model';

@Injectable({ providedIn: 'root' })
export class TreeFocusService {
  readonly #request = signal<TreeFocus | null>(null);

  readonly request = this.#request.asReadonly();

  focus(id: string): void {
    this.#request.update((last) => ({ id, seq: (last?.seq ?? 0) + 1 }));
  }
}

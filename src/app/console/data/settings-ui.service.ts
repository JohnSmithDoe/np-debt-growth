import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SettingsUiService {
  readonly #open = signal(false);

  readonly isOpen = this.#open.asReadonly();

  open(): void {
    this.#open.set(true);
  }

  close(): void {
    this.#open.set(false);
  }
}

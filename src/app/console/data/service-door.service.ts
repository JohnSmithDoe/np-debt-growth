import { DestroyRef, inject, Injectable, signal } from '@angular/core';

const SEQUENCE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
] as const;

@Injectable({ providedIn: 'root' })
export class ServiceDoorService {
  readonly #open = signal(false);
  #recent: string[] = [];

  readonly isOpen = this.#open.asReadonly();

  constructor() {
    document.addEventListener('keydown', this.#onKey);
    inject(DestroyRef).onDestroy(() =>
      document.removeEventListener('keydown', this.#onKey)
    );
  }

  #onKey = (event: KeyboardEvent): void => {
    if (this.#open()) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    this.#recent = [...this.#recent, key].slice(-SEQUENCE.length);
    if (
      this.#recent.length === SEQUENCE.length &&
      this.#recent.every((typed, at) => typed === SEQUENCE[at])
    ) {
      this.#open.set(true);
    }
  };
}

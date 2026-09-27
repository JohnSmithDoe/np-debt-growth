import { Injectable, signal } from '@angular/core';

export interface BoardIconSet {
  /** Ticket type id → its plain card. */
  readonly tickets: ReadonlyMap<string, string>;
  /** Crew kind → the first face of that line. */
  readonly crew: ReadonlyMap<string, string>;
  /** ADR → the first walker of that debt line. */
  readonly spawners: ReadonlyMap<number, string>;
}

/** The board's own card and crew frames as data URLs, for the DOM around it. */
@Injectable({ providedIn: 'root' })
export class BoardIcons {
  readonly #icons = signal<BoardIconSet>({
    tickets: new Map(),
    crew: new Map(),
    spawners: new Map(),
  });
  readonly icons = this.#icons.asReadonly();

  publish(icons: BoardIconSet): void {
    this.#icons.set(icons);
  }
}

import { Injectable, signal } from '@angular/core';

export interface BoardIconSet {
  readonly tickets: ReadonlyMap<string, string>;
  readonly marks: ReadonlyMap<string, string>;
  readonly crew: ReadonlyMap<string, string>;
  readonly spawners: ReadonlyMap<number, string>;
}

@Injectable({ providedIn: 'root' })
export class BoardIcons {
  readonly #icons = signal<BoardIconSet>({
    tickets: new Map(),
    marks: new Map(),
    crew: new Map(),
    spawners: new Map(),
  });
  readonly icons = this.#icons.asReadonly();

  publish(icons: BoardIconSet): void {
    this.#icons.set(icons);
  }
}

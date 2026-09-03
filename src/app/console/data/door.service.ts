import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DoorService {
  readonly opened = signal(false);

  open(): void {
    this.opened.set(true);
  }
}

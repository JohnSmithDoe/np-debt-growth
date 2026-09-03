import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FullscreenService {
  #on = signal(isFullscreen());

  readonly available = document.fullscreenEnabled;
  readonly on = this.#on.asReadonly();

  constructor() {
    document.addEventListener('fullscreenchange', () =>
      this.#on.set(isFullscreen())
    );
  }

  toggle(): void {
    const asked = isFullscreen()
      ? document.exitFullscreen()
      : document.documentElement.requestFullscreen();
    void asked.catch(() => undefined);
  }
}

function isFullscreen(): boolean {
  return document.fullscreenElement !== null;
}

import {
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
} from '@angular/core';

const EASE = 0.14;
const GAIN_CLASS = 'gain';

@Directive({ selector: '[cbRolling]' })
export class RollingNumberDirective {
  readonly cbRolling = input.required<number>();
  readonly rollingFormat = input.required<(value: number) => string>();

  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  #shown = Number.NaN;
  #target = 0;
  #frame = 0;
  #last = 0;

  constructor() {
    effect(() => this.#aim(this.cbRolling()));
    this.#host.addEventListener('animationend', this.#settle);
    inject(DestroyRef).onDestroy(() => {
      cancelAnimationFrame(this.#frame);
      this.#host.removeEventListener('animationend', this.#settle);
    });
  }

  #aim(target: number): void {
    if (Number.isNaN(this.#shown)) {
      this.#shown = target;
      this.#target = target;
      return this.#paint();
    }
    if (target > this.#target) this.#host.classList.add(GAIN_CLASS);
    this.#target = target;
    if (this.#frame === 0) {
      this.#last = performance.now();
      this.#frame = requestAnimationFrame(this.#step);
    }
  }

  #step = (now: number): void => {
    const frames = Math.min(4, (now - this.#last) / (1000 / 60));
    this.#last = now;
    const gap = this.#target - this.#shown;
    const closed = 1 - (1 - EASE) ** frames;
    this.#shown =
      Math.abs(gap) <= Math.abs(this.#target) * 1e-4 || Math.abs(gap) < 0.5
        ? this.#target
        : this.#shown + gap * closed;
    this.#paint();
    this.#frame =
      this.#shown === this.#target ? 0 : requestAnimationFrame(this.#step);
  };

  #paint(): void {
    this.#host.textContent = this.rollingFormat()(this.#shown);
  }

  #settle = (event: AnimationEvent): void => {
    if (event.target === this.#host) this.#host.classList.remove(GAIN_CLASS);
  };
}

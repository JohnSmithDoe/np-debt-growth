import { Directive, ElementRef, inject, output } from '@angular/core';

@Directive({
  selector: '[cbBackdrop]',
  host: {
    '(pointerdown)': 'arm($event)',
    '(click)': 'leave($event)',
  },
})
export class BackdropDirective {
  readonly cbBackdrop = output<void>();

  #el = inject<ElementRef<HTMLElement>>(ElementRef);
  #armed = false;

  arm(event: Event): void {
    this.#armed = event.target === this.#el.nativeElement;
  }

  leave(event: Event): void {
    const onBackdrop = event.target === this.#el.nativeElement;
    const pressed = (event as MouseEvent).detail > 0;
    if (this.#armed && onBackdrop && pressed) this.cbBackdrop.emit();
    this.#armed = false;
  }
}

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  viewChild,
} from '@angular/core';

import { StageService } from '../../data/stage.service';

@Component({
  selector: 'cb-demo',
  template: '<div #stage class="stage"></div>',
  styles: `
    :host {
      display: block;
      position: fixed;
      inset: 0;
      z-index: 500;
      background: #0f1216;
    }
    .stage {
      width: 100%;
      height: 100%;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DemoComponent implements AfterViewInit, OnDestroy {
  readonly container = viewChild.required<ElementRef<HTMLElement>>('stage');

  #stage = inject(StageService);
  #resizeObserver?: ResizeObserver;
  #booted = false;
  #frame = 0;
  #width = 0;
  #height = 0;

  ngAfterViewInit(): void {
    const container = this.container().nativeElement;
    this.#resizeObserver = new ResizeObserver(() => this.#schedule(container));
    this.#resizeObserver.observe(container);
    this.#sync(container);
  }

  ngOnDestroy(): void {
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = undefined;
    cancelAnimationFrame(this.#frame);
    this.#stage.destroyStage();
  }

  #schedule(container: HTMLElement): void {
    cancelAnimationFrame(this.#frame);
    this.#frame = requestAnimationFrame(() => this.#sync(container));
  }

  #sync(container: HTMLElement): void {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width <= 0 || height <= 0) return;
    if (width === this.#width && height === this.#height) return;
    this.#width = width;
    this.#height = height;
    if (!this.#booted) {
      this.#booted = true;
      this.#stage.initDemo(container);
      return;
    }
    this.#stage.resizeStage(width, height);
  }
}

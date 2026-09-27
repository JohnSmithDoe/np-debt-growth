import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  OnDestroy,
  viewChild,
} from '@angular/core';

import { FinaleService } from '../../../@shared/data/finale.service';
import { StageService } from '../../data/stage.service';
import { whenPixelFontReady } from '../../util/pixel-font';

@Component({
  selector: 'cb-stage',
  templateUrl: './stage.component.html',
  styleUrl: './stage.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.finale]': 'finale()' },
})
export class StageComponent implements AfterViewInit, OnDestroy {
  readonly container = viewChild.required<ElementRef<HTMLElement>>('stage');

  #stage = inject(StageService);
  #finale = inject(FinaleService);

  readonly finale = computed(() => this.#finale.act() !== 'closed');

  #resizeObserver?: ResizeObserver;
  #booted = false;
  #destroyed = false;
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
    this.#destroyed = true;
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
      void whenPixelFontReady().then(() => {
        if (!this.#destroyed) this.#stage.initStage(container);
      });
      return;
    }
    this.#stage.resizeStage(width, height);
  }
}

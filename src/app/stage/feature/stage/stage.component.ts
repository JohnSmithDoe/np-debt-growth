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

import { StageModeService } from '../../data/stage-mode.service';
import { StageService } from '../../data/stage.service';
import type { StageMode } from '../../model/stage-mode.model';
import { whenPixelFontReady } from '../../util/pixel-font';

const HEADINGS: Record<
  StageMode,
  { title: string; blurb: string; chip: string }
> = {
  board: {
    title: 'Sprint Board',
    blurb:
      'Click a work item to triage it. The sprint bills itself when the round ends. Rare tickets are yours alone — juniors will not touch them.',
    chip: 'Active sprint',
  },
  skills: {
    title: 'Engineering Excellence Programme',
    blurb:
      'Drag to pan, wheel to zoom, hover a square to read it. A square is a skill, its pips are how far in you are, and a black box says only that something is there.',
    chip: 'Story Points',
  },
};

@Component({
  selector: 'cb-stage',
  templateUrl: './stage.component.html',
  styleUrl: './stage.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StageComponent implements AfterViewInit, OnDestroy {
  readonly container = viewChild.required<ElementRef<HTMLElement>>('stage');

  #stage = inject(StageService);
  #modes = inject(StageModeService);

  readonly heading = computed(() => HEADINGS[this.#modes.mode()]);

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
      void whenPixelFontReady().then(() => this.#stage.initStage(container));
      return;
    }
    this.#stage.resizeStage(width, height);
  }
}

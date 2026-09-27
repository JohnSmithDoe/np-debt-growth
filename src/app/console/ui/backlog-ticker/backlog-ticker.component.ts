import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import type { SprintSlot } from '../../../game/model/board.model';
import {
  nextBacklogItem,
  nextClosedItem,
  TickerItem,
} from '../../util/backlog-ticker';

const PX_PER_SEC = 48;
const MAX_STEP_MS = 100;

interface Line extends TickerItem {
  readonly id: number;
  readonly gap: number;
}

@Component({
  selector: 'cb-backlog-ticker',
  imports: [TranslatePipe],
  templateUrl: './backlog-ticker.component.html',
  styleUrl: './backlog-ticker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    '(mouseenter)': 'held = true',
    '(mouseleave)': 'held = false',
  },
})
export class BacklogTickerComponent {
  /** Omitted: the whole backlog, as on the title screen. */
  readonly closes = input<readonly SprintSlot[]>();

  readonly lines = signal<readonly Line[]>([]);
  held = false;

  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  protected readonly track =
    viewChild.required<ElementRef<HTMLElement>>('track');
  readonly #still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  #nextId = 0;
  #offset = 0;
  #seen = 0;
  #frame = 0;
  #last = 0;

  constructor() {
    afterNextRender(() => {
      this.#last = performance.now();
      this.#frame = requestAnimationFrame(this.#step);
    });
    inject(DestroyRef).onDestroy(() => cancelAnimationFrame(this.#frame));
  }

  #step = (now: number): void => {
    const track = this.track().nativeElement;
    const lines = this.lines();
    const dt = Math.min(MAX_STEP_MS, now - this.#last);
    this.#last = now;
    if (track.children.length === lines.length) {
      if (lines.length === 0) this.#offset = 0;
      else if (!this.held && !this.#still)
        this.#offset += (PX_PER_SEC * dt) / 1000;
      const first = track.firstElementChild as HTMLElement | null;
      const room = this.#host.clientWidth - (track.scrollWidth - this.#offset);
      if (first && this.#offset >= first.offsetWidth) {
        this.#offset -= first.offsetWidth;
        this.lines.set(lines.slice(1));
      } else if (room > 0) {
        this.#append(lines, room);
      }
      track.style.transform = `translateX(${-this.#offset}px)`;
    }
    this.#frame = requestAnimationFrame(this.#step);
  };

  #append(lines: readonly Line[], room: number): void {
    const onTrack = new Set(lines.map((line) => line.titleKey));
    const closes = this.closes();
    if (!closes) return this.#push(lines, nextBacklogItem(onTrack), 0);
    if (closes.length < this.#seen) this.#seen = 0;
    const item = nextClosedItem(closes.slice(this.#seen), onTrack);
    if (item) this.#seen = closes.length;
    this.#push(lines, item, this.#still ? 0 : room);
  }

  #push(lines: readonly Line[], item: TickerItem | null, gap: number): void {
    if (item) this.lines.set([...lines, { ...item, id: this.#nextId++, gap }]);
  }
}

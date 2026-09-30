import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';

import { FinaleService } from '../../../@shared/data/finale.service';
import { STORY_FRAME_MS } from '../../../@shared/model/finale.model';
import {
  formatMoney,
  formatWhole,
} from '../../../@shared/util/format-quantity';
import { GameStore } from '../../../game/data/game.store';
import { MAX_TIER, tierNameKey } from '../../../game/model/tier.model';
import { CLIENT_NAME } from '../../model/client.model';
import { officeFilmstrip } from '../../util/office-art';

interface StoryFrame {
  readonly index: number;
  readonly art: string;
  readonly caption: string;
  readonly line: string;
}

const storyKey = (index: number): string =>
  index > MAX_TIER ? 'story.outside' : `story.${index}`;

@Component({
  selector: 'cb-story',
  templateUrl: './story.component.html',
  styleUrl: './story.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  host: { '(document:keydown)': 'onKey($event)' },
})
export class StoryComponent {
  #finale = inject(FinaleService);
  #store = inject(GameStore);
  #translate = inject(TranslateService);

  readonly shown = computed(() => this.#finale.act() === 'story');
  readonly at = signal(0);
  readonly frameMs = STORY_FRAME_MS;

  readonly frames = computed<readonly StoryFrame[]>(() => {
    const params = {
      client: CLIENT_NAME,
      closed: formatWhole(this.#store.lifetimeClosed()),
      billed: formatMoney(this.#store.lifetimeBilled()),
    };
    return officeFilmstrip(
      this.#store.tier(),
      this.#store.ended(),
      (index) => this.#translate.instant(tierNameKey(index)),
      this.#translate.instant('postmortem.outside')
    )
      .filter((frame) => !frame.missed)
      .map((frame) => ({
        index: frame.index,
        art: frame.art,
        caption: frame.caption,
        line: this.#translate.instant(storyKey(frame.index), params),
      }));
  });

  readonly frame = computed(() => this.frames()[this.at()] ?? null);

  constructor() {
    let timer: ReturnType<typeof setTimeout> | undefined;
    inject(DestroyRef).onDestroy(() => clearTimeout(timer));
    effect(() => {
      clearTimeout(timer);
      if (!this.shown()) {
        this.at.set(0);
        return;
      }
      this.at();
      timer = setTimeout(() => this.next(), STORY_FRAME_MS);
    });
  }

  next(): void {
    if (this.at() + 1 < this.frames().length) this.at.update((at) => at + 1);
    else this.#finale.roll();
  }

  skip(): void {
    this.#finale.roll();
  }

  onKey(event: KeyboardEvent): void {
    if (!this.shown()) return;
    if (event.key === 'Escape') this.skip();
    else if (event.key === 'ArrowRight') this.next();
  }
}

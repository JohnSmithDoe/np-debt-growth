import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { GameStore } from '../../../game/data/game.store';
import type { FeedRow } from '../../util/feed-row';
import { feedRow } from '../../util/feed-row';
import { PanelComponent } from '../../ui/panel/panel.component';

@Component({
  selector: 'cb-activity-feed',
  templateUrl: './activity-feed.component.html',
  styleUrl: './activity-feed.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PanelComponent, TranslatePipe],
})
export class ActivityFeedComponent {
  #store = inject(GameStore);
  #translate = inject(TranslateService);

  readonly newsOnly = signal(false);

  readonly rows = computed<FeedRow[]>(() => {
    const escalation = this.#store.escalationMultiplier();
    const say = (key: string, params?: Record<string, string | number>) =>
      this.#translate.instant(key, params);
    const rows = this.#store
      .log()
      .map((line) => feedRow(line, escalation, say));
    return this.newsOnly() ? rows.filter((row) => row.kind !== 'close') : rows;
  });

  toggleNewsOnly(): void {
    this.newsOnly.update((only) => !only);
  }

  readonly inherited = this.#store.log()[0]?.seq ?? 0;

  readonly closed = this.#store.lifetimeClosed;

  readonly empty = computed(() => {
    if (this.newsOnly()) return 'feed.empty.news';
    return this.closed() > 0 ? 'feed.empty.since' : 'feed.empty.none';
  });
}

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

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

  readonly newsOnly = signal(false);

  readonly rows = computed<FeedRow[]>(() => {
    const escalation = this.#store.escalationMultiplier();
    const rows = this.#store.log().map((line) => feedRow(line, escalation));
    return this.newsOnly() ? rows.filter((row) => row.kind !== 'close') : rows;
  });

  toggleNewsOnly(): void {
    this.newsOnly.update((only) => !only);
  }

  readonly inherited = this.#store.log()[0]?.seq ?? 0;

  readonly closed = this.#store.lifetimeClosed;

  readonly empty = computed(() => {
    if (this.newsOnly()) return 'No news yet — closes are hidden.';
    return this.closed() > 0
      ? 'Nothing triaged since you came back — the log is not kept between sessions.'
      : 'Nothing triaged yet.';
  });
}

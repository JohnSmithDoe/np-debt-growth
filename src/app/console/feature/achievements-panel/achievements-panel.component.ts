import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';

import { TranslatePipe } from '@ngx-translate/core';

import { GameStore } from '../../../game/data/game.store';
import {
  ACHIEVEMENTS,
  awardBlurbKey,
  awardLabelKey,
} from '../../../game/model/award.model';
import { PanelComponent } from '../../ui/panel/panel.component';
import { TrophyComponent } from '../../ui/trophy/trophy.component';

interface AchievementRow {
  readonly id: string;
  readonly labelKey: string;
  readonly blurbKey: string;
  readonly unlocked: boolean;
}

@Component({
  selector: 'cb-achievements-panel',
  templateUrl: './achievements-panel.component.html',
  styleUrl: './achievements-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PanelComponent, TranslatePipe, TrophyComponent],
})
export class AchievementsPanelComponent {
  #store = inject(GameStore);

  readonly total = ACHIEVEMENTS.length;

  readonly #rows = computed<AchievementRow[]>(() => {
    const owned = new Set(this.#store.achievements());
    return ACHIEVEMENTS.map((award) => ({
      id: award.id,
      labelKey: awardLabelKey(award.id),
      blurbKey: awardBlurbKey(award.id),
      unlocked: owned.has(award.id),
    }));
  });

  readonly pending = computed(() =>
    this.#rows().filter((row) => !row.unlocked)
  );

  readonly confirmed = computed(() =>
    this.#rows().filter((row) => row.unlocked)
  );
}

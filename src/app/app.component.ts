import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';

import {
  formatCompactMoney,
  formatMoney,
  formatPoints,
  formatPointsExact,
} from './@shared/util/format-quantity';
import { BacklogTickerComponent } from './console/ui/backlog-ticker/backlog-ticker.component';
import { AgentComponent } from './console/feature/agent/agent.component';
import { AdrModalComponent } from './console/feature/adr-modal/adr-modal.component';
import { AwardBannerComponent } from './console/feature/award-banner/award-banner.component';
import { MomentModalComponent } from './console/feature/moment-modal/moment-modal.component';
import { DebugBarComponent } from './console/feature/debug-bar/debug-bar.component';
import { AchievementsPanelComponent } from './console/feature/achievements-panel/achievements-panel.component';
import { SupplyPanelComponent } from './console/feature/supply-panel/supply-panel.component';
import { PostMortemComponent } from './console/feature/post-mortem/post-mortem.component';
import { SettingsModalComponent } from './console/feature/settings-modal/settings-modal.component';
import { TitleScreenComponent } from './console/feature/title-screen/title-screen.component';
import { SettingsUiService } from './console/data/settings-ui.service';
import { CLIENT_NAME, ENGAGEMENT_NAME } from './console/model/client.model';
import { AudioService } from './audio/data/audio.service';
import { StageModeService } from './stage/data/stage-mode.service';
import { GameStore } from './game/data/game.store';

function formatCountdown(remainingMs: number): string {
  return `${Math.ceil(remainingMs / 1000)}s`;
}

@Component({
  selector: 'cb-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BacklogTickerComponent,
    RouterOutlet,
    AchievementsPanelComponent,
    SupplyPanelComponent,
    DebugBarComponent,
    AdrModalComponent,
    AgentComponent,
    AwardBannerComponent,
    MomentModalComponent,
    TitleScreenComponent,
    PostMortemComponent,
    SettingsModalComponent,
  ],
})
export class AppComponent {
  #store = inject(GameStore);
  #audio = inject(AudioService);
  #stage = inject(StageModeService);
  #settings = inject(SettingsUiService);

  readonly client = CLIENT_NAME;
  readonly engagement = ENGAGEMENT_NAME;

  readonly onTree = computed(() => this.#stage.mode() === 'skills');
  /** The tree opens with the SP unlock, as the reference's gum row does. */
  readonly treeOpen = computed(() => this.#store.levels().velocity > 0);

  toTree(): void {
    this.#stage.request('skills');
  }

  toReview(): void {
    this.#stage.toBoard();
  }

  readonly budget = this.#store.budget;
  readonly storyPoints = this.#store.storyPoints;
  readonly sprintCount = this.#store.sprintCount;
  readonly sprintSlots = this.#store.sprintSlots;
  readonly sprintValue = this.#store.sprintValue;

  readonly money = formatCompactMoney;
  readonly points = formatPoints;

  readonly exactMoney = computed(() => formatMoney(this.budget()));
  readonly exactPoints = computed(
    () => `${formatPointsExact(this.storyPoints())} Story Points`
  );

  readonly sprintFill = computed(() => {
    const slots = this.sprintSlots();
    return slots <= 0 ? 0 : Math.min(100, (this.sprintCount() / slots) * 100);
  });
  readonly sprintFull = computed(
    () => this.sprintCount() >= this.sprintSlots()
  );
  readonly sprintOver = computed(() =>
    Math.max(0, this.sprintCount() - this.sprintSlots())
  );

  readonly roundSeq = this.#store.roundSeq;
  readonly running = this.#store.running;
  readonly canFull = this.#store.canFull;
  readonly roundLabel = computed(() =>
    this.running()
      ? 'open'
      : `release ${formatCountdown(this.#store.roundLeftMs())}`
  );

  readonly awardPaid = signal(false);
  #awarded = 0;

  readonly ended = this.#store.ended;

  readonly muted = this.#audio.muted;

  toggleMuted(): void {
    this.#audio.setMuted(!this.#audio.muted());
  }

  openSettings(): void {
    this.#settings.open();
  }

  constructor() {
    effect(() => {
      const awarded = this.#store.awardCount();
      if (awarded > this.#awarded) this.awardPaid.set(true);
      this.#awarded = awarded;
    });
  }
}

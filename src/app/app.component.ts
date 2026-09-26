import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
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
  formatQuantity,
} from './@shared/util/format-quantity';
import { AdrModalComponent } from './console/feature/adr-modal/adr-modal.component';
import { AwardBannerComponent } from './console/feature/award-banner/award-banner.component';
import { MomentModalComponent } from './console/feature/moment-modal/moment-modal.component';
import { DebugBarComponent } from './console/feature/debug-bar/debug-bar.component';
import { NextStepsComponent } from './console/feature/next-steps/next-steps.component';
import { AchievementsPanelComponent } from './console/feature/achievements-panel/achievements-panel.component';
import { SupplyPanelComponent } from './console/feature/supply-panel/supply-panel.component';
import { PostMortemComponent } from './console/feature/post-mortem/post-mortem.component';
import { SettingsModalComponent } from './console/feature/settings-modal/settings-modal.component';
import { TitleScreenComponent } from './console/feature/title-screen/title-screen.component';
import { SettingsUiService } from './console/data/settings-ui.service';
import type { NextStep, NoticeTarget } from './console/model/step.model';
import { CLIENT_NAME, ENGAGEMENT_NAME } from './console/model/client.model';
import { AudioService } from './audio/data/audio.service';
import { StageModeService } from './stage/data/stage-mode.service';
import type { StageMode } from './stage/model/stage-mode.model';
import { GameStore } from './game/data/game.store';
import { TICK_MS } from './game/model/game.consts';

function formatCountdown(remainingMs: number): string {
  return `${Math.ceil(remainingMs / 1000)}s`;
}

const STEP_MODE: Partial<Record<NoticeTarget, StageMode>> = {
  skills: 'skills',
};

@Component({
  selector: 'cb-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    AchievementsPanelComponent,
    SupplyPanelComponent,
    DebugBarComponent,
    AdrModalComponent,
    AwardBannerComponent,
    MomentModalComponent,
    TitleScreenComponent,
    PostMortemComponent,
    NextStepsComponent,
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

  goTo(step: NextStep): void {
    if (step.act === 'startRound') return this.startNextRound();
    const mode = STEP_MODE[step.target];
    if (mode) this.#stage.request(mode, step.focus ?? null);
  }

  toTree(): void {
    this.#stage.request('skills');
  }

  toReview(): void {
    this.#stage.toBoard();
  }

  startNextRound(): void {
    this.#stage.toBoard();
    this.#store.startRound(Date.now());
  }

  readonly budget = this.#store.budget;
  readonly storyPoints = this.#store.storyPoints;
  readonly sprintCount = this.#store.sprintCount;
  readonly sprintSlots = this.#store.sprintSlots;
  readonly sprintValue = this.#store.sprintValue;
  readonly escalated = this.#store.escalated;

  readonly money = formatCompactMoney;
  readonly points = formatPoints;
  readonly escalation = computed(() =>
    formatQuantity(this.#store.escalationMultiplier())
  );

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
  readonly nextRound = computed(() => this.roundSeq() + 1);
  readonly canFull = this.#store.canFull;
  readonly roundLabel = computed(() =>
    this.running()
      ? 'open'
      : `release ${formatCountdown(this.#store.roundLeftMs())}`
  );

  #now = signal(Date.now());
  #tickHandle?: ReturnType<typeof setInterval>;

  readonly hotfixRemaining = computed(() =>
    Math.max(0, this.#store.hotfixUntil() - this.#now())
  );
  readonly escalationRemaining = computed(() =>
    Math.max(0, this.#store.escalationFiresAt() - this.#now())
  );
  readonly hotfixLabel = computed(() =>
    formatCountdown(this.hotfixRemaining())
  );
  readonly escalationLabel = computed(() =>
    formatCountdown(this.escalationRemaining())
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
    inject(DestroyRef).onDestroy(() => clearInterval(this.#tickHandle));
    effect(() => {
      const awarded = this.#store.awardCount();
      if (awarded > this.#awarded) this.awardPaid.set(true);
      this.#awarded = awarded;
    });
    effect(() => {
      const active =
        this.#store.hotfixUntil() > 0 || this.#store.escalationFiresAt() > 0;
      if (active && this.#tickHandle === undefined) {
        this.#tickHandle = setInterval(
          () => this.#now.set(Date.now()),
          TICK_MS
        );
      } else if (!active && this.#tickHandle !== undefined) {
        clearInterval(this.#tickHandle);
        this.#tickHandle = undefined;
      }
    });
  }
}

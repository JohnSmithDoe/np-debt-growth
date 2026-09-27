import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import {
  formatCompactMoney,
  formatMoney,
  formatPoints,
  formatPointsExact,
} from './@shared/util/format-quantity';
import { RollingNumberDirective } from './console/ui/rolling/rolling-number.directive';
import { BacklogTickerComponent } from './console/ui/backlog-ticker/backlog-ticker.component';
import { AgentComponent } from './console/feature/agent/agent.component';
import { AdrModalComponent } from './console/feature/adr-modal/adr-modal.component';
import { AwardBannerComponent } from './console/feature/award-banner/award-banner.component';
import { MomentModalComponent } from './console/feature/moment-modal/moment-modal.component';
import { DebugBarComponent } from './console/feature/debug-bar/debug-bar.component';
import { AchievementsPanelComponent } from './console/feature/achievements-panel/achievements-panel.component';
import { SupplyPanelComponent } from './console/feature/supply-panel/supply-panel.component';
import { FinaleComponent } from './console/feature/finale/finale.component';
import { PostMortemComponent } from './console/feature/post-mortem/post-mortem.component';
import { HelpModalComponent } from './console/feature/help-modal/help-modal.component';
import { SettingsModalComponent } from './console/feature/settings-modal/settings-modal.component';
import { TitleScreenComponent } from './console/feature/title-screen/title-screen.component';
import { SettingsUiService } from './console/data/settings-ui.service';
import { CLIENT_NAME, ENGAGEMENT_KEY } from './console/model/client.model';
import { FinaleService } from './@shared/data/finale.service';
import { AudioService } from './audio/data/audio.service';
import { StageModeService } from './stage/data/stage-mode.service';
import { GameStore } from './game/data/game.store';
import { epicKey } from './game/model/tier.model';

/** Billing measured over this much game time for the €/s readout. */
const RATE_WINDOW_MS = 10_000;

@Component({
  selector: 'cb-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.finale]': 'finale()' },
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
    FinaleComponent,
    SettingsModalComponent,
    HelpModalComponent,
    RollingNumberDirective,
    TranslatePipe,
  ],
})
export class AppComponent {
  #store = inject(GameStore);
  #audio = inject(AudioService);
  #stage = inject(StageModeService);
  #settings = inject(SettingsUiService);
  #translate = inject(TranslateService);
  #finale = inject(FinaleService);

  readonly client = CLIENT_NAME;
  readonly engagement = ENGAGEMENT_KEY;

  readonly finale = computed(() => this.#finale.act() !== 'closed');

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
  readonly skillAffordable = this.#store.skillAffordable;
  readonly sprintCount = this.#store.sprintCount;
  readonly sprintSlots = this.#store.sprintSlots;
  readonly sprintValue = this.#store.sprintValue;

  readonly money = formatCompactMoney;
  readonly points = formatPoints;

  readonly exactMoney = computed(() => formatMoney(this.budget()));
  readonly exactPoints = computed(() =>
    this.#translate.instant('hud.points.exact', {
      points: formatPointsExact(this.storyPoints()),
    })
  );

  readonly #billing: { at: number; billed: number }[] = [];
  readonly rate = signal(0);

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

  readonly epic = computed(() =>
    epicKey(this.#store.tier(), this.#store.inAcceptance())
  );

  readonly roundSeq = this.#store.roundSeq;
  readonly running = this.#store.running;
  readonly canFull = this.#store.canFull;
  readonly roundLabel = computed(() =>
    this.running()
      ? this.#translate.instant('hud.round.open')
      : this.#translate.instant('hud.round.release', {
          seconds: Math.ceil(this.#store.roundLeftMs() / 1000),
        })
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
    effect(() => this.#sampleRate(this.#store.state()));
  }

  #sampleRate({
    runMs,
    lifetimeBilled,
  }: {
    runMs: number;
    lifetimeBilled: number;
  }): void {
    const samples = this.#billing;
    const newest = samples.at(-1);
    if (newest && runMs < newest.at) samples.length = 0;
    if (newest?.at === runMs) return;
    samples.push({ at: runMs, billed: lifetimeBilled });
    while (samples.length > 2 && runMs - samples[1]!.at >= RATE_WINDOW_MS) {
      samples.shift();
    }
    const oldest = samples[0]!;
    const span = runMs - oldest.at;
    this.rate.set(
      span > 0 ? ((lifetimeBilled - oldest.billed) * 1000) / span : 0
    );
  }
}

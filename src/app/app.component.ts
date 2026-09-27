import {
  ChangeDetectionStrategy,
  Component,
  computed,
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
import { onRise } from './console/util/on-rise';
import { CLIENT_NAME, ENGAGEMENT_KEY } from './console/model/client.model';
import { FinaleService } from './@shared/data/finale.service';
import { AudioService } from './audio/data/audio.service';
import { StageModeService } from './stage/data/stage-mode.service';
import { GameStore } from './game/data/game.store';
import { BillingRateService } from './console/data/billing-rate.service';
import { FINAL_SKILL_ID } from './game/model/skill.model';
import { adrNodeId, epicKey, MAX_TIER } from './game/model/tier.model';

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

  readonly rate = inject(BillingRateService).perSec;

  readonly sprintFill = computed(() => {
    const slots = this.sprintSlots();
    return slots <= 0 ? 0 : Math.min(100, (this.sprintCount() / slots) * 100);
  });

  readonly closes = this.#store.sprint;

  readonly goal = computed(() => {
    if (!this.treeOpen()) return null;
    const tier = this.#store.tier();
    const adr = tier < MAX_TIER ? tier + 1 : null;
    const cost = this.#store.skillRankCost(
      adr ? adrNodeId(adr) : FINAL_SKILL_ID
    );
    if (!Number.isFinite(cost)) return null;
    const pct = Math.min(100, Math.floor((this.storyPoints() / cost) * 100));
    return { adr, pct };
  });
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

  readonly muted = this.#audio.muted;

  toggleMuted(): void {
    this.#audio.setMuted(!this.#audio.muted());
  }

  openSettings(): void {
    this.#settings.open();
  }

  constructor() {
    onRise(this.#store.awardCount, () => this.awardPaid.set(true), 0);
  }
}

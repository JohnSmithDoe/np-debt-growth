import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';

import { FinaleService } from '../../../@shared/data/finale.service';
import { FINALE_ROLL_MS } from '../../../@shared/model/finale.model';
import {
  formatMoney,
  formatWhole,
} from '../../../@shared/util/format-quantity';
import { GameClock } from '../../../game/data/game-clock.service';
import { GameStore } from '../../../game/data/game.store';
import { SaveService } from '../../../game/data/save.service';
import { CAST } from '../../../game/model/cast.model';
import { DEBT_TIERS, tierNameKey } from '../../../game/model/tier.model';
import { RetroService } from '../../data/retro.service';
import { APPROVALS, CLIENT_NAME } from '../../model/client.model';
import {
  COPYRIGHT,
  CREDITS,
  CREW_CREDITS_URL,
  LPC_ARTISTS,
} from '../../model/credit.model';
import { ConfettiComponent } from '../../ui/confetti/confetti.component';

interface CrewLine {
  readonly key: string;
  readonly names: readonly string[];
}

const CREW_LINES = [
  { key: 'finale.roll.juniors', prefix: 'junior' },
  { key: 'finale.roll.seniors', prefix: 'senior' },
  { key: 'finale.roll.managers', prefix: 'manager' },
] as const;

@Component({
  selector: 'cb-finale',
  templateUrl: './finale.component.html',
  styleUrl: './finale.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ConfettiComponent, TranslatePipe],
})
export class FinaleComponent {
  #finale = inject(FinaleService);
  #store = inject(GameStore);
  #clock = inject(GameClock);
  #save = inject(SaveService);
  #retro = inject(RetroService);
  #translate = inject(TranslateService);

  readonly act = this.#finale.act;
  readonly rollMs = FINALE_ROLL_MS;

  readonly client = CLIENT_NAME;
  readonly author = COPYRIGHT.replace(/^© \d+ /, '');
  readonly artists = LPC_ARTISTS;
  readonly built = CREDITS.filter((credit) => credit.url !== CREW_CREDITS_URL);

  readonly crew: readonly CrewLine[] = CREW_LINES.map((line) => ({
    key: line.key,
    names: CAST.filter((entry) => entry.skin.startsWith(line.prefix)).map(
      (entry) => entry.name
    ),
  }));

  readonly approvers = [
    ...new Set(
      Object.values(APPROVALS).map(
        (approval) => `${approval.name}, ${approval.role}`
      )
    ),
  ];

  readonly adrs = computed(() =>
    DEBT_TIERS.map(
      (tier) =>
        `ADR-${tier.index} — ${this.#translate.instant(tierNameKey(tier.index))}`
    )
  );

  readonly stats = computed(() =>
    this.#translate.instant('finale.curtain.stats', {
      billed: formatMoney(this.#store.lifetimeBilled()),
      closed: formatWhole(this.#store.lifetimeClosed()),
      sprints: formatWhole(this.#store.lifetimeRounds()),
    })
  );

  curtain(): void {
    this.#finale.curtain();
  }

  backToPostMortem(): void {
    this.#finale.close();
  }

  newEngagement(): void {
    this.#store.reset(this.#clock.now());
    this.#save.wipe();
    this.#retro.close();
    this.#finale.close();
  }
}

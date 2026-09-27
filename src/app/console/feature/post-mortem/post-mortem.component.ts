import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';

import { FinaleService } from '../../../@shared/data/finale.service';
import {
  formatLongDate,
  formatMoney,
  formatQuantity,
  formatWhole,
} from '../../../@shared/util/format-quantity';
import { GameStore } from '../../../game/data/game.store';
import { ACHIEVEMENTS } from '../../../game/model/award.model';
import { tierNameKey } from '../../../game/model/tier.model';
import { BackdropDirective } from '../../ui/backdrop/backdrop.directive';
import { RetroService } from '../../data/retro.service';
import {
  APPROVALS,
  CLIENT_NAME,
  ENGAGEMENT_KEY,
  roleKey,
  signatoryKey,
} from '../../model/client.model';
import { burndownChart, CHART_BOX } from '../../util/burndown-chart';
import type { OfficeFrame } from '../../util/office-art';
import { officeFilmstrip } from '../../util/office-art';

interface HeadRate {
  readonly heads: number;
  readonly closed: number;
  readonly perHead: string;
}

interface Authorisation {
  readonly index: number;
  readonly name: string;
  readonly signed: string;
}

@Component({
  selector: 'cb-post-mortem',
  templateUrl: './post-mortem.component.html',
  styleUrl: './post-mortem.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BackdropDirective, TranslatePipe],
  host: { '(document:keydown.escape)': 'leaveOnBackdrop()' },
})
export class PostMortemComponent {
  #store = inject(GameStore);
  #translate = inject(TranslateService);
  #retro = inject(RetroService);
  #finale = inject(FinaleService);

  readonly final = this.#store.ended;
  readonly shown = computed(
    () =>
      (this.final() || this.#retro.isOpen()) && this.#finale.act() === 'closed'
  );

  readonly client = CLIENT_NAME;
  readonly engagement = ENGAGEMENT_KEY;

  readonly chart = computed(() => burndownChart(this.#store.burndown()));
  readonly chartBox = `0 0 ${CHART_BOX.width} ${CHART_BOX.height}`;
  readonly chartHeight = CHART_BOX.height;

  close(): void {
    this.#retro.close();
  }

  toFinale(): void {
    this.#finale.open();
  }

  leaveOnBackdrop(): void {
    if (!this.final()) this.close();
  }

  readonly authorisations = computed<readonly Authorisation[]>(() => {
    const rungs: Authorisation[] = [];
    for (let index = 1; index <= this.#store.tier(); index += 1) {
      const approval = APPROVALS[index];
      if (!approval) continue;
      rungs.push({
        index,
        name: this.#translate.instant(tierNameKey(index)),
        signed: this.#say('postmortem.signed', {
          by: this.#say(signatoryKey(approval.by)),
          role: this.#say(roleKey(approval.role)),
          date: formatLongDate(approval.date),
        }),
      });
    }
    return rungs;
  });

  readonly filmstrip = computed<readonly OfficeFrame[]>(() =>
    officeFilmstrip(
      this.#store.tier(),
      this.final(),
      (index) => this.#say(tierNameKey(index)),
      this.#say('postmortem.outside')
    )
  );

  readonly tierName = computed(() => {
    const tier = this.#store.tier();
    return tier > 0
      ? this.#say(tierNameKey(tier))
      : this.#say('postmortem.no-tier');
  });

  readonly wentWell = computed<readonly string[]>(() => {
    const closed = formatWhole(this.#store.lifetimeClosed());
    const billed = formatMoney(this.#store.lifetimeBilled());
    const sprints = formatWhole(this.#store.lifetimeRounds());
    const owned = new Set(this.#store.achievements());
    const unlocked = ACHIEVEMENTS.filter((award) => owned.has(award.id)).length;
    return [
      this.#say('postmortem.well.closed', { closed }),
      this.#say('postmortem.well.billed', {
        billed,
        client: CLIENT_NAME,
        sprints,
      }),
      this.#say('postmortem.well.tier', {
        adr: this.#store.tier(),
        tier: this.tierName(),
      }),
      this.#say('postmortem.well.awards', {
        unlocked,
        total: ACHIEVEMENTS.length,
      }),
    ];
  });

  readonly wentBadly = computed<readonly string[]>(() => [
    this.#say('postmortem.badly.adrs', { client: CLIENT_NAME }),
    this.#say('postmortem.badly.backlog'),
    this.#say('postmortem.badly.headcount'),
  ]);

  readonly genderSplit = computed<{
    readonly women: HeadRate;
    readonly men: HeadRate;
  }>(() => {
    const levels = this.#store.levels();
    const women = this.#store.crewWomen();
    const heads = levels.junior + levels.senior;
    const men = heads - women;

    const closedByWomen = this.#store.lifetimeClosedByWomen();
    const closedByMen = Math.max(
      0,
      this.#store.lifetimeClosed() - closedByWomen
    );

    const rate = (closed: number, count: number): HeadRate => ({
      heads: count,
      closed,
      perHead: count > 0 ? formatQuantity(closed / count) : '—',
    });

    return { women: rate(closedByWomen, women), men: rate(closedByMen, men) };
  });

  readonly actionItems = computed<readonly string[]>(() => {
    const split = this.genderSplit();
    const items = [
      this.#say('postmortem.action.gender', {
        women: split.women.perHead,
        womenHeads: split.women.heads,
        men: split.men.perHead,
        menHeads: split.men.heads,
      }),
      this.#say('postmortem.action.load', { tier: this.tierName() }),
    ];
    if (this.#store.assisted())
      items.push(this.#say('postmortem.action.assisted'));
    items.push(this.#say('postmortem.action.retro'));
    return items;
  });

  #say(key: string, params?: Record<string, string | number>): string {
    return this.#translate.instant(key, params);
  }
}

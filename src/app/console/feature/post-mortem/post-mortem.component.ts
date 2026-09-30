import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';

import { FinaleService } from '../../../@shared/data/finale.service';
import {
  formatMoney,
  formatQuantity,
  formatWhole,
} from '../../../@shared/util/format-quantity';
import { GameStore } from '../../../game/data/game.store';
import { ACHIEVEMENTS } from '../../../game/model/award.model';
import { CHANGE_REQUEST_ID } from '../../../game/model/skill.model';
import { tierNameKey } from '../../../game/model/tier.model';
import { CLIENT_NAME, ENGAGEMENT_KEY } from '../../model/client.model';
import { criteriaTotal } from '../../../game/model/consultancy.model';
import { DoorService } from '../../data/door.service';
import { burndownChart, CHART_BOX } from '../../util/burndown-chart';
import { onRise } from '../../util/on-rise';
import type { OfficeFrame } from '../../util/office-art';
import { officeFilmstrip } from '../../util/office-art';

interface HeadRate {
  readonly heads: number;
  readonly closed: number;
  readonly perHead: string;
}

const STAMP_MS = 2_800;

@Component({
  selector: 'cb-post-mortem',
  templateUrl: './post-mortem.component.html',
  styleUrl: './post-mortem.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
})
export class PostMortemComponent {
  #store = inject(GameStore);
  #translate = inject(TranslateService);
  #finale = inject(FinaleService);
  #door = inject(DoorService);

  readonly final = this.#store.ended;
  readonly #stamped = signal(this.final());
  readonly stamping = computed(() => this.final() && !this.#stamped());
  readonly shown = computed(
    () =>
      this.final() &&
      this.#stamped() &&
      this.#door.opened() &&
      this.#finale.act() === 'closed'
  );

  constructor() {
    let timer: ReturnType<typeof setTimeout> | undefined;
    inject(DestroyRef).onDestroy(() => clearTimeout(timer));
    onRise(
      () => Number(this.final()),
      () => {
        this.#stamped.set(false);
        timer = setTimeout(() => this.#stamped.set(true), STAMP_MS);
      }
    );
  }

  readonly client = CLIENT_NAME;
  readonly engagement = ENGAGEMENT_KEY;

  readonly chart = computed(() => burndownChart(this.#store.burndown()));
  readonly chartBox = `0 0 ${CHART_BOX.width} ${CHART_BOX.height}`;
  readonly chartHeight = CHART_BOX.height;

  toFinale(): void {
    this.#finale.open();
  }

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
      this.#criteriaLine(),
    ];
  });

  readonly wentBadly = computed<readonly string[]>(() => {
    const changes = this.#store.skillRank(CHANGE_REQUEST_ID);
    return [
      this.#say('postmortem.badly.adrs', { client: CLIENT_NAME }),
      this.#say('postmortem.badly.backlog'),
      this.#say('postmortem.badly.headcount'),
      ...(changes === 0
        ? []
        : [
            this.#say(
              changes === 1
                ? 'postmortem.badly.changes.one'
                : 'postmortem.badly.changes',
              { count: changes }
            ),
          ]),
    ];
  });

  readonly genderSplit = computed<{
    readonly women: HeadRate;
    readonly men: HeadRate;
  }>(() => {
    const levels = this.#store.levels();
    const women =
      Math.floor(levels.junior / this.#store.womanEvery('juniors')) +
      Math.floor(levels.senior / this.#store.womanEvery('seniors'));
    const heads = levels.junior + levels.senior;
    const men = heads - women;

    const closedByWomen = this.#store.lifetimeClosedByWomen();
    const closedByMen = Math.max(
      0,
      this.#store.lifetimeClosedByCrew() - closedByWomen
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

  #criteriaLine(): string {
    const state = this.#store.state();
    const total = criteriaTotal(state);
    const findings = state.criterion?.findings ?? 0;
    return findings === 0
      ? this.#say('postmortem.well.criteria.all', { total })
      : this.#say('postmortem.well.criteria.findings', {
          clean: total - findings,
          total,
          findings,
        });
  }

  #say(key: string, params?: Record<string, string | number>): string {
    return this.#translate.instant(key, params);
  }
}

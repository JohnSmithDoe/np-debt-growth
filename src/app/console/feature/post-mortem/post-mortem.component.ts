import { TranslateService } from '@ngx-translate/core';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';

import {
  formatMoney,
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
  ENGAGEMENT_NAME,
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
  imports: [BackdropDirective],
  host: { '(document:keydown.escape)': 'leaveOnBackdrop()' },
})
export class PostMortemComponent {
  #store = inject(GameStore);
  #translate = inject(TranslateService);
  #retro = inject(RetroService);

  readonly final = this.#store.ended;
  readonly shown = computed(() => this.final() || this.#retro.isOpen());

  readonly client = CLIENT_NAME;
  readonly engagement = ENGAGEMENT_NAME;

  readonly chart = computed(() => burndownChart(this.#store.burndown()));
  readonly chartBox = `0 0 ${CHART_BOX.width} ${CHART_BOX.height}`;
  readonly chartHeight = CHART_BOX.height;

  close(): void {
    this.#retro.close();
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
        signed: `${approval.name}, ${approval.role} — ${approval.date}. Comments: —`,
      });
    }
    return rungs;
  });

  readonly filmstrip = computed<readonly OfficeFrame[]>(() =>
    officeFilmstrip(this.#store.tier(), this.final(), (index) =>
      this.#translate.instant(tierNameKey(index))
    )
  );

  readonly tierName = computed(() => {
    const tier = this.#store.tier();
    return tier > 0
      ? this.#translate.instant(tierNameKey(tier))
      : this.#translate.instant('postmortem.no-tier');
  });

  readonly wentWell = computed<readonly string[]>(() => {
    const closed = formatWhole(this.#store.lifetimeClosed());
    const billed = formatMoney(this.#store.lifetimeBilled());
    const sprints = formatWhole(this.#store.lifetimeRounds());
    const owned = new Set(this.#store.achievements());
    const unlocked = ACHIEVEMENTS.filter((award) => owned.has(award.id)).length;
    return [
      `${closed} tickets closed over the engagement.`,
      `${billed} billed to ${CLIENT_NAME}, across ${sprints} sprints.`,
      `ADR-${this.#store.tier()} (${this.tierName()}) reached full production status.`,
      `${unlocked} of ${ACHIEVEMENTS.length} achievements confirmed by the crew.`,
    ];
  });

  readonly wentBadly = computed<readonly string[]>(() => [
    `Every Architecture Decision Record made the codebase permanently worse. None were reverted, none were on the agenda to be, and each was approved in writing by ${CLIENT_NAME}.`,
    'The backlog was, at no point during the engagement, empty.',
    'Headcount was added faster than the backlog shrank, at every tier.',
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
      perHead: count > 0 ? (closed / count).toFixed(1) : '—',
    });

    return { women: rate(closedByWomen, women), men: rate(closedByMen, men) };
  });

  readonly actionItems = computed<readonly string[]>(() => {
    const split = this.genderSplit();
    const items = [
      `Reconcile crew throughput by gender — women: ${split.women.perHead} closes/head (n=${split.women.heads}); men: ${split.men.perHead} closes/head (n=${split.men.heads}). Owner: unassigned.`,
      `Investigate why ${this.tierName()} is now load-bearing. Owner: unassigned.`,
    ];
    if (this.#store.assisted()) {
      items.push(
        'Engagement figures include budget booked outside the billing system. Owner: unassigned.'
      );
    }
    items.push(
      'Schedule a retrospective on this retrospective. Owner: unassigned.'
    );
    return items;
  });
}

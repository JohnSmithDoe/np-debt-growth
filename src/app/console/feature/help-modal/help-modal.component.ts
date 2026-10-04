import { formatQuantity } from '../../../@shared/util/format-quantity';
import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { BoardIcons } from '../../../@shared/data/board-icons.service';
import { formatCompactMoney } from '../../../@shared/util/format-quantity';
import { GameStore } from '../../../game/data/game.store';
import {
  GOLDEN_LIFE_MS,
  PIZZA_MS,
  PIZZA_RUSH,
  ticketLifeMs,
} from '../../../game/model/balance/flow';
import {
  HOTFIX_MS,
  HOTFIX_MULTIPLIER,
  INVITATION_WINDOW_MS,
} from '../../../game/model/balance/weather';
import { PROD_INCIDENT_LIVE_CAP } from '../../../game/model/balance/flow';
import {
  CREDIT_FROM_ADR,
  CREDIT_UNTIL_ADR,
  CREDIT_SHARE,
  LINE_PLAN,
} from '../../../game/model/balance/progression';
import {
  INCIDENT_REVIEW_FROM_TIER,
  RELEASE_PHASES,
  SPRINT_SLOTS_STEP,
} from '../../../game/model/balance/round';
import { HAZARDS } from '../../../game/model/hazard.model';
import {
  FLAKY_COMEBACK_MS,
  RETYPE_LADDER,
  TICKET_TYPES,
  ticketHelpKey,
  ticketLabelKey,
  type TicketTypeId,
} from '../../../game/model/ticket.model';
import * as economy from '../../../game/util/economy';
import { HelpUiService } from '../../data/help-ui.service';
import { BackdropDirective } from '../../ui/backdrop/backdrop.directive';
import { PanelComponent } from '../../ui/panel/panel.component';

export interface GuideRow {
  readonly key: string;
  readonly image: string | undefined;
  readonly wide: boolean;
  readonly name: string;
  readonly blurb: string;
  readonly params: Record<string, unknown>;
  readonly worth: string | null;
  readonly from: { readonly key: string; readonly params?: object } | null;
  readonly ahead: boolean;
}

export type HelpTab = 'game' | 'tickets' | 'strategy';

const SPECIAL_ORDER: readonly TicketTypeId[] = [
  'incident',
  'escalation',
  'hotfix',
  'quarter',
  'pizza',
  'invite',
];

const INVITES_FROM = Math.min(
  ...HAZARDS.filter((row) => row.kind === 'invitation').map(
    (row) => row.fromTier
  )
);

const seconds = (ms: number): string => formatQuantity(ms / 1000);

const STRATEGY: readonly {
  readonly key: string;
  readonly params: Record<string, unknown>;
}[] = [
  { key: 'velocity', params: { price: LINE_PLAN.velocity.cost } },
  { key: 'adr', params: {} },
  { key: 'rates', params: {} },
  { key: 'train', params: {} },
  { key: 'golden', params: { seconds: seconds(GOLDEN_LIFE_MS) } },
  { key: 'hand', params: {} },
  { key: 'storm', params: {} },
  { key: 'meetings', params: {} },
  { key: 'prod', params: { adr: INCIDENT_REVIEW_FROM_TIER } },
  {
    key: 'credit',
    params: {
      adr: CREDIT_FROM_ADR,
      last: CREDIT_UNTIL_ADR,
      share: Math.round(CREDIT_SHARE * 100),
    },
  },
].map((step) => ({ ...step, key: `help.strategy.${step.key}` }));

@Component({
  selector: 'cb-help-modal',
  templateUrl: './help-modal.component.html',
  styleUrl: './help-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'dismiss()' },
  imports: [BackdropDirective, NgTemplateOutlet, PanelComponent, TranslatePipe],
})
export class HelpModalComponent {
  #ui = inject(HelpUiService);
  #store = inject(GameStore);
  #icons = inject(BoardIcons);

  readonly shown = this.#ui.isOpen;
  readonly lifeSeconds = computed(() =>
    seconds(ticketLifeMs(this.#store.tier()))
  );
  readonly loop = [1, 2, 3, 4, 5].map((step) => `help.loop.${step}`);
  readonly strategy = STRATEGY;
  readonly tabs: readonly HelpTab[] = ['game', 'tickets', 'strategy'];
  readonly tab = signal<HelpTab>('game');

  readonly train = computed(() => [
    { key: 'help.train.1', params: { slots: this.#store.sprintSlots() } },
    { key: 'help.train.2', params: {} },
    { key: 'help.train.3', params: {} },
    { key: 'help.train.4', params: { cap: PROD_INCIDENT_LIVE_CAP } },
    { key: 'help.train.5', params: { step: SPRINT_SLOTS_STEP } },
  ]);

  readonly haulSeconds = computed(() => seconds(this.#store.haulMs()));

  readonly ceremonies = computed(() => {
    const kept = new Set(this.#store.releasePhases().map((phase) => phase.id));
    return RELEASE_PHASES.map((phase) => ({
      id: phase.id,
      seconds: seconds(phase.ms),
      cut: !kept.has(phase.id),
    }));
  });

  readonly line = computed(() =>
    this.shown() ? RETYPE_LADDER.map((id) => this.#row(id)) : []
  );

  readonly special = computed(() =>
    this.shown() ? SPECIAL_ORDER.map((id) => this.#row(id)) : []
  );

  readonly marks = computed((): readonly GuideRow[] => {
    if (!this.shown()) return [];
    const state = this.#store.state();
    const marks = this.#icons.icons().marks;
    return [
      {
        key: 'golden',
        image: marks.get('golden'),
        wide: false,
        name: 'help.mark.golden.label',
        blurb: 'help.mark.golden',
        params: {
          times: economy.goldenMultiplier(state),
          seconds: seconds(GOLDEN_LIFE_MS),
        },
        worth: null,
        from: null,
        ahead: false,
      },
      {
        key: 'voted',
        image: marks.get('voted'),
        wide: false,
        name: 'help.mark.voted.label',
        blurb: 'help.mark.voted',
        params: {},
        worth: null,
        from: null,
        ahead: false,
      },
    ];
  });

  dismiss(): void {
    this.#ui.close();
  }

  #row(id: TicketTypeId): GuideRow {
    const state = this.#store.state();
    const type = TICKET_TYPES[id];
    const tier = id === 'invite' ? INVITES_FROM : type.tier;
    const value =
      type.value > 0 ? economy.ticketValue(state, id, state.lastTick) : 0;
    return {
      key: id,
      image: this.#icons.icons().tickets.get(id),
      wide: type.handOnly,
      name: ticketLabelKey(id),
      blurb: ticketHelpKey(id),
      params: this.#params(id),
      worth: value > 0 ? formatCompactMoney(value) : null,
      from:
        id === 'pizza'
          ? { key: 'help.from.pizza' }
          : tier > 0
            ? { key: 'help.from.adr', params: { adr: tier } }
            : null,
      ahead: tier > state.tier,
    };
  }

  #params(id: TicketTypeId): Record<string, unknown> {
    const state = this.#store.state();
    switch (id) {
      case 'flaky':
      case 'zombie':
        return { seconds: seconds(FLAKY_COMEBACK_MS) };
      case 'escalation':
        return {
          mult: economy.escalationMultiplier(state),
          seconds: seconds(economy.escalationHoldMs(state)),
        };
      case 'hotfix':
        return { mult: HOTFIX_MULTIPLIER, seconds: seconds(HOTFIX_MS) };
      case 'pizza':
        return { mult: PIZZA_RUSH, seconds: seconds(PIZZA_MS) };
      case 'invite':
        return { seconds: seconds(INVITATION_WINDOW_MS) };
      default:
        return {};
    }
  }
}

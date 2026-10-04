import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { SettingsService } from '../../../@shared/data/settings.service';
import {
  formatDuration,
  formatMoney,
  formatPointsExact,
} from '../../../@shared/util/format-quantity';
import { GameStore } from '../../../game/data/game.store';
import type { Pick } from '../../../game/util/advisor';
import { buyKey } from '../../../game/util/advisor';
import { affordable, AgentService } from '../../data/agent.service';
import { DoorService } from '../../data/door.service';
import type { Phrase } from '../../util/agent-copy';
import { buyName, goalKey, pushQuipKey } from '../../util/agent-copy';
import { onRise } from '../../util/on-rise';

interface TipRow {
  readonly id: string;
  readonly currency: 'eur' | 'sp';
  readonly title: string;
  readonly detail: string;
  readonly affordable: boolean;
  readonly pick: Pick;
}

@Component({
  selector: 'cb-agent',
  templateUrl: './agent.component.html',
  styleUrl: './agent.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
})
export class AgentComponent {
  #agent = inject(AgentService);
  #store = inject(GameStore);
  #translate = inject(TranslateService);
  #door = inject(DoorService);
  #settings = inject(SettingsService);

  readonly #open = signal(false);
  readonly open = this.#open.asReadonly();

  readonly warned = this.#settings.agentWarned;
  readonly pushing = this.#store.inAcceptance;

  readonly quip = computed(() => {
    const state = this.#store.state();
    return this.#translate.instant(
      pushQuipKey(state.runMs, this.#store.acceptance()?.retest ?? false)
    );
  });
  readonly auto = this.#agent.auto;

  readonly shown = computed(
    () =>
      this.#settings.showAgent() && this.#door.opened() && !this.#store.ended()
  );

  readonly headline = computed(() =>
    this.#translate.instant(goalKey(this.#agent.advice()))
  );

  readonly rows = computed<readonly TipRow[]>(() => {
    const state = this.#store.state();
    const { eur, sp } = this.#agent.advice();
    return [sp, eur]
      .filter((pick): pick is Pick => pick !== null)
      .map((pick) => {
        const held = pick.currency === 'eur' ? state.budget : state.storyPoints;
        const short = Math.max(0, pick.cost - held);
        const ok = affordable(state, pick);
        const name = this.#say(buyName(state, pick.buy));
        const cost = this.#amount(pick.currency, pick.cost);
        const then = pick.then ? this.#say(buyName(state, pick.then)) : null;
        return {
          id: buyKey(pick.buy),
          currency: pick.currency,
          affordable: ok,
          pick,
          title: this.#translate.instant(
            ok ? 'agent.buy.title' : 'agent.save.title',
            { name }
          ),
          detail: ok
            ? this.#translate.instant(
                pick.finishing
                  ? 'agent.buy.finish'
                  : pick.spare
                    ? 'agent.buy.spare'
                    : then
                      ? 'agent.buy.opens'
                      : 'agent.buy.detail',
                { cost, then }
              )
            : this.#translate.instant(
                pick.perSec > 0 ? 'agent.save.detail' : 'agent.save.idle',
                {
                  short: this.#amount(pick.currency, short),
                  time: formatDuration(short / pick.perSec),
                }
              ),
        };
      });
  });

  constructor() {
    onRise(
      () => Number(this.pushing()),
      () => this.#open.set(true)
    );
  }

  toggle(): void {
    this.#open.update((open) => !open);
  }

  acknowledge(): void {
    this.#settings.setAgentWarned();
  }

  toggleAuto(): void {
    this.#settings.setAgentAuto(!this.auto());
  }

  buy(row: TipRow): void {
    if (row.affordable) this.#agent.buy(row.pick.buy);
  }

  #amount(currency: 'eur' | 'sp', value: number): string {
    return currency === 'eur'
      ? formatMoney(Math.ceil(value))
      : `${formatPointsExact(Math.ceil(value))} SP`;
  }

  #say(phrase: Phrase): string {
    const params: Record<string, string> = {};
    for (const [name, key] of Object.entries(phrase.params ?? {})) {
      params[name] = this.#translate.instant(key);
    }
    return this.#translate.instant(phrase.key, params);
  }
}

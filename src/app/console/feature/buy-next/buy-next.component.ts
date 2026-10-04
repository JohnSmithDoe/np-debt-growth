import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { TreeFocusService } from '../../../@shared/data/tree-focus.service';
import {
  formatDuration,
  formatPointsExact,
} from '../../../@shared/util/format-quantity';
import { GameStore } from '../../../game/data/game.store';
import {
  SKILL_BY_ID,
  skillBlurbKey,
  skillLabelKey,
} from '../../../game/model/skill.model';
import * as economy from '../../../game/util/economy';
import { skillEffectText } from '../../../game/util/skill-copy';
import { affordable, AgentService } from '../../data/agent.service';
import { PanelComponent } from '../../ui/panel/panel.component';

/** From this ADR the tree is big enough that finding the next buy takes longer than buying it. */
export const BUY_NEXT_FROM_TIER = 3;

interface NextBuy {
  readonly id: string;
  readonly node: string;
  readonly label: string;
  readonly blurb: string;
  readonly effect: string;
  readonly cost: string;
  readonly credit: boolean;
  readonly affordable: boolean;
  readonly wait: string;
}

@Component({
  selector: 'cb-buy-next',
  templateUrl: './buy-next.component.html',
  styleUrl: './buy-next.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PanelComponent, TranslatePipe],
})
export class BuyNextComponent {
  #agent = inject(AgentService);
  #store = inject(GameStore);
  #translate = inject(TranslateService);
  #treeFocus = inject(TreeFocusService);

  readonly next = computed<NextBuy | null>(() => {
    const state = this.#store.state();
    if (state.tier < BUY_NEXT_FROM_TIER || economy.inAcceptance(state))
      return null;
    const pick = this.#agent.advice().sp;
    if (!pick || (pick.buy.kind !== 'skill' && pick.buy.kind !== 'credit'))
      return null;
    const node = SKILL_BY_ID.get(pick.buy.id);
    if (!node) return null;
    const level = economy.skillRank(state, node.id) + 1;
    const text = (key: string, params?: object): string =>
      this.#translate.instant(key, params);
    const short = Math.max(0, pick.cost - state.storyPoints);
    return {
      id: `${node.id}:${level}`,
      node: node.id,
      label: text(skillLabelKey(node.id, level)),
      blurb: text(skillBlurbKey(node.id)),
      effect: skillEffectText(node, level, text),
      cost: `${formatPointsExact(Math.ceil(pick.cost))} SP`,
      credit: pick.buy.kind === 'credit',
      affordable: affordable(state, pick),
      wait:
        pick.perSec > 0
          ? text('agent.save.detail', {
              short: `${formatPointsExact(Math.ceil(short))} SP`,
              time: formatDuration(short / pick.perSec),
            })
          : text('agent.save.idle', {
              short: `${formatPointsExact(Math.ceil(short))} SP`,
            }),
    };
  });

  goTo(): void {
    const next = this.next();
    if (next) this.#treeFocus.focus(next.node);
  }

  buy(): void {
    const pick = this.#agent.advice().sp;
    if (pick && affordable(this.#store.state(), pick))
      this.#agent.buy(pick.buy);
  }
}

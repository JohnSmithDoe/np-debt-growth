import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
} from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import {
  formatMoney,
  formatWhole,
} from '../../../@shared/util/format-quantity';
import type { EffectParams } from '../../../game/model/purchase-copy.model';
import { NextStepService } from '../../data/next-step.service';
import type {
  NextStep,
  NoticeTarget,
  StepAction,
} from '../../model/step.model';
import { PanelComponent } from '../../ui/panel/panel.component';

interface StepRow {
  readonly id: string;
  readonly does: string | null;
  readonly acts: boolean;
  readonly title: string;
  readonly detail: string;
  readonly teaches: boolean;
  readonly step: NextStep;
}

const SHOWN = 3;

const DOES: Record<StepAction, string> = {
  startRound: 'Start',
};

const SHOW_ON_MAP: NoticeTarget = 'skills';

@Component({
  selector: 'cb-next-steps',
  templateUrl: './next-steps.component.html',
  styleUrl: './next-steps.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PanelComponent, TranslatePipe],
})
export class NextStepsComponent {
  #steps = inject(NextStepService);
  #translate = inject(TranslateService);

  readonly go = output<NextStep>();

  readonly rows = computed<readonly StepRow[]>(() =>
    this.#steps
      .steps()
      .slice(0, SHOWN)
      .map((step) => {
        const acts = step.act !== undefined;
        return {
          id: step.id,
          does: acts && step.act ? DOES[step.act] : this.#points(step),
          acts,
          title: this.#say(step.titleKey, this.#resolve(step.titleParams)),
          detail: this.#detail(step),
          teaches: step.teaches === true,
          step,
        };
      })
  );

  #points(step: NextStep): string | null {
    return step.target === SHOW_ON_MAP ? 'Show' : null;
  }

  open(row: StepRow): void {
    this.go.emit(row.step);
  }

  #detail(step: NextStep): string {
    const resolved = this.#resolve(step.detailParams);
    if (step.detailMoney !== undefined) {
      resolved['money'] = formatMoney(step.detailMoney);
    }
    if (step.detailPoints !== undefined) {
      resolved['points'] = formatWhole(Math.ceil(step.detailPoints));
    }
    return this.#say(step.detailKey, resolved);
  }

  #resolve(params?: EffectParams): Record<string, string | number> {
    const resolved: Record<string, string | number> = {};
    for (const [name, value] of Object.entries(params ?? {})) {
      resolved[name] =
        typeof value === 'string' ? this.#translate.instant(value) : value;
    }
    return resolved;
  }

  #say(key: string, params: Record<string, string | number>): string {
    return this.#translate.instant(key, params);
  }
}

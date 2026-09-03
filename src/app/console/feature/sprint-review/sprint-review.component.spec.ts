import {
  ChangeDetectionStrategy,
  Component,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GameStore } from '../../../game/data/game.store';
import { NextStepService } from '../../data/next-step.service';
import { RetroService } from '../../data/retro.service';
import { AdrPanelComponent } from '../adr-panel/adr-panel.component';
import { SprintReviewComponent } from './sprint-review.component';

@Component({
  selector: 'cb-adr-panel',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class StubAdrPanelComponent {}

describe('SprintReviewComponent — the Promotion Round (D33)', () => {
  const budget = signal(0);
  const cost = signal(100);
  const offered = signal(true);
  const promote = vi.fn(() => true);

  function review(): SprintReviewComponent {
    return TestBed.createComponent(SprintReviewComponent).componentInstance;
  }

  beforeEach(() => {
    vi.useFakeTimers();
    budget.set(0);
    cost.set(100);
    offered.set(true);
    promote.mockClear();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideTranslateService(),
        {
          provide: GameStore,
          useValue: {
            budget,
            levels: signal({ junior: 5 }),
            promotionOffered: () => offered(),
            promotionCost: () => cost(),
            promote,
            roundLog: signal([]),
            lastRound: signal(null),
            previousRound: signal(null),
            lastTarget: signal(null),
            roundTarget: signal(null),
            roundSeq: signal(1),
            perSecond: signal(0),
            crewEarnedShare: signal(0),
            canEndRun: () => false,
            ended: signal(false),
            lifetimeClosed: signal(0),
          } as unknown as GameStore,
        },
        {
          provide: NextStepService,
          useValue: { countByTarget: signal({}) } as unknown as NextStepService,
        },
        { provide: RetroService, useValue: {} as RetroService },
      ],
    });

    TestBed.overrideComponent(SprintReviewComponent, {
      remove: { imports: [AdrPanelComponent] },
      add: { imports: [StubAdrPanelComponent] },
    });
  });

  afterEach(() => vi.useRealTimers());

  it('offers the door only while the swap is on the table', () => {
    expect(review().promotionOffered()).toBe(true);
    offered.set(false);
    expect(review().promotionOffered()).toBe(false);
  });

  it('refuses a price the budget cannot meet', () => {
    budget.set(99);
    expect(review().canAffordPromotion()).toBe(false);
    budget.set(100);
    expect(review().canAffordPromotion()).toBe(true);
  });

  it('takes two presses to spend the money', () => {
    const panel = review();
    panel.promote();
    expect(panel.promoteArmed()).toBe(true);
    expect(promote).not.toHaveBeenCalled();

    panel.promote();
    expect(promote).toHaveBeenCalledOnce();
    expect(panel.promoteArmed()).toBe(false);
  });

  it('disarms itself when it is ignored', () => {
    const panel = review();
    panel.promote();
    vi.advanceTimersByTime(4000);
    expect(panel.promoteArmed()).toBe(false);
    expect(promote).not.toHaveBeenCalled();
  });
});

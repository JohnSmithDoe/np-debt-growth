import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GameStore } from '../../../game/data/game.store';
import { AWARDS } from '../../../game/model/award.model';
import type { AwardReward } from '../../../game/util/economy';
import { AwardBannerComponent } from './award-banner.component';

const [first = '', second = '', third = ''] = AWARDS.map((award) => award.id);

describe('AwardBannerComponent', () => {
  const awarded = signal<readonly string[]>([]);
  const rewards = signal<ReadonlyMap<string, AwardReward>>(new Map());

  function banner(): AwardBannerComponent {
    return TestBed.createComponent(AwardBannerComponent).componentInstance;
  }

  function grant(...ids: readonly string[]): void {
    awarded.set(ids);
    TestBed.tick();
  }

  beforeEach(() => {
    vi.useFakeTimers();
    awarded.set([]);
    rewards.set(new Map());
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideTranslateService(),
        {
          provide: GameStore,
          useValue: { awarded, rewards } as unknown as GameStore,
        },
      ],
    });
  });

  afterEach(() => vi.useRealTimers());

  const ids = (component: AwardBannerComponent): string[] =>
    component.stack().map((award) => award.id);

  it('stacks awards granted together, each leaving on its own schedule', () => {
    const component = banner();

    grant(first);
    vi.advanceTimersByTime(1000);
    grant(first, second);
    expect(ids(component)).toEqual([first, second]);

    vi.advanceTimersByTime(20_000);
    TestBed.tick();
    expect(ids(component)).toEqual([]);
  });

  it('holds awards past the stack behind a count', () => {
    const component = banner();

    grant(...AWARDS.slice(0, 5).map((award) => award.id));

    expect(component.stack()).toHaveLength(3);
    expect(component.waiting()).toBe(2);
  });

  it('dismisses one award and keeps the rest', () => {
    const component = banner();

    grant(first, second, third);
    component.dismiss(second);
    TestBed.tick();

    expect(ids(component)).toEqual([first, third]);
  });

  it('hears the first award of a run that started over', () => {
    const component = banner();

    grant(first, second, third);
    for (const id of [first, second, third]) component.dismiss(id);
    TestBed.tick();
    expect(component.stack()).toEqual([]);

    grant();
    grant(first);

    expect(ids(component)).toEqual([first]);
  });

  it('drops the queue of a run that is gone', () => {
    const component = banner();

    grant(first, second);
    expect(ids(component)).toEqual([first, second]);

    grant();

    expect(component.stack()).toEqual([]);
  });

  it('pops what an achievement paid, and nothing for a milestone', () => {
    const component = banner();

    rewards.set(new Map([['a-250', { currency: 'sp', amount: 24_000 }]]));
    grant('m-first-close', 'a-250');

    expect(component.pops().map((pop) => pop.id)).toEqual(['a-250']);
    expect(component.pops()[0]).toMatchObject({
      key: 'award.reward.sp',
      amount: '24.0k',
    });
    expect(component.stack().map((award) => award.reward?.key ?? null)).toEqual(
      [null, 'award.reward.sp']
    );

    component.popped('a-250');
    expect(component.pops()).toEqual([]);
  });
});

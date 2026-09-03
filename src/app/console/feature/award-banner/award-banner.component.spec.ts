import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GameStore } from '../../../game/data/game.store';
import { AWARDS } from '../../../game/model/award.model';
import { AwardBannerComponent } from './award-banner.component';

const [first = '', second = '', third = ''] = AWARDS.map((award) => award.id);

describe('AwardBannerComponent', () => {
  const awarded = signal<readonly string[]>([]);

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
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: GameStore, useValue: { awarded } as unknown as GameStore },
      ],
    });
  });

  afterEach(() => vi.useRealTimers());

  it('leaves the perching award on its own schedule when the next is granted', () => {
    const component = banner();

    grant(first);
    expect(component.showing()?.id).toBe(first);

    vi.advanceTimersByTime(3000);
    grant(first, second);
    vi.advanceTimersByTime(1200);
    TestBed.tick();

    expect(component.showing()?.id).toBe(second);
  });

  it('hears the first award of a run that started over', () => {
    const component = banner();

    grant(first, second, third);
    component.dismiss();
    component.dismiss();
    component.dismiss();
    TestBed.tick();
    expect(component.showing()).toBeNull();

    grant();
    grant(first);

    expect(component.showing()?.id).toBe(first);
  });

  it('drops the queue of a run that is gone', () => {
    const component = banner();

    grant(first, second);
    expect(component.showing()?.id).toBe(first);

    grant();

    expect(component.showing()).toBeNull();
  });
});

import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { GameStore } from '../../../game/data/game.store';
import type { FeedLine } from '../../../game/model/feed.model';
import { ActivityFeedComponent } from './activity-feed.component';

describe('ActivityFeedComponent', () => {
  const log = signal<readonly FeedLine[]>([]);
  const lifetimeClosed = signal(0);

  beforeEach(() => {
    log.set([]);
    lifetimeClosed.set(0);
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideTranslateService(),
        {
          provide: GameStore,
          useValue: { log, lifetimeClosed } as unknown as GameStore,
        },
      ],
    });
  });

  const feed = (): ActivityFeedComponent =>
    TestBed.createComponent(ActivityFeedComponent).componentInstance;

  it('says nothing has happened yet only when nothing has', () => {
    expect(feed().empty()).toBe('feed.empty.none');
  });

  it('says the log is not kept when the run has a history it cannot show', () => {
    lifetimeClosed.set(40_000);
    expect(feed().empty()).toBe('feed.empty.since');
  });
});

import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { BoardIcons } from '../../../@shared/data/board-icons.service';
import { GameClock } from '../../../game/data/game-clock.service';
import { TICKET_TYPE_IDS } from '../../../game/model/ticket.model';
import { HelpUiService } from '../../data/help-ui.service';
import { HelpModalComponent } from './help-modal.component';

describe('HelpModalComponent', () => {
  function modal(): HelpModalComponent {
    return TestBed.createComponent(HelpModalComponent).componentInstance;
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
  });

  it('holds the clock while it is open', () => {
    const component = modal();
    const clock = TestBed.inject(GameClock);

    TestBed.inject(HelpUiService).open();
    expect(component.shown()).toBe(true);
    expect(clock.paused()).toBe(true);

    component.dismiss();
    expect(component.shown()).toBe(false);
    expect(clock.paused()).toBe(false);
  });

  it('explains every ticket type once, each with its board card', () => {
    const tickets = new Map(TICKET_TYPE_IDS.map((id) => [id, `card:${id}`]));
    TestBed.inject(BoardIcons).publish({
      tickets,
      marks: new Map([
        ['golden', 'gold'],
        ['voted', 'vote'],
      ]),
      crew: new Map(),
      spawners: new Map(),
    });
    const component = modal();
    TestBed.inject(HelpUiService).open();

    const rows = [...component.line(), ...component.special()];

    expect(rows.map((row) => row.key).sort()).toEqual(
      [...TICKET_TYPE_IDS].sort()
    );
    expect(rows.every((row) => row.image === `card:${row.key}`)).toBe(true);
    expect(component.marks().map((row) => row.image)).toEqual(['gold', 'vote']);
  });
});

import { inject, Injectable } from '@angular/core';

import { FinaleService } from '../../@shared/data/finale.service';

import type { PurchaseId } from '../model/balance/progression';
import { NO_TICKET } from '../model/board.model';
import type { TicketTypeId } from '../model/ticket.model';
import { addTicket } from '../util/board';
import { GameClock } from './game-clock.service';
import { GameStore } from './game.store';
import { SaveService } from './save.service';

export interface HarnessDoors {
  grant(budget: number, storyPoints: number): void;
  reset(): void;
  endRound(): void;
  startRound(): void;
  buySkill(id: string): boolean;
  buyLine(line: PurchaseId): boolean;
  buySpawner(adr: number): boolean;
  /** Drops one card on the board; `NO_TICKET` when there is no room. */
  place(type: TicketTypeId, golden?: boolean): number;
  /** Opens the curtain call; `true` skips the roll to the thank-you. */
  finale(curtain?: boolean): void;
}

interface HarnessGlobal {
  debtGrowth?: HarnessDoors;
}

@Injectable({ providedIn: 'root' })
export class HarnessDoor {
  #store = inject(GameStore);
  #save = inject(SaveService);
  #clock = inject(GameClock);
  #finale = inject(FinaleService);

  open(): void {
    (globalThis as unknown as HarnessGlobal).debtGrowth = {
      grant: (budget, storyPoints) => this.#store.grant(budget, storyPoints),
      reset: () => {
        this.#store.reset(this.#clock.now());
        this.#save.wipe();
      },
      endRound: () => this.#store.endRoundNow(this.#clock.now()),
      startRound: () => void this.#store.startRound(this.#clock.now()),
      buySkill: (id) => this.#store.buySkill(id),
      buyLine: (line) => this.#store.buyLine(line),
      buySpawner: (adr) => this.#store.buySpawner(adr),
      place: (type, golden = false) => {
        const ticket = addTicket(
          this.#store.board,
          type,
          Math.random,
          false,
          false,
          golden
        );
        return ticket ? ticket.id : NO_TICKET;
      },
      finale: (curtain = false) => {
        this.#finale.open();
        if (curtain) this.#finale.curtain();
      },
    };
  }
}

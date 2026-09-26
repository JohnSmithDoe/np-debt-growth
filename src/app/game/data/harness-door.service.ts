import { inject, Injectable } from '@angular/core';

import type { PurchaseId } from '../model/balance/progression';
import { NO_TICKET } from '../model/board.model';
import type { TicketTypeId } from '../model/ticket.model';
import { addTicket } from '../util/board';
import { GameStore } from './game.store';
import { SaveService } from './save.service';

export interface HarnessDoors {
  grant(budget: number, storyPoints: number): void;
  reset(): void;
  endRound(): void;
  startRound(): void;
  buySkill(id: string): boolean;
  buyLine(line: PurchaseId): boolean;
  /** Drops one card on the board; `NO_TICKET` when there is no room. */
  place(type: TicketTypeId, golden?: boolean): number;
}

interface HarnessGlobal {
  debtGrowth?: HarnessDoors;
}

@Injectable({ providedIn: 'root' })
export class HarnessDoor {
  #store = inject(GameStore);
  #save = inject(SaveService);

  open(): void {
    (globalThis as unknown as HarnessGlobal).debtGrowth = {
      grant: (budget, storyPoints) => this.#store.grant(budget, storyPoints),
      reset: () => {
        this.#store.reset(Date.now());
        this.#save.wipe();
      },
      endRound: () => this.#store.endRoundNow(Date.now()),
      startRound: () => void this.#store.startRound(Date.now()),
      buySkill: (id) => this.#store.buySkill(id),
      buyLine: (line) => this.#store.buyLine(line),
      place: (type, golden = false) => {
        const ticket = addTicket(this.#store.board, type);
        if (!ticket) return NO_TICKET;
        ticket.golden = golden;
        return ticket.id;
      },
    };
  }
}

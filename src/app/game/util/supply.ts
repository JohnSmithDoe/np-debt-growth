import type { Board } from '../model/board.model';
import { voteCount } from '../model/board.model';
import type { Consultancy } from '../model/consultancy.model';
import type { Weather } from '../model/hazard.model';
import { CALM } from '../model/hazard.model';
import { TICKET_TYPES, TICKET_TYPE_IDS } from '../model/ticket.model';
import { SPAWN_BURST_CAP, VOTE_SPREAD_MS } from '../model/balance/flow';
import { addTicket } from './board';
import * as economy from './economy';
import { heldBack, scriptedSpawns } from './first-act';
import type { SpawnBudget } from './spawn-budget';

export function spawnInto(
  board: Board,
  budget: SpawnBudget,
  state: Consultancy,
  seconds: number,
  rand: () => number = Math.random,
  weather: Weather = CALM
): void {
  const from = state.runMs;
  const to = from + seconds * 1000;
  const interest = economy.debtInterest(state);
  const golden = economy.goldenChance(state);

  for (const id of TICKET_TYPE_IDS) {
    if (heldBack(id, from, state.tier)) continue;
    const storm = id === 'incident' ? weather.incidentRate : 1;
    const drought = TICKET_TYPES[id].handOnly ? 1 : weather.supply;
    const rate = economy.spawnRate(state, id) * storm * drought;
    if (rate <= 0) continue;
    const due = budget.due(id, rate, seconds, SPAWN_BURST_CAP, rand);
    if (due === 0) continue;
    const dearer = interest > 0 ? economy.interestTarget(state, id) : null;
    for (let n = 0; n < due; n++) {
      const arriving = dearer && rand() < interest ? dearer : id;
      const ticket = addTicket(
        board,
        arriving,
        rand,
        false,
        false,
        rand() < golden
      );
      if (ticket && !ticket.golden) {
        ticket.voteMask = economy.voteMask(
          state,
          from + n * VOTE_SPREAD_MS,
          ticket.y
        );
        ticket.spBonus =
          voteCount(ticket.voteMask) * economy.voteBonusPerCrossing(state);
      }
    }
  }

  for (const id of scriptedSpawns(from, to)) addTicket(board, id, rand);
}

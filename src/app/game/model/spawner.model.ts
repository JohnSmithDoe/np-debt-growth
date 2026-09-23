import type { TicketTypeId } from './ticket.model';
import { tierBlurbKey, tierNameKey } from './tier.model';

/**
 * The people on the path. One line per ADR: you buy developers who commit
 * worse code, and bill the client to clean up after them. A line's count
 * scales the arrival rate of the ticket it produces.
 */
export interface Spawner {
  readonly adr: number;
  readonly produces: readonly TicketTypeId[];
  readonly cost: number;
  readonly labelKey: string;
}

export const SPAWNER_CAP = 50;

/** Each level costs this much more than the one before it. */
export const SPAWNER_COST_STEP = 1.15;

/** ADR-0 arrives staffed, so the board is never empty on the first frame. */
export const SPAWNER_FREE_AT_ADR_0 = 1;

/** ADR 1-8 already name their own source in the tier copy; ADR-0 is new. */
export const spawnerLabelKey = (adr: number): string =>
  adr === 0 ? 'spawner.0.label' : tierNameKey(adr);
export const spawnerBlurbKey = (adr: number): string =>
  adr === 0 ? 'spawner.0.blurb' : tierBlurbKey(adr);

export const SPAWNERS: readonly Spawner[] = [
  {
    adr: 0,
    produces: ['lint', 'bug'],
    cost: 2,
    labelKey: spawnerLabelKey(0),
  },
  { adr: 1, produces: ['legacy'], cost: 32, labelKey: spawnerLabelKey(1) },
  { adr: 2, produces: ['flaky'], cost: 160, labelKey: spawnerLabelKey(2) },
  { adr: 3, produces: ['conflict'], cost: 875, labelKey: spawnerLabelKey(3) },
  { adr: 4, produces: ['slop'], cost: 5_000, labelKey: spawnerLabelKey(4) },
  {
    adr: 5,
    produces: ['rockstar'],
    cost: 35_000,
    labelKey: spawnerLabelKey(5),
  },
  {
    adr: 6,
    produces: ['zombie'],
    cost: 275_000,
    labelKey: spawnerLabelKey(6),
  },
  {
    adr: 7,
    produces: ['rewrite'],
    cost: 2_400_000,
    labelKey: spawnerLabelKey(7),
  },
  {
    adr: 8,
    produces: ['swarm'],
    cost: 22_500_000,
    labelKey: spawnerLabelKey(8),
  },
];

export const SPAWNER_BY_ADR = new Map(SPAWNERS.map((row) => [row.adr, row]));

const BY_TICKET = new Map<TicketTypeId, Spawner>(
  SPAWNERS.flatMap((row) => row.produces.map((id) => [id, row] as const))
);

export function spawnerFor(id: TicketTypeId): Spawner | undefined {
  return BY_TICKET.get(id);
}

/** Every ticket a line drops, in rung order — the income tab's rows. */
export const SPAWNED_TICKET_IDS: readonly TicketTypeId[] = SPAWNERS.flatMap(
  (row) => row.produces
);

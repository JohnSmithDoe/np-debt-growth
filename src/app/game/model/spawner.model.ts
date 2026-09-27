/* SPAWNER_COST_STEP is single precision: 500 × 1.15 floors to 574, not 575. */
import type { TicketTypeId } from './ticket.model';
import { tierBlurbKey, tierNameKey } from './tier.model';

export interface Spawner {
  readonly adr: number;
  readonly produces: readonly TicketTypeId[];
  readonly cost: number;
  readonly labelKey: string;
}

export const SPAWNER_CAP = 50;

export const SPAWNER_COST_STEP = Math.fround(1.15);

export const SPAWNER_FREE_HEADS = 1;

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
  { adr: 1, produces: ['legacy'], cost: 500, labelKey: spawnerLabelKey(1) },
  { adr: 2, produces: ['flaky'], cost: 15_000, labelKey: spawnerLabelKey(2) },
  {
    adr: 3,
    produces: ['conflict'],
    cost: 87_500,
    labelKey: spawnerLabelKey(3),
  },
  { adr: 4, produces: ['slop'], cost: 500_000, labelKey: spawnerLabelKey(4) },
  {
    adr: 5,
    produces: ['rockstar'],
    cost: 3_500_000,
    labelKey: spawnerLabelKey(5),
  },
  {
    adr: 6,
    produces: ['zombie'],
    cost: 27_500_000,
    labelKey: spawnerLabelKey(6),
  },
  {
    adr: 7,
    produces: ['rewrite'],
    cost: 240_000_000,
    labelKey: spawnerLabelKey(7),
  },
  {
    adr: 8,
    produces: ['swarm'],
    cost: 2_250_000_000,
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

export const SPAWNED_TICKET_IDS: readonly TicketTypeId[] = SPAWNERS.flatMap(
  (row) => row.produces
);

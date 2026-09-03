import type { CrewKind } from './crew.model';

export interface CastEntry {
  readonly skin: string;
  readonly name: string;
}

export const CAST = [
  { skin: 'junior-f-01', name: 'Mara' },
  { skin: 'junior-f-02', name: 'Iris' },
  { skin: 'junior-f-03', name: 'Noor' },
  { skin: 'junior-f-04', name: 'Lena' },
  { skin: 'junior-f-05', name: 'Sofia' },
  { skin: 'junior-f-06', name: 'Ayla' },
  { skin: 'junior-f-07', name: 'Ida' },
  { skin: 'junior-f-08', name: 'Petra' },
  { skin: 'junior-f-09', name: 'Nina' },
  { skin: 'junior-f-10', name: 'Elif' },
  { skin: 'junior-f-11', name: 'Tessa' },
  { skin: 'junior-f-12', name: 'Ruth' },
  { skin: 'junior-f-13', name: 'Juno' },
  { skin: 'junior-m-01', name: 'Tomas' },
  { skin: 'junior-m-02', name: 'Bela' },
  { skin: 'junior-m-03', name: 'Kai' },
  { skin: 'junior-m-04', name: 'Otto' },
  { skin: 'junior-m-05', name: 'Ravi' },
  { skin: 'junior-m-06', name: 'Milan' },
  { skin: 'junior-m-07', name: 'Anton' },
  { skin: 'junior-m-08', name: 'Nils' },
  { skin: 'junior-m-09', name: 'Emre' },
  { skin: 'junior-m-10', name: 'Jonas' },
  { skin: 'junior-m-11', name: 'Piet' },
  { skin: 'junior-m-12', name: 'Sven' },
  { skin: 'junior-m-13', name: 'Luka' },
  { skin: 'junior-m-14', name: 'Yusuf' },
  { skin: 'junior-m-15', name: 'Bram' },
  { skin: 'junior-m-16', name: 'Timo' },
  { skin: 'junior-m-17', name: 'Aleks' },
  { skin: 'junior-m-18', name: 'Hugo' },
  { skin: 'junior-m-19', name: 'Dario' },
  { skin: 'junior-m-20', name: 'Finn' },
  { skin: 'junior-m-21', name: 'Casper' },
  { skin: 'junior-m-22', name: 'Ilya' },
  { skin: 'junior-m-23', name: 'Marek' },
  { skin: 'junior-m-24', name: 'Rune' },
  { skin: 'junior-m-25', name: 'Joris' },
  { skin: 'junior-m-26', name: 'Tarek' },
  { skin: 'junior-m-27', name: 'Vito' },
  { skin: 'junior-m-28', name: 'Enzo' },
  { skin: 'junior-m-29', name: 'Lars' },
  { skin: 'junior-m-30', name: 'Nico' },
  { skin: 'junior-m-31', name: 'Wim' },
  { skin: 'manager-f-01', name: 'Solveig' },
  { skin: 'manager-f-02', name: 'Annika' },
  { skin: 'manager-m-01', name: 'Falk' },
  { skin: 'manager-m-02', name: 'Cornelis' },
  { skin: 'manager-m-03', name: 'Ruben' },
  { skin: 'manager-m-04', name: 'Matthias' },
  { skin: 'senior-f-01', name: 'Priya' },
  { skin: 'senior-f-02', name: 'Astrid' },
  { skin: 'senior-f-03', name: 'Halina' },
  { skin: 'senior-f-04', name: 'Yvonne' },
  { skin: 'senior-f-05', name: 'Beata' },
  { skin: 'senior-f-06', name: 'Marisol' },
  { skin: 'senior-m-01', name: 'Gustav' },
  { skin: 'senior-m-02', name: 'Roland' },
  { skin: 'senior-m-03', name: 'Ferenc' },
  { skin: 'senior-m-04', name: 'Bassam' },
  { skin: 'senior-m-05', name: 'Ingmar' },
  { skin: 'senior-m-06', name: 'Dmitri' },
  { skin: 'senior-m-07', name: 'Klaus' },
  { skin: 'senior-m-08', name: 'Alvaro' },
  { skin: 'senior-m-09', name: 'Hendrik' },
  { skin: 'senior-m-10', name: 'Osman' },
  { skin: 'senior-m-11', name: 'Pavel' },
  { skin: 'senior-m-12', name: 'Cesar' },
  { skin: 'senior-m-13', name: 'Norbert' },
  { skin: 'senior-m-14', name: 'Rasheed' },
] as const satisfies readonly CastEntry[];

export type CastSkin = (typeof CAST)[number]['skin'];

export const CAST_PREFIX = {
  juniors: 'junior',
  seniors: 'senior',
  managers: 'manager',
  offshore: 'junior',
} as const satisfies Record<CrewKind, string>;

interface CastPool {
  readonly men: readonly number[];
  readonly women: readonly number[];
}

const indicesFor = (prefix: string): readonly number[] =>
  CAST.flatMap((entry, index) =>
    entry.skin.startsWith(prefix) ? [index] : []
  );

const CAST_POOLS: Record<CrewKind, CastPool> = {
  juniors: {
    men: indicesFor('junior-m'),
    women: indicesFor('junior-f'),
  },
  seniors: {
    men: indicesFor('senior-m'),
    women: indicesFor('senior-f'),
  },
  managers: {
    men: indicesFor('manager-m'),
    women: indicesFor('manager-f'),
  },
  offshore: {
    men: indicesFor('junior-m'),
    women: indicesFor('junior-f'),
  },
};

const poolOf = (crew: CrewKind, woman: boolean): readonly number[] =>
  woman ? CAST_POOLS[crew].women : CAST_POOLS[crew].men;

export function castPoolSize(crew: CrewKind, woman: boolean): number {
  return poolOf(crew, woman).length;
}

export function castIndex(
  crew: CrewKind,
  poolSeat: number,
  woman: boolean
): number {
  const pool = poolOf(crew, woman);
  return pool.length === 0 ? -1 : (pool[poolSeat % pool.length] ?? -1);
}

export function crewName(
  crew: CrewKind,
  poolSeat: number,
  woman: boolean
): string {
  return CAST[castIndex(crew, poolSeat, woman)]?.name ?? '';
}

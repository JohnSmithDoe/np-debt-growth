export const SPAWNER_CAST = [
  ['spawner-0'],
  ['spawner-1'],
  ['spawner-2'],
  ['spawner-3'],
  ['spawner-4'],
  ['spawner-5'],
  ['spawner-6'],
  ['spawner-7'],
  ['spawner-8a', 'spawner-8b', 'spawner-8c'],
] as const;

export type SpawnerSkin = (typeof SPAWNER_CAST)[number][number];

export const SPAWNER_SKINS: readonly SpawnerSkin[] = SPAWNER_CAST.flat();

export function spawnerSkins(adr: number): readonly SpawnerSkin[] {
  return SPAWNER_CAST[adr] ?? SPAWNER_CAST[0];
}

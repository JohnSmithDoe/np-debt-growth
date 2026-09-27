/** Each tier's title screen and ADR plate, shipped un-pixelated by `tools/backdrop.mjs`. */
export const BACKDROP_KINDS = ['office', 'tier'] as const;
export type BackdropKind = (typeof BACKDROP_KINDS)[number];

export const backdropUrl = (tier: number, kind: BackdropKind): string =>
  `assets/board/backdrop/${tier}-${kind}.webp`;

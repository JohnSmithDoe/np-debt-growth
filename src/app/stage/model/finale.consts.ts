/*
 * bigFrom: taller views draw the crew at 1.5x, which lands on whole backing pixels at 2x DPR.
 */
export const FINALE_ART = {
  key: 'cb-finale-party',
  url: 'assets/art/screen/finale-party.webp',
  width: 1024,
  height: 512,
  footY: 400,
  left: 270,
  right: 770,
  buffet: { x: 360, y: 430 },
  decks: { x: 700, y: 400 },
  heightShare: 0.64,
  widthShare: 1.3,
} as const;

export const FINALE_CAST = {
  bigFrom: 960,
  enterEveryMs: 110,
  runSpeed: 250,
  walkSpeed: 150,
  edge: 40,
  margin: 28,
  arriveWithin: 3,
} as const;

export const FINALE_MOOD = {
  wanderRestMs: [1400, 4200],
  chatPoseMs: [900, 2600],
  danceEveryMs: [700, 1300],
  sitShare: 0.25,
  danceShare: 0.15,
  cakeEveryMs: 11_000,
  cakeLieMs: 2600,
} as const;

export const FINALE_PHOTO = {
  bottom: 22,
  rowGap: 27,
  spacing: 34,
  widthShare: 0.94,
  settleMs: 7000,
  cheerEveryMs: 2800,
  cheerPoseShare: 0.3,
  cheerPoseMs: 900,
} as const;

export const FINALE_LIGHTS = {
  key: 'cb-finale-light',
  size: 128,
  inks: [0xff5a5a, 0x5ad1ff, 0xffe05a, 0x9b6bff, 0x5aff8a, 0xff8ad8],
  alpha: 0.2,
  radius: 150,
  depth: 100_000,
} as const;

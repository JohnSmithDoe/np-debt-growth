import { MAX_TIER } from '../../game/model/tier.model';

import { TITLE_ART_URL } from './title-art';

const OFFICE = 'assets/art/office';

const TIER_OFFICE: Readonly<Record<number, string>> = {
  1: `${OFFICE}/3am.png`,
  2: `${OFFICE}/printer.png`,
  3: `${OFFICE}/kanban.png`,
  4: `${OFFICE}/spaghetti.png`,
  5: `${OFFICE}/burndown.png`,
  6: `${OFFICE}/serverroom.png`,
  7: `${OFFICE}/heap.png`,
  8: `${OFFICE}/flood.png`,
};

export const officeArtFor = (tier: number): string =>
  TIER_OFFICE[tier] ?? TITLE_ART_URL;

export const CLOSING_OFFICE_ART = `${OFFICE}/tower.png`;

export interface OfficeFrame {
  readonly index: number;
  readonly art: string;
  readonly caption: string;
  readonly missed: boolean;
}

export function officeFilmstrip(
  tier: number,
  ended: boolean,
  tierName: (index: number) => string
): readonly OfficeFrame[] {
  const frames: OfficeFrame[] = [];

  for (let index = 1; index <= MAX_TIER; index++) {
    frames.push({
      index,
      art: officeArtFor(index),
      caption: `ADR-${index} · ${tierName(index)}`,
      missed: index > tier,
    });
  }

  if (ended) {
    frames.push({
      index: MAX_TIER + 1,
      art: CLOSING_OFFICE_ART,
      caption: 'The engagement, from outside',
      missed: false,
    });
  }

  return frames;
}

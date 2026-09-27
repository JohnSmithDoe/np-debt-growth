import { MAX_TIER } from '../../game/model/tier.model';

import { backdropUrl } from '../../@shared/util/backdrop-art';

import { TITLE_ART_URL } from './title-art';

export const officeArtFor = (tier: number): string =>
  tier >= 1 && tier <= MAX_TIER ? backdropUrl(tier, 'office') : TITLE_ART_URL;

export const CLOSING_OFFICE_ART = 'assets/art/office/tower.webp';

export interface OfficeFrame {
  readonly index: number;
  readonly art: string;
  readonly caption: string;
  readonly missed: boolean;
}

export function officeFilmstrip(
  tier: number,
  ended: boolean,
  tierName: (index: number) => string,
  outside: string
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
      caption: outside,
      missed: false,
    });
  }

  return frames;
}

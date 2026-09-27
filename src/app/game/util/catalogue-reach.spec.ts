import { describe, expect, it } from 'vitest';

import { DE } from '../../@shared/util/i18n/catalogue/de';
import { EN } from '../../@shared/util/i18n/catalogue/en';
import { LANGUAGES } from '../../@shared/util/i18n/language.model';

import { HAZARDS, hazardLabelKey } from '../model/hazard.model';
import { KIT_PLAN, kitBlurbKey, kitLabelKey } from '../model/kit.model';
import {
  OFFICE_PLAN,
  officeBlurbKey,
  officeLabelKey,
} from '../model/office.model';
import { TRAIT_IDS, traitBlurbKey, traitLabelKey } from '../model/senior.model';
import {
  SKILL_NODES,
  skillBlurbKey,
  skillLabelKey,
} from '../model/skill.model';
import {
  TICKET_TITLE_COUNTS,
  ticketTitleKey,
} from '../model/ticket-copy.model';
import {
  TICKET_TYPE_IDS,
  ticketHelpKey,
  ticketLabelKey,
} from '../model/ticket.model';
import {
  ADR_PARTS,
  adrPartKey,
  DEBT_TIERS,
  tierBlurbKey,
  tierNameKey,
} from '../model/tier.model';
import { AWARDS, awardBlurbKey, awardLabelKey } from '../model/award.model';
import { PURCHASE_IDS } from '../model/balance/progression';

const BUILT: readonly { readonly owns: RegExp; readonly keys: string[] }[] = [
  {
    owns: /^skill\.[A-Za-z0-9]+\.(?:\d+\.label|blurb)$/,
    keys: SKILL_NODES.flatMap((node) =>
      node.heading === true
        ? [skillLabelKey(node.id)]
        : [
            skillBlurbKey(node.id),
            ...node.levels.map((_, at) => skillLabelKey(node.id, at + 1)),
          ]
    ),
  },
  {
    owns: /^tier\.\d+\./,
    keys: DEBT_TIERS.flatMap((tier) => [
      tierNameKey(tier.index),
      tierBlurbKey(tier.index),
    ]),
  },
  {
    owns: /^adr\.\d+\./,
    keys: DEBT_TIERS.flatMap((tier) =>
      ADR_PARTS.map((part) => adrPartKey(tier.index, part))
    ),
  },
  {
    owns: /^award\.[a-z0-9-]+\.(?:label|blurb)$/,
    keys: AWARDS.flatMap((award) => [
      awardLabelKey(award.id),
      awardBlurbKey(award.id),
    ]),
  },
  {
    owns: /^ticket\.type\./,
    keys: TICKET_TYPE_IDS.map(ticketLabelKey),
  },
  {
    owns: /^help\.ticket\./,
    keys: TICKET_TYPE_IDS.map(ticketHelpKey),
  },
  {
    owns: /^ticket\.title\./,
    keys: TICKET_TYPE_IDS.flatMap((id) =>
      Array.from({ length: TICKET_TITLE_COUNTS[id] }, (_, at) =>
        ticketTitleKey(id, at)
      )
    ),
  },
  {
    owns: /^hazard\.[a-z-]+\.(?:label|blurb)$/,
    keys: HAZARDS.map((row) => hazardLabelKey(row.id)),
  },
  {
    owns: /^office\.[a-z-]+\.(?:label|blurb)$/,
    keys: OFFICE_PLAN.flatMap((plate) => [
      officeLabelKey(plate.id),
      officeBlurbKey(plate.id),
    ]),
  },
  {
    owns: /^kit\.[a-z-]+\.(?:label|blurb)$/,
    keys: KIT_PLAN.flatMap((item) => [
      kitLabelKey(item.id),
      kitBlurbKey(item.id),
    ]),
  },
  {
    owns: /^trait\./,
    keys: TRAIT_IDS.flatMap((id) => [traitLabelKey(id), traitBlurbKey(id)]),
  },
  {
    owns: /^purchase\.[a-z]+\.(?:label|blurb|effect|category|initials)$/,
    keys: [
      // The rail names every line now, so every line owes a label.
      ...PURCHASE_IDS.flatMap((line) => [
        `purchase.${line}.effect`,
        `purchase.${line}.label`,
      ]),
    ],
  },
  {
    owns: /^language\./,
    keys: [...LANGUAGES].map((code) => `language.${code}`),
  },
];

describe('the catalogue and the models agree', () => {
  it('has words for every key the game builds, in both cuts', () => {
    const missing = BUILT.flatMap(({ keys }) =>
      keys.filter((key) => !(key in EN) || !(key in DE))
    );

    expect(missing).toEqual([]);
  });

  it('carries no words under a built prefix that nothing can ask for', () => {
    const stale = BUILT.flatMap(({ owns, keys }) => {
      const owned = new Set(keys);
      return Object.keys(EN).filter((key) => owns.test(key) && !owned.has(key));
    });

    expect(stale).toEqual([]);
  });

  it('gives no two squares the same name', () => {
    const labels = SKILL_NODES.flatMap((node) =>
      node.levels.map((_, at) => EN[skillLabelKey(node.id, at + 1)] ?? '')
    );
    const seen = new Set<string>();
    const twice = labels.filter((label) => !seen.add(label));

    expect(twice).toEqual([]);
  });
});

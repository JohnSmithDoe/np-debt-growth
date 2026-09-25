import { existsSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { SKILL_NODES } from '../../game/model/skill.model';
import {
  SKILL_ICON_FILES,
  skillIconOf,
  skillIconUrl,
} from '../model/skill-icon.model';

const onDisk = (icon: string): boolean =>
  existsSync(`src/${skillIconUrl(icon)}`);

describe('skill icons', () => {
  it('draws every square with an icon, never a two-letter code', () => {
    const bare = SKILL_NODES.filter(
      (node) => node.heading !== true && skillIconOf(node.id) === null
    ).map((node) => node.id);
    expect(bare).toEqual([]);
  });

  it('preloads only files the build ships', () => {
    expect(SKILL_ICON_FILES.filter((icon) => !onDisk(icon))).toEqual([]);
  });
});

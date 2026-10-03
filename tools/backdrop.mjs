#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

const STAGING = new URL('../image-staging/', import.meta.url).pathname;
const OUT = new URL('../src/assets/board/backdrop/', import.meta.url).pathname;

const TIERS = [
  { office: 'title-elevator', tier: 'screen-promotion' },
  { office: 'title-3am', tier: 'tier1-legacy-framework' },
  { office: 'title-printer', tier: 'tier2-copy-paste' },
  { office: 'title-kanban', tier: 'tier3-offshore' },
  { office: 'title-spaghetti', tier: 'tier4-ai-slop' },
  { office: 'title-burndown', tier: 'tier5-rockstar' },
  { office: 'title-serverroom', tier: 'tier6-zombie' },
  { office: 'title-heap', tier: 'tier7-big-rewrite' },
  { office: 'title-flood', tier: 'tier8-agent-swarm' },
];

const SCREENS = [
  { take: 'title-tower', out: 'src/assets/art/office/tower.webp' },
  { take: 'screen-post-mortem', out: 'src/assets/art/screen/post-mortem.webp' },
  {
    take: 'finale-party-office.948449612',
    out: 'src/assets/art/screen/finale-party.webp',
  },
];

const TREE = [
  'tree-whiteboard.285961884',
  'tree-blueprint.520904666',
  'tree-copy-paste.770108842',
  'tree-blueprint.576055726',
  'tree-ai-slop.779512895',
  'tree-rockstar.183248022',
  'tree-zombie.654163032',
  'tree-big-rewrite.78097455',
  'tree-agent-swarm.843320202',
];
SCREENS.push(
  ...TREE.map((take, tier) => ({
    take,
    out: `src/assets/art/tree/${tier}.webp`,
  }))
);

const quality = process.argv.find((a) => a.startsWith('--quality='));
const staged = await readdir(STAGING);
await mkdir(OUT, { recursive: true });
await mkdir(new URL('../src/assets/art/tree/', import.meta.url).pathname, {
  recursive: true,
});

for (const [tier, takes] of TIERS.entries()) {
  for (const [kind, name] of Object.entries(takes)) {
    const take = staged.find(
      (file) => file.startsWith(`${name}.`) && file.endsWith('.png')
    );
    if (!take) {
      console.error(`missing take: ${name}.*.png in image-staging/`);
      process.exit(1);
    }
    const out = join(OUT, `${tier}-${kind}.webp`);
    await run('cwebp', [
      '-quiet',
      '-q',
      quality?.split('=')[1] ?? '82',
      join(STAGING, take),
      '-o',
      out,
    ]);
    console.log(`${take} → ${out}`);
  }
}

for (const { take: name, out } of SCREENS) {
  const take = staged.find(
    (file) => file.startsWith(`${name}.`) && file.endsWith('.png')
  );
  if (!take) {
    console.error(`missing take: ${name}.*.png in image-staging/`);
    process.exit(1);
  }
  const target = new URL(`../${out}`, import.meta.url).pathname;
  await run('cwebp', [
    '-quiet',
    '-q',
    quality?.split('=')[1] ?? '82',
    join(STAGING, take),
    '-o',
    target,
  ]);
  console.log(`${take} → ${target}`);
}

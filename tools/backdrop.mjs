#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

const STAGING = new URL('../image-staging/', import.meta.url).pathname;
const OUT = new URL('../src/assets/board/backdrop/', import.meta.url).pathname;

/**
 * Board backdrops per tier, the un-pixelated takes as art-batch.mjs names them.
 * `office` pairs a tier with its title screen, as console/util/office-art.ts does.
 */
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

const quality = process.argv.find((a) => a.startsWith('--quality='));
const staged = await readdir(STAGING);
await mkdir(OUT, { recursive: true });

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

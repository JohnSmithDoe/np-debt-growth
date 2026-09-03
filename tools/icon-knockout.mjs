#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { mkdir, readdir } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const inputs = args.filter((a) => !a.startsWith('--'));

const outDir = flag('outdir', null);
const grid = Number(flag('grid', 32));
const fuzz = Number(flag('fuzz', 22));
const PALETTE = flag('palette', null)
  ? new URL(`file://${resolve(flag('palette'))}`)
  : new URL('./palette.json', import.meta.url);

if (!inputs.length || !outDir) {
  console.error(
    'usage: icon-knockout.mjs <in.png…> --outdir=dir [--grid=32] [--fuzz=22]'
  );
  process.exit(64);
}
if (!Number.isFinite(grid) || grid < 8) {
  console.error(`--grid wants a size of at least 8 (got ${flag('grid')})`);
  process.exit(64);
}

async function paletteImage() {
  const { tokens, ramp } = JSON.parse(
    await (await import('node:fs/promises')).readFile(PALETTE, 'utf8')
  );
  const swatches = [...tokens, ...ramp];
  const path = join(
    process.env.TMPDIR ?? '/tmp',
    `cb-icons-${basename(PALETTE.pathname, '.json')}-${swatches.length}.png`
  );
  await run('magick', [
    '-size',
    '1x1',
    ...swatches.map((hex) => `xc:${hex}`),
    '+append',
    path,
  ]);
  return { path, count: swatches.length };
}

async function expand(patterns) {
  const out = [];
  for (const pattern of patterns) {
    if (!pattern.includes('*')) {
      out.push(resolve(pattern));
      continue;
    }
    const dir = resolve(dirname(pattern));
    const rx = new RegExp(
      `^${basename(pattern)
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')}$`
    );
    for (const name of await readdir(dir)) if (rx.test(name)) out.push(join(dir, name));
  }
  return out.sort();
}

function nodeIdOf(file) {
  const match = /^skill-([a-z0-9]+)\./.exec(basename(file));
  return match?.[1] ?? null;
}

const { path: palette, count } = await paletteImage();
const files = await expand(inputs);
await mkdir(resolve(outDir), { recursive: true });

const tmp = process.env.TMPDIR ?? '/tmp';
let refused = 0;

for (const file of files) {
  const id = nodeIdOf(file);
  if (!id) {
    console.log(`REFUSE ${basename(file)}  — not named skill-<id>.<seed>.png`);
    refused++;
    continue;
  }

  const [w, h] = (await run('magick', ['identify', '-format', '%w %h', file])).stdout
    .trim()
    .split(' ')
    .map(Number);
  const rgba = join(tmp, `cb-icon-${id}.rgba.png`);
  const mask = join(tmp, `cb-icon-${id}.a.png`);
  const flat = join(tmp, `cb-icon-${id}.rgb.png`);
  const target = join(resolve(outDir), `${id}.png`);

  await run('magick', [
    file,
    '-alpha', 'set', '-fuzz', `${fuzz}%`,
    '-fill', 'none', '-draw', 'alpha 0,0 floodfill',
    '-fill', 'none', '-draw', `alpha ${w - 1},0 floodfill`,
    '-fill', 'none', '-draw', `alpha 0,${h - 1} floodfill`,
    '-fill', 'none', '-draw', `alpha ${w - 1},${h - 1} floodfill`,
    '-trim', '+repage',
    '-filter', 'Box', '-resize', `${grid}x${grid}`,
    '-background', 'none', '-gravity', 'center', '-extent', `${grid}x${grid}`,
    rgba,
  ]);

  await run('magick', [rgba, '-alpha', 'extract', '-threshold', '50%', mask]);
  await run('magick', [
    rgba,
    '-background', 'black', '-alpha', 'remove', '-alpha', 'off',
    '-dither', 'None', '-remap', palette,
    flat,
  ]);
  await run('magick', [
    flat, mask, '-alpha', 'off', '-compose', 'CopyOpacity', '-composite',
    '-strip', target,
  ]);

  const ink = (await run('magick', [target, '-trim', '-format', '%wx%h', 'info:'])).stdout;
  console.log(`ok     ${id}.png  ${grid}x${grid}  ink ${ink}  (${count} colours)`);
}

if (refused) {
  console.error(`\n${refused} of ${files.length} refused.`);
  process.exit(1);
}
console.log(`\n${files.length} icons written to ${outDir}`);

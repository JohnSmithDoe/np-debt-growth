#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { mkdir, readFile, readdir } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const has = (name) => args.includes(`--${name}`);
const inputs = args.filter((a) => !a.startsWith('--'));

const PALETTE = flag('palette', null)
  ? new URL(`file://${resolve(flag('palette'))}`)
  : new URL('./palette.json', import.meta.url);

if (!inputs.length) {
  console.error(
    'usage: pixelate.mjs <in.png…> [--out=out.png | --outdir=dir] [--grid=380] [--exact] [--dither]'
  );
  process.exit(64);
}

const grid = Number(flag('grid', 380));
const exact = has('exact');
const dither = has('dither');
const outDir = flag('outdir', null);
const outFile = flag('out', null);
const crop = flag('crop', null);
const dim = Number(flag('dim', 100));

if (!Number.isFinite(dim) || dim <= 0) {
  console.error(`--dim wants a brightness percentage (got ${flag('dim')})`);
  process.exit(64);
}
if (crop && !/^\d+x\d+$/.test(crop)) {
  console.error(`--crop wants WxH (got ${crop})`);
  process.exit(64);
}

if (!Number.isFinite(grid) || grid < 16) {
  console.error(`--grid must be a width of at least 16 (got ${flag('grid')})`);
  process.exit(64);
}
if (outFile && inputs.length > 1) {
  console.error('--out takes one input; use --outdir for several.');
  process.exit(64);
}

async function paletteImage() {
  const { tokens, ramp } = JSON.parse(await readFile(PALETTE, 'utf8'));
  const swatches = [...tokens, ...ramp];
  const path = join(
    process.env.TMPDIR ?? '/tmp',
    `cb-${basename(PALETTE.pathname, '.json')}-${swatches.length}.png`
  );
  await run('magick', [
    '-size',
    '1x1',
    ...swatches.flatMap((hex) => [`xc:${hex}`]),
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
      `^${basename(pattern).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`
    );
    for (const name of await readdir(dir)) if (rx.test(name)) out.push(join(dir, name));
  }
  return out.sort();
}

const { path: palette, count } = await paletteImage();
const files = await expand(inputs);
if (outDir) await mkdir(resolve(outDir), { recursive: true });

for (const file of files) {
  const [rawW, rawH] = (
    await run('magick', ['identify', '-format', '%w %h', file])
  ).stdout
    .trim()
    .split(' ')
    .map(Number);
  const [w, h] = crop ? crop.split('x').map(Number) : [rawW, rawH];
  const rows = Math.max(1, Math.round((grid * h) / w));

  const target =
    outFile ??
    join(
      outDir ? resolve(outDir) : dirname(file),
      basename(file).replace(/\.png$/, '') + (outDir ? '.png' : '.8bit.png')
    );

  await run('magick', [
    file,
    ...(crop ? ['-gravity', 'center', '-crop', `${crop}+0+0`, '+repage'] : []),
    ...(dim === 100 ? [] : ['-modulate', `${dim},92`]),
    '-filter',
    'Box',
    '-resize',
    `${grid}x${rows}!`,
    '-dither',
    dither ? 'FloydSteinberg' : 'None',
    '-remap',
    palette,
    ...(exact ? [] : ['-filter', 'Point', '-resize', `${w}x${h}!`]),
    target,
  ]);

  console.log(`${basename(target)}  ${grid}x${rows} → ${exact ? `${grid}x${rows}` : `${w}x${h}`}  (${count} colours)`);
}

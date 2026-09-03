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

const crop = flag('crop', null);
const outDir = flag('outdir', null);
const outFile = flag('out', null);

if (!inputs.length) {
  console.error(
    'usage: tile-seam.mjs <in.png…> [--out=out.png | --outdir=dir] [--crop=512x512]'
  );
  process.exit(64);
}
if (crop && !/^\d+x\d+$/.test(crop)) {
  console.error(`--crop wants WxH (got ${crop})`);
  process.exit(64);
}
if (outFile && inputs.length > 1) {
  console.error('--out takes one input; use --outdir for several.');
  process.exit(64);
}

const isPowerOfTwo = (n) => n > 0 && (n & (n - 1)) === 0;

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

const files = await expand(inputs);
if (outDir) await mkdir(resolve(outDir), { recursive: true });

let rejected = 0;

for (const file of files) {
  const [rawW, rawH] = (
    await run('magick', ['identify', '-format', '%w %h', file])
  ).stdout
    .trim()
    .split(' ')
    .map(Number);

  const [w, h] = crop ? crop.split('x').map(Number) : [rawW, rawH];
  const target =
    outFile ??
    join(
      outDir ? resolve(outDir) : dirname(file),
      basename(file).replace(/\.png$/, '') + (outDir ? '.png' : '.tiled.png')
    );

  await run('magick', [
    file,
    ...(crop ? ['-gravity', 'center', '-crop', `${crop}+0+0`, '+repage'] : []),
    '(', '+clone', '-flop', ')', '+append',
    '(', '+clone', '-flip', ')', '-append',
    target,
  ]);

  const folded = w * 2;
  const square = w === h;
  const ok = square && isPowerOfTwo(folded);
  if (!ok) rejected++;
  console.log(
    `${ok ? 'ok    ' : 'REJECT'} ${basename(target)}  ${folded}x${h * 2}` +
      (square ? '' : '  — not square') +
      (isPowerOfTwo(folded) ? '' : `  — ${folded} is not a power of two`)
  );
}

if (rejected) {
  console.error(
    `\n${rejected} of ${files.length} will not tile under WebGL 1. Fix --crop so the folded size is a power of two.`
  );
  process.exit(1);
}

console.log(`\n${files.length} folded. Now: pixelate --grid=<half the folded size> --exact`);

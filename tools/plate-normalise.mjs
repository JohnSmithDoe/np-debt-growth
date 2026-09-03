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

const carpet = flag('carpet', '#d49e64');
const plate = Number(flag('plate', 256));
const tolerance = Number(flag('tolerance', 4));
const outDir = flag('outdir', null);
const outFile = flag('out', null);

if (!inputs.length) {
  console.error('usage: plate-normalise.mjs <in.png…> [--outdir=dir|--out=f.png] [--carpet=#rrggbb] [--plate=256]');
  process.exit(64);
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

async function dominant(file) {
  const { stdout } = await run('magick', [file, '-format', '%c', 'histogram:info:-']);
  const rows = stdout
    .trim()
    .split('\n')
    .map((line) => line.trim().match(/^\s*(\d+):.*(#[0-9A-Fa-f]{6})/))
    .filter(Boolean)
    .map((m) => [Number(m[1]), m[2].toLowerCase()]);
  rows.sort((a, b) => b[0] - a[0]);
  return rows[0]?.[1] ?? null;
}

async function cutAtBorder(file, own) {
  const { stdout: size } = await run('magick', ['identify', '-format', '%w %h', file]);
  const [w, h] = size.trim().split(' ').map(Number);
  const ring = [`${w}x1+0+0`, `${w}x1+0+${h - 1}`, `1x${h - 2}+0+1`, `1x${h - 2}+${w - 1}+1`];
  let dirty = 0;
  let total = 0;
  for (const geometry of ring) {
    const { stdout } = await run('magick', [
      file,
      '-crop',
      geometry,
      '+repage',
      '-fuzz',
      `${tolerance}%`,
      '-fill',
      'black',
      '-opaque',
      own,
      '-fill',
      'white',
      '+opaque',
      'black',
      '-format',
      '%[fx:mean*w*h] %[fx:w*h]',
      'info:',
    ]);
    const [notCarpet, area] = stdout.trim().split(' ').map(Number);
    dirty += notCarpet;
    total += area;
  }
  return dirty / total;
}

const files = await expand(inputs);
if (outDir) await mkdir(resolve(outDir), { recursive: true });

for (const file of files) {
  const own = await dominant(file);
  const cut = await cutAtBorder(file, own);
  const target = outFile ?? join(outDir ? resolve(outDir) : dirname(file), basename(file));

  await run('magick', [
    file,
    '-fuzz',
    `${tolerance}%`,
    '-fill',
    carpet,
    '-opaque',
    own,
    '-background',
    carpet,
    '-gravity',
    'center',
    '-extent',
    `${plate}x${plate}`,
    target,
  ]);

  const verdict = cut > 0.35 ? 'REJECT' : cut > 0.18 ? 'warn  ' : 'ok    ';
  console.log(
    `${verdict} ${basename(target).padEnd(32)} carpet ${own} → ${carpet}   cut ${(cut * 100).toFixed(0)}%`
  );
}

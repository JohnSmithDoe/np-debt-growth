#!/usr/bin/env node
/**
 * Cuts the played animations out of full LPC sheets and packs every character into one atlas.
 * Layout mirrors stage/model/lpc-sheet.model.ts; lpc-sheet.spec.ts asserts they agree. Needs ImageMagick 7.
 * Usage: node pack-sheets.mjs --in <dir of <skin>.png> --out <dir> [--name crew-atlas | finale-atlas]
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';

const LPC_FRAME = 64;
const LPC_DIRECTIONS = ['up', 'left', 'down', 'right'];
const LPC_BLOCKS = {
    spellcast: { row: 0, frames: 7 },
    walk: { row: 8, frames: 9 },
    slash: { row: 12, frames: 6 },
    hurt: { row: 20, frames: 6, directional: false },
    idle: { row: 22, frames: 2 },
    jump: { row: 26, frames: 5 },
    sit: { row: 30, frames: 3 },
    emote: { row: 34, frames: 3 },
    run: { row: 38, frames: 8 },
};

const LAYOUTS = {
    'crew-atlas': ['walk', 'slash', 'idle'].flatMap((block) => LPC_DIRECTIONS.map((d) => [block, d])),
    'finale-atlas': [
        ['run', 'left'],
        ['run', 'right'],
        ['jump', 'down'],
        ['sit', 'down'],
        ['emote', 'down'],
        ['spellcast', 'down'],
        ['hurt', 'down'],
    ],
};

const ATLAS_COLS = 64;
const SOURCE_COLS = 13;

const args = Object.fromEntries(
    process.argv
        .slice(2)
        .map((a, i, all) => (a.startsWith('--') ? [a.slice(2), all[i + 1]] : null))
        .filter(Boolean),
);
const inDir = resolve(args.in ?? 'src/assets/characters');
const outDir = resolve(args.out ?? inDir);
const name = args.name ?? 'crew-atlas';
const RUNS = LAYOUTS[args.layout ?? name];
if (!RUNS) throw new Error(`no layout ${args.layout ?? name}; known: ${Object.keys(LAYOUTS).join(', ')}`);
const PACKED_BLOCKS = [...new Set(RUNS.map(([block]) => block))];

const OFFSETS = [];
let running = 0;
for (const [block] of RUNS) {
    OFFSETS.push(running);
    running += LPC_BLOCKS[block].frames;
}
const FRAMES_PER_SKIN = running;

const magick = (...a) => execFileSync('magick', a, { stdio: ['ignore', 'pipe', 'pipe'] });

const skins = readdirSync(inDir)
    .filter((f) => f.endsWith('.png') && !Object.keys(LAYOUTS).some((layout) => f.startsWith(layout)))
    .map((f) => basename(f, '.png'))
    .sort();
if (!skins.length) throw new Error(`no sheets in ${inDir}`);

const work = mkdtempSync(join(tmpdir(), 'lpc-pack-'));
let written = 0;
try {
    for (const [skinIndex, skin] of skins.entries()) {
        const sheet = join(inDir, `${skin}.png`);
        const [w] = magick('identify', '-format', '%w %h', sheet).toString().split(' ').map(Number);
        if (Math.round(w / LPC_FRAME) < SOURCE_COLS) {
            throw new Error(`${skin}: ${Math.round(w / LPC_FRAME)} columns, expected at least ${SOURCE_COLS}`);
        }

        for (const [run, [block, direction]] of RUNS.entries()) {
            const { row, frames, directional = true } = LPC_BLOCKS[block];
            const sourceRow = directional ? row + LPC_DIRECTIONS.indexOf(direction) : row;
            const prefix = join(work, `${String(skinIndex * FRAMES_PER_SKIN + OFFSETS[run]).padStart(6, '0')}-`);
            magick(
                sheet,
                '-crop', `${frames * LPC_FRAME}x${LPC_FRAME}+0+${sourceRow * LPC_FRAME}`,
                '+repage',
                '-crop', `${LPC_FRAME}x${LPC_FRAME}`,
                '+repage',
                '+adjoin',
                `${prefix}%02d.png`,
            );
            written += frames;
        }
    }

    const tiles = readdirSync(work).filter((f) => f.endsWith(".png")).sort();
    if (tiles.length !== skins.length * FRAMES_PER_SKIN) {
        throw new Error(`packed ${tiles.length} frames, expected ${skins.length * FRAMES_PER_SKIN}`);
    }

    mkdirSync(outDir, { recursive: true });
    const atlas = join(outDir, `${name}.png`);

    const rows = [];
    for (let at = 0; at < tiles.length; at += ATLAS_COLS) {
        const row = join(work, `row-${String(rows.length).padStart(4, '0')}.strip`);
        magick(...tiles.slice(at, at + ATLAS_COLS).map((t) => join(work, t)), '-background', 'none', '+append', `png:${row}`);
        rows.push(row);
    }
    magick(...rows, '-background', 'none', '-append', atlas);

    const [aw, ah] = magick('identify', '-format', '%w %h', atlas).toString().split(' ').map(Number);

    const credits = skins
        .map((s) => {
            try {
                return `=== ${s} ===\n${readFileSync(join(inDir, `${s}.credits.txt`), 'utf8')}`;
            } catch {
                return `=== ${s} ===\n(no credits file found)\n`;
            }
        })
        .join('\n');
    if (name === 'crew-atlas') writeFileSync(join(outDir, `${name}.credits.txt`), credits);

    const manifest = { frame: LPC_FRAME, cols: ATLAS_COLS, framesPerSkin: FRAMES_PER_SKIN, blocks: PACKED_BLOCKS, skins };
    if (name !== 'crew-atlas') manifest.runs = RUNS.map((pair) => pair.join(' '));
    writeFileSync(join(outDir, `${name}.json`), JSON.stringify(manifest, null, 2) + '\n');

    const mib = (n) => `${(n / 1024 / 1024).toFixed(1)} MiB`;
    console.log(
        `Wrote ${atlas}\n  ${skins.length} skins × ${FRAMES_PER_SKIN} frames = ${tiles.length} frames, ${aw}×${ah}\n` +
            `  VRAM ${mib(aw * ah * 4)} (was ${mib(skins.length * 832 * 3456 * 4)} across ${skins.length} textures)\n` +
            `  skins: ${skins.join(', ')}`,
    );
} finally {
    rmSync(work, { recursive: true, force: true });
}

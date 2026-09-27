#!/usr/bin/env node
/**
 * pack-sheets.mjs — cut the used animations out of full LPC sheets and pack
 * every character into ONE atlas.
 *
 * A generated sheet is 832×3456 and 90% of it is dead weight: the board plays
 * walk, slash and idle, which is 68 frames of 702. Uncropped, four characters
 * cost 44 MiB of VRAM and four texture binds; packed they cost 4.3 MiB and one.
 * The saving is per character, so it is what makes a large cast affordable at
 * all — thirty-eight of them is 417 MiB unpacked and 41 MiB packed.
 *
 * Layout: frames are laid row-major across the whole atlas in a fixed order, so
 * a frame index is `skinIndex * FRAMES_PER_SKIN + local`. Nothing depends on
 * where a row happens to break, which is what lets the atlas stay under the
 * 16384px texture limit by growing in two dimensions rather than one — stacking
 * whole sheets vertically runs out at about twenty-one characters.
 *
 * Not power-of-two, deliberately: that matters for `SpriteGPULayer` UV sampling,
 * and the crew is drawn as ordinary Sprites. Padding to 4096×4096 would cost
 * more VRAM (64 MiB) than the frames it protects (41 MiB).
 *
 * Requires ImageMagick 7 (`magick`).
 *
 * Usage:
 *   node pack-sheets.mjs --in <dir of <skin>.png> --out <dir> [--name crew-atlas]
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';

/**
 * The layout, mirrored in `stage/model/lpc-sheet.model.ts`. Two copies because a
 * build script cannot import the app's TypeScript — so the atlas ships a
 * manifest and `lpc-sheet.spec.ts` asserts the two agree. Drift here silently
 * animates the wrong character, which is the one failure no gate can see.
 */
const LPC_FRAME = 64;
const LPC_DIRECTIONS = ['up', 'left', 'down', 'right'];
const LPC_BLOCKS = {
    walk: { row: 8, frames: 9 },
    slash: { row: 12, frames: 6 },
    idle: { row: 22, frames: 2 },
};
/** Order is the packing order; changing it renumbers every frame in the atlas. */
const PACKED_BLOCKS = ['walk', 'slash', 'idle'];

const OFFSETS = {};
let running = 0;
for (const block of PACKED_BLOCKS) {
    OFFSETS[block] = running;
    running += LPC_BLOCKS[block].frames * LPC_DIRECTIONS.length;
}
const FRAMES_PER_SKIN = running;

const packedLocal = (block, direction, frame) =>
    OFFSETS[block] + LPC_DIRECTIONS.indexOf(direction) * LPC_BLOCKS[block].frames + frame;

/** Frames per atlas row. 64 × 64px = 4096px wide, the common max texture size. */
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

const magick = (...a) => execFileSync('magick', a, { stdio: ['ignore', 'pipe', 'pipe'] });

const skins = readdirSync(inDir)
    .filter((f) => f.endsWith('.png') && !f.startsWith(name))
    .map((f) => basename(f, '.png'))
    .sort();
if (!skins.length) throw new Error(`no sheets in ${inDir}`);

const work = mkdtempSync(join(tmpdir(), 'lpc-pack-'));
let written = 0;
try {
    for (const [skinIndex, skin] of skins.entries()) {
        const sheet = join(inDir, `${skin}.png`);
        const [w] = magick('identify', '-format', '%w %h', sheet).toString().split(' ').map(Number);
        // A weapon widens the sheet for its oversized frames; the played rows keep their place.
        if (Math.round(w / LPC_FRAME) < SOURCE_COLS) {
            throw new Error(`${skin}: ${Math.round(w / LPC_FRAME)} columns, expected at least ${SOURCE_COLS}`);
        }

        for (const block of PACKED_BLOCKS) {
            const { row, frames } = LPC_BLOCKS[block];
            for (const [dir, direction] of LPC_DIRECTIONS.entries()) {
                // One call per source row: crop the run of frames, then split it.
                // Per-frame calls would be 68 processes a character instead of 12.
                const prefix = join(work, `${String(skinIndex * FRAMES_PER_SKIN + packedLocal(block, direction, 0)).padStart(6, '0')}-`);
                magick(
                    sheet,
                    '-crop', `${frames * LPC_FRAME}x${LPC_FRAME}+0+${(row + dir) * LPC_FRAME}`,
                    '+repage',
                    '-crop', `${LPC_FRAME}x${LPC_FRAME}`,
                    '+repage',
                    '+adjoin',
                    `${prefix}%02d.png`,
                );
                written += frames;
            }
        }
    }

    const tiles = readdirSync(work).filter((f) => f.endsWith(".png")).sort();
    if (tiles.length !== skins.length * FRAMES_PER_SKIN) {
        throw new Error(`packed ${tiles.length} frames, expected ${skins.length * FRAMES_PER_SKIN}`);
    }

    mkdirSync(outDir, { recursive: true });
    const atlas = join(outDir, `${name}.png`);

    // Rows with `+append`, then stack with `-append`. `montage` would be the
    // obvious tool and insists on loading a font even with no labels; this also
    // runs a handful of processes instead of one per frame. A short final row is
    // padded out to the widest, which is what keeps the grid row-major.
    const rows = [];
    for (let at = 0; at < tiles.length; at += ATLAS_COLS) {
        const row = join(work, `row-${String(rows.length).padStart(4, '0')}.strip`);
        magick(...tiles.slice(at, at + ATLAS_COLS).map((t) => join(work, t)), '-background', 'none', '+append', `png:${row}`);
        rows.push(row);
    }
    magick(...rows, '-background', 'none', '-append', atlas);

    const [aw, ah] = magick('identify', '-format', '%w %h', atlas).toString().split(' ').map(Number);

    // The credits are the licence obligation and must survive the merge.
    const credits = skins
        .map((s) => {
            try {
                return `=== ${s} ===\n${readFileSync(join(inDir, `${s}.credits.txt`), 'utf8')}`;
            } catch {
                return `=== ${s} ===\n(no credits file found)\n`;
            }
        })
        .join('\n');
    writeFileSync(join(outDir, `${name}.credits.txt`), credits);

    const manifest = { frame: LPC_FRAME, cols: ATLAS_COLS, framesPerSkin: FRAMES_PER_SKIN, blocks: PACKED_BLOCKS, skins };
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

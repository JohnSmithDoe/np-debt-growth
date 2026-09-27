#!/usr/bin/env node
/**
 * Drives the hosted Universal LPC generator and saves a PNG spritesheet + credits.txt; prints one JSON line.
 * Needs playwright-core (project or `npm i -g`) and system Chrome.
 * Usage: node export.mjs --out DIR [--name slug] (--preset NAME | --hash "k=v&…" | --url URL)
 *        [--timeout ms] [--channel chrome|chrome-beta|msedge|chromium] [--headed]
 */
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_BASE = 'https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/';

function loadPlaywright() {
    const bases = [join(process.cwd(), '__resolve__.js')];
    try {
        bases.push(join(execSync('npm root -g', { encoding: 'utf8' }).trim(), '__resolve__.js'));
    } catch {}
    for (const base of bases) {
        try {
            return createRequire(base)('playwright-core');
        } catch {}
    }
    console.log(JSON.stringify({ ok: false, error: 'playwright-core not found. Install once: npm i -g playwright-core (nvm: globals are per Node version)' }));
    process.exit(1);
}

function parseArgs(argv) {
    const out = {};
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (!a.startsWith('--')) continue;
        const key = a.slice(2);
        if (key === 'headed') out.headed = true;
        else out[key] = argv[++i];
    }
    return out;
}

function resolveHash(args) {
    if (args.preset) {
        const presets = JSON.parse(readFileSync(join(HERE, '..', 'presets.json'), 'utf8')).presets;
        const preset = presets[args.preset];
        if (!preset) throw new Error(`unknown preset "${args.preset}" — have: ${Object.keys(presets).join(', ')}`);
        return preset.hash;
    }
    if (args.url) {
        const i = args.url.indexOf('#');
        return i === -1 ? '' : args.url.slice(i + 1);
    }
    if (args.hash) return args.hash.replace(/^#/, '');
    throw new Error('Provide one of --preset, --hash or --url');
}

function probeCanvasInBrowser() {
    const canvas = ['#mithril-spritesheet-preview canvas', '#mithril-preview canvas', 'canvas']
        .map((s) => document.querySelector(s))
        .find((c) => c && c.width > 0 && c.height > 0);
    const ctx = canvas?.getContext('2d');
    if (!ctx) return { ready: false };
    let data;
    try {
        data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    } catch {
        return { ready: false };
    }
    let sum = 0;
    let nonEmpty = false;
    const step = Math.max(4, Math.floor(data.length / 4096) * 4);
    for (let i = 0; i < data.length; i += step) {
        sum = (sum + data[i] * 31 + data[i + 1] * 17 + data[i + 2] * 13 + data[i + 3] * 7) >>> 0;
        if (data[i + 3] !== 0) nonEmpty = true;
    }
    return { ready: true, sig: `${canvas.width}x${canvas.height}:${sum}`, nonEmpty };
}

async function waitForRenderSettle(page, timeout) {
    const deadline = Date.now() + timeout;
    let last = null;
    let stable = 0;
    while (Date.now() < deadline) {
        const probe = await page.evaluate(probeCanvasInBrowser);
        if (probe.ready && probe.nonEmpty) {
            if (probe.sig === last) {
                if (++stable >= 2) return true;
            } else {
                stable = 0;
                last = probe.sig;
            }
        }
        await page.waitForTimeout(350);
    }
    return false;
}

async function clickAndSave(page, buttonName, dest, timeout) {
    const button = page.locator('#download-buttons').getByRole('button', { name: buttonName, exact: true });
    const [download] = await Promise.all([page.waitForEvent('download', { timeout }), button.click()]);
    await download.saveAs(dest);
    return dest;
}

function pngSize(path) {
    const head = readFileSync(path).subarray(0, 33);
    return { width: head.readUInt32BE(16), height: head.readUInt32BE(20) };
}

function auditCredits(txt) {
    const assets = [];
    let current = null;
    for (const line of txt.split('\n')) {
        if (!line.trim()) continue;
        if (!/^\s/.test(line)) {
            current = { asset: line.trim(), licences: [] };
            assets.push(current);
        } else {
            const licence = line.match(/(OGA-BY[\d. ]*|CC-BY-SA[\d. ]*|CC-BY[\d. ]*|GPL[\d. ]*|CC0[\d. ]*)/)?.[1]?.trim();
            if (licence && current) current.licences.push(licence);
        }
    }
    const licensed = assets.filter((a) => a.licences.length);
    const permissive = (l) => l.startsWith('OGA-BY') || l.startsWith('CC0');
    return {
        assets: assets.length,
        incompatible: licensed.filter((a) => !a.licences.some((l) => permissive(l) || l.startsWith('GPL'))).map((a) => a.asset),
        copyleftOnly: licensed.filter((a) => !a.licences.some(permissive)).map((a) => a.asset),
    };
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const { chromium } = loadPlaywright();
    const hash = resolveHash(args);
    const url = `${(args.base ?? DEFAULT_BASE).replace(/#.*$/, '')}#${hash}`;
    const outDir = resolve(args.out ?? process.cwd());
    const name = args.name ?? args.preset ?? 'character';
    const timeout = Number(args.timeout ?? 60000);
    mkdirSync(outDir, { recursive: true });

    const pngPath = join(outDir, `${name}.png`);
    const creditsPath = join(outDir, `${name}.credits.txt`);

    const browser = await chromium.launch({ headless: !args.headed, channel: args.channel ?? 'chrome' });
    const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1400, height: 1000 } });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    try {
        await page.goto(url, { waitUntil: 'networkidle', timeout }).catch(() => page.goto(url, { waitUntil: 'domcontentloaded', timeout }));
        await page.waitForFunction(() => !!window.canvasRenderer, null, { timeout });
        await page.locator('#download-buttons').getByRole('button', { name: 'Spritesheet (PNG)', exact: true }).waitFor({ timeout });

        const settled = await waitForRenderSettle(page, timeout);
        const png = await clickAndSave(page, 'Spritesheet (PNG)', pngPath, timeout);
        const credits = await clickAndSave(page, 'Credits (TXT)', creditsPath, timeout);

        const { width, height } = pngSize(png);
        const audit = auditCredits(readFileSync(credits, 'utf8'));
        const summary = {
            ok: true,
            url,
            png,
            credits,
            pngBytes: statSync(png).size,
            width,
            height,
            columns: Math.round(width / 64),
            geometry: Math.round(width / 64) === 18 ? 'weapon' : 'base',
            creditedAssets: audit.assets,
            settled,
            warnings: [],
        };
        if (!settled) summary.warnings.push('render did not visibly settle; the PNG may be incomplete — re-run');
        if (!audit.assets) summary.warnings.push('0 credited assets — the hash matched nothing; run `catalog.mjs check` on it');
        if (audit.incompatible.length)
            summary.warnings.push(`no GPL-compatible election for an AGPL-3.0 repo — swap these layers: ${audit.incompatible.join(', ')}`);
        if (audit.copyleftOnly.length) summary.warnings.push(`copyleft-only layers, so the sheet is GPL-3.0: ${audit.copyleftOnly.join(', ')}`);
        if (pageErrors.length) summary.warnings.push(`page errors: ${pageErrors.slice(0, 3).join(' | ')}`);

        console.log(JSON.stringify(summary));
    } finally {
        await context.close();
        await browser.close();
    }
}

main().catch((err) => {
    console.log(JSON.stringify({ ok: false, error: String(err?.stack ?? err) }));
    process.exit(1);
});

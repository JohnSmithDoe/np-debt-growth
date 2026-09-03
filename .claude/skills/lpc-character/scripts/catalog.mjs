#!/usr/bin/env node
/**
 * catalog.mjs — query `catalog.json`, and check a hash before spending a render.
 *
 * The catalog is ~110 KB. Reading it into a conversation costs more than the
 * render it informs, so nothing here prints the file: every question about the
 * vocabulary is a command, and the answers are short.
 *
 * `check` is why this exists. The generator's answer to an invalid colour, an
 * unknown item or a body type an item ships no art for is to drop the layer —
 * silently. A character with no body renders as cleanly as one with. This
 * resolves a hash under the same rules the generator uses (`resolveHashParam`
 * in sources/state/resolve-hash-param.ts) and names what would have vanished.
 *
 * Usage:
 *   node catalog.mjs types [substring]
 *   node catalog.mjs items <type> [substring] [--body <sex>] [--colours]
 *   node catalog.mjs colours <material> [version]
 *   node catalog.mjs check "sex=male&body=Body_Color_light&…"
 *   node catalog.mjs check --preset <name>
 *   node catalog.mjs presets
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(readFileSync(join(HERE, '..', 'catalog.json'), 'utf8'));
const loadPresets = () => JSON.parse(readFileSync(join(HERE, '..', 'presets.json'), 'utf8')).presets;

const VALUED_FLAGS = ['body', 'preset'];
const argv = process.argv.slice(2);
const command = argv[0];
const flag = (name, fallback) => {
    const i = argv.indexOf(`--${name}`);
    return i === -1 ? fallback : (argv[i + 1] ?? fallback);
};
const has = (name) => argv.includes(`--${name}`);
const positional = argv.slice(1).filter((a, i) => !a.startsWith('--') && !VALUED_FLAGS.some((f) => argv[i] === `--${f}`));

const setOf = (id) => (id === undefined ? [] : (catalog.sets[id] ?? []));
const coloursOf = (item) => setOf(item.variants ?? item.colours);
/**
 * An LPC layer usually offers a choice of licence and the consumer elects one;
 * the sheet is flattened, so the whole sheet is bound by the strictest layer.
 * Two questions matter, and both are per body type — the muscular and pregnant
 * bases are CC-BY-SA/GPL where every other base also offers OGA-BY.
 *
 * `attributionOnly`: OGA-BY 3.0 or CC0 is available, so the art carries no
 * copyleft of its own. `copyleftOnly` layers still ship fine in this repo (it
 * is AGPL-3.0, and GPL-3.0 art combines into that) — they just take the sheet
 * with them. A layer offering CC-BY-SA and nothing else cannot come along.
 */
const licencesOf = (item, sex) => setOf(item.licencesByBody?.[sex] ?? item.licences);
const attributionOnly = (item, sex) => licencesOf(item, sex).some((l) => l.startsWith('OGA-BY') || l.startsWith('CC0'));
const incompatible = (item, sex) => {
    const licences = licencesOf(item, sex);
    return licences.length > 0 && !licences.some((l) => l.startsWith('OGA-BY') || l.startsWith('CC0') || l.startsWith('GPL'));
};
const token = (name) => name.replaceAll(' ', '_');
/** The generator compares colours with spaces, underscores and case folded together. */
const fold = (value) => {
    try {
        return decodeURIComponent(value).replaceAll(' ', '_').toLowerCase();
    } catch {
        return value.replaceAll(' ', '_').toLowerCase();
    }
};

/**
 * The generator's resolver, not an approximation of it: split on `_` and walk
 * the split point left to right, taking the FIRST name that matches — with a
 * colour it accepts, or with nothing after it at all. Longest-match would
 * disagree wherever one item's name is a prefix of another's.
 */
function resolve(type, value, selected = null) {
    const items = catalog.types[type]?.items;
    if (!items) return { reason: `no type "${type}" — try: catalog.mjs types` };

    const parts = value.split('_');
    let colourMiss = null;
    for (let i = 1; i <= parts.length; i++) {
        const name = parts.slice(0, i).join('_');
        const [wanted = '', piped = ''] = parts.slice(i).join('_').split('|');
        for (const item of items) {
            if (fold(token(item.name)) !== fold(name)) continue;
            const colours = coloursOf(item);
            const colour = piped || wanted;
            if (colour && colours.some((c) => fold(c) === fold(colour))) return { item, colour };
            if (wanted === '') return { item, colour: null };
            // The name is right and the colour is not, which is a different fix
            // from a misspelled name — and usually a missing palette-version prefix.
            // Keep the LONGEST name that matched: `Long_messy_x` also matches
            // `Long`, and blaming `Long` sends the reader to the wrong item.
            if (!colourMiss || item.name.length > colourMiss.item.name.length) {
              colourMiss = { item, colour, colours };
            }
        }
    }
    if (colourMiss) {
        const { item, colour, colours } = colourMiss;
        const suggestion = colours.filter((c) => c.endsWith(`.${colour}`) || fold(c).includes(fold(colour)));
        return {
            reason: `"${item.name}" has no colour "${colour}"${suggestion.length ? ` — did you mean ${suggestion.slice(0, 3).join(' or ')}?` : ` (has: ${colours.slice(0, 10).join(', ')}${colours.length > 10 ? ', …' : ''})`}`,
        };
    }

    // Nothing matched by name — the generator then reads the key as a sub-channel
    // of an item selected elsewhere (a head's `eyes=Eye_Color_blue`). The channel
    // paints nothing on its own, so what matters is whether an owner is present.
    const tail = value.split('_').pop() ?? '';
    const owners = [];
    for (const [ownerType, group] of Object.entries(catalog.types)) {
        for (const item of group.items) {
            for (const channel of item.channels ?? []) {
                if (channel.key !== type || !setOf(channel.colours).some((c) => fold(c) === fold(tail))) continue;
                const present = selected?.get(ownerType) === token(item.name) || selected?.get(ownerType)?.startsWith(`${token(item.name)}_`);
                owners.push({ label: `${ownerType}=${token(item.name)}`, present: Boolean(present) });
            }
        }
    }
    const carried = owners.filter((o) => o.present);
    if (carried.length) return { channel: true, note: `sets the ${type} channel of ${carried.map((o) => o.label).join(', ')}` };
    if (owners.length)
        return { channel: true, orphan: true, note: `no item in this hash owns a "${type}" channel — nothing renders it (owners include ${owners.slice(0, 3).map((o) => o.label).join(', ')})` };

    // A name that exists under a different key is the commonest miss — `vest` is
    // its own type, not a `clothes` item — so point at the key rather than the name.
    for (const [otherType, group] of Object.entries(catalog.types)) {
        if (otherType === type) continue;
        for (let i = parts.length; i >= 1; i--) {
            const name = parts.slice(0, i).join('_');
            if (group.items.some((item) => fold(token(item.name)) === fold(name)))
                return { reason: `"${name}" is a "${otherType}" item, not "${type}" — write ${otherType}=${value}` };
        }
    }

    const near = items
        .filter((i) => parts.some((p) => p.length > 2 && fold(token(i.name)).includes(fold(p))))
        .slice(0, 4)
        .map((i) => token(i.name));
    return { reason: `nothing in "${type}" matches "${value}"${near.length ? ` — near: ${near.join(', ')}` : ''}` };
}

function check(hash) {
    const pairs = hash
        .replace(/^#/, '')
        .split('&')
        .filter(Boolean)
        .map((p) => {
            const i = p.indexOf('=');
            return [decodeURIComponent(p.slice(0, i)), decodeURIComponent(p.slice(i + 1))];
        });

    const sex = pairs.find(([k]) => k === 'sex')?.[1];
    const problems = [];
    if (!sex) problems.push('no sex= — the build is unset');
    else if (!catalog.bodyTypes.includes(sex)) problems.push(`sex=${sex} is not one of ${catalog.bodyTypes.join(', ')}`);
    for (const key of ['body', 'head']) if (!pairs.some(([k]) => k === key)) problems.push(`no ${key}= — the base character is incomplete`);

    const selected = new Map(pairs);
    const skin = {};
    const copyleft = [];
    let layers = 0;
    for (const [key, value] of pairs) {
        if (key === 'sex') continue;
        layers++;
        const r = resolve(key, value, selected);
        if (r.reason) {
            console.log(`  DROP  ${key}=${value}  ${r.reason}`);
            problems.push(`${key}=${value}: ${r.reason}`);
            continue;
        }
        if (r.channel) {
            console.log(`  ${r.orphan ? 'WARN' : 'ok  '}  ${key}=${value}  ${r.note}`);
            if (r.orphan) problems.push(`${key}=${value}: ${r.note}`);
            continue;
        }
        if (sex && r.item.bodyTypes && !r.item.bodyTypes.includes(sex)) {
            const detail = `"${r.item.name}" ships no art for sex=${sex} (has ${r.item.bodyTypes.join(', ')})`;
            console.log(`  DROP  ${key}=${value}  ${detail}`);
            problems.push(`${key}=${value}: ${detail}`);
            continue;
        }
        // A colour the item does not know is not an error the generator reports —
        // it falls back to the name-only match and quietly renders the default.
        const colours = coloursOf(r.item);
        const asked = value.slice(token(r.item.name).length).replace(/^_/, '');
        if (asked && !r.colour) {
            const detail = `"${asked}" is not a colour of "${r.item.name}" — renders the default instead (has: ${colours.slice(0, 10).join(', ')}${colours.length > 10 ? ', …' : ''})`;
            console.log(`  WARN  ${key}=${value}  ${detail}`);
            problems.push(`${key}=${value}: ${detail}`);
            continue;
        }
        if (key === 'body' || key === 'head') skin[key] = r.colour;
        if (incompatible(r.item, sex)) {
            const detail = `"${r.item.name}" offers only ${licencesOf(r.item, sex).join(' / ')} — no GPL-compatible election for an AGPL-3.0 repo`;
            console.log(`  LICE  ${key}=${value}  ${detail}`);
            problems.push(`${key}=${value}: ${detail}`);
            continue;
        }
        if (!attributionOnly(r.item, sex)) copyleft.push(`${key}=${token(r.item.name)}`);
        console.log(`  ok    ${key}=${value}  →  ${r.item.name}${r.colour ? ` / ${r.colour}` : ' (default colour)'}`);
        for (const channel of r.item.channels ?? [])
            if (!pairs.some(([k]) => k === channel.key))
                console.log(`        · ${channel.key}=${token(channel.label)}_<colour> sets its ${channel.label} (${setOf(channel.colours).slice(0, 6).join(', ')}, …)`);
    }

    // Two valid layers in two skin tones is the mismatch no render reports.
    if (skin.body && skin.head && skin.body !== skin.head)
        console.log(`  WARN  skin differs: body=${skin.body} head=${skin.head}`);

    const armed = pairs.some(([k]) => k === 'weapon');
    console.log(`\n  ${layers} layers · expect ${armed ? 18 : 13} sheet columns (${armed ? 1152 : 832}px wide)`);
    if (copyleft.length) console.log(`  copyleft-only layers (GPL-3.0 elected, so the sheet is GPL-3.0): ${copyleft.join(', ')} — swap for an OGA-BY equivalent to keep the art attribution-only`);
    console.log(problems.length ? `  ${problems.length} problem(s) — fix before rendering` : '  no problems');
    return problems.length === 0;
}

switch (command) {
    case 'types': {
        const filter = positional[0]?.toLowerCase();
        for (const [name, group] of Object.entries(catalog.types))
            if (!filter || name.toLowerCase().includes(filter)) console.log(`${name} (${group.count})`);
        break;
    }
    case 'items': {
        const [type, filter] = positional;
        const group = catalog.types[type];
        if (!group) {
            console.error(`unknown type "${type}" — try: node catalog.mjs types`);
            process.exit(1);
        }
        const sex = flag('body', null);
        for (const item of group.items) {
            if (filter && !item.name.toLowerCase().includes(filter.toLowerCase())) continue;
            if (sex && item.bodyTypes && !item.bodyTypes.includes(sex)) continue;
            if (has('oga') && !attributionOnly(item, sex)) continue;
            const colours = coloursOf(item);
            const tail = !colours.length
                ? ''
                : has('colours') || has('colors')
                  ? `  [${colours.join(', ')}]`
                  : `  (${colours.length} colours${item.material ? ` · ${item.material}` : ''})`;
            const channels = (item.channels ?? []).map((c) => ` +${c.key}`).join('');
            console.log(`${type}=${token(item.name)}${tail}${channels}${item.matchBodyColor ? ' ~body' : ''}`);
        }
        break;
    }
    case 'colours':
    case 'colors': {
        const [material, version] = positional;
        const palette = catalog.palettes[material];
        if (!palette) {
            console.error(`unknown material "${material}" — have: ${Object.keys(catalog.palettes).join(', ')}`);
            process.exit(1);
        }
        console.log(`${material}: default version ${palette.default}, base ${palette.base ?? '—'}, versions ${palette.versions.join(', ')}`);
        console.log('An item accepts only the versions it declares — ask `items <type> --colours` for the tokens it will take.');
        if (version && !palette.versions.includes(version)) process.exit(1);
        break;
    }
    case 'check': {
        const preset = flag('preset', null);
        const hash = preset ? loadPresets()[preset]?.hash : positional[0];
        if (!hash) {
            console.error(preset ? `unknown preset "${preset}" — try: node catalog.mjs presets` : 'usage: catalog.mjs check "<hash>" | --preset <name>');
            process.exit(1);
        }
        process.exit(check(hash) ? 0 : 1);
    }
    case 'presets': {
        for (const [name, p] of Object.entries(loadPresets())) console.log(`${name.padEnd(20)} ${p.note}`);
        break;
    }
    default:
        console.error('usage: catalog.mjs types|items|colours|check|presets — see SKILL.md');
        process.exit(1);
}

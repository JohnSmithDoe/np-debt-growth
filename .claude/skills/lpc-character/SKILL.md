---
name: lpc-character
description: Generate a Universal LPC character spritesheet (PNG) + credits.txt for Debt Growth — the juniors, the seniors, anyone else who walks the board. Use when the user wants to create or regenerate an LPC character, a Liberated Pixel Cup sprite/spritesheet, a game character sprite, or pastes a liberatedpixelcup.github.io URL.
---

# LPC character generator

Turn a preset or a short quiz into a **spritesheet PNG + credits.txt**, by driving the
hosted Universal LPC Spritesheet Character Generator headlessly.

The cast this repo already has is in `presets.json` — `junior-m`, `junior-f`, `senior-m`,
`senior-f`. Regenerating one is a single command; a new character is the same command with
a different hash.

| file                        | role                                                              |
| --------------------------- | ----------------------------------------------------------------- |
| `catalog.json`              | the vocabulary — items, per-item colour tokens, licences, channels |
| `scripts/catalog.mjs`       | **query it and check a hash offline** — the file is never read whole |
| `scripts/export.mjs`        | hash → `<name>.png` + `<name>.credits.txt`                        |
| `scripts/build-catalog.mjs` | regenerate `catalog.json` from upstream                           |
| `scripts/pack-sheets.mjs`   | **cut the played blocks out of the sheets into one crew atlas**   |
| `presets.json`              | this game's cast                                                  |
| `reference.md`              | hash grammar, sheet geometry, the failure modes — read before improvising |

**Nothing here is a project dependency.** `export.mjs` resolves `playwright-core` at runtime
(project `node_modules`, then the npm global root) and drives the system Google Chrome. If it
is missing: `npm i -g playwright-core`. Network access is required — the generator is hosted.

## Regenerate one of the cast

```bash
node .claude/skills/lpc-character/scripts/export.mjs --preset senior-m --out art/characters
node .claude/skills/lpc-character/scripts/pack-sheets.mjs --in art/characters --out src/assets/characters
```

Two steps, because the game does not read a generated sheet. `art/characters/` holds the
full 832×3456 sheets as source and is **not shipped**; the packer cuts out the three blocks
the board plays (`walk`, `slash`, `idle` — 68 frames of 702) and packs every character into
one texture. Whole sheets would cost 11 MiB of VRAM and a texture bind each; packed, a
character costs ~1.1 MiB and no bind. A new character also needs an entry in `LPC_SKINS`.

Read the JSON summary (below) before reporting success.

## Make a new character

### 1. Ask, or map prose onto items

Use `AskUserQuestion` with option labels pulled from the catalog, so every choice is real:

```bash
node .claude/skills/lpc-character/scripts/catalog.mjs items clothes --body male
node .claude/skills/lpc-character/scripts/catalog.mjs items hair --body teen --oga
node .claude/skills/lpc-character/scripts/catalog.mjs items head Human --body female
```

Three rounds is plenty — build and head, then colour and outfit, then the flourishes
(`beard`, `facial_eyes`, `neck`, `hat`, `wrinkles`). `--oga` narrows a type to items whose
art can be taken attribution-only; `--colours` prints the exact colour tokens an item accepts.

**Filter by `--body <sex>` from the start.** Item coverage is not uniform: no vest ships
female art, several formal tops are male-only, and a child has neither shoes nor expressions.
An item without art for the chosen build renders nothing and says nothing.

### 2. Assemble the hash

`<type_name>=<Name with spaces→_>[_<colour>]`, joined with `&`, plus `sex=`. Author literal
tokens — `export.mjs` does the encoding. Always include `sex`, `body` and `head`, and give
`body` and `head` the *same* skin colour. See `reference.md` for the grammar and the traps.

### 3. Check it before rendering

```bash
node .claude/skills/lpc-character/scripts/catalog.mjs check "sex=male&body=Body_Color_light&…"
```

This is not optional. A render costs a browser launch and thirty seconds; the generator
answers a bad token by dropping the layer in silence, so a green check is the only cheap way
to know the character has a body. It reports dropped layers, body-type mismatches, colours
that fall back to the default, a skin tone split between body and head, an orphaned colour
channel, the sheet geometry to expect, and the licence the flattened sheet will carry.

### 4. Render, and read the summary

```bash
node .claude/skills/lpc-character/scripts/export.mjs \
  --out art/characters --name lead-architect \
  --hash "sex=male&body=Body_Color_light&head=Human_Male_light&…"
```

`--url "<full generator url>"` works too, if the user pasted one.

The one JSON line it prints carries `columns` (13 or 18 — the board's frame indices depend on
it), `creditedAssets`, `settled` and `warnings`. Act on it:

- `creditedAssets: 0` → the hash matched nothing. Do not deliver; run `check` and fix.
- `settled: false` → the render may be partial. Re-run.
- a licence warning → see below.
- otherwise → **look at the PNG.** No gate sees a spritesheet, and a dropped layer is
  invisible in every number the summary reports except the credit count.

### 5. Pack, and deliver

```bash
node .claude/skills/lpc-character/scripts/pack-sheets.mjs --in art/characters --out src/assets/characters
```

Then add the new name to `LPC_SKINS` in `stage/model/lpc-sheet.model.ts` — the packer sorts
its inputs by filename and the spec asserts the two lists match, so a forgotten entry fails
`pnpm test` rather than animating the wrong character.

The packer merges every `credits.txt` into `crew-atlas.credits.txt`, which ships beside the
atlas. Carrying the credit with the art is the licence obligation, not a nicety.

## Licensing

Most LPC layers are multi-licensed, and the consumer elects one. The sheet is flattened, so
the whole sheet is bound by its strictest layer. In this repo (AGPL-3.0-only):

- **OGA-BY 3.0 or CC0** — attribution only, no copyleft on the art. Prefer these.
- **GPL-3.0** — fine here, and it takes the sheet with it. `check` says so; not an error.
- **CC-BY-SA and nothing else** — no GPL-compatible election exists. `check` treats it as a
  problem and names the layer; swap it for an equivalent.

## Maintenance

Regenerate the catalog when upstream adds assets — the command is at the bottom of
`reference.md`. Re-run `check` on every preset afterwards; upstream renames items.

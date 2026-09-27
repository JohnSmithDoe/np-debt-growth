# Debt Growth

An idle game about a software consultancy that is paid by the hour to close
tickets, and therefore buys bad code on purpose.

## Stack

| Layer     | Choice                                                     |
| --------- | ---------------------------------------------------------- |
| UI        | Angular 21, zoneless, signals, standalone components       |
| Rendering | Phaser 4 — a view and an input surface, no state, no clock |
| Desktop   | Tauri 2 — packaging only; the save is `localStorage`       |
| Tests     | Vitest + jsdom                                             |
| Structure | Sheriff — module boundaries as build errors                |

## Getting started

Requires Node ≥ 22.18 (see `.nvmrc`), pnpm 11, and a Rust toolchain for the
desktop build.

```bash
pnpm install
pnpm start        # browser, localhost:4200
pnpm tauri:dev    # desktop window
```

## Commands

```bash
pnpm build        # renderer → dist/renderer
pnpm tauri:build  # installers (dmg, nsis)

pnpm test         # vitest
pnpm typecheck    # all of src/**, including what no import reaches
pnpm lint         # eslint + sheriff + prettier
pnpm verify       # sheriff boundaries only
pnpm format       # prettier --write

pnpm rust:check   # cargo check
pnpm rust:lint    # cargo clippy
pnpm rust:test    # cargo test
```

## Licence

**AGPL-3.0-only** — full text in [`LICENSE.txt`](./LICENSE.txt).
Copyright (C) 2026 Martin Stärk.

Not a neutral choice: the crew art is GPL-3.0 (below), so the game it ships
inside has to be copyleft as well. Nothing else forces it — the renderer's tree
is Angular, Phaser and ngx-translate (MIT), RxJS (Apache-2.0) and tslib (0BSD),
and the shell's is Tauri and serde (`Apache-2.0 OR MIT`).

### What the running app owes

Two obligations are owed to whoever _runs_ a build rather than to whoever clones
it, so no file in this repo can discharge them:

| Obligation               | Why it has to be inside the app                                                                                   |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| **AGPL §13**             | A player interacting with the game over a network must be offered its source from the app itself.                 |
| **GPL-3.0 / OGA-BY 3.0** | The crew atlas's attribution and a copy of its licence have to travel with the picture, packaged builds included. |

Both live in the title screen's footer — `src/app/console/ui/credits/`, listing
its facts from `console/model/credit.model.ts`. The title screen opens every
session, restored save or not, which is what makes it the right host: **if that
footer moves, it moves to a surface just as unavoidable.** The licence texts are
copied into `assets/legal/` by `angular.json` so they resolve inside the bundle
with no network, and `credit.model.spec.ts` fails if a link there stops
resolving to a file the build actually ships.

### Character art

The crew and the spawners on the lane above the board are 81 characters — 70
people, 11 creatures — built from the [Universal LPC Spritesheet Character
Generator](https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator).
`art/characters/` holds the full source sheets and is not shipped;
`src/assets/characters/crew-atlas.png` is the packed atlas the game loads, and
`crew-atlas.credits.txt` beside it merges every character's credits — **that
file is the attribution, and it must stay next to the art in the build output.**

Each character is a flattened composite of separately-authored layers, and the
atlas flattens all 81 together. **That makes the election cast-wide rather than
per character:** one copyleft-only layer anywhere binds the whole image.

Across the 601 credited layer entries there are no CC-BY-SA-only assets, so every
one offers OGA-BY 3.0, CC0 or GPL-3.0. **43** of the distinct file paths — the
neckties, the bowler hats, several hairstyles, some boots and glasses, the
minotaur and zombie heads — offer no
attribution-only option, so:

**The crew atlas is elected under GPL-3.0**, which is compatible with this
repo's AGPL-3.0. Individual characters are not separately licensed once packed.
GPL-3.0 asks to accompany the work with its own text, so
[`LICENSES/GPL-3.0.txt`](./LICENSES/GPL-3.0.txt) ships too — the AGPL text does
not stand in for it.

Recasting can change this. `.claude/skills/lpc-character/scripts/catalog.mjs
check` reports the licence a hash will carry before rendering, and the
per-character `*.credits.txt` in `art/characters/` records what each one used.

### Generated art

Everything in `src/assets/art/`, `src/assets/board/` (bar the release train, below) and
`src/assets/skills/` —
the title screens, the tier plates, the screen art, the office floor plates and
the seventy-one skill node icons — is generated with **FLUX.2 Klein
(Apache-2.0) via [mflux](https://github.com/filipstrand/mflux)**. The
illustrations ship un-pixelated as WebP, converted by `tools/backdrop.mjs`; the
board's tier backdrops and the modals share those files. The icons, the office
floor plates and the 2011 easter egg are forced onto the game's own palette by
`tools/pixelate.mjs`, or by `tools/icon-knockout.mjs` for the icons, which
remaps against the same palette.

**The icons carry no third-party licence**, which is the whole reason they are
generated rather than sourced: an icon set bought or borrowed would have been a
set-wide election the way the crew atlas was, and there is nothing to elect
here.

`tools/art-batch.mjs` is the manifest: one row per image, prompt included, so
every asset here can be re-derived from the repo. The palette's first block is
`src/global.scss`'s `--np-cb-*` tokens, which is what keeps the art and the DOM
chrome the same colours.

### The release train

The locomotive and passenger car in `src/assets/board/train/` are **"Ghost Train" by
Varible_37** ([itch.io](https://varible-37.itch.io/ghost-train)), shipped unmodified. They
are not AGPL: the author's terms apply — use them however you wish, apart from direct
resale. No credit is required; the footer gives it anyway, and `ghost-train.credits.txt`
beside the files quotes the terms and the source.

### Typeface

**Departure Mono** — Helena Zhang, **SIL OFL 1.1**. The licence ships beside the
face in `src/assets/fonts/`, which is where the OFL wants it; the face is
self-hosted because the packaged CSP is `font-src 'self' data:`.

### Sound

Effects are synthesised in the browser at run time (`src/app/audio/util/synth.ts`).
The music is three SID chiptunes shipped unmodified in `src/assets/audio/`, all
**CC0 1.0**: "Uptempo Chiptune" by Skrjablin, TheOuterLinux's C64 arrangement
of nene's "Boss Battle #2" (itself CC0), and Skrjablin's "Shanty" under the
closing credits. CC0 asks for no credit; the footer gives
it anyway, and `music.credits.txt` beside the files records the sources.

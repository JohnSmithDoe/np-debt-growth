# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Debt Growth** — an idle game about a consultancy billed by the hour, so it buys bad code on
purpose. Angular 21 (zoneless, signals) drives the DOM console; Phaser 4 draws the board; Tauri 2
packages the desktop build. See `README.md` for the licence story, which is load-bearing here.

## Commands

```bash
pnpm start                      # dev server, localhost:4200 (hash routing)
pnpm tauri:dev                  # desktop window
pnpm build                      # → dist/renderer

pnpm test                       # vitest run
pnpm test:watch
pnpm vitest run src/app/game/util/economy.spec.ts        # one file
pnpm vitest run -t 'bills the sprint'                    # one test by name

pnpm typecheck                  # ngc over all of src/** (tsconfig.check.json)
pnpm lint                       # eslint: angular rules + sheriff + prettier
pnpm verify                     # sheriff boundaries alone, no eslint
pnpm format                     # prettier --write

pnpm rust:check / rust:lint / rust:test     # src-tauri
pnpm check:viewport             # playwright screenshots at 3 sizes, needs pnpm start running
pnpm check:art                  # re-verifies every LPC preset's licence election
```

Node ≥ 22.18, pnpm 11. `pnpm typecheck` is not redundant with `pnpm build` — it globs `src/**`, so
it catches files no import chain reaches yet.

## Architecture

### Four domains, one direction

`src/app/<domain>/<type>/…` — domains are `game`, `stage`, `console`, `audio`, plus `@shared`.
Sheriff (`sheriff.config.ts`) turns the layering into a build error:

- **`game`** — the entire simulation. State, clock, economy, balance. Knows nothing about Angular
  templates or Phaser. Depends on nothing but `@shared`.
- **`stage`** — Phaser. A view and an input surface: no state, no clock.
- **`console`** — the DOM chrome around the canvas (panels, modals, feed, credits).
- **`audio`** — effects synthesised at run time; music is two CC0 `.ogg` tracks in `assets/audio/`.

Types within a domain: `feature` → `ui`/`data`/`util`/`model`, `data` → `scene`/`util`/`model`,
`util` → `model`. `model` may only reach sibling `model`. `game` cannot see `stage` or `console`.

**Sheriff module roots are exactly `<domain>/<type>` — depth two.** A new folder beside
`game/model/` is not a module and inherits no tag; nest new code under an existing pair.

### The loop: swimlanes, release trains, no wall clock

There is no round timer. Money and story points land **per ticket at pickup**. Closed work fills
**swimlanes** (`state.lanes`, dealt round-robin by `economy.fillLanes`); each lane has a WIP limit
(`laneCapacity`) and, when full, ships on its own **release train** (`haulMs`) and takes nothing
until it is back. The others keep taking; collection is refused only when every train is away
(`phase: 'hauling'`). A "round" is one lane's release. `cans` adds a lane, `capacity` raises the
WIP limit. The cadence is an output of the player's throughput, not an input. Player-facing copy
never says "truck" or "can". The board is never wiped at once, but work nobody reaches in
`TICKET_LIFE_MS` is **closed as "won't fix"** (`expireTickets`): the debt stays, it just leaves
the board. At `BOARD_CAPACITY` a full board **displaces** — each arrival pushes out the unclaimed
card nearest expiry (`displaceOldest`) — so the field's mix always matches what was bought. Never
make it refuse arrivals instead: spawns run cheapest type first, so refusing starves the late
lines. The hand and the crew are the only collectors; there is no income that doesn't come from
a pickup, and no offline progress.

**The tree unlocks, the rail buys.** Every `SKILL_NODES` entry costs story points, the ADR ladder
(`adr1`…`adr8`, track `N`) included, written exactly as charged, with no hidden multiplier; every rail
row costs euros. SP is earned at pickup (`pickupStoryPoints`), **one point per ticket, whatever it
bills**, once the €25 `velocity` row is bought, plus the per-ticket `+2` nodes and planning-poker
votes a ticket fell through (`voteBonus`, decided at spawn). Euro upgrades never touch SP, as the
reference's gum works. Don't add a euro node or an SP rail row without meaning to.

Every line has the same five tree nodes (`LINE_NODES`): `value` ×2 opens `spawn` (5 × +20 %),
`income` (5 × +50 %) and `estimates` (5 × +2 SP); all three maxed (`SkillNode.maxed`) open
`double` ×2. There are no global spawn or income nodes. Every purchase is a pure step in
`game/util/purchase.ts`; the store commits it and adds the side effects.

### The store is the only clock

`GameStore` (`game/data/game.store.ts`) holds the whole `Consultancy` in one signal and is the sole
mutator. `GameClock` ticks `advanceTo(Date.now())` every `TICK_MS` (100 ms); `advanceTo` walks
fixed sub-ticks and clamps simulation to `MAX_CATCHUP_MS`; anything longer (a hidden tab, a closed
app) is not played. The game is active-only.

Two deliberate exceptions to "everything is a signal":

- **`store.board` is a plain mutable object, not a signal** (`board.model.ts` — mutable
  `BoardTicket`/`CrewMember` fields). Hundreds of cards stepped at 10 Hz; Phaser reads it directly
  each frame. Do not wrap it in a signal or clone it per tick.
- **`game/util/board.ts` is stepped, never priced.** An eslint rule forbids it importing `economy`,
  `crew-rules`, `supply` or `consultancy.model` — it is handed its answers.

Balance numbers live in `game/model/balance/*.ts` (crew, curve, flow, progression, round, weather),
never inline in logic.

### Phaser never sees Angular

Scenes are constructed with a plain `SceneDeps` object (`stage/model/scene-deps.model.ts`) that
`StageService` builds from the store, translations and settings. No scene injects anything; that
boundary is what keeps the simulation testable under jsdom. `StageService` also owns mode switching
(`board` ↔ `skills`) with a fade, sleeping the board and disposing the skill tree.

### Boot order

`app.providers.ts` → restore the save, install the `globalThis.debtGrowth` test harness, then start
the autosave and the clock **only once `DoorService.opened()`** — the title screen gates the clock,
so a restored save does not tick behind the splash. Save is `localStorage`, version-gated
(`SAVE_VERSION`); a version bump silently discards old saves rather than migrating.

One thing in the restore looks like a bug and is not:

- **`freshConsultancy` ships `root` bought.** The tree costs story points and the ADR ladder lives
  on it, so a run with an unbought root is stranded — including the ADR modal's own approve button,
  which routes through `buySkill`. The `velocity` row is `open` on the rail for the same reason:
  it is the SP source, so it cannot sit behind an SP node. The run opens with one developer and
  nothing else, as the reference does.

### i18n

Two bundled catalogues (`@shared/util/i18n/catalogue/{en,de}.ts`), lazily imported, no HTTP. Specs
enforce that both carry identical keys, that no value is empty, and — in
`game/util/catalogue-reach.spec.ts` — that every key a model *builds* (skills, tickets, tiers, kit,
office, traits, hazards) exists in both. Add a game entity and that spec tells you which strings you
still owe.

## Conventions

- Standalone components, `OnPush`, `cb` selector prefix, `Page`/`Component` class suffixes.
- Private members use `#name`, not `private`. Services are `@Injectable({ providedIn: 'root' })`.
- **No `@Injectable` in `util/`** — enforced by eslint. State or a platform API means `data/`.
- Angular schematics default to `.scss` and `OnPush`; templates and styles are separate files.
- Comments: only where genuinely needed, short and technical. No history, no restating the code.

## Legal obligations that live in code

The crew atlas is GPL-3.0, so the game is AGPL-3.0. Two duties are owed to whoever *runs* a build:
AGPL §13 (offer the source from inside the app) and the atlas attribution. Both are discharged by
the title-screen footer — `console/ui/credits/`, facts from `console/model/credit.model.ts`,
licence texts copied into `assets/legal/` by `angular.json`. `credit.model.spec.ts` fails if a link
stops resolving to a file the build ships. **If that footer moves, it moves somewhere equally
unavoidable.** Read `README.md` before touching credits, the atlas, or the asset pipeline.

Art is generated, not sourced: `tools/art-batch.mjs` is the manifest (one row per image, prompt
included), `tools/pixelate.mjs` / `icon-knockout.mjs` force everything onto the palette whose first
block is `src/global.scss`'s `--np-cb-*` tokens. `image-staging/` is gitignored — takes, not assets.

## Debug doors

- `globalThis.debtGrowth` — `grant`, `reset`, `endRound` (send every train that is home),
  `startRound` (bring them all back), `buySkill`, `buyLine`. Always open; the viewport and art
  harnesses drive the game through it, and a whole run scripts in a few lines.
- The in-app debug bar unlocks with the Konami code (`ServiceDoorService`).
- `/demo` route renders `DemoScene` alone for floor-plate work.

## The docs, and what each is for

| File | What it is |
|---|---|
| `docs/gamedesign.md` | The design **as the code has it** — loop, currencies, crew, progression, where every knob lives, the current measured run, and the reference's measured numbers (§11). Read this before touching balance. |
| `docs/next-steps.md` | What is open, ranked, including the stage-performance leads and the traps that cost this project time. |

Docs describe the current state only — no history; git has that.

## Balance is measured, not asserted by eye

The economy runs without a board: `game/util/sim.ts` prices any state per second (supply,
density, crew walk, hand sweep, lanes), and `game/util/autoplay.ts` plays a whole run on it in
about two seconds. `game/data/sim.spec.ts` keeps the sim within ×1.5 of a real board — if you
change how the board collects, change the sim with it.

`game/data/balance.spec.ts` runs the autoplayer and **fails** if it does not reach sign-off in
35–100 minutes, space the last five ADR rungs more than two minutes apart, or finish with the tree
bought out. After any economy change, re-run it with the reports on:

```bash
CB_CLOCK=1 CB_LADDER=1 CB_SHARE=1 CB_INCOME=1 pnpm vitest run src/app/game/data/balance.spec.ts
```

`game/data/balance-invariants.spec.ts` guards the *shape* of the tables rather than their values.

## Verify by playing it

A green suite, a clean build and a screenshot of the first twenty seconds all passed once while the
skill tree was unreachable and ADRs were unbuyable. Drive the real app before claiming a feature
works — `pnpm start`, then a Playwright script through `globalThis.debtGrowth` covers a whole run in
under a minute.

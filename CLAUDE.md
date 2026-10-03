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
- **`console`** — the DOM chrome around the canvas (panels, modals, credits).
- **`audio`** — effects synthesised at run time; music is three CC0 `.ogg` tracks in `assets/audio/`.

Types within a domain: `feature` → `ui`/`data`/`util`/`model`, `data` → `scene`/`util`/`model`,
`util` → `model`. `model` may only reach sibling `model`. `game` cannot see `stage` or `console`.

**Sheriff module roots are exactly `<domain>/<type>` — depth two.** A new folder beside
`game/model/` is not a module and inherits no tag; nest new code under an existing pair.

### The loop: one sprint, a release train, no wall clock

There is no round timer. Money and story points land **per ticket at pickup**. Closed work fills
**one sprint** (`sprintSlots`: each rung's `capacity<t>` raises it, each `cans<t>` puts another team's scope
on it). A full sprint leaves on the **release train** (`haulMs`, the ceremonies in `RELEASE_PHASES`
that no `cut<Ceremony>` node has cut) and the board takes nothing until it is back (`phase: 'hauling'`) —
deliberately blocking, and the release banner tells the wait. A "round" is one sprint's release. The cadence is an output of the player's throughput, not an input. Player-facing copy
never says "truck", "can" or "WIP". The board is never wiped at once, but work nobody reaches in
`ticketLifeMs(tier)` (12 s early, 3.5 s from ADR-6) is **closed as "won't fix"** (`expireTickets`): the debt stays, it just leaves
the board. At `BOARD_CAPACITY` a full board **displaces** — each arrival pushes out the unclaimed
card nearest expiry (`displaceOldest`) — so the field's mix always matches what was bought. Never
make it refuse arrivals instead: spawns run cheapest type first, so refusing starves the late
lines. The hand and the crew collect, plus Triage Policy's **auto-close**: a type it names
(lint, then bugs) is claimed by no crew and closes itself when its life runs out, filling the sprint
like any close; with the train away it goes to prod as a P0 (three live at most). Besides
closes, only **achievements** pay: euros before ADR-3, SP from it, a fixed amount per tier and
`weight` (`balance/award.ts`), nothing for milestones or after sign-off. No offline progress.

**The tree unlocks, the rail buys.** Every `SKILL_NODES` entry costs story points, the ADR ladder
(`adr1`…`adr8`, track `N`) included, written exactly as charged, with no hidden multiplier; every rail
row costs euros. The last node, `signoff` (8 M SP, off ADR-8), does not end the run: it
starts the **acceptance push** (`ACCEPTANCE`, `economy.inAcceptance`: billing
`economy.overtime`; no sprint cap, no train, no meetings — `economy.trainRuns`; the whole crew sits in the acceptance meeting), nine criteria, one line under test at a time (`economy.criterionNow`: it
spawns at `CRITERION_SPAWN_PER_SEC` and bills as the newest rung; only cards spawned for the criterion are pink, and only the **hand's** pickups of them count; every criterion runs its full `CRITERION_MS` 15 s and then
signs clean if the hand reached `CRITERION_GOAL` 15 pickups, with findings if not; `console/feature/acceptance-card/` shows it),
and the run ends when every criterion is signed (`economy.accepted` sets `endedAt`). From ADR-4 the next ADR (or the closeout) can be approved on credit
(`purchase.approveOnCredit`, `spDebt` repaid from half of later SP). SP is earned at pickup (`pickupStoryPoints`), **one point per ticket, whatever it
bills**, once the €25 `velocity` row is bought, plus the per-ticket `estimates` nodes and planning-poker
votes a ticket fell through (`voteBonus`, decided at spawn). Euro upgrades never touch SP. There are no euro nodes and no SP rail rows.

The early lines (lint … slop) have five tree nodes (`LINE_NODES`): `value` ×2 opens `spawn`
(3 × +⅓), `income` (3 × +⅚) and `estimates` (3 steps of SP); all three maxed (`SkillNode.maxed`)
open `double` ×2. The late lines (rockstar … swarm) sell the same end state in two buys,
`contract<T>` (value ×2 + the SP) then `retainer<T>` (throws ×2, value ×7). **One rank per
node**: a multi-rank curve is a chain of single-rank nodes, one per ADR (`chained`, `<family><t>`,
each needing the last maxed). There are no global spawn or income nodes. Every purchase is a pure step in
`game/util/purchase.ts`; the store commits it and adds the side effects.

### The store is the only clock

`GameStore` (`game/data/game.store.ts`) holds the whole `Consultancy` in one signal and is the sole
mutator. `GameClock` ticks `advanceTo(clock.now())` every `TICK_MS` (100 ms); `advanceTo` walks
fixed sub-ticks and clamps simulation to `MAX_CATCHUP_MS`; anything longer (a hidden tab, a closed
app) is not played. The game is active-only, and frozen while the skill tree is open.
**`clock.now()` is game time** (wall time minus pauses). Anything handing the store a timestamp
uses it, never `Date.now()`, or deadlines drift by the time spent paused.

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
boundary is what keeps the simulation testable under jsdom. Scenes lay out in CSS pixels: `PhaserService` sizes the game in backing pixels (device pixel
ratio, whole steps, at most 2×) shown at 1 / that zoom, and `CbScene.sharpen` gives every `Text`
that resolution and zooms a fixed scene's camera back up. Use `viewWidth` / `viewHeight`, never
`this.scale.width`, for layout. `StageService` also owns mode switching
(`board` ↔ `skills`) with a fade, sleeping the board and disposing the skill tree.

### Boot order

`app.providers.ts` → restore the save, install the `globalThis.debtGrowth` test harness, then start
the autosave and the clock **only once `DoorService.opened()`** — the title screen gates the clock,
so a restored save does not tick behind the splash. Save is `localStorage`, version-gated
(`SAVE_VERSION`); a version bump silently discards old saves rather than migrating.

One thing in the restore looks like a bug and is not:

- **`freshConsultancy` ships `root` bought.** The tree costs story points and the ADR ladder lives
  on it, so a run with an unbought root is stranded. The `velocity` row is `open` on the rail for the same reason:
  it is the SP source, so it cannot sit behind an SP node. The run opens with one developer and
  nothing else.

### i18n

Two bundled catalogues (`@shared/util/i18n/catalogue/{en,de}.ts`), lazily imported, no HTTP. Specs
enforce that both carry identical keys, that no value is empty, and — in
`game/util/catalogue-reach.spec.ts` — that every key a model _builds_ (skills, tickets, tiers, ADR records, awards, kit,
office, traits, hazards) exists in both. Add a game entity and that spec tells you which strings you
still owe.

Ticket titles are pools in `catalogue/ticket-titles.{en,de}.ts`, picked by index: a ticket carries
its `titleKey`, never text. Changing a pool's length means changing `TICKET_TITLE_COUNTS` in
`game/model/ticket-copy.model.ts`, in both languages.

## Conventions

- Standalone components, `OnPush`, `cb` selector prefix, `Page`/`Component` class suffixes.
- Private members use `#name`, not `private`. Services are `@Injectable({ providedIn: 'root' })`.
- **No `@Injectable` in `util/`** — enforced by eslint. State or a platform API means `data/`.
- Angular schematics default to `.scss` and `OnPush`; templates and styles are separate files.
- Comments: only where genuinely needed, short and technical. No history, no restating the code.

## Legal obligations that live in code

The crew atlas is GPL-3.0, so the game is AGPL-3.0. Two duties are owed to whoever _runs_ a build:
AGPL §13 (offer the source from inside the app) and the atlas attribution. Both are discharged by
the title-screen footer — `console/ui/credits/`, facts from `console/model/credit.model.ts`,
licence texts copied into `assets/legal/` by `angular.json`. `credit.model.spec.ts` fails if a link
stops resolving to a file the build ships. **If that footer moves, it moves somewhere equally
unavoidable.** Read `README.md` before touching credits, the atlas, or the asset pipeline.

Art is generated, not sourced — the one exception is the release train, Varible_37's "Ghost Train" in `assets/board/train/` (author's terms, credited in the footer): `tools/art-batch.mjs` is the manifest (one row per image, prompt
included). Illustrations ship un-pixelated as WebP via `tools/backdrop.mjs`; icons
and the 2011 easter egg go through `tools/pixelate.mjs` / `icon-knockout.mjs` onto the palette
whose first block is `src/global.scss`'s `--np-cb-*` tokens. `image-staging/` is gitignored —
takes, not assets, and the only source of the raw art.

## Debug doors

- `globalThis.debtGrowth` — `grant`, `reset`, `endRound` (send the train if it is home),
  `startRound` (bring it back), `buySkill`, `buyLine`, `buySpawner(adr)`, `buyOut` (every skill but sign-off and every rail row, wallet untouched), `place(type, golden?)` (drop one
  card), `finale(curtain?)` (the curtain call; `true` skips the roll), `postMortem()` (accepts the run as it stands). Always open; the viewport and art harnesses drive the game through it, and a whole run
  scripts in a few lines.
- The in-app debug bar unlocks with the Konami code (`ServiceDoorService`).

## The docs

`docs/gamedesign.md` is the design **as the code has it**: loop, currencies, crew, progression,
where every knob lives, the current measured run and what
the screen shows (§11). Read it before touching balance. Prices and ranks are not copied into it;
the code is the list.

Docs describe the current state only — no history; git has that.

## Balance is measured, not asserted by eye

The economy runs without a board: `game/util/sim.ts` prices any state per second (supply,
density, crew walk, hand sweep, the sprint), and `game/util/autoplay.ts` plays a whole run on it in
about two seconds. `game/data/sim.spec.ts` keeps the sim within ×1.5 of a real board at each stop and ×1.1 over a whole run — if you
change how the board collects, change the sim with it.

`game/data/balance.spec.ts` runs the autoplayer on the Synergy Analyser's advice (`advisedSpend`)
and **fails** if the run is not accepted in 18–22 minutes (the acceptance push 2–5 of
them) or a tier's share of the run is more than ±25 % off `TIER_CURVE` (the opening at its own
pace, 3 · 4 min, then quicker every rung down to 0.75 min at sign-off); a second, cheapest-first run must walk every track and buy the
tree out. After any economy change, re-run it with the reports on:

```bash
CB_CLOCK=1 CB_LADDER=1 CB_SHARE=1 CB_INCOME=1 pnpm vitest run src/app/game/data/balance.spec.ts
```

`game/data/balance-invariants.spec.ts` guards the _shape_ of the tables rather than their values.

## Verify by playing it

A green suite, a clean build and a screenshot of the first twenty seconds all passed once while the
skill tree was unreachable and ADRs were unbuyable. Drive the real app before claiming a feature
works — `pnpm start`, then a Playwright script through `globalThis.debtGrowth` covers a whole run in
under a minute. Buying an ADR opens a modal; click `cb-adr-modal .btn.primary` before the next click.

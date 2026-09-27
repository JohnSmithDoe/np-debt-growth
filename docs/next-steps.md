# Next steps

What is open, ranked. The design as it stands is `gamedesign.md`. Checked against the code on
27 Sep 2026.

## Before you start

- **A green suite proves nothing about reachability.** The tree has shipped unreachable on a
  green suite, and tab labels have rendered as raw i18n keys; neither is visible to a test. Drive
  the running app: `pnpm start`, then Playwright through `globalThis.debtGrowth`
  (`grant(1e7, 1e8)`, `buySkill`, `buyLine`, `endRound`, `startRound`). Buying an ADR opens a
  modal; click `cb-adr-modal .btn.primary` before the next click.
- **After any economy change**, re-run
  `CB_CLOCK=1 CB_LADDER=1 CB_SHARE=1 CB_INCOME=1 pnpm vitest run src/app/game/data/balance.spec.ts`
  (about two seconds) and `pnpm vitest run src/app/game/data/sim.spec.ts` (the sim still agrees
  with the board).
- Gates: `pnpm typecheck`, `pnpm lint`, `pnpm verify`, `pnpm test`, `pnpm build`,
  `pnpm check:viewport` (needs `pnpm start`), `pnpm check:art`, `pnpm rust:check`.

---

## 1. Measure the stage

No profile exists. The board now sits at 600 cards for most of the run (displacement keeps it
full), so the heap leads matter again:

1. `stage/scene/tier-spawners.ts` moves up to 450 lane `Image`s a frame (9 × `LANE.perLine` 50,
   one per head bought) and calls `setFlipX` unconditionally. This is the only cost that scales
   with purchases.
2. `supply-panel`: all three tab `computed`s read `store.state()` and recompute at 10 Hz.
3. `ticket-heap.ts`: `sync` diffs the whole board twice a frame; 48 `repeat: -1` tweens run for
   mostly hidden rare cards; `HEAP_CAPACITY` 4096 against at most 600 live cards.
4. `sprint-strip.ts` makes 8 store reads a frame before its redraw guards.
5. `util/board.ts` `displaceOldest` scans the board once per displaced arrival — up to a few
   hundred scans a second late in the run.

Capture: reach ADR-5+ with a full board, 20 s of Chrome DevTools → Performance while sweeping.

## 2. Render the canvas at device pixel ratio

All Phaser text is soft on a HiDPI screen; the DOM text beside it is sharp. `phaser.service.ts`
sizes the canvas in CSS pixels (`Scale.RESIZE`, `parent.clientWidth`), so on a DPR-2 display the
browser upscales a half-resolution buffer. `pixelArt: true` makes that harmless for sprites, not
for anti-aliased glyphs. The payout floats show it worst.

The fix is a backing store of `clientWidth × devicePixelRatio` shown at CSS size, then every scene
scaling its literal pixel sizes by the same factor — font sizes (`'11px'`, `CLOSE_FLOAT`,
`BIG_FLOAT`), `HOVER_*`, rise distances, the board fit. Fill cost goes ×4 at DPR 2, so do it after
§1 has a profile, and measure both.

## 3. Art

Canvas-drawn placeholders: the planning-poker coaches, the release train, the pizza circle, the
lane actors (`stage/util/board-atlas.ts`). Pipeline: `tools/art-batch.mjs` →
`pixelate.mjs` / `icon-knockout.mjs`.

## 4. Balance to watch

Measured on the advised autoplayer (see `gamedesign.md` §10): accepted at 31.6 min, the push
3.3 min, every guard green. What the sim does not see:

- **Prod incidents.** A real board sends 3–5 auto-closed cards a second to prod from ADR-1 to
  ADR-3 (the lint rate is 9–25/s and the trains are away often); the live cap of 3 is what keeps
  that from flooding. Incidents are 150 € × tier, so they matter early and not at all late.
- **Weather** is on and unpriced. `storm` and `page` stack with the hand-only tier climb.
- **Triage Policy** is still 500 / 1 600 SP for what is now the biggest single SP source of the
  opening (every lint card bills); tier-0 estimates were cut to +4 to hold the pace instead.

---

## Parked: the CI auto-close pipeline

Removed from the code on 25 Sep 2026. Triage Policy's auto-close now covers lint and bugs with no
throughput of its own; this is the fuller, throttled design, so it can come back; the last commit
that has it is `1a4254c`.

- **Nodes**, on a Tooling track behind `copilot`: `autoLint` 350 SP, `autoBug` 1 100,
  `autoLegacy` 3 000 (ADR-3), `autoFlaky` 3 800 (ADR-4), `autoConflict` 8 000 (ADR-5); `runners`
  +3 runners × 5 ranks (600 · 2 200 · 8 000 · 28 000 · 90 000); `automationSpeed` ×0.8 × 3
  (800 · 2 400 · 7 000).
- **Behaviour** (`supply.fileAutomated`): a ticket of an automated type files itself after
  `AUTO_CLOSE_MS` 3 s, throttled by `AUTO_RUNNERS_BASE` 4 runners at `AUTO_RUNNER_PER_SEC` 1
  each; it takes lane slots like any close; automated types are removed from crew claims.
  Counted as crew in the € share.
- **Measured share** before removal: 55–65 % of all euros from minute 10 to 30, under 1 % after
  minute 50, because it only ever covered tiers 0–3.
- **Why parked:** a third collector with its own timer and throughput, which also changes what
  the crew are allowed to claim. It is the part of the economy the board-free sim cannot
  express simply.
- **Before it returns:** decide how it shares work with the crew (today it takes their types
  away), whether it reaches the late tiers, and model it in `util/sim.ts` first.

## Parked: the Promotion Round

Removed on 25 Sep 2026 (`e47648e`; the last commit that has it is `65cffd1`).

- **What it was:** one irreversible purchase that retitled every junior as a senior, closed the
  junior line for the rest of the run, and made the new seniors inherit the junior 1-in-4 women
  ratio. It had its own moment modal (`assets/art/screen/promotion.png` is still on disk), an
  award, and a post-mortem line.
- **Why removed:** it sold the same senior seats as the rail at about twenty times the price
  (`SENIOR_BUYOUT_STEPS × PROMOTION_PREMIUM 1.6` against `1 200 × 1.15^n`), and nothing in the UI
  could reach it any more; only the autoplayer bought it.
- **Before it returns:** price it off the rail (the seats it converts, at the rail's price, times
  a small premium), give it a button, and decide what happens to the junior line and the bands
  once the bench is all seniors.

## Parked: a second area

The reference moves to a second screen after the gorilla (the sea: new litter, new collectors, a
golden whale). Our run keeps one board and uses ADR-4…8 as its "second half" in content.

- **Our analogue** would be a second client or engagement: a new board, its own ticket set and
  spawner lines, a transition, and a second pass over the whole curve.
- **Before it starts:** decide what carries over (budget, SP, crew, tree), whether the first board
  keeps running, and how `sim.ts` prices two boards at once.

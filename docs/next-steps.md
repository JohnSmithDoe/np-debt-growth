# Next steps

What is open, ranked. The design as it stands is `gamedesign.md`. Checked against the code on
25 Sep 2026.

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

## 1. Bring the pace closer to the reference

The run passes every guard (`gamedesign.md` §10: sign-off at 89.4 min) but is slower than the
reference in the part that is measured:

- **The gorilla (ADR-3) lands at 43.4 min**, against about 30 in the demo. ADR-1 → 2 takes
  15.8 min and ADR-2 → 3 15.4, on the reference's own prices (10 000 and 600 000 SP). The
  autoplayer buys every cheaper node before an ADR; check that against how the reference is
  actually played before moving a measured price.
- **Sign-off at 89.4 min**, against the full game's 57–70. ADR-4…8, `signoff` and the throw-two
  rank step (×1.25) are ours and were sized to fit the band, not measured.
- ADR-4 → 5 is 2.4 min, just over the two-minute floor.
- The crew's € share after `goldenCrew` is 14–19 %; before it 2–4 % (the hand's gold). The
  guard asks 4 % after and 15 % of the closes before.

Apply measured reference values where they exist (§11 of the design) before inventing a curve.

## 2. Copy and art

- The per-line `income<T>` / `double<T>` labels and the `spawn<T>` rank 2–5 labels are
  placeholders ("Lint Warning Uplift II", "Skip the Review III"). Write real names, both
  catalogues.
- Canvas-drawn placeholders: the planning-poker coaches, the release train, the pizza circle, the
  lane actors (`stage/util/board-atlas.ts`). Pipeline: `tools/art-batch.mjs` →
  `pixelate.mjs` / `icon-knockout.mjs`.

## 3. Measure the stage

No profile exists. The board now sits at 600 cards for most of the run (displacement keeps it
full), so the heap leads matter again:

1. `stage/scene/tier-spawners.ts` moves up to 450 lane `Image`s a frame (9 × `LANE.perLine` 50,
   one per head bought) and calls `setFlipX` unconditionally. This is the only cost that scales
   with purchases.
2. `cb-scene.ts` `floatPayout` allocates a `Phaser.Text` and a tween per payout, with no cap.
3. `supply-panel`: all three tab `computed`s read `store.state()` and recompute at 10 Hz.
4. `ticket-heap.ts`: `sync` diffs the whole board twice a frame; 48 `repeat: -1` tweens run for
   mostly hidden rare cards; `HEAP_CAPACITY` 4096 against at most 600 live cards.
5. `sprint-strip.ts` makes 8 store reads a frame before its redraw guards.
6. `util/board.ts` `displaceOldest` scans the board once per displaced arrival — up to a few
   hundred scans a second late in the run.

Capture: reach ADR-5+ with a full board, 20 s of Chrome DevTools → Performance while sweeping.

## 4. Render the canvas at device pixel ratio

All Phaser text is soft on a HiDPI screen; the DOM text beside it is sharp. `phaser.service.ts`
sizes the canvas in CSS pixels (`Scale.RESIZE`, `parent.clientWidth`), so on a DPR-2 display the
browser upscales a half-resolution buffer. `pixelArt: true` makes that harmless for sprites, not
for anti-aliased glyphs. The payout floats show it worst.

The fix is a backing store of `clientWidth × devicePixelRatio` shown at CSS size, then every scene
scaling its literal pixel sizes by the same factor — font sizes (`'11px'`, `CLOSE_FLOAT`,
`BIG_FLOAT`), `HOVER_*`, rise distances, the board fit. Fill cost goes ×4 at DPR 2, so do it after
§3 has a profile, and measure both.

## 5. Unstash the weather

This is more than flipping `HAZARDS_ENABLED`: `meeting` was tuned against a 10 s round;
`CREW_EURO_WINDOW_FLOOR` needs re-measuring; `grooming` is a no-op; `migration`'s `supply: 0`
has no counterplay; the two 120 s cadences coincide by accident. Offshore contractors, which
only weather ever staffed, were removed with `3524a98`; the `offshore` hazard went with them.

## 6. Needs a design call

- **The hidden node.** The reference hides a "Wow you found me!" node at the zoomed-out corner of
  its tree. Ours: *the undocumented endpoint*.
- **Tree badges.** The reference uses four (`+`, `↑`, `%`, `✕`) by node kind; we stamp `+`/`%`.

---

## Parked: the CI auto-close pipeline

Removed from the code on 25 Sep 2026 to keep the economy to two collectors (hand and crew). The
design, so it can come back; the last commit that has it is `1a4254c`.

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

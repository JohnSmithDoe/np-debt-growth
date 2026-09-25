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

## 1. Retune the curve after the economy rework

Offline, retainer, copilots and the auto-close pipeline went; the tree moved to five nodes per
line; a full board displaces. The measured run (`gamedesign.md` §10) has not been tuned since,
and two guards in `balance.spec.ts` fail:

- **Sign-off at 110.8 min**, against the 35–100 band and the full game's 57–70. The long gaps are
  ADR-1 → 2 (15.8 min), ADR-2 → 3 (12.3), ADR-6 (11.1) and ADR-7 → 8 (16.7), and 28 min from
  ADR-8 to sign-off.
- **The crew's € share falls to 2.5–4 % between minutes 30 and 60** (floor 4 %). The crew do half
  the closes, but the hand's gold outweighs everything they bill until `goldenCrew`. That is the
  reference's shape; decide whether the floor or the golden numbers move.

Apply measured reference values where they exist (§11 of the design) before inventing a curve.

## 2. The sim runs slightly high

`util/sim.ts` lands 1.2–1.45× above the board on € and SP (`data/sim.spec.ts` allows ×1.6). The
hand is the likely rest: the sim gives it about 18 closes/s where the board shows about 16. Tighten
it before trusting sub-minute pacing numbers.

## 3. Dead or broken purchases

- **`duration` ranks 2–5 do nothing.** `haulMs = max(2 500, 4 000 − Σ seconds)`, and rank 1
  alone takes off 3 s. Ranks 2–5 sell 10 800 SP of nothing.
- **Offshore never staffs.** Its headcount comes only from weather, and weather is off.
- **Promotion and the rail price the same senior seats differently.** Seat 5 on the rail is about
  2 100 € (`1 200 × 1.15^n`); five seats by promotion about 46 800 (`SENIOR_BUYOUT_STEPS ×
  PROMOTION_PREMIUM`). The autoplayer promotes the whole bench and never hires a junior again.
- **`officePlates` counts the `kit` node**, so kit widens the office floor art by a plate.

## 4. 71 skill icons are never drawn

`src/assets/skills/` holds 71 PNGs named `a1`…`h4`. `SkillScene` preloads all of them, but
`#stampIcon` matches by node id, and only `root` matches. Map node ids to icon ids in
`stage/model/skill-icon.model.ts`, or delete the assets and the preload. `README.md` advertises
them.

## 5. Copy and art

- The per-line `income<T>` / `double<T>` labels and the `spawn<T>` rank 2–5 labels are
  placeholders ("Lint Warning Uplift II", "Skip the Review III"). Write real names, both
  catalogues.
- Canvas-drawn placeholders: the planning-poker coaches, the release train, the pizza circle, the
  lane actors (`stage/util/board-atlas.ts`). Pipeline: `tools/art-batch.mjs` →
  `pixelate.mjs` / `icon-knockout.mjs`.

## 6. Measure the stage

No profile exists. The board now sits at 600 cards for most of the run (displacement keeps it
full), so the heap leads matter again:

1. `stage/scene/tier-spawners.ts` moves up to 126 lane `Image`s a frame (9 × `LANE.perLine` 14)
   and calls `setFlipX` unconditionally. This is the only cost that scales with purchases.
2. `cb-scene.ts` `floatPayout` allocates a `Phaser.Text` and a tween per payout, with no cap.
3. `supply-panel`: all three tab `computed`s read `store.state()` and recompute at 10 Hz.
4. `ticket-heap.ts`: `sync` diffs the whole board twice a frame; 48 `repeat: -1` tweens run for
   mostly hidden rare cards; `HEAP_CAPACITY` 4096 against at most 600 live cards.
5. `sprint-strip.ts` makes 8 store reads a frame before its redraw guards.
6. `util/board.ts` `displaceOldest` scans the board once per displaced arrival — up to a few
   hundred scans a second late in the run.

Capture: reach ADR-5+ with a full board, 20 s of Chrome DevTools → Performance while sweeping.

## 7. Unstash the weather

This is more than flipping `HAZARDS_ENABLED`: `meeting` was tuned against a 10 s round;
`CREW_EURO_WINDOW_FLOOR` needs re-measuring; `grooming` is a no-op; `migration`'s `supply: 0`
has no counterplay; the two 120 s cadences coincide by accident.

## 8. Cleanups

- The `roundLength` effect kind now shortens the haul; rename it.
- `SkillGate` hand-writes `'tier1'…'tier8'`, parsed back with `Number(gate.slice(4))` in
  `util/purchase.ts`.
- Per-crew effect kinds (`junior`/`juniorWalk`/`juniorSweep`/`juniorBatch`, again for seniors and
  managers) could become one `{ kind: 'pace', crew, field }`.
- `util/first-act.ts` holds back types by name; a `revealAtMs?` / `revealAtTier?` field on
  `TicketType` would make it data.
- The ADR panel duplicates the `adrN` tree node it buys. Keep it or drop it, but decide.

## 9. Needs a design call

- **Areas.** The reference's second screen (the sea) comes after the gorilla; ours would be a
  second client or engagement.
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

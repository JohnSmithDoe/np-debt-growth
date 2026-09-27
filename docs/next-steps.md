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

## 1. Playtest feedback, 27 Sep 2026

Found while playing.

### Layout

- **The collecting / train box on the sprint bar reads oddly.** Redesign it. Below ~1300 px wide
  it also covers the sprint total (`PENDING_X` in `sprint-strip.ts` sits under it).

### Board signals

- **Hotfix window and enterprise escalation get a pulsing message on the board** while they
  are active. Take their text off the sprint bar.

### Rail

- **Icons on the rail rows**, reusing the board's graphics: ticket cards in front of the value
  (rate) rows, a crew member in front of each crew hire.
- **Affordability badges on the tabs** (Debt, Rates, Crew, and the skill-tree button) whenever
  something there can be bought.

### Balance

- **Planning-poker beams open too early.** The whole board can be turned purple (every card
  re-estimated) soon after ADR-2. A purple board should be a late-game sight: reprice or regate
  `coaches` / `deck`, or cap how many beams are live early.
- **`estimatesLint` pulls SP too far ahead of euros.** It helps the tree along, but the SP it
  pays early is out of step with the euros coming in at that point.
- **Bugs from tier 0.** `bug` is held back until ADR-1 (`revealAtTier: 1`, `ticket.model.ts`),
  but `valueBug` (Bug Bounty) hangs off `valueLint` and can be bought at tier 0, doubling a
  ticket that isn't on the board yet. Proposal: drop the reveal gate and let bugs arrive from
  tier 0 at a lower rate than lint. They already share the ADR-0 line. Changing the reveal
  changes the opening, so the sim and the balance spec need re-running afterwards.
- **Start with a smaller mouse radius**, about 5 screen px (today `CLICK_RADIUS_BASE` 34 logical,
  23–51 screen px by viewport). The ring is the hit test: `pickWithin` takes cards whose
  **centre** is inside it, and a card is 58 × 16. At 5 px a sweep would have to cross each
  card's centre, and the pointer is sampled per move event, so fast sweeps skip. Decide first
  whether a small ring should hit any card it _touches_ (box overlap); `util/sim.ts` `cellsInReach` must follow. Do it in the balance pass.

### Tree copy

- **Triage Policy leaves lint with nobody but the hand.** `triagePolicy` rank 1 removes lint
  from the juniors' claims (`economy.crewClaims` → `triageSkips`). No other crew kind takes
  tier 0, so from then on lint is collected by the hand or expires as "won't fix". That's by
  design (juniors stop filling the sprint with 1 € cards), but the effect text ("Juniors leave
  lint alone") doesn't say what happens to the lint. Make the consequence visible. Rank 2
  (seniors leave bugs) still does nothing, because seniors never take tier 0. Candidate answer,
  undecided: rank 1 starts a lint-only auto-close pipeline (see _Parked: the CI auto-close
  pipeline_); whether it bills, takes lane slots, or only clears is open.

## 2. The late game runs out of decisions

Not started. Measured 27 Sep 2026 on the greedy autoplayer (`spend`, 1 sweep/s) with the award
SP already removed. Purchases per five minutes:

| min   | tree buys | rail buys | tier | SP held |
| ----- | --------- | --------- | ---- | ------- |
| 10–15 | 50        | 79        | 2    | 17k     |
| 15–20 | 43        | 131       | 3    | 94k     |
| 25–30 | 30        | 115       | 6    | 160k    |
| 35–40 | 17        | 58        | 8    | 360k    |
| 40–45 | 8         | 3         | 8    | 779k    |

Choice peaks around ADR-3 and drains away; the last five minutes offer one purchase every
~27 s while the player sweeps a full board.

### What is wrong

- **The ending is a counter, not a moment.** After ADR-8 the only goal is `signoff` €100 T: the
  rail is nearly bought out, the tree is done, SP piles up unspent. 7–10 minutes of sweeping
  while one number climbs; the climax is the flattest stretch of the run.
- **ADR-4…8 are the same rung again.** Each adds a card worth ×10 at the same 0.25/s with the
  same five `LINE_NODES`; prices scale with it, so relative power never moves, only the digits.
  The early rungs changed how the board plays (crew, beams, golden, seniors); the late extras are
  mostly passive percentages (`debtInterest`, `timesheets`, `spawnIncident`, `stretch`). The board
  is full at 600 cards from mid-run, so a new tier only recolours the heap.
- **SP stops meaning anything.** SP income plateaus from ADR-3, so every late rung is "wait 3–4
  minutes". Once the tree is bought out, every SP source (poker beams, `estimates<T>`) pays into
  nothing — the purple board §1 wants as a late-game sight is worthless exactly then.
- **The hand learns no new verb.** Hand-only cards arrive at flat rates whatever the tier;
  `escalation` (×5 for 6 s, the best moment in the game) comes about once every 11 minutes
  (0.0015/s). Pizza is the only late toy.

### What to do, most fun per effort first

1. **Late tiers get a behaviour, not just a value.** `flaky` and `zombie` already respawn. Give
   `rewrite` and `swarm` their own: a swarm card splits into several when closed, a rewrite takes
   two sweeps. Ticket data plus a step in `util/board.ts`; each new rung then changes the board.
   The sim must price it (`sim.spec` ×1.5).
2. **Hand-only cards scale with tier.** More escalations and hotfixes as the run climbs gives the
   hand targets worth aiming for and puts spikes into the late curve.
3. **SP stays alive to the end.** An infinite SP sink that pays euros, e.g. an "Overtime" node:
   unlimited ranks, +euro % each, price ×2 a rank. The harvest then has an SP decision, and the
   beams pay off late.
4. **Sign-off is an event.** Shorten the harvest to ~3 min (price `signoff` off ADR-8 income),
   or make it a short final phase: an acceptance push where the board speeds up and something
   specific must be cleared.

Every one of these moves the balance: re-run the balance spec with the reports on, and hold the
late ADR gaps above the two-minute floor.

## 3. Hold the 30-minute run

The target is a 30-minute run, half the reference's full game (57–70). `balance.spec` paces the
run on the advised player (`advisedSpend`): sign-off at 35.0 min; ADR-1 at 2.9, ADR-2 at 5.3,
ADR-3 at 9.3, ADR-8 at 25.0. Cheapest-first (`spend`) takes 45.9 and still guards that the whole
tree is reachable. The advised player reaches the €100 T final with ~3.7 M SP of tree unbought
(the manager line, pizza, `o7`, …), so for it sign-off is euro-bound, not tree-bound. Cards live 3.5 s (reference ~15 s),
chosen by feel, and these departures from the reference pay for it: `estimates<T>` +20 SP a
rank (reference +2), `VOTE_BONUS_BASE` 45 (reference 30), ADR-3 400 000 (reference 600 000), the
ADR-4…8 ladder reshaped for even late gaps, `signoff` 800k, and the poker ladders at ×0.3. The run
ends when the tree is bought out, so run length tracks total tree cost ÷ SP income.

- ADR-2 lands at 11.6 whatever it costs: it is gated by the tree, not by its price.
- Every late gap is 2.1–3.1 min; the guard's 2-minute floor makes ~29 min the practical minimum
  once ADR-4 is at 18.7.
- Returns on SP income flatten: estimates 12 → 24 moves sign-off 39.9 → 32.4 min.
- The crew's close share before golden crew is 4–10 % early (floor 5 %): sparse cards fill
  their batches thinly.

## 4. Copy and art

- The per-line `income<T>` / `double<T>` labels and the `spawn<T>` rank 2–5 labels are
  placeholders ("Lint Warning Uplift II", "Skip the Review III"). Write real names, both
  catalogues.
- Canvas-drawn placeholders: the planning-poker coaches, the release train, the pizza circle, the
  lane actors (`stage/util/board-atlas.ts`). Pipeline: `tools/art-batch.mjs` →
  `pixelate.mjs` / `icon-knockout.mjs`.

## 5. Measure the stage

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

## 6. Render the canvas at device pixel ratio

All Phaser text is soft on a HiDPI screen; the DOM text beside it is sharp. `phaser.service.ts`
sizes the canvas in CSS pixels (`Scale.RESIZE`, `parent.clientWidth`), so on a DPR-2 display the
browser upscales a half-resolution buffer. `pixelArt: true` makes that harmless for sprites, not
for anti-aliased glyphs. The payout floats show it worst.

The fix is a backing store of `clientWidth × devicePixelRatio` shown at CSS size, then every scene
scaling its literal pixel sizes by the same factor — font sizes (`'11px'`, `CLOSE_FLOAT`,
`BIG_FLOAT`), `HOVER_*`, rise distances, the board fit. Fill cost goes ×4 at DPR 2, so do it after
§5 has a profile, and measure both.

## 7. Unstash the weather

This is more than flipping `HAZARDS_ENABLED`: `meeting` was tuned against a 10 s round;
`CREW_EURO_WINDOW_FLOOR` needs re-measuring; `grooming` is a no-op; `migration`'s `supply: 0`
has no counterplay; the two 120 s cadences coincide by accident. Offshore contractors, which
only weather ever staffed, were removed with `3524a98`; the `offshore` hazard went with them.

## 8. Needs a design call

- **The hidden node.** The reference hides a "Wow you found me!" node at the zoomed-out corner of
  its tree. Ours: _the undocumented endpoint_.
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

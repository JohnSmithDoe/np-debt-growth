# Rework — Garbage Growth parity

**Goal:** rebuild Debt Growth to match *Garbage Growth*'s structure 1:1, keeping our own
content — consultancy, tickets, crew, ADRs — on top of it.

**Status:** delivered. Seven stages, all in — see §9. Written September 2026.

The design as it now stands in the code is described in `docs/gamedesign.md`; the
row-by-row audit against the reference is `docs/comparrison.md`; what is still open is
`docs/handoff-next.md`. This file stays the contract and the record of building to it.

---

## 1. Sources

| Fact class | Source | Confidence |
|---|---|---|
| Layout, verb, currencies, rail, tree, spawners, golden chain, prices | 18 screenshots from Martin | **Observed** |
| Can/truck cap, hover feel, rat behaviour, golden progression | Martin, from play | **Told** |
| ~1 h to 100 %, offline progress, no prestige, dev patched skill costs | [Steam](https://store.steampowered.com/app/4680930/Garbage_Growth/) | **Reported** |
| Our own build | `src/`, plus the repo's pacing instruments (§3) | **Measured** |

---

## 2. Garbage Growth, as observed

### 2.1 Shape

One continuous field and one skill tree. No wall-clock round, no review document, no
"continue" button. The clock never stops.

### 2.2 The verb

A translucent cursor radius. **Everything under it is collected**, instantly, and each item
visibly arcs into the can. Area-of-effect, not per-item, and the payoff is a *travel
animation to a destination* — which is why the can is on screen.

**Money is granted per item at pickup.** Shot 18 has a dozen `$42` / `$30` / `$114` floats
live at once.

### 2.3 The can is a hard cap with a forced cooldown

- The can holds N items. **Hard cap.** When full, nothing more can be collected — litter
  under the cursor **jumps in place** and stays on the field.
- When it fills, **a truck empties it, and that takes time. That time is the cadence.**
- Two axes: **more cans, which doubles capacity**, and **more slots**, which adds.

**Pattern — the cadence is an output of your power, not an input.** Get stronger, fill
faster, cycle more often. No `ROUND_LENGTH_MS` anywhere.

### 2.4 The field fills

Litter accumulates across the whole run and is never wiped. The mess is the progress bar.
The yellow specks on the grass are **background flowers**, not collectibles.

### 2.5 Spawners — the content engine

A lane above the field holds actors that drop litter. Each is a **rail line capped at 50**,
bought with money, and they stack visibly — shot 18's lane is a dense crowd of ~20 people
and ~20 dogs.

| Line | Seen at | Price |
|---|---|---|
| `Menschen hinzufügen` | 50/50 | free → $4 → MAX |
| `Hund hinzufügen` | 11/50 → 38/50 | $2 326 → $101 271 |
| `Fahrrad hinzufügen` | 0/50 | $15 000 |

27 levels of `Hund` cost ×43.5, so the line grows at **≈1.15× per level**.

Each spawner is **unlocked by a skill-tree node**, which unlocks the actor *and* its litter
type together: *"Schaltet FAHRRAD-Verschmutzung und BABYS frei"*, *"Schaltet
GORILLA-Verschmutzung und BANANEN frei"* (600 000 gum).

### 2.6 The rail — three tabs

| Tab | Holds | Cap |
|---|---|---|
| **Verschmutzung** | Spawner lines | 50 |
| **Upgrades** | Per-litter income — `Papier-Einkommen` $1 853 at 4/10, `Kacke-Einkommen` $3 403 at 2/10, a third padlocked | 10 |
| **Arbeiter** | `Ratte anheuern` $1 000 | 10 |

Income upgrades are gated on owning the matching litter type.

### 2.7 The rats

- Autonomous wander, **nearest-first**.
- Pick up and deposit **instantly — the same verb the player has** — then **recover for a
  beat**. Rate is gated by a recovery cooldown, not a long work animation.
- **Cannot take golden litter** until a later upgrade turns them golden.
- Capacity is raised by a tree node: `Rattenpopulation`, `0/3`, **+5 rat capacity**,
  20 000 gum.

**Comment.** Instant-action-then-rest reads as *working fast and resting*. A long
walk-and-work animation reads as *nothing is happening*. Our managers take 24 s per action.

### 2.8 Golden — the automation-exempt class

- `Goldene Verschmutzung`, `1/1`, MAX gum: *"+2 % chance: trash becomes GOLDEN and worth
  100×. **RATS do not pick it up.**"*
- `Glänzenderer Goldmüll`, `4/4`, MAX gum: *golden multiplier +50×* — a ladder on top.
- A later node turns the rats golden and lifts the exemption.

**Pattern — an automation-exempt premium class.** Once automation works, the player needs
work the machine refuses. Their attention gets *more* valuable as automation grows: more
rats clear the white chaff, which makes the gold easier to spot. The verb turns from *sweep
everything* into *scan for gold*. Then you buy your way out of it, as a reward.

### 2.9 Two currencies, two surfaces

| | Earned from | Spent on | Where |
|---|---|---|---|
| `$` | Per item, at pickup | Repeatable lines | The **rail**, live |
| Gum | Litter value routed into it (`PAPIER gibt +2 GUM`) | One-off nodes | The **tree** |

**The tree unlocks, the rail buys.** Nodes are `n/m` capped, carry `+` / `%` badges, and
sit mostly padlocked so you can see what you don't have.

### 2.10 Numbers

Late run: $117 856, 133 056 gum. Readable throughout; nothing needs exponents.

### 2.11 What it does not have

No wall-clock round, no review, no target, no fail state, no prestige. It *does* have
offline progress.

---

## 3. Debt Growth, as built

`CB_CLOCK=1 CB_LADDER=1 CB_TARGET=1 CB_SHARE=1 pnpm vitest run src/app/game/data/balance.spec.ts`:

```
reached 8/8  in 65 rounds        ← whole game, 23.7 min, 1370 clicks
SP 207537  unbought: none        ← every node bought, 207k SP spare
crew EUR% 28.3 → 19.9 → 16.1 → 18.7   ← crew share *shrinks* across the run
auto EUR% 0.1                    ← automation is a rounding error
missed 9/56 — 16%                ← and missing the client's target does nothing
```

---

## 4. Decisions

Settled with Martin. These are the contract.

**Spawners are the ADRs.** The 8 debt tiers become spawner lines, plus a new **ADR-0** for
the opening. Nine lines, each capped at 50, priced at ≈1.15× per level. `tier.model.ts`'s
unlock ladder dissolves into them — tiers and spawners are one system, not two.

**ADRs become skill nodes.** Each ADR is a tree node that unlocks its spawner *and* its
ticket type, exactly like `Fahrrad freischalten`. **The game ends when the player buys the
final upgrade.**

**Promotion becomes the golden-crew node.** Golden tickets arrive as a 2 % roll worth 100×
that no crew kind may claim, with a multiplier ladder above it, and a late node that lifts
the exemption.

**Office and desks become a capacity node** — `+5 junior capacity`, a few levels, SP —
mirroring `Rattenpopulation`. `OFFICE_PLAN`, `DESKS_PER_PLATE` and the kit ladder go.

**Hazards and weather are stashed**, not deleted. The files stay; nothing drives them.

**The sprint bar is the can.** `stage/scene/sprint-strip.ts` stays and becomes the capacity
gauge.

**Art:** spawners reuse the existing skill icons in `src/assets/skills/`; one new icon for
ADR-0. Crew keep their LPC sprites.

---

## 5. The four structural gaps

**1. Our cadence is a wall clock; theirs is the player's throughput.** We end a round every
10 s regardless, then block on a full-page document (`app.component.html:95`) — 65 times per
run, most containing no decision. The fix is **not** to delete the round: it is to delete
the **timer** and the **modal** and let the boundary fall out of the cap.

**2. We wipe the board; the reference accumulates.** `emptyBoard()` deletes the evidence of
your own decay six times a minute. A game called Debt **Growth** cannot show growth.

This also explains the crew share. A junior walks 90 units/s across a 1000-wide board and
takes 5 s to close, so on a board that resets every 10 s it manages one ticket while the
player clicks ten. Removing the wipe is what makes bands, traits and desks load-bearing.

**3. Our litter has no source.** `spawnInto` conjures tickets from nothing at a flat rate.
`debtInterest` — the joke this project rests on — is an invisible probability roll.

**4. One purchase surface, reached through the review.** All 57 nodes behind one screen.

---

## 6. Work plan

### 6.1 Delete

- `ROUND_LENGTH_BASE_MS`, `ROUND_TARGET_OF_BASELINE`, `roundLengthMs`, `roundTarget`,
  `#roundLeftMs`.
- `SPRINT_OVERFLOW_RATE` and `overflowFactor` — the reference is a hard wall with a bounce.
  Legibility comes from the feedback, not the softness.
- `priceSprint` / `sprintInvoice` / `mergeInvoices` / `sprintPayout` — income is instant, so
  `escalation` becomes a timed multiplier like `hotfix` already is.
- `console/feature/sprint-review/` and `console/util/round-review.ts`.
- `app.component.html`: the `interval-bar` and `<cb-sprint-review>`.
- `emptyBoard()` at cycle start.
- `tier.model.ts` — dissolved into spawners. `baselinePerRound` with it.
- `OFFICE_PLAN`, `DESKS_PER_PLATE`, `KIT_PLAN`, promotion.

### 6.2 Change

- **`phase` re-meant** as `'collecting' | 'hauling'`. `hauling` starts when the can fills,
  blocks collection only, never blocks the game. Spawning and crew continue through it.
- **Collection** off `POINTER_MOVE` within `clickRadius`, clearing **everything** in range,
  each ticket animating into the can. Click stays as a touch fallback.
- **Blocked collection bounces** — the whole feedback channel for the cap.
- **Board persists.** `BOARD_CAPACITY` 600 stalls spawning when reached.
- **`handOnly` becomes golden** — a 2 % roll on any spawning ticket at ~100×, no crew kind
  may claim it, including offshore via `takesRares` (`economy.ts:447`).
- **Crew re-paced** to instant-action-plus-recovery.
- **Crew hire moves to the rail**; the tree keeps the one-off unlock per kind.
- **Tree becomes SP-only.**
- **Offline progress** — `MAX_CATCHUP_MS` from 5 s to a bounded window.
- **Number rescale** so the run never reaches `9e7`.
- **Stretch the run** toward ~1 h via tree cost.

### 6.3 Build

- **The spawner lane** — a row above the board, nine lines, visibly crowding as bought.
- **The rail** — three tabs replacing `cb-lifetime-stats` / `cb-activity-feed`.
- **The haul** — cap gauge on the sprint strip, haul duration, resume.
- **Floating value popups.**
- **Golden tickets** and the golden chain.

### 6.4 Keep

Crew kinds, bands, traits, the women-close-faster rule. `store.board` as a plain mutable
object and the eslint rule keeping `board.ts` unpriced. Two currencies and the velocity
skim. Sheriff layering. Awards, achievements, post-mortem, and the title-screen credits
footer with its legal duties (`README.md` — not negotiable).

---

## 7. Content — the nine ADRs

| ADR | Ticket | Spawner actor |
|---|---|---|
| 0 | `lint`, `bug` | Interns |
| 1 | `legacy` | Contractors |
| 2 | `flaky` | The CI runner |
| 3 | `conflict` | A second team |
| 4 | `slop` | An AI coding assistant |
| 5 | `rockstar` | The rockstar |
| 6 | `zombie` | A deprecated service nobody owns |
| 7 | `rewrite` | A new CTO |
| 8 | `swarm` | The architecture board |

The rail line reads *"Hire another developer"*: you pay people to make the codebase worse,
and bill the client to clean up after them. That is `debtInterest`, promoted from a hidden
roll to the main verb.

**Golden** is the ticket the crew won't touch — above their pay grade, politically
radioactive — and the partner sweeps it personally. Late, you buy them the clearance.

**The haul** is the sprint shipping: the cap fills, the work goes out, and nothing can be
closed until it lands. The meeting is the bottleneck.

---

## 8. Still open — answered

1. ~~**What paces a 1-hour run.**~~ Solved empirically: the ADR ladder is the SP sink and
   the rates tab is the euro sink that keeps income compounding once every line caps.
   `balance.spec.ts` asserts the result rather than the recipe.
2. ~~**Do cans multiply the slot total, or carry their own slots?**~~ They multiply it —
   `sprintSlots = (base + Σ slots) × 2^cans`.
3. ~~**Areas.**~~ Out of scope, by Martin's call. Recorded as an accepted divergence.

---

## 9. Staging, and where it stands

All six stages are in. The game is continuous, swept by hand, paced by the can and the
truck, supplied by developers you hire, and ended by a purchase.

| # | Stage | State |
|---|---|---|
| 1 | **The loop** — timer and modal out, board persists, hard cap, haul, hover sweep, instant income | done |
| 2 | **Spawners** — nine ADR lines scaling supply | done |
| 3 | **The rail** — live shop, Pollution and Crew tabs | done |
| 4 | **The tree** — SP-only, golden chain, `signoff` ends the run | done |
| 5 | **Crew** — file on arrival then recover, golden clearance | done |
| 6 | **Balance** — retuned and asserted | done |
| 7 | **Parity** — the fifteen open rows of `comparrison.md` | done |

### Stage 7 — parity

A seventh stage closed the fifteen rows `docs/comparrison.md` had left open. Three of
them were Martin's to call, and he called them: ADR unlocks move onto the tree as SP
nodes, offline progress goes in, new areas stay out.

| What | Where |
|---|---|
| **ADRs are tree nodes** (§4's contract, finally) | `adr1`…`adr8`, chained, SP-priced from `DEBT_TIERS.spCost` |
| **Two capacity axes** | `slots` became additive; `cans` doubles on top |
| **Desks are a `+5` node** | `headcount`, five ranks; `OFFICE_PLAN` no longer seats anyone |
| **The rates tab** | `state.income` per ticket, `0/10`, gated on owning its spawner |
| **The lane crowds** | one walker per head bought, all nine lines mixed into one band |
| **Refusal bounces** | `harvest` reports `refused`; the heap hops those cards in place |
| **Flowers** | a second, untinted floor tile layer that is drawn and never in the model |
| **`+`/`%` badges** | `skillBadge` reads the next rank's effects |
| **Offline progress** | a bounded 4 h window at 40 %, estimated in one step |

Two things had to move to make the ADR ladder work on the tree. The first copilot now
ships with the run — the tree is bought in story points, and nothing produced any before
ADR-1 handed one over. And `root` ships bought: it costs nothing, the whole tree hangs
off it, and leaving it unclicked stranded the ADR panel's own button. That last one only
showed up on playing the build.

### The measurement

```
first junior 3.1   ADR-1  7.6   ADR-2 17.9   ADR-3 25.2   ADR-4 26.8
ADR-5       32.0   ADR-6 42.3   ADR-7 50.8   ADR-8 60.7   signed off 67.1
```

Against the build this started from — 23.7 min, 207 537 spare SP, crew share *shrinking*
28 % → 18.7 %:

- **67.1 min to the purchase that ends the run**, against the reference's ~1 h, on a
  curve whose gaps widen instead of collapsing. `balance.spec.ts` asserts the band, a
  two-minute floor on the last five gaps, and that the tree finishes empty. The design
  doc's §11.3 called that the single highest-value test in the project; it exists now.
- **The cadence is the truck**, produced by the player's own throughput.
- **The crew earn a growing share** — 15 % at minute 25, 26.5 % by the end — and
  automation is a quarter of the money rather than a rounding error.

### What is deliberately parked

- **Weather** is stashed behind `HAZARDS_ENABLED`, rows and specs intact. The crew-euro
  floor drops with the offshore headcount it used to staff, and says so in place.
- **New areas** (the reference's park → moon) stay out of scope. Our analogue is a second
  client, which needs a design call nobody has taken. Recorded in `comparrison.md` as an
  accepted divergence rather than a gap.
- **The ADR panel duplicates the tree node it buys.** Parity only asks that the unlock
  live on the tree; the panel is a shortcut to the same purchase, kept because deleting
  the last route to a purchase is exactly how the previous pass shipped a broken build.
- The supply/drain invariant band was widened when `ceilingPerSec` moved to the haul, and
  is marked in place.

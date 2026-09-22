# Rework — Garbage Growth parity

**Goal:** rebuild Debt Growth to match *Garbage Growth*'s structure 1:1, keeping our own
content — consultancy, tickets, crew, ADRs — on top of it.

**Status:** design locked, implementation staged in §9. Written September 2026.

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

## 8. Still open

1. **What paces a 1-hour run.** Not answered by the reference; to be solved empirically with
   the instruments in `balance.spec.ts` and asserted, rather than copied.
2. **Do cans multiply the slot total, or carry their own slots?**
3. **Areas** (the reference's park → moon). Our analogue is a new client. Out of scope.

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

### The measurement

```
ADR-1  1.3   first junior 3.2   ADR-2  4.6   ADR-3 12.4   ADR-4 17.0
ADR-5 22.1   ADR-6 29.7         ADR-7 48.0   ADR-8 66.6   (minutes)
```

Against the build this started from — 23.7 min, `unbought: none`, 207 537 spare SP, crew
share *shrinking* 28 % → 18.7 %:

- **66.6 min**, against the reference's ~1 h, on a curve whose gaps widen instead of
  collapsing. `balance.spec.ts` now asserts both — a 35–100 min band and a floor on the
  last three gaps. The design doc's §11.3 called that the single highest-value test in the
  project; it exists now.
- **The cadence is the truck**, ~5.6 s a cycle, produced by the player's own throughput.
- **The crew read as working**: they file on contact and recover, rather than standing over
  a card for 4–24 s.

### What is deliberately parked

- **Weather** is stashed behind `HAZARDS_ENABLED`, rows and specs intact. The crew-euro
  floor drops with the offshore headcount it used to staff, and says so in place.
- **`tier.model.ts` still gates the spawner lines.** §4 wants ADR unlocks on the tree as
  `Fahrrad freischalten` nodes; they are still `state.tier`. `baselinePerRound` is now
  unread by anything.
- **The rail has two tabs, not three** — no per-ticket income upgrades yet.
- **No offline accrual.** `MAX_CATCHUP_MS` is still 5 s. The reference has offline
  progress; Martin chose an active game, so this stays a deliberate divergence.
- The supply/drain invariant band was widened when `ceilingPerSec` moved to the haul, and
  is marked in place.

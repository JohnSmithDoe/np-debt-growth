# Debt Growth — game design

A reading of the design **as it exists in the code** (September 2026, after the Garbage
Growth rework and the parity pass that closed it), written from `game/` — the simulation,
the balance tables and the specs that guard them.

Facts here were read out of the source, not inferred from the pitch. Where a number is
quoted, the file is named. Sections marked **Comment** are opinion: my read on what the
design earns and where it is fighting itself. Everything else is description.

`docs/rework-garbage-growth.md` is the contract this shape was built to;
`docs/comparrison.md` is the row-by-row audit against the reference. This file describes
the result.

---

## 1. The premise, and why it is mechanically real

A consultancy is **billed by the hour**. It closes tickets for money. Therefore worse code
is an asset: more tickets, dearer tickets, more hours. The joke is that the studio invests
in its own decay.

This is not flavour text sitting on top of a generic incremental. Three mechanisms make
the premise the actual economy:

- **Spawner lines** (`spawner.model.ts`, `economy.sourceMultiplier`). Nine lines, one per
  ADR, capped at 50 heads and climbing 1.15× a head. A line with nobody on it produces
  nothing. **You pay people to make the codebase worse, then bill the client to clean up
  after them** — and that is the main euro sink for most of the run.
- **Debt interest** (`util/supply.ts`). Every spawn rolls against
  `economy.debtInterest(state)`; on a hit, the ticket that arrives is **one rung dearer**
  than the one that was due (`interestTarget` → `ladderUp(id, 1, tier + 1)`). The
  `debtInterest` skill track buys that probability up toward a cap of `0.25`
  (`balance/flow.ts`, via `approachCap`).
- **Tier-scaled value** (`economy.ticketValue`). `incident` has `scalesWithTier: true`, so
  the worse your accumulated debt, the more one fire is worth.

**Comment — this is the design's strongest idea, and the rework promoted it.** It used to
be a hidden probability roll; it is now the thing you spend money on and the thing you
watch walking across the top of the screen. The theme and the growth curve are the same
mechanism, and the satire is load-bearing.

---

## 2. The core loop

Two clocks, not three. **There is no round timer.**

| Clock | Length | Source |
|---|---|---|
| Sub-tick | `TICK_MS` 100 ms | `GameClock` → `store.advanceTo` |
| Run | until you buy the last upgrade | `runMs` |

The cadence is the **can and the truck**:

1. **Tickets spawn** onto the board at `ratePerSec × heads on that line`, metered through
   `SpawnBudget` (fractional credit carried between ticks, burst-capped at
   `SPAWN_BURST_CAP` 12) so a lag spike cannot dump a hundred cards.
2. **Unreached work is closed as "won't fix".** Every crew-workable card lives
   `TICKET_LIFE_MS` 15 s unclaimed, then leaves (`expireTickets` in `util/board.ts`;
   hand-only rares never expire, a claimed card holds its clock). Density is spawn rate ×
   lifetime, so the field tracks what was bought; `BOARD_CAPACITY` 600 is only a safety cap.
   Counted in `lifetimeWontFix`.
3. **Work is collected** — by the player sweeping a radius (everything under the cursor,
   once a frame, `BoardScene.#sweep`), by the crew walking to cards, or by automation.
   **Money lands per ticket, at pickup.**
4. Each close consumes one **can slot**. When the can fills, `phase` flips to `'hauling'`
   and **nothing can be collected until the truck returns** — `HAUL_MS` 4 s, floored at
   `HAUL_MIN_MS` 2.5 s. Spawning and crew walking continue through it.

```
ceilingPerSec = sprintSlots / (haulMs / 1000)
```

**Pattern — the cadence is an output of your power, not an input.** Get stronger, fill the
can faster, cycle more often. There is no `ROUND_LENGTH_MS` anywhere, and a round boundary
is something that *happens to you* rather than something you wait for.

The cap is **hard**. There is no overflow rate: past capacity, `#withinCan` refuses the
ticket, reports it as `refused`, and the scene bounces it where it lies
(`REFUSAL_BOUNCE`). Legibility comes from the feedback, not from softness.

**Comment — the best structural decision in the game, and the rework improved it.** The
old soft overflow made the last seconds of a timed round merely inefficient; the hard cap
plus a visible bounce makes the same fact readable in one frame, and it removes the wall
clock the whole design was fighting. Both a clicker and an idle build still hit the same
wall, and both have to buy into the same two knobs — which are now *two different shapes*
of knob (see §6).

---

## 3. Two currencies

| | Symbol | Earned from | Spends on |
|---|---|---|---|
| **Budget** | € | Every pickup, the retainer, board bills | The rail: spawner lines, crew heads, income rates |
| **Story Points** | SP | Every pickup (base value, once the €25 row is bought), planning-poker votes, copilots, awards | The tree — **all of it**, ADRs included |

**The tree unlocks, the rail buys.** That split is now clean: no node costs euros, and no
rail row costs points.

SP has three sources (`RoundOutcome.spVelocity / spCopilots / spAwards`):

- **SP at pickup** (`economy.pickupStoryPoints`) — each ticket pays its base value in SP, plus `estimates` and any planning-poker votes it fell through; crew closes ×2 with `timesheets`. Income ranks lift euros only, so SP falls behind money late.
  `approachCap(0.35, 0.88 ** level)`: the cap is 35 %, approached with diminishing
  returns, so early velocity levels are the valuable ones. Converted at
  `VELOCITY_SP_PER_EURO` 0.0006.
- **Copilots** — flat SP per close, `COPILOT_SP_PER_CLOSE` 0.013 × copilots ×
  `copilot` multipliers.
- **Awards** — one-off grants in `award.model.ts`.

**The first copilot ships with the run** (`FREE_COPILOTS` 1, granted in
`freshConsultancy`). It has to: the tree is bought in story points and the ADR ladder is
on the tree, so a run with no SP source has nothing it can do. It used to arrive with
ADR-1, which was fine while ADR-1 cost euros and is a deadlock now.

**Comment — the skim is still the cleverest economy piece.** It is a *self-imposed tax*:
you choose to be paid less now to progress faster. Making the tree SP-only sharpened it —
the skim is now the only bridge between the two currencies, so its level is the single
number that decides how fast the run advances versus how fast it earns.

---

## 4. The board and the ticket taxonomy

Fifteen types (`ticket.model.ts`). Two families.

### The value ladder — ten rungs, one per debt tier

| Type | Value | Rate/s | Tier | Spawner | Notes |
|---|---|---|---|---|---|
| `lint` | 1 | 0.60 | 0 | ADR-0 | |
| `bug` | 4 | 0.28 | 0 | ADR-0 | held back until 90 s |
| `legacy` | 12 | 0.90 | 1 | ADR-1 | |
| `flaky` | 30 | 1.60 | 2 | ADR-2 | **respawns** |
| `conflict` | 90 | 5.0 | 3 | ADR-3 | |
| `slop` | 260 | 7.0 | 4 | ADR-4 | |
| `rockstar` | 1 400 | 9.5 | 5 | ADR-5 | |
| `zombie` | 6 000 | 13 | 6 | ADR-6 | **respawns** |
| `rewrite` | 26 000 | 17 | 7 | ADR-7 | |
| `swarm` | 110 000 | 22 | 8 | ADR-8 | |

`ratePerSec` is now a *per-head* rate: the actual arrival rate is
`ratePerSec × spawnerCount(adr) × skill multipliers`. A rung with an approved ADR and an
empty line produces nothing.

This is `RETYPE_LADDER` (value-effect, non-hand-only types, sorted by tier) and it is what
`ladderUp` walks for both debt interest and manager relabelling. Value and rate both
climb, so nothing on the ladder is dominated — asserted in `data/balance-invariants.spec.ts`.

`respawns: true` doubles effective close rate (`closeRate = spawnRate × 2`).

### Hand-only events — the texture

`handOnly: true` means **no purchase makes them arrive faster** (enforced by
`economy.spec.ts`). Only the crew kind that `takesRares` — offshore — can claim them
otherwise.

| Type | Effect | Rate/s | What it does |
|---|---|---|---|
| `incident` | `value` | 0.008 | Pays 150 × tier. ×100 rate in a `storm`, ×25 in a `page` |
| `escalation` | `sprintMultiplier` | 0.0015 | Arms ×5 on every close in a 6 s window |
| `hotfix` | `hotfixBuff` | 0.006 | ×2 ticket value for `HOTFIX_MS` 10 s |
| `quarter` | `billBoard` | 0.0012 | Bills every resting ticket on the board at once |
| `invite` | `decline` | — | The dismissable hazard invitation (stashed, see §7) |

**Escalation is a live window now, not a bill.** It sets
`escalationFiresAt = now + ESCALATION_HOLD_MS` (6 s) and the ×5 rides every close inside
it, then lapses — it no longer multiplies a sprint at an invoice. The play is still to
sweep hard into the window.

### Golden — the automation-exempt class

A 2 %-per-rank roll on any arriving ticket (`goldenChance`, capped at
`GOLDEN_CHANCE_CAP` 0.2) makes it worth `GOLDEN_VALUE_BASE` 100 × the `goldenValue`
ladder — **and no crew kind may claim it**, offshore's `takesRares` included, until the
late `goldenCrew` node sells the exemption back.

**Comment — this is the mechanism that keeps the player's hand worth using.** Once
automation works, the player needs work the machine refuses, and their attention gets
*more* valuable as automation grows: more crew clears the white chaff, which makes the
gold easier to spot. The verb turns from *sweep everything* into *scan for gold*. Then you
buy your way out of it, as a reward. It is the single best idea taken from the reference.

### The first act is scripted

`util/first-act.ts` withholds `incident` until 75 s and `bug` until 90 s, and force-spawns
the first incident exactly when it becomes legal.

**Comment — good instinct, wrong altitude.** Holding types back so the player meets one
mechanic at a time is right. But it is an `if (type === 'incident')` ladder in code, so
"reveal a type later" is a code change rather than a data change. A `revealAtMs?` field on
`TicketType` would make the whole opening tunable. Still flagged, still not done.

---

## 5. The crew

Four kinds, one row each in `CREW_STATS` (`game/model/balance/crew.ts`). The array order
**is** the board claim priority: offshore → seniors → juniors → managers.

| | close | walk | batch | sweep | band | woman/n | retainer | headcount |
|---|---|---|---|---|---|---|---|---|
| **offshore** | 4 s | 130 | 1 | 0 | 0–∞ | 4 | 0 | weather only |
| **seniors** | 10 s | 70 | 3 | 70 | **2–∞** | 6 | 280 | `levels.senior` |
| **juniors** | 5 s | 90 | 1 | 40 | **0–3** | 4 | 20 | `levels.junior` |
| **managers** | 24 s | 110 | 1 | 0 | 0–∞ | 3 | 420 | `levels.manager` |

Crew **file on arrival and then recover** rather than standing over a card for the whole
close time — the same verb the player has, rate-limited by a cooldown. A long
walk-and-work animation reads as *nothing is happening*; instant-action-then-rest reads as
*working fast and resting*.

### Bands are the division of labour

Juniors work tiers 0–3 (extendable by `juniorReach` and the `stretch` skill). Seniors work
**tier 2 and up** and cannot touch the cheap stuff. So seniors are not a strict upgrade —
they are a different tool, and a senior on a fresh board has nothing to do.

**Comment — quietly excellent.** It converts "buy the better unit" into "buy the unit that
matches your board", and it is why the ADR climb matters beyond raw numbers: climbing it
is what gives your expensive crew anything to claim. The overlap at tiers 2–3 is where the
two bands compete, which is exactly where it should be.

### Seniors are individuals

Each seat gets a `SeniorHire` with one trait, cycling deterministically by seat index
(`senior.model.ts`, `hireFor`: `TRAIT_IDS[seat % 5]`):

`closer` ×1.25 close · `sweeper` ×1.4 sweep · `runner` ×1.5 walk · `firefighter` claims
top-of-band · `scout` claims nearest.

Traits fold through the same `SkillEffect` union as skills, so a trait and a skill are the
same kind of thing to the engine. The trait ceiling is guarded (`TRAIT_D21_CEILING` 1.25
in `balance.spec.ts`).

### Managers do not close — they relabel

`mode: 'refiler'`. A manager takes a ticket and walks it **up the ladder**
(`relabelTarget` → `ladderUp(id, relabelSteps, tier)`), turning a cheap card into a dearer
one for someone else to close. 24 s per action, the slowest unit in the game.

**Comment — the best-themed unit, and the most at risk.** "Management converts small
problems into big ones and bills for it" is the whole satire in one sprite, and it is a
genuinely different purchase shape: a force multiplier on other crew. But its claim
predicate finds nothing on a board with no relabellable cards, and at 24 s per action it
contributes very little while costing the most retainer. Still the unit I would watch
hardest in a rebalance — more so now that a persistent board gives it far more to scan.

### Desks

`desks = DESKS_BASE (10) + Σ desk effects`, and `deskLimited` blocks a hire when there is
no free desk. The only source of desks is the **`headcount` node** — five ranks of
`DESKS_PER_RANK` +5, on the crew track, in SP. The office track no longer seats anyone.

**Comment — additive is the right shape, and it was worth the change.** Desks used to be
`officePlates × 10`, which meant an office purchase multiplied your whole crew cap in one
step; the reference's `Rattenpopulation` adds five at a time and the growth stays legible.
The office track kept its own effects and its floor art, and lost a job it should never
have had.

### The women-close-faster rule

`WOMAN_CLOSE_RATE = 2`. Every *n*-th seat is a woman (per-kind `womanEvery`), and those
seats close in **half** the time. Tracked for the whole run (`lifetimeClosedByWomen`) and
surfaced in the post-mortem.

**Comment — a deliberate authorial statement, implemented as a real mechanic rather than a
label.** It changes `crewRate`, the ceiling maths, the cast pools and the sprite chosen.
It is *load-bearing*: because juniors are 1-in-4 and seniors 1-in-6, and promotion re-reads
the bench at the junior ratio, the promotion decision has a throughput consequence. If
that ratio is ever retuned, promotion value moves with it.

---

## 6. Progression

Four interlocking systems, and they are now cleanly separated by currency.

### The ADR ladder — the spine, on the tree

Eight rungs (`tier.model.ts`), each a chained tree node (`adr1`…`adr8`) that unlocks the
spawner line **and** the ticket type together:

| ADR | SP | Unlocks | ×prev |
|---|---|---|---|
| 1 | 12 | `legacy` | — |
| 2 | 110 | `flaky` | 9.2 |
| 3 | 900 | `conflict` | 8.2 |
| 4 | 16 000 | `slop` | 17.8 |
| 5 | 130 000 | `rockstar` | 8.1 |
| 6 | 440 000 | `zombie` | 3.4 |
| 7 | 1 400 000 | `rewrite` | 3.2 |
| 8 | 4 200 000 | `swarm` | 3.0 |

`adrNodeId(n)` names the square. The nodes carry `{ kind: 'adr', adr: n }`, and
`GameStore.buySkill` is what raises `state.tier`, fires the one-off `TIER_BURST` at tier 3
and marks the burndown approval. `unlockNextTier()` still exists as the ADR panel's
shortcut — it buys the same node.

There is no `baselinePerRound` and no round target. The client's line is gone with the
round it scored.

**The last purchase ends the run.** `FINAL_SKILL_ID` is `signoff` (3 000 000 SP, gated on
ADR-8 and `goldenCrew`); buying it sets `endedAt`.

### The skill tree — ten tracks

`root` plus ten lettered tracks (`skill.model.ts`). **Every node is SP.** `root` ships
bought — it costs nothing, the whole tree hangs off it, and an unbought root strands the
ADR ladder including the rail panel's own button.

| Track | Theme |
|---|---|
| **A** | The hand — click radius, `capacity` (slots), `cans`, haul `duration`, line of sight, the golden chain |
| **B** | Juniors — `headcount` (desks), speed, reach, standup aura, ticket stacking |
| **E** | Seniors — speed, reach, presence |
| **H** | Managers — speed, relabel steps |
| **F** | Tooling — copilots, and the `autoClose` automation chain |
| **D** | Supply — debt interest, triage policy, per-type spawn rates |
| **C** | Client — income, escalation, velocity, per-type ticket value |
| **G** | Late capstones — `assurance`, `stretch`, and `signoff` |
| **N** | The ADR ladder — eight chained rungs |
| **O** | The office — seven plates plus the `kit` ladder |
| `secret` | Konami-gated, ×1.1 global |

Nodes gate on tier (`tier1`…`tier8`) or on owning a crew line. Each square carries a
`+`/`%` badge read off its next rank's effects (`skillBadge`), so additive and
multiplicative are distinguishable before you click.

### The can has two axes

```
sprintSlots = (SPRINT_SLOTS_BASE 14 + Σ slots.add) × 2 ^ (cans ranks)
```

`capacity` **adds** (+6 +8 +10 +14 +18). `cans` **doubles**, three ranks. Taken from the
reference, which sells "more slots" and "more cans" as separate purchases.

**Comment — the two shapes matter more than the numbers.** An additive ladder is a
smooth, always-affordable trickle; a doubling is a rare, run-changing jump. Having both on
the same resource gives the shop a rhythm that neither alone does.

### The rail — three tabs, all euros

| Tab | Holds | Cap | Cost |
|---|---|---|---|
| **Debt** | Nine spawner lines, one per ADR | 50 | base × 1.15^level |
| **Rates** | Per-ticket income, ten rows | 10 | spawner base × 16 × 1.75^level |
| **Crew** | The six `PURCHASE_IDS` lines | per line | `LINE_PLAN` × 1.15^level |

A **rate** lifts one ticket type's value by `INCOME_VALUE_STEP` 1.3 a rank and opens only
once that ticket's spawner has a head on it (`incomeUnlocked`).

**Comment — the rates tab is what makes the late game a curve rather than a plateau.**
Once every line has capped at 50 there is nothing else a euro can buy, and before the tab
existed the measured run went flat from minute 120 onward with a budget climbing into the
1e10 with nothing to spend it on. It is not decoration; it is the only compounding euro
sink past the caps.

### Purchase lines

`PURCHASE_IDS`: `junior`, `senior`, `copilot`, `velocity`, `kit`, `manager`. The tree opens
each line once (`{ kind: 'line', line }`); every head after that is bought on the rail.

---

## 7. Weather — stashed, not deleted

`HAZARDS_ENABLED` is **`false`**. The mechanism, the ten rows and their specs are intact;
nothing drives them.

A `Hazard` is a row with a `fromTier`, a `durationMs` and an optional
`weather?: Partial<Weather>` patch. `Weather` has five fields: `meeting`, `incidentRate`,
`slots`, `offshore`, `supply`. Two kinds arrive on separate cadences: **invitations**
(`INVITATION_EVERY_MS` 120 s, a 4 s window to decline) and **facts** (`FACT_EVERY_MS`
120 s, a 5 s countdown, not declinable).

**Comment — the right altitude, and worth unstashing deliberately rather than by
accident.** One general patch mechanism subsumes ten special cases; adding a hazard is
adding a row. Three notes still stand from before the stash: `grooming` is a no-op,
`migration`'s `supply: 0` is the meanest thing in the game with no counterplay, and the
two 120 s cadences interleave by luck rather than by design. One new one: **the crew-euro
floor in `balance.spec.ts` drops when hazards are off**, because the offshore headcount
they staffed is gone — `CREW_EURO_WINDOW_FLOOR` reads `HAZARDS_ENABLED` and says so in
place. Turning weather back on means re-measuring that floor, not just flipping the flag.

---

## 8. Automation, and the idle question

The `F` track buys `autoClose` for one ticket type at a time (`autoLint` → `autoBug` →
`autoLegacy`/`autoFlaky`/`autoConflict`, tier-gated). An automated ticket files itself
after `AUTO_CLOSE_MS` 3 s, **consuming a can slot** like any other close
(`util/supply.ts`, `fileAutomated`).

Automation therefore *competes with your crew for capacity* rather than adding to it. A
spec watches that the crew keeps earning a floor share of € across a simulated
playthrough (`balance.spec.ts`).

**Comment — correct and non-obvious.** Making automation spend the same slots is what
stops the endgame from being "automate everything, fire the crew". Keep that invariant.
The measured run has automation at 27.7 % of euros in the last window against the crew's
33.9 % and the player's hand for the rest — three sources in the same order of magnitude,
which is what the invariant is for.

### The offline story

Bounded, estimated, and deliberately worse than playing:

```
away    = min(elapsed, OFFLINE_MAX_MS 4 h) − MAX_CATCHUP_MS
seconds = away / 1000 × OFFLINE_RATE 0.4
gross   = unattendedEuroPerSec(state) × seconds
```

`unattendedEuroPerSec` prices the mix the lines actually drop and clamps it by the can:
`avg € per ticket × min(supply, ceilingPerSec)`. SP comes through the same skim and
copilot rates as a live close. It is paid in **one step** — four hours of board stepped at
10 Hz is 144 000 iterations and would freeze the tab, so past `MAX_CATCHUP_MS` the game
stops simulating and starts estimating.

Two non-obvious consequences, both easy to "fix" back by mistake:

- **`resumed()` keeps `lastTick`.** It used to reset it to `now`, which is exactly what
  erases the gap the accrual is measured from.
- **The title screen is inside the window.** The clock only starts on
  `DoorService.opened()`, so time spent on the splash counts as time away. Bounded by the
  same 4 h cap, and arguably correct — you were not playing.

**Comment — the genre's promise, honoured without letting it replace the game.** 40 % of
measured throughput means coming back is worth something and playing is worth more, and
capping at four hours stops a week away from skipping the run. The retainer was the
natural vehicle and it is in there, but the bulk of the payout is the floor doing what it
does when you watch it, discounted.

---

## 9. How money is actually computed

**Money lands per ticket, at pickup.** There is no invoice, no sprint payout, no overflow
step — the can is a hard cap, so nothing past capacity is ever priced.

```
ticketValue = type.value
            × per-type skill multipliers
            × income rate (1.3 ^ rank)
            × tierScale (if scalesWithTier)
            × global
            × hotfix (×2 inside the window)

closeValue  = ticketValue × escalation (×5 inside the window)
            × golden (×100 × the goldenValue ladder, if the card rolled gold)
```

`velocitySkim` then takes its cut off the top and books it as SP; the remainder is the
budget.

Alongside pickups, two other income sources land:

- **Retainer** — `Σ headcount × retainer`, scaled by slots relative to base, accrued per
  second. Crew bill *for existing*, not for working.
- **Board bills** — the `quarter` ticket bills everything resting on the board at once,
  which on a persistent board is now a considerably bigger event than it was.

**Comment — the retainer is doing quiet, important work.** It is the only income that does
not depend on closing anything, which means a big crew is a floor under a bad stretch. It
is also what carries the offline window when the board is thin.

---

## 10. Where the knobs live

The rule is: **the mechanism's own table is its tuning unit.**

| Concern | Tuning unit |
|---|---|
| A crew kind | one row in `CREW_STATS` (`balance/crew.ts`) — pace, band, retainer, claim priority, which skill kinds reach it |
| A ticket type | one row in `TICKET_TYPES` |
| An ADR rung | one row in `DEBT_TIERS` — index, ticket, `spCost`; the tree node is derived from it |
| A spawner line | one row in `SPAWNERS` — base cost, what it drops |
| An income rate | `INCOME_*` in `balance/progression.ts`, priced off the spawner row |
| A crew line | one row in `LINE_PLAN` |
| A hazard | one row in `HAZARDS` |
| A kit item | one row in `KIT_PLAN` (price included) |
| A skill | one node in `SKILL_NODES` |
| The can and the truck | `balance/round.ts` |
| Offline | `OFFLINE_*` in `model/game.consts.ts` |
| Cross-cutting coefficients | `balance/{curve,flow,progression,round,weather}.ts` |
| The lane's look | `LANE` in `stage/model/board.consts.ts` |

`data/balance-invariants.spec.ts` guards the *shape* rather than the values: ladders
monotone, tiers numbered by position, each tier's ticket matching its rung, every rung
hung on the tree and chained to the one below, no dominated retype rung, the crew table
actually read by the accessors, kit plan and kit ladder the same length.

`data/balance.spec.ts` guards the *pacing*: a simulated playthrough that has to reach
sign-off inside 35–100 minutes, space the last five rungs more than two minutes apart, and
leave nothing on the tree unbought. Its `CB_*` reports print the clock, the ladder, the
income and SP curves and the crew share.

---

## 11. Comment — the open design problems

Ranked by how much they would distort a rebalance.

1. **A senior seat still has two prices, and the rework inverted which is cheaper.** The
   rail sells seats at `1 200 × 1.15^n` — seat 5 for ≈ 2 100. Promotion sells the *same
   seats* via `SENIOR_BUYOUT_STEPS × PROMOTION_PREMIUM (1.6)` — five of them for ≈ 46 800.
   Promotion used to be the bargain and is now the rip-off, which means the autoplayer
   takes it only when starved. Nothing ties the ladders and no test compares them. **Pick
   one and derive the other**, or delete promotion: §4 of the rework contract wanted it
   replaced by the golden-crew node, and half of that happened.

2. **The autoplayer — the most important balance instrument — is trapped in a spec file.**
   `class Playthrough` (~270 lines in `balance.spec.ts`) is a model of how a player spends,
   with one hard-coded policy and a `switch` over `PurchaseId`. It is a balance artifact,
   not a fixture. Extracted to `game/util/autoplay.ts` with the policy as data, the same
   bot could be run across several policies and seeds, and driven from the debug door for
   tuning sweeps. **This is now the highest-value refactor in the project** — every number
   in §6 was tuned through it, and it can only express one player.

3. **ADR-3 → ADR-4 is 1.6 minutes.** The measured gaps widen from ADR-4 onward (5.2, 10.3,
   8.5, 9.9, 6.4) and the spec asserts a two-minute floor from there. The 3→4 step is
   outside that assertion because income spikes hard when `slop` arrives and no cost I
   tried moved it. It wants the *income* smoothed rather than the cost raised.

4. **`officePlates` still counts the `kit` node.** `OFFICE_NODE_IDS` is every non-heading
   node on track `O`, kit included, so buying kit widens the office floor art by a plate.
   Harmless now that plates no longer seat anyone — it was a real bug when they did — but
   still wrong.

5. **Some knobs are stored twice.** `VELOCITY_UNLOCK_TIER = 2` says what `gate: 'tier2'` on
   the velocity node already says. `SkillGate` hand-writes `'tier1'…'tier8'` and recovers
   the number with `Number(gate.slice(4))`, so a typo like `'tier10'` parses as 10 with no
   tier behind it.

6. **Per-crew skill effects are still spelled out per crew.** The `SkillEffect` union has
   `junior`/`juniorWalk`/`juniorSweep`/`juniorBatch` and again for `senior`, and again for
   `manager`. One `{ kind: 'pace', crew, field }` would collapse ~10 effect kinds to 3–4,
   halve the effect-copy switch in `stage/util/skill-copy.ts`, and remove eight
   near-identical i18n keys per language. It reaches into both catalogues, so it wants its
   own pass.

7. **The ADR panel duplicates the tree node it buys.** Parity only asks that the unlock
   live on the tree. The panel was kept because deleting the last route to a purchase is
   exactly how the previous pass shipped a build with an unreachable tree — but two
   surfaces for one purchase is a thing to decide on, not to inherit.

### Resolved since the last reading

- ~~`baselinePerRound` is an unverified guess that sets every round target.~~ Gone with the
  round target.
- ~~The pacing instruments assert nothing.~~ `balance.spec.ts` now asserts the band, the
  gaps and an empty tree; the `CB_*` blocks are reports on top of assertions rather than
  instead of them.
- ~~The manager euro ladder has a broken rung.~~ Every rail line is `base × 1.15^n` now.
- ~~Buying `kit` grants a desk.~~ Desks come from one node; see (4) for the art remnant.

---

## 12. What I would not touch

- **The hard cap and the haul.** The cadence falling out of your own throughput is the
  load-bearing tension, and softening the cap puts the wall clock back.
- **Bands.** They are what makes crew kinds different tools rather than tiers of the same
  tool.
- **Golden as an automation-exempt class.** It is what keeps the hand worth using after
  the crew works.
- **The tree/rail currency split.** One surface unlocks, the other buys; the skim is the
  only bridge.
- **Automation spending can slots.** Removing that unravels the endgame.
- **Hazards as a `Partial<Weather>` patch.** Already the right shape, even switched off.
- **`store.board` as a plain mutable object** and `game/util/board.ts` being stepped but
  never priced. These are performance boundaries, and the eslint rule that enforces the
  second one is load-bearing.
- **`resumed()` keeping `lastTick`.** It looks like a bug and is the whole offline
  mechanism.

---

### Sources

`game/model/balance/*.ts`,
`game/model/{ticket,tier,spawner,skill,kit,office,senior,hazard,crew,consultancy,round}.model.ts`,
`game/util/{economy,crew-rules,supply,board,first-act}.ts`, `game/data/game.store.ts`,
`game/data/{balance,balance-invariants}.spec.ts`, `stage/scene/{board-scene,tier-spawners}.ts`,
`README.md`. The reference audit is `docs/comparrison.md`; the contract this shape was
built to is `docs/rework-garbage-growth.md`. Performance leads live separately in
`docs/performance.md` — that file is a static review, and its entries are leads rather
than measurements.

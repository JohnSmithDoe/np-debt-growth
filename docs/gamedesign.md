# Debt Growth — game design

A reading of the design **as it exists in the code** (September 2026), written from
`game/` — the simulation, the balance tables and the specs that guard them.

Facts here were read out of the source, not inferred from the pitch. Where a number is
quoted, the file is named. Sections marked **Comment** are opinion: my read on what the
design earns and where it is fighting itself. Everything else is description.

---

## 1. The premise, and why it is mechanically real

A consultancy is **billed by the hour**. It closes tickets for money. Therefore worse code
is an asset: more tickets, dearer tickets, more hours. The joke is that the studio invests
in its own decay.

This is not flavour text sitting on top of a generic incremental. Two mechanisms make the
premise the actual economy:

- **Debt interest** (`util/supply.ts:33-36`). Every spawn rolls against
  `economy.debtInterest(state)`; on a hit, the ticket that arrives is **one rung dearer**
  than the one that was due (`interestTarget` → `ladderUp(id, 1, tier + 1)`). The
  `debtInterest` skill track buys that probability up toward a cap of `0.25`
  (`balance/flow.ts`, via `approachCap`). You are literally paying to make the codebase
  worse, and the payoff is a richer ticket mix.
- **Tier-scaled value** (`economy.ts`, `ticketValue`). `incident` has
  `scalesWithTier: true`, so the worse your accumulated debt tier, the more one fire is
  worth.

**Comment — this is the design's strongest idea.** The theme and the growth curve are the
same mechanism. Most incrementals would have implemented "debt" as a cosmetic multiplier;
here it changes *which objects spawn*, which changes who on the crew can claim them, which
changes what you need to buy next. The satire is load-bearing.

---

## 2. The core loop

Three nested clocks:

| Clock | Length | Source |
|---|---|---|
| Sub-tick | `TICK_MS` 100 ms | `GameClock` → `store.advanceTo` |
| **Round** | `ROUND_LENGTH_BASE_MS` 10 s, extended by `roundLength` skill effects | `economy.roundLengthMs` |
| Run | until you stop | `runMs` |

A round runs, then flips to a **review** phase and waits for the player to start the next
one (`game.store.ts:384` `#endRound`, `:444` `startRound`). Phase is `'running' | 'review'`
— there is no third state.

Within a round:

1. **Tickets spawn** onto the board at `ratePerSec` per type, metered through
   `SpawnBudget` (fractional credit carried between ticks, burst-capped at
   `SPAWN_BURST_CAP` 12) so a lag spike cannot dump a hundred cards.
2. **Work gets claimed and closed** — by the crew walking to cards, by the player
   clicking, or by automation filing them.
3. Each close consumes one **sprint slot**. `SPRINT_SLOTS_BASE` is 14.
4. At round end the sprint is **invoiced**, the retainer is added, and the outcome is
   recorded as a `RoundOutcome`.

### The central tension

```
ceilingPerSec = sprintSlots / (roundLengthMs / 1000)
```

Slots are per **round**, not per second (`economy.ts`, `ceilingPerSec`; asserted in
`economy.spec.ts` — *"drains at slots per ROUND, so time is capacity's rival"*). So buying
raw throughput hits a wall that only `slots` or `roundLength` purchases can move.

Overflow is **soft**, not a hard stop: past capacity, extra tickets still pay at
`SPRINT_OVERFLOW_RATE` 0.35 (`economy.overflowFactor`).

**Comment — the best structural decision in the game.** A pure clicker cannot outrun the
slot cap, and an idle build cannot ignore it either; both have to buy into the same two
knobs. The soft overflow is the right call — a hard wall would make the last seconds of a
round feel broken rather than merely inefficient. This is the mechanism I would protect
hardest in any rebalance.

---

## 3. Two currencies

| | Symbol | Earned from | Spends on |
|---|---|---|---|
| **Budget** | € | Invoiced sprints, retainer, board bills | Crew lines, office, kit, tiers |
| **Story Points** | SP | Velocity skim, copilots, awards | Most of the skill tree |

€ is throughput. SP is the *progression* currency, and it has three sources
(`RoundOutcome.spVelocity / spCopilots / spAwards`):

- **Velocity skim** (`economy.velocitySkim`) — you divert a fraction of revenue into SP.
  `approachCap(0.35, 0.88 ** level)`: the cap is 35%, approached with diminishing returns,
  so early velocity levels are the valuable ones. Converted at
  `VELOCITY_SP_PER_EURO` 0.0006.
- **Copilots** — flat SP per close, `COPILOT_SP_PER_CLOSE` 0.013 × copilots ×
  `copilot` multipliers.
- **Awards** — one-off grants, 34 of them in `award.model.ts`.

**Comment — the skim is the cleverest economy piece.** It is a *self-imposed tax*: you
choose to be paid less now to progress faster. That is a real decision, unlike the usual
"buy multiplier, get multiplier". Copilots are the boring-but-necessary floor that keeps
SP flowing when you have not bought velocity yet — and the free copilot at tier 1
(`FREE_COPILOT_AT_TIER`) exists precisely so SP is reachable without a purchase.

---

## 4. The board and the ticket taxonomy

Fifteen types (`ticket.model.ts`). Two families.

### The value ladder — ten rungs, one per debt tier

| Type | Value | Rate/s | Tier | Notes |
|---|---|---|---|---|
| `lint` | 1 | 0.60 | 0 | |
| `bug` | 4 | 0.28 | 0 | held back until 90 s |
| `legacy` | 12 | 0.90 | 1 | |
| `flaky` | 30 | 1.60 | 2 | **respawns** |
| `conflict` | 90 | 5.0 | 3 | |
| `slop` | 260 | 7.0 | 4 | |
| `rockstar` | 1 400 | 9.5 | 5 | |
| `zombie` | 6 000 | 13 | 6 | **respawns** |
| `rewrite` | 26 000 | 17 | 7 | |
| `swarm` | 110 000 | 22 | 8 | |

This is `RETYPE_LADDER` (value-effect, non-hand-only types, sorted by tier) and it is what
`ladderUp` walks for both debt interest and manager relabelling. Value and rate both climb,
so nothing on the ladder is dominated — now asserted in
`data/balance-invariants.spec.ts`.

`respawns: true` doubles effective close rate (`closeRate = spawnRate × 2`) — the card
comes back, so it is worth twice its spawn rate in traffic.

### Hand-only events — the texture

`handOnly: true` means **no purchase makes them arrive faster** (enforced by
`economy.spec.ts`: *"does not let any € purchase make one arrive faster"*). Only the crew
kind that `takesRares` — offshore — can claim them otherwise.

| Type | Effect | Rate/s | What it does |
|---|---|---|---|
| `incident` | `value` | 0.008 | Pays 150 × tier. ×100 rate in a `storm`, ×25 in a `page` |
| `escalation` | `sprintMultiplier` | 0.0015 | Arms ×5 on the whole sprint after a hold |
| `hotfix` | `hotfixBuff` | 0.006 | ×2 ticket value for `HOTFIX_MS` 10 s |
| `quarter` | `billBoard` | 0.0012 | Bills every resting ticket on the board at once |
| `invite` | `decline` | — | The dismissable hazard invitation |

**Escalation deserves attention.** It does not fire immediately: it sets
`escalationFiresAt = now + ESCALATION_HOLD_MS` (6 s, i.e. `0.6 × round length`), and the
×5 applies to the sprint. So the play is to *bank work into the window*.

**Comment — this is where the game's skill expression lives.** An idle game with one
timed, anticipatory decision per round is far more alive than one with none, and deriving
the hold from round length is the right coupling. My one worry: `escalation` at 0.0015/s is
roughly one per 11 minutes, which is a long wait for the only mechanic that rewards
attention. `spawnEscalation` (gated at tier 5) exists to raise it, but that is late. I
would consider making escalation rarer *in value* and more frequent *in occurrence*.

### The first act is scripted

`util/first-act.ts` withholds `incident` until 75 s and `bug` until 90 s, and force-spawns
the first incident exactly when it becomes legal. The opening minutes are choreographed,
not random.

**Comment — good instinct, wrong altitude.** Holding types back so the player meets one
mechanic at a time is right. But it is an `if (type === 'incident')` ladder in code, so
"reveal a type later" is a code change rather than a data change. A `revealAtMs?` field on
`TicketType` would make the whole opening tunable. Flagged, not done — it was outside the
extraction I ran.

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

### Bands are the division of labour

Juniors work tiers 0–3 (extendable by the `stretch` skill). Seniors work **tier 2 and up**
and cannot touch the cheap stuff. So seniors are not a strict upgrade — they are a
different tool, and a senior on a fresh board has nothing to do.

**Comment — quietly excellent.** It converts "buy the better unit" into "buy the unit that
matches your board", and it is why the debt tier climb matters beyond raw numbers: climbing
tiers is what gives your expensive crew anything to claim. The overlap at tiers 2–3 is
where the two bands compete, which is exactly where it should be.

### Seniors are individuals

Each seat gets a `SeniorHire` with one trait, cycling deterministically by seat index
(`senior.model.ts`, `hireFor`: `TRAIT_IDS[seat % 5]`):

`closer` ×1.25 close · `sweeper` ×1.4 sweep · `runner` ×1.5 walk · `firefighter` claims
top-of-band · `scout` claims nearest.

Seat 0 is always a closer, seat 5 is always a closer again. Traits fold through the same
`SkillEffect` union as skills, so a trait and a skill are the same kind of thing to the
engine.

**Comment — the determinism is the right trade.** Random traits would add variance to a
purchase the player is *already* paying a lot for; a fixed cycle means the fifth senior is
a known quantity and can be priced. The trait ceiling is guarded
(`TRAIT_D21_CEILING` 1.25 in `balance.spec.ts`), which is a mature thing to have.

### Managers do not close — they relabel

`mode: 'refiler'`. A manager takes a ticket and walks it **up the ladder**
(`relabelTarget` → `ladderUp(id, relabelSteps, tier)`), turning a cheap card into a dearer
one for someone else to close. 24 s per action, the slowest unit in the game.

**Comment — the best-themed unit, and the most at risk.** "Management converts small
problems into big ones and bills for it" is the whole satire in one sprite. Mechanically it
is a *force multiplier on other crew*, which is a genuinely different purchase shape. But
its claim predicate is `transform(type) !== null` — a manager with nothing relabellable
scans the entire board and finds nothing, and at 24 s per action it contributes very little
while costing the most retainer (420/round). It is the unit I would watch hardest in a
rebalance.

### Desks, and the office

Crew need desks. `desks = officePlates × DESKS_PER_PLATE (10)`, and
`deskLimited` blocks a hire when there is no free desk. Plates come from the `O` skill
track — an 8-plate floor (`OFFICE_PLAN`, a 4×2 grid), the first given free.

**Comment — a good throttle.** It stops "buy 400 juniors" and forces an occasional
detour into a different currency (office nodes are €, most skills are SP). It also gives
the board a visual read on your progress, which is free storytelling.

### The women-close-faster rule

`WOMAN_CLOSE_RATE = 2`. Every *n*-th seat is a woman (per-kind `womanEvery`), and those
seats close in **half** the time. It is tracked for the whole run
(`lifetimeClosedByWomen`) and surfaced in the post-mortem.

**Comment — a deliberate authorial statement, and it is implemented as a real mechanic
rather than a label.** It changes `crewRate`, the ceiling maths, the cast pools and the
sprite chosen. Worth knowing that it is *load-bearing*: because juniors are 1-in-4 and
seniors 1-in-6, and promotion re-reads the bench at the junior ratio, the promotion
decision has a throughput consequence. If that ratio is ever retuned, promotion value moves
with it.

---

## 6. Progression

Four interlocking systems.

### Debt tiers — the spine

Eight rungs (`tier.model.ts`), each with an `unlockCost`, the `ticket` it unlocks, and a
`baselinePerRound`:

| Tier | Unlock € | Unlocks | Baseline/round | unlock ÷ baseline |
|---|---|---|---|---|
| 1 | 130 | `legacy` | 203 | 0.64 |
| 2 | 650 | `flaky` | 900 | 0.72 |
| 3 | 3 500 | `conflict` | 6 300 | 0.56 |
| 4 | 20 000 | `slop` | 34 600 | 0.58 |
| 5 | 140 000 | `rockstar` | 281 000 | **0.50** |
| 6 | 1 100 000 | `zombie` | 1 490 000 | 0.74 |
| 7 | 9 500 000 | `rewrite` | 12 200 000 | 0.78 |
| 8 | 90 000 000 | `swarm` | 77 000 000 | **1.17** |

`roundTarget = baselinePerRound × ROUND_TARGET_OF_BASELINE (0.75)` — the client's line you
are asked to hit each round. Reaching a tier also fires a one-off **burst** of the new
ticket type at tier 3 (`TIER_BURST`), so the unlock is visible immediately.

### The skill tree — ten tracks

`root` plus nine lettered tracks (`skill.model.ts`, 57 nodes):

| Track | Theme |
|---|---|
| **A** | The hand — click radius, click duration, line of sight, sprint `capacity` |
| **B** | Juniors — speed, reach, standup aura, ticket stacking |
| **E** | Seniors — speed, reach, presence |
| **H** | Managers — speed, relabel steps |
| **F** | Tooling — copilots, and the `autoClose` automation chain |
| **D** | Supply — debt interest, triage policy, per-type spawn rates |
| **C** | Client — income, escalation, velocity, per-type ticket value |
| **G** | Two late capstones — `assurance` (tier 6), `stretch` (tier 5) |
| **O** | The office — seven plates plus the `kit` ladder, all € |
| `secret` | Konami-gated, ×1.1 global |

Nodes gate on tier (`tier1`…`tier8`) or on owning a crew line (`junior`/`senior`/
`manager`). Costs are mostly SP; the six **purchase lines** and the whole office track are €.

### Purchase lines

`PURCHASE_IDS`: `junior`, `senior`, `copilot`, `velocity`, `kit`, `manager`. These are the
repeatable "buy another one" ladders, each level emitting `{ kind: 'line', line }`.

### Kit — six items, each fitted to the whole crew

`KIT_PLAN` (`kit.model.ts`) now carries its own prices, and the `kit` skill node builds its
levels from the plan, so the ladder cannot outrun the plan again (it previously had six
items and five buyable levels, leaving the last one unreachable).

---

## 7. Weather — one mechanism, ten flavours

A `Hazard` is a row with a `fromTier`, a `durationMs` and an optional
`weather?: Partial<Weather>` patch. `Weather` has five fields: `meeting`, `incidentRate`,
`slots`, `offshore`, `supply`.

Two kinds arrive on separate cadences: **invitations** (`INVITATION_EVERY_MS` 120 s, a 4 s
window to decline) and **facts** (`FACT_EVERY_MS` 120 s, a 5 s countdown, not declinable).

| Hazard | From | For | Does |
|---|---|---|---|
| `all-hands`, `reorg` | 1 | 10 s | `meeting: true` — closers walk off the board |
| `compliance` | 1 | 6 s | `meeting` |
| `retro` | 1 | 8 s | `meeting` |
| `offshore` | 2 | 60 s | Staffs 5 offshore crew who take the rares |
| `freeze` | 3 | 25 s | `slots: 0.5` — halves sprint capacity |
| `storm` | 3 | 30 s | `incidentRate: 100` |
| `grooming` | 3 | 0 s | *nothing* |
| `page` | 6 | 12 s | `incidentRate: 25` **and** `meeting` |
| `migration` | 7 | 15 s | `supply: 0` — total spawn drought |

**Comment — the right altitude, and I left it alone deliberately.** One general patch
mechanism subsumes ten special cases; adding a hazard is adding a row. This is the part of
the balance surface that was already designed rather than accumulated.

Three notes, though:

- **`grooming` is a no-op** — no duration, no patch. Either it is pure flavour (fine, but
  it should say so) or it lost its effect at some point.
- **`migration` is the meanest thing in the game.** `supply: 0` for 15 s means the board
  stops refilling entirely. At tier 7 with a fast crew the board will *empty*, and a round
  can end with the crew idle and the sprint unfilled. That is a strong effect to hand a
  two-minute random timer with no counterplay beyond it being a "fact" you cannot decline.
- **Invitations and facts share a 120 s cadence** as two independent constants that happen
  to be equal. If they are meant to interleave rather than collide, that is currently luck.

---

## 8. Automation, and the idle question

The `F` track buys `autoClose` for one ticket type at a time (`autoLint` → `autoBug` →
`autoLegacy`/`autoFlaky`/`autoConflict`, tier-gated). An automated ticket files itself
after `AUTO_CLOSE_MS` 3 s, **consuming a sprint slot** like any other close
(`util/supply.ts`, `fileAutomated`).

Automation therefore *competes with your crew for capacity* rather than adding to it. There
is a spec watching that the crew keeps earning a floor share of € across a simulated
four-hour playthrough (`balance.spec.ts`).

**Comment — correct and non-obvious.** Making automation spend the same slots is what stops
the endgame from being "automate everything, fire the crew". Keep that invariant.

### The offline story: there isn't one

`MAX_CATCHUP_MS` is **5 000** — five seconds. `advanceTo` clamps catch-up to that, so a
backgrounded tab resumes having simulated at most 5 s. And `resumed()` drops a restored
save into `review` phase with `roundMs: 0`. The clock does not even start until
`DoorService.opened()` — the title screen gates it.

**Comment — this is the design's biggest open question.** The genre's core promise is that
the numbers grow while you are away, and this build explicitly refuses that: close the tab
and you lose nothing but you also gain nothing. That is a defensible, even principled
choice — it makes the game an *active-session* game about a 10-second round loop, which is
what all the other systems (escalation windows, hazard timers, clicking) are actually built
for.

But "Debt Growth — an idle game" then sets the wrong expectation, and the review phase
waiting for a manual `startRound` means it cannot even run unattended. I would pick a side
explicitly: either lean in and stop calling it idle (the round loop is good enough to carry
an active game), or add bounded offline accrual — and if the latter, the retainer is the
natural vehicle, since it is already the "income that does not require clicking" line.

---

## 9. How money is actually computed

One pricing chain, applied in a fixed order (`economy.ts`, `priceSprint`):

```
subtotal  = Σ held × ticketValue(unbuffed)
→ hotfix      ×2 if within hotfixUntil
→ overflow    soft-capped at 0.35 past sprintSlots
→ escalation  ×5 (× escalation multipliers) if armed
= gross
```

`sprintPayout` takes the total; `sprintInvoice` names each step for the review screen. Both
read the same chain, so the money and the receipt cannot drift.

`ticketValue` itself is `type.value × per-type skill multipliers × tierScale (if
scalesWithTier) × global × hotfix`.

Alongside the sprint, two other income sources land at round end:

- **Retainer** — `Σ headcount × retainer`, scaled by round length and by slots relative to
  base. Crew bill *for existing*, not for working.
- **Board bills** — the `quarter` ticket bills everything resting on the board at once.

**Comment — the retainer is doing quiet, important work.** It is the only income that does
not depend on closing anything, which means a big crew is a floor under a bad round. It is
also the closest thing the game has to an idle income line, which is why I would reach for
it first if offline progress is ever added.

---

## 10. Where the knobs live (after the September 2026 extraction)

The rule is now: **the mechanism's own table is its tuning unit.**

| Concern | Tuning unit |
|---|---|
| A crew kind | one row in `CREW_STATS` (`balance/crew.ts`) — pace, band, retainer, claim priority, which skill kinds reach it |
| A ticket type | one row in `TICKET_TYPES` |
| A debt tier | one row in `DEBT_TIERS` |
| A hazard | one row in `HAZARDS` |
| A kit item | one row in `KIT_PLAN` (price included) |
| A skill | one node in `SKILL_NODES` |
| Cross-cutting coefficients | `balance/{curve,flow,progression,round,weather}.ts` |

`data/balance-invariants.spec.ts` guards the *shape* rather than the values: ladders
monotone, tiers numbered by position, each tier's ticket matching its rung, no dominated
retype rung, the crew table actually read by the accessors, kit plan and kit ladder the same
length.

---

## 11. Comment — the open design problems

Ranked by how much they would distort a rebalance.

1. **A senior seat has two prices, an order of magnitude apart.** The `senior` skill node
   sells seats at `1 200 / 4 500 / 18 000 / 70 000 / 260 000`. Promotion sells the *same
   seat* via `SENIOR_BUYOUT_STEPS × PROMOTION_PREMIUM (1.6)` — seat 5 costs ≈ 17 600 that
   way versus 260 000 through the tree. Nothing ties the ladders and no test compares them.
   Past the table's tenth rung the last step simply repeats, so promotion gets
   progressively cheaper in relative terms. **Pick one ladder and derive the other.**

2. **`baselinePerRound` is an unverified guess that sets every round target.** It is the
   number the client's line comes from (`× 0.75`), nothing in the game computes or checks
   it, and its growth is erratic (×4.4, ×7.0, ×5.5, ×8.1, ×5.3, ×8.2, ×6.3) where
   `unlockCost` grows smoothly. The `unlock ÷ baseline` ratio drifts from 0.50 at tier 5 to
   **1.17 at tier 8** — the last rung costs more to enter than it claims to yield per
   round. Either measure it from a simulated playthrough or store the target directly and
   drop the indirection.

3. **The pacing instruments assert nothing.** Five `it.runIf(process.env[…])` blocks
   (`CB_SHARE`, `CB_CLOCK`, `CB_INCOME`, `CB_LADDER`, `CB_TARGET`) *print* the ladder
   pacing, income curve and round-target miss rate. `pnpm test` never runs them, and
   nothing fails if every round misses the client's line. `CB_TARGET` already computes
   `missed/scored` — turning that into an assertion with a named tolerance band is the
   single highest-value test in the project.

4. **The autoplayer — the most important balance instrument — is trapped in a spec file.**
   `class Playthrough` (~230 lines in `balance.spec.ts`) is a model of how a player spends,
   with one hard-coded policy and a `switch` over `PurchaseId`. It is a balance artifact,
   not a fixture. Extracted to `game/util/autoplay.ts` with the policy as data, the same bot
   could be run across several policies and seeds, and driven from the debug door for
   tuning sweeps.

5. **The manager euro ladder has a broken rung.** `28 000 / 80 000 / 95 000 / 320 000 /
   1 000 000` — ratios 2.86, **1.19**, 3.37, 3.13. Every other € ladder in the file holds
   2.6–4.7 throughout. The 80k→95k step is the only sub-1.5 rung anywhere and reads as a
   typo.

6. **Buying `kit` grants a floor plate.** `officePlates` counts
   `OFFICE_NODE_IDS` = *every* non-heading node on track `O`, which includes the `kit`
   ladder alongside `o1`–`o7`. So a kit purchase widens the floor. The 8-plate cap absorbs
   the overflow, which is why nothing has noticed. Almost certainly unintended.

7. **Some knobs are stored twice.** `VELOCITY_UNLOCK_TIER = 2` says what
   `gate: 'tier2'` on the velocity node already says. `SkillGate` hand-writes
   `'tier1'…'tier8'` and recovers the number with `Number(gate.slice(4))`, so a typo like
   `'tier10'` parses as 10 with no tier behind it.

8. **Per-crew skill effects are still spelled out per crew.** The `SkillEffect` union has
   `junior`/`juniorWalk`/`juniorSweep`/`juniorBatch` and again for `senior`, and again for
   `manager`. One `{ kind: 'pace', crew, field }` would collapse ~10 effect kinds to 3–4,
   halve the effect-copy switch in `stage/util/skill-copy.ts`, and remove eight
   near-identical i18n keys per language. Not done here — it reaches into both catalogues,
   so it wants its own pass.

9. **`MIGRATION_SUPPLY_MULT` was a "multiplier" whose only sensible value was 0.** Now
   inlined as `supply: 0` in the hazard row, which at least says what it means. The
   mechanic itself still deserves a second look (see §7).

---

## 12. What I would not touch

- The **slot cap per round** and the soft overflow. This is the load-bearing tension.
- **Bands.** They are what makes crew kinds different tools rather than tiers of the same
  tool.
- **Hazards as a `Partial<Weather>` patch.** Already the right shape.
- **Automation spending sprint slots.** Removing that unravels the endgame.
- **`store.board` as a plain mutable object** and `game/util/board.ts` being stepped but
  never priced. These are performance boundaries, and the eslint rule that enforces the
  second one is load-bearing.

---

### Sources

`game/model/balance/*.ts`, `game/model/{ticket,tier,skill,kit,office,senior,hazard,crew,consultancy,round}.model.ts`,
`game/util/{economy,crew-rules,supply,board,first-act}.ts`, `game/data/game.store.ts`,
`game/data/balance.spec.ts`, `README.md`. Performance leads live separately in
`docs/performance.md` — that file is a static review, and its entries are leads rather than
measurements.

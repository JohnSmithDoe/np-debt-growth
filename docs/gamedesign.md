# Debt Growth — game design

The design as the code has it. Every number names the file it lives in; paths are relative to
`src/app/game/` unless stated. Open work is in `next-steps.md`.

The reference is **Garbage Growth** (Steam demo, ends at the gorilla). Its measured numbers are
in §11; they go in as they are.

---

## 0. The economy in six lines

1. **Developers throw tickets.** Each head on a line throws one ticket about every 4 s; every
   ADR opens a line whose tickets are worth ×10 the last.
2. **Tickets don't wait.** Unreached work is closed as "won't fix" after 3.5 s, or sooner when a
   full board pushes it out for newer work.
3. **You and the crew pick them up**, and with Triage Policy lint and bugs close themselves.
   Every pickup pays its value in €, and SP once the €25 `velocity` row is bought.
4. **Lanes cap the pace.** A full lane ships and is locked for the release train.
5. **€ buys supply, SP buys the tree.** The rail sells heads, rate rows and crew; the tree
   sells everything else, the ADRs included. `signoff` starts the acceptance push; the run
   ends at €1 Qa.
6. **Income = collected tickets/s × their worth**, where collected is the least of what the
   lines throw, what the hand and crew reach, and what the lanes take. `util/sim.ts` computes
   exactly this without a board (§9).

It is an **active game**: there is no offline progress and no income that doesn't come from a
pickup.

---

## 1. Premise

A consultancy is billed by the hour, so worse code is an asset: more tickets, dearer tickets,
more hours. The studio pays people to make the codebase worse and bills the client to clean up.
Three mechanisms make that the economy rather than flavour:

- **Spawner lines** (`model/spawner.model.ts`). Nine lines, one per ADR. A line with no heads
  produces nothing. They are the main euro sink.
- **Debt interest** (`util/supply.ts`, `economy.debtInterest`). A spawn can arrive one rung
  dearer than the one that was due (`interestTarget` → `ladderUp`). The `debtInterest` node buys
  the chance up toward `DEBT_INTEREST_CAP` 0.25 (`balance/flow.ts`).
- **Managers relabel** (§5): they walk cheap cards up the ladder for someone else to close.

---

## 2. The loop

There is no round timer and no wall clock. `GameClock` ticks `store.advanceTo(clock.now())` every
`TICK_MS` 100 ms; a gap longer than `MAX_CATCHUP_MS` 5 s (a hidden tab, a closed app) is simply
not played. The game is frozen while the skill tree is open (`StageService` pauses the clock with
reason `'tree'` as the board fades out and resumes it as the board fades back in) and while the tab
is hidden (`GameClock` listens for `visibilitychange`, reason `'hidden'`). `clock.now()` is wall time minus every
pause, so hotfix, escalation and pizza deadlines hold still with it. This matches the autoplayer,
which spends no time in the tree.

1. **Spawn.** Each ticket type arrives at `ratePerSec × heads on its line × spawn nodes`,
   metered by `SpawnBudget` (burst cap `SPAWN_BURST_CAP` 12). Tickets are thrown from the lane
   on a catchable arc (`DROP_MS` 1 850, `DROP_HOP` 90 in `stage/model/board.consts.ts`); the
   sweep catches them mid-flight.
2. **Expire.** A crew-workable card nobody reaches in `TICKET_LIFE_MS` 3.5 s (golden:
   `GOLDEN_LIFE_MS` 20 s) is closed as **"won't fix"** (`expireTickets` in `util/board.ts`, counted in `lifetimeWontFix`).
3. **Displace.** The field holds `BOARD_CAPACITY` 600 cards (`model/geometry.ts`). When it is
   full, each arrival pushes out the unclaimed card nearest its own expiry, which is closed as
   won't fix (`displaceOldest`). Every arrival lands, so the field's mix always matches what was
   bought; buying more only makes work turn over faster. Golden cards go only once no ordinary
   card is left; claimed and hand-only cards are never pushed out.
4. **Collect.** The player's cursor sweeps a ring and takes every card whose box it touches
   (`pickTouching`, box overlap against `CARD_HIT` / `RARE_HIT` in `model/geometry.ts`, once a
   frame); the ring starts at `CLICK_RADIUS_BASE` 6 board units, about 5 screen px. The crew walk
   to cards. **Money and SP land per ticket, at pickup.** A taken card hops into its
   lane on two parabolas meeting at the apex (`HARVEST_MS` 1 600, `HARVEST_HOP` 150).
5. **Auto-close.** A type `triagePolicy` names (`{ kind: 'autoClose' }`: lint at rank 1, bugs at
   rank 2) is claimed by no crew. When such a card's life runs out it closes itself instead of
   going stale (`expireTickets` hands it to the store), fills a lane slot and bills like any
   close, SP included, credited to the crew's share. Its card tints green over its life on the
   GPU (`AUTO_CLOSE_RAMP`). If no lane has room it **goes to prod**: it becomes an `incident`,
   at most `PROD_INCIDENT_LIVE_CAP` 3 live at once (the rest go stale), counted in
   `lifetimeProdIncidents`; the first earns _Works on my machine_.
6. **Lanes and release trains.** Closed work is dealt round-robin into **swimlanes**
   (`economy.fillLanes`), skipping lanes that are away. A full lane ships on its own release
   train for `haulMs` and takes nothing until it is back; the rest keep taking. Collection is
   refused only when every lane is away or full (`phase: 'hauling'`); refused cards bounce where
   they lie (`REFUSAL_BOUNCE`).

```
laneCapacity   = SPRINT_SLOTS_BASE 100 + Σ slots        (capacity node, +25 a rank ×10; o2 +14)
laneCount      = LANES_BASE 1 + Σ cans                  (cans node, +1 a rank ×9)
sprintSlots    = laneCapacity × laneCount
haulMs         = max(HAUL_MIN_MS 2 500, HAUL_MS 4 000 − duration ranks × 300)
ceilingPerSec  = sprintSlots / haulMs
```

All in `balance/round.ts` and `util/economy.ts`. The cadence is an output of the player's
throughput. A "round" in the code is one lane's release.

Player-facing copy never says "truck" or "can": lanes, sprint scope, release train.

---

## 3. Currencies

|                     | Earned from                                                  | Spent on                                       |
| ------------------- | ------------------------------------------------------------ | ---------------------------------------------- |
| **€ Budget**        | Every pickup, `quarter` board bills                          | The rail: spawner heads, rate rows, crew lines |
| **SP Story Points** | Every pickup once `velocity` is bought, planning-poker votes | The tree, all of it, ADRs included             |

**The tree unlocks, the rail buys.** No node costs euros and no rail row costs SP.

**SP at pickup** (`economy.pickupStoryPoints`): once the €25 `velocity` rail row is bought
(`LINE_PLAN.velocity`, `open: true`), every close pays `SP_PER_PICKUP` 1, **whatever it bills**,
plus:

- the line's `estimates<Ticket>` node, `ESTIMATE_SP_PER_RANK` 20 SP a rank, 5 ranks (the
  reference pays +2); lint's pays `ESTIMATE_SP_PER_RANK_OPENING` 4, since auto-close bills every
  lint card;
- ×`CREW_SP_MULT` 2 on crew closes with `timesheets`;
- `voteBonus`: SP for every live planning-poker vote the ticket fell through, decided at spawn
  (§6).

Value nodes and rate rows lift euros only. Awards (`model/award.model.ts`) pay nothing; their
`weight` only sizes the banner. The run opens with one developer and nothing else.

---

## 4. Tickets

`model/ticket.model.ts`. Two families.

### The value ladder, one rung per ADR

| Type       | €           | Rate/s a head | Tier | Line  |                              |
| ---------- | ----------- | ------------- | ---- | ----- | ---------------------------- |
| `lint`     | 1           | 0.25          | 0    | ADR-0 | the whole opening            |
| `bug`      | 4           | 0.08          | 0    | ADR-0 | shares the opening with lint |
| `legacy`   | 10          | 0.25          | 1    | ADR-1 |                              |
| `flaky`    | 100         | 0.25          | 2    | ADR-2 | respawns                     |
| `conflict` | 1 000       | 0.25          | 3    | ADR-3 |                              |
| `slop`     | 10 000      | 0.25          | 4    | ADR-4 |                              |
| `rockstar` | 100 000     | 0.25          | 5    | ADR-5 |                              |
| `zombie`   | 1 000 000   | 0.25          | 6    | ADR-6 | respawns                     |
| `rewrite`  | 10 000 000  | 0.25          | 7    | ADR-7 |                              |
| `swarm`    | 100 000 000 | 0.25          | 8    | ADR-8 |                              |

Value ×10 a tier, one throw rate: the rule read off the two measured tiers. `respawns` doubles
the effective close rate. `RETYPE_LADDER` (value types by tier) is what `ladderUp` walks for debt
interest and manager relabels.

### Hand-only cards

No purchase makes these arrive faster (`economy.spec.ts`), but the run does: each ADR approved
adds `HAND_ONLY_RATE_PER_TIER` +50 % to their rate (×5 at ADR-8), so the hand's targets grow
with the run. They never expire and are never displaced.

| Type         | Rate/s | Effect                                                                   |
| ------------ | ------ | ------------------------------------------------------------------------ |
| `incident`   | 0.008  | 150 € × tier (`scalesWithTier`). First one placed at 75 s (`revealAtMs`) |
| `escalation` | 0.0015 | ×`ESCALATION_MULTIPLIER` 5 on every close for `ESCALATION_HOLD_MS` 6 s   |
| `hotfix`     | 0.006  | ×2 ticket value for `HOTFIX_MS` 10 s                                     |
| `quarter`    | 0.0012 | Bills every resting ticket on the board at once (from tier 2)            |
| `pizza`      | —      | The pizza-party voucher (§5), from the `pizza` node                      |
| `invite`     | —      | Hazard invitation (§8): sweep it to decline the meeting                  |

The opening's reveal order is ticket data: a row's `revealAtMs` / `revealAtTier` holds it back,
and `util/first-act.ts` places the first card on its beat.

### Golden

Any arrival rolls `goldenChance` (+2 % a rank of `golden`, cap `GOLDEN_CHANCE_CAP` 0.2). A golden
card is worth `GOLDEN_VALUE_BASE` 100× + `GOLDEN_VALUE_PER_RANK` 50× a `goldenValue` rank
(additive, 100× → 300×). **No crew kind claims golden** until `goldenCrew`, which also turns
`GOLDEN_CREW_CONVERSION` 5 % of crew closes golden. Managers get the same: a relabel keeps a
card's gold, and 5 % of relabels come back golden (`CrewRules.gilds`). Golden is what keeps the hand worth using
once the crew works; after `goldenCrew` the cursor is a bonus, by design.

---

## 5. Crew

One row per kind in `CREW_STATS` (`balance/crew.ts`). The row order is claim priority.

|          | close | walk | batch | sweep | band | woman every | seats                        |
| -------- | ----- | ---- | ----- | ----- | ---- | ----------- | ---------------------------- |
| seniors  | 10 s  | 70   | 3     | 70    | 3–∞  | 6           | 10 + `seniorRoom` 3 × 5 → 25 |
| juniors  | 5 s   | 90   | 1     | 40    | 0–4  | 4           | 10 + `juniorRoom` 3 × 5 → 25 |
| managers | 24 s  | 110  | 1     | 0     | 0–∞  | 3           | 5 + `managerRoom` 1 × 5 → 10 |

- **File on arrival, then recover.** A worker walks to a card, files it at once, and rests for
  its close time. A claim samples four cards (`CLAIM_SAMPLES`) and takes the nearest of them
  (`lineOfSight`, the `scout` trait) or a random / dearest one; the walk is a real share of every
  cycle.
- **Bands** divide labour: juniors take tiers 0–4 (`juniorReach`, `stretch` extend it), seniors
  tier 3 up; both take 3–4. The `senior` node hangs off ADR-3, so no senior waits for work.
- **Seniors have one trait each**, by seat (`model/senior.model.ts`, `hireFor`): `closer`,
  `sweeper`, `runner`, `firefighter` (top of band), `scout` (nearest).
- **Managers relabel** (`mode: 'refiler'`): they walk a card `relabelSteps` rungs up the ladder.
- **Women close twice as fast** (`WOMAN_CLOSE_RATE` 2), every _n_-th seat per kind; counted in
  `lifetimeClosedByWomen` and shown in the post-mortem.
- **Crew skills are two effect kinds**: `{ kind: 'pace', crew, field: 'close' | 'walk' | 'sweep',
mult }` and `{ kind: 'batch', crew, add, closeMult? }`. Senior traits use the same shape.
- **Seats are per line**: `LINE_PLAN` cap + the line's room ranks × `ROOM_SEATS` 5
  (`economy.lineCap`, `{ kind: 'room', line }`). Each room sits behind its kind's speed node
  (unlock → improve → raise the cap, as the reference orders it) and is priced off its unlock,
  the reference's population/unlock ratio (20 000 / 1 200) climbing ×3 a rank.
- **Pizza party** (`pizza` node, ADR-5): the engineering manager drops a hand-only voucher;
  sweeping it makes crew inside `PIZZA_RADIUS` 240 work ×`PIZZA_RUSH` 5 for `PIZZA_MS` 12 s. The
  reference's Chad.

The crew and Triage Policy's auto-close (§2) are the only automation; the only crew kinds are
juniors, seniors and managers. Hand-only cards are the player's alone. The CI auto-close
pipeline, offshore contractors and the Promotion Round are gone (see _Parked_ in `next-steps.md`).

---

## 6. Progression

Every purchase, node by node, is catalogued in `upgrades.md`.

### The rail — three tabs, all euros

| Tab       | Rows                                             | Cap      | Price                                            |
| --------- | ------------------------------------------------ | -------- | ------------------------------------------------ |
| **Debt**  | Nine spawner lines                               | 50       | `floor(base × 1.15^k)`, step `Math.fround(1.15)` |
| **Rates** | One income row per line ticket                   | 10       | `floor(first × 1.65^k)`                          |
| **Crew**  | `junior`, `senior`, `manager`, `velocity`, `kit` | per line | `LINE_PLAN` × 1.15^level                         |

- **Spawner bases** (`SPAWNERS`): 2 · 500 · 15 000 · 87 500 · 500 000 · 3.5 M · 27.5 M · 240 M ·
  2.25 G. ADR-0 starts with one free head that does not raise the price.
- **Rate rows** (`INCOME_ROWS`, `balance/progression.ts`): tier _t_ costs `250 × 5^t` for its
  first rank and adds a flat `3 + t` € a rank to the ticket's value **before** multipliers.
  Opens once the line has a head (`incomeUnlocked`). Flat on purpose: decisive on cheap work,
  nothing on dear work, so it pushes the player up a rung.
- **Crew lines** (`LINE_PLAN`): junior 1 000 (cap 10), senior 1 200 (cap 10), manager 28 000
  (cap 5), velocity 25 (cap 1), kit 400 (cap 6). Room nodes raise the crew caps. The tree opens each line once (`{ kind: 'line' }`); `velocity` is open from
  the start because it is the SP source.

### The tree — SP only

`model/skill.model.ts`. `root` ships bought; every other node is SP, written exactly as charged.
Each square carries a `+`/`%` badge from its next rank's effects (`skillBadge`).

**Every line has the same five nodes** (`LINE_NODES`), hanging off its ADR:

```
value<T>  ×2 ──┬── spawn<T>      5 × +20 % throw-two  → ×2 spawn
               ├── income<T>     5 × +50 % income     → ×3.5
               └── estimates<T>  5 × +20 SP
                        │
               double<T>  ×2   opens once all three are maxed (`maxed`)
```

A fully bought line earns ×14 per ticket (before rate rows) and throws twice as often.
Additive ranks are stored as ratios — rank _k_ multiplies by (1 + k·step) / (1 + (k−1)·step) — so
five +20 % ranks end at exactly ×2. First-rank prices double a tier: `value` 25 / 1 500 then
`LINE_DOUBLE_COST`; `spawn` `2 200 × 2^t` (ranks ×1.25); `income` `1 100 × 2^t` (ranks ×1.25);
`estimates` 75 / `400 × 2^(t−1)` (ranks ×1.5); `double` `2 500 × 2^t`.

| Track           | Holds                                                                                                                                        |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **A** Hand      | `radius`, `capacity` (sprint scope +25 ×10), `cans` (+1 lane ×9, tier 1), `duration`, `lineOfSight`, `golden` → `goldenValue` → `goldenCrew` |
| **B** Juniors   | `junior` (1 200), `juniorSpeed`, `juniorRoom`, `juniorReach`, `juniorPresence`, `ticketStacking`, `timesheets`, `pizza`                      |
| **E** Seniors   | `senior` (240 000, ADR-3), speed, reach, presence, `seniorRoom`                                                                              |
| **H** Managers  | `manager`, speed, `relabel`, `managerRoom`                                                                                                   |
| **C** Client    | the per-line `value` / `income` / `estimates` / `double` nodes, `valueBug`, `valueIncident`, `escalation`, `coaches`, `deck`                 |
| **D** Debt      | the per-line `spawn` nodes, `debtInterest`, `triagePolicy`, `spawnEscalation`, `spawnIncident`                                               |
| **G** Capstones | `assurance`, `stretch`, `signoff`                                                                                                            |
| **N** ADRs      | `adr1` … `adr8`, chained; each rung is the parent of its line's `value` node (Lint's hangs off the client heading)                           |
| **O** Office    | `o1`–`o7` (the floor plates; `o1` and `o4` are cosmetic), `kit`                                                                              |
| `secret`        | Konami-granted, ×1.1 global                                                                                                                  |

There are no global spawn-rate or income nodes: a line only grows through its own nodes.

**The tree leads the run.** There are no gates besides the parent: the ADR chain is the spine, and
whatever a rung unlocks hangs off it, so a node the player can read is a node they can buy. The
root opens four arms — the Lint line, the Hand, the Office and ADR-1. After that:

Every rung opens its line and at least one mechanic, so no rung is only more of the same. A
rung's extras are priced for its SP income — together about a minute of it on arrival — so a
new rung is a choice, not a shopping spree:

| Rung  | Opens                                                                       |
| ----- | --------------------------------------------------------------------------- |
| ADR-1 | Legacy line, `junior` (the whole crew arm, `triagePolicy` under it), `cans` |
| ADR-2 | Flaky line, `coaches` → `deck`, `golden`                                    |
| ADR-3 | Conflict line, `senior`                                                     |
| ADR-4 | Slop line, `manager`, `debtInterest`                                        |
| ADR-5 | Rockstar line, `pizza`, `timesheets`                                        |
| ADR-6 | Zombie line, `spawnIncident`, `valueIncident`, `spawnEscalation`            |
| ADR-7 | Rewrite line, `goldenCrew`, `stretch`                                       |
| ADR-8 | Swarm line, `assurance`, `signoff`                                          |

`double<T>` is the one node with a second term (`maxed`); it stays a dim box, not a readable
square, until its three ladders are full. The map is orthogonal (`stage/util/skill-layout.ts`):
the root in the middle, one arm per compass point. The ADR ladder is a spine running east with
each rung's branches hanging north and south; the widest other arm grows west, the other two
north and south. Every arm is a tidy tree — a layer per depth, a lane per leaf — wired in right
angles. `signoff` sits alone on the spine well east of ADR-8, drawn twice the size: it is the
final. Nodes with more than five ranks draw their pips in rows of five.

**Icons.** Every square draws `assets/skills/<nodeId>.png`; the five per-line kinds share
`line-<kind>.png` (`stage/model/skill-icon.model.ts`). The files are generated from
`tools/art-batch.mjs` rows of the same names; `spare-*.png` are generated but unused.

**Planning poker** (`coaches` 600 → 11.8 M, `deck` 900 → 17.7 M, 10 ranks each, ×3 a rank, from
ADR-2, so a board turned purple is a late sight): coaches on the lane edge hold
votes live for `VOTE_ON_MS` 1.4 s of every `VOTE_CYCLE_MS` 4 s, offset from each other. A
non-golden ticket that lands below a live vote's beam gains `VOTE_BONUS_BASE` 45 SP + 15 a `deck` rank (the reference pays 30).
The beams sit in board units (`VOTE_BEAMS`, `voteBeamY`), so a ticket landing above one is passed over;
decided at spawn from the landing cell. New work scatters only below the top `HEAP_SPAWN_GAP_ROWS`
field rows, so it falls through the beams; a crowded board stacks above them and misses the vote.
The stage scales the board separately across and down (`board-scene.ts` `#layout`), so y 100 always
sits `VOTES.belowSpawners` under the fixed spawner path and the floor on the sprint strip; round
things (sweep ring, pizza) use √(x·y), so the hand covers the board area the sim prices. Drawn by `stage/scene/vote-beams.ts`; a re-estimated card
wears a purple border (`voteFrame`) that fades in as it falls past the beams. The reference's gum angels.

### The ADR ladder

`DEBT_TIERS` (`model/tier.model.ts`). Buying `adrN` raises `state.tier`, opening line N and its
ticket together. `TIER_BURST` spawns 10 at tier 3. The ADR modal's approve button
(`unlockNextTier`) buys the same node; the rail has no ADR panel.

| ADR | SP        | Unlocks    | Source                 |
| --- | --------- | ---------- | ---------------------- |
| 1   | 750       | `legacy`   | reference (dogs)       |
| 2   | 10 000    | `flaky`    | reference (bike)       |
| 3   | 300 000   | `conflict` | ours (gorilla 600 000) |
| 4   | 500 000   | `slop`     | ours                   |
| 5   | 800 000   | `rockstar` | ours                   |
| 6   | 1 200 000 | `zombie`   | ours                   |
| 7   | 1 400 000 | `rewrite`  | ours                   |
| 8   | 1 600 000 | `swarm`    | ours                   |

**`signoff`** (€20 T, off ADR-8) is `FINAL_SKILL_ID` and the tree's only euro node. Buying it
starts the **acceptance push** (`ACCEPTANCE` in `balance/progression.ts`, `economy.inAcceptance`):
spawns run ×3, everything bills ×12 overtime (in `globalMultiplier`), and a pink banner on the
board counts the budget up to €1 Qa. Reaching it sets `endedAt` (`economy.accepted`, checked each
store step and in the autoplayer) and the post-mortem opens. No prestige. About four minutes
after ADR-8 to sign-off, three for the push.

Every purchase is a pure step in `util/purchase.ts` (`buySkill`, `buyLine`, `buySpawner`,
`buyIncome`); `GameStore` commits the result and handles the side effects.

---

## 7. Money

```
ticketValue = (type.value + rate-row bonus)
            × per-line value / income / double nodes
            × tier (incident only)
            × global (secret, assurance, o6; ×12 during acceptance)
            × hotfix ×2 (inside the window)

closeValue  = ticketValue × escalation ×5 (inside the window) × golden multiplier (if golden)
```

Paid at pickup. There is no invoice; nothing past lane capacity is ever priced.

---

## 8. Weather

`HAZARDS` (`model/hazard.model.ts`), each row a `Partial<Weather>` patch (`meeting`,
`incidentRate`, `slots`, `supply`). Two cadences, both `…_EVERY_MS` 120 s, with facts
`FACT_OFFSET_MS` 60 s behind invitations so they never land together (`balance/weather.ts`).

- **Invitations** (from tier 1): an `invite` card lands; sweep it within `INVITATION_WINDOW_MS`
  4 s to decline, or the crew go to a meeting (all-hands 10 s, compliance 6 s, retro 8 s, reorg
  10 s). An Account Manager declines them all for you.
- **Facts** (announced `FACT_COUNTDOWN_MS` 5 s ahead on the board's banner):
  - `freeze` (tier 3): sprint scope ×0.5 for 25 s. Trains leave twice as often, which feeds
    the prod-incident trick.
  - `storm` (tier 3): incidents ×20 for 15 s.
  - `grooming` (tier 3): every value card on the board is re-estimated (`spBonus` = one vote's
    bonus) and turns purple; the 8 s window is for sweeping it.
  - `page` (tier 6): incidents ×10 and the crew in a meeting for 12 s: the P0s are the hand's.
  - `migration` (tier 7): no new work for 10 s, and every train comes home as it lands, so the
    player clears a quiet board.

The sim prices no weather; `balance.spec.ts` holds the crew's share over
`CREW_EURO_WINDOW_FLOOR` 5 % with it on.

---

## 9. The board-free simulation

`util/sim.ts` prices a state per second with no board, from the same `economy.ts` functions the
game uses:

- **Supply** per line = `closeRate`, shifted a rung by debt interest, split golden / plain.
- **Density** on the field = min(600, arrivals × 3.5 s, less what gets collected), settled by
  iterating; a full board displaces rather than refuses, so nothing is turned away.
- **Crew** take their band at their ceiling, slowed by the walk: a random board distance
  (≈ `MEAN_WALK`), or the nearest of four sampled cards with `nearest`, and by how full a
  senior's sweep batch can get at that density.
- **Hand** takes one aimed card per sweep (gold first, then the dearest) plus a proportional mix
  of whatever other cards the ring touches, counted on the heap grid by box overlap
  (`cellsTouched`). Crew sweep batches count centres within their radius (`cellsInReach`).
- **Auto-close** takes whatever of an auto-closed type the hand left.
- All of it clamped by `ceilingPerSec`; € and SP priced as at pickup.

Not counted: hotfix, escalation, quarter bills, pizza, manager relabels, prod incidents and
weather. `data/sim.spec.ts`
plays the same states on a real board and holds the sim within ×1.5 (it runs 1.07–1.38× high;
late euros ride on a few gold tickets, so one seeded run is noisy).
Only the 476 field cells are sweepable; the rest of the 600 stack in overflow rows above the
field, and the sim counts that.

`util/autoplay.ts` plays a whole run on the sim: earn for a second, spend like a player
(`DEFAULT_POLICY`: 1 sweep/s, a quarter of the budget per purchase, cheapest first;
`saveForAdrSec`, off by default and `CB_SAVE` in the balance spec, holds SP for a near ADR) through
`purchase.ts`. A four-hour cap runs in about two seconds.

`util/advisor.ts` is the Synergy Analyser (AI Powered): it ranks every offer by (Δln €/s + Δln SP/s) over the seconds
of income it costs, scores a gate together with the best purchase it opens, and once `signoff` is
on offer buys only what shortens the time to it. An SP buy gives way to the next ADR when it
would delay the ADR by more than `ADR_SLACK` (half). `autoplay.advisedSpend` plays a run on it, and
`data/advisor.spec.ts` fails unless that run signs off sooner than cheapest-first. The console's
paperclip (`console/feature/agent/`, on by default, switchable in settings) shows its € and SP picks.

---

## 10. Where the knobs live, and how they are guarded

| Concern                             | Tuning unit                                                                      |
| ----------------------------------- | -------------------------------------------------------------------------------- |
| Crew kind                           | one row in `CREW_STATS` (`balance/crew.ts`)                                      |
| Ticket type                         | one row in `TICKET_TYPES`                                                        |
| ADR rung                            | one row in `DEBT_TIERS`; the tree node derives from it                           |
| Spawner line                        | one row in `SPAWNERS`                                                            |
| A line's five tree nodes            | `LINE_NODES` in `skill.model.ts` (`LINE_DOUBLE_COST`, `perTier`, `lineEstimate`) |
| Rate row                            | `INCOME_ROWS` in `balance/progression.ts`                                        |
| Crew line                           | one row in `LINE_PLAN`                                                           |
| Skill                               | one node in `SKILL_NODES`                                                        |
| Lanes, trains, hotfix, escalation   | `balance/round.ts`                                                               |
| Spawn, golden, votes, pizza, expiry | `balance/flow.ts`                                                                |
| Board cap                           | `BOARD_CAPACITY` in `model/geometry.ts`                                          |
| Hazard                              | one row in `HAZARDS`                                                             |
| Save                                | `SAVE_VERSION` in `model/game.consts.ts`                                         |
| Autoplayer policy                   | `DEFAULT_POLICY` in `util/autoplay.ts`                                           |
| Lane look                           | `LANE` in `stage/model/board.consts.ts`                                          |

- `data/balance-invariants.spec.ts` guards the **shape**: monotone ladders, tiers numbered by
  position, every rung on the tree and chained, no dominated retype rung.
- `data/balance.spec.ts` guards the **pacing** on the advised autoplayer (`advisedSpend`):
  the run accepted in 25–45 min, the acceptance push 2–5 min, the last five ADR gaps and
  ADR-8 → sign-off over two minutes, and the crew's share — at least 5 %
  of the closes before `goldenCrew`, judged from three minutes after the first junior (the hand's
  gold outweighs their euros until then, as in the reference), and 4 % of the euros after it. Run with the
  reports:

  ```bash
  CB_CLOCK=1 CB_LADDER=1 CB_SHARE=1 CB_INCOME=1 pnpm vitest run src/app/game/data/balance.spec.ts
  ```

  A second, cheapest-first run (`spend`) guards **reachability**: every track entered, the tree
  bought out before it signs off.

- `data/sim.spec.ts` guards the **sim** against a real board.

**Measured run** (27 Sep 2026, advised autoplayer, auto-close, box-overlap ring, poker ×3 a rank):

```
ADR-1 3.9    ADR-2 7.2    ADR-3 9.8    ADR-4 10.8   ADR-5 13.6   ADR-6 16.7
ADR-7 19.7   ADR-8 24.0   signed off 28.3   accepted 31.6
```

### Load-bearing, do not undo

- Lanes are a hard cap, and the haul is the only forced wait. Softening it brings the wall clock
  back.
- Bands: they make crew kinds different tools rather than tiers of one tool.
- Golden is crew-exempt until `goldenCrew`.
- Tree = SP, rail = €.
- A full board displaces; it never refuses. Refusing starves the late lines.
- `store.board` is a plain mutable object; `util/board.ts` is stepped, never priced (eslint).
- `freshConsultancy` ships `root` bought and `velocity` open.

---

## 11. Reference numbers (Garbage Growth, measured by Martin)

These are accepted as real and go in as they are.

| Reference                               | Value                                                                                           | Ours                                                            |
| --------------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Head price                              | `floor(base × 1.15^k)`, float32 step; people 2, dogs 500, bikes 15 000; cap 50, one free person | same                                                            |
| Gum unlock                              | 25 $ rail row                                                                                   | `velocity` 25 €                                                 |
| Gum per pickup                          | 1 per item, whatever it's worth                                                                 | `SP_PER_PICKUP` 1                                               |
| Paper income row                        | `floor(250 × 1.65^k)`, +3 flat a rank, 10 ranks, multipliers applied after                      | `INCOME_ROWS` tier 0                                            |
| Dog income row                          | `floor(1 250 × 1.65^k)`, +4 a rank                                                              | `INCOME_ROWS` tier 1                                            |
| Paper ×2                                | 25 gum, then 2 500                                                                              | `valueLint`, `doubleLint`                                       |
| Paper +2 gum                            | 75 → 112 (×1.5), 5 ranks                                                                        | `estimatesLint`, +4                                             |
| +50 % paper income                      | 1 100 → 1 375                                                                                   | `incomeLint`                                                    |
| 20 % chance to throw 2 papers           | 2 200 gum                                                                                       | `spawnLint` rank 1                                              |
| Radius +25 %                            | 100 gum                                                                                         | `radius`                                                        |
| Rat unlock / hire                       | 1 200 gum / 1 000 $                                                                             | `junior` / `LINE_PLAN.junior`                                   |
| Rat speed / population / slimy (×2 gum) | 1 500 / 20 000 (+5 ×3) / 15 000                                                                 | `juniorSpeed` / `juniorRoom` / `timesheets`                     |
| Rats                                    | 10 on the rail, 25 with population                                                              | `LINE_PLAN.junior` 10 + `juniorRoom`                            |
| Dogs unlock                             | 750 gum                                                                                         | `adr1`                                                          |
| +1 trashcan                             | 1 500 gum                                                                                       | `cans` rank 1                                                   |
| Golden 2 %, 100×                        | 2 000 gum; +50× a rank ×4 from 2 000                                                            | `golden`, `goldenValue`                                         |
| Dog ×2 / +50 % / +2 gum / throw 2       | 1 500 / 2 200 / 400 / 4 400                                                                     | `valueLegacy`, `incomeLegacy`, `estimatesLegacy`, `spawnLegacy` |
| Bike / gorilla unlock                   | 10 000 / 600 000 gum                                                                            | `adr2` / `adr3`                                                 |
| Can                                     | holds 100; +25 a rank ×10; up to 10 cans, each with its own truck                               | lanes, `capacity`, `cans`                                       |
| Gum angels                              | +30 gum per beam crossed, normal litter only; two 10-rank nodes (+1 angel, +15)                 | `coaches`, `deck`                                               |
| Litter lifetime                         | ~15 s                                                                                           | `TICKET_LIFE_MS` 3.5 s (ours)                                   |
| Opening throw                           | ~1 item per 4 s from one person                                                                 | `lint` 0.25/s                                                   |
| Golden rat                              | late; takes golden, turns 5 % golden                                                            | `goldenCrew`                                                    |
| Run length                              | demo ~30 min to the gorilla; full game 57–70 min                                                | gorilla 9.8, accepted 31.6 (target 30)                          |

Only rank 1 of each line's throw-two and +50 % nodes is measured; ranks 2–5, the second ×2 above
paper, and every tier above the dog are extrapolated (value ×10 a tier, € prices ×5, SP prices
×2). ADR-4…8 have no reference counterpart; the reference's first area ends at the gorilla and
continues on a second screen (the sea), which we do not build.

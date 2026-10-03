# Debt Growth — game design

The design as the code has it. Every number names the file it lives in; paths are relative to
`src/app/game/` unless stated.

---

## 0. The economy in six lines

1. **Developers throw tickets.** Each head on a line throws one ticket about every 4 s; every
   ADR opens a line whose tickets are worth ×10 the last.
2. **Tickets don't wait.** Unreached work is closed as "won't fix" after 12 s at the start, 3.5 s from ADR-6, or sooner when a
   full board pushes it out for newer work.
3. **You and the crew pick them up**, and with Triage Policy lint and bugs close themselves.
   Every pickup pays its value in €, and SP once the €25 `velocity` row is bought.
4. **The sprint caps the pace.** A full sprint ships on the release train and the board waits
   until it is back. The acceptance push has neither: every close ships.
5. **€ buys supply, SP buys the tree.** The rail sells heads, rate rows and crew; the tree
   sells everything else, the ADRs included. `signoff` starts the acceptance push, which tests
   one line at a time; the run ends when all nine criteria are signed.
6. **Income = collected tickets/s × their worth**, where collected is the least of what the
   lines throw, what the hand and crew reach, and what the sprint takes. `util/sim.ts` computes
   exactly this without a board (§9).

It is an **active game**: there is no offline progress, and the only income that doesn't come
from a pickup is an achievement's reward.

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
- **Managers oversee** (§5): they close nothing; crew closes inside their reach bill more.

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
2. **Expire.** A crew-workable card nobody reaches in `ticketLifeMs(tier)` — `TICKET_LIFE_BY_TIER`, 12 s at tier 0 down to
   `TICKET_LIFE_MS` 3.5 s from ADR-6 — (golden:
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
   going stale (`expireTickets` hands it to the store), fills a sprint slot and bills like any
   close, SP included, credited to the crew's share. Its card tints green over its life on the
   GPU (`AUTO_CLOSE_RAMP`). If the sprint has no room it **goes to prod**: it becomes an `incident`,
   at most `PROD_INCIDENT_LIVE_CAP` 3 live at once (the rest go stale), counted in
   `lifetimeProdIncidents`; the first earns _Works on my machine_. A P0 needs a sprint slot like
   any close, so prod P0s wait for the train and a cycle clears at most three of them.
6. **One sprint, one release train.** Closed work fills the sprint. A full sprint leaves on the
   train for `haulMs`, and collection is refused until it is back (`phase: 'hauling'`); refused
   cards bounce where they lie (`REFUSAL_BOUNCE`). The wait is the release, and it is meant to
   be felt; the ceremony cuts shorten it. From sign-off (`economy.trainRuns` false) there is no
   sprint cap and no train: a train out at sign-off comes straight home, closes no longer fill the
   sprint, `ceilingPerSec` is unbounded, and the strip and HUD read _every close ships_.

```
sprintSlots    = (SPRINT_SLOTS_BASE 100 + Σ slots) × (1 + Σ cans)
                 (capacity +25 a rank ×10, o2 +14; cans +1 team a rank ×9)
haulMs         = Σ ms of the RELEASE_PHASES still run  (6 × 1 200 uncut; each cut node skips one)
ceilingPerSec  = sprintSlots / haulMs
```

All in `balance/round.ts` and `util/economy.ts`. The cadence is an output of the player's
throughput. A "round" in the code is one sprint's release.

The train runs ceremonies in order: Code Freeze → Ship to Production → Smoke Test → Sprint
Review → Retro → Refinement (`economy.releasePhases`, `phaseAt`). Five single-rank nodes cut one
each, one per rung: `cutRetro` (tier 0), `cutRefinement` (ADR-1), `cutReview` (ADR-2), `cutSmoke`
(ADR-3), `cutFreeze` (ADR-4); Ship to Production is never cut. While the train is out, `ReleaseBanner` spells the phase across
the board's upper third in the big-payout gold, with the whole ceremony under it.

From ADR-5 (`INCIDENT_REVIEW_FROM_TIER`) every P0 still on the board when the train leaves adds
`INCIDENT_REVIEW` 900 ms to an **Incident Review** after Ship to Production, up to
`INCIDENT_REVIEW_CAP` 10 of them (`economy.withReview`, the store's `#sendTrain`; a P0 sent to
prod on the departing tick is not counted, no hand could have reached it); the first earns
_Blameless post-mortem_. Crew never take P0s, so keeping prod clean is the hand's job.

Player-facing copy never says "truck", "can" or "lane": sprint, sprint scope, release train.

---

## 3. Currencies

|                     | Earned from                                                                           | Spent on                                       |
| ------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------- |
| **€ Budget**        | Every pickup, `quarter` board bills, achievements before ADR-3                        | The rail: spawner heads, rate rows, crew lines |
| **SP Story Points** | Every pickup once `velocity` is bought, planning-poker votes, achievements from ADR-3 | The tree, all of it, ADRs included             |

**The tree unlocks, the rail buys.** No node costs euros and no rail row costs SP.

**SP at pickup** (`economy.pickupStoryPoints`): once the €25 `velocity` rail row is bought
(`LINE_PLAN.velocity`, `open: true`), every close pays `SP_PER_PICKUP` 1, **whatever it bills**,
plus:

- the line's `estimates<Ticket>` steps, three of 5⁄3 × `ESTIMATE_SP_PER_RANK` 20 SP at tier 1,
  ×`ESTIMATE_SP_TIER_GROWTH` 2 each tier above; lint's pays 5⁄3 × `ESTIMATE_SP_PER_RANK_OPENING` 4,
  since auto-close bills every lint card. A late line's `contract<Ticket>` pays all three at once;
- ×`CREW_SP_MULT` 2 on crew closes with `timesheets`;
- `voteBonus`: SP for every live planning-poker vote the ticket fell through, decided at spawn
  (§6).

Value nodes and rate rows lift euros only. The run opens with one developer and nothing else.

**Achievement rewards** (`economy.grantAwards`): every `kind: 'achievement'` in
`model/award.model.ts` pays once, when it fires, `AWARD_UNIT[tier]` × `AWARD_WEIGHT_UNITS[weight]`
(small 1, medium 2, large 4) from `balance/award.ts`, in euros below `AWARD_SP_FROM_TIER` (ADR-3)
and in SP from it on. SP rewards go through the credit line like any SP. The units are fixed per
tier, never lower on a higher one, and sized against that tier's prices: big enough to show, small
enough that no tier is skipped. Milestones (tiers, first close, criteria) pay nothing, and nothing
pays once the tree is signed off: those count only in the post-mortem. Rewards are a bonus, so a
player who earns more of them finishes sooner; the totals are `lifetimeAwardEuros` and
`lifetimeAwardSp`.

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
interest.

### Hand-only cards

No purchase makes these arrive faster (`economy.spec.ts`), but the run does: each ADR approved
adds `HAND_ONLY_RATE_PER_TIER` +75 % to their rate (×7 at ADR-8), so the hand's targets grow
with the run and the short late tiers still see them. Doubling it left a real tier-7 board a third
under the sim (more P0s, longer incident reviews). They never expire and are never displaced.

| Type         | Rate/s | Effect                                                                                                                                                                                                                                                                                         |
| ------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `incident`   | 0.008  | 150 € × tier; from ADR-2 (`INCIDENT_PAYOUT_FROM_TIER`), 5 newest-line tickets in € and SP (`INCIDENT_TOP_SHARE`) plus `INCIDENT_PAYOUT_SEC` 3 s of the build's € and SP income (`incidentPayout` in `util/sim.ts`, which the sim credits to a sweeping hand, prod P0s included). First at 75 s |
| `escalation` | 0.0015 | ×`ESCALATION_MULTIPLIER` 5 on every close for `ESCALATION_HOLD_MS` 9 s, +4 s with Observability                                                                                                                                                                                                |
| `hotfix`     | 0.006  | ×2 ticket value for `HOTFIX_MS` 10 s                                                                                                                                                                                                                                                           |
| `quarter`    | 0.0012 | Bills a random draw of resting tickets, as many as the sprint has room for (from tier 2), under hotfix and escalation; the rest stay and bounce                                                                                                                                                |
| `pizza`      | —      | The pizza-party voucher (§5), from the `pizza` node                                                                                                                                                                                                                                            |
| `invite`     | —      | Hazard invitation (§8): sweep it to decline the meeting                                                                                                                                                                                                                                        |

**Combos** (`armBuffs` in `data/game.store.ts`): a hotfix swept inside a live escalation
extends the escalation by `COMBO_EXTEND_MS` 3 s, and an escalation swept inside a live hotfix
extends the hotfix. A quarter end billed under both is a **jackpot**: the board bills ×2 and
×escalation at once, the sweep floats _Perfect storm_, and `lifetimeJackpots` counts it. The
order is the skill: hotfix, escalation, then the quarter end on a full board, and it bills the
board `JACKPOT_BONUS` 10 times over, story points included. The call line in `buffNotices` teaches it while a buff is
live: an escalation held with no quarter end (`escalationHeld`), a quarter end held (`quarter`),
both held with a hotfix on the board (`combo`) or live (`comboLive`), and both buffs live over a
held quarter end (`storm`). The
quarter-end card is cyan so it never reads as the orange pizza voucher, and hand-only cards draw
above falling work. The board shows at most three banner lines, two while a hazard is announced.

The opening's reveal order is ticket data: a row's `revealAtMs` / `revealAtTier` holds it back,
and `util/first-act.ts` places the first card on its beat.

### Golden

Any arrival rolls `goldenChance` (+2 % from the single-rank `golden` node). A golden
card is worth `GOLDEN_VALUE_BASE` 100× + `GOLDEN_VALUE_PER_RANK` 50× a `goldenValue` rank
(additive, 100× → 300×). **No crew kind claims golden** until `goldenCrew`, which also turns
`GOLDEN_CREW_CONVERSION` 5 % of crew closes golden. Golden is what keeps the hand worth using
once the crew works; after `goldenCrew` the cursor is a bonus, by design.

---

## 5. Crew

One row per kind in `CREW_STATS` (`balance/crew.ts`). The row order is claim priority.

|          | close | walk | batch | sweep | band | woman every | seats                             |
| -------- | ----- | ---- | ----- | ----- | ---- | ----------- | --------------------------------- |
| seniors  | 10 s  | 70   | 3     | 70    | 3–∞  | 6           | 10 + `seniorRoom3`–`5` 3 × 5 → 25 |
| juniors  | 5 s   | 90   | 1     | 40    | 0–4  | 4           | 10 + `juniorRoom2`–`4` 3 × 5 → 25 |
| managers | 12 s  | 110  | 1     | 110   | —    | 3           | 5 + `managerRoom5` 1 × 5 → 10     |

- **File on arrival, then recover.** A worker walks to a card, files it at once, and rests for
  its close time. A claim samples four cards (`CLAIM_SAMPLES`) and takes the nearest of them
  (`lineOfSight`, the `scout` trait) or a random / dearest one; the walk is a real share of every
  cycle.
- **Bands** divide labour: juniors take tiers 0–4 (`juniorReach`, `stretch` extend it), seniors
  tier 3 up; both take 3–4. The `senior` node hangs off ADR-3, so no senior waits for work.
- **Seniors have one trait each**, by seat (`model/senior.model.ts`, `hireFor`): `closer`,
  `sweeper`, `runner`, `firefighter` (top of band), `scout` (nearest).
- **Managers oversee** (`mode: 'overseer'`): a manager walks to a card some closer is headed
  for, stands there for its close time, and moves on. A crew close within its sweep radius
  (`managerReach`) bills `managerAura` × — `MANAGER_AURA_BASE` 1.5, +0.25 / +0.25 / +0.5 from
  `relabel`; `managerSpeed` widens the reach. The stage draws each reach on the floor.
- **Women close twice as fast** (`WOMAN_CLOSE_RATE` 2), every _n_-th seat per kind; counted in
  `lifetimeClosedByWomen` and shown in the post-mortem.
- **Crew skills are two effect kinds**: `{ kind: 'pace', crew, field: 'close' | 'walk' | 'sweep',
mult }` and `{ kind: 'batch', crew, add, closeMult? }`. Senior traits use the same shape.
- **Seats are per line**: `LINE_PLAN` cap + the line's room ranks × `ROOM_SEATS` 5
  (`economy.lineCap`, `{ kind: 'room', line }`). Each room sits behind its kind's speed node
  (unlock → improve → raise the cap) and is priced off its unlock at a 20 000 / 1 200 ratio,
  climbing ×3 a rank.
- **Pizza party** (`pizza` node, ADR-5): the engineering manager drops a hand-only voucher;
  sweeping it makes crew inside `PIZZA_RADIUS` 240 work ×`PIZZA_RUSH` 5 for `PIZZA_MS` 12 s.

The crew and Triage Policy's auto-close (§2) are the only automation; the only crew kinds are
juniors, seniors and managers. Hand-only cards are the player's alone. The CI auto-close
pipeline, an offshore-contractor crew kind and the Promotion Round were removed.

---

## 6. Progression

Every purchase lives in the code: tree nodes in `model/skill.model.ts` (`SKILL_NODES`,
`LINE_NODES`), rail rows in `balance/progression.ts` (`LINE_PLAN`, `INCOME_ROWS`),
`model/spawner.model.ts` and `model/kit.model.ts`. Two purchases overlap, or share a name, here:

- Junior band +1 twice: `juniorReach` rank 2 and `stretch`.
- Junior walk: `juniorSpeed` and `o3`. Senior sweep: `seniorReach` and `o5`.
- No effect: `o4` (the Server Room; buying it earns the `a-server` achievement).
- "Human in the Loop" names both `assurance` and `doubleSwarm`; "Bullpen" names `juniorRoom2`.

### The rail — three tabs, all euros

| Tab       | Rows                                             | Cap      | Price                                            |
| --------- | ------------------------------------------------ | -------- | ------------------------------------------------ |
| **Debt**  | Nine spawner lines                               | 50       | `floor(base × 1.15^k)`, step `Math.fround(1.15)` |
| **Rates** | One income row per line ticket                   | 10       | `floor(first × 1.65^k)`                          |
| **Crew**  | `junior`, `senior`, `manager`, `velocity`, `kit` | per line | `LINE_PLAN` × 1.15^level                         |

- **Spawner bases** (`SPAWNERS`): 2 · 500 · 15 000 · 87 500 · 500 000 · 3.5 M · 27.5 M · 240 M ·
  2.25 G. Every rung's row starts with one free head (`SPAWNER_FREE_HEADS`) that does not raise the
  price: ADR-0's from the start, the others when their ADR is bought, so a new line is on the board
  the moment it opens.
- **Rate rows** (`INCOME_ROWS`, `balance/progression.ts`): tier _t_ costs `250 × 5^t` for its
  first rank and adds a flat `3 + t` € a rank to the ticket's value **before** multipliers.
  Opens once the line has a head (`incomeUnlocked`). Flat on purpose: decisive on cheap work,
  nothing on dear work, so it pushes the player up a rung.
- **Crew lines** (`LINE_PLAN`): junior 1 000 (cap 10), senior 1 200 (cap 10), manager 28 000
  (cap 5), velocity 25 (cap 1). `kit` (cap 6) charges each `KIT_PLAN` item's own price, 12 000 to
  1.9 M, not the 1.15 climb; its node fits the first. Room nodes raise the crew caps. The tree opens each line once (`{ kind: 'line' }`); `velocity` is open from
  the start because it is the SP source.

### The tree — SP only

`model/skill.model.ts`. `root` ships bought; every other node is SP, written exactly as charged.
Each square carries a `+`/`%` badge from its next rank's effects (`skillBadge`).

**The early lines (lint … slop) have five nodes** (`LINE_NODES`, `earlyLine`), hanging off
their ADR:

```
value<T>  ×2 ──┬── spawn<T>      3 steps × +33 % throw-two  → ×2 spawn
               ├── income<T>     3 steps × +83 % income     → ×3.5
               └── estimates<T>  3 steps × 5⁄3·20·2^(t−1) SP
                        │
               double<T>  ×2   opens once all three are maxed (`maxed`)
```

Each step is its own single-rank node, **one per ADR** (`chained`): `spawnFlaky`, then
`spawnFlaky3` under it waiting for ADR-3, then `spawnFlaky4` waiting for ADR-4. A
line keeps growing for two rungs after it opens, so every ADR also brings old lines a buy. Steps
stop at ADR-4 (`LINE_CHAIN_LAST_TIER`): conflict's last two and slop's three stay as ranks on
their ADR-4 node. `double<T>` waits for the last step of each chain.

**The late lines (rockstar … swarm) sell the whole ladder in two buys** (`lateLine`), so the
late tiers are short and new rather than the same five nodes again:

```
contract<T>  value ×2, all three estimates steps   (the SP source, cheap)
    │
retainer<T>  throws ×2, value ×7                   (spawn, income and double in one)
```

Both end exactly where a fully bought early line ends: ×14 per ticket (before rate rows),
throwing twice as often. Additive steps are stored as ratios — step _k_ multiplies by
(1 + k·step) / (1 + (k−1)·step) — so three +⅓ steps end at exactly ×2.

Prices: `LINE_PRICE_BY_TIER` (`balance/progression.ts`, ×2 a tier to ADR-5, ×4 into ADR-6, ×2
after) sets a line's base; `value` 25 / 1 500 then `LINE_DOUBLE_COST`; `spawn` 5⁄3 × 2 200 × it
(steps ×1.5); `income` 5⁄3 × 1 100 × it (steps ×1.5); `double` 2 500 × it; `estimates` 5⁄3 ×
75 / `400 × 2^(t−1)` (steps ×2.2); `contract` 3 000 × it, `retainer` 30 000 × it. Every line
node is then priced for the rung it sits on by `LINE_RUNG_PRICE` (1 · 1 · 1 · 0.6 · 0.3 · 0.2 ·
0.4 · 0.55 · 0.5), the same scale the hand-written prices from ADR-3 on were cut by.

| Track           | Holds                                                                                                                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A** Hand      | `radius`, the sprint nodes (`SPRINT_RUNGS`: per tier `capacity<t>` +25 scope, `cans<t>` +1 team, `cut<Ceremony>` on tiers 0–4), `lineOfSight`, `golden` → `goldenValue`, `goldenValue<t>`, `goldenCrew` |
| **B** Juniors   | `junior` (1 200), `juniorSpeed`, `juniorRoom<t>`, `juniorReach` → `stretch`, `juniorPresence`, `ticketStacking`, `timesheets`, `pizza`                                                                  |
| **E** Seniors   | `senior` (60 000, ADR-3), speed, reach, presence, `seniorRoom<t>`                                                                                                                                       |
| **H** Managers  | `manager`, speed, `relabel`, `managerRoom5`                                                                                                                                                             |
| **C** Client    | the per-line `value` / `income` / `estimates` / `double` nodes, the late `contract` / `retainer`, `valueBug`, `escalation`, `coaches`, `deck`                                                           |
| **D** Debt      | the per-line `spawn` nodes, `debtInterest`, `debtInterest<t>`, `triagePolicy`, `spawnIncident` → `spawnIncident7` (escalations), `spawnIncident8` (incident value)                                      |
| **G** Capstones | `assurance`, `signoff`                                                                                                                                                                                  |
| **N** ADRs      | `adr1` … `adr8`, chained; each rung is the parent of its line's `value` node (Lint's hangs off the client heading)                                                                                      |
| **O** Office    | `o4` (cosmetic, the Office arm), and under the `facilities` group off ADR-1: `kit` and the rooms `o2` → `o3` → `o5` → `o6` → `o7`, gated on ADR-1, 2, 5, 6, 6                                           |
| `secret`        | Konami-granted, ×1.1 global                                                                                                                                                                             |

There are no global spawn-rate or income nodes: a line only grows through its own nodes.

**The tree leads the run.** The ADR chain is the spine and whatever a rung opens hangs off it. A
family's later ranks grow as arms instead (see _One rank per node_): each hangs off the rank before
it and waits, a dim box, for its ADR. The root opens four arms — the Lint line, the Hand, the
Office (`o4` alone) and ADR-1. After that:

Every rung opens its line and at least one mechanic, so no rung is only more of the same. A
rung's extras are priced to fill the tier — most of the SP it earns, the ADR the rest — so the
tree always has something to buy, and never everything at once:

| Rung  | Opens                                                                                                |
| ----- | ---------------------------------------------------------------------------------------------------- |
| ADR-1 | Legacy line, `junior` (the whole crew arm, `triagePolicy` under it), `facilities` (`kit`, the rooms) |
| ADR-2 | Flaky line, `golden`                                                                                 |
| ADR-3 | Conflict line, `senior`                                                                              |
| ADR-4 | Slop line, `manager`, `debtInterest`                                                                 |
| ADR-5 | Rockstar line, `pizza`, `timesheets`, `coaches` → `deck`                                             |
| ADR-6 | Zombie line, `spawnIncident`, `goldenCrew`                                                           |
| ADR-7 | Rewrite line                                                                                         |
| ADR-8 | Swarm line, `assurance`, `signoff`                                                                   |

Every rung also carries its own sprint set (`SPRINT_RUNGS` in `skill.model.ts`): a `capacity<t>`
and a `cans<t>` node, plus one ceremony cut on tiers 0–4, each priced for its own rung's SP
income. They are drawn as three arms: `capacity` off `radius`, `cans` off ADR-1, the cuts under
the `ceremonies` group off `radius`; each node hangs off its predecessor and waits for its ADR.

**One rank per node.** A curve's later ranks are spread the same way: each is its own node
`<family><t>` hanging off the rank before it and gated on ADR-_t_ (`maxed: [adr<t>]`; the lock
reads "Needs ADR-_t_"), so seats never arrive before the crew they seat and every family is one
long arm. `chained` in `skill.model.ts` spreads every multi-rank node one
per ADR from its opener's rung (`CHAIN_FROM`: `radius` and `escalation` 0/1/2, `juniorSpeed` and
`juniorReach` 1/2/3, `juniorPresence` and `triagePolicy` 1/2, the senior three 3/4/5,
`managerSpeed` and `relabel` 4/5/6); `assurance` keeps its three ranks on ADR-8, the tier-0
`capacity` and tier-1 `cans` their two. The hand-written ones (`RUNG_NODES`):

| Family          | Rungs                                           | Opener          |
| --------------- | ----------------------------------------------- | --------------- |
| `juniorRoom`    | 2, 3, 4                                         | `junior`        |
| `seniorRoom`    | 3, 4, 5                                         | `senior`        |
| `managerRoom`   | 5                                               | `manager`       |
| `goldenValue`   | first rank under `golden` (ADR-2), then 3, 5, 7 | `goldenValue`   |
| `debtInterest`  | first rank under `debt` (ADR-4), then 6, 8      | `debtInterest`  |
| `spawnIncident` | first rank (ADR-6), then 7, 8                   | `spawnIncident` |

The rooms sit mid-run on purpose: seats are crew euros for the rest of the run, and moving them
late costs the ending minutes.

`double<T>` waits on its three ladders (`maxed`); it stays a dim box, not a readable square, until
they are full.

**Groups** (`group: true`) are headings drawn as squares: free, open the moment their parent is
owned, invisible to game logic (`skillParent` reads through them like any heading). They exist to
give a crowded parent depth: `facilities` (ADR-1), `ceremonies` (`radius`), `onboarding` (junior
speed, reach, presence) and `handcuffs` (the senior three). The map is orthogonal (`stage/util/skill-layout.ts`):
the root in the middle, one arm per compass point. The ADR ladder is a spine running east with
each rung's branches hanging north and south; the widest other arm grows west, the other two
north and south. Every arm is a tidy tree — a layer per depth, a lane per leaf — wired in right
angles. `signoff` sits alone on the spine well east of ADR-8, drawn twice the size: it is the
final.

**Backdrop.** Behind the tree hangs one wall per ADR (`assets/art/tree/<tier>.webp`, `TREE_BACKDROP`
in `stage/model/board.consts.ts`): a clean whiteboard at the start, then one per tier, crossfaded
when an ADR is approved and kept dim under the squares (`stage/scene/tree-backdrop.ts`).

**Icons.** Every square draws `assets/skills/<nodeId>.png`, a chained node its family's; the five
per-line kinds share `line-<kind>.png`, `contract` the estimates icon and `retainer` the income
one (`stage/model/skill-icon.model.ts`). The files are generated from
`tools/art-batch.mjs` rows of the same names; `spare-*.png` are generated but unused.

**Planning poker** (`coaches` 600 k then `coaches6` 3 M, `deck` 1 M then `deck6` 4.5 M: two buys
each, five coaches or five deck cards a buy, at ADR-5 and ADR-6): coaches on the lane edge hold
votes live for `VOTE_ON_MS` 1.4 s of every `VOTE_CYCLE_MS` 4 s, offset from each other. A
non-golden ticket that lands below a live vote's beam gains `VOTE_BONUS_BASE` 45 SP + `VOTE_BONUS_PER_RANK` 15 a deck card.
The beams sit in board units (`VOTE_BEAMS`, `voteBeamY`), so a ticket landing above one is passed over;
decided at spawn from the landing cell and kept on the ticket as `voteMask`, one bit per beam. The
heap's `HEAP_FIELD_ROWS` all lie under the first beam, so every card falls through at least one;
a crowded board stacks `HEAP_LAYERS` 3 offset layers over the same field instead of rising into
the spawner lane.
The stage scales the board separately across and down (`board-scene.ts` `#layout`), so y 100 always
sits `VOTES.belowSpawners` under the fixed spawner path and the floor on the sprint strip; round
things (sweep ring, pizza) use √(x·y), so the hand covers the board area the sim prices. Drawn by `stage/scene/vote-beams.ts`: the beams rest dim, and a beam
flashes only where a card it voted on falls through it (`FlyerPool` reports the crossing), its coach
raising a card. The card's purple border (`voteFrame`) steps in with each voting beam it crosses,
so every flash is a vote and every vote flashes.

### The ADR ladder

`DEBT_TIERS` (`model/tier.model.ts`). Buying `adrN` raises `state.tier`, opening line N and its
ticket together. `TIER_BURST` spawns 10 at tier 3. The ADR modal only shows the signed
record; the rail has no ADR panel.

| ADR | SP        | Unlocks    |
| --- | --------- | ---------- |
| 1   | 350       | `legacy`   |
| 2   | 6 000     | `flaky`    |
| 3   | 45 000    | `conflict` |
| 4   | 120 000   | `slop`     |
| 5   | 160 000   | `rockstar` |
| 6   | 480 000   | `zombie`   |
| 7   | 3 600 000 | `rewrite`  |
| 8   | 6 900 000 | `swarm`    |

The prices grow with the rung because SP income does. From ADR-3 on, every SP price — ADRs,
extras, sprint sets, crew arms, line nodes — was cut by the rung it sits on (0.6 · 0.3 · 0.2 · 0.4 ·
0.55 · 0.5 for tiers 3…8), so the opening keeps its pace and each later tier is quicker than the
one before.

**`signoff`** (8 M SP, off ADR-8) is `FINAL_SKILL_ID`, priced so tier 8 is a short last act. Buying it
opens the **Closeout Record** (`console/feature/moment-modal/`, the ADR format, signed by the
client's procurement agent, comments "LGTM"), records the budget and billing it was signed at
(`signedBudget`, `signedBilled`), and starts the **acceptance push** (`ACCEPTANCE` in
`balance/progression.ts`, `economy.inAcceptance`) and everything bills `economy.overtime`
(in `globalMultiplier`). Modals pause the clock (`GameClock` reasons `record`, `moment`), so
reading the record costs no push; its button returns to the board, and the skill tree button
is gone until the run ends.

- **The crew sits in the acceptance meeting** (`crewRules` interrupts every kind,
  `sim.collect` counts no crew): only the hand collects, so only the player moves a criterion.
- **Acceptance criteria** (`CriterionRun` on the state, `economy.criterionNow`,
  `economy.stepCriterion`): nine, one per line, lint first, each open for exactly
  `CRITERION_MS` 15 s. The line under test spawns at `CRITERION_SPAWN_PER_SEC` 2.5 whatever its
  spawners (split across the types it produces). Only cards **spawned for the criterion** are
  its own (`BoardTicket.test`, `inTest`): they pulse pink (`UNDER_TEST`), a full board never
  displaces them, and each one the **hand** picks up counts (`economy.pickUnderTest`). Cards of
  that line already on the board stay as they were. The line bills as the newest rung's ticket
  ×`CRITERION_BONUS` 2 before its own multipliers. Every other line spawns at its own rate and
  nobody collects it, so the hand has to find the pink cards in the heap. In the push debt
  interest and Triage auto-close are off, nothing comes back, the line under test never rolls
  golden and no quarter end spawns, so every line is fed the same and only the hand closes it.
  Every criterion plays its whole window; reaching the goal early does not skip it. When the
  15 s are up it signs: **clean** if the hand has picked up `CRITERION_GOAL` 15, which confirms
  its award (`c-criterion-<line>`) and adds `CRITERION_OVERTIME` 0.5 to the base ×2 overtime;
  short of the goal it **signs with findings**: no overtime, no clean award, a
  `c-findings-<line>` toast instead (the first also earns _Signed with findings_). The push
  always lasts nine windows, 2 min 15 s.
- **The acceptance card** (`console/feature/acceptance-card/`, `GameStore.acceptance`) sits
  centred over the board: the test's number and name, the seconds left large (amber in the last
  five), the tickets to click, picked against the goal, a draining time bar, and a dot per
  criterion (clean, with findings, under test, to come).
- **The closeout voids** the hotfixes, escalations and quarter ends held on the board
  (`#voidVouchers` in the store), so buffs cannot be banked into the push, and cancels every
  meeting and fact; no hazard fires during the push, so no drought eats a test's window.
- **Buffs** keep their own rate in the push, so hotfix and escalation are windows to time
  rather than a constant.

The run is accepted once every criterion is signed (`economy.accepted`, checked each store step
and in the autoplayer); the budget passing €20 Qa on the way earns _Over budget_. An ACCEPTED
stamp holds for 2.8 s before the post-mortem, which counts criteria verified and signed with
findings, and ends on the office filmstrip.
Closing the engagement plays the story (`console/feature/story/`, finale act `story`): each office
the run reached, full-frame, with one narrator line (`story.<adr>`, `story.outside` with the run's
totals), `STORY_FRAME_MS` 14 s each or a click; then the closing credits over the leaving party.
No prestige.

**Approval on credit** (`purchase.creditOffer` / `approveOnCredit`): from ADR-4
(`CREDIT_FROM_ADR`), the next ADR, or the closeout after ADR-8, can be approved holding
`CREDIT_SHARE` 60 % of its price. The player pays what they hold; the rest (`CREDIT_INTEREST` 1,
no interest) becomes `spDebt`, repaid out of `CREDIT_GARNISH` half of every later SP pickup
(`economy.repaid`, in the store and the autoplayer), so the new rung's extras stay buyable. One
loan at a time. The tree frames the square in gold, the HUD shows the debt, and the advisor
recommends it (`Buy` kind `credit`): it shortens the late waits for the next ADR from 80–105 s to
about a minute.

Every purchase is a pure step in `util/purchase.ts` (`buySkill`, `buyLine`, `buySpawner`,
`buyIncome`); `GameStore` commits the result and handles the side effects.

---

## 7. Money

```
ticketValue = (type.value + rate-row bonus)
            × per-line value / income / double nodes
            (incident: × tier; from ADR-2 five of the newest line's tickets, fully multiplied;
             the line under acceptance test: the newest rung's value × 2)
            × global (secret, assurance, o6; overtime during acceptance)
            × hotfix ×2 (inside the window)

closeValue  = ticketValue × escalation ×5 (inside the window) × golden multiplier (if golden)
```

Paid at pickup. There is no invoice; nothing past sprint scope is ever priced.

---

## 8. Weather

`HAZARDS` (`model/hazard.model.ts`), each row a `Partial<Weather>` patch (`meeting`,
`incidentRate`, `slots`, `supply`). Two cadences, both `…_EVERY_MS` 120 s, with facts
`FACT_OFFSET_MS` 60 s behind invitations so they never land together (`balance/weather.ts`). From
`LATE_WEATHER_FROM_TIER` ADR-5 both run `LATE_WEATHER_PACE` twice as often (60 s, facts 30 s
behind), so the short late tiers still see their weather.

- **Invitations** (from tier 1): an `invite` card lands; sweep it within `INVITATION_WINDOW_MS`
  4 s to decline, or the crew go to a meeting (all-hands 10 s, compliance 6 s, retro 8 s, reorg
  10 s). The board's banner says so while the card waits and while the meeting runs, and outranks
  a fact; a decline floats _Declined_. An Account Manager declines them all for you.
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
- **Density** on the field = min(600, card-seconds held): a collected card half its life, the
  rest all of it (the tier's life, golden 20 s), won't-fix its 0.9 s fade longer; settled by iterating.
  Past 600 the board displaces rather than refuses: fades go first, then plain cards nearest
  expiry, so fewer reach auto-close (at ADR-6 a real board displaces ~100 cards/s).
- **Crew** are priced seat by seat: a batch per close time plus walk, a woman's close time
  halved but not her walk. The walk is the expected distance on the board grid
  (`NEAREST_WALK`) to a random card, or with `nearest` to the nearest of the four claim samples
  that hold a card this crew takes (binomial in its share of the field). The batch fills as
  far as the sweep reaches at that density.
- **Hand** takes one aimed card per sweep (gold first, then the dearest) plus a proportional mix
  of whatever other cards the ring touches, counted on the heap grid by box overlap
  (`cellsTouched`). Crew sweep batches count centres within their radius (`cellsInReach`).
- **Auto-close** takes whatever of an auto-closed type the hand left and lives to expiry.
- **Managers**: crew euros × (1 + (aura − 1) × covered share), the share being the managers'
  reach area over the board's, capped at 1 (`overseenShare`).
- **Sprint**: nothing is collected while the train is away, so what is reached is collected at
  reached / (1 + reached / `ceilingPerSec`); € and SP priced as at pickup.

Not counted: quarter bills and jackpots, pizza, incident reviews, and
weather; outside the push each moves a real board's euros by 10 % at most. In the push the sim
counts the hand's pickups of the line under test, and the 20 s window bounds a criterion either
way. `data/sim.spec.ts` plays the same
states on a real board (four seeds, averaged) and holds the sim within ×1.5, and plays a whole advised run on a real
board and holds its acceptance within ×1.1 of the sim's, because per-tier error compounds
over a run.
All 600 cards lie on the 374-cell field (three offset layers), so a click's reach grows with
density past one layer, and the sim counts that.

`util/autoplay.ts` plays a whole run on the sim: earn for a second, spend like a player
(`DEFAULT_POLICY`: 1 sweep/s, a quarter of the budget per purchase, cheapest first;
`saveForAdrSec`, off by default and `CB_SAVE` in the balance spec, holds SP for a near ADR) through
`purchase.ts`. A four-hour cap runs in about two seconds.

`util/advisor.ts` is the Synergy Analyser (AI Powered): it ranks every offer by (Δln €/s + Δln SP/s) over the seconds
of income it costs, scores a gate together with the best purchase it opens, and once `signoff` is
on offer buys only what shortens the time to it. The next ADR comes first: an SP buy costing at most `POCKET_SHARE` (5 %)
of it is filled up at once, cheapest first, as a player tops up old lines; anything dearer must not
delay the ADR by more than `ADR_SLACK` (a fifth). Buying only what reaches the ADR sooner stalls in
tier 1: the first junior pays back too late for any one-step estimate. `autoplay.advisedSpend` plays a run on it, and
`data/advisor.spec.ts` fails unless that run signs off sooner than cheapest-first. The console's
paperclip (`console/feature/agent/`, on by default, switchable in settings) shows its € and SP picks,
behind a once-only warning that it is cheating. Its auto-buy switch (`AgentService.auto`, off by default,
kept in settings) buys each pick the moment it is affordable.

---

## 10. Where the knobs live, and how they are guarded

| Concern                             | Tuning unit                                                                                                |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Crew kind                           | one row in `CREW_STATS` (`balance/crew.ts`)                                                                |
| Ticket type                         | one row in `TICKET_TYPES`                                                                                  |
| ADR rung                            | one row in `DEBT_TIERS`; the tree node derives from it                                                     |
| Spawner line                        | one row in `SPAWNERS`                                                                                      |
| A line's five tree nodes            | `LINE_NODES` in `skill.model.ts` (`LINE_DOUBLE_COST`, `perTier` over `LINE_PRICE_BY_TIER`, `lineEstimate`) |
| A curve's ranks spread over rungs   | `RUNG_NODES` in `skill.model.ts`                                                                           |
| Rate row                            | `INCOME_ROWS` in `balance/progression.ts`                                                                  |
| Crew line                           | one row in `LINE_PLAN`                                                                                     |
| Skill                               | one node in `SKILL_NODES`                                                                                  |
| Sprint, train, hotfix, escalation   | `balance/round.ts`, `balance/weather.ts` (`COMBO_EXTEND_MS`)                                               |
| Acceptance, criteria, credit        | `ACCEPTANCE`, `CRITERION_*`, `CREDIT_*` in `balance/progression.ts`                                        |
| Achievement rewards                 | `AWARD_UNIT`, `AWARD_WEIGHT_UNITS`, `AWARD_SP_FROM_TIER` in `balance/award.ts`                             |
| Incident review                     | `INCIDENT_REVIEW*` in `balance/round.ts`, `INCIDENT_TOP_SHARE`, `INCIDENT_PAYOUT_SEC` in `balance/flow.ts` |
| Spawn, golden, votes, pizza, expiry | `balance/flow.ts`                                                                                          |
| Board cap                           | `BOARD_CAPACITY` in `model/geometry.ts`                                                                    |
| Hazard                              | one row in `HAZARDS`                                                                                       |
| Save                                | `SAVE_VERSION` in `model/game.consts.ts`                                                                   |
| Autoplayer policy                   | `DEFAULT_POLICY` in `util/autoplay.ts`                                                                     |
| Lane look                           | `LANE` in `stage/model/board.consts.ts`                                                                    |

- `data/balance-invariants.spec.ts` guards the **shape**: monotone ladders, tiers numbered by
  position, every rung on the tree and chained, no dominated retype rung.
- `data/balance.spec.ts` guards the **pacing** on the advised autoplayer (`advisedSpend`):
  the run accepted in 18–22 min, the acceptance push 2–5 min, every tier's share of the run
  within ±25 % of `TIER_CURVE` (3 · 4 · 3 · 2.25 · 1.75 · 1.5 · 1.25 · 1 · 0.75 min, tier 8 ending at
  sign-off: the opening at its own pace, then quicker every rung), and the crew's share — at least 5 %
  of the closes before `goldenCrew`, judged from three minutes after the first junior (the hand's
  gold outweighs their euros until then), and 4 % of the euros after it. Run with the
  reports:

  ```bash
  CB_CLOCK=1 CB_LADDER=1 CB_SHARE=1 CB_INCOME=1 pnpm vitest run src/app/game/data/balance.spec.ts
  ```

  A second, cheapest-first run (`spend`) guards **reachability**: every track entered, the tree
  bought out before it signs off.

- `data/sim.spec.ts` guards the **sim** against a real board.

**Measured run** (3 Oct 2026, advised autoplayer, credit from ADR-4):

```
ADR-1 3.2    ADR-2 7.3    ADR-3 10.2   ADR-4 12.4   ADR-5 14.1   ADR-6 15.6
ADR-7 16.7   ADR-8 17.6   signed off 18.3   accepted 21.3
```

The cheapest-first run buys the whole tree. `sim.spec` holds a real board's acceptance within
×1.1 of the sim's time and compares each stop over eight seeds; it leaves reward SP out of the
board's SP, since the sim prices closes.

What that run cannot see, because the sim does not price it:

- **Weather** is on and unpriced; `storm` and `page` stack with the hand-only tier climb.
- **Triage Policy** costs 500 / 1 600 SP for what is the biggest single SP source of the opening
  (every lint card bills); tier-0 estimates were cut to +4 to hold the pace instead.

### Load-bearing, do not undo

- The sprint is a hard cap, and the haul is the only forced wait. Softening it brings the wall clock
  back.
- Bands: they make crew kinds different tools rather than tiers of one tool.
- Golden is crew-exempt until `goldenCrew`.
- Tree = SP, rail = €.
- A full board displaces; it never refuses. Refusing starves the late lines.
- `store.board` is a plain mutable object; `util/board.ts` is stepped, never priced (eslint).
- `freshConsultancy` ships `root` bought and `velocity` open.

---

## 11. The screen

What the player sees, and where it lives. Paths are relative to `src/app/`.

- **Window.** Built for 1280 × 800 and up (`--np-cb-min-width` in `global.scss`, `minWidth` /
  `minHeight` in `tauri.conf.json`); below 800 tall the page does not scroll, the board shrinks and
  the shop scrolls its rows. The desktop window opens at
  1440 × 900. `tools/viewport-check.mjs` measures 1280, 1440 and 1920 and fails if the page scrolls.
- **Backdrop.** Each tier's art sits behind the cards at 40 % (`TIER_BACKDROP`,
  `stage/scene/tier-backdrop.ts`): its title screen first, then its ADR plate, swapping every 30 s
  with a 4 s crossfade; a new ADR switches to its title screen. Tier 0 pairs the lift with the
  empty office. The files are `assets/board/backdrop/<tier>-<office|tier>.webp`, named by
  `@shared/util/backdrop-art.ts`; the title screen and the ADR modal read the same files.
- **Illustrations ship un-pixelated** as WebP, converted from `image-staging/` by
  `tools/backdrop.mjs`. Pixelated on purpose: the 2011 easter egg, the finale party, the skill
  icons and every sprite.
- **Walkers.** One sprite per debt line (`stage/model/spawner-skin.model.ts`), dressed for the
  office and armed: the fresh grad, a skeleton on a cane, Frankenstein with a hammer, a contractor
  with a pickaxe, a hooded figure with a staff, the Rockstar, a zombie with an axe, a demolition
  worker with a sledgehammer, and three agents in suits. People or undead, no animals. Hashes in
  `.claude/skills/lpc-character/presets.json`.
- **Crew** wear their role: juniors short-sleeved in bright colours, seniors long-sleeved in dark
  ones, managers in hat and vest (`stage/model/lpc-uniform.spec.ts`).
- **Payouts.** Every sweep floats its own `+€` and `+SP`, bold and outlined, popping in before
  it fades (`floatPayout`, pooled in `stage/util/float-pool.ts`, capped by `FLOAT_CAP`). Crew
  closes are summed per board area over `CLOSE_FLOAT.poolMs` (`stage/util/close-pool.ts`) and
  float as one number tinted by the type that paid most. Golden and incident closes float big, at
  one of `BIG_FLOAT.sizes` picked at random. The sprint strip keeps one float for the
  sprint and updates its sum while money keeps landing.
- **Sprint strip.** One bar, filled left to right in up to ten segments, each tinted by the most
  common type among the closes it holds; below it Varible_37's ghost train (one image per car count, composed at run time)
  crosses between two portals while it is out
  (`stage/scene/sprint-strip.ts`).
- **Masthead.** Budget and SP roll to their value and glow as they climb
  (`console/ui/rolling/`); Budget shows €/s over the last 10 s of game time. The Sprint label
  names the current tier's epic, a sequel title (`epicKey` in `game/model/tier.model.ts`), and the
  acceptance push has its own.
- **Awards** stack in the board's bottom-left corner, three at a time, the rest behind a count
  (`console/feature/award-banner/`). Achievements have a points-pink border and a chip with what
  they paid; milestones have an accent-blue border. A paid reward also pops up as a big number
  above the board's centre (gold for euros, pink for SP, larger by weight) and floats away.
  Story Points in the HUD flash when an SP reward lands. The post-mortem lists the reward totals.
- **Rail.** Debt rows show their line's walker, Rates rows the card they bill; the next two
  locked rows are silhouettes. Affordable rows glow on hover and flash when bought.
- **Tree.** Opens framed on what can be bought; buyable squares pulse, bought paths are lit green,
  lines into a buyable square are blue (`stage/scene/skill-scene.ts`).
- **Canvas-drawn**, not art: the planning-poker coaches, the release train, the pizza circle and
  the lane actors (`stage/util/board-atlas.ts`).
- **Performance.** Profiled 27 Sep 2026 (Chrome, M-series Mac, 1280 × 800, dev build) at ADR-6
  with 350 walkers and a full 600-card board, sweeping: 60 fps flat, the main thread 80–84 % idle.
  Re-profile on a slower machine before optimising anything on the stage.

# Debt Growth — every upgrade

A catalogue of everything the player can buy, as the code has it. Labels are the English
catalogue's; ids in `code`. Paths are relative to `src/app/game/`. The design reasoning is in
`gamedesign.md` §6; this file is the lookup table.

- Tree nodes: `model/skill.model.ts` (`SKILL_NODES`, `LINE_NODES`, `ADR_NODES`), story points.
- Rail rows: `model/balance/progression.ts` (`LINE_PLAN`, `INCOME_ROWS`), `model/spawner.model.ts`,
  `model/kit.model.ts`, euros.
- _(ADR-n)_ marks a node that hangs directly off ADR-n; its parent is its only gate.

---

## 1. Skill tree — story points

### The Hand (track A)

| Node                                       | Ranks | Cost                             | Effect                                                          |
| ------------------------------------------ | ----- | -------------------------------- | --------------------------------------------------------------- |
| Click Radius `radius`                      | 3     | 100 / 440 / 1 650                | click radius ×1.25, ×1.28, ×1.22                                |
| Bigger Sprints `capacity`                  | 10    | 120 → 480 000                    | +`SPRINT_SLOTS_STEP` slots per lane a rank                      |
| Platform Team `cans` _(ADR-1)_             | 9     | 1 500 → 3 750 000                | +1 swimlane with its own release train                          |
| Timebox Renegotiated `duration`            | 5     | 80 → 7 000                       | train back `HAUL_SHAVE_PER_RANK` sooner a rank                  |
| Line of Sight `lineOfSight`                | 1     | 600                              | crew claim the nearest ticket                                   |
| Partner-Only Work `golden` _(ADR-1)_       | 1     | 2 000                            | 2 % of arrivals golden                                          |
| Partner Rate `goldenValue`                 | 4     | 2 000 / 9 000 / 38 000 / 160 000 | golden pays +`GOLDEN_VALUE_PER_RANK` a rank                     |
| Delegated Authority `goldenCrew` _(ADR-6)_ | 1     | 400 000                          | every kind takes golden; 5 % of closes and re-files turn golden |

### Juniors (track B)

| Node                                            | Ranks | Cost                      | Effect                                              |
| ----------------------------------------------- | ----- | ------------------------- | --------------------------------------------------- |
| Junior Dev `junior` _(ADR-1)_                   | 1     | 1 200                     | opens the junior rail line                          |
| Onboarding `juniorSpeed`                        | 3     | 1 500 / 4 000 / 10 000    | close ×1.25 / 1.22 / 1.2, walk ×1.2 / 1.18 / 1.15   |
| Hot Desking `juniorReach`                       | 3     | 120 / 450 / 1 500         | sweep ×1.3 / 1.25 / 1.2; rank 2 also junior band +1 |
| Standup Aura `juniorPresence`                   | 2     | 200 / 1 200               | +2 % per junior (cap ×1.5), then +1.5 % (cap ×1.6)  |
| Ticket Stacking `ticketStacking`                | 1     | 700                       | juniors carry +1, close takes ×2                    |
| Bullpen `juniorRoom`                            | 3     | 20 000 / 60 000 / 180 000 | +5 junior seats a rank                              |
| Timesheet Padding `timesheets` _(ADR-2)_        | 1     | 15 000                    | crew and pipeline closes pay double SP              |
| Pizza Party `pizza` _(ADR-5)_                   | 1     | 200 000                   | pizza                                               |
| Stretch Assignment `stretch` _(ADR-5, track G)_ | 1     | 10 000                    | junior band +1                                      |

Bands (`balance/crew.ts`): juniors take tiers 0–4, widened at the top by `juniorBand`; seniors
tier 3 and up; the two share 3–4. Managers re-file any value ticket.

Each room hangs off its kind's speed node and adds `ROOM_SEATS` 5 to its line's rail cap
(`economy.lineCap`). Prices follow the reference's population/unlock ratio (20 000 / 1 200) off
the kind's unlock, ×3 a rank.

### Seniors (track E) — `senior` hangs off ADR-3

| Node                            | Ranks | Cost                        | Effect                                                      |
| ------------------------------- | ----- | --------------------------- | ----------------------------------------------------------- |
| Senior Dev `senior`             | 1     | 6 000                       | opens the senior rail line                                  |
| Senior Onboarding `seniorSpeed` | 3     | 400 / 1 300 / 4 000         | close ×1.22 / 1.2 / 1.18, walk ×1.2 / 1.18 / 1.15           |
| Sweep Radius `seniorReach`      | 3     | 550 / 1 700 / 5 000         | sweep ×1.25 / 1.2 / 1.18                                    |
| Batch Review `seniorPresence`   | 3     | 900 / 2 600 / 7 500         | batch +1, batch +1, then seniors take the top of their band |
| Quiet Corner `seniorRoom`       | 3     | 100 000 / 300 000 / 900 000 | +5 senior seats a rank                                      |

### Account managers (track H) — hangs off `senior`, so it waits for ADR-3 too

| Node                              | Ranks | Cost                  | Effect                                            |
| --------------------------------- | ----- | --------------------- | ------------------------------------------------- |
| Account Manager `manager`         | 1     | 9 000                 | opens the manager rail line                       |
| Account Management `managerSpeed` | 3     | 700 / 2 000 / 6 000   | close ×1.25 / 1.22 / 1.2, walk ×1.2 / 1.18 / 1.15 |
| Scope Creep `relabel`             | 3     | 1 100 / 3 300 / 9 000 | re-file +1 step, filler first, +1 step            |
| Client Lounge `managerRoom`       | 1     | 150 000               | +5 manager seats                                  |

### The Debt (track D)

| Node                                             | Ranks | Cost                | Effect                                         |
| ------------------------------------------------ | ----- | ------------------- | ---------------------------------------------- |
| Technical Debt Interest `debtInterest` _(ADR-2)_ | 3     | 600 / 1 900 / 5 600 | debt interest, `DEBT_INTEREST_PER_RANK` a rank |
| Triage Policy `triagePolicy` (off `junior`)      | 2     | 500 / 1 600         | juniors leave lint, seniors leave bugs         |
| Escalation Chance `spawnEscalation` _(ADR-5)_    | 1     | 8 500               | escalation arrivals ×1.5                       |
| Incident Culture `spawnIncident` _(ADR-6)_       | 1     | 14 000              | incident arrivals ×1.4                         |

### The Client (track C)

| Node                                             | Ranks | Cost                    | Effect                                   |
| ------------------------------------------------ | ----- | ----------------------- | ---------------------------------------- |
| Bug Bounty `valueBug`                            | 1     | 500                     | bug ×2                                   |
| Emergency Rates `escalation`                     | 3     | 1 300 / 4 000 / 12 000  | escalation ×1.4 / 1.3 / 1.25             |
| Incident Payout `valueIncident` _(ADR-6)_        | 1     | 20 000                  | incident ×2                              |
| Hire an Agile Coach `coaches` _(ADR-2)_          | 10    | 600 → 1 950 000         | +1 coach a rank                          |
| Add a 13 `deck`                                  | 10    | 900 → 2 400 000         | vote bonus +`VOTE_BONUS_PER_RANK` a rank |
| Human in the Loop `assurance` _(ADR-6, track G)_ | 3     | 7 000 / 18 000 / 45 000 | everything ×1.15 a rank                  |

### Per line — `LINE_NODES`

The same five nodes on each of the nine lines: lint, legacy, flaky, conflict, slop, rockstar,
zombie, rewrite, swarm. `value…` hangs off the line's ADR (lint off `client`). First-rank costs
double a line (`perTier`) unless stated.

| Node         | Ranks | First cost, lint                                      | Rank step | Effect                                 |
| ------------ | ----- | ----------------------------------------------------- | --------- | -------------------------------------- |
| `value…`     | 1     | `LINE_DOUBLE_COST`: 25, 1 500, 3 000, 6 000 … 140 000 | —         | ticket ×2                              |
| `spawn…`     | 5     | 2 200                                                 | ×1.25     | arrivals +20 % a rank, ×2 maxed        |
| `income…`    | 5     | 1 100                                                 | ×1.25     | pay +50 % a rank, ×3.5 maxed           |
| `estimates…` | 5     | 75, then 400 from legacy                              | ×1.5      | +`ESTIMATE_SP_PER_RANK` 20 SP a ticket |
| `double…`    | 1     | 2 500                                                 | —         | ticket ×2; needs the three above maxed |

### ADR ladder (track N)

Approve ADR-1 … ADR-8 (`adr1`…`adr8`), chained. Each opens its spawner line and the ticket type
it drops. Costs are `DEBT_TIERS[].spCost` in `model/tier.model.ts`.

### The Floor (track O)

| Node                   | Cost    | Effect                  |
| ---------------------- | ------- | ----------------------- |
| Bullpen Extension `o1` | 80      | none — a floor plate    |
| Meeting Room `o2`      | 380     | +14 slots               |
| Break Room `o3`        | 1 000   | junior walk ×1.2        |
| Server Room `o4`       | 3 750   | none — a floor plate    |
| War Room `o5`          | 15 000  | senior sweep ×1.2       |
| Records Store `o6`     | 50 000  | everything ×1.05        |
| Corner Office `o7`     | 175 000 | escalation ×1.25        |
| Standing Desks `kit`   | 400     | opens the kit rail line |

### End

Sign the Closeout `signoff` _(ADR-8)_, 800 000 — ends the run. `root` ships bought;
`secret` (everything ×1.1) is granted, not bought.

---

## 2. Rail — euros

### Debt tab — spawner lines (`model/spawner.model.ts`)

Cap `SPAWNER_CAP` 50 heads a line, each head ×`SPAWNER_COST_STEP` (1.15) dearer.

| ADR | Throws    | First head    |
| --- | --------- | ------------- |
| 0   | lint, bug | 2             |
| 1   | legacy    | 500           |
| 2   | flaky     | 15 000        |
| 3   | conflict  | 87 500        |
| 4   | slop      | 500 000       |
| 5   | rockstar  | 3 500 000     |
| 6   | zombie    | 27 500 000    |
| 7   | rewrite   | 240 000 000   |
| 8   | swarm     | 2 250 000 000 |

### Rates tab — income rows (`INCOME_ROWS`)

Flat pay per ticket, before multipliers. `INCOME_CAP` 10 ranks, ×`INCOME_COST_STEP` (1.65) a
rank. Lint starts at 250 for +3; each line after is ×5 the price and +1 the increment.

### Crew tab (`LINE_PLAN`)

×`LINE_COST_STEP` (1.15) a purchase.

| Row                 | First  | Starting cap           | Raised by                 |
| ------------------- | ------ | ---------------------- | ------------------------- |
| Velocity `velocity` | 25     | 1, open from the start | — the SP source           |
| Junior `junior`     | 1 000  | 10                     | Bullpen, +5 ×3            |
| Senior `senior`     | 1 200  | 10                     | Quiet Corner, +5 ×3       |
| Manager `manager`   | 28 000 | 5                      | Client Lounge, +5         |
| Kit `kit`           | 400    | 6                      | — one per `KIT_PLAN` item |

Kit items, in order (`model/kit.model.ts`):

| Item          | Cost      | Effect           |
| ------------- | --------- | ---------------- |
| Monitor       | 3 000     | lint ×1.8        |
| Standing Desk | 12 000    | everything ×1.03 |
| Keyboard      | 45 000    | bug ×1.6         |
| IDE Licence   | 160 000   | legacy ×1.6      |
| CI Tier       | 550 000   | flaky ×1.7       |
| Observability | 1 900 000 | escalation ×1.25 |

---

## 3. Overlaps

Where two purchases do the same thing, or a name is used twice.

| What                  | Where                                                               |
| --------------------- | ------------------------------------------------------------------- |
| Junior band +1, twice | `juniorReach` rank 2 and `stretch`                                  |
| Junior walk           | `juniorSpeed` and `o3`                                              |
| Senior sweep          | `seniorReach` and `o5`                                              |
| Escalation ×1.25      | `o7` and the Observability kit item                                 |
| No effect             | `o1`, `o4`; `triagePolicy` rank 2 (seniors never take bugs, tier 0) |
| "Human in the Loop"   | `assurance` and `doubleSwarm`                                       |
| "Bullpen"             | `juniorRoom` and "Bullpen Extension" `o1`                           |
| "Standing Desk(s)"    | the `kit` line and its second item                                  |

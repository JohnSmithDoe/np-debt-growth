# Debt Growth vs Garbage Growth — feature by feature

An honest audit, September 2026, after the rework on `feature/garbage-growth-rework`
and the parity pass that closed it.

**Legend:** ✅ match · 🟡 partial · ❌ missing

**How this was checked.** Garbage Growth: 18 screenshots and Martin's play notes. Debt
Growth: read out of `src/`, asserted in specs, **and driven in the running app** — a
Playwright session that clicks the title screen, sweeps the board by hand, approves all
eight ADRs, buys heads on every line, walks the three shop tabs, fills the can, and opens
the tree. Each row below says which of those three it rests on. I have not played the
reference.

---

## 1. Structure

| # | Garbage Growth | Debt Growth | |
|---|---|---|---|
| 1 | One continuous board, no rounds | Same — timer and phases gone | ✅ |
| 2 | One skill tree on its own screen | Same | ✅ |
| 3 | No review or interstitial screen | Deleted | ✅ |
| 4 | The clock never stops | Never stops | ✅ |

## 2. The verb

| # | Garbage Growth | Debt Growth | |
|---|---|---|---|
| 5 | Hover a radius, area-of-effect | Same, swept once a frame | ✅ |
| 6 | Collection is instant, no per-item delay | Same | ✅ |
| 7 | Litter animates into the can | Tickets fly to the sprint strip (`FLIGHT.harvest`) | ✅ |
| 8 | A `$n` floats off each item | Same | ✅ |
| 9 | Money paid at pickup | Same — the invoice chain is gone | ✅ |

## 3. The can, and the truck

| # | Garbage Growth | Debt Growth | |
|---|---|---|---|
| 10 | Hard cap; nothing collects when full | Same | ✅ |
| 11 | **Blocked litter jumps in place** | Same — `harvest` returns `refused`, `TicketHeap.bounce` hops them where they lie (`REFUSAL_BOUNCE`) | ✅ |
| 12 | A truck empties it, and that wait is the cadence | Same, 4 s, floored at 2.5 s | ✅ |
| 13 | **"More cans" doubles capacity** | `cans`, three ranks, ×2 each | ✅ |
| 14 | "More slots" adds capacity | `slots` is additive: `+6 +8 +10 +14 +18` | ✅ |

## 4. The field

| # | Garbage Growth | Debt Growth | |
|---|---|---|---|
| 15 | Litter accumulates and is never wiped | Same — `emptyBoard()` at round start is gone | ✅ |
| 16 | The field becomes visibly dense (~80 items) | Reaches `BOARD_CAPACITY` late — wall to wall | ✅ |
| 17 | Background flowers, not collectible | `FLOOR_SCATTER` — a second, untinted tile layer that is drawn and never in the board model, so the sweep cannot reach it | ✅ |

## 5. Spawners — the content engine

| # | Garbage Growth | Debt Growth | |
|---|---|---|---|
| 18 | A lane of actors above the field | One band across the top, every line's actors mixed into it | ✅ |
| 19 | **Buying more puts visibly more of them on the path** | One walker per head bought, capped at `LANE.perLine` — a crowd by mid-run | ✅ |
| 20 | Each line capped at 50 | Same | ✅ |
| 21 | ≈1.15× per level | Same, taken from your `Hund` numbers | ✅ |
| 22 | A new litter type arrives with a new creature | Nine actors, one per ADR; ADR-0 got its own (`drawIntern`) | ✅ |
| 23 | **A tree node unlocks the spawner and its litter** | `adr1`…`adr8` are tree nodes bought with SP; the node sets the rung, which opens the line and the ticket together. The ADR panel is a shortcut to the same purchase, not a second one | ✅ |

## 6. The rail

| # | Garbage Growth | Debt Growth | |
|---|---|---|---|
| 24 | **Three tabs** (Pollution / Upgrades / Workers) | Debt / Rates / Crew | ✅ |
| 25 | **Per-litter income upgrades, capped at 10** | `state.income` per ticket, `0/10`, +30 % a rank, priced off its spawner | ✅ |
| 26 | A worker hire line | Crew tab, one row per line | ✅ |
| 27 | `n/max` counters on every row | Same, all three tabs | ✅ |
| 28 | Plain-words effect tooltip per row | Every row in every tab carries one | ✅ |
| 29 | Bought live, mid-play, nothing pauses | Same | ✅ |

## 7. The workers

| # | Garbage Growth | Debt Growth | |
|---|---|---|---|
| 30 | Autonomous wander, nearest-first | Same (pre-existing crew AI, plus bands and traits we add) | ✅ |
| 31 | Pick up and deposit instantly, then recover | Same | ✅ |
| 32 | **Cannot take golden** | Same, and the `takesRares` hole is closed | ✅ |
| 33 | A later upgrade lets them | `goldenCrew` node | ✅ |
| 34 | Capacity via a `+5` tree node | `headcount`, five ranks of `+5` desks, additive — `OFFICE_PLAN` no longer seats anyone | ✅ |

## 8. Golden

| # | Garbage Growth | Debt Growth | |
|---|---|---|---|
| 35 | Rolls on any arrival | Same | ✅ |
| 36 | ~2 %, bought as a node | Same, `+2 %` per rank, capped | ✅ |
| 37 | Worth ~100× | `GOLDEN_VALUE_BASE` 100 | ✅ |
| 38 | A multiplier ladder above it | `goldenValue`, four ranks | ✅ |
| 39 | Reads instantly on a busy field | Own gold card frame in the atlas | ✅ |

## 9. Currencies

| # | Garbage Growth | Debt Growth | |
|---|---|---|---|
| 40 | Two currencies | € and SP | ✅ |
| 41 | Money per pickup | Same | ✅ |
| 42 | Gum by routing value into it | Velocity skim | ✅ |
| 43 | Rail spends money, tree spends gum | Same — the tree is SP-only, ADRs included | ✅ |

## 10. The tree

| # | Garbage Growth | Debt Growth | |
|---|---|---|---|
| 44 | Mostly padlocked, all of it visible | Same, painted owned/open/locked | ✅ |
| 45 | `n/m` capped nodes | Same | ✅ |
| 46 | **`+` and `%` badges telling additive from multiplicative** | `skillBadge` reads the next rank's effects and stamps one in the corner | ✅ |
| 47 | Tree unlocks a line, rail sells the heads | Same | ✅ |

## 11. The run

| # | Garbage Growth | Debt Growth | |
|---|---|---|---|
| 48 | ~1 hour to finish | 67.1 min to sign-off, ADR-8 at 60.7, and both asserted | ✅ |
| 49 | Ends by buying the final upgrade | `signoff` | ✅ |
| 50 | No prestige | None | ✅ |
| 51 | **Offline progress** | A bounded 4 h window at 40 % of measured throughput, estimated rather than simulated | ✅ |
| 52 | **New areas (park → moon)** | One board — see *Accepted divergence* | ❌ |
| 53 | Numbers get ridiculous late, as any incremental does | Same | ✅ |
| 54 | Achievements | Present (pre-existing) | ✅ |

---

## Tally

**53 ✅ · 0 🟡 · 1 ❌** across 54 rows.

The previous revision of this file totted up its own table wrong (it said 33/10/11
against a table holding 39/7/8). The fifteen rows it listed as open were right; the sum
was not.

## Accepted divergence

**Row 52 — new areas.** Martin's call: out of scope. The reference's park → moon is a
content feature, not a mechanic, and our analogue (a second client, a second engagement)
needs a design decision nobody has taken. Recorded here so it stops reading as an
oversight.

## What each row rests on

- **Played in the running app:** 5–12, 15–19, 22–29, 44–47, 51. A Playwright session
  drives the real build; the screenshots show the crowd on the path, the three tabs, the
  saturated field, the badges on the squares, and a two-hour gap paid out on resume.
- **Asserted in specs:** 10, 11, 13, 14, 23, 25, 31–34, 48–50. `economy.spec.ts` covers
  the two capacity axes and the rates tab, `game.store.spec.ts` the refusal report and
  the ADR chain, `save.service.spec.ts` the offline window and its cap,
  `balance.spec.ts` the whole clock.
- **Read out of the source only:** 1–4, 20, 21, 30, 35–43, 53, 54 — mechanisms that were
  already in place before this pass and have specs of their own.

## What changed the economy

Moving the ADR ladder onto the tree (row 23) moved its cost from euros to story points,
which took the euro curve's main sink away. The rates tab (row 25) replaced it: once
every line has capped at 50, per-ticket income is the only thing left to buy, and it is
what keeps the late game compounding instead of flat. `balance.spec.ts` now asserts the
run reaches **sign-off** — the purchase that ends it — inside 35–100 minutes, that the
last five rungs sit more than two minutes apart, and that nothing is left unbought.

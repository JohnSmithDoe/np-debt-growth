# Debt Growth vs Garbage Growth — feature by feature

An honest audit, September 2026, after the rework on `feature/garbage-growth-rework`.

**Legend:** ✅ match · 🟡 partial · ❌ missing

**How this was checked.** Garbage Growth: 18 screenshots and Martin's play notes. Debt
Growth: read out of `src/`, plus the pacing instruments in `balance.spec.ts`. I have not
played the reference, and until this audit I had not properly played our own build either —
which is how the tree and the ADR buy button shipped unreachable. Anything below marked
✅ on *feel* rather than mechanism is the weakest claim in the table.

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
| 11 | **Blocked litter jumps in place** | The cursor ring turns red. Individual tickets do **not** bounce | 🟡 |
| 12 | A truck empties it, and that wait is the cadence | Same, 4 s, floored at 2.5 s | ✅ |
| 13 | **"More cans" doubles capacity** | No second axis — only a `slots` multiplier | ❌ |
| 14 | "More slots" adds capacity | `slots` is multiplicative, not additive | 🟡 |

## 4. The field

| # | Garbage Growth | Debt Growth | |
|---|---|---|---|
| 15 | Litter accumulates and is never wiped | Same — `emptyBoard()` at round start is gone | ✅ |
| 16 | The field becomes visibly dense (~80 items) | Reaches ~81 in 2 min at ADR-0, and grows with spawners | ✅ |
| 17 | Background flowers, not collectible | We have a floor, not scatter dressing | 🟡 |

## 5. Spawners — the content engine

| # | Garbage Growth | Debt Growth | |
|---|---|---|---|
| 18 | A lane of actors above the field | `TierSpawners` walkers exist, one per ADR | 🟡 |
| 19 | **Buying more puts visibly more of them on the path** | The lane shows **one walker per ADR**, not the 50 you bought | ❌ |
| 20 | Each line capped at 50 | Same | ✅ |
| 21 | ≈1.15× per level | Same, taken from your `Hund` numbers | ✅ |
| 22 | A new litter type arrives with a new creature | One walker per ADR, tied to the ticket it emits | 🟡 |
| 23 | **A tree node unlocks the spawner and its litter** | Still gated by `state.tier` — you buy the ADR, not a node | ❌ |

## 6. The rail

| # | Garbage Growth | Debt Growth | |
|---|---|---|---|
| 24 | **Three tabs** (Pollution / Upgrades / Workers) | **Two** — Pollution and Crew | ❌ |
| 25 | **Per-litter income upgrades, capped at 10** | None | ❌ |
| 26 | A worker hire line | Crew tab, one row per line | ✅ |
| 27 | `n/max` counters on every row | Same | ✅ |
| 28 | Plain-words effect tooltip per row | Spawners have blurbs; crew rows do not | 🟡 |
| 29 | Bought live, mid-play, nothing pauses | Same | ✅ |

## 7. The workers

| # | Garbage Growth | Debt Growth | |
|---|---|---|---|
| 30 | Autonomous wander, nearest-first | Same (pre-existing crew AI, plus bands and traits we add) | ✅ |
| 31 | Pick up and deposit instantly, then recover | Same — changed in this rework | ✅ |
| 32 | **Cannot take golden** | Same, and the `takesRares` hole is closed | ✅ |
| 33 | A later upgrade lets them | `goldenCrew` node | ✅ |
| 34 | Capacity via a `+5` tree node | Office plates → desks, multiplicative not `+5` | 🟡 |

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
| 43 | Rail spends money, tree spends gum | Same — tree is SP-only now | ✅ |

## 10. The tree

| # | Garbage Growth | Debt Growth | |
|---|---|---|---|
| 44 | Mostly padlocked, all of it visible | Same, painted owned/open/locked | ✅ |
| 45 | `n/m` capped nodes | Same | ✅ |
| 46 | **`+` and `%` badges telling additive from multiplicative** | No badges | ❌ |
| 47 | Tree unlocks a line, rail sells the heads | Same — changed in this rework | ✅ |

## 11. The run

| # | Garbage Growth | Debt Growth | |
|---|---|---|---|
| 48 | ~1 hour to finish | 66.6 min measured, and now asserted | ✅ |
| 49 | Ends by buying the final upgrade | `signoff` | ✅ |
| 50 | No prestige | None | ✅ |
| 51 | **Offline progress** | None — `MAX_CATCHUP_MS` is 5 s. A deliberate divergence you chose | ❌ |
| 52 | **New areas (park → moon)** | One board | ❌ |
| 53 | Numbers get ridiculous late, as any incremental does | Same — ours reach `3.4e8` | ✅ |
| 54 | Achievements | Present (pre-existing) | ✅ |

---

## Tally

**33 ✅ · 10 🟡 · 11 ❌** across 54 rows.

The loop, the verb, the can, the two currencies, the golden mechanic and the worker pacing
match. What does not is mostly **surface and content**, and it is the part a player sees
first:

1. **The lane does not grow** (#19). In the reference the crowd on the path *is* the
   receipt for everything you have bought. Ours shows one walker per ADR however many you
   own, so the single most legible feedback in the reference is absent.
2. **Two tabs, no income upgrades** (#24, #25). A third of the reference's shop is missing.
3. **ADR unlocks are not tree nodes** (#23). The contract in
   `rework-garbage-growth.md` §4 says they should be; they are still a separate purchase.
4. **No `+`/`%` badges** (#46) and **no per-row crew tooltips** (#28) — the reference is
   readable at a glance; ours needs a click.
5. **Blocked work does not bounce** (#11). The ring turning red is a weaker signal than the
   thing you are trying to grab refusing to move.

## What I got wrong

I reported the rework "finished" on the strength of a green suite, a clean build and a
screenshot of the first twenty seconds. None of those can catch a deleted button. Deleting
the sprint-review screen took the only "Open the tree" control and the only ADR buy panel
with it, so the tree was unreachable, ADRs were unbuyable, the run was pinned at ADR-0's
single spawner — which is why the board looked dead — and the Crew tab was empty because
every line was still locked and locked lines were hidden.

Those four are fixed. The eleven ❌ rows above are not, and none of them were ever claimed
as done in `rework-garbage-growth.md` §9 — but I let "all six stages are in" stand as if it
meant parity, and it did not.

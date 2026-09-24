# Handoff — what is open after parity

Written September 2026, on `feature/garbage-growth-rework`, after the rework
(`rework-garbage-growth.md` §9 stages 1–6) and the parity pass (stage 7) that
closed every row of `comparrison.md` bar one.

**The game is finished in the sense that it can be played end to end**: a run
reaches sign-off in 67 minutes, every node on the tree gets bought, and the
measurement that says so is a failing test rather than a printout. What is below
is what a next session could take on, ranked by what it buys.

Read first: `docs/gamedesign.md` (the design as the code has it), then
`CLAUDE.md`. `docs/comparrison.md` is the reference audit if parity comes up
again.

---

## Read this before anything else

Three things cost this project real time. They are all cheap to avoid.

1. **A green suite proves nothing about reachability.** A previous pass shipped
   with the skill tree unreachable and ADRs unbuyable, on a green suite, a clean
   build and a screenshot of the first twenty seconds. This pass hit the same
   class of bug twice — the ADR panel silently did nothing because the free
   `root` node was unbought, and the rail's tab labels rendered as raw i18n keys
   because they were resolved in a field initialiser before the catalogue loaded.
   **Neither is visible to a test.** Drive the running app.
2. **Playwright through `globalThis.debtGrowth` covers a whole run in under a
   minute.** `grant(5e9, 5e7)`, click through the ADR modal eight times, click
   every enabled `.line` in the rail a dozen times, walk the three tabs, sweep
   the bottom rows with `mouse.move` (litter stacks from the floor up — sweeping
   the middle of the board finds nothing early on), then open the tree.
3. **After any economy change, re-run the pacing instruments**, not just the
   suite:
   ```bash
   CB_CLOCK=1 CB_LADDER=1 CB_SHARE=1 CB_INCOME=1 \
     pnpm vitest run src/app/game/data/balance.spec.ts
   ```
   It asserts 35–100 minutes to sign-off, a two-minute floor on the last five
   rungs, and an empty tree at the end. The reports print the clock, the ladder,
   the euro and SP curves, and the crew's share.

Gates: `pnpm typecheck`, `pnpm lint`, `pnpm verify`, `pnpm test`, `pnpm build`,
`pnpm check:viewport` (needs `pnpm start`), `pnpm check:art`, `pnpm rust:check`.
All green as of this writing.

---

## 0. Feel pass — from playing the reference

`comparrison.md` matched the parts list: 53/54 rows. Martin played both, and they
don't feel the same. These tasks come from his play, not from screenshots, so they
rank above everything below. Numbers marked *ref* are his observations.

| # | Observed in Garbage Growth | Ours now | Task |
|---|---|---|---|
| F1 | Animations are slower and softer. A collected item **jumps high into the air, then drops into the can** | `HARVEST_MS` 460 with a 44 px arc; `FALL_MS` 460 (`stage/model/board.consts.ts`, `#leave` in `board-scene.ts`) | Lengthen the harvest flight into a tall hop and a fall into the slot; soften the landing |
| F7 | **Litter vanishes about 15 s after it lands**, so the field is never full. Live litter settles at rate × 15 s | Tickets never expire; the board climbs to `BOARD_CAPACITY` 600 | Give every ticket a lifetime and fade it out when it ends. A missed ticket is lost money: that is the urgency, and it's what crew are for. **Theme, per Martin: an expired ticket is closed as "won't fix"**: the debt stays, just out of sight. CLAUDE.md's "the board is never wiped — the point of the title" must be rewritten with it |
| F9 | **Gum is big and paid per pickup.** After gum is unlocked, a $1 item gives 1 gum. Per-litter nodes, **5 ranks of "+2 gum" per litter type**, push it hard. Late run: 18 103M gum | SP comes from the copilot crew plus the velocity skim, `payout × skim(≤0.35) × VELOCITY_SP_PER_EURO 0.0006` (`economy.ts` `velocityStoryPoints`). Best case €1 → 0.0002 SP. Velocity is a €25 000 rail row from tier 2 | Replace the skim with per-ticket SP at pickup: 1:1 with the € value on unlock, plus a `+2 SP` node per ticket type, 5 ranks, additive. Float the SP beside the €. Rescale every tree cost to match (the reference's gorilla unlock is 600 000 gum). **Gum is switched on by a rail purchase, the first "expensive" one at $25** (Martin). Ours: `velocity` is a €25 000 rail row gated at tier 2. Make the SP unlock a cheap, early rail row. That also removes the reason the first copilot ships with the run (it exists only because nothing else produced SP), so the bootstrap copilot can go |
| F8 | One opening spawner drops about **1 ticket per 4 s** (2–3 on the field before the first expires) | One ADR-0 head: `lint` 0.6/s + `bug` 0.28/s after 90 s. That's 1 per 1.1–1.7 s | Drop the per-head `ratePerSec` about 3× at the opening. That also covers F4 |
| F2 | **Trash can be caught mid-flight**, which feels good | A falling ticket is hidden until it lands (`heap.reveal` on `FLIGHT.drop` arrival). `#sweep` → `pickWithin` checks its *landing* spot, so for 460 ms you can collect an invisible card there, but not the visible one in the air | Sweep `FLIGHT.drop` flyers at their current position, harvest them, and cancel their landing. Stop the invisible landing-spot pick |
| F3 | First spawner free, second costs *ref* 2 | ADR-0: first head free, then `cost: 4 × 1.15^n` (`game/model/spawner.model.ts`) | Opening price to 2 |
| F4 | You wait longer before you can afford anything | Early purchases come quickly | Slow early income so the first buys are waited for; cheaper prices (F3) and slower income together |
| F5 | A can holds *ref* **100**; **10 × "+25 capacity"**, per can, so 350 each and 3 500 across 10 cans | `SPRINT_SLOTS_BASE` 14 in `game/model/balance/round.ts`; Martin saw **8** in the running build (not yet explained) | Find out why the build shows 8. Base 100; `slots` becomes 10 flat ranks of `+25`, replacing `+6…+18` |
| F10 | **Cans are physical and plural, each with its own truck.** Items go round-robin (Martin's best read) into the next can with room; a can being hauled is skipped, and the others keep taking. Collection is refused only when every can is full or out. You start with **1 can** and buy **9 more** (10 max) | One can, one abstract bar (`sprint-strip.ts`). `sprintCount` is a single number, `cans` a hidden `×2` on `sprintSlots`, and one haul blocks everything (`phase: 'hauling'`) | Make the can a list: per-can fill and haul timer, round-robin with skip. A `cans` rank adds a can instead of doubling, 9 ranks. `sprintRoom`, the haul ceiling and `unattendedEuroPerSec` sum over cans. The strip becomes a row of cans (theme: see below) |
| F11 | **Gum angels:** figures on the lane edge fire pulsing beams, and litter crossing a live beam pays more gum. **Additive**, and **normal litter only** (not golden): each beam hit adds **+30 gum**, and an item collects it **once per beam** it crosses. Two **tree nodes, bought with gum**: `Kaugummi-Engel rufen` 10/10 (+1 angel, `+` badge) and `Kaugummi-Engel-Laser` 10/10 (+15 per hit, `↑` badge), so +180 per hit at max (`image-staging/reference/gg-node-angel*.png`) | Nothing; value is fixed at spawn | A beam zone between lane and field, pulsing on a timer; a non-golden ticket crossing a live beam gains a flat SP bonus per beam (+30, +15 per strength rank). Both are SP tree nodes, not rail rows. Theme: **planning poker**, below |
| F6 | Early on you don't know the can has a limit | The cap is felt at once | Follows from F4 + F5: the opening shouldn't reach the cap. Whether the strip should also stay quiet until the can nears full is an open question |

### Status, 23 September 2026

| # | State |
|---|---|
| F1 | **Done** (`5756587`). `HARVEST_MS` 1 100, `HARVEST_HOP` 150, peak at a quarter of the flight, smoothstep into the slot; `FALL_MS` 700 |
| F2 | **Done** (`5756587`). `FlyerPool.fallingWithin` / `catch`; the landing-spot pick and hover skip anything still falling |
| F7 | **Done** (`5756587`). `TICKET_LIFE_MS` 15 s, `expireTickets`, fades via `FLIGHT.fade`. Hand-only rares exempt; claimed cards hold their clock |
| F3 | **Done** (`176b4b1`). ADR-0 `cost` 2, and the free head no longer raises the price, so the first paid head is exactly 2 |
| F8 | **Done** (`176b4b1`). `lint` 0.18/s, `bug` 0.08/s (≈ 1 per 4 s from one head) |
| F5 | **Done** (`176b4b1`). `SPRINT_SLOTS_BASE` 100, `o2` +14. The `slots` ranks stay at +6…+18: scaling them ×7 took sign-off to 47 min. **Why the build showed 8 is still unexplained**: the base has been 14 since the first commit, and only weather shrinks it |
| F4, F6 | Follow from F8 + F5: first junior at 8.9 min (was 3.1), and the opening never meets the cap |
| golden | **Done** (`c6bd2cf`). Gate `tier1`; `goldenValue` +50× a rank, additive (100× → 300×); `goldenCrew` turns 5 % of crew closes golden |
| auto-close | **Resolved** (`c6bd2cf`). The pipeline is a throughput: `runners` node, `AUTO_RUNNERS_BASE` 4, ~1 close/s each. The crew-share floors count crew + pipeline as one automation share, like the reference's rats |
| F9 | **Done** (`c6bd2cf`). SP at pickup off the ticket's *base* value (income ranks lift € only, so SP falls behind late, as gum does), once the €25 `velocity` row is bought; skim gone. Tree SP prices are written as charged; a ×10 `SKILL_COST_SCALE` briefly hid them and made the ADR panel disagree with the tree (`9542494`, then removed). `estimates` (+2 SP a ticket, 5 ranks), `timesheets` (crew/pipeline SP ×2). The bootstrap copilot still ships; it's now redundant |
| F10 | **Done** (`c6bd2cf`). Lanes round-robin with their own release train; `cans` +1 lane (9 ranks), `capacity` WIP +25 (10 ranks). The strip draws the lanes and a train crossing each one that's away. `SAVE_VERSION` 4 |
| prices | **Done** (`5ad5d25`). Spawner bases 2 / 500 / 15 000 …; ADR-1…5 at 75 / 2 500 / 12 000 / 40 000 / 150 000 SP; `headcount` behind `juniorSpeed` |
| F11 | **Done** (`c502100`). `coaches` / `deck`, 10 ranks each; `voteBonus` decided at spawn, `voteLive` drawn by `stage/scene/vote-beams.ts`. Sweeps float their SP |
| F12 | **Done** (`701d0f4`). `pizza` node from ADR-5; hand-only voucher; ×5 crew in a 240-unit circle for 12 s |

**Pacing now** (reference prices where a node has a twin: radius 110, ADR-1 750, golden
2 000, golden ×50 2 000, ADR-2 10 000, rat/junior unlock 1 200, rat speed 1 500, population
20 000, slimy/timesheets 15 000, gorilla/ADR-3 600 000): ADR-1 7.2 min, first junior 8.2,
ADR-2 11.6, ADR-3 17.9, ADR-8 55.8, **sign-off 64.3**, tree bought out.

**Still open from this pass**
- `CLAUDE.md` still says "the velocity skim is the only bridge" and describes one can and a
  truck. Not edited here because another session had uncommitted changes in it.
- The coaches, the train and the pizza circle are canvas-drawn placeholders; art pass owed.
- The first copilot shipping free is now redundant with the €25 SP row.
- The playtest scripts live in `image-staging/playtest/` (gitignored), driven through the
  new `debtGrowth.buySkill` / `buyLine` doors.

**Was open: automation takes the money mid-run** (resolved, see the status table). With a 100-slot can the truck rarely gates, and
auto-close files nearly everything within 3 s: automation is 90–95 % of the money from
minute 20 to 35 (crew share floor still passes). Sign-off is 48.6 min. `leaves an attentive
player ahead of an idle one` now passes or fails on `Math.random` (margin about 2 %). The
hand stops mattering mid-run. That needs a design call: bind auto-close to something
(its own cap, or the haul), or accept it.

**The reference says accept it.** Martin, from play: **25 rats**, fully upgraded, clear
**80 % or more** of the board, each at about **1 item/s**. Automation dominating normal
litter is the reference's design, not a bug in ours. What keeps the hand in play there
is the class the rats refuse: golden, at 2 % × 100×, is **worth twice all normal litter
combined**, so a player sweeping only gold out-earns 25 rats until `goldenCrew` is
bought. Proposed:

- Accept that crew clear most normal tickets; don't cap auto-close to protect the hand.
- Re-aim `leaves an attentive player ahead of an idle one` at golden: the margin
  should come from gold the crew can't take, and be large, not 2 % on a coin toss.
- If it still fails, the lever is golden's reach (chance, value, when its node
  arrives), not throttling the crew.
- **The rat branch, from the tree** (`image-staging/reference/gg-node-rat-*.png`,
  `gg-node-slimy-rat.png`). The rats are separate purchases, not one dual-currency price:

  | Node | Rank | Cost | Effect | Badge |
  |---|---|---|---|---|
  | `Ratte freischalten` | 1/1 | gum (Martin recalls ~1 200) | Unlocks rat workers | `+` |
  | `Arbeitergeschwindigkeit` | 0/5 | 1 500 gum | Rat speed +10 % | `↑` |
  | `Rattenpopulation` | 0/3 | 20 000 gum | +5 rat capacity | `+` |
  | `Schleimige Ratte` | 0/1 | 15 000 gum | Litter rats collect pays **gum ×2** | `+` |
  | `Ratte anheuern` (rail) | 10 | $1 000 upward | Hire one rat | — |

  **Order, per Martin: unlock → improve → raise the cap.** The population node sits
  *behind* the improvements. Ours doesn't: `headcount` `requires: 'junior'`, a sibling
  of `juniorSpeed`, with rank 1 at 30 SP, so the cap is open from the first minute.
  Move it behind an improvement node.

  Rail cap 10 + 3 × 5 = **25 rats**.

- **Golden comes early** (`image-staging/reference/gg-tree-golden-path.png`). Path:
  radius (110 gum, `↑`) → the first new spawner, the ADR-1 analogue (750 gum, `+`) →
  `Goldene Verschmutzung` (2 000 gum, 0/1, "+2 %: litter turns GOLDEN, 100× value, rats
  don't pick it up"). About 2 860 gum in all, a few minutes at 1 gum per $1. Ours:
  `golden` `requires: 'radius'`, **`gate: 'tier2'`**, 90 SP. One ADR later than the
  reference. Move the gate to `tier1`.
- **The golden chain after it** (`gg-node-golden-mult.png`, `gg-node-bike.png`,
  `gg-node-golden-rat.png`):

  | Node | Rank | Cost | Effect | Ours |
  |---|---|---|---|---|
  | `Glänzenderer Goldmüll` | 0/4 | 2 000 gum (rank 1) | Golden multiplier **+50×** a rank: 100× → 300×, **additive** | `goldenValue` ×1.5 a rank, compounding: 100× → 506× |
  | `Fahrrad freischalten` | 0/1 | 10 000 gum | Unlocks bikes and babies (the ADR-2 analogue) | `adr2` |
  | *(gorilla, the ADR-3 analogue)* | 1/1 | 600 000 gum | Unlocks gorillas and bananas | `adr3` |
  | `Goldene Ratte` | 1/1 | — | Rats become golden: they **take golden litter, and 5 % of what they collect turns golden** | `goldenCrew` lifts the exemption only; **no 5 % conversion** |

  **Martin: the golden rat is late game**, behind the bike and gorilla nodes. Our
  `goldenCrew` at `gate: 'tier6'` is late too, so keep it late. Match by *position in
  the run*, not by ADR number: we have nine lines, and the reference's full count isn't
  known yet. Two tasks: make `goldenValue` additive (+50× a rank), and give
  `goldenCrew` the 5 % conversion, so that buying it turns the crew into a gold source
  rather than just taking the player's.

  **After the golden rat the cursor only speeds things up a bit** (Martin). That's the
  reference's late game: the hand goes from essential (sweeping gold) to a bonus. So
  the attentive-beats-idle assertion should hold **up to `goldenCrew`**, with a wide
  margin. After it, a small margin is the design, not a regression.

- **The park ends at the gorilla** (Martin). After the gorilla and the golden rat
  there is little left to do; the reference thins out and moves to a second screen
  (the areas, `comparrison.md` row 52). So the reference's first area has about four
  lines (people, dog, bike, gorilla) against our nine. **ADR-4…8 have no reference
  counterpart**: they're our own late game, tuned by our own feel. Areas stay
  deferred until we get there.
- **What Martin played is the demo.** It ends at the gorilla; the Discord and
  `Wunschliste` (wishlist) buttons in the late-game shot are the demo's. Everything in
  this section describes the demo, not the full game.
- **The demo teases a Chad** (`gg-node-chad.png`, a wishlist-only node): a spawner
  whose rare litter is a *super job application*. **When the player picks one up,
  nearby rats get +500 % efficiency for a while.** A rare, player-triggered, local,
  timed crew buff: the cursor's late-game reason to exist, after the golden rat.
  **F12, theme decided: the engineering manager, who drops pizza-party vouchers**: sweep one and the crew around it work 5× faster
  until the pizza's gone.
- **The full game, beyond the demo.** From an AI summary Martin pasted, checked against
  the Steam forum ([thread](https://steamcommunity.com/app/4680930/discussions/0/571541539431678612/),
  [index](https://steamcommunity.com/app/4680930/discussions/)), September 2026:

  | Claim | Status |
  |---|---|
  | Demo beaten in about **30 min**; full 1.0 with all achievements in **57–70 min** | **Confirmed** (thread) |
  | Gorilla unlock 600K; the first ~25 gorillas are very cheap, banana upgrades far cheaper than the unlock | **Confirmed** (thread). The currency is **gum**, per Martin's screenshot; the summary's "$" is wrong |
  | Chad, a hidden skill, and a Titanic spawn exist in the full game | Thread titles only |
  | A second area, the sea, with its own collectors and a golden whale | Plausible (Titanic), unconfirmed |
  | Tanks, dying dogs, police, "this guy" as a cash wall, $10M ending | **Unconfirmed**, and partly contradicted: the demo alone shows $4 000B |
  | Dogs from ~$500 | **Confirmed** (Martin): the line's base price. The next head costs **574**, i.e. 500 × 1.15 rounded down, and it matches $2 326 at 11/50, since 500 × 1.15¹¹ ≈ 2 325. **The 1.15 step is confirmed from the first level** |
  | Bikes from ~$3 500 on the rail | **Wrong**: **$15 000** (Martin, and `rework-garbage-growth.md` §2.5's `Fahrrad hinzufügen 0/50 $15 000`) |
  | Rats from ~$10, golden fixed at 100× | **Wrong**: Martin saw rats $1 000, golden +50× × 4 |

  **Spawner base prices are far apart.** On the rail: people free → 2, dogs **500**,
  bikes **15 000**: ×250, then ×30. Ours: ADR-0 2, ADR-1 32, ADR-2 160: ×16, then
  ×5, and roughly 5–9× a rung after (`spawner.model.ts`). The reference makes each
  new line a long save; ours come quickly. That fits "we wait longer before we can
  buy stuff" (F4).

  **What it changes:** the park is about half of a one-hour run and the sea is the
  other half. Our 67-minute, nine-line run covers both. ADR-0…3 map onto the park,
  ADR-4…8 roughly onto the sea, which argues for keeping one board, with the late
  ADRs as our "second area" in content if not in scenery.

- **Two AI-written run guides** (a speedrun and a "normal" run; Martin pasted them,
  September 2026). **Low confidence**: they repeat some of the summary's prices, not all of them right, and
  the primary sources they cite (the itch.io devlog, the exophase achievement list)
  returned 403, so nothing in them could be checked. Martin's measurements win
  wherever they disagree. Useful only as a shape:
  - **The run's arc:** rats first (min 0–10), then the gum engine (bike, angels,
    min 10–20), then the gorilla spike (20–30), then the sea (30–45). That matches
    Martin's order and the forum's timings.
  - **"Expensive gate, cheap burst."** The gorilla costs 600K to unlock, then its
    first ~25 heads and banana upgrades are almost free, so income jumps at once.
    Players call it broken (confirmed in the forum) and seek it out: a
    deliberate-feeling power spike. Compare our ADR-3 → ADR-4 `slop` spike (§6), which
    we treat as a flaw. Maybe it's the reference's best moment.
  - **A hidden node**: zoom the tree all the way out, bottom-right corner, "Wow you
    found me!" A forum thread titled "Hidden skill??" backs its existence. A cheap joke
    for our tree: *the undocumented endpoint*.
  - **Early capacity beats early speed**: a generic idle-game tip, and a check for
    the autoplayer policy (§1). Ours matches in shape (tree unlock per crew
  kind, rail hire, `headcount` +5). **Missing: a "crew-collected tickets pay SP ×2"
  node**, which only makes sense once F9 pays SP per ticket.

### Read from one late-game shot: unconfirmed until Martin confirms

`image-staging/reference/gg-late-game.png` (gitignored). What the image shows, and
what I infer from it, kept apart:

- **The numbers do get huge.** `$4,000B` and gum `18,103M`, shown with suffixes.
  `rework-garbage-growth.md` §2.10 ("nothing needs exponents") and the §6.2 rescale
  "so the run never reaches 9e7" were built on the mid-game shots and are wrong for
  the late game.
- **Cans are physical and plural.** A row of about 9 cans along the bottom, each
  visibly filling, some empty, with green recycling bins below. Ours is one
  abstract bar (`sprint-strip.ts`), and `cans` is a hidden ×2.
- **Pink gum numbers near the cans** (`94.204`, `321.108`). Martin: gum is paid
  **at pickup**, not on the haul. See F9.
- **The lane is a solid wall** of actors, three to four rows deep, filling about a
  third of the screen. Litter is visibly airborne as it leaves them.
- **Winged, haloed figures fire pink beams** across the field. Martin: the beams
  switch on and off, and litter passing through a live beam is worth more gum. It's
  a positional multiplier applied in flight, which is what makes F2's mid-flight
  catch matter. See F11.
- **Golden rats** (about 15) are on the field: the golden-crew node, bought.
- **The field stays sparse** (about 50 items) under that crowd. That fits F7.
- **Payout floats span five orders of magnitude**, from `$154` to `$6.43M`, and
  fade out rather than pop.

F7 moves the supply model, not just a number. `unattendedEuroPerSec` (offline
pay), the `Playthrough` bot in `balance.spec.ts` and `BOARD_CAPACITY` all assume
nothing is lost. With expiry, the bot has to model what a player misses. It also
defuses most of `docs/performance.md`: the board stops sitting near 600 cards.

**F10's theme, decided: swimlanes, WIP limits, release trains.**

| Reference | Debt Growth | Rail copy |
|---|---|---|
| Can | A swimlane on the kanban board | *Open another swimlane* (9 ranks) |
| Capacity | The lane's WIP limit | *Raise the WIP limit* (+25, 10 ranks): the joke is that a WIP limit exists to be low |
| Truck | The release train; a full lane ships, locked until the train is back | — |
| 10 cans | Lanes named as teams pile up: *Platform*, *Growth*, *Tiger Team*, *Tiger Team 2*, *Tiger Team (new)*… | — |

The sprint strip becomes a row of kanban lanes along the bottom, like the reference's row of cans.

**F11's theme, decided: planning poker.** Replaces the angels, which Martin disliked. The reference's boost is additive (Martin), so the numbers follow it, not Fibonacci.

| Reference | Debt Growth | Rail copy |
|---|---|---|
| Angel | An agile coach on the lane edge, holding up planning-poker cards | Tree node: *Hire another agile coach* (10) |
| Beam on / off | A voting round: cards up, the zone lit | *Extend the refinement meeting* (longer windows) |
| Crossing a beam | The ticket is re-estimated upward: story-point inflation | — |
| Beam strength, +15 × 10 | A bigger card: the bonus is additive, as in the reference; the card shown on the float can walk the deck (1, 2, 3, 5, 8, 13, 20, 40, 100, ☕) as flavour | Tree node: *Add a card to the deck* (10) |

F3–F5, F7 and F8 move the whole curve. After them, re-run the pacing instruments; the
35–100-minute band and the ladder-gap floor must still hold. F1 and F2 are stage
only and shouldn't touch `balance.spec.ts`.

---

## 1. Extract the autoplayer — the highest-value refactor

`class Playthrough` (~270 lines inside `game/data/balance.spec.ts`) is the only
model of how a player spends, and **every number in the economy was tuned through
it**. It can express exactly one policy, hard-coded, with a `switch` over
`PurchaseId`.

Moved to `game/util/autoplay.ts` with the policy as data, the same bot could run
across several policies and seeds — a clicker, an idler, a hoarder — and the
pacing assertions could hold for all of them rather than for one. It could also
be driven from the debug door for tuning sweeps without a test run.

This is the thing that makes every other balance change cheaper, so it goes
first.

---

## 2. Unstash the weather

`HAZARDS_ENABLED` is `false` in `game/model/hazard.model.ts`. Ten rows, the
`Partial<Weather>` patch mechanism and the specs are all intact; nothing drives
them.

It is not a flag flip. Three things need deciding:

- **`meeting` pulls closers off the board.** That was a cost measured against a
  10-second round. Against a continuous loop paced by the can, an interruption
  means something different — possibly better, possibly nothing.
- **The crew-euro floor moves.** `CREW_EURO_WINDOW_FLOOR` in `balance.spec.ts`
  reads `HAZARDS_ENABLED` and drops to 0.04 while weather is off, because the
  offshore headcount hazards staffed is gone. Turning it back on means
  re-measuring, not restoring the old constant on faith.
- **Three standing complaints** (`gamedesign.md` §7): `grooming` is a no-op,
  `migration`'s `supply: 0` has no counterplay, and the invitation and fact
  cadences are both 120 s by coincidence rather than design.

---

## 3. Promotion versus the rail — one seat, two prices

The rail sells a senior seat at `1 200 × 1.15^n` — seat 5 for ≈ 2 100. Promotion
sells the same seats through `SENIOR_BUYOUT_STEPS × PROMOTION_PREMIUM (1.6)` —
five of them for ≈ 46 800. Nothing ties the ladders and no test compares them.

Before the rework promotion was the bargain; now it is the rip-off, and the
autoplayer only takes it when starved. §4 of the rework contract wanted promotion
**replaced** by the golden-crew node; half of that happened. Either derive one
ladder from the other or finish the deletion.

---

## 4. The 71 skill icons that never render

`src/assets/skills/` holds 71 generated PNGs, `SkillScene.preload` downloads all
of them, and `#stampIcon` matches them against `square.node.id`. The icon ids are
`a1`…`h4`; the node ids are `radius`, `capacity`, `junior`. **Only `root`
matches.** Seventy icons are shipped, preloaded and never drawn, and every other
square falls back to a two-letter code.

So this is both a bundle-size finding and a missing feature. Either map node ids
to icon ids (a table beside `SKILL_ICON_IDS`, which also lets the ADR rungs get
their own art), or delete the assets and the preload and commit to the codes.
`README.md`'s "seventy-one skill node icons" describes something the player has
never seen.

---

## 5. Measure the board

`docs/performance.md` is a static review and nothing in it is confirmed. It is
now more urgent than it was: the board is never wiped, so it sits near
`BOARD_CAPACITY` 600 for most of a run instead of being emptied six times a
minute, and the new lane moves up to 126 `Image`s a frame — the only cost in the
scene that scales with what the player bought.

The file names the capture to take and the three questions it would settle.

---

## 6. Smaller, and mostly cosmetic

- **ADR-3 → ADR-4 is 1.6 minutes** where every later gap is 5–10. Income spikes
  hard when `slop` arrives; no cost I tried moved it. It wants the income
  smoothed, not the cost raised. Outside the assertion band on purpose.
- **The ADR panel duplicates the tree node it buys.** Parity only asks that the
  unlock live on the tree. The panel was kept because deleting the last route to
  a purchase is how the tree shipped unreachable — but two surfaces for one
  purchase is a decision, not an inheritance.
- **`officePlates` counts the `kit` node**, so buying kit widens the office floor
  art by a plate. Harmless since desks stopped coming from plates; still wrong.
- **Per-crew skill effects are spelled out per crew.** One
  `{ kind: 'pace', crew, field }` would collapse ~10 effect kinds to 3–4, halve
  the switch in `stage/util/skill-copy.ts`, and remove eight near-identical i18n
  keys per language. It reaches into both catalogues, so it wants its own pass.
- **The first act is an `if` ladder.** `util/first-act.ts` withholds `incident`
  and `bug` by type name. A `revealAtMs?` field on `TicketType` would make the
  whole opening tunable as data.
- **The lane's actors are canvas-drawn** in `stage/util/board-atlas.ts`, not the
  generated art §4 of the contract assumed. They read fine at `LANE.scale` 0.62;
  worth knowing they are code, not assets.

---

## 7. Needs your call, not a session's

**Areas** — row 52 of `comparrison.md`, the reference's park → moon. Ruled out of
scope and recorded as an accepted divergence. Our analogue is a second client or
a second engagement, and that is a design decision nobody has taken. It would be
a large content feature: a new board, a new ticket set, a transition, and a
second pass over the whole curve.

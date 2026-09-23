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

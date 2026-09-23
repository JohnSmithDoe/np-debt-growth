# Handoff — close the Garbage Growth parity gaps

Paste the block below into a fresh session.

---

## Task

In `/Users/mpstaerk/Projects/xprivate/np-debt-growth`, on branch
`feature/garbage-growth-rework` (clean at `1f99cf9`).

This Angular 21 + Phaser 4 idle game was reworked to match the Steam incremental
**Garbage Growth** 1:1, with our own content (a consultancy billed by the hour).
`docs/comparrison.md` is a 54-row feature audit of how close we got.

**Your job: turn every ❌ and 🟡 row in `docs/comparrison.md` green.** Row 53
(late-game numbers) is already ✅ and needs nothing — Garbage Growth also reaches
ridiculous figures, so that is parity, not a gap.

Read first: `docs/comparrison.md`, then `docs/rework-garbage-growth.md` (the design
contract, its §4 decisions and §9 status), then `CLAUDE.md`.

## The 15 open rows

| # | What Garbage Growth does | What we do |
|---|---|---|
| 11 | Blocked litter **jumps in place** when the can is full | the cursor ring turns red; tickets do not move |
| 13 | **"More cans" doubles capacity** — a second purchase axis | only a `slots` multiplier exists |
| 14 | "More slots" **adds** capacity | `slots` is multiplicative |
| 17 | Background flowers scattered on the field, not collectible | plain floor, no scatter dressing |
| 18 | A lane of actors above the field | `TierSpawners` shows one walker per ADR |
| 19 | **Buying more puts visibly more of them on the path** (~20 people + ~20 dogs late) | the lane never grows with what you bought |
| 22 | A new litter type arrives with a new creature | one walker per ADR only |
| 23 | **A tree node unlocks the spawner and its litter** (`Gorilla freischalten`, 600 000 gum) | gated by `state.tier`; ADRs are bought from a panel in €, not the tree |
| 24 | **Three rail tabs**: Pollution / Upgrades / Workers | two: Pollution and Crew |
| 25 | **Per-litter income upgrades, capped at 10** (`Papier-Einkommen`, `Kacke-Einkommen`) | none |
| 28 | Plain-words effect tooltip on every rail row | spawner rows have blurbs, crew rows do not |
| 34 | Worker capacity from a **`+5` tree node** (`Rattenpopulation`, 0/3) | office plates → desks, multiplicative |
| 46 | **`+` and `%` badges** on tree nodes, additive vs multiplicative at a glance | no badges |
| 51 | **Offline progress** | `MAX_CATCHUP_MS` is 5 s |
| 52 | **New areas** (park → moon) | one board |

## Three calls to raise with Martin, not decide silently

1. **#23 moves ADR unlocks onto the tree, which moves their cost from € to SP.**
   ADR unlock costs currently drive the whole euro curve (130 → 280 000 000).
   Parity says they should be tree nodes bought with SP, like `Gorilla
   freischalten`. That is a large economy change — re-measure before and after.
2. **#51 contradicts an earlier decision.** Martin chose "active game, own it"
   early on, then later said "make it as close to garbage growth as you can".
   Parity wants bounded offline accrual; the retainer is the natural vehicle.
3. **#52 is a content feature, not a mechanic** — a second board needs a design
   call on what our analogue of "the moon" is. A new client or engagement was the
   idea floated in `rework-garbage-growth.md` §8.

## How to verify — this matters more than it sounds

The last session reported the rework finished on a green suite, a clean build and
a screenshot of the first twenty seconds. All three passed while **the skill tree
was unreachable and ADRs were unbuyable**, because deleting the sprint-review
screen took the only "Open the tree" button and the only ADR panel with it.

So: **play the build before claiming anything works.**

```bash
pnpm start                      # then drive it
# the `screenshot` skill drives Chrome headless:
node ~/.claude/skills/screenshot/screenshot.mjs http://localhost:4200/ \
  --width=1400 --height=980 --click='cb-title-screen .btn.primary' --wait=15000 \
  --out=/tmp/shot.png
```

Click through: title → board → rail shop (both tabs) → ADR panel → the tree →
back. A feature is not done until you have seen it work in the running app.

## Gates — all must stay green

```bash
pnpm typecheck      # ngc over all of src/**
pnpm lint           # angular + sheriff + prettier
pnpm verify         # sheriff boundaries alone
pnpm test           # vitest; ~4 min, run it in the background
pnpm build
```

After **any** economy change, re-run the pacing instruments:

```bash
CB_CLOCK=1 CB_LADDER=1 CB_SHARE=1 pnpm vitest run src/app/game/data/balance.spec.ts
```

`balance.spec.ts` asserts the run reaches ADR-8 in **35–100 minutes** (currently
66.6) and that the last three rungs are spaced more than 2 minutes apart. Keep
both green — they are the only guard on the whole curve.

## Landmarks

- `game/util/economy.ts` — all pricing; `spawnerUnlocked`, `lineCost`,
  `goldenChance`, `haulMs`, `sprintSlots`
- `game/model/spawner.model.ts` — the nine ADR spawner lines (cap 50, ×1.15)
- `game/model/balance/progression.ts` — `LINE_PLAN`, the rail's repeatable lines
- `game/model/skill.model.ts` — the tree, SP-only; `FINAL_SKILL_ID` ends the run
- `console/feature/supply-panel/` — the rail shop (tabs live here)
- `stage/scene/tier-spawners.ts` — the lane that needs to grow (#19)
- `stage/scene/board-scene.ts` — hover sweep, the refusal tint (#11 lives here)
- `stage/scene/skill-scene.ts` — the tree render (#46 badges)
- Weather is stashed behind `HAZARDS_ENABLED` in `game/model/hazard.model.ts`;
  its specs skip while it is off. Leave it off.

## House rules

- Comments only where genuinely needed, short and technical, no history.
- Private members `#name`, not `private`. No `@Injectable` in `util/`.
- Sheriff module roots are exactly `<domain>/<type>` — nest new code under an
  existing pair.
- `store.board` is a plain mutable object on purpose, and `game/util/board.ts` is
  stepped but never priced — an eslint rule enforces the second.
- Adding a game entity? `game/util/catalogue-reach.spec.ts` will tell you which
  i18n keys you owe, in both `en` and `de`.
- Update `docs/comparrison.md` as you close each row, and say plainly which rows
  you actually verified by playing versus only by test.

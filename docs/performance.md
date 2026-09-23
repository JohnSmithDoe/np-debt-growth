# Stage performance — open findings

Static review, not a profile. No gate in this repo executes a frame, so nothing
below is confirmed. Ranked by how it scales, not by what it costs today.

**The rework raised the stakes on every heap finding.** The board is never wiped
now, so it sits at or near `BOARD_CAPACITY` 600 for most of a run instead of
being emptied six times a minute. Anything that was "O(board), but the board is
small" is now O(600), permanently.

## Findings

1. **`stage/scene/tier-spawners.ts` — the lane moves up to 126 `Image`s every
   frame.** Nine lines × `LANE.perLine` 14, each getting an `x` write, a bounds
   test and a `setFlipX` per frame whether or not the facing changed. New in the
   parity pass, and the only cost in the scene that **scales with what the player
   bought**. Fix: skip `setFlipX` unless the direction flipped; consider a
   `SpriteGPULayer` the way the heap does, or drop `LANE.perLine` — the crowd
   reads long before 14 a line.

2. **`stage/scene/cb-scene.ts` — `floatPayout` allocates a `Phaser.Text` and a
   tween per payout, and nothing caps concurrent floats.** A `Text` rasterises to
   its own canvas and uploads a texture. Scales with click rate, unbounded.
   Fix: pool them the way `FlyerPool` pools flights.

3. **`stage/util/ticket-heap.ts` — `sync` scans all tickets twice per frame** to
   find the few that changed (~1,200 Map lookups/frame at a full board, and the
   board is now full nearly all the time). The only term that scales with heap
   size rather than with what changed.
   Fix: have the store pass a change list instead of a snapshot to diff.
   Note: `#drop(id)` deleting from `#drawn` during `for…of` is safe and specified
   — not a bug.

4. **`stage/model/board.consts.ts` — `HEAP_CAPACITY` is 4096, `BOARD_CAPACITY` is
   600**, so the layer holds at most 600 live members but allocates and carries a
   4096-quad buffer for the scene's life. Unresolved: whether Phaser's
   `SpriteGPULayer` draws the whole buffer or only the live prefix. Confirm before
   acting. Fix: size `HEAP_CAPACITY` from `BOARD_CAPACITY` plus a margin.

5. **`console/feature/supply-panel` — three tab `computed`s each read
   `store.state()`, so all of them recompute at 10 Hz** and rebuild every row,
   calling `translate.instant` per row as they go. Up to 10 rates + 9 lines + 6
   crew rows. Only one tab is rendered, but all three recompute. Pre-existing
   shape, widened by the third tab.
   Fix: depend on the narrow signals a row actually reads, or gate each tab's
   `computed` on `tab()`.

6. **`stage/util/ticket-heap.ts` — 48 `repeat: -1` tweens run permanently** (24
   rare cards + 24 glows) for objects that are almost always hidden.
   Fix: start on slot take, pause on `#drop`.

7. **`stage/scene/sprint-strip.ts` — `update` makes 8 store reads per frame before
   its redraw guards**, so the guards save the drawing but not the reading. Two
   are folds over the expanded effect list. Invalidated 10×/sec.
   Fix: push from a signal effect instead of reading per frame.

8. **`stage/scene/ground-layer.ts` — the floor is two full-screen `TileSprite`s
   now**, carpet plus scatter. Fixed cost, one extra draw call, no allocation per
   frame. Listed for completeness rather than concern.

9. **`game/util/board.ts` — `sweep()` allocates three arrays and a sort per senior
   close**, after an O(tickets) `pickWithin` scan. On the 10 Hz path, negligible
   today. The one place a hire does work proportional to the whole board — and
   that board is now three times the size it used to average.

## Measurement still owed

There is no valid performance measurement of the board.

- Run to ADR-5 or later with a saturated board. The debug door plus the rail
  gets there in a minute: `pnpm start`, then `debtGrowth.grant(5e9, 5e7)` and buy
  heads on every line. A cold board measures nothing, and so does a young one.
- Chrome DevTools → Performance, 20 s capture, sweeping hard throughout.
- Answer: what fraction of a frame is `BoardScene.update`; how much of it is the
  lane (finding 1) versus the heap (findings 3, 4); what is feeding GC; and
  whether the `SpriteGPULayer` draw scales with live cards or with
  `HEAP_CAPACITY` (settles finding 4).

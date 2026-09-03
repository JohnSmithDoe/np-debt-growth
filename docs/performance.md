# Stage performance — open findings

Static review, not a profile. No gate in this repo executes a frame, so nothing
below is confirmed. Ranked by how it scales, not by what it costs today.

## Findings

1. **`stage/scene/cb-scene.ts` — `floatPayout` allocates a `Phaser.Text` and a
   tween per payout, and nothing caps concurrent floats.** A `Text` rasterises to
   its own canvas and uploads a texture. Scales with click rate, unbounded.
   Fix: pool them the way `FlyerPool` pools flights.

2. **`stage/util/ticket-heap.ts` — `sync` scans all tickets twice per frame** to
   find the few that changed (~1,200 Map lookups/frame at a full board). The only
   term that scales with heap size rather than with what changed.
   Fix: have the store pass a change list instead of a snapshot to diff.
   Note: `#drop(id)` deleting from `#drawn` during `for…of` is safe and specified
   — not a bug.

3. **`stage/model/board.consts.ts` — `HEAP_CAPACITY` is 4096, `BOARD_CAPACITY` is
   600**, so the layer holds at most 600 live members but allocates and carries a
   4096-quad buffer for the scene's life. Unresolved: whether Phaser's
   `SpriteGPULayer` draws the whole buffer or only the live prefix. Confirm before
   acting. Fix: size `HEAP_CAPACITY` from `BOARD_CAPACITY` plus a margin.

4. **`stage/util/ticket-heap.ts` — 48 `repeat: -1` tweens run permanently** (24
   rare cards + 24 glows) for objects that are almost always hidden.
   Fix: start on slot take, pause on `#drop`.

5. **`stage/scene/sprint-strip.ts` — `update` makes 8 store reads per frame before
   its redraw guards**, so the guards save the drawing but not the reading. Two
   are folds over the expanded effect list. Invalidated 10×/sec.
   Fix: push from a signal effect instead of reading per frame.

6. **`game/util/board.ts` — `sweep()` allocates three arrays and a sort per senior
   close**, after an O(tickets) `pickWithin` scan. On the 10 Hz path, negligible
   today. The one place a hire does work proportional to the whole board.

## Measurement still owed

There is no valid performance measurement of the board.

- Run at tier 3 with a full board (`pnpm start`, debug bar to grant budget and
  jump tiers). A cold board measures nothing.
- Chrome DevTools → Performance, 20 s capture, clicking hard throughout.
- Answer: what fraction of a frame is `BoardScene.update`; what is feeding GC;
  and whether the `SpriteGPULayer` draw scales with live cards or with
  `HEAP_CAPACITY` (settles finding 3).

# Garbage Growth — the opening, as measured

Martin read these off the reference by playing it, September 2026. **They are accepted as
the real numbers**, and they outrank the earlier estimates in `handoff-next.md` and
`comparrison.md`. This doc covers only the opening: the first spawner, the gum unlock, the
first income row and the first tree nodes.

## Raw observation

At the start there is 1 person, and the player can buy:

- Rail:
  - person: 0 $ (the free one)
  - unlock gum: 25 $
  - paper income +3: 250 $ → 412 $ → 680 $ -> 1123 $ -> 1853 $ … 10/10 MAX; at max,
    with all upgrades, the tooltip reads "Erhöht PAPIER-Einkommen um 14 (154)" and
    papers show $154
- Skill tree:
  - paper income ×2: 25 gum

Persons, 49 buyable:

```
0$ -> 2$ -> 2$ -> 2$ -> 3$ -> 3$ -> 4$ -> 4$ -> 5$ -> 6$ -> 7$ -> 8$ -> 9$ -> 10$ -> 12$
-> 14$ -> 16$ -> 18$ -> 21$ -> 24$ -> 28$ -> 32$ -> 37$ -> 43$ -> 49$ -> 57$ -> 65$ -> 75$
-> 87$ -> 100$ -> 115$ -> 132$ -> 152$ -> 175$ -> 201$ -> 231$ -> 266$ -> 306$ -> 352$
-> 405$ -> 465$ -> 535$ -> 616$ -> 708$ -> 814$ -> 936$ -> 1077$ -> 1239$ -> 1425$
-> 1638$ -> MAX
```

Tree nodes that are visible but locked at the start:

- 2 200 gum: a person has a 20 % chance to throw 2 papers
- 75 gum: paper gives +2 gum (next rank 112 gum)
  - unlocks the rat unlock (1 200 gum) and paper income ×2 (2 500 gum)
- 1 100 gum: +50 % paper income (next rank 1 375 gum)
- 100 gum: mouse radius +25 %

## The math

### Spawner heads: `floor(base × 1.15^k)`

All 49 person prices match `price(k) = floor(2 × 1.15^k)`, k = 0…48. There are no
mismatches, checked by script. The free head is not counted in k, so the first paid head
costs exactly the base. The cap is 50 heads, the free one included. The sum of the
49 paid heads is 12 531 $.

The dog line fits the same formula: base 500, second head 574 = `floor(500 × 1.15)`, and
2 326 at 11/50 (`handoff-next.md`). So this is one formula for every line, with a
different base per line.

### Income row: `floor(250 × 1.65^k)`, additive

250 → 412 → 680 → 1 123 → 1 853 is `floor(250 × 1.65^k)`: 250, 412.5, 680.6, 1 123.03,
1 853.0. The effect is **+3 $ a rank, flat**: it doesn't scale with the line's base value
(Martin). A paper is worth 1 $, so the ranks give 1 → 4 → 7 → … → 31. The first rank
quadruples the line's value, and each later rank adds relatively less.

**The cap is 10 ranks** (the row shows `10/10`, `MAX`). The prices this formula predicts
for the whole row are 250 412 680 1 123 1 853 3 057 5 044 8 323 13 734 22 661, 57 137 $
in all. Only the first five are observed.

**At the maximum, with every upgrade bought,** the last rank's tooltip reads
"Erhöht PAPIER-Einkommen um 14 (154)", and papers on the field show $154. Both fit a flat
+3 once the tree's multipliers are applied **after** the additive sum, and the displayed
number is floored:

- value = `floor(M × (1 + 3k))`; at k = 10 that's `floor(31 M)` = 154, so
  M ∈ [4.968, 5.0)
- tooltip = `floor(M × 3)` = `floor(14.90…)` = 14 ✓
- the next-best reading, "the tooltip shows the difference between two floored values",
  predicts 15, so it's ruled out

So the ×2 tree nodes **do** double the +3: order is `(base + 3k) × multipliers`. M, the
product of the paper multipliers at full upgrade, is just under 5. Which nodes make up
M isn't known: ×2 × ×2 = 4 would need a further ~×1.24.

**Why it's flat (design intent, per Martin):** +3 is huge on a 1 $ ticket and nothing
on an expensive one. The row is strong only while its line is the best income you have,
so it pushes the player up to the next tier rather than letting them camp on the old
one. Later, once income has outgrown the price, the old rows are cheap to fill.

### Rounding

Every observed price is floored. Where a value sits on an integer boundary, you can't
tell floor from round, but ceil is ruled out: it misses 48 of the 49 person prices.

## Against ours (`feature/garbage-growth-rework`, `0b87b65`)

| Thing | Reference | Ours | Source |
|---|---|---|---|
| Head price | `floor(2 × 1.15^k)` | `ceil(2 × 1.15^k)` | `game/util/economy.ts` `spawnerCost` |
| Base, step, cap, free head | 2, 1.15, 50, 1 free that doesn't raise the price | same | `game/model/spawner.model.ts` |
| First heads | 2 2 2 3 3 4 4 5 6 7 | 2 3 3 4 4 5 5 6 7 8 | — |
| Cost of 49 heads | 12 531 | 12 579 (+0.4 %) | — |
| Gum/SP unlock | 25 $ rail row | `velocity` 25 €, `open` | `balance/progression.ts` `LINE_PLAN` |
| Income row, first rank | 250 $ | 32 € (`2 × INCOME_COST_OF_SPAWNER 16`) | `economy.ts` `incomeCost` |
| Income row, step | ×1.65 | ×1.75 (`INCOME_COST_STEP`) | `balance/progression.ts` |
| Income row, effect | +3 $ additive (1 → 4 → 7) | ×1.3 compounding (`INCOME_VALUE_STEP`) | `economy.ts` `incomeMultiplier` |
| Rounding, income | floor | ceil | `incomeCost` |
| First value ×2 on the tree | 25 gum, open at the start | `valueLint` 150 SP behind `income` 250 SP: 400 SP | `game/model/skill.model.ts` |
| +2 gum a pickup | 75 → 112 gum (×1.5) | `estimates` 40 → 200 → 900 … behind `income` 250 SP | `skill.model.ts` |
| Mouse radius | 100 gum, +25 % | `radius` 110 SP, ×1.35 | `skill.model.ts` |
| +50 % income | 1 100 → 1 375 gum (×1.25) | `income` 250 → 850 …, +12 %/+10 % global | `skill.model.ts` |

## What follows

1. **The head series already fits.** Base, step, cap and free head are the reference's
   formula. Only the rounding differs: switching `spawnerCost` from `Math.ceil` to
   `Math.floor` reproduces the 49 prices without copying a table. Over the whole line
   the difference is 0.4 %, but in the opening it's 25–33 % (the first three heads
   cost 6 vs 8), and the opening is exactly the part `balance.spec.ts` shows as thin
   (33 SP/min at minute 5).
2. **The income row is the real divergence.** Ours is cheap (32 €) and compounds
   (1.3¹⁰ ≈ 13.8×). The reference's is expensive (250 $) and additive (+3 a rank, so
   ×31 at a hypothetical rank 10, but front-loaded). The formula is
   `floor(base × 1.65^k)` for the price and `value + 3k` for the effect, with a flat
   +3 on every line (decided, see above). Ours compounds, so an old line's row never
   loses its value, and nothing pushes the player off it. That is the opposite of the
   reference's intent.
3. **Our tree's opening is behind a 250 SP toll.** In the reference, the 25 gum ×2
   node and the 75 gum +2 gum node are the first things gum buys. In ours, both sit
   behind `income` (250 SP). That toll is probably the main cause of the thin first
   seven minutes, more than the head prices are.
4. **Node ranks climb slowly**: ×1.5 (+2 gum) and ×1.25 (+50 % income), against ours at
   ×4–5 a rank (`estimates`, `income`).

## Adopted, 24 September 2026

The opening now runs on these numbers (`feature/garbage-growth-rework`, uncommitted):

| Reference | Ours now |
|---|---|
| Heads `floor(2 × 1.15^k)` | `spawnerCost` floors: 2 2 2 3 3 4 4 5 6 7 … 1 638 |
| One person, paper only, ~1 per 4 s | `lint` 0.25/s a head; `bug` held back until ADR-1 (`BUG_REVEAL_TIER`); no free copilot |
| Unlock gum 25 $ | `velocity` 25 € (unchanged) |
| Paper income +3, `floor(250 × 1.65^k)`, 10 ranks | `INCOME_VALUE_ADD` 3 before multipliers, `INCOME_COST_OF_SPAWNER` 125, `INCOME_COST_STEP` 1.65, floored |
| 1 gum per 1 $, whole numbers | `pickupStoryPoints` = ⌊€ billed⌋ + bonuses; `formatPoints` shows whole points |
| Paper ×2, 25 gum, open | `valueLint` rank 1, 25 SP, the only open node under Client |
| +2 gum, 75 → 112 | `estimates` 75 112 168 253 379, behind `valueLint` |
| Paper ×2, 2 500 gum | `valueLint` rank 2, 2 500 SP |
| +50 % paper income, 1 100 → 1 375 | `income` ranks 1–2: 1 100 / 1 375, ×1.5 (global; at the start only paper exists) |
| Radius +25 %, 100 gum | `radius` rank 1, 100 SP, ×1.25 |
| 20 % double throw, 2 200 gum | `supply` rank 1, 2 200 SP, +20 % spawn; later ranks ×1.5 in price |
| Rat unlock 1 200 gum | `junior` 1 200 SP (unchanged) |

Measured (`balance.spec.ts`): ADR-1 at 6.4 min, first junior 7.2, 199 €/min and 31 SP/min
at minute 5. **Everything after the opening is not tuned yet.** SP at the full € value
makes the ADR ladder collapse: ADR-3 at 8.7 min, sign-off at 12.4. Three whole-run guards
fail on purpose until the mid-game is fitted to the reference: sign-off 35–100 min, late-rung
spacing, and the crew's euro share (95.4 %).

## Open for the next session

- Adopt floor rounding for heads (and income rows)? It's a one-line change, and it
  moves every balance number.
- Income rows: price `floor(first × 1.65^k)`, effect a flat `+3` a rank on every
  line, cap 10, tree multipliers applied after the sum (all confirmed). Still open:
  each line's first price (only the paper row's 250 is known, 125× its head base), and
  which nodes make up the paper's ~×4.97 at full upgrade.
- Pull `valueLint`/`estimates` in front of `income` at reference-like prices
  (25 / 75), and slow their rank steps.
- The +20 % double-throw node (2 200 gum): we have no equivalent.
- After any of these: re-run `CB_CLOCK=1 CB_LADDER=1 CB_SHARE=1 CB_INCOME=1 pnpm vitest
  run src/app/game/data/balance.spec.ts`. The baseline before the change is ADR-1
  7.2 min, first junior 8.2, ADR-2 11.6, ADR-8 55.8, sign-off 64.3, tree bought out,
  33 SP/min at minute 5, and a ×28 €/min jump between minutes 10 and 15.

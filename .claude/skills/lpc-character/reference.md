# LPC generator — technical reference

The contract the scripts rely on. Read this before assembling a hash by hand.

## The hosted generator

- Base URL: `https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/`
- It is a **client-side** app with no server API. A character is encoded entirely in the URL
  **hash**; opening that URL reconstructs it, and the page composites every layer onto an
  offscreen canvas with the right z-order and palette recolors. `export.mjs` opens the URL
  and clicks the page's own download buttons, so the compositing is never our problem.

## Hash grammar

`key=value` pairs joined by `&`, each side `encodeURIComponent`-encoded. `export.mjs` does
the encoding — author literal tokens.

```
#sex=teen&body=Body_Color_light&head=Human_Male_light&eyes=Eye_Color_brown&hair=Cowlick_dark_brown
```

- **`sex`** is the build, one of `catalog.bodyTypes`: `male`, `female`, `muscular`, `teen`,
  `pregnant`, `child`. Always present.
- **Every other key is a `type_name`** — `head`, `body`, `hair`, `clothes`, `legs`, `shoes`,
  `weapon`, `beard`, `facial_eyes`, `neck`, `wrinkles`, … (`catalog.mjs types`).

### The value: `Name[_colour]`

The resolver splits the value on `_` and walks the split point **left to right**, taking the
first item name that matches — either with a colour that item accepts, or with nothing after
it at all. It is not longest-match, which matters wherever one name is a prefix of another
(`Longsleeve` vs `Longsleeve_2_Scoop`). Comparison folds case, spaces and underscores
together, so `Robe_dark_brown` and `Robe_dark brown` are the same token.

`catalog.mjs check` implements exactly this. Trust it over a reading of the value.

### The colour is `[material.][version.]name`

A colour lives in a palette, and a palette has a **material** (`body`, `cloth`, `hair`, `eye`,
`metal`, `wood`, `all`) and a **version** (`ulpc`, `lpcr`). A token may drop the material and
the version only when they are the defaults for that channel.

This is the trap the catalog exists to close: **`body=Body_Color_tan` renders no body.** `tan`
is a body colour, but an `lpcr` one, and the body's default version is `ulpc` — so the correct
token is `body=Body_Color_lpcr.tan`. Nothing warns you. Ask the catalog:

```bash
node scripts/catalog.mjs items body --colours
```

### Colour channels are separate keys

An item may recolor more than one region. The extra channels carry their own `type_name` and
appear as their **own hash key**, not as part of the item's token:

| intent                          | token                    |
| ------------------------------- | ------------------------ |
| a human head's eye colour       | `eyes=Eye_Color_brown`   |
| a fishing rod's grip            | `handle=Grip_oak`        |

A channel paints nothing on its own — it needs the item that owns it in the same hash.
`catalog.mjs check` says which item is carrying each one, and warns when nothing is.

Human heads also declare `match_body_color`, so the head follows the body's tone. Set both
explicitly to the same colour anyway; it costs nothing and removes the question.

### Verified examples

| intent                        | token                                |
| ----------------------------- | ------------------------------------ |
| teen build                    | `sex=teen`                           |
| light skin                    | `body=Body_Color_light`              |
| tan skin (non-default ramp)   | `body=Body_Color_lpcr.tan`           |
| matching human head           | `head=Human_Male_light`              |
| brown eyes on that head       | `eyes=Eye_Color_brown`               |
| white buttoned shirt          | `clothes=Longsleeve_2_Buttoned_white`|
| steel spear (metal variant)   | `weapon=Spear_steel`                 |
| longsword (name-only default) | `weapon=Longsword`                   |

## Three failure modes the generator will not warn you about

- **A colour outside the item's own list falls back to the default** — or drops the layer.
  Either way it renders cleanly and says nothing.
- **Items are body-type specific.** No vest ships female art; several formal tops are
  male-only; a child has neither shoes nor expression layers. A character can end up
  topless with every token spelled correctly.
- **A skin tone split between `body` and `head`** is two valid layers and one two-tone
  character.

`catalog.mjs check` catches all three offline. Run it.

## Sheet geometry depends on the layers

A sheet is a grid of 64px frames, but **the column count is not fixed**: a weapon layer adds
oversized swing frames and widens the sheet from **13 to 18 columns** (832px → 1152px). Frame
indices are row-major, so the column count shifts every index — reading a weaponed sheet with
13-column indices lands on empty cells and animates nothing visible. `export.mjs` reports
`columns` and `geometry`; `check` predicts them. This repo's cast is unarmed, so 13.

Row order is identical in both geometries. The blocks, by starting row:

| block       | row | frames | directional |
| ----------- | --- | ------ | ----------- |
| spellcast   | 0   | 7      | yes         |
| thrust      | 4   | 8      | yes         |
| walk        | 8   | 9      | yes         |
| slash       | 12  | 6      | yes         |
| shoot       | 16  | 13     | yes         |
| hurt        | 20  | 6      | no          |
| climb       | 21  | 6      | no          |
| idle        | 22  | 2      | yes         |
| jump        | 26  | 5      | yes         |
| sit         | 30  | 3      | yes         |
| emote       | 34  | 3      | yes         |
| run         | 38  | 8      | yes         |
| combat idle | 42  | 2      | yes         |
| backslash   | 46  | 13     | yes         |
| halfslash   | 50  | 6      | yes         |

A directional block spans four consecutive rows in the order **up, left, down, right**; a
non-directional one is a single row facing the camera. So the first frame of a walk-down is
`(8 + 2) * cols`. `thrust` is 8 frames on an unarmed sheet and 9 on an armed one — 8 is
correct on both, at the cost of one frame on armed characters.

## Refreshing the catalog

```bash
git clone --no-checkout --depth 1 --filter=tree:0 \
  https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator.git /tmp/lpc
cd /tmp/lpc && git sparse-checkout set --no-cone sheet_definitions palette_definitions && git checkout
node <skill>/scripts/build-catalog.mjs /tmp/lpc
```

Then re-run `catalog.mjs check` on every preset — upstream renames items, and a renamed item
is a silently missing layer.

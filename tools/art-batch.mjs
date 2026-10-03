#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const GEN = join(homedir(), '.claude', 'skills', 'np-generate-image-by-prompt', 'np-generate-image.mjs');
const STAGING = new URL('../image-staging/', import.meta.url).pathname;

const CLEAN = 'Full-bleed edge-to-edge composition, no border, no text, no letters, no numbers, no signature, no watermark, no frame, no vignette.';
const LOOK = 'Detailed retro game key art, dark moody limited palette of slate grey, charcoal and blue-grey with warm amber monitor glow. Deadpan corporate realism, never whimsical.';
const PLATE_INK = 'Bright whimsical 16-bit pixel game tileset art with very heavy near-black ink outlines around every single object, hard flat colour with no gradients and no texture, bold and graphic and childlike, cheerful and friendly. High overhead three-quarter view.';
const PLATE_PALETTE = 'Warm toybox palette of amber, honey, oak, tomato red, teal and moss green on a plain warm tan carpet.';
const PLATE_FLOOR = 'One single enormous carpet fills every pixel of the image, edge to edge and corner to corner, and carries on far past the image in all directions. Nothing is drawn on the carpet: no rug, no mat, no slab, no platform, no island, no painted markings, no lines, no outlines, no borders, no shadow edge, no walls, no skirting, no doorway, no white background. All of the furniture is gathered together in the middle of this carpet, well away from the image edges, with a broad expanse of plain empty carpet between the furniture and every edge. Nothing touches an edge and nothing is cut off by an edge. The furniture in the middle is packed tightly together with almost no gaps between the pieces.';
const PLATE_SHELL = 'Warm palette of concrete grey, ochre, tomato red and cream. The floor is unbroken mid-grey concrete in every direction and there is no white slab, no white sheeting, no pale patch, no tarpaulin, no taped-off rectangle and no marked-out area anywhere on it, one single flat mid-grey concrete floor of exactly the same grey everywhere.';
const SMILEY = 'Every chunky cream computer monitor has a cheerful smiling cartoon face with rosy cheeks glowing on its screen.';

const PLATE = (subject) => `${CLEAN} ${PLATE_INK} ${PLATE_PALETTE} ${PLATE_FLOOR} ${subject}`;
const SHELL = (subject) => `${CLEAN} ${PLATE_INK} ${PLATE_SHELL} ${PLATE_FLOOR} ${subject}`;

const ICON = 'A single centred icon symbol, one object alone, flat emblem style. Bold thick chunky silhouette with very heavy outlines, extreme contrast, large simple shapes only. No thin lines, no fine detail, no small parts, no texture, no gradient, no shading, no perspective, no scene, no room, no desk, no background objects, no hands. The object is drawn straight on, fills most of the frame, and floats alone on a completely plain flat dark charcoal background.';
const ICON_INK = 'Drawn in bright warm amber, pale bone white and one accent of tomato red on near-black.';
const EMBLEM = (subject) => `${CLEAN} ${ICON} ${ICON_INK} ${subject}`;

const CARPET = 'Seamless repeating flat overhead texture of commercial office carpet tile, photographed straight down from directly above, perfectly flat and even with no perspective and no vanishing point. The weave fills every single pixel edge to edge and corner to corner. Very dark and low-key overall, with all of its interest in fine mottled fibre grain rather than in brightness. No furniture, no objects, no people, no shadows, no walls, no skirting, no edges, no borders, no vignette, no light source, no highlight, nothing lying on the floor.';
const GROUND = (subject) => `${CLEAN} ${CARPET} ${subject}`;

const BIG = '1216x656';
const BANNER = '1024x512';
const MODULE = '640x640';
const EMBLEM_SIZE = '512x512';
const GROUND_SIZE = '768x768';

const ORDER = [
  ['titles', 'title-heap', BIG, 1, `${CLEAN} ${LOOK} A night-time open-plan software office seen at a low angle: rows of empty desks with glowing CRT monitors, and in the centre of the floor a huge mountain of paper ticket cards piled to the ceiling, spilling between the desks. One office chair knocked over.`],
  ['titles', 'title-kanban', BIG, 1, `${CLEAN} ${LOOK} A vast office wall covered floor to ceiling in thousands of sticky notes and index cards, so overloaded that a landslide of cards has spilled across the carpet. Two tiny office chairs at the foot of it for scale.`],
  ['titles', 'title-burndown', BIG, 1, `${CLEAN} ${LOOK} A dim boardroom at night. A projector throws a huge line chart onto the wall and the line climbs steeply upward off the top of the screen instead of falling. An empty conference table with cold coffee cups.`],
  ['titles', 'title-serverroom', BIG, 1, `${CLEAN} ${LOOK} A narrow server room aisle at night, tall black racks either side, hundreds of tiny green and amber status LEDs, a chaotic waterfall of unlabelled network cables spilling out of one open rack onto the floor.`],
  ['titles', 'title-printer', BIG, 1, `${CLEAN} ${LOOK} A single old line printer in a dark office endlessly spewing a continuous ribbon of fanfold invoice paper, which has snaked across the whole floor and buried the desks behind it in loops of paper.`],
  ['titles', 'title-3am', BIG, 1, `${CLEAN} ${LOOK} One lone programmer seen from behind, hunched at a desk in an otherwise pitch-dark office at three in the morning, face lit only by the monitor. The wall and monitor bezel are shingled with sticky notes.`],
  ['titles', 'title-tower', BIG, 1, `${CLEAN} ${LOOK} A city skyline at night where the office towers are built out of gigantic stacked paper ticket cards and filing cabinets instead of concrete, lit windows in rows, a full moon behind them.`],
  ['titles', 'title-elevator', BIG, 1, `${CLEAN} ${LOOK} A dim corporate elevator lobby. The lift doors have opened and a solid wall of paper documents is packed floor to ceiling inside the car, bursting out over the marble floor.`],
  ['titles', 'title-spaghetti', BIG, 1, `${CLEAN} ${LOOK} A huge whiteboard filling the frame, covered in an insane architecture diagram: hundreds of boxes joined by tangled arrows in every direction, several layers of overwriting, magnets and dried-out markers on the tray.`],
  ['titles', 'title-flood', BIG, 1, `${CLEAN} ${LOOK} An open-plan office flooded waist-deep in loose paper like snow, a few tiny programmers wading through it carrying laptops above their heads, ceiling lights reflecting off the paper drifts.`],

  ['tiers', 'tier1-legacy-framework', BANNER, 1, `${CLEAN} ${LOOK} A beige 1990s desktop tower and a bulging CRT monitor, thick with dust and cobwebs, still switched on in a forgotten corner of a server cupboard. Yellowed manuals stacked beside it, one cable running off into the dark. Load-bearing and ancient.`],
  ['tiers', 'tier2-copy-paste', BANNER, 1, `${CLEAN} ${LOOK} A big office photocopier mid-job, spitting out an enormous fan of identical printed code listings that has drifted across the floor. Behind it a row of absolutely identical desks with identical monitors receding into the dark.`],
  ['tiers', 'tier3-offshore', BANNER, 1, `${CLEAN} ${LOOK} A dark room facing a wall-sized grid of video call screens, each a dim empty office in a different timezone, a row of wall clocks above showing different hours. Cold blue screen light, an untouched headset on the desk.`],
  ['tiers', 'tier4-ai-slop', BANNER, 1, `${CLEAN} ${LOOK} A monitor in a dark office overflowing with a thick pouring fountain of pale iridescent slime that has flooded the desk and keyboard, glowing faintly, plausible and wrong. Everything else in the room is ordinary and untouched.`],
  ['tiers', 'tier5-rockstar', BANNER, 1, `${CLEAN} ${LOOK} A single desk lit by one harsh theatrical spotlight in a dark office, an electric guitar leaning against the chair, an energy drink can and a mechanical keyboard on the desk. Every other monitor in the room glows angry red.`],
  ['tiers', 'tier6-zombie', BANNER, 1, `${CLEAN} ${LOOK} A forgotten basement server rack behind a padlocked cage, thick dust, one single green LED burning in total darkness, an old pager lying on the concrete floor beside a dead spider plant. Water stain on the wall.`],
  ['tiers', 'tier7-big-rewrite', BANNER, 1, `${CLEAN} ${LOOK} A wrecking ball has smashed straight through an office floor: collapsed ceiling tiles, a snapped desk, exposed girders, blueprints and paper blowing through the hole, night sky and a crane visible beyond.`],
  ['tiers', 'tier8-agent-swarm', BANNER, 1, `${CLEAN} ${LOOK} A dark office filled with a dense swarm of hundreds of tiny hovering drones, each trailing a small printed page, forming a spiralling cloud that fills the room from floor to ceiling. Cold blue-white swarm glow.`],

  ['events', 'event-hotfix-window', BANNER, 1, `${CLEAN} ${LOOK} A wall-mounted emergency break-glass box in a dark corridor, glass already smashed, a red lever thrown down, red rotating alarm light washing the wall. Urgent and industrial.`],
  ['events', 'event-escalation', BANNER, 1, `${CLEAN} ${LOOK} A heavy panelled executive office door at the end of a dark corridor, standing slightly ajar with warm gold light spilling out across the carpet, a brass nameplate blank on the wood. Expensive and ominous.`],
  ['events', 'event-quarter-end', BANNER, 1, `${CLEAN} ${LOOK} An accounting office at night buried under an avalanche of ledgers and printed spreadsheets that have slid off every shelf, a huge wall calendar with the last day of the quarter circled, an adding machine trailing a long paper tape.`],

  ['screens', 'screen-post-mortem', BANNER, 1, `${CLEAN} ${LOOK} An emptied open-plan office at grey dawn: chairs stacked on desks, cables coiled, monitors dark, one whiteboard still covered in a retrospective grid of sticky notes. Cold blue morning light through the blinds. Nobody there.`],
  ['screens', 'screen-easter-egg', BANNER, 1, `${CLEAN} ${LOOK} Extreme close-up of one glowing amber CRT monitor in total darkness, showing dense scrolling source code, with a single line highlighted in bright green halfway down the screen. Scanlines and phosphor bloom.`],
  ['screens', 'screen-promotion', BANNER, 1, `${CLEAN} ${LOOK} A long row of identical office desks, each with a brand new brass nameplate freshly set on it, catching the light. Same chairs, same monitors, same people absent. Ceremonial and hollow.`],
  ['screens', 'screen-hiring', BANNER, 1, `${CLEAN} ${LOOK} A corporate waiting area with a long row of empty chairs against the wall, a tall stack of printed CVs on the low table, a closed interview room door, harsh fluorescent light on grey carpet.`],

  ['modules', 'bullpen-a', MODULE, 2, PLATE(`Four desks fit across the width of the furnished area and four down its height, sixteen small desks in all, each drawn small and simple with a keyboard and a swivel chair. ${SMILEY} No two desks alike: different chair colours, one buried in paper, one with three potted plants, one with a toppled coffee mug, one bare but for a lamp.`)],
  ['modules', 'meeting', MODULE, 2, PLATE('Two oval meeting tables fit across the width of the furnished area and two down its height, four small tables in all, each ringed by six little chairs. On each table a projector puck, notepads, a jug of water and paper cups. Small flipchart easels between the tables.')],
  ['modules', 'kitchen', MODULE, 2, PLATE('Two little kitchen counters with chunky coffee machines, kettles and sinks, two fridges covered in magnets, four small round tables each with three chairs, a mug rack, a fruit bowl, two wonky potted plants and a recycling bin, all drawn small and simple.')],
  ['modules', 'server', MODULE, 2, PLATE('Four server rack cabinets fit across the width of the furnished area and four down its height, sixteen small racks in all, drawn small and simple, their doors covered in cheerful blinking green and amber lights, thick bundles of rainbow-coloured cables looping between them across the floor.')],
  ['modules', 'war-room', MODULE, 2, PLATE('Four clusters of small tables pushed together, each cluster with open laptops, mismatched chairs and a pizza box, drawn small and simple. Whiteboards on wheels standing between the clusters, shingled with tiny coloured sticky notes, crumpled paper and coffee cups on the floor around them.')],
  ['modules', 'archive', MODULE, 2, PLATE('Six tall shelving units in three parallel rows, drawn small and simple, packed tight with colourful ring binders and cardboard archive boxes. Stacks of boxes toppling over in the gangways between them, a small stepladder, and a dusty cardboard box with a sleeping ginger cat curled on top.')],
  ['modules', 'corner-office', MODULE, 2, PLATE(`One grand executive desk of dark oak with a high-backed leather chair behind it and two little visitor chairs in front, standing on a patterned rug in the middle of the furnished area. ${SMILEY} Around it a bookshelf, two tall potted palms, a drinks trolley, a golf putter leaning against the shelf and a trophy on the desk.`)],
  ['modules', 'shell', MODULE, 3, SHELL('An unfinished floor plate under construction: coiled cable drums, folded stepladders, stacks of cardboard boxes, paint buckets, a wheelbarrow and orange traffic cones, drawn small and simple and gathered in the middle, with yellow and black hazard tape strung between them. Absolutely no desks, no chairs and no computers.')],
  ['modules', 'shell-b', MODULE, 3, SHELL('An unfinished floor plate under construction: a cement mixer, a stack of timber planks, two sawhorses with a plank across them, rolls of insulation, a pallet of paint tins, a red toolbox and a leaning broom, drawn small and simple and gathered in the middle, with yellow and black hazard tape strung between them. Absolutely no desks, no chairs and no computers.')],

  ['finale', 'finale-party-office', BIG, 2, `${CLEAN} ${PLATE_INK} A leaving party at night on an open-plan office floor. The back wall is one long row of tall windows showing a glittering city skyline and a full moon. The office desks and chairs are pushed back against the side walls. In the middle of the floor one long buffet table with open pizza boxes, a big iced sheet cake and a punch bowl, and to its right a little DJ desk with two chunky speakers and a disco ball on a stand. Strings of warm fairy lights hang across the ceiling, balloons and confetti everywhere, a broad empty stretch of dark blue carpet in the foreground for dancing. No people.`],

  ['icons', 'skill-root', EMBLEM_SIZE, 2, EMBLEM('One bold thick circular hub with four fat spokes radiating straight out from it to the top, right, bottom and left.')],

  ['icons', 'skill-radius', EMBLEM_SIZE, 2, EMBLEM('A computer mouse cursor arrow with a wide circle drawn around it, showing reach.')],
  ['icons', 'skill-capacity', EMBLEM_SIZE, 2, EMBLEM('Three thick upright rectangular cards standing side by side with one bold heavy bar laid across their tops, capping them.')],
  ['icons', 'skill-spare-cog-loop', EMBLEM_SIZE, 2, EMBLEM('A thick chunky cogwheel with one bold circular arrow curving all the way around it.')],
  ['icons', 'skill-line-value', EMBLEM_SIZE, 2, EMBLEM('A chunky flexed muscular arm, fist clenched, seen from the side.')],
  ['icons', 'skill-spare-three-columns', EMBLEM_SIZE, 2, EMBLEM('Three tall thick vertical columns of equal width standing side by side, each holding two small square cards.')],
  ['icons', 'skill-line-double', EMBLEM_SIZE, 2, EMBLEM('One enormous bold checkmark inside a thick square frame.')],
  ['icons', 'skill-spare-comb', EMBLEM_SIZE, 2, EMBLEM('A thick wide-toothed comb seen straight on, teeth pointing down.')],
  ['icons', 'skill-cans', EMBLEM_SIZE, 2, EMBLEM('Four thick horizontal parallel lanes stacked one above another, a small square marker sitting in each lane.')],
  ['icons', 'skill-spare-chart-down', EMBLEM_SIZE, 2, EMBLEM('A bold thick zigzag chart line sloping steeply downward, with a fat round dot at each corner.')],

  ['icons', 'skill-junior', EMBLEM_SIZE, 2, EMBLEM('A corporate lanyard ID badge card hanging from a neck strap, blank, with a clip at the top.')],
  ['icons', 'skill-headcount', EMBLEM_SIZE, 2, EMBLEM('Three chunky simple standing human figures shoulder to shoulder in a row, seen from the front.')],
  ['icons', 'skill-line-income', EMBLEM_SIZE, 2, EMBLEM('A stack of three bold thick upward-pointing chevrons, one above another.')],
  ['icons', 'skill-goldenCrew', EMBLEM_SIZE, 2, EMBLEM('Two chunky simple human figures sitting side by side sharing one wide keyboard between them.')],
  ['icons', 'skill-juniorSpeed', EMBLEM_SIZE, 2, EMBLEM('A chunky office swivel chair on castors, seen from the side, with three bold speed lines behind it.')],
  ['icons', 'skill-o3', EMBLEM_SIZE, 2, EMBLEM('A low office partition wall panel toppled over and lying flat on its side.')],
  ['icons', 'skill-adr6', EMBLEM_SIZE, 2, EMBLEM('A chunky round alarm clock with two big bells on top and thick stubby legs.')],
  ['icons', 'skill-pizza', EMBLEM_SIZE, 2, EMBLEM('One bold triangular party hat with a fat round pompom on its point.')],
  ['icons', 'skill-triagePolicy', EMBLEM_SIZE, 2, EMBLEM('A thick wide funnel with three small square blocks dropping out of its narrow spout.')],
  ['icons', 'skill-ticketStacking', EMBLEM_SIZE, 2, EMBLEM('Two thick rectangular cards stacked one on the other and offset, like cards carried in one hand.')],
  ['icons', 'skill-spare-folders', EMBLEM_SIZE, 2, EMBLEM('Three thick file folders standing side by side in a row, the middle one lifted higher than the other two.')],
  ['icons', 'skill-lineOfSight', EMBLEM_SIZE, 2, EMBLEM('One bold wide-open eye with a fat round pupil, seen straight on.')],
  ['icons', 'skill-spare-warning-struck', EMBLEM_SIZE, 2, EMBLEM('A fat warning triangle with one bold thick diagonal bar struck straight through it.')],
  ['icons', 'skill-o5', EMBLEM_SIZE, 2, EMBLEM('One bold six-pointed snowflake with thick chunky arms.')],
  ['icons', 'skill-juniorPresence', EMBLEM_SIZE, 2, EMBLEM('A thick circular ring arrow divided into four bold equal segments, like a rota wheel.')],

  ['icons', 'skill-spawnIncident', EMBLEM_SIZE, 2, EMBLEM('A fat warning triangle with a thick exclamation mark in it, stacked on top of a second identical triangle behind it.')],
  ['icons', 'skill-valueBug', EMBLEM_SIZE, 2, EMBLEM('One chunky rounded beetle seen from directly above, with six short thick legs.')],
  ['icons', 'skill-adr1', EMBLEM_SIZE, 2, EMBLEM('A thick heavy stone slab split by one bold jagged crack running down its middle.')],
  ['icons', 'skill-adr7', EMBLEM_SIZE, 2, EMBLEM('A bold thick circular arrow loop with one segment of the ring broken away, leaving a gap.')],
  ['icons', 'skill-adr3', EMBLEM_SIZE, 2, EMBLEM('Two thick blunt arrows pointing straight at each other and meeting head-on in the middle.')],
  ['icons', 'skill-adr5', EMBLEM_SIZE, 2, EMBLEM('One bold chunky lightning bolt.')],
  ['icons', 'skill-line-estimates', EMBLEM_SIZE, 2, EMBLEM('A thick chunky hourglass with a heavy frame top and bottom.')],

  ['icons', 'skill-signoff', EMBLEM_SIZE, 2, EMBLEM('A chunky wooden rubber stamp pressing down, with a bold tick mark on its face.')],
  ['icons', 'skill-adr2', EMBLEM_SIZE, 2, EMBLEM('A thick rounded test tube with one bold heavy diagonal bar struck straight through it.')],
  ['icons', 'skill-debtInterest', EMBLEM_SIZE, 2, EMBLEM('One bold fat arrow pointing steeply upward at a sharp angle.')],
  ['icons', 'skill-goldenValue', EMBLEM_SIZE, 2, EMBLEM('Three thick concentric rings nested inside one another, each much fatter than the last.')],
  ['icons', 'skill-escalation', EMBLEM_SIZE, 2, EMBLEM('One chunky rounded flame with thick bold curves.')],
  ['icons', 'skill-spare-cog-broken', EMBLEM_SIZE, 2, EMBLEM('A thick chunky cogwheel broken cleanly in half, the two halves pulled slightly apart.')],
  ['icons', 'skill-line-spawn', EMBLEM_SIZE, 2, EMBLEM('Two identical thick rectangular sheets of paper lying overlapped and offset from each other.')],
  ['icons', 'skill-spare-fork', EMBLEM_SIZE, 2, EMBLEM('One thick heavy line splitting into two fat prongs, with a round dot at the end of each.')],
  ['icons', 'skill-spare-calendar', EMBLEM_SIZE, 2, EMBLEM('A chunky tear-off calendar page with a thick binding at the top and one bold circle drawn on it.')],

  ['icons', 'skill-seniorSpeed', EMBLEM_SIZE, 2, EMBLEM('A thick chunky coffee mug seen straight on with a wide handle and three curls of steam above it.')],
  ['icons', 'skill-seniorReach', EMBLEM_SIZE, 2, EMBLEM('One chunky broom with a thick handle and a wide fat brush head, seen from the side.')],
  ['icons', 'skill-assurance', EMBLEM_SIZE, 2, EMBLEM('A thick stack of paper sheets with one enormous bold checkmark laid across the whole stack.')],
  ['icons', 'skill-timesheets', EMBLEM_SIZE, 2, EMBLEM('A thick clipboard with a heavy clip at the top and three bold ruled lines on it.')],
  ['icons', 'skill-spare-compass', EMBLEM_SIZE, 2, EMBLEM('A bold round compass with a thick diamond-shaped needle pointing across it.')],
  ['icons', 'skill-senior', EMBLEM_SIZE, 2, EMBLEM('One thick classical stone column with a wide heavy capital on top and a wide base.')],
  ['icons', 'skill-golden', EMBLEM_SIZE, 2, EMBLEM('One chunky crown with three fat points and a thick band.')],
  ['icons', 'skill-seniorPresence', EMBLEM_SIZE, 2, EMBLEM('One chunky fire extinguisher with a thick body, a fat nozzle and a heavy handle.')],

  ['icons', 'skill-adr4', EMBLEM_SIZE, 2, EMBLEM('A blocky square robot head seen straight on, with two big glowing rectangular eyes and one short antenna.')],
  ['icons', 'skill-spare-books', EMBLEM_SIZE, 2, EMBLEM('A thick stack of four heavy books lying flat one on top of another, seen from the side.')],
  ['icons', 'skill-adr8', EMBLEM_SIZE, 2, EMBLEM('Five small blocky robot heads clustered tightly together in a group.')],
  ['icons', 'skill-deck', EMBLEM_SIZE, 2, EMBLEM('A thick fan of three playing cards held spread out, seen straight on.')],
  ['icons', 'skill-stretch', EMBLEM_SIZE, 2, EMBLEM('One fat round balloon on a short thick string, stretched and over-inflated.')],
  ['icons', 'skill-spare-magnifier', EMBLEM_SIZE, 2, EMBLEM('A bold thick magnifying glass with a heavy round rim and a fat handle.')],
  ['icons', 'skill-kit', EMBLEM_SIZE, 2, EMBLEM('A chunky computer keyboard seen straight on, with one oversized key raised in the middle of it.')],
  ['icons', 'skill-o7', EMBLEM_SIZE, 2, EMBLEM('One chunky pair of headphones with fat round ear cups and a thick headband.')],
  ['icons', 'skill-relabel', EMBLEM_SIZE, 2, EMBLEM('A thick angled price tag with a fat round hole at its narrow end and a bold arrow on its face pointing up.')],

  ['icons', 'skill-o2', EMBLEM_SIZE, 2, EMBLEM('A thick ring binder standing upright seen straight on, with three fat tabbed dividers sticking out of the top.')],
  ['icons', 'skill-duration', EMBLEM_SIZE, 2, EMBLEM('One chunky bus seen square from the front, with a big windscreen and two fat round headlights.')],
  ['icons', 'skill-o6', EMBLEM_SIZE, 2, EMBLEM('One bold sun with a fat round centre and eight thick triangular rays.')],
  ['icons', 'skill-o4', EMBLEM_SIZE, 2, EMBLEM('Two identical thick upright server tower cabinets standing side by side, each with rows of small lights.')],
  ['icons', 'skill-coaches', EMBLEM_SIZE, 2, EMBLEM('One bold thick circular loop arrow with a small simple human figure standing inside the ring.')],

  ['icons', 'skill-manager', EMBLEM_SIZE, 2, EMBLEM('A chunky briefcase with a thick handle and two big clasps, seen straight on.')],
  ['icons', 'skill-managerSpeed', EMBLEM_SIZE, 2, EMBLEM('One chunky golf flag on a thick pole standing in a round hole, flag flying out to the side.')],
  ['icons', 'skill-juniorReach', EMBLEM_SIZE, 2, EMBLEM('One chunky measuring tape pulled far out of its fat round case, the thick blade stretching away.')],
  ['icons', 'skill-secret', EMBLEM_SIZE, 2, EMBLEM('A pair of two fat round cherries joined on one thick curved stem, with a single broad leaf.')],

  ['ground', 'ground-0', GROUND_SIZE, 1, GROUND('Clean well-kept dark charcoal blue-grey office carpet, evenly laid, uniform fine speckled weave in cool grey and slate. Nothing wrong with it at all.')],
  ['ground', 'ground-1', GROUND_SIZE, 1, GROUND('Old dark blue-grey office carpet from decades ago, the weave flattened and polished into dull traffic paths, the dye faded unevenly to a tired grey-brown in patches.')],
  ['ground', 'ground-2', GROUND_SIZE, 1, GROUND('Dark slate grey carpet tiles laid in an obvious repeating square grid, every tile identical, with visible seams between them and the pile of alternating tiles running in opposite directions.')],
  ['ground', 'ground-3', GROUND_SIZE, 1, GROUND('Mismatched dark carpet tiles from different dye lots butted together, some cool grey and some browner, the squares not quite lining up, a few laid at the wrong angle.')],
  ['ground', 'ground-4', GROUND_SIZE, 1, GROUND('Dark grey office carpet with a faint iridescent oily sheen soaked deep into the fibres in soft irregular blotches, pale lilac and sickly green shimmering wrongly in the weave.')],
  ['ground', 'ground-5', GROUND_SIZE, 1, GROUND('Scuffed dark grey-brown office carpet covered in overlapping dark drink rings, ground-in stains and small scorched cigarette burns, the pile worn bald in ragged patches.')],
  ['ground', 'ground-6', GROUND_SIZE, 1, GROUND('Abandoned dark brown-grey carpet under a thick even layer of settled grey dust, with large pale water stains and tide marks dried into the fibres and faint mould speckling.')],
  ['ground', 'ground-7', GROUND_SIZE, 1, GROUND('Carpet torn up and gone in ragged patches, exposing rough dark grey concrete subfloor, crumbs of dried adhesive, old tack strips and stripes of lifted brown tape.')],
  ['ground', 'ground-8', GROUND_SIZE, 1, GROUND('Dark red-brown carpet buried under a dense even drift of shredded paper confetti trodden deep into the pile everywhere, countless tiny pale paper flecks in every square inch.')],
];

const groups = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const force = process.argv.includes('--force');

if (process.argv.includes('--list')) {
  const seen = new Map();
  for (const [group] of ORDER) seen.set(group, (seen.get(group) ?? 0) + 1);
  for (const [group, n] of seen) console.log(`${group.padEnd(9)} ${n} prompts`);
  process.exit(0);
}

const staged = new Set(
  (await readdir(STAGING).catch(() => [])).map((f) => f.replace(/\.\d+\.png$/, ''))
);

const todo = ORDER.filter(([group, name]) => {
  if (groups.length && !groups.includes(group)) return false;
  return force || !staged.has(name);
});

console.log(`${todo.length} of ${ORDER.length} prompts to render.\n`);

for (const [group, name, size, takes, prompt] of todo) {
  console.log(`\n═══ ${group}/${name} ═══`);
  const code = await new Promise((res) => {
    const p = spawn('node', [GEN, prompt, `--name=${name}`, `--size=${size}`, `--takes=${takes}`], {
      stdio: ['ignore', 'inherit', 'inherit'],
    });
    p.on('close', res);
    p.on('error', () => res(1));
  });
  if (code !== 0) console.error(`!! ${name} exited ${code}`);
}

console.log('\nBatch done.');

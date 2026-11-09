# Adding an island

Each island is a package. The shared systems (the world, the session, the flow, the chart, residency,
the compass, the tools) read one list of islands, the **island registry**
(`src/islands/registry.ts`). They do not name an island. To add an island, you write its package and
add one line to the registry (and one line to the tools' list). This page tells you what the package
must give.

Read these first:

- `.github/skills/isles-threejs-practices/SKILL.md`: the rules for world building (§1 seams, §3 warm-ups,
  §4 residency and GPU owners).
- [adding-a-course.md](adding-a-course.md) and [specs/COURSE-PACKS.md](specs/COURSE-PACKS.md): all
  course words go in the course pack, not in the island's code.

## 1. The parts of an island

| Part | Where | What it holds |
| --- | --- | --- |
| Registry entry | `src/islands/<id>.ts` | Data that the title and the course split can load: the berth, the arrival, the sky, the gate, the ranges, the outline, the starfish, the course board, the chart miniature, the theme, the terrain regions, the flora palette, the puzzles, the market stall, the course data its stream waits for. |
| Island code | `src/game/<id>-island.ts` | One module that the entry loads with a dynamic `import()`: the stream, the quests, the walks, the content, the routes, the chests and the cast. Vite makes it a chunk of its own. |
| World package | `src/world/islands/<id>/` | Layout data, height, terrain regions, flora, silhouette, the stream, the town or village. |
| Content | `src/game/<id>-session.ts` | The cast, chests, sites, puzzles and set pieces in the play session. |
| Course pack | `courses/<id>/` | Every course word: quests, scripts, barks, pages, quizzes, labels, voice. |

Keelhaven (`src/islands/keelhaven.ts`, `src/game/keelhaven-island.ts`, `src/game/keelhaven-session.ts`,
`src/world/islands/keelhaven/`) and Thousand-Bough Isle (the same files under `thousand-bough`) are
the examples to copy. Port Meridian is older: its stream and its code do not use the shared helpers
(sections 3 to 5).

Build the world package from the shared builders, so a new island adds data and no new shader:

| Builder | Where | Use it for |
| --- | --- | --- |
| Village kit and pieces | `src/world/village/kit.ts`, `pieces.ts` (`meshesFromBuckets`) | Timber, rope, stone and glass into the kit's material buckets, merged into chunks with index levels of detail. |
| Houses | `src/world/village/house-builder.ts` (the kit's European houses), `veranda-house.ts` (Caribbean houses) | A town. `tintFor` gives the paint that reads as the colour you want over a kit texture. |
| Wrecks | `src/world/wreck/` (`WreckDesign`) | Wrecked brigantines in the ship's look: a pose, holes, rig, a broken half. Keelhaven's are `src/world/islands/keelhaven/wrecks.ts`. |
| Mist | `src/world/mist/mist-cards.ts` | Valley mist and fall spray: one look for every island. |
| Plants | `addIslandPlants(…, look)` (`src/world/island-parts.ts`), `PlantPatchLook` | The island's plants as a patch of the world's vegetation, with an optional look (bark simplify, impostor handoff, tints). |
| Rocks | `src/world/terrain/rock-assets.ts` with `createRockMaterial`, instanced | Boulders and stream stones (Thousand-Bough's and Keelhaven's `rocks.ts`). |

Keelhaven's world (`src/world/islands/keelhaven/index.ts`, `createKeelhavenWorldAsync`) is built but
not yet in the game: it's in `ISLANDS_IN_BUILD` only, and the terrain dev page shows it
(`devpages/terrain.html?pack=keelhaven`, `?sil` for its far silhouette).

## 2. The registry entry (`IslandEntry`, `src/islands/types.ts`)

Keep the entry small. The title loads the registry (the chart asks which islands are open), and the
course pack split reads it in Node and in the Vite config (the puzzle list). So the entry imports
only data: the island's layout (no three.js objects, no terrain code), its starfish, its terrain
regions (TSL masks), and its flora palette. Put layout data in a file of its own
(`meridian-layout.ts`, `thousand-bough/layout.ts`). Reach code through a dynamic import (`code`,
`chart.terrain`).

| Field | What it is |
| --- | --- |
| `id`, `name`, `flag` | The id (the same id in the course pack), the name, and the URL name: `?<flag>` opens the island in a built game, and `?no<flag>` leaves it out of the world. |
| `berthLabel`, `dockLabel`, `mooring`, `landingHeading`, `quay` | Where the ship moors, the compass and dock labels, and the fast-travel spot on the quay. |
| `music`, `sky`, `mood` | The music cue (the island's id; its track is `theme`), its time of day (solar hours and the sun path's rotation), and its air (fog and haze). |
| `arrival` | The first-landfall flyover (`IslandArrival`, `src/islands/arrival.ts`). Test its clearance. |
| `contains(x, z)`, `center`, `skyReach` | Which waters are the island's (`islandAt`), the middle of its land, and how far its light goes over the sea (`passageSky`). |
| `open` | The gate (`src/islands/open.ts`). `{}`: open in the dev build and with `?<flag>`. `{ after: { island, condition: 'sealed' } }`: also open once that island's Seal is won. |
| `ranges` | `load`, `show`, `unload` and `detail` in metres (`footprintDistance`). Keep `show` < `load` < `unload`. Keep `unload` less than the distance to the next island's berth, so the island is freed while you are there. |
| `footprint` | The outline, 32 bearings (`measureFootprint`). Add it to `island-silhouettes.test.ts`. |
| `starfish`, `courseBoard`, `chartLabelDy` | The starfish to find, where the course notice board stands, and the name's offset on the opening's 3D chart. |
| `chart` | Its miniature on the opening's 3D chart: position, scale, the sampled box and cell, the terrain pack, and `terrain()`, a dynamic import of its height and masks (`<id>/chart.ts`). |
| `theme` | Its music track (`{ file, lufs }`). `MUSIC_TRACKS` comes from it. |
| `terrainRegions`, `floraPalette` | Where its ground looks different (TSL masks for the shared terrain material) and its grass and flower palette (for the shared flora graphs). |
| `puzzles` | The puzzles on it, by the course pack's file name, and the mechanic each runs. `GAME_PUZZLES` and `PUZZLE_ISLANDS` come from it, so the course split puts their content in the island's chapter part. |
| `market` | Its Model Market stall's keeper (`{ keeper: { npc, name }, lines }`), if it has one. |
| `stream` | `{ nearLoads, reflected, courseData }`. `nearLoads: 'in-course'` streams the island in by distance only when the course uses it. `reflected: false` when the harbour mirror cannot see it. `courseData: 'chapter-part'` makes the stream wait for the island's chapter part of the course pack (`loadIslandPart`, src/course/load.ts) with its terrain, so its quests, scripts and puzzles are in before its content is made. `depthTile: true` when its shallows are outside the home ocean tile (`WATER_DEPTH_BOUNDS`): the stream builds its own floor tile with `createIslandDepthTile` (src/world/islands/depth-tile.ts) and lends it while the island is in memory, first when its warm-up holds it. |
| `code` | `() => import('../game/<id>-island').then((m) => m.<ID>_CODE)`. Use a dynamic import only. A static import of the same module makes the import ineffective (Vite shows `INEFFECTIVE_DYNAMIC_IMPORT`). |

While the island's world is still being built (before its package can run in the game), put only
its terrain regions in `ISLANDS_IN_BUILD` (an `IslandInBuild` in `src/islands/<id>.ts`), so the dev
terrain page draws its bake with its looks. Keelhaven is there now.

The course pack can hold the island's content before its package is done: its chapter, its quests,
its puzzles, its app tasks and its voice lines (`"pending": true`). The game leaves that content out
until the island is in the registry, and the content check holds it to everything but the game's side
of the contract ([content-data.md](content-data.md), "Content ahead of its island"). Keelhaven's
Chapter 03 content is written so: its wiring contract is in
[ISLAND-03-keelhaven.md](specs/ISLAND-03-keelhaven.md#wiring-contract).

Then, when the package is done, add the **one registry line** in `src/islands/registry.ts` (and take
the island out of `ISLANDS_IN_BUILD`):

```ts
export const ISLAND_REGISTRY = {
  anchorage: ANCHORAGE,
  meridian: MERIDIAN_ISLAND,
  'thousand-bough': THOUSAND_BOUGH_ISLAND,
  keelhaven: KEELHAVEN_ISLAND, // the new line
} as const satisfies Readonly<Record<string, IslandEntry>>;
```

The order is the voyage order. `IslandId` comes from this object. When you add the line, TypeScript
shows each table that still needs a row for the new island (section 6).

## 3. The island code (`IslandCode`, `src/game/island-code.ts`)

| Field | What it does |
| --- | --- |
| `stream(ctx)` | Makes the island's stream (`IslandStream`, `src/world/islands/island-stream.ts`). `ctx.island` is the registry entry: read the ranges, the outline and the centre from it. |
| `quests` | The quest line as the session reads it: `log`, `tracker`, `target`, `current`, `optionalTargets`, `hintTask`, and `sailHere` (the compass sends you here once the island before is done). |
| `walk(ctx)` | The walk surfaces, the colliders that stand from the start, and the water that you can wade (`inland`). Read the streamed world through `ctx.stream` or the content through `ctx.content()`: both are live only after the island streams in. |
| `content(host)` | Makes the island's content (section 5). |
| `ways` | Its walk graph ashore and its sea lanes, for the compass, the crew and Unstuck. |
| `chests` | The ids of the chests and message bottles that the island places. The course pack fills them. |
| `cast(anchors)` | Every NPC that can be on the island, with all extras. The content check uses it. |

Make it with `streamedIslandCode` (`src/game/streamed-island-code.ts`). You give the island's id, its
stream, its quest functions, its bounds, its content and its market stall. The function adds what
every streamed island shares: the task list that points on to the next island, the hint task,
`sailHere` (from the gate in the registry entry) and the walk surfaces that read the content. Name
the island's world type once (`streamedIslandCode<MyWorld, MyContent>`): then `setup(world)` and
`market(world)` are typed, and you need no casts. Keelhaven's `src/game/keelhaven-island.ts` is the
example to copy.

## 4. The stream (`src/world/islands/<id>/stream.ts`)

Make the stream with `createStreamedIsland(ctx, spec)` (`src/world/islands/streamed-island.ts`). Do
not write the lifecycle again. The spec holds only what is the island's own:

- `silhouette`: the far shape. The world waits for it before its warm-up.
- `terrain`: the island's terrain options (fresh water, prefilter, a pin or a skin). It can make
  something first, a slice a breath (Keelhaven's apron).
- `afterTerrain`: work on the built terrain before anything draws it (Thousand-Bough's Lite rocks).
- `foam` and `seaFloor`: the coast foam's options, and a sea floor that the bake does not hold.
- `world`: builds the town or village on the terrain. It must have `group`, `shipObstacles()`,
  `plants()`, `frame(camera)`, `update(dt, t)` and `dispose()` (`StreamedWorld`).
- `flora`, `plantLook`, `flocks`, `onFlock` and `mood`: its plants, its birds and its air.

The shared stream does the rest: it loads the terrain pack `<id>/terrain` with the course data, adds
the parts hidden in a fixed order, takes back what a failed or abandoned load added, shows and hides
the island by range, swaps it with the silhouette, lends the depth tile, and frees a part a frame.
Keelhaven's `stream.ts` is the example to copy. Port Meridian's stream is older and has its own
lifecycle (`src/world/islands/meridian-stream.ts`): do not copy it.

The world (`IslandStream.world`) is what the content builds on (the town, the tree village).

## 5. The content (`IslandContent`, `src/game/island-code.ts`)

The session makes one content object for each streamed island when the voyage starts. It calls
`setup(world)` each time the island streams in, and `teardown()` before the island is freed.

- Use only the host (`IslandContentHost`): the walker, the camera, the HUD fades, chests, puzzles,
  cues, interactions, the ship and the sea host. Do not import `session.ts`.
- `setup` builds the cast, the chests, the message bottles, the sites and the puzzles, all hidden. It
  returns their roots and a `reveal`. The flow warms the roots, then calls `reveal`. Return no roots
  when the world went again or the session ended.
- Add them through a site (`createIslandSite(host)`, `src/game/island-site.ts`): `site.colliders`,
  `site.cast`, `site.chest`, `site.bottles`, `site.interaction` and `site.puzzle`. The site keeps what
  it adds.
- `teardown` calls `site.clear()`, which removes all of that: colliders, interactions, puzzles,
  chests, the cast and the bottles. Stop the island's own sounds and set pieces there too. The next
  `setup` reads the save again.
- Whatever the player can see after a reload comes from the save, not from scene objects.
- The session adds the course notice board and the Model Market stall (`market(world)`) for you.
- Optional hooks: `busy()` (a ride holds residency), `ride()` (each frame of a ride), `onBoard()`,
  `onLand()`, `moored(on)` (mooring lines), `speaker(name)` (a character who speaks aboard),
  `bottles()`, and `debug` (test hooks: `session.debug.island(id)` returns them).
- Never write a quest id. Ask the island's story by name (`storyHolds`, `storyEvent`), and read a
  puzzle's quest with `puzzleQuest()`.

## 6. What is not in the registry

Only these still need a line outside the island's package. TypeScript asks for the first two when you
add the registry line.

| Table | Where | Why it is not in the registry |
| --- | --- | --- |
| `STORY_CONDITIONS`, `STORY_EVENTS` | `src/game/story.ts` | The story's typed contract with the course pack: game code asks for `StoryCondition<'<id>'>` names, and TypeScript checks each name. Generic code (`storyHolds(island, 'sealed')`) makes TypeScript ask for the island's row. |
| `NPC_IDS` and the cast specs | `src/world/characters/` | The character library (rigs, palettes, props). |
| A sea battle | `src/world/battle/battle.ts`, `src/game/battles.ts` | A battle is on the passage between two islands, not on one. |
| Signs with course words | `ISLAND_SIGNS` in `src/course/pack.ts` | Course data (optional). |
| The chart place | `src/ui/chart/archipelago.ts` | All eight islands are on the chart already ("coming soon" data). |

## 7. The tools

- Add the island to `tools/lib/islands.json`: id, URL flag, name, the terrain and silhouette object
  names, and the tools' data for it (`budget`: budgettest's box and heavy spots; `decks`: cameratest's
  walk surfaces above the ground; `perf`: perftest's views; `flicker`: flickertest's views).
  `src/islands/registry.test.ts` fails until it matches the registry.
- The tools read that list: `budgettest`, `memorytest`, `perftest`, `cameratest`, `wayfindtest`,
  `flickertest`, `starfishtest` and `audiotest`.
- Scripted routes (the audio route, the wayfinding story path) name the islands in voyage order. Add
  the new leg.

## 8. Check your work

```bash
npm run typecheck && npm run lint && npm run format:check && npm test
npm run content:check && npm run content:check -- --course=copilot-cli && npm run course:drift
npm run build && npm run check:budgets && npm run check:secrets
npm run bake        # the other islands' hashes do not change
```

Then, on a no-HMR dev server, run the play tests and the gates in the skill's §6:
`check:frame-budgets`, `check:memory`, `cameratest`, `check:perf`, `check:opening`, `check:audio`, and the
program census for each tier. After the build, look for the island's own chunk
(`dist/assets/<id>-island-*.js`) and for `INEFFECTIVE_DYNAMIC_IMPORT` in the build output.

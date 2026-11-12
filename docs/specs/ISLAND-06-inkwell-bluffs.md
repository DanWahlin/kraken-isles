# Spec: Island 06, Inkwell Bluffs (Chapter 06 · Canvases)

> Status: **in build** (2026-11-11; §12 says what is done and what is left). A design spec with every
> decision made, in the form of [ISLAND-05](ISLAND-05-sunspire-sands.md), whose package, shared
> builders and tools it reuses. It does not repeat what that spec, [ISLAND-04](ISLAND-04-guildcrest.md)
> and [adding-an-island](../adding-an-island.md) already say. Read
> [PHASE-3](PHASE-3-islands-05-07.md) first: the arc, the toys, the gates and the build order.
>
> Course source: `github/copilot-app-for-beginners` at `8cb2792`, `06-canvases/README.md`.
> Written in ASD-STE100 Simplified Technical English. A build step that finds a decision wrong
> records the change and its reason in §12 ("As built"). It does not stop to ask.

---

## 0. Decisions

| # | Decision | Why |
|---|---|---|
| I1 | **Site:** centre `C = (7170, 6215)`. Frame as Sunspire's: `u` along bearing 143° (the cove's mouth → inland), `v` along bearing 53°. Baked bounds x 6540…7800, z 5560…6870, cell 2 m (631 × 656) | 2 900 m from Sunspire on bearing 168°: 65° off the wind (from 233°), a close reach, no tacking. The ship comes straight into a cove that opens north-west, as at Sunspire. Sunspire (`unload` 1550) is freed while you play here. The chart is a drawn layout, so the island keeps its chart place |
| I2 | **The harbour is Sunspire's cove:** the same stations, quay, berth, lane and turning-room numbers | Entry and exit are beam reaches (issue 292). The numbers are proven by two islands' tests |
| I3 | **The layout is not Sunspire's.** The town climbs three terraces from the quay to a plaza on the bluff's rim. The route then follows the cliff's edge (the Kite Walk) to the Great Chart and the Dome | Two islands with one plan would feel like one island with new paint. Here the town is a stair, and the walk is along a sea cliff |
| I4 | **Sky: golden hour, the same day.** `hours` 18.3, no cut on the passage. Sun bearing target **262°** (tune `azimuth`). `mood` `{ fogScale: 1.1, hazeTint: [1.0, 0.9, 0.78] }` | The town's fronts face the cove (south-west), so a low western sun turns the white walls gold. From the landing the sun is behind you: the bluffs and the Dome are lit, not black shapes |
| I5 | **One weenie: the Surveyor's Dome.** A white round observatory light on the highest bluff: drum base y 54, lamp gallery y 70, cobalt dome to y 80, a brass quill weathervane to y 88 that turns with the wind. It is the island's lighthouse (`lampBurning`) | PHASE-3 E3 |
| I6 | **The signature toy is the Shared Chart** (P6.3): a chart of the isles laid in the floor of a court, 30 m × 22 m, with a brass rail of five stage posts, four bell pulls and a slate rack. Its `dial` is the brass stage marker | PHASE-3 §5 |
| I7 | **Three circuits:** `board` (P6.1 The Borrowed Board, 6 stations at 5 places), `slate` (P6.2 Two Hands, One Chart, 5 stations at 5 places), `chart` (P6.3 The Shared Chart, 8 stations at 6 places). Added to `CIRCUIT_PLACES` and the schema's enum | Chapter 06 has three exercises, each a step up from the one before |
| I8 | **Eight quests at seven stops, course order, one direction,** plus the optional assignment. Longest gap 140 m (the Kite Walk, with a chest, a bottle and the kite flyers on it) | ISLAND-04 G9 |
| I9 | **Six "Do this in the app" cards** (A6.1–A6.6). No GitHub checks | The chapter's core path opens no pull request. The GitHub challenge in the assignment is optional |
| I10 | **Ids:** island `inkwell`; quests `Q6.1`–`Q6.8`, `Q6.A`; cards `A6.1`–`A6.6`; checks `K6.x`, `M6.1`, `H6.1`–`H6.3`; Trial `T6`; pages `pg6.*`; chests `C6.1`–`C6.3`; bottles `B6.1`–`B6.4`; puzzles `borrowed-board` (P6.1), `two-hands` (P6.2), `shared-chart` (P6.3), `board-song` (Lyra's ceremony); battle `passage-sunspire-inkwell` | The chart and `course.json` already use `inkwell` |
| I11 | **White rock uses the existing `bluff` region** (warm limestone with scrub). No new terrain key | ISLAND-04 G12: a new key changes the shared terrain graph |
| I12 | **Plants:** cypress and pine (existing species) on the bluff tops and the valley; olive (the broadleaf tree, small, grey-green tint); bougainvillea (the flower bush, magenta tint) at walls and arches; scrub. Flowers are flora rows: red poppy `#D8402C`, chamomile `#F4F0E0`, sea lavender `#8E7CC3`, yellow broom `#E8C440` | No new material |
| I13 | **Buildings:** whitewashed cubes with flat roofs, blue doors and shutters, and a blue dome on one in five, from the village kit's plaster and stone buckets with `tintFor`. Pergolas and washing lines in timber and cloth | No new material |
| I14 | **No fresh water.** The sea is on three sides of the route; the town has a fountain basin (built, still) | The Kite Walk gives the island its water view. A stream would add a material's work for little gain |
| I15 | **Birds:** gulls over the cove and along the cliff (two flocks) | PLAN §6 |
| I16 | **Lyra** plays under the taverna's pergola and retells "The Band's Arrangement Board". **Kosta** keeps the Model Market stall on the quay | PLAN §3; MODEL-MARKET §2 |
| I17 | **Voices** as ISLAND-04 G22. Lines stay `"pending": true` until their audio exists | PHASE-3 §9 |
| I18 | **Music:** "Inkwell Waltz" (`music_inkwell_waltz`, 150 s, −16.0 LUFS), made by Dan with Suno from the brief in PHASE-3 §8. In the game since 2026-11-11 | PHASE-3 E10 |
| I19 | **Battle 6** on the Sunspire → Inkwell passage: battle 5's form, questions N5.1–N5.3 (Chapter 05) | PHASE-3 §6.3 |
| I20 | **Arrival card:** eyebrow `Chapter 06 · Canvases`, title `Inkwell Bluffs`, line `Keep the work where you both can see it` | The chapter's opening question |

---

## 1. Teaching map (Chapter 06)

Folder `06-canvases`. Anchors are the slugs `src/learn/course/sections.ts` makes. Hashes come from
`lock.json`. Images are `ch06/<file-without-extension>`.

| # | Anchor | What it teaches | Images | UI names |
|---|---|---|---|---|
| 1 | `learning-objectives` | Four objectives; ~70–90 minutes | — | — |
| 2 | `prerequisites` | Chapter 05. Exercise 1 installs a community plugin; if you cannot, read it and go on to Exercise 2. Prepare a session; run `npm install`, `npm test -- --run`, `npm run build`; note the test totals: the canvas uses them as its baseline | — | **Create from**, **Branches**, **Interactive**, **Default agent**, **Terminal** |
| 3 | `from-the-studio-the-bands-arrangement-board` | A band can argue in a long group chat, where decisions get buried, or use a shared arrangement board. A canvas is the app's arrangement board for human-agent work | `arrangement-board-canvas` | — |
| 4 | `a-canvas-is-a-shared-control-panel` | **Bidirectional**: you and the agent both change one board. Copilot adds steps; you uncheck one or write "pause before edits"; Copilot continues from your update. The terms table: agent-callable action, user scope, local-only UI, event, polling, timeout | `human-agent-shared-surface` | — |
| 5 | `built-in-work-surfaces-come-first` | **Plan**, **Terminal**, **Browser** and **Changes** come with every session. A canvas adds one more surface that you design for the task | — | **Plan**, **Terminal**, **Browser**, **Changes** |
| 6 | `when-to-use-a-canvas` | Chat for a quick answer to a short task. A canvas when the work has state to keep visible, steps that repeat, or controls that both use | `chat-vs-canvas` | — |
| 7 | `exercise-1-try-your-first-canvas` | Awesome GitHub Copilot; **Open in Copilot app**; **Install plugin?** → **Allow**; confirm the name `accessibility-kanban@awesome-copilot` → **Install**; **Customize** → **Installed** → **Plugins**; the prompt `Restart canvas extensions`; **+** (**Add tab**) → **Canvas** → **Repository Issues Kanban** (the package name is not the name shown); move one card to **Plan**: a background agent plans it, reads but does not edit, and the card moves to **Ready** | `app-repo-issues-kanban`, `app-open-repo-issues-canvas` | **Open in Copilot app**, **Allow**, **Install**, **Customize**, **Installed**, **Plugins**, **+**, **Add tab**, **Canvas**, **Repository Issues Kanban**, **Plan**, **Ready** |
| 8 | `exercise-2-create-a-session-board` | `/create-canvas` and the Session Board prompt (proposal field; checklist Plan, Implement, Validate; notes with Next decision and Blocker; both update; no repository files, commands or GitHub writes). Mark **Plan** complete; ask `Summarize the current Session Board state.`; **Changes** lists no files | `session-board-collaboration` | **Plan**, **Changes** |
| 9 | `exercise-3-create-a-feature-workbench` | The Feature Workbench prompt and its plain-language table. Five stages: **Propose**, **Plan**, **Baseline**, **Implement**, **Validate**. No Approve stage: approval is in the **Plan** tab. One **Generate plan** button; eight checklist items; five actions; an empty evidence area. Repair prompts (one for each fault; no full regeneration; two repairs, then the fallback). The run: **Working** → do not select **Approve and implement this plan** → **Exit plan mode and I will prompt myself** → **Approved** → **Run baseline** (**Autopilot**, then back to **Interactive**; compare totals with the tool output) → **Implement** (the **Changes** pill) → **Browser validation** (five states; stop the dev server) → **Run final checks** (final total ≥ baseline) | nine images | many (the lock's `terms`) |
| 10 | `markdown-fallback` | `feature-workbench.md` as a Markdown artifact, not in the repository; update an item only after matching terminal, diff or browser evidence | — | **Files** |
| 11 | Troubleshooting: eleven anchors | Each a problem and its fix | — | — |
| 12 | `key-takeaways` | Four takeaways (the Trial maps them) | — | — |
| 13 | `assignment` | Add an **Assess** stage after **Propose** with a focused change request; run it through; each completed stage has evidence from the current session. Optional GitHub challenge | shared `assignment` | — |
| 14 | `whats-next` | Chapter 07: automations | — | — |

### 1.1 The metaphor, object by object

| Course object | Inkwell object | The rule it carries |
|---|---|---|
| A long chat thread | **The Gossip Stair**: notes pinned on lines across the stair street, three terraces deep | Decisions get buried. Good for a quick answer |
| A canvas | **A chart on a table** that captain and mate both mark | Both sides change one board, and the work's state stays in view |
| **Plan**, **Terminal**, **Browser**, **Changes** | **The four instrument desks** at the plaza's corners | They come with every session. A canvas adds one more surface |
| A community canvas from a plugin | **The visiting guild's board** in the loggia | Try the interaction model before you build your own |
| `accessibility-kanban` and **Repository Issues Kanban** | The crate's stencil and the board's painted name | The package name is not the name the app shows |
| `Restart canvas extensions` | **The loggia's bell** | The app reads the new board only after the bell |
| One card moved to **Plan** | One card hung on the Plan hook; a runner goes out and the card comes back on **Ready** | Each card there starts a new agent run. Move one |
| The Session Board | **The draughting slate** on the terrace | A shared checklist: it does not run tests or edit the app |
| User scope | The slate goes in your own sea chest | It is not committed to the repository: **Changes** lists no files |
| The Feature Workbench | **The Great Chart** | A reusable board for the local inner loop |
| The progress rail | **The brass rail** with five posts | Propose → Plan → Baseline → Implement → Validate. No Approve post |
| Canvas buttons | **Bell pulls**: each sends a surveyor | Every button is an agent-callable action |
| Evidence | **The surveyor's slate**, hung on the rack | A stage is marked only from recorded evidence, never chat inference |
| Final total ≥ baseline | The last sounding is not shallower than the first | The total can go up when the agent adds tests |
| The Markdown fallback | **A paper chart** in the chart tube | The same record without bell pulls |

---

## 2. Art direction

- **The story the land tells:** a white town climbs from a blue cove to the mapmakers' plaza on the
  cliff's rim. Along the rim, where the surveyors fly their kites, the way leads to the Great Chart
  and the Dome above it. **Port → the stair → the plaza → the cliff walk → the chart → the Dome.**
- **Look in one sentence:** golden hour on white sea cliffs: whitewashed cubes with cobalt doors and
  domes stepping up three terraces, magenta bougainvillea on every wall, charts drying on lines, dark
  cypress on green bluff tops, and one white tower with a blue dome and a brass quill catching the sun.
- **Palette:** chalk `#F2EDE2`, chalk shade `#C9BFA8`; whitewash `#FBF7EE`; cobalt `#2C5C9A`, sky
  blue `#5E8FC8`; bougainvillea `#C2337A`; terracotta pots `#C0683C`; cypress `#2F4A34`; olive
  `#7C8A5A`; turf `#6E9A4E`; brass `#D0A040`; chart parchment `#E9DDBF`; ink `#2A2E48`. Saturated
  colour only on doors, domes, flowers, kites and the Seal.
- **From the sea:** a long white cliff with a green top, a white town spilling down its near end, and
  a white tower with a blue dome at its far, highest end. Three white stacks stand off the cliff.
- **Layered depth from the berth:** quay and stall → the taverna's pergola → three terraces of white
  houses → the plaza's balustrade on the rim → cypress → the Dome → sky.
- **Kinetic:** the quill turning; survey kites over the Kite Walk; charts and washing on lines; the
  taverna's awning; gulls; the Dome's lamp; the bell pulls' surveyors' flags running up their poles.
  Reduced motion slows or stops them.
- **Delight:** the chart is big enough to walk on, and you and Juno both put pieces on it. Mark a
  stage that has no slate and the ink washes off. Hang the slate and it stays.
- **Signs use the course's exact strings:** `accessibility-kanban` (the crate's stencil),
  `Repository Issues Kanban` (the board's name), `Restart canvas extensions` (the bell's plate),
  `/create-canvas` (the easel), **Plan**, **Terminal**, **Browser**, **Changes** (the desks),
  **Propose**, **Plan**, **Baseline**, **Implement**, **Validate** (the rail's posts). Never an
  Octocat or a Copilot logo.

### 2.1 Hero shots

| Id | Shot | Must show |
|---|---|---|
| H1 | The Approach (arrival key 1) | The cove mouth, the white town on its terraces, the cliff, the Dome |
| H2 | First Look (landing) | The quay, the stall, the taverna, the terraces above, the Dome on the skyline |
| H3 | The Gossip Stair | The stair street, lines of notes, blue doors, bougainvillea |
| H4 | The Plaza | The four desks, the loggia's board, the balustrade and the cove below |
| H5 | The Kite Walk | The cliff's edge, kites, the stacks, the Dome ahead |
| H6 | The Great Chart | The floor chart, the brass rail, the bell pulls, the Dome above |
| H7 | Horizon | The island from 1 200 m: the cliff, the town, the Dome |

---

## 3. Layout (frame metres; origin `C`; heights y)

All numbers live in `src/world/islands/inkwell/layout.ts` after the build. `u` is inland from the
cove's mouth; `v > 0` is the town's side.

| Thing | Where | Notes |
|---|---|---|
| Coast | oval: centre (u 0, v −50), half-axes 420 × 260, power 2.4, noise 20 over 140 m, ragged 7 | White sea cliffs (24–50 m) all along the north-east and round the south-east; beaches on the south-west |
| The cove, quay, berth, departure, landing, lane | Sunspire's numbers | I2 |
| The taverna | (−150, 40), half 9 × 7, y 3.4 | Lyra under the pergola; chest C6.1 |
| The terraces | T1 y 3.4 (v 26–46), T2 y 10 (v 52–68), T3 y 17 (v 74–92), for u −215…−40 | White rock risers between them |
| The Gossip Stair | (−132, 42, 3.4) → (−122, 58, 10) → (−104, 60, 10) → (−94, 76, 17) → (−76, 80, 17) → (−66, 98, 24) → (−60, 106, 24) | Three flights at 35 %, two landings |
| The Washing Square | centre (−113, 60), half 10 × 7, y 10 (the first landing) | Thea; the fountain; the course board |
| The bluff | a rounded band along the north-east coast: (−60, 150, r 56, y 24) → (20, 158, r 40, y 27) → (70, 158, r 36, y 33) → (134, 140, r 46, y 38) → (170, 124, r 36, y 40) | Its sea side is the cliff. Its land side is a 12 m white wall over green slopes |
| The Plaza | centre (−46, 124), half 20 × 16, y 24 | Nikos; the four desks at its corners; a balustrade on its south-west rim |
| The Loggia | centre (−78, 134), half 8 × 6, y 24 | Calla; P6.1 |
| The Draughting Terrace | centre (−40, 156), half 11 × 7, y 24 | Petra; P6.2; chest C6.2 |
| The Kite Walk | (−26, 128, 24) → (20, 140, 27) → (70, 146, 33) → (110, 140, 38) | 138 m along the cliff, 6–12 % |
| The Chart Court | centre (134, 132), half 24 × 18, y 38 | Doran; the Great Chart; P6.3; chest C6.3 |
| The Dome Stair | (158, 126, 38) → (176, 116, 45) → (196, 112, 52) → (206, 104, 54) | Stone steps with rails |
| The Dome head | a round table: centre (214, 100), r 30, y 54 | |
| The Dome | (224, 92), radius 6.5, base 54, gallery 70, dome top 80, quill 88 | The Trial on the terrace at (204, 100), r 9 |
| The Quills | sea stacks at (60, 252, y 26), (100, 264, y 34), (150, 250, y 20), and the Old Quill by the mouth at (−350, 190, y 30) | Not walkable. Ship obstacles |
| The valley | south-west of the bluff, south-east of the cove: meadow, olives, cypress, to the long beach | Starfish and bottles |

**Route:** landing → taverna 45 m → the square 40 m (one flight) → the Plaza 95 m (two flights) →
the Loggia 30 m → the terrace 45 m → the Chart Court 140 m (the Kite Walk) → the Dome 60 m (the
stair). 455 m, one direction, plus the three laps. The Dome is in view from every stop.

**Anchors:** `landing`, `juno`, `lyra`, `lyraPlayerA`, `lyraPlayerB`, `thea`, `nikos`, `calla`,
`petra`, `doran`, `iris`, `kosta`, `islander1`…`islander8`, `seal`, and the circuits' spots.

**Collectibles:** 5 starfish (the cove's beach, the cove head, two on the long beach, one under the
quay's steps); 3 chests (C6.1 taverna, C6.2 the terrace, C6.3 the Chart Court); 4 bottles (the cove
beach, the square, the Kite Walk, the long beach).

**Hard rules** (ISLAND-04 §3.11): every anchor on a walk surface with a 3 m clear radius; the route
and every flight sampled every 0.5 m have a surface and no step over 0.45 m; rails on both sides of
every flight, and a balustrade on every rim the route passes within 4 m of.

---

## 4. Chapter beats

| Quest | Stop | Who | Course section | Check |
|---|---|---|---|---|
| — | Landing | Juno, Wingman | intro, `learning-objectives` | — |
| Q6.1 | The taverna | **Lyra** | `from-the-studio-the-bands-arrangement-board` | the board-song ceremony; K6.1 |
| Q6.2 | The Washing Square | **Thea**, keeper of the stair | `a-canvas-is-a-shared-control-panel`, `when-to-use-a-canvas` | M6.1 (the terms); K6.2 (chat or canvas) |
| Q6.3 | The Plaza | **Nikos**, desk master | `built-in-work-surfaces-come-first`, `prerequisites` | K6.3; card A6.1 (the session and the baseline totals) |
| Q6.4 | The Loggia | **Calla**, the visiting guild's envoy | `exercise-1-try-your-first-canvas` | **P6.1 The Borrowed Board**; H6.1 on `app-open-repo-issues-canvas`; card A6.2 |
| Q6.5 | The Draughting Terrace | **Petra**, draughtswoman | `exercise-2-create-a-session-board` | **P6.2 Two Hands, One Chart**; K6.5; card A6.3 |
| Q6.6 | The Chart Court | **Doran**, chief cartographer | `exercise-3-create-a-feature-workbench` (the build) | H6.2 on `app-create-canvas-screenshot`; K6.6 (repair, don't regenerate); card A6.4 |
| Q6.7 | The Chart Court | Doran | `exercise-3-create-a-feature-workbench` (the run) | **P6.3 The Shared Chart**; H6.3 on `app-feature-workbench-plan`; card A6.5 |
| Q6.8 | The Dome's terrace | **Iris**, warden of the Dome | `key-takeaways` | **Trial T6**; the Seal; the kites go up; the Dome lights |
| Q6.A | Iris (optional, after the Seal) | Iris | `assignment` | card A6.6; K6.9 |

**Story conditions** (`STORY_CONDITIONS.inkwell`): `firstVisit`, `boardBorrowed`, `slateShared`,
`chartInked`, `sealed`. After a reload the world shows them from the save: the card hangs on **Ready**
in the loggia, the slate's ticks stand, the rail's five posts are green with their slates on the
rack, the Seal's banners and kites are up.

**Cast:** Juno and Wingman (as always), Lyra and two players, Thea, Nikos, Calla, Petra, Doran, Iris,
Kosta (the stall), eight islanders (a washerwoman, a fisher, two kite flyers, a surveyor with a
staff, a painter, a child, a porter). No lines before an action longer than four. Farewell (Iris):
Chapter 07's island, where a tested routine runs by itself.

---

## 5. The three circuits

All are `circuit` puzzles. Every wrong option, position and tile has a reason and a cite.

### 5.1 P6.1 The Borrowed Board (`puzzles/borrowed-board.json`, `circuit: "board"`, quest Q6.4)

Places: `notice`, `roll`, `bell`, `frame`, `card`.

| # | Station | At | Kind | What the player does | Wrong picks teach |
|---|---|---|---|---|---|
| 1 | Take the board in | `notice` | choose | **Open in Copilot app** → **Allow** → confirm the name `accessibility-kanban@awesome-copilot` → **Install** | Installing without reading the name; a board that sounds close |
| 2 | Find it on the roll | `roll` | choose | **Customize** → **Installed**: it is under **Plugins** with its toggle on | "It installed, so it's open" |
| 3 | Ring the bell | `bell` | choose | Submit the prompt `Restart canvas extensions` | Reinstalling; `/skills reload` (that reloads skills) |
| 4 | Hang the board | `frame` | choose | **+** (**Add tab**) → **Canvas** → **Repository Issues Kanban** | Looking for `accessibility-kanban`: that is the package name |
| 5 | Move one card | `card` | choose | Drag one issue to **Plan** | Moving every card: each one starts a new agent run |
| 6 | Watch it come back | `card` | watch | A background agent reads the issue and the code, edits nothing, and the card moves to **Ready** | — |

### 5.2 P6.2 Two Hands, One Chart (`puzzles/two-hands.json`, `circuit: "slate"`, quest Q6.5)

Places: `easel`, `order`, `slate`, `mate`, `chest`.

| # | Station | At | Kind | What the player does | Wrong picks teach |
|---|---|---|---|---|---|
| 1 | Call for a board | `easel` | choose | Type `/`, select `/create-canvas`, then paste the description | Asking in chat with no command; `/skills reload` |
| 2 | Word the order | `order` | tiles | The lines that belong stick: a proposal field; a checklist with Plan, Implement, Validate; notes with Next decision and Blocker; both update; no repository files, commands or GitHub writes | Buttons that run tests (that is the next board); commit it to the repository |
| 3 | Your hand | `slate` | choose | Enter a proposal, mark **Plan** complete, add a next decision | Marking all three at once to look done |
| 4 | The mate's hand | `mate` | choose | Submit `Summarize the current Session Board state.` and compare the answer with your marks. Juno reads the slate back and adds a note | Taking the summary without comparing it |
| 5 | Where it's kept | `chest` | choose | **Changes** lists no changed files: a user-scoped canvas is not in the repository | "Commit the board"; "it's lost when the session ends" |

### 5.3 P6.3 The Shared Chart (`puzzles/shared-chart.json`, `circuit: "chart"`, quest Q6.7)

Places: `quill`, `planDesk`, `rail`, `bells`, `rack`, `glass`.

| # | Station | At | Kind | What the player does | Wrong picks teach |
|---|---|---|---|---|---|
| 1 | Propose | `quill` | choose | Paste the proposal and select **Generate plan**. The status shows **Working** | Writing the plan on the canvas yourself; leaving it in chat |
| 2 | Approve where approval lives | `planDesk` | choose | Review in the **Plan** tab; **Exit plan mode and I will prompt myself**; confirm **Interactive**. The status shows **Approved** | **Approve and implement this plan**: the agent would change the app before a baseline. "Approve on the canvas": there is no Approve stage |
| 3 | **Set the marker** | `rail` | **dial** | Slide the brass marker along five posts. One post is right: **Baseline**, the stage with no evidence yet | Propose, Plan: done, their slates hang. Implement, Validate: the ink washes off, because no slate is on the rack for the stage before |
| 4 | Send the first surveyor | `bells` | choose | Pull **Run baseline**. It runs in **Autopilot** and returns to **Interactive** | **Implement** first; **Run final checks** first |
| 5 | Read the slate | `rack` | choose | Expand the tool calls; the test total and the build result on the canvas match that output | "The chat says it passed" |
| 6 | Build from the plan | `bells` | choose | Pull **Implement**; then the **Changes** pill: the changes are limited to the approved feature | Skipping the diff because the stage went green |
| 7 | Look for yourself | `glass` | choose | Pull **Browser validation**, then check the five states yourself; a check the **Browser** tab can't run is a note, not a failure; stop the dev server | Marking it failed for a check that could not run; leaving the server up |
| 8 | The last sounding | `rack` | tiles | After **Run final checks**: tests and build pass; the final total is at least the baseline; it can go up; all five stages are complete from evidence | "The totals must be equal"; "a green rail proves the feature without a look" |

The stage (`src/game/inkwell-circuits.ts`): the marker slides to the dial's post; at a post with no
slate before it a wash of ink spreads on the chart and fades; each bell pull runs a surveyor's flag
up its pole and a slate appears on the rack; Juno walks onto the chart and sets a piece when a stage
goes green. The slates, the flags and the posts' lamps use the kit's materials: no new shader.

---

## 6. Checks, cards, Trial, pages

- **Hotspots:** H6.1 **Repository Issues Kanban** in the **Canvas** menu on
  `app-open-repo-issues-canvas`; H6.2 the **Generate plan** button on `app-create-canvas-screenshot`;
  H6.3 the **Approved** status on `app-feature-workbench-plan`. Rects are measured on the snapshot's
  images.
- **Cards:** A6.1 prepare the session and note the test totals; A6.2 install and try the Repository
  Issues Kanban (or read it, if your organization blocks the plugin); A6.3 create the Session Board
  and confirm **Changes** lists no files; A6.4 create the Feature Workbench and check its structure;
  A6.5 run it from the proposal to the final checks; A6.6 the assignment (the **Assess** stage).
- **Trial T6** (eight items): when a canvas beats a chat thread; both sides change one board; the
  built-in surfaces come first; the package name and the shown name; one card to **Plan**; no
  Approve stage; marks only from recorded evidence; final total ≥ baseline.
- **Pages:** `pg6.studio`, `pg6.shared`, `pg6.terms`, `pg6.surfaces`, `pg6.when`, `pg6.ready`,
  `pg6.community`, `pg6.session`, `pg6.workbench`, `pg6.prompt`, `pg6.repair`, `pg6.run`,
  `pg6.takeaways`, `pg6.assignment`. Chests: C6.1 Awesome GitHub Copilot; C6.2 where canvas files
  live (user and project scope); C6.3 the Markdown fallback. Bottles B6.1–B6.4: `no-canvas-opens`,
  `the-plan-status-stays-at-working`, `an-action-button-stays-disabled`,
  `the-board-does-not-match-the-evidence`.

---

## 7. Battle 6 (Sunspire → Inkwell, recaps Chapter 05)

Battle 5's form: three waves of two, no kraken. Questions N5.1–N5.3 go in
`chapters/05-mcp-plugins.json`; the hook is `hooks.battles["passage-sunspire-inkwell"]`. The sky
runs on from Sunspire's morning to Inkwell's golden hour over the passage (no cut).

| Wave | Raiders | Habit | Question |
|---|---|---|---|
| 1 | *Toggle's On*, *Open Shutter* | Enabled is not connected: check the connection (05 `an-mcp-server-is-enabled-but-its-tools-fail`) | N5.1 |
| 2 | *Whole Chart*, *Send It All* | Ask the service the general question; keep the comparison local (05 `exercise-check-the-book-apps-input-labels-with-context7`) | N5.2 |
| 3 | *Just Installed*, *Every Crate* | Installing is different from invoking (05 `plugins-use-a-packaged-capability`) | N5.3 |

---

## 8. Tech plan

The package is Sunspire's shape with `inkwell` names: `src/islands/inkwell.ts`;
`src/world/islands/inkwell/` (`layout`, `anchors`, `height`, `terrain-regions`, `flora-palette`,
`flora`, `vegetation`, `harbor`, `town`, `town-build`, `build`, `dressing`, `plaza` (the Plaza, the
Loggia, the terrace, the Kite Walk, the Chart Court, the stairs), `dome` (the Dome, the Seal's
plinth), `circuit`, `market`, `starfish`, `silhouette`, `chart`, `waypoints`, `arrival`, `stream`,
`index`); `src/game/inkwell-island.ts`, `-session.ts`, `-npcs.ts`, `-quests.ts`, `-circuits.ts`; the
pack's `chapters/06-canvases.json`, `quests/inkwell.json`, `puzzles/borrowed-board.json`,
`two-hands.json`, `shared-chart.json`, `board-song.json`.

Shared changes, each generic: `CIRCUIT_PLACES.board`, `.slate` and `.chart`;
`STORY_CONDITIONS.inkwell`; battle 6; `tools/lib/islands.json`; `neutral.test.ts` patterns for
Chapter 06's ids and words; Sunspire's `tracker.next`.

Registry entry: `flag` `inkwell`; `open: { after: { island: 'sunspire', condition: 'sealed' } }`;
`ranges` `{ load: 1300, show: 1100, unload: 1550, detail: 600 }`; `stream`
`{ nearLoads: 'always', courseData: 'chapter-part', depthTile: true, reflected: false }`.

---

## 9. Tests and gates

ISLAND-05 §9 with `inkwell` names, plus PHASE-3 §7's Q1–Q8: `height.test.ts`, the silhouette and
residency tests, the content check, `battles.test.ts` (battle 6), `casttest`, `flickertest --audit`
on `iw-quay`, `iw-stair`, `iw-plaza`, `iw-walk`, `iw-chart`, `iw-dome` and `iw-fly-n/e/s/w`,
`wayfindtest`, `tools/inkwelltest.mjs`, and the budget gates.

## 10. The Walt Disney review

ISLAND-04 §13.3's eleven questions, with these words: **Story:** mapmakers who keep the job where
both hands can reach it. **The weenie:** the Dome from the sea, the quay and every stop. **Place:**
white cliffs, blue domes, flowers, golden light. **Kinetics:** the quill, kites, lines of charts,
gulls. **Delight:** a chart you walk on, and ink that holds only with a slate behind it. **Teaching
through play:** after the Chart Court, can a player say where approval happens, and what makes a
stage green?

## 11. Open risks

| Risk | Mitigation |
|---|---|
| `bluff` reads warm, not white | Judge it on the terrain page at golden hour (warm white is right for the hour). A new key only if it reads brown |
| Steep stair flights (35 %) feel slow | Three short flights with landings that each have something on them |
| The Kite Walk is the longest gap (140 m) | A chest, a bottle, two kite flyers and the stacks' view on it |
| The floor chart z-fights with the paving | Its pieces are solids 2–6 cm proud of the floor, never coplanar faces; a flicker view looks straight down the court |
| Voices | Lines stay pending until generated; the island plays with subtitles |

## 12. As built

### 12.1 Stages 0 to 3: the contract, terrain, world art, content and the island in the game (2026-11-11)

Changes from §0 and §3, each in `layout.ts` (the source of truth):

| What | Spec | As built | Why |
|---|---|---|---|
| The hour (I4) | `hours` 18.3 | **17.3**, `azimuth` −12 (the sun 12° up on bearing 262°) | At 18.3 h this sky's sun is 2° under the horizon. 17.3 h is the golden hour |
| White rock (I11) | the existing `bluff` region | **a new region key, `chalk`** (`TerrainRegionMasks.chalk`, `terrain-material.ts`) | `bluff` reads brown with dark scrub, and it replaces the baked light (the whole island went flat). `chalk` paints pale stone with soft grey beds on the bake's own cliff and rock, as `redRock` does. One graph change for every island: take the program census in stage 4 |
| Heights | terraces 3.4 / 10 / 17, the rim 24, the court 38, the head 54, the Dome to 80 | terraces **3.4 / 11 / 19**, the rim **27**, the court **44**, the head **62**, the Dome's gallery 79, its top **90**, the quill **98** | From the sea the first version was a low green shelf. Taller steps keep their shape at 700 m |
| The terraces' risers | 6 m deep | **3 m deep** (walls of rock) | A 6 m bank of white rock reads as a snow drift |
| The Quills | cones | **pinnacles** with a rounded top and an uneven foot; r 8 to 12, y 22 to 42 | Cones read as buckets |
| The valley | flat meadow | a low hill in the south, **Olive Hill** (y 30, r 170) | The skyline from the south and the west |
| The cove's head | Sunspire's | the carve **fades out** past the head | Sunspire's stream hid a 1.1 m ledge where the carve stops. Here it was across the beach path |
| The Shared Chart's places (I7) | six places | **eight**: `quill`, `planDesk`, `rail`, `bells`, `rack`, `build`, `glass`, `soundings` | One station a place, so the stage reads the place alone and a reload in mid-lap shows the right rail and rack |
| The Washing Square | (−113, 60) | (−112, 61), half 10 × 6.5 | It sits inside the second terrace |
| No sea arch | "the sea arch and stacks" | stacks only | A height field can't hold an arch |

**Done.**

- **Terrain** (`height.ts`, 15 tests): the coast (its middle 50 m south-west of the frame's, so the
  sea cliff is close behind the town), the three terraces, the bluff as a line of discs, the Dome head,
  the Quills, Olive Hill, and every pad and path. Its row in `bake-frame-island.ts`; the pack's `inkwell/critical`
  and `inkwell/chart`.
- **World art** (`src/world/islands/inkwell/`): `build.ts` (whitewashed cube houses with shutters and
  domes, pergolas, bougainvillea, flower tubs, lines of charts, brass hoops), `town.ts` and
  `town-build.ts` (the quay, 33 houses in three rows, the taverna, the Washing Square, the Gossip
  Stair's three flights with their lines of notes), `dressing.ts`, `plaza.ts` (the Plaza and its
  armillary and four desks, the Loggia and the guild's board, the Draughting Terrace, the Kite Walk,
  the Chart Court and the Great Chart, the Dome Stair, a lamp at every station), `dome.ts`,
  `circuit.ts`, `anchors.ts`, `market.ts`, `vegetation.ts` (olive, cypress, pine, flowering bush),
  `flora-palette.ts`, `flora.ts`, `starfish.ts`, `silhouette.ts`, `arrival.ts`, `waypoints.ts`
  (57 nodes), `stream.ts`, `index.ts`.
- **What moves** (`index.ts`): the Dome's brass quill swings about the wind's line; two kites fly over
  the Kite Walk and two more from the Dome's terrace once the island is sealed; the Great Chart's brass
  marker slides along its rail; a wash of ink spreads and thins away; slates hang on the rack and brass
  pins stand by the isles as stages go green; the guild's card slides from the first column to Plan and
  to Ready; the draughting slate takes a tick and the mate's note. Every one of them is in a kit
  material: no new shader. Each hidden one is marked `prewarm`.
- **The kit's paint** (`repaint` in `index.ts`): the kit's plaster is tan and its paving brown, so the
  island's plaster, paving and stone paints are multiplied once before the meshes are made.
- **Game** (`src/game/`): `inkwell-island.ts`, `-session.ts` (cues `iw-song`, `iw-stair`, `iw-desks`,
  `iw-board`, `iw-slate`, `iw-chart`, `iw-seal`, `iw-chest:<id>`), `-circuits.ts` (the stage of the
  three circuits and the Seal), `-npcs.ts`, `-quests.ts`. Seventeen characters in
  `src/world/characters/`.
- **Registry:** `src/islands/inkwell.ts`, the registry line, `STORY_CONDITIONS`, `CIRCUIT_PLACES.board`,
  `.slate` and `.chart`, `ISLAND_SIGNS.inkwell` (37 signs), `tools/lib/islands.json`.
- **Content** (`courses/copilot-app/`): `chapters/06-canvases.json` (15 images, 18 quizzes: 6 stop
  checks, 3 hotspots measured on the snapshot's screenshots, the matching quiz, the 8-item Trial; 22
  pages; 3 chests and 4 bottles; 4 glossary terms), `quests/inkwell.json`, `puzzles/borrowed-board.json`,
  `two-hands.json`, `shared-chart.json`, `board-song.json`, six app cards and four objectives in
  `learning.json`, five labels, Kosta's market lines, the course file's Seal, arrival and hooks. The
  lock pins the chapter's 15 images.
- **Battle 6** (`passage-sunspire-inkwell`): the plan, the passage, questions N5.1 to N5.3 in Chapter
  05's file, the hook and its chart label, a unit test, and `battletest --battle=6`.
- **Voices:** all 91 lines are voiced (Azure AI Speech for the seven new speakers; ElevenLabs for
  Juno, Wingman and Lyra). **The seven new voices are provisional** and want Dan's ear
  (`docs/voices.md`). Mouth cues for its 88 islander lines were made on 2026-11-11 (`npm run voice:lipsync`).
- **Budgets:** the course pack's core part is 53.8 KB with seven chapters; its cap is now 64 KB, with
  the reason in `tools/budgets.json`.

### 12.2 Play-through and gates (2026-11-11)

**Played.** `tools/inkwelltest.mjs` (on `tools/lib/island-play.mjs`) plays Chapter 06 by real input,
in the course's order, from the chart to the quay through both circuits, the Trial failed once and
then passed, the Seal, Q6.A, chest C6.1 opened by E, the four bottles and the five starfish. It
passes with no failure (167 stills), on the first build and again on the shared modules
(`docs/adding-an-island.md`, "A cove island from the shared modules"), where the island's built
geometry is the same to the byte (positions, colours and uvs of every bucket, full and Lite).

| Gate | Result |
|---|---|
| Play-through | pass (167 stills, no failure) |
| Contact (`casttest --island=inkwell --raised=kosta:0.22`) and wayfinding (`wayfindtest --only=legs,reach --islands=inkwell --reach=inkwell`) | pass |
| Battle 6, Sunspire to Inkwell (`battletest --battle=6 --only=play`) | pass: three waves, the question cards, the win, docked at Inkwell, no page error |
| Flicker (`iw-dome`, `iw-fly-n` after the quill and the kites moved to `plate-geometry.ts`) | pass |
| Unit tests, types, lint, format, content check, build, size budgets | pass |

One fix from the replay: Kosta stood 11 cm under his booth's boards (`onBoards.kosta` 0.22 in the
test, as every booth keeper).

**Left.** The rest of the flicker views, frame budgets, memory, perf and the program census
(PHASE-3 §7.5 to §7.7).

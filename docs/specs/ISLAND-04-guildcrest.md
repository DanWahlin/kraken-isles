# Spec: Island 04, Guildcrest (Chapter 04 · Skills and Custom Agents)

> Status: **design spec, every decision made** (2026-11-01). Dan asked for the island to be built
> overnight with no questions, so this spec decides everything and gives the reason in §0. Course
> source: `github/copilot-app-for-beginners` `main` at `dd7cffa`, `04-skills-custom-agents/README.md`
> (chapter hash `349cde01aecd` in `lock.json`). The snapshot is in the pack (commit "Course sync:
> Chapter 04"). Written in ASD-STE100 Simplified Technical English. Player-facing lines use friendly
> contractions.
>
> Diagram: [top-down layout](island-04/top-down-layout.svg), made by
> [`island-04/draw.py`](island-04/draw.py) from the numbers in §3. `python3 docs/specs/island-04/draw.py`
> prints every world position, heading and leg length.
>
> Read with: [ISLAND-03](ISLAND-03-keelhaven.md) (the form this spec follows, and the code it reuses:
> its §W wiring contract and §15–16 as built), [BATTLES](BATTLES.md), [COURSE-PACKS](COURSE-PACKS.md),
> [content-data](../content-data.md), [adding-an-island](../adding-an-island.md), `.plans/PLAN.md` §1,
> §6, §7, §12–§15, and the skill `isles-threejs-practices`.

---

## 0. Decisions

Dan's standing decisions (PLAN §1, the music table, the bird casts, BATTLES O2) are the frame. This
spec makes every other decision. A build agent that finds a decision wrong must record the change and
its reason in §15 ("As built"), not stop to ask.

### 0.1 From the plan (fixed)

| # | Decision | Source |
|---|---|---|
| P1 | Island 04 is **Guildcrest**: temperate highlands, pines, heather, windmills, stone guildhalls; landmark the **Scriptorium abbey** | PLAN §1 |
| P2 | Music: Dorian/Aeolian, pastoral; Celtic harp, tin whistle, drone | PLAN music table |
| P3 | Birds: **swifts** round Guildcrest | PLAN §6 (per-island casts) |
| P4 | Signature puzzle: **Toolbelt Trial**: "a scroll (skill) guides *how* the crew works but doesn't lock any tools. A specialist (custom agent) whose toolbelt *is* the restriction does the job with only what they need" | PLAN §1 |
| P5 | **Battle 4** on the Keelhaven → Guildcrest passage recaps **Chapter 03** with the raiders *Confident Guess*, *First Take*, *Unchecked* (issue 358) | ISLAND-03 O2, §9.2; BATTLES §2.1 |
| P6 | Keelhaven's farewell: "Guildcrest's guild saves this workflow in skills and agents" (`kh.otto.03`); the island opens with the **Seal of Keelhaven** | ISLAND-03 §8.3, W.2 |

### 0.2 Decisions this spec makes

| # | Decision | Why |
|---|---|---|
| G1 | **Site:** island centre `C = (5900, 250)`. Island frame `(u, v)`: `u` along bearing 143° (loch mouth → inland), `v` along bearing 53°. World = C + u·U + v·V, U = (0.6018, 0.7986), V = (0.7986, −0.6018) in (x, z). Baked bounds x 5280…6540, z −400…910, cell 2 m (631 × 656 samples) | South-east of Keelhaven, as on the chart (Keelhaven (720, 150), Guildcrest (870, 330)). 2687 m between centres. Keelhaven's footprint radius toward Guildcrest is ~488 m (`radii[4]`), so Guildcrest's quay is ~2020 m from Keelhaven's shore: Keelhaven (`unload` 1550) is freed while you play here, and the reverse. Thousand-Bough is 4229 m away |
| G2 | **The harbour is a sea loch opening to the north-west**, axis 143°/323° (as Keelhaven's first plan) | The wind blows from 233°. Entry (143°) and exit (323°) are both beam reaches (issue 292, P08: a berth whose way out runs close to the wind sticks). From Keelhaven you leave her mouth, run south down her west coast, then a broad reach (bearing ~115°) to Guildcrest's lane start |
| G3 | **Footprint and size like a smaller Keelhaven:** land about 820 m (u) × 660 m (v); one mountain, **Ben Scrivener** (182 m), one long ridge, **the Guild Crest** (40–70 m) with three windmills, the **Abbey Knoll** (36 m) above the town, a sea loch, one burn with one fall | Same per-tier share as Keelhaven (§10.2), with less land: the Lite and Low triangle limits (300k, 500k) are the tight ones, and Keelhaven's walls already used most of them |
| G4 | **Sky: late afternoon, clear and cool.** `hours` **16.5**, sun bearing target **250°** (A tunes `azimuth`, ± 5°). The baked **afternoon** cloud key (16.2 h): no new key, no `sky:bake`. Light fair-weather cumulus, clear coast. `mood` `{ fogScale: 1.8, hazeTint: [0.92, 0.96, 1.0] }` | Keelhaven is 9.5 h. The passage goes forward through the day: no "next morning" cut, no `nextMorningAfter`. A low west-south-west sun side-lights the town and the abbey's west front from the berth, and sets the heather and the pines in long shadows (the highland look). It's the first island with a long-shadow afternoon, so each island still has its own hour |
| G5 | **One weenie: the abbey's bell tower** (top y 76 on the Abbey Knoll, 38 m tall, square, with a pyramid cap). Seen from the sea lane, the berth, the square and every stop. **Wienies:** the inn sign, the Charter Stone, the Copyist's Linn, the abbey gate, the cloister lamps, the windmills' sails, the guild banners | Disney's rule (Keelhaven K3). The tower is where the Trial and the Seal happen (§4) |
| G6 | **The metaphor (§1.3):** the town's **Charter Stone** = repository instructions (the house rules); the scriptorium's **pattern books** = skills (one book per craft, a label on its spine = the YAML frontmatter); the guild's **journeymen** = custom agents (an indenture = the agent profile; the **toolbelt** = its `tools`); the **chained library** = "a skill isn't a permission boundary": the chains are on the tools, not in the book; a word to a passer-by = a one-off prompt | Each course object gets one clear world object. The course's own analogies (the song chart, hiring specialists) are kept: Lyra tells the chart; Guildmaster Fergus tells the specialists |
| G7 | **The signature puzzle reuses the `circuit` mechanic** (Keelhaven's). Two new circuit kinds, **`book`** (the Pattern Book, the skill, 6 stations) and **`belt`** (the Journeyman's Toolbelt, the custom agent, 7 stations), are added to `CIRCUIT_PLACES`. Station kinds `choose`, `watch` (with `action`), `tiles`: all exist | The mechanic is generic (pure rules, the pack's words, the island's `CircuitStage`). It's played, tested and accessible already. A new mechanic would cost a day we don't have |
| G8 | **"Toolbelt Trial" is the island's Trial (T4)**, given by Abbess Seren at the bell tower. The two circuits are "The Pattern Book" and "The Journeyman's Toolbelt" | Dan called the Toolbelt Trial "the chapter's final trial". The two circuits are its two halves in play (PLAN P4); the exam that earns the Seal takes the name |
| G9 | **Eight quests at seven stops, in the course's order, one direction**, plus one optional quest (the assignment). Route **382 m** from the landing to the tower (draw.py), plus the two circuit laps (~120 m and ~70 m). Longest gap between stops **130 m** (Elspeth → Aidan, up the Kirk Brae, with the abbey gate in view) | Chapter 04 is ~60 min (Chapter 03 was 75). Keelhaven's review: long walks and one unreachable station. Every stop here is ≤ 130 m from the one before; every station is reached by `wayfindtest --only=reach` |
| G10 | **Six "Do this in the app" cards** (A4.1–A4.6), each with **I did it** / **Later** and a "What did you see?" question. **No GitHub checks** on Chapter 04's cards | Chapter 04 makes no branch, no push and no pull request (the exercises stay in the session's worktree; the assignment says "Do not commit or push"). `github-check.ts` can see only forks, branches and pull requests, so there's nothing honest to check |
| G11 | **Stable ids:** island `guildcrest`; quests `Q4.1`–`Q4.8`, `Q4.A`; cards `A4.1`–`A4.6`; checks `K4.x`, `M4.1`, `H4.1`, `H4.2`; Trial `T4`; pages `pg4.*`; chests `C4.1`–`C4.3`; bottles `B4.1`–`B4.4`; puzzles `P4.1` (`pattern-book`), `P4.2` (`toolbelt`), `song-chart` (ceremony); battle `passage-keelhaven-guildcrest` | The chart and `course.json` already use `guildcrest` |
| G12 | **Reuse every shared material.** **0 new shader modules** expected (≤ 2, only if a census proves need). No new terrain region key: heather is the flora palette's drifts and its terrain wash (data rows), granite is `bluff`, the moor is `grassySlopes`, pines stand on `forestFloor` | Census headroom: Thousand-Bough 133 on Ultra; battle 3's peak is 140. A new region key would change the shared terrain graph for every island |
| G13 | **Pines:** the **Pine** trees of Quaternius' *Stylized Nature MegaKit* (CC0, the same zip as `tree_broadleaf.glb`, ASSETS.md row 87), processed by the existing vegetation pipeline (gltf-transform, meshopt) to `public/packs/testcove/vegetation/models/tree_pine.glb`, a new `PlantSpecies` `pineTree` with impostors. **Fallback** if the zip has no usable pine: `buildPine` in `vegetation/cactus.ts` beside `buildCypress` (a Scots pine: a bare upper trunk, three to five flat crown clumps), same vegetation material | A CC0 kit we already use and log; the cypress builder proves the fallback works with no new shader |
| G14 | **Heather and gorse** are flora species rows (`floraSpeciesTable`), not materials: heather (purple `#7A4A7E`, spikes), gorse (yellow `#E2B83A`, small clumps), harebell (blue `#6F7FC2`, heads), plus the island's sward | Skill §5: "a flower species is data, never a material". Adding one adds no program |
| G15 | **Windmills:** three **stone tower mills** (stone tower, timber cap, four sails), built from village kit stone and timber with the sail cloth in the cloth bucket. The sails turn as one object (rotation only, no rebuild); reduced motion turns them at a quarter speed | Kinetic element (Keelhaven §2.7). One merged mesh per mill and a rotating sail group: 2 draws per mill on High, merged to 1 on Lite (`moveBucketInto`) |
| G16 | **Guildhalls and town:** stone and harled (lime-washed) houses from `house-builder.ts` (the kit's European houses: Anchorage's), with **crow-stepped gables** as a new piece in `village/pieces.ts` (data, kit buckets), slate roofs. Three **guildhalls** round the square, each with its craft's banner (the Masons' square and compasses, the Weavers' shuttle, the Millwrights' wheel) | PLAN P1. No new material: kit stone, timber, slate, cloth |
| G17 | **The abbey:** a cloister (36 m garth) with the scriptorium in its west range, the chained library in its north range, the church on its south side, the **bell tower** at its east end, a gatehouse (porter's lodge) at the top of the Kirk Brae and an east gate onto the ridge. Built from kit stone like the Gate Light and Port Meridian's citadel | PLAN P1. One place holds the skill half of the chapter, so the walk between its stops is short |
| G18 | **Water:** the harbour is the sea (a sea loch: the ocean's own water). Fresh water: one **lochan** on the knoll's back (y 52), the **Scriptor's Burn** down past the abbey's south side, **the Copyist's Linn** (a 22 m fall) into a pool by the square, then a short run to the loch under a footbridge. All shared natural water (`fresh-water-natural.ts`, `StreamCourse`, `joinPool`, `TerrainWaterCaps`) | A Scottish fall is a "linn". Kinetic water near the route, and little of it: Keelhaven's lessons on fresh water apply as they are |
| G19 | **Music:** a new theme, **"Guildcrest Air"**, generated with the **ElevenLabs Music API** (`elevenlabs music`, the account the voices use), instrumental, ~2:30, loopable: pastoral Celtic folk in D Dorian, Celtic harp arpeggios, tin whistle melody, a soft drone, 80–88 bpm. Make three, pick the one with the cleanest loop, encode `.ogg` and `.m4a` like `tools/music/fetch.sh`, measure LUFS, log it in ASSETS.md and ART_PROVENANCE.md | No Celtic track exists (the six tracks are Dan's Suno songs, and `reggae`). A generated track meets P2 tonight. Dan can swap in his own Suno track later: it's one line (`theme`) |
| G20 | **Lyra** plays at the inn, **The Harp and Whistle**, on the quay, and retells the **song chart** (`from-the-studio-a-song-chart-for-the-session`). She keeps her voice | PLAN §3: the Bard retells each chapter's studio analogy. Keelhaven K14 |
| G21 | **Moira Lennox** keeps Guildcrest's Model Market stall on the quay (`keepers.guildcrest`) | MODEL-MARKET §2: a stall on every island |
| G22 | **Voices:** every new speaker gets an ElevenLabs Voice Library voice that `elevenlabs voices get_shared` returned on 2026-11-01 (§8.3), with a notice period ≥ 365 days where there was a choice. No voice is shared with another speaker on the island, and none repeats a voice in `cast.json` | Dan can't audition tonight. Accents follow the place (Scottish, Irish and Welsh English, natural, never a caricature) |
| G23 | **The passage battle (battle 4)** follows battle 3's form with no kraken: three waves of two (`cutter, cutter`, `brigantine, cutter`, `brigantine, cutter`); questions **N3.1–N3.3** (Chapter 03) | Battle 3 peaks at 140 programs only because of the kraken (138 without). No new look, so battle 4 stays ≤ 138 with Guildcrest resident |
| G24 | **Optional quest:** only the assignment (**Q4.A**, after the Seal). "Install skill…", Awesome Copilot and the agents' next-step suggestions are chest pages | Chapter 04's optional parts are tips, not exercises |
| G25 | **Arrival card:** eyebrow `Chapter 04 · Skills & Custom Agents`, title `Guildcrest`, line `Write the chart once, hire the right hands` | A short line in the game's voice for both halves (skills, custom agents) |

---

## 1. Teaching map (Chapter 04)

Folder `04-skills-custom-agents`. Anchors are the slugs that `src/learn/course/sections.ts` makes for
the README (run on the snapshot). Hashes are `lock.json`'s. Citations use `[§anchor]` for Chapter 04
and `[03 §anchor]` for Chapter 03. Images are in `courses/copilot-app/public/course/ch04/`; ids are
`ch04/<file-without-extension>`.

### 1.1 Sections, in order

| # | Anchor (hash) | Section (summary) | Images | UI names (bold or code in the course) |
|---|---|---|---|---|
| 0 | *(top; cite `learning-objectives`)* | Hook: "What if you could reuse your review checklist instead of typing the same reminders for each task?" Save parts of Chapter 03's workflow so you can reuse them | `chapter-header.svg` (not used) | — |
| 1 | `learning-objectives` (`87437423c6c6`) | Four objectives (§6.5); ~60 minutes | — | — |
| 2 | `prerequisites` (`af3d5642ec67`) | Chapter 03 done; course fork; Node.js from Chapter 00; no merges needed | — | — |
| 3 | `from-the-studio-a-song-chart-for-the-session` (`332e29dc140f`) | The players know their instruments; the bandleader hands out a chart so everyone plays *this* song the same way. A skill is the chart. A custom agent is the specialist who follows it. "You still check the result. A chart does not guarantee a good performance." | `song-chart-skills` | — |
| 4 | `core-concepts` (`f106792dbf27`), `choose-the-feature-that-fits-the-task` (`aa81861f78f8`) | The four-row table (one-off prompt, repository instructions, skill, custom agent: where it lives, when it applies). "Instructions are the house rules. A skill is the chart for one kind of song." Find skills in **Customize**; select custom agents with `/agent` or the agent picker. Tips: Awesome Copilot (review before you add); **Add** → **Install skill…** with a review step. IMPORTANT: a skill doesn't enforce what Copilot may do; read unfamiliar skills; the course skill has instructions only | `skill-vs-one-off-prompt` | **Customize**, **Add**, **Install skill…** |
| 5 | `create-a-practice-session` (`11035c4aac17`) | **Create from** → **Branches** → `main` (new worktree), **Interactive**, a prompt that shows the branch and worktree path and finds two paths. Keep the session. Note: file edits belong to this worktree; installed tools can have a wider scope; a new worktree from `main` won't hold this session's uncommitted edits | — | **Create from**, **Branches**, **Interactive** |
| 6 | `skills-save-a-review-checklist` (`688a14a25fe7`) | A skill is a folder with `SKILL.md`; the **YAML frontmatter** (`name`, `description`); the `description` helps the app decide when to load it; the Markdown below holds the instructions. Repository skills share through Git; personal skills apply across projects | — | — |
| 7 | `exercise-update-and-use-the-course-skill` (`ea46465fbcdf`) | **Customize** → **Installed** → type filter **Skills** → search `book-app-reviewer` → **Project: copilot-app-for-beginners**, toggle on. Read the skill; append two rules (headings; text alternatives); inspect **Changes**; `/skills reload`; **Plan** mode with the skill; expand the skill activity; stop before implementation. Expected: the plan cites the rules; h2 → h3 must account for `.book-card h2`; no claim that tests passed. Tip: type `/`, the skill shows as `/book-app-reviewer`; a general prompt may load it too | `app-customize-skills` | **Customize**, **Installed**, **Skills**, **Project: copilot-app-for-beginners**, **Changes**, **Plan** |
| 8 | `custom-agents-define-a-role-and-its-tools` (`991db2aad3f9`) | Plumber, electrician, roofer. A custom agent has a name, instructions and a set of available tools. A skill supplies a workflow; a custom agent defines the role. Not a different session mode, not necessarily a different model. The profile table: `name`, `description`, `tools` (`read` and `search` inspect without editing or running commands), the Markdown below | `hiring-specialists-analogy` | — |
| 9 | `exercise-create-a-read-only-book-app-explainer` (`428c8ffecae4`) | **Interactive**, **Default agent**; create `.github/agents/book-app-explainer.agent.md`; **Changes**: `tools` is only `read` and `search`; wait, **quit** and reopen the app (closing the window isn't quitting); `/agent`, select **book-app-explainer**, send; the agent picker shows it; ask about `App.tsx` and the **Unread** filter; compare with the files; back to the default agent. Expected: `filters` → `filterBooks` → `filteredBooks` → `ReadingStats` and the book cards. The `tools` list limits tools; omitting it allows all; the folder scope isn't a sandbox. Tip: next-step suggestions as a pre-filled prompt | `app-custom-agent-picker` | **Interactive**, **Default agent**, **Changes**, **book-app-explainer** |
| 10 | `checkpoint` (`8a4a2028b3b8`) | An updated skill; a read-only agent profile | — | — |
| 11 | `troubleshooting` → `a-changed-skill-or-new-agent-is-missing` (`52e4a7ccaced`), `generic-advice-from-the-copilot-app` (`a4f9a0a3ecf3`), `i-cannot-find-skills-or-custom-agents` (`24f3083ffeec`), `the-custom-agent-cannot-run-tests` (`9dc08d4ddfcb`) | Four problems and fixes | — | **Customize** |
| 12 | `key-takeaways` (`e262c06d63b6`) | Four takeaways (§6.3 maps them) | — | — |
| 13 | `assignment` (`80a1a1b3729a`) | Same worktree, default agent; the heading recommendation (or a focused test); **Plan** + `/book-app-reviewer`; a baseline in **Terminal**; **Exit plan mode and I will prompt myself** (**Continue** if **Review plan** stays open); **Interactive**; the Chapter 03 inner loop (**Changes**, tests, build, `npm run dev`, **Browser** with the **Local** URL at a wide and a narrow width, `hobbit`, `zzzz-no-match`, `Ctrl+C`); the review record. Success criteria | `../assets/assignment.webp` (shared) | **Plan**, **Terminal**, **Exit plan mode and I will prompt myself**, **Review plan**, **Continue**, **Interactive**, **Changes**, **Browser**, **Local** |
| 14 | `whats-next` (`c6e8e74c186d`) | Chapter 05: an MCP server and a plugin that supplies a skill | — | — |

Names seen only in screenshots (**Browse**, **Skill folders**, **Browse skills**, **New**, "Resources
for specialized tasks", **GPT-6.1 Sol · Medium**) are not course names: no line teaches them. The
two app screenshots have the current sidebar (no stale-sidebar rule is needed).

### 1.2 Concept → island → check

| Concept (anchor) | Where on the island | Check | Logbook page |
|---|---|---|---|
| Save the workflow to reuse it (intro, `learning-objectives`) | Arrival; Juno at the landing | — | — |
| Song chart (`from-the-studio-…`) | The Harp and Whistle (inn), Lyra and two players | Song chart ceremony; **K4.1** | `pg4.studio` |
| Choose the feature (`choose-the-feature-that-fits-the-task`) | The Charter Stone on Guild Square, Reeve Elspeth | **M4.1**; **K4.2** | `pg4.choose`, `pg4.one-off` |
| Find skills in **Customize** (`core-concepts`) | Elspeth's last line; the scriptorium's shelf | in **P4.1** | `pg4.customize` |
| Install skill… and Awesome Copilot (tips) | Chests in the scriptorium and the library | — | `pg4.install` (C4.1), `pg4.awesome` (C4.2) |
| A skill isn't a permission boundary (`core-concepts`, IMPORTANT) | The chained library, Brother Ewan | **K4.5** | `pg4.not-a-lock` |
| A practice session (`create-a-practice-session`) | The porter's lodge, Brother Aidan: "a carrel of your own" | **K4.3**; **A4.1** | `pg4.practice` |
| A skill file (`skills-save-a-review-checklist`) | The scriptorium, Sister Brigid: the pattern book and its spine label | **P4.1** stations 1–2 | `pg4.skill-file` |
| Update and use the skill (`exercise-update-and-use-the-course-skill`) | The cloister walk: the copy desk, the proof table, the reading bell, the lectern | **P4.1** stations 3–6; **A4.2**, **A4.3** | `pg4.update-skill`, `pg4.use-skill` |
| Custom agents (`custom-agents-define-a-role-and-its-tools`) | The Guildhall of Journeymen, Guildmaster Fergus | **K4.6** | `pg4.agents`, `pg4.profile` |
| The read-only explainer (`exercise-create-a-read-only-book-app-explainer`) | The guildhall yard: Rory the journeyman, his indenture and toolbelt | **P4.2**; **A4.4**, **A4.5** | `pg4.explainer`, `pg4.tools` |
| Next-step suggestions (tip) | Chest in the guildhall | — | `pg4.suggestions` (C4.3) |
| Troubleshooting (four anchors) | Four bottles | — | `B4.1`–`B4.4` |
| Key takeaways (`key-takeaways`) | The bell tower terrace, Abbess Seren | **Trial T4** (the Toolbelt Trial) | `pg4.takeaways` |
| Assignment (`assignment`) | Seren, optional quest **Q4.A** (after the Seal) | **A4.6**; **K4.9** | `pg4.assignment` |
| What's next (`whats-next`) | Seren's farewell: Chapter 05's island (Sunspire Sands) | — | — |

### 1.3 The metaphor (G6), object by object

| Course object | Guildcrest object | The rule it carries |
|---|---|---|
| One-off prompt | A word to a passer-by on the square (a kid running an errand) | It applies when you say it, then it's gone `[§choose-the-feature-that-fits-the-task]` |
| Repository instructions, `.github/copilot-instructions.md` | **The Charter Stone**: the town's house rules carved in the square | Across all work in this place `[§choose-…]` ("Instructions are the house rules") |
| Skill, `.github/skills/<name>/SKILL.md` | **A pattern book** on the scriptorium's shelf, one book per craft, in its own case | Loaded when the task matches its description, or when you name it `[§choose-…]` |
| YAML frontmatter (`name`, `description`) | **The spine label** of the book | The description tells the readers when to fetch it `[§skills-save-a-review-checklist]` |
| **Customize** → **Installed** → **Skills** | The scriptorium's shelf index | Where you find skills `[§core-concepts]` |
| Editing `SKILL.md`; **Changes** | The copy desk; the proof table | Only the two rules change `[§exercise-update-…]` |
| `/skills reload` | The reading bell: readers put down the old copy | `[§exercise-update-…]` |
| Using the skill in **Plan**; the skill activity | The lectern; the margin note that names the book | Check the activity and the code, not the claim `[§exercise-update-…]` |
| "A skill isn't a permission boundary" | **The chained library**: the chains are on the tools, not in the books | A book that says "don't carve" doesn't take the chisel away `[§core-concepts]` |
| Custom agent | **A journeyman** of the guild | A defined role with instructions and tools `[§custom-agents-…]` |
| Agent profile (`name`, `description`, `tools`, body) | **The indenture**: name, what they do, their toolbelt, their house manner | `[§custom-agents-…]` |
| `tools: ["read", "search"]` | **The toolbelt**: a reading glass and a lantern, nothing else | The toolbelt *is* the limit (PLAN P4) |
| The app loads agents when it starts | The hall's doors open at dawn (quit and reopen) | `[§exercise-create-…]` |
| `/agent`, the agent picker | The hall's roll call; the name on your banner | `[§exercise-create-…]` |
| Default agent | The guild's own all-hands crew | They run the tests `[§the-custom-agent-cannot-run-tests]` |
| Song chart (the chapter's studio) | Lyra's chart in the inn | `[§from-the-studio-…]` |

---

## 2. Art direction

### 2.1 The story the land tells

Guildcrest is the guild town of the isles. Its crafts keep their best work in **pattern books**, copied
by hand in the abbey's scriptorium, so every mason and weaver works *this* job the same way. The guild
hires **journeymen**, each sworn to one role and carrying only the tools it needs. Up on the ridge,
three windmills grind for the whole town. The abbey's bell rings for a captain who can tell a house
rule from a pattern book, and a pattern book from a journeyman. The island's line: **a busy harbour
town under the hills → the quiet stone cloister where the craft is written down → the windy ridge
where the guild's specialists work → the bell tower above it all.**

### 2.2 Look in one sentence

A cool late-afternoon highland island: a deep blue sea loch under heather moors and stands of Scots
pine, a harled stone harbour town with slate roofs and three crow-gabled guildhalls round a square,
a grey stone abbey with a square bell tower on a granite knoll, and three white-sailed windmills
turning on the ridge, all under long golden shadows and a clear sky, with Ben Scrivener's bare top
behind.

### 2.3 Palette

| Role | Colour | Where |
|---|---|---|
| Heather moor | `#6B4A6E` (in bloom), `#5C5A3A` (out of bloom, the moor's base) | upper slopes, Ben Scrivener, the ridge's back |
| Sward | `#6F8A4C`, shade `#4A6236` | the glen, the town's greens, the cloister garth |
| Pine canopy | `#2E4630`, trunks `#8A5A3C` (Scots pine's orange upper bark) | stands on the glen's sides and the knoll's foot |
| Gorse | `#E2B83A` | banks by the brae and the ridge path |
| Granite | `#8E8A82`, lichen `#A9A57A` | tors, the knoll's crags, sea cliffs (20–45 m) |
| Abbey and guild stone | `#A39B8C` (dressed), `#7E776C` (rubble) | abbey, guildhalls, mills' towers, walls |
| Harling (lime-wash) | `#E9E3D3`, ochre `#D8B97A`, pale pink `#D9B8AE` | town houses |
| Slate | `#4A4F58` | every roof |
| Water | loch `#1F4E6A` (deep), shallows `#3E8C8A`; burn `#6B5A3A` (peat-brown in the shallows) | sea loch, burn, linn, lochan |
| Guild banners | Masons `#2F5D8A`, Weavers `#9C3A4A`, Millwrights `#C08A2A` | the three guildhalls, the ridge at the Seal |
| Bell bronze, Seal | `#B07A3A`; the Seal's ribbon `#2F5D8A` | the bell, the Seal |

Rules: saturated colour only on banners, doors, the inn sign, the bell and the Seal. No pure white
except foam, the falls and the mills' sails.

### 2.4 Time, sky, haze, light (`sky`, `mood`)

- **Sun (G4):** `hours` 16.5; A tunes `azimuth` until the debug sun bearing reads **250° ± 5°**. Check:
  from the landing, the abbey's west front and the town's west faces are lit; the loch's far side is in
  shade; the ridge's mills catch the light (hero shot H2).
- **Clouds:** the afternoon key; add `16.5` to `cove.sky.prefetch([...])` in `flow.ts`.
- **Haze (`mood`):** `{ fogScale: 1.8, hazeTint: [0.92, 0.96, 1.0] }`: Ben Scrivener goes blue-grey; the
  town stays clear (≤ 0.42 haze on the near slopes).
- **The passage:** Keelhaven 9.5 h → Guildcrest 16.5 h goes forward through `passageSky`. No cut, no
  `nextMorningAfter`. Battle 4 holds the sky as the other battles do.
- **Night:** with Sky & Time at night, the inn's windows, the cloister lamps and the tower's belfry
  lamp follow the night factor.
- **Bake light:** bake `sunGolden` and `sunMorning` for this sun (the per-island bake light radius from
  Keelhaven's phase 3; 8 m here: the slopes are gentle).

### 2.5 Silhouette and landmark readability

- **From the sea (300–2500 m):** a long low island with one mountain (Ben Scrivener, bare heather top)
  at its south-east end; the Guild Crest ridge with **three windmills** in a line; the **abbey tower**
  on its knoll above a pale town; a dark sea loch cutting in from the north-west; grey granite sea
  cliffs with a surf collar; dark pine stands on the lower slopes.
- **The far silhouette** (`createIslandSilhouetteAsync`): its masks' colours (heather, sward, granite,
  pines as a tree line), the town as blocks, the abbey and its tower as prisms, the mills as prisms with
  a cross for the sails, the linn as a strip.
- **The chart:** the miniature shows the loch, the ben, the ridge with mills and the tower (it already
  draws pines, a peak and a mill: `ArchipelagoMap.tsx`).

### 2.6 Disney-land rules applied

- **Layered depth** from the berth: the quay and the market stall → the inn → the town's roofs → the
  square and the guildhalls → the knoll and the abbey → the ridge and its mills → Ben Scrivener → sky.
- **Forced perspective:** the upper town's houses at 0.9 scale; the mills on the ridge at 0.9.
- **Kinetic elements:** the mills' sails; the linn and the burn; banners; washing; smoke from chimneys
  (the shared mist cards, Low and up); swifts screaming round the tower; the copyists' candles; Lyra's
  players; the bell swinging at the Seal. Rocking and swinging stop or slow with reduced motion.
- **Nothing random:** every prop has a reason (pattern-book cases in the scriptorium, ink and quills at
  the copy desk, chains on the library's tool racks, the toolbelts on the guildhall's pegs). Scatter
  is only for plants and rocks, inside rules.
- **Signs use the course's exact strings:** `book-app-reviewer` (the pattern book's spine), `SKILL.md`,
  `.github/skills/` (the shelf's label), `book-app-explainer` (Rory's banner), `read`, `search` (his
  toolbelt's two tags), `.github/copilot-instructions.md` (the Charter Stone's foot),
  `.github/agents/` (the guildhall's roll board). Never an Octocat or a Copilot logo.

### 2.7 Hero shots (§13.2 lists the captures)

Positions from `draw.py`. A tunes each within 5 m.

| Id | Shot | Camera → target | Must show | Must not show |
|---|---|---|---|---|
| H1 | **The Approach** (arrival key 1) | (5480, 24, −230) → (5900, 60, 250) | the loch mouth, the town, the abbey tower, the ridge's mills, Ben Scrivener | the terrain edge, pop-in |
| H2 | **First Look** (landing) | landing pose | the quay, the market stall, the inn sign, the town rising to the abbey, a mill | the quay in shade |
| H3 | **Guild Square** | (5858, 16, 120) → (5885, 12, 160) | the Charter Stone, two guildhalls and banners, the linn behind | — |
| H4 | **The Cloister** | (5990, 48, 170) → (6014, 36, 192) | the garth, the scriptorium's door, the lamps of P4.1, the tower above | — |
| H5 | **The Ridge** | (6045, 52, 200) → (6140, 54, 250) | the guildhall yard, the three mills turning, the sea | — |
| H6 | **The Tower** | (6060, 46, 250) → (6025, 70, 226) | the tower, swifts, Seren's terrace | — |
| H7 | **Horizon** | Keelhaven's Gate Light → (5900, 80, 250) | the island's silhouette, the tower and mills | — |

---

## 3. Layout (world space)

Conventions: metres; x east, z south, y up; sea level 0. A heading `h` faces `(sin h, cos h)`; a
bearing is clockwise from north (−z). Design in the island frame `(u, v)` (G1); `draw.py` holds the
values and prints the world ones. Write the frame in `src/world/islands/guildcrest/layout.ts` as
`toWorld(u, v)` (like Keelhaven's), so the code reads in `(u, v)`.

### 3.1 Island data (`GUILDCREST` in `src/world/islands/guildcrest/layout.ts`)

| Key | Value |
|---|---|
| `center` | (5900, 250) |
| `bounds` | minX 5280, maxX 6540, minZ −400, maxZ 910, cell 2. Land: an oval in the frame, u −400…420, v −330…330, plus ≥ 110 m of sea floor to the deep floor at every edge |
| `coast` | oval half-axes 410 (u) × 330 (v), centre u 10, `power` 2.4, noise 28 m over ~140 m, ragged 8; the **sea loch** cut in from the north-west along v ≈ −30 from u −460 to −130, 90–120 m wide |
| `deepDepth`, `seabedRadius` | 58, 1000 |
| `contains(x, z)` | inside `bounds` |
| Distances | Keelhaven's centre 2687 m; Keelhaven's shore (footprint `radii[4]` 488 m) to Guildcrest's quay ~2020 m; Thousand-Bough's centre 4229 m |
| `ranges` | `{ load: 1300, show: 1100, unload: 1550, detail: 600 }` |
| `skyReach` | `{ reach: 1300, full: 800 }` |
| `footprint` | `measureFootprint(guildcrestHeightDry, …, 32, 900)`; a test keeps it in step (as Keelhaven's) |

### 3.2 Terrain (`guildcrestHeightDry`, `guildcrestHeight`, `guildcrestMasks`)

One TS function per value; the bake, the floor tile, the silhouette and the chart sample it. Positions
are `(u, v)` and `y`.

| Feature | Geometry | Height | Notes |
|---|---|---|---|
| **Sea loch** | v −70…+15 at the mouth (u −460) narrowing to v −50…+12 at the loch head (u −130) | floor −8 in the middle, −12 in the mouth, a 3–6 m shelf at the head | calm; the lane runs down its middle |
| **Quay** | the loch's north-east shore, face along v 12.5 from u −235 to −150 | deck 2.2 | stone, timber fenders every 6 m, a slipway at u −150 |
| **Harbour town** | u −200…−100, v 20…90 | 2.2 → 10, terraced pads | lanes up from the quay; the inn at the quay's head |
| **Guild Square** | centre (−96, 46), 34 × 26 m | pad 10.0 | the Charter Stone in the middle; three guildhalls on its north, east and south sides |
| **Kirk Brae** | from (−74, 60) to (−18, 106), a lane with two railed stair flights and a switchback at (−48, 80, y 22) | 10 → 34 | max grade 1:4 on the lane; steps 0.18 m; rails both sides on the flights |
| **Abbey Knoll** | plateau u −25…60, v 100…160 | 36 | granite crags on its west and south faces (12–20 m), the lochan behind it |
| **The cloister** | garth u 4…40, v 112…148 (36 m), the walks 4 m wide round it | 36 | ranges: west (scriptorium), north (chained library), south (church), east (chapter house and the east gate) |
| **The bell tower** | footprint 9 × 9 m centred (56, 114) | base 36, top 76 (cap) | belfry openings at 64–70 m; the terrace on its east side at (66, 116, y 40) |
| **Guild Crest** (ridge) | crest along a line from (60, 150) to (200, 190) and on to (300, 120) | 39 at the guildhall saddle → 52–60 at the mills → 70 at its east top | the ridge path on its crest; the guildhall on a pad at (90, 154, y 42) |
| **Guildhall yard** | 30 × 22 m pad round (92, 156) | 42 | walled on the south and east (1.1 m), open to the ridge path |
| **Windmills** | mill 1 (122, 190, y 52), mill 2 (150, 214, y 58), mill 3 (176, 172, y 56) | towers 14 m, caps 3 m, sails 9 m radius | each on its own round pad 12 m across; a track off the ridge path |
| **Ben Scrivener** | summit (260, −60), y 182; a rounded cone 300 m across with a corrie on its north face | 182 | bare heather top, granite tors on its shoulders; off-limits above y 90 |
| **The glen** | the burn's valley from the lochan (82, 58) west past the knoll's south side to the linn (−36, 78) | 52 → 34 | sward and pines |
| **The moor** | everything else above y 30 | gentle (≤ 22°) | heather drifts, gorse banks, tors |
| **Sea cliffs** | north and east coasts | 20–45 m | granite (`cliff` only here) with a surf collar; a pebble cove on the south coast |

Masks and regions (`terrain-regions.ts`, existing keys only, G12): `villageGround` and `paths` on the
quay, town, square, brae, abbey, guildhall yard, mills' pads and the ridge path; `grassHill` on the
glen and the town's greens; `grassySlopes` on the moor (the flora palette paints its heather);
`forestFloor` under the pine stands; `bluff` on the tors, crags and the ben's shoulders; `cliff` only in
the sea-cliff band; `campSand` on the pebble cove. Fix the masks before the colours (skill §5).

### 3.3 Water (`src/world/islands/guildcrest/water.ts`)

| Name | From → to | Size | Notes |
|---|---|---|---|
| **The lochan** | centre (82, 58), radius 18 | level 52 | a 2 m wading shelf; reeds |
| **Scriptor's Burn** | the lochan → under the knoll's south side → the linn's lip (−36, 78, y 34) | half-width 1.5–2.5 m, a `StreamCourse` that meanders ±3 m every 40 m | one footbridge where the brae crosses it (−52, 76) |
| **The Copyist's Linn** | lip (−36, 78, y 34) → pool (−56, 70, y 12) | 3 m wide, 22 m drop, the shared falling sheet with broad surges | spray (mist cards, Low and up); seen from the square |
| **Linn pool** | centre (−56, 70), radius 9 | level 12 | `joinPool` with the burn |
| **Lower burn** | the pool → the loch at (−125, 60) | half-width 2 m | under the quay lane's footbridge (−110, 62) |

The loch is the sea. Far terrain levels keep under the fresh water (`TerrainWaterCaps`). The walker
wades what's drawn (`rideOver`, `naturalWaterAt`).

### 3.4 The berth (ship and approach)

| Item | Value |
|---|---|
| **Approach** (from Keelhaven) | out of Keelhaven's mouth, south down her west coast to about (3500, −900), then a broad reach on ~115° to the **lane start** (5539, −179), then a beam reach on 143° through the **mouth** (5617, −75) to the berth. Leaving: a beam reach on 323° out of the loch, then 295° to Keelhaven |
| **Lane** | half-width 30 m: no rock or terrain above −6 m; the mouth ≥ 90 m wide at the waterline and ≥ 8 m deep in its middle |
| **Turning room** | a 45 m circle at (−300, −30) = (5695.5, 28.5), ≥ 6 m deep |
| **Berth** | `(u −196, v 8)` = **(5788.4, 88.7)**, heading **−2.496** (bow toward the mouth, bearing 323°; port side to the quay), 4.5 m off the quay face |
| **Departure** | `(u −212, v 2)`, the same heading: off the quay, inside the turning room's reach |
| **Landing** | `(u −190, v 16)` = **(5798.4, 2.2, 88.6)**, heading **1.34** (toward the inn); A may tune ± 0.15 to frame H2 |
| **Ship obstacles** | circles along the quay face; the turning room clear |
| **Sea lanes** (`GUILDCREST_WAYS.sea`) | the coast as one closed polygon; lane points at the lane start, the mouth and the turning room. `wayfindtest --only=sea` checks the brigantine's draft (2.7 m) along each lane and 6 m to each side |

### 3.5 The harbour town and the square

- **Town** (`house-builder.ts`, European houses): 16–20 harled stone houses with slate roofs on terraced
  pads between the quay and the square; two lanes; washing lines; a well; a smithy (anvil, a
  quenching tub), a cooper, a chandler. Not enterable.
- **The Harp and Whistle** (inn): at the quay's head, door and porch facing the landing; its sign (a harp
  and a whistle, painted) is the first wienie. Lyra sits on the porch bench with two players (a fiddler
  and a whistle player: extras) and a music stand with **the chart**.
- **Moira's Model Market:** a booth on the quay 22 m west of the landing (`BOOTH_LAYOUT`, the shared
  stall parts): the town's stone and slate, a blue-and-cream awning, wool bales and a peat stack.
- **Guild Square:** cobbles (`villageGround`), the **Charter Stone** (a 3 m standing stone with a carved
  panel: the house rules; the course string `.github/copilot-instructions.md` on its foot plate), three
  guildhalls (Masons' north, Weavers' east, Millwrights' south), a market cross, two benches, a horse
  trough. The **course board** stands at the square's west entrance, facing down the lane.

### 3.6 The abbey

- **Gatehouse** (porter's lodge) at the top of the Kirk Brae (−18, 106): an arch 4.5 m high (camera
  space), Brother Aidan at a desk inside its west door, a rack of keys (the carrels).
- **The cloister** (G17): arcaded walks 4 m wide round a grass garth with a well in the middle. The
  **scriptorium** in the west range (a long room, its door open onto the walk, desks visible through
  three wide openings: you don't go in). The **chained library** in the north range: an open-fronted
  bay with book presses and, on a separate rack, the copyists' tools on chains. The **church** on the
  south side (roof only from the garth). The **chapter house** and the **east gate** on the east side.
- **P4.1's stations** stand on the cloister walk (§3.10), each with a lamp on a bracket on the arcade.
- **The bell tower** at the church's east end (§3.2). Its terrace on the east side holds Abbess Seren,
  a stone bench and the bell rope's sally through a slot (the Seal's bell).

### 3.7 The ridge, the guildhall and the windmills

- **The ridge path** leaves the east gate (42, 140), runs along the crest to the guildhall saddle
  (railed on the drop side where the slope is over 30°), then on past the mills as a track.
- **The Guildhall of Journeymen** (90, 154): a long stone hall with crow-stepped gables, a wide arched
  door onto the yard, the **roll board** by the door (painted `.github/agents/`), a **peg rail of
  toolbelts** along the yard wall, a **tool rack** (P4.2's `rack`), a **trestle bench** (the job), and
  a **test bench** with a sounding hammer under a cloth (the tests the explainer can't run).
- **The tower stair:** from the yard's west side a railed stone path with two short flights (down
  2 m) runs 47 m past (82, 128) to the tower terrace on its plinth (y 40): the route's last leg.
- **Three tower mills** (G15) on the ridge past the hall, sails turning.

### 3.8 The walking route (one direction)

Walking speed 1.8 m/s. 3D distances from `draw.py`.

| # | Point | Position (x, y, z) | Leg (m) | Total (m) |
|---|---|---|---|---|
| — | Landing (quay) | (5798.4, 2.2, 88.6) | 0 | 0 |
| Q4.1 | **Lyra**, the inn's porch | (5828.8, 3.0, 95.8) | 31 | 31 |
| Q4.2 | **Elspeth**, the Charter Stone | (5870.6, 10.0, 144.5) | 65 | 96 |
| — | brae foot | (5903.4, 10.0, 154.8) | 34 | 130 |
| — | brae switchback | (5935.0, 22.0, 163.5) | 35 | 165 |
| Q4.3 | **Aidan**, the porter's lodge | (5973.8, 34.0, 171.8) | 42 | 207 |
| Q4.4 | **Brigid**, the scriptorium door (+ the P4.1 lap, ~120 m round the walks) | (5991.9, 36.0, 185.8) | 23 | 230 |
| Q4.5 | **Ewan**, the chained library | (6025.8, 36.0, 182.7) | 34 | 264 |
| — | east gate | (6037.1, 36.0, 199.3) | 20 | 284 |
| — | ridge path | (6059.5, 39.0, 212.4) | 26 | 310 |
| Q4.6–Q4.7 | **Fergus** and **Rory**, the guildhall yard (+ the P4.2 lap, ~70 m) | (6077.2, 42.0, 229.2) | 25 | 334 |
| — | the tower stair's foot | (6051.6, 40.0, 238.5) | 27 | 362 |
| Q4.8 | **Seren**, the tower terrace | (6032.4, 40.0, 232.9) | 20 | 382 |

**Against the learning-journey lessons:**

| Lesson | Guildcrest |
|---|---|
| No doubling back | None. The route climbs from the quay through the town to the abbey, out its east gate to the ridge, and up the tower stair to the terrace. The optional quest finishes where it starts (Q4.A at Seren) |
| Walking 20–28 % of the island's time | 382 m + ~190 m of laps ≈ 570 m ≈ **5.3 min** of a ~30 min clean play (≈ 18 %): the chapter is short, and the stops are close |
| Long gaps lose players | Gaps 31, 65, 111, 23, 34, 70, 47 m. The longest (Elspeth → Aidan) climbs the brae with the abbey gate and the linn in view, and passes a starfish and a bottle |
| The compass walked players into cliffs (issues 288, 289) | `GUILDCREST_WAYS.walk` has nodes on the brae's flights, the switchback, the cloister walks, the ridge path and the tower stair, with heights; `wayfindtest --only=reach` from day one |
| Talk walls | No NPC says more than 4 voiced lines before the player acts (§4.4) |
| Keelhaven's unreachable caisson (P01) | Every station stands on a walk surface with a 3 m clear radius, and no rail or wall cuts it off; the reach check walks the compass's route to every station |

### 3.9 Anchors (NPC places and look targets)

Anchor names are part of the contract (§10.3). Each stands on a walk surface with a **3 m clear
radius** and open camera space. Headings face the look target.

| Anchor | Who / what | (u, v, y) | World (x, y, z) | Heading |
|---|---|---|---|---|
| `landing` | the captain | (−190, 16, 2.2) | (5798.4, 2.2, 88.6) | 1.34 |
| `moira` | Moira (market keeper) | (−212, 24, 2.4) | (5791.6, 2.4, 66.2) | 0.30 |
| `lyra` | Lyra Wren | (−166, 36, 3.0) | (5828.8, 3.0, 95.8) | −1.80 |
| `chartStand` | the music stand (the ceremony) | (−162, 40, 3.0) | — | — |
| `elspeth` | Reeve Elspeth Galloway | (−102, 40, 10) | (5870.6, 10.0, 144.5) | 1.43 |
| `charterStone` | the Charter Stone (M4.1) | (−96, 46, 10) | (5879.0, 10.0, 145.6) | — |
| `aidan` | Brother Aidan Kerr | (−18, 106, 34) | (5973.8, 34.0, 171.8) | −1.78 |
| `brigid` | Sister Brigid Moran | (4, 112, 36) | (5991.9, 36.0, 185.8) | −2.23 |
| `ewan` | Brother Ewan Rhys | (22, 141, 36) | (6025.8, 36.0, 182.7) | −1.48 |
| `chainRack` | the chained tool rack | (26, 146, 36) | — | — |
| `fergus` | Guildmaster Fergus Munro | (90, 154, 42) | (6077.2, 42.0, 229.2) | −2.33 |
| `rory` | Rory Baird, the journeyman | (96, 160, 42) | (6085.6, 42.0, 230.4) | −1.71 |
| `seren` | Abbess Seren Pryce | (66, 116, 40) | (6032.4, 40.0, 232.9) | 1.29 |
| `bellRope` | the bell's sally | (62, 114, 40) | — | — |
| `book.shelf`, `book.spine`, `book.desk`, `book.proof`, `book.bell`, `book.lectern` | P4.1 stations (cloister walk) | (8, 118), (8, 132), (18, 136), (32, 136), (32, 120), (20, 116), y 36 | draw.py `pb.*` | face the garth |
| `belt.indenture`, `belt.rack`, `belt.proof`, `belt.door`, `belt.roll`, `belt.bench`, `belt.testBench` | P4.2 stations (guildhall yard) | (86, 158), (98, 166), (108, 160), (104, 150), (94, 146), (84, 150), (78, 156), y 42 | draw.py `tb.*` | face the hall |
| `bookCam`, `beltCam` | the circuits' cameras | bookCam (−6, 124, 52) → (22, 128, 36); beltCam (70, 140, 54) → (94, 156, 42) | — | — |
| `extraFiddler`, `extraWhistler`, `extraKids`, `extraCopyist`, `extraMiller`, `extraShepherd` | islanders | (−160, 34), (−164, 42), (−90, 52), (12, 140), (126, 186), (40, 20) | — | — |

A tunes each within 3 m to the built ground and keeps the clear radius; the as-built values go in
`anchors.ts` (the source of truth after the build) and §15.

### 3.10 Collectibles

Five starfish, three chests, four bottles (the four troubleshooting sections). A moves each spot to
the nearest valid ground (≤ 5 m); `starfishtest` and the layout test prove each one is reachable.

| Id | What | (u, v), y |
|---|---|---|
| `sf.g.quay` | starfish "Under the quay's slipway" | (−150, 10), 1.0 |
| `sf.g.linn` | "Behind the linn's pool" | (−60, 76), 12.2 |
| `sf.g.garth` | "On the cloister's well" | (22, 130), 36.6 |
| `sf.g.mill` | "At the foot of the far mill" | (176, 165), 56 |
| `sf.g.cove` | "On the pebble cove" (the south coast; a short detour from the glen) | (60, −150), 0.6 |
| `C4.1` | chest: `pg4.install` (10 doubloons) | the scriptorium's book press, opens after Q4.4 (0, 126), 36 |
| `C4.2` | chest: `pg4.awesome` (10 doubloons) | the library's corner (30, 150), 36 |
| `C4.3` | chest: `pg4.suggestions` (10 doubloons) | the guildhall yard, opens after Q4.7 (104, 168), 42 |
| `B4.1` | bottle: a changed skill or new agent is missing | the brae switchback (−46, 84) |
| `B4.2` | bottle: generic advice from the Copilot app | the square's trough (−86, 30) |
| `B4.3` | bottle: I can't find skills or custom agents | the ridge path (60, 150) |
| `B4.4` | bottle: the custom agent can't run tests | by the test bench (76, 160) |

### 3.11 Walkability and camera (hard rules)

As Keelhaven §3.13 and §15, plus:

- **Stairs and stacked surfaces:** the brae's flights, the tower stair and the cloister's steps use
  `heightAt(x, z, y)`; no gap wider than 0.25 m or taller than the 0.45 m step. **Every stair has a
  rail on both sides** (Keelhaven P04: a rail on one side let the captain step off the high side).
- **Edges:** the quay face (except the gangway), the knoll's crag tops, the ridge path over 30°, the
  linn's lip and the tower terrace have a rail or a wall ≥ 1 m.
- **Colliders and camera boxes** for every arcade pier, desk, press, rack, bench, trough, the Charter
  Stone, the market cross, the mills' towers and sails' sweep (a camera box), banners' poles.
- **Off-limits:** Ben Scrivener above y 90, the sea cliffs, the crags, the mills' interiors, houses,
  the church, the scriptorium's room.
- **Camera space:** ≥ 10 m of open ground at each stop; nothing lower than 4.5 m over a walk surface
  except the cloister's arcade (5 m, its walks are 4 m wide and open to the garth) and the gatehouse
  arch (4.5 m).
- **No floating, buried or intersecting objects**; coplanar faces ≥ 1 cm apart (`flickertest --audit`,
  views `gc-quay`, `gc-square`, `gc-cloister`, `gc-yard`, `gc-tower`).

---

## 4. Chapter beats

Each stop: **what you'll do → where it is in the app → one check or puzzle → the app card → a
Logbook page → who's next**, with the compass on the next stop. Lines ≤ 22 words and ≤ 2 sentences,
with contractions; spoken lines say "Captain". §8.3 has every line with its id and citation.

### 4.0 Arrival

- **Before:** battle 4 on the passage (§9). Its win line says Guildcrest lies ahead.
- **Card** (arrival flyover, §10.6): eyebrow `Chapter 04 · Skills & Custom Agents`, title `Guildcrest`,
  line `Write the chart once, hire the right hands` (`course.json` → `islands[guildcrest].arrival`).
- **Landing (three lines only, Keelhaven §15):** Juno `gc.juno.arrive.01`; Wingman `wingman.gc.01`; the
  starfish tip `wingman.starfish.guildcrest`.

### 4.1 Stops

| # | Quest | NPC · place | What you'll do | Where it is in the app | Check / puzzle | App card | Logbook | Next |
|---|---|---|---|---|---|---|---|---|
| Q4.1 | **The Song Chart** | Lyra · the inn's porch | Hand out the chart and hear two players play one song the same way | — (analogy) | Song chart ceremony; **K4.1**; music unlocks | — | `pg4.studio` | Elspeth |
| Q4.2 | **The Charter Stone** | Elspeth · Guild Square | Match each need to the feature that fits it and where it lives | **Customize** (skills), `/agent` and the agent picker (custom agents) | **M4.1**; **K4.2** | — | `pg4.choose`, `pg4.one-off` | Aidan |
| Q4.3 | **A Carrel of Your Own** | Aidan · the porter's lodge | Take a carrel key: a practice session in a new worktree from `main` | **Create from**, **Branches**, **Interactive** | **K4.3** | **A4.1** | `pg4.practice` | Brigid |
| Q4.4 | **The Pattern Book** | Brigid · the scriptorium | Find the review pattern book, read its spine, copy in two rules, proof them, ring the reading bell, read with it at the lectern | **Customize** › **Installed** › **Skills**, **Changes**, `/skills reload`, **Plan** | **P4.1** (the `book` circuit) | **A4.2**, **A4.3** | `pg4.skill-file`, `pg4.customize`, `pg4.update-skill`, `pg4.use-skill` (chest C4.1: `pg4.install`) | Ewan |
| Q4.5 | **The Chained Library** | Ewan · the library | See why a book's rule doesn't lock the tools; read a book before you shelve it | — | **K4.5** | — | `pg4.not-a-lock` (chest C4.2: `pg4.awesome`) | Fergus |
| Q4.6 | **Hire a Specialist** | Fergus · the guildhall | Hear what makes a journeyman: a name, instructions, and tools | `/agent`, the agent picker | **K4.6** | — | `pg4.agents`, `pg4.profile` | Fergus (the yard) |
| Q4.7 | **The Journeyman's Toolbelt** | Fergus and Rory · the guildhall yard | Write Rory's indenture, fill his toolbelt, proof it, open the hall, call him, give him a job, and send the tests to the guild's own crew | **Interactive**, **Default agent**, **Changes**, `/agent`, **book-app-explainer** | **P4.2** (the `belt` circuit) | **A4.4**, **A4.5** | `pg4.explainer`, `pg4.tools` (chest C4.3: `pg4.suggestions`) | Seren |
| Q4.8 | **The Toolbelt Trial** | Seren · the tower terrace | Pass the Trial; ring the bell | key takeaways | **Trial T4**, reflection | — | `pg4.takeaways` | Sunspire Sands (Chapter 05) |
| Q4.A | **Your Turn: One Skill-Guided Change** (optional, after the Seal) | Seren · the tower terrace | Do the assignment in the app, then show Seren | the assignment | **K4.9** | **A4.6** | `pg4.assignment` | — |

### 4.2 Quest data (`courses/copilot-app/quests/guildcrest.json`)

As Keelhaven §4.2: `task` is the tracker line; `start` sends you there; `book` and `belt` are the
circuits' steps; `done` says what you learned. The required quests have no `app` step: each card opens
at its stop. Only Q4.A uses `try` and `"orStop": true`.

| Id | `task` | `steps` |
|---|---|---|
| Q4.1 | Hear the Bard's tale | `start`: Lyra's playing on the inn's porch, at the quay's head. · `done`: A skill is the chart for one kind of job. A custom agent is the specialist who follows it. You still check the result. |
| Q4.2 | Choose the feature that fits | `start`: Reeve Elspeth keeps the Charter Stone on Guild Square. · `done`: A prompt is for now. Instructions are the house rules. A skill is for work you repeat. A custom agent is a role with its own tools. |
| Q4.3 | Start a practice session | `start`: Brother Aidan keeps the abbey's gate, up the Kirk Brae. · `done`: One session in a new worktree from main, kept for every exercise. Its edits stay in its worktree. |
| Q4.4 | Update and use a skill | `start`: Sister Brigid runs the scriptorium, through the cloister. · `book`: Walk the Pattern Book round the cloister. · `done`: A skill is a folder with a SKILL.md file. Update it, reload it, and check its activity against the files. |
| Q4.5 | See what a skill can't do | `start`: Brother Ewan keeps the chained library, along the cloister. · `done`: A skill guides the work. It doesn't switch off any tools, so read a skill before you turn it on. |
| Q4.6 | Learn what makes a custom agent | `start`: Guildmaster Fergus is at the guildhall, out the east gate. · `done`: A custom agent has a name, instructions and a set of tools. It's a role, not a mode or a model. |
| Q4.7 | Create a read-only custom agent | `start`: Talk to Fergus again in the guildhall yard. · `belt`: Fit out Rory's toolbelt in the yard. · `done`: The tools list is the limit: read and search only. Quit and reopen the app to load it, then pick it with /agent. |
| Q4.8 | Pass the Trial to earn the Seal | `start`: Abbess Seren waits at the bell tower. · `exam`: The Toolbelt Trial is ready when you are. · `done`: The Seal of Guildcrest is yours. |
| Q4.A | Make one skill-guided change | `start`: Seren has one more job. · `try`: Do the assignment in the app, then show Seren. · `done`: One focused change from the skill's review, tests and build passing, and an honest record. |

Each quest with a card has a `link` ("Do it in the app ↗") to its section. `tracker`: `chapter`
"Chapter 04 · Skills & Custom Agents", `goal` "Save your craft as skills and agents, and earn the Seal
of Guildcrest", `next` "Sunspire Sands is next, and she's still being charted. Until then these waters
are yours." **Keelhaven's** `tracker.next` changes to "Guildcrest is next. Board your ship and follow
the compass south-east." (its `nextSail` shows once Guildcrest is open).

### 4.3 Cast

No two characters on the island share a voice (PLAN §7a). Bodies and palettes from the character
library (`npc-palettes.ts`). Never a caricature accent. Voices in §8.3.

| NPC (id) | Role | Look | Voice direction (`eleven_v3`) | One line |
|---|---|---|---|---|
| **Lyra Wren** (`lyra_guild`, body `lyra`) | the Wandering Bard | as before, plus a tartan shawl and a small harp | keeps her voice | "The players know their instruments. The chart makes them play this song the same way." |
| **Elspeth Galloway** (`elspeth`) | Reeve of Guildcrest, keeper of the Charter Stone | woman, 50s; dark green wool coat, a chain of office, a ledger | warm, brisk; Scottish | "Instructions are the house rules, Captain. A skill is the chart for one kind of song." |
| **Brother Aidan Kerr** (`aidan`) | the abbey's porter | young man, 20s; grey habit, a ring of keys, a lantern | low, calm, friendly; Irish | "Every copyist gets a carrel of their own. What you write there stays there." |
| **Sister Brigid Moran** (`brigid`) | mistress of the scriptorium | woman, 40s; grey habit, ink-stained apron, spectacles, a quill | calm, exact, kind; Irish | "One book per craft, Captain, and its spine says when to fetch it." |
| **Brother Ewan Rhys** (`ewan`) | keeper of the chained library | man, 60s; brown habit, a heavy key, half-moon glasses | slow, wry; Welsh | "A book can say 'don't carve'. It can't take the chisel out of your hand." |
| **Guildmaster Fergus Munro** (`fergus`) | master of the Guildhall of Journeymen | man, 50s; leather apron over a tweed waistcoat, a master's medal | deep, steady; Scottish | "You don't call one helper for every job. You hire the specialist." |
| **Rory Baird** (`rory`) | the journeyman (the read-only explainer) | young man, 20s; a leather toolbelt with only a reading glass and a lantern, a satchel of notes | warm, clear, careful; Scottish | "I read and I search. I don't carve, and I don't claim the tests passed." |
| **Abbess Seren Pryce** (`seren`) | Mother Abbess; keeper of the bell and the Seal | woman, 60s; white wimple, dark habit, a bronze key on a cord | gentle, sure; Welsh | "Save the craft, choose the right hands, and check the result." |
| **Moira Lennox** (`moira`, body `gc_market`) | Model Market keeper | woman, 40s; Fair Isle jumper under the keepers' apron and money pouch, a blue bonnet | bright, chatty; Scottish (another voice from Elspeth's) | "Hire a model that fits the job, Captain." |
| Juno, Wingman | first mate, parrot | existing | existing voices | — |

**Extras** (barks are text toasts; a bark that teaches cites its anchor): **Callum and Isla**
(`gc_fiddler`, `gc_whistler`, Lyra's players), **Wee Ailsa** (`gc_kid`, runs errands on the square: the
one-off prompt), **Brother Cuthbert** (`gc_copyist`, at the copy desk), **Dougie the miller**
(`gc_miller`), **Kenna the shepherd** (`gc_shepherd`, on the glen, sits). Sample barks:
"Tell me once and I'll do it once, Captain." (Ailsa) `[§choose-the-feature-that-fits-the-task]` · "Two
new rules, and not a word more." (Cuthbert) `[§exercise-update-and-use-the-course-skill]` · "The mill
grinds the same flour every day. Same chart, same job." (Dougie) `[§from-the-studio-…]`.

### 4.4 Scripts (order of steps)

"Card" = the "Do this in the app" card (`{ "appTask": … }`): **I did it** → the "What did you see?"
question; **Later** → the script goes on. No stop says more than four lines before the player acts.

| Script | Steps in order |
|---|---|
| `lyra` | `gc.lyra.01` → show `ch04/song-chart-skills` → `gc.lyra.02` → **song chart ceremony** (cue `gc-chart`, §7) → `gc.lyra.03` → quiz **K4.1** → page `pg4.studio` → music unlocks → `gc.lyra.04` → Q4.1 done, Q4.2 start |
| `elspeth` | `gc.elspeth.01` → `gc.elspeth.02` → cue `gc-charter` (the camera on the Charter Stone) → quiz **M4.1** → show `ch04/skill-vs-one-off-prompt` → `gc.elspeth.03` → quiz **K4.2** → pages `pg4.choose`, `pg4.one-off` → `gc.elspeth.04` → Q4.2 done, Q4.3 start |
| `aidan` | `gc.aidan.01` → `gc.aidan.02` → quiz **K4.3** → page `pg4.practice` → card **A4.1** → `gc.aidan.03` → Q4.3 done, Q4.4 start |
| `brigid` | `gc.brigid.01` → `gc.brigid.02` → cue `gc-book` → Q4.4 `book` → **P4.1** (§5.2; its station lines) → `brigid.solved`: `gc.brigid.03` → pages `pg4.skill-file`, `pg4.customize`, `pg4.update-skill`, `pg4.use-skill` → card **A4.2** → card **A4.3** → chest C4.1 opens (cue `gc-chest:C4.1`) → `gc.brigid.04` → Q4.4 done, Q4.5 start |
| `ewan` | `gc.ewan.01` → cue `gc-chains` (the camera on the chained rack) → `gc.ewan.02` → `gc.ewan.03` → quiz **K4.5** → page `pg4.not-a-lock` → `gc.ewan.04` → Q4.5 done, Q4.6 start |
| `fergus` | `gc.fergus.01` → show `ch04/hiring-specialists-analogy` → `gc.fergus.02` → `gc.fergus.03` → quiz **K4.6** → pages `pg4.agents`, `pg4.profile` → Q4.6 done, Q4.7 start → `gc.fergus.04` |
| `fergus.belt` | cue `gc-belt` → Q4.7 `belt` → **P4.2** (§5.3) → `fergus.belt.solved`: `gc.rory.done` → `gc.fergus.05` → pages `pg4.explainer`, `pg4.tools` → card **A4.4** → card **A4.5** → chest C4.3 opens → `gc.fergus.06` → Q4.7 done, Q4.8 start |
| `seren` | `gc.seren.01` → `gc.seren.02` → Q4.8 `exam` → **Trial T4** → `trial.passed`: cue `gc-seal` (§4.5) → `celebrate` → `gc.seren.03` → reflection → Q4.8 done |
| `seren.retry` | `gc.seren.retry` |
| `seren.assignment` | `gc.seren.assign.01` → card **A4.6** (quiet at the brief, `orStop` at the return) → Q4.A `try` |
| `seren.assignment.back` | quiz **K4.9** → page `pg4.assignment` → `gc.seren.assign.back` → Q4.A done |

Beats (`beats`) as Keelhaven's: each NPC has a `wait` line before their stop opens and a `done` line
after; Fergus plays `fergus.belt` while Q4.7 is at `start`, and his `book` reminder while it's at `belt`.

### 4.5 The Seal and what lights up

`trial.passed` → cue `gc-seal`: the camera frames the tower from the terrace; the **bell swings and
rings** three times (a bell SFX, §8.2); the **swifts** burst from the belfry; the three guild **banners
unfurl** along the ridge and the mills' sails turn faster for 10 s; then `celebrate`. Reduced motion:
the bell rings, the banners appear, no camera move. After a reload, `sealed` keeps the banners up.

### 4.6 Optional quest (finishes where it starts)

**Q4.A** at Seren, after the Seal: the brief (`gc.seren.assign.01`), card **A4.6**, and on return **K4.9**
and `pg4.assignment`. Nothing on the main path waits for it.

---

## 5. Signature puzzle: the Pattern Book and the Journeyman's Toolbelt (P4.1, P4.2)

### 5.1 How it maps to the course

PLAN's Toolbelt Trial in two circuits (G7, G8). **The Pattern Book** (`book`, Q4.4) walks the skill
exercise `[§exercise-update-and-use-the-course-skill]` round the cloister. **The Journeyman's
Toolbelt** (`belt`, Q4.7) walks the custom-agent exercise `[§exercise-create-a-read-only-book-app-explainer]`
round the guildhall yard. Between them, Ewan's chained library carries the lesson that joins them:
a skill's words don't lock tools; an agent's toolbelt does `[§core-concepts]`.

Both use the `circuit` mechanic (Keelhaven W.6, W.12) unchanged: a lap runs while its quest is at its
step; its stations wait in order at their places (`book:<place>`, `belt:<place>`, usable only while it
waits, so the compass points to it); a right pick lights the lamp; a wrong pick turns it red, shows the
course's reason and sends the work back to `backTo`. The options are shuffled (`option-order.ts`).
Every station card shows its place's `means` (the app's words in bold).

**The one code change (generic):** `CIRCUIT_PLACES` (src/game/puzzles/circuit/places.ts) gets two
kinds:

```ts
/** A cloister's book round (the Pattern Book): a skill found, read, changed, proofed, reloaded and used. */
book: ['shelf', 'spine', 'desk', 'proof', 'bell', 'lectern'],
/** A guildhall yard (the Journeyman's Toolbelt): a role written, fitted, proofed, loaded, called, used. */
belt: ['indenture', 'rack', 'proof', 'door', 'roll', 'bench', 'testBench'],
```

`CircuitKind` widens by itself. `puzzle-circuit.schema.json`'s `circuit` enum gets `book` and `belt`.
`createCircuit` needs no change. The island's `CircuitStage` (src/game/guildcrest-circuits.ts) places
the stations and plays the moments (§5.4).

### 5.2 P4.1 The Pattern Book (`puzzles/pattern-book.json`, `circuit: "book"`, quest Q4.4, close `brigid.solved`)

Order line: `book-app-reviewer · two new review rules`. Places (`acts` = the game's place; `means`):
`shelf` "Find skills in **Customize** › **Installed**, filtered to **Skills**" · `spine` "The YAML
frontmatter: `name` and `description`" · `desk` "Edit only `SKILL.md`" · `proof` "Inspect **Changes**" ·
`bell` "Reload skills with `/skills reload`" · `lectern` "Use the skill in **Plan** mode and check its
activity". Cites: `update` = `exercise-update-and-use-the-course-skill`, `skillfile` =
`skills-save-a-review-checklist`, `core` = `core-concepts`, `practice` = `create-a-practice-session`.

| # | Place · kind | Prompt (and line) | Right | Wrong options (`reason`, `backTo`) |
|---|---|---|---|---|
| 1 | `shelf` · choose | "The guild keeps one pattern book for reviews. Where do you look for it?" (`gc.brigid.shelf`) | **The shelf index: Customize, Installed, the Skills filter, then search `book-app-reviewer`** → result "Found: Project: copilot-app-for-beginners, and its toggle is on." | "The agent picker below the prompt box" ("That's where you pick custom agents. Skills are in Customize.", `shelf`, `core`) · "The Changes tab" ("Changes shows a session's edits, not its skills.", `shelf`, `update`) |
| 2 | `spine` · choose | "The spine has two lines, `name` and `description`. Which one tells the readers when to fetch the book?" | **The `description`** → "The app reads the description to decide when to load the skill." | "The `name`, by itself" ("The name identifies it. The description helps the app decide when to load it.", `spine`, `skillfile`) · "Neither: you always have to name the book" ("You can name it, but a task that matches its description can load it too.", `spine`, `core`) |
| 3 | `desk` · watch (`action` "Hand Brother Cuthbert the two rules") | "Brother Cuthbert waits at the copy desk with the book open at Review focus." | demo 5 s: he appends two lines (headings; text alternatives) and leaves the rest | — |
| 4 | `proof` · choose | "The proof sheet shows the edits. What do you check?" (`gc.brigid.proof`) | **Only the two new rules were added to `SKILL.md`** → "Two lines added. The frontmatter and every old rule are the same." | "Accept it: Cuthbert says it's done" ("A statement isn't evidence. Check Changes.", `proof`, `update`) · "The sample app's headings changed too: accept that as well" ("This step edits only SKILL.md. Send it back.", `desk`, `update`) |
| 5 | `bell` · choose | "The book's changed, but the readers still hold the old copy. What do you do?" (`gc.brigid.bell`) | **Ring the reading bell: `/skills reload`** → "The readers put down the old copy and fetch the new one." | "Start a new session from main" ("A new worktree from main won't contain this session's uncommitted edits.", `bell`, `practice`) · "Copy the rules into every prompt instead" ("That's a one-off prompt. The skill keeps them for you.", `bell`, `core`) |
| 6 | `lectern` · choose | "In Plan mode, Brother Cuthbert reads with the book. His plan moves the book titles from h2 to h3. What do you check?" (`gc.brigid.lectern`) | **That the activity shows `book-app-reviewer`, the plan cites the new rules, it also changes the `.book-card h2` CSS selector, and it doesn't claim tests passed** → "The margin names the book, and the plan holds up against the files." | "Nothing: he said he used the skill" ("Check the activity and the code, not only the statement.", `lectern`, `update`) · "Build it now" ("Stop before implementation. This step is a plan.", `lectern`, `update`) · "The plan's fine, though it doesn't mention the CSS" ("The `.book-card h2` selector would stop matching. The plan must account for it.", `lectern`, `update`) |

The lap's close (`brigid.solved`) plays `gc.brigid.03`.

### 5.3 P4.2 The Journeyman's Toolbelt (`puzzles/toolbelt.json`, `circuit: "belt"`, quest Q4.7, close `fergus.belt.solved`)

Order line: `book-app-explainer · explain without changing files`. Places: `indenture` "The agent
profile: `.github/agents/book-app-explainer.agent.md`" · `rack` "`tools`: the tools the agent can use" ·
`proof` "Inspect **Changes**" · `door` "The app loads custom agents when it starts" · `roll` "Pick it
with `/agent` or the agent picker" · `bench` "Ask it to explain the code" · `testBench` "Run the tests
with the default agent". Cites: `agents` = `custom-agents-define-a-role-and-its-tools`, `explainer` =
`exercise-create-a-read-only-book-app-explainer`, `missing` = `a-changed-skill-or-new-agent-is-missing`,
`cantTest` = `the-custom-agent-cannot-run-tests`.

| # | Place · kind | Prompt (and line) | Right | Wrong options (`reason`, `backTo`) |
|---|---|---|---|---|
| 1 | `indenture` · choose | "Rory's indenture needs its parts. What goes in it?" (`gc.fergus.indenture`) | **A name, a description, a tools list, and his instructions below the frontmatter** → "Signed: `book-app-explainer`, with a role and an answer format." | "A session mode and a model" ("A custom agent isn't a different session mode, or necessarily a different model.", `indenture`, `agents`) · "Only his instructions" ("Without `name` and `description`, the picker can't show him. Without `tools`, he gets every tool.", `indenture`, `agents`) |
| 2 | `rack` · tiles | "Fit Rory's toolbelt for one job: explain the Book App without changing it." (`gc.fergus.rack`) | tiles that stick: **Read files** (`read`), **Search files** (`search`) | tiles that don't: "Edit files" ("An explainer doesn't change files."), "Run commands" ("He can't run commands. That's the default agent's job."), "Use external services" ("His instructions say no external services."), "Leave the list out" ("Omitting `tools` allows all available tools.") — each with `cite` `explainer` |
| 3 | `proof` · choose | "The proof sheet shows the new profile. What do you check?" | **`tools` holds only `read` and `search`** → "Read and search: nothing else on the belt." | "That it's long enough" ("Length isn't the check. The tools list is.", `proof`, `explainer`) · "That Copilot also edited the skill" ("This step creates one file. Other edits go back.", `rack`, `explainer`) |
| 4 | `door` · choose | "Rory waits outside. The hall opens its doors only at dawn. How do you bring him in?" (`gc.fergus.door`) | **Wait for work in every session to finish, quit the app, and open it again** → "The app loads custom agents when it starts." | "Close the window" ("Closing a window isn't the same as quitting the app.", `door`, `missing`) · "Start a new session from main" ("Don't start from main to reload uncommitted files.", `door`, `missing`) |
| 5 | `roll` · choose | "Call him to the bench." | **Type `/agent`, pick `book-app-explainer`, send it, and check the agent picker shows him** → "The picker below the prompt box reads book-app-explainer." | "Type `/book-app-explainer`" ("That's how a skill shows in the `/` menu. Agents come with `/agent`.", `roll`, `explainer`) · "Find him in Customize" ("You find skills in Customize. You select custom agents with `/agent` or the agent picker.", `roll`, `explainer`) |
| 6 | `bench` · watch (`action` "Ask Rory how the Unread filter reaches the stats") | "Rory sits at the bench with `App.tsx`." | demo 8 s, Rory's lines `gc.rory.01`–`gc.rory.02`: `filters` → `filterBooks` → `filteredBooks` → `ReadingStats` and the book cards, in his four-part format; nothing changes on the bench | — |
| 7 | `testBench` · choose | "Now the tests must run. Rory's belt has no hammer. What do you do?" (`gc.fergus.tests`) | **Switch back to the default agent and run them there** → "The guild's own crew runs the tests. Rory's belt stays as it is." | "Give Rory the hammer: add shell access" ("Don't add shell access just to make the read-only agent run tests.", `testBench`, `cantTest`) · "Ask Rory to say they passed" ("He can inspect tests but can't run them. Don't claim tests passed.", `testBench`, `explainer`) |

The lap's close (`fergus.belt.solved`) plays `gc.rory.done`.

### 5.4 The stage (`src/game/guildcrest-circuits.ts`, `CircuitStage`)

| Moment | `book` (the cloister) | `belt` (the yard) |
|---|---|---|
| `spot(place)` | the anchor `book.<place>`; lamp on the arcade bracket; camera `bookCam` | the anchor `belt.<place>`; lamp on the yard's post; camera `beltCam` |
| `open` / `pass` | `desk`: Cuthbert writes (quill animation, two lines of ink appear on the open book: a texture swap on the page's sign); `bell`: the reading bell swings (SFX); `lectern`: the margin note lights | `rack`: each tile that sticks hangs on Rory's belt (reading glass, lantern); `door`: the hall's doors close, a short fade (dawn), the doors open and Rory steps in; `bench`: Rory reads at the bench (talk clip); `testBench`: the cloth comes off the test bench and a guild crafter (extra) runs it |
| `fail` | the lamp turns red; Cuthbert shakes his head | the lamp turns red; a wrong tile drops off the belt |
| `done` | the six cloister lamps glow, the pattern book's case closes | the seven yard lamps glow, Rory's banner (`book-app-explainer`) unrolls on the roll board |
| `settle()` | after a reload: `bookCopied` keeps the new page on the book | `journeymanHired` keeps Rory's banner and his belt |

No new material: lamps reuse Keelhaven's lamp look (`lamps.ts` is the island's: move its builder to a
shared `src/world/village/lamp-post.ts` or copy its data into Guildcrest's package using the same kit
materials; prefer the move if it's ≤ 1 h).

### 5.5 Rules, controls, accessibility, saves

As Keelhaven §5.4–5.6 and W.12: no fail state, no timer; every station by keyboard, gamepad, mouse
and touch (≥ 44 px); reduced motion skips demos to their end; the text-only HUD shows each lamp's
state in words (`lampDark`…); the save keeps the lap and the station (a reload starts the station
again); hints are Wingman's three text tiers per station (`hints`).

---

## 6. Checks, app cards, Trial and Logbook (`chapters/04-skills-custom-agents.json`, `learning.json`)

`chapter: "04-skills-custom-agents"`. Every item has `source: { chapter, anchor, hash }` (hash from
`lock.json`, §1.1), an `explain` pair and three hint tiers, as Chapter 03's. The UI shuffles options.

### 6.1 Stop checks

| Id | Type | Prompt | Answer | Distractors (feedback) | Source |
|---|---|---|---|---|---|
| **K4.1** | mc | "In Lyra's studio, what's the chart, and who follows it?" | **The chart is a skill; the specialist who follows it is a custom agent** | "The chart is a custom agent" ("The agent is the player. The chart is the skill they follow.") · "The chart is the house rules" ("House rules are repository instructions. The chart is for one song.") · "With a chart, you don't need to check the result" ("A chart doesn't guarantee a good performance. You still check.") | `from-the-studio-a-song-chart-for-the-session` |
| **M4.1** | matching (the Charter Stone) | "Match each need to the feature that fits it." | Ask one question about the Book App ↔ **a one-off prompt**, in the current conversation · Keep the Book App's stack and behavior unchanged across tasks ↔ **repository instructions**, `.github/copilot-instructions.md` · Apply the same review checklist each time ↔ **a skill**, `.github/skills/<name>/SKILL.md` · A read-only role that explains the code ↔ **a custom agent**, `.github/agents/<name>.agent.md` | — | `choose-the-feature-that-fits-the-task` |
| **K4.2** | mc | "When does a skill apply?" | **When the task matches its description, or when you invoke it** | "Across every task in the project" ("That's repository instructions.") · "Only when you select it with `/agent`" ("That's how you select a custom agent.") · "Only in the conversation where you wrote it" ("That's a one-off prompt.") | `choose-the-feature-that-fits-the-task` |
| **K4.3** | mc | "You edit a file in your practice session. Where does the edit go?" | **Into this session's worktree only: a new worktree from `main` won't have it** | "Into every session's worktree" ("File edits belong to this worktree.") · "Straight into `main`" ("Nothing goes to main until you commit, push and merge.") · "Nowhere until you reload" ("Reloading is for skills and agents, not edits.") | `create-a-practice-session` |
| **K4.5** | mc | "A skill says 'review without editing'. What happens to Copilot's file-editing tools?" | **Nothing: a skill guides the work, but it doesn't disable tools** | "They switch off" ("A skill's instructions don't enforce what Copilot is allowed to do.") · "They switch off only in Plan mode" ("The skill changes nothing about the tools, in any mode.") · "Copilot asks permission for each edit because of the skill" ("That isn't something a skill does.") | `core-concepts` |
| **K4.6** | mc | "What makes a custom agent?" | **A name, instructions, and a set of available tools** | "A different session mode" ("Custom agents aren't a different session mode.") · "A different AI model" ("Not necessarily a different model.") · "A skill with a new name" ("A skill supplies a workflow; a custom agent defines the role.") | `custom-agents-define-a-role-and-its-tools` |
| **K4.9** | multi (Q4.A, back from the app) | "Your assignment: what can you show?" | the skill update and the agent profile in the diff · one focused app or test change · tests and the build pass · a review record that lists only the checks that ran | "A merged pull request" ("The assignment doesn't merge.") · "A record that says the browser check passed when it didn't run" ("Record only what actually ran.") | `assignment` |
| **H4.1** | hotspot (optional, Brigid's spyglass, `ch04/app-customize-skills`) | "Where do you filter the list to skills?" | target `skills-filter`, rect ≈ [0.848, 0.088, 0.057, 0.048] (the **Skills** dropdown, callout 3) | `installed-tab` (the **Installed** tab: "That's the tab. The type filter is beside the search box.") · `customize` ("That opens the view.") | `exercise-update-and-use-the-course-skill` |
| **H4.2** | hotspot (optional, Fergus's spyglass, `ch04/app-custom-agent-picker`) | "Which line picks the read-only explainer?" | target `explainer-row`, rect ≈ [0.018, 0.27, 0.70, 0.10] | `default-row` ("That's the default agent.") · `agent-picker` (the **Default agent** label: "The picker shows the current agent; it changes after you send the command.") | `exercise-create-a-read-only-book-app-explainer` |

Measure H4.1 and H4.2's rectangles on the images (the way H3.1 and H3.2 were measured: pixel boxes
divided by the image size) before you commit; the values above are from the images at 1920 × 1080
and 975 × 244. `app-customize-skills` has the course's four red callout badges, and badge 3 sits
beside the answer: H4.1 needs a `mask` over each badge (approx. ① [0.160, 0.230, 0.029, 0.050],
② [0.306, 0.004, 0.028, 0.050], ③ [0.910, 0.090, 0.028, 0.048], ④ [0.262, 0.270, 0.029, 0.050]), and
no mask may overlap a target rect (the content check holds it). `app-custom-agent-picker` has no badges.

### 6.2 "Do this in the app" cards (`learning.json` → `appTasks`)

Each card: one to four steps in the course's words (`**bold**` UI names, `` `code` ``), `why`, `source`,
`link` (the section's URL), a `seen` question (one `answer`). **No `check`** (G10).

| Id | Quest | Title | Steps | Why | Seen: prompt → answer (other options) | Source |
|---|---|---|---|---|---|---|
| **A4.1** | Q4.3 | Create a practice session | 1. Select **Create from** next to your course project. 2. Select **Branches**, then `main`, to start a session in a new worktree. 3. Set the mode to **Interactive**. 4. Ask it to show the session's branch and worktree path, and to confirm that `.github/skills/book-app-reviewer/SKILL.md` and `samples/book-app-web` exist, without editing, committing or pushing. | Keep this session for every exercise. Open files from its worktree, not your original clone. | "What did the session show?" → **A worktree path apart from my clone, and both paths found** ("My clone's own path" → you're in the original checkout: start from **Create from** · "One path is missing" → check you started from `main` in your course fork) | `create-a-practice-session` |
| **A4.2** | Q4.4 | Update the course skill | 1. Select **Customize**, then the **Installed** tab. Set the type filter to **Skills** and search for `book-app-reviewer`. Check it shows **Project: copilot-app-for-beginners** and its toggle is on. 2. In your session, ask Copilot to read `@.github/skills/book-app-reviewer/SKILL.md` and explain its frontmatter, with no edits. 3. Ask it to append the course's two Review focus rules (headings; text alternatives) to `SKILL.md` only, keeping everything else. 4. Inspect **Changes**. | A skill is a reusable checklist that lives in the repository. Changing it changes every review that uses it. | "What did **Changes** show?" → **Only the two new rules in SKILL.md** ("Edits to the sample app too" → ask Copilot to undo them: this step edits only the skill · "Nothing changed" → check you're in the session's worktree) | `exercise-update-and-use-the-course-skill` |
| **A4.3** | Q4.4 | Use the updated skill | 1. Submit `/skills reload`. 2. Set the mode to **Plan** and ask Copilot to use the `book-app-reviewer` skill to inspect `@samples/book-app-web/src` (the results heading, the book-title headings, the empty state) and propose at most one small improvement. 3. Expand the skill activity in the response and check that it loaded `book-app-reviewer`. 4. Compare the plan with the rules in the file. Stop before implementation. | Naming the skill makes your intent clear. It doesn't guarantee the findings: check the activity and the code. | "What did the plan say about book titles?" → **h2 to h3, and it also accounts for the `.book-card h2` CSS selector** ("That tests passed" → a plan can't claim that: no checks ran · "Nothing about headings" → name the skill from the `/` menu, then check the activity) | `exercise-update-and-use-the-course-skill` |
| **A4.4** | Q4.7 | Create a read-only custom agent | 1. In **Interactive** mode, select **Default agent** if an agent picker shows. 2. Ask Copilot to create `.github/agents/book-app-explainer.agent.md` with the course's exact Markdown (copy it from the chapter), and to stop if the file exists. 3. Inspect it in **Changes**: `tools` holds only `read` and `search`. 4. Wait for work in every session to finish, then **quit** the app and open it again (closing the window isn't quitting). | The app loads custom agents when it starts. | "What's in its `tools` list?" → **Only `read` and `search`** ("It has no tools list" → without one it gets every tool: add the line · "It also has edit" → remove it: an explainer doesn't change files) | `exercise-create-a-read-only-book-app-explainer` |
| **A4.5** | Q4.7 | Pick and use the agent | 1. Open your chapter session, type `/agent`, select **book-app-explainer**, and send the command. Check the agent picker below the prompt box shows `book-app-explainer`. 2. Ask it how `@samples/book-app-web/src/App.tsx` keeps reading statistics aligned with the filtered books, with the **Unread** filter as the example, in its four-part format. 3. Compare the answer with `App.tsx`, `ReadingStats.tsx` and the tests; check that no files changed. 4. Use `/agent` or the agent picker to return to the default agent. | Match an agent's tools to its task: an explainer needs read and search, nothing more. | "How did the answer trace the data?" → **`filters` through `filterBooks` to `filteredBooks`, then to `ReadingStats` and the book cards** ("It changed `App.tsx`" → it can't: check you picked book-app-explainer · "It said the tests passed" → it can't run them; don't trust that claim) | `exercise-create-a-read-only-book-app-explainer` |
| **A4.6** | Q4.A | Your turn: one skill-guided change | 1. In the same worktree, with the default agent, set **Plan** mode, pick `/book-app-reviewer` from the `/` menu, and ask for a plan for the heading recommendation (or a focused test) that names the source, CSS and test files. 2. Meanwhile, in the review panel's **Terminal**: `cd samples/book-app-web`, `npm install`, `npm test -- --run`, `npm run build`. Note the test count. 3. Select **Exit plan mode and I will prompt myself** (**Continue** if **Review plan** stays open), check the mode is **Interactive**, and ask for only that change. 4. Validate with the Chapter 03 inner loop: **Changes**, tests, build, `npm run dev` in **Browser** with the **Local** URL at a wide and a narrow width, search `hobbit` then `zzzz-no-match`, {key:ctrl+C}; then ask for `samples/book-app-web/docs/chapter-04-review.md` that records only what ran. | One reviewed recommendation through the whole inner loop, with an honest record. | (K4.9 at the return) | `assignment` |

**The risks, handled honestly:** no GitHub state changes, so a second play redoes everything; the app
may need a quit and reopen (A4.4 says so, and bottle B4.1 covers a missing agent); `/skills reload`
may be missing in an old app version (B4.1 says: quit and reopen); A4.6 is long, so it's an optional
quest after the Seal, and Later never blocks.

### 6.3 The Toolbelt Trial (T4)

Ten items; the exam draws eight (as T3's set). Pass with all correct; retries allowed; hint tier 3
off. Every item is a scenario. Coverage: Takeaway 1 (T4.1, T4.2), 2 (T4.3, T4.8, T4.10), 3 (T4.6),
4 (T4.9); objectives 1–4 (§6.5).

| Id | Prompt | Answer | Wrong options (why) | Source |
|---|---|---|---|---|
| T4.1 | "Every task in this project should keep the Book App's stack and behavior unchanged. Where does that go?" | Repository instructions: `.github/copilot-instructions.md` | "A skill" (a skill is for one kind of task) · "A custom agent" (that's a role, not a project rule) · "Each prompt" (easy to forget, hard to share) | `choose-the-feature-that-fits-the-task`, `key-takeaways` |
| T4.2 | "You run the same accessibility review on every change. What do you save it as?" | A skill: `.github/skills/<name>/SKILL.md` | "A one-off prompt" (you'd type it each time) · "A custom agent with no tools" · "Repository instructions" (they apply to every task, not one kind) | `choose-…` |
| T4.3 | "You need a helper that can read and search the code but never change it. What do you create?" | A custom agent whose `tools` list is `read` and `search` | "A skill that says 'don't edit'" (a skill isn't a permission boundary) · "A new session in Plan mode" · "A custom agent with no tools list" (that allows every tool) | `custom-agents-define-a-role-and-its-tools` |
| T4.4 | "What helps the app decide when to load a skill?" | The `description` in its YAML frontmatter | "The folder's size" · "Its `name` only" · "The order of skills in **Customize**" | `skills-save-a-review-checklist` |
| T4.5 | "You edited `SKILL.md` in your session, but the review still uses the old rules. What first?" | `/skills reload`, and check the file is saved in this session's worktree | "Start a new session from `main`" (it won't have your uncommitted edits) · "Delete the skill and add it again" · "Ask Copilot to remember the new rules" | `exercise-update-and-use-the-course-skill`, `a-changed-skill-or-new-agent-is-missing` |
| T4.6 | "A skill says 'review without editing'. Can Copilot still edit files?" | Yes: a skill gives guidance; a custom agent's tools list limits actions | "No: the skill turns editing off" · "Only in Plan mode" · "Only with a reload" | `core-concepts`, `key-takeaways` |
| T4.7 | "You created `book-app-explainer.agent.md`, but `/agent` doesn't list it. What do you do?" | Let active work finish, quit the app and open it again, then return to the same session | "Close the window and open it again" (that's not quitting) · "Start again from `main`" · "Rename the file" | `a-changed-skill-or-new-agent-is-missing` |
| T4.8 | "The read-only explainer can't run the tests. What now?" | Return to the default agent to run commands | "Add shell access to its tools" (don't, just to make the exercise work) · "Ask it to say they passed" · "Skip the tests" | `the-custom-agent-cannot-run-tests` |
| T4.9 | "Copilot says it followed `book-app-reviewer`. How do you know?" | Expand the activity, and compare the plan with the skill's rules and the code | "Trust the statement" · "Ask again with other words" (different wording doesn't show it) · "Check the skill's toggle" | `generic-advice-from-the-copilot-app`, `key-takeaways` |
| T4.10 | "What does leaving `tools` out of an agent profile do?" | It allows all available tools | "It allows no tools" · "It allows read and search" · "The agent won't load" | `exercise-create-a-read-only-book-app-explainer` |

Reward: `{ seal: "Seal of Guildcrest", doubloons: 70 }`. Title: "The Toolbelt Trial".

### 6.4 Logbook pages, chests, bottles, glossary

| Page | Title | Image | Caption gist | Source |
|---|---|---|---|---|
| `pg4.studio` | A song chart for the session | `song-chart-skills` | the chart = a skill; the specialist = a custom agent; you still check the result | `from-the-studio-…` |
| `pg4.choose` | Choose the feature that fits | — | the four rows: where each lives and when it applies | `choose-the-feature-that-fits-the-task` |
| `pg4.one-off` | A one-off prompt or a skill? | `skill-vs-one-off-prompt` | use a skill for work you repeat | `choose-…` |
| `pg4.customize` | Find skills in Customize | `app-customize-skills` | **Customize** › **Installed** › **Skills**, the toggle; custom agents with `/agent` | `exercise-update-…` |
| `pg4.install` (C4.1) | Install a skill | — | **Customize** › **Add** › **Install skill…**: a folder, a ZIP, a GitHub skill-folder URL or an HTTPS ZIP link; a review step before anything's written | `core-concepts` |
| `pg4.awesome` (C4.2) | Community skills and agents | — | Awesome Copilot's agents and skills; review an agent's tools or a skill's instructions before you add it | `core-concepts` |
| `pg4.not-a-lock` | A skill isn't a lock | — | a skill tells Copilot how to approach a task; it doesn't disable tools; skills can include scripts; read unfamiliar ones | `core-concepts` |
| `pg4.practice` | Your practice session | — | **Create from** › **Branches** › `main`, **Interactive**; edits stay in this worktree; installed tools can reach further | `create-a-practice-session` |
| `pg4.skill-file` | A skill is a folder | — | `SKILL.md`, the YAML frontmatter (`name`, `description`), the Markdown instructions; repository and personal skills | `skills-save-a-review-checklist` |
| `pg4.update-skill` | Update the skill | — | append two rules; check **Changes**; `/skills reload` | `exercise-update-…` |
| `pg4.use-skill` | Use the skill | — | **Plan** mode, the skill activity, `/book-app-reviewer` in the `/` menu; check the activity and the code | `exercise-update-…` |
| `pg4.agents` | Hire the specialist | `hiring-specialists-analogy` | name, instructions, tools; a skill supplies a workflow, an agent defines the role; not a mode or a model | `custom-agents-…` |
| `pg4.profile` | The agent profile | — | the four parts (`name`, `description`, `tools`, the Markdown below) | `custom-agents-…` |
| `pg4.explainer` | The read-only explainer | `app-custom-agent-picker` | create, quit and reopen, `/agent`, the agent picker | `exercise-create-…` |
| `pg4.tools` | The toolbelt is the limit | — | the tools list limits tools; omitting it allows all; folder scope isn't a sandbox; use the default agent for actions | `exercise-create-…` |
| `pg4.suggestions` (C4.3) | Next-step suggestions | — | a pre-filled prompt you can review and edit | `exercise-create-…` |
| `pg4.takeaways` | Key takeaways | — | the four takeaways | `key-takeaways` |
| `pg4.assignment` | Your skill-guided change | — | the success criteria | `assignment` |
| `B4.1` | bottle: A changed skill or new agent is missing | — | worktree, path, frontmatter; `/skills reload`; quit and reopen | `a-changed-skill-or-new-agent-is-missing` |
| `B4.2` | bottle: Generic advice | — | invoke from `/` or name it; expand the activity; ask for file evidence | `generic-advice-from-the-copilot-app` |
| `B4.3` | bottle: Can't find skills or custom agents | — | **Customize** in the sidebar; `/agent` or the agent picker; labels can vary by version | `i-cannot-find-skills-or-custom-agents` |
| `B4.4` | bottle: The custom agent can't run tests | — | it permits only read and search; return to the default agent; don't add shell access | `the-custom-agent-cannot-run-tests` |

**Glossary** (chapter entries; the course's `GLOSSARY.md` has `skill` and `custom-agent`: link them):
`skill`, `custom-agent`, `yaml-frontmatter` ("The block of metadata between two `---` lines at the top of
a skill or agent file"), `repository-instructions`, `agent-profile`, `agent-picker` ("Below the prompt
box when a custom agent is available: it shows the agent in use").

### 6.5 Learning-system data (`learning.json`, `course.json`)

- **Objectives** (`objectives`, chapter 04, as the course's four): O4.1 choose between repository
  instructions, a skill and a custom agent (M4.1, K4.2, T4.1–T4.3); O4.2 find, update and use
  `book-app-reviewer` (P4.1, A4.2, A4.3, T4.4, T4.5); O4.3 create and select a read-only custom agent
  (P4.2, A4.4, A4.5, T4.7, T4.8, T4.10); O4.4 apply one skill-guided improvement and validate it (A4.6,
  K4.9). Source `learning-objectives`.
- **Reflection** (`reflections`): "Which part of your own work would you save as a skill, and which
  role would you give its own agent?" (free text, as Chapter 03's).
- **`learned`** lines (the certificate and the Course map): one per objective.
- **`course.json` → `islands[guildcrest]`:** add `"seal": "Seal of Guildcrest"` and `"arrival"` (G25).
  Keep `minutes` 60 and the topics as they are (they match the objectives).
- **`labels.json`:** `puzzle:P4.1` "The Pattern Book", `puzzle:P4.2` "The Journeyman's Toolbelt",
  `arrival:guildcrest`, `battle:passage-keelhaven-guildcrest` "Keelhaven → Guildcrest".
- **`course.json` → `hooks.islands.guildcrest`:** Juno's landing and Wingman's welcome and tips (§4.0).

---

## 7. Smaller interactions (the island feels alive)

| Interaction | Where | What happens | Cue / code |
|---|---|---|---|
| **The song chart** (ceremony, `puzzles/song-chart.json`, `text` keys only) | the inn's porch | Lyra hands the chart to Callum and Isla. First they play from memory, out of step (two loops a beat apart); with the chart on the stand they play together. The player presses E to hand out the chart. The fiddle and whistle stems come from Guildcrest Air (or two SFX loops if the stems aren't separable) | `gc-chart`; unlocks the theme in the Songbook |
| **The Charter Stone** | the square | the camera eases to the stone; M4.1's rows are carved on its four faces (the quiz UI, not world text) | `gc-charter` |
| **Ailsa's errand** | the square | press E by Ailsa: you tell her one thing; she runs off and does it, then forgets (a bark: "Tell me once and I'll do it once") | bark only |
| **The chains** | the library | the camera on the chained rack: the "Review without carving" page lies on the desk, the chisel still in the apprentice's hand; the chain locks only the rack | `gc-chains` |
| **Rory's banner** | the roll board | unrolls at the belt lap's close | stage `done` |
| **The mills** | the ridge | sails turn; walk under one and its shadow sweeps you | always |
| **Swifts** | the tower | 10–16 swifts circle the belfry and dive along the cloister roofs at dusk light; burst at the Seal | `createBirds` (§10.4) |
| **The bell** | the terrace | at the Seal (§4.5); later, press E at the rope for one ring | `gc-seal`, `bellRope` |

---

## 8. Audio

### 8.1 Music (G19)

> **Replaced 2026-11-01:** Dan made the theme with Suno, **"Harp's Return"** (`music_harps_return`, 180 s, −15.6 LUFS, ART_PROVENANCE.md). The ElevenLabs "Guildcrest Air" below was the stand-in and is removed.

**"Guildcrest Air"**: `elevenlabs music` (the CLI the voices use; check `elevenlabs music --help` for
the compose command and its length option). Prompt: "Instrumental pastoral Celtic folk in D Dorian,
gentle 84 bpm, Celtic harp arpeggios, a tin whistle melody, a soft low drone and light bodhran,
warm and calm, loopable, no vocals." Make three, ~150 s each. Pick the cleanest loop (ear plus
`tools/music/fetch.sh`'s loudness print), encode `public/audio/music_guildcrest_air.{ogg,m4a}` as the
others, set `theme: { file: 'music_guildcrest_air', lufs: <measured> }`. Log it in ASSETS.md (ElevenLabs
Music, generated on the date, the account's terms) and ART_PROVENANCE.md (prompt, model, date). It
goes on the Credits screen.

### 8.2 Ambience and SFX (≤ 3 MB for the island)

Reuse the shared beds: wind on open ground (the moor and the ridge, louder), gulls at the quay
(quieter), a stream emitter at the linn (`waterfall_small`) and on the burn. New, via
`elevenlabs text-to-sound-effects` (log each): **abbey bell** (3 rings, ~6 s), **windmill creak** (a
slow wooden loop, ~8 s), **swift screams** (a short far chorus, ~4 s), **quill scratch** (~2 s),
**book close** (~1 s). Each goes in the island's preload list.

### 8.3 Voice

**New voices (G22), each verified with `elevenlabs voices get_shared` on 2026-11-01** (Voice Library;
the notice period in days). Add each to the account first if `generate.ts` needs it
(`elevenlabs voices share` with the voice's public owner id), then to `voice/cast.json` and
`docs/voices.md`.

| Speaker | Voice (id) | Accent, age, notice |
|---|---|---|
| Elspeth | Isla Skye – Scottish, Soft, and Warm (`TVmbglAk3F1GkiCoOq47`) | Scottish, middle-aged, 730 |
| Aidan | Cillian – Low, Calm and Authentic (`B5jEZPqk2OJ2vkPw3wBM`) | Irish, young, 730 |
| Brigid | Orla – Calm & Friendly (`WtSj8ZSBSK3JEi9xgqBG`) | Irish, middle-aged, 730 |
| Ewan | Chris – Father's Legacy (`aKQdyEogZx5VoND0oujS`) | Welsh, middle-aged, 730 |
| Fergus | David – Deep, Smooth, and Scottish (`1N4VgTBW1ZGBv5IHWRAf`) | Scottish, middle-aged, 365 |
| Rory | Steven – Warm Scottish English (`wnbtVuRBgnPmE1cCeLUN`) | Scottish, young, 730 |
| Seren | Hannah – Welsh and friendly (`73fZMjboCm1aBVyxTbBp`) | Welsh, middle-aged, 730 |
| Moira | Laura – Natural Scottish Conversational (`XaIM9neHiD6g6r88bMbY`) | Scottish, middle-aged, 730 |

If a voice fails (removed, or the account can't add it), take the next from the same search
(`elevenlabs voices get_shared --accent <scottish|irish|welsh> --gender <…> --language en
--min-notice-period-days 180 --sort trending`) and record the change in §15. Lyra, Juno and Wingman keep
theirs. After generation: `npm run voice:lipsync -- --course copilot-app`; check three lines of each
voice with speech-to-text for "skill", "agent" and "Guildcrest".

**The lines** (`[§…]` = Chapter 04 unless marked). About 62 island lines + 14 market lines + 6 battle
lines.

| Id | Speaker | Text | Cite |
|---|---|---|---|
| `gc.juno.arrive.01` | Juno | Guildcrest, Captain. A guild town, an abbey full of copyists, and windmills on the ridge. | flavour |
| `wingman.gc.01` | Wingman | They write the craft down here, so nobody types the same reminders twice. Skills and agents, Captain! | `[§learning-objectives]` |
| `wingman.starfish.guildcrest` | Wingman | And five starfish are hidden around Guildcrest. Your count's in the top right. | nav |
| `gc.lyra.01` | Lyra | Captain! The players already know their instruments. The bandleader still hands out a chart. | `[§from-the-studio-a-song-chart-for-the-session]` |
| `gc.lyra.02` | Lyra | The chart makes everyone play this song the same way. Hand it out, and listen. | `[§from-the-studio-…]` |
| `gc.lyra.03` | Lyra | A skill is that chart. A custom agent is the specialist who follows it, with the tools for the job. | `[§from-the-studio-…]` |
| `gc.lyra.04` | Lyra | You still check the result, though. A chart doesn't guarantee a good performance. Elspeth's on the square. | `[§from-the-studio-…]` |
| `gc.elspeth.01` | Elspeth | Welcome to Guild Square, Captain. Four ways to tell Copilot what you want, and each fits its own job. | `[§choose-the-feature-that-fits-the-task]` |
| `gc.elspeth.02` | Elspeth | This stone holds the house rules: repository instructions. They apply across every task in the project. | `[§choose-…]` |
| `gc.elspeth.03` | Elspeth | A skill is the chart for one kind of song. Use one when you repeat the same kind of work. | `[§choose-…]` |
| `gc.elspeth.04` | Elspeth | You'll find skills in Customize, and pick custom agents with slash agent. Brother Aidan keeps the abbey gate. | `[§core-concepts]` |
| `gc.aidan.01` | Aidan | Every copyist gets a carrel of their own, Captain. Yours is a practice session in a new worktree from main. | `[§create-a-practice-session]` |
| `gc.aidan.02` | Aidan | What you write there stays in that worktree. Keep the one session for every exercise. | `[§create-a-practice-session]` |
| `gc.aidan.03` | Aidan | Sister Brigid's in the scriptorium, through the cloister. Mind the ink. | nav |
| `gc.brigid.01` | Brigid | One book per craft, Captain. A skill is a folder with a SKILL.md file inside. | `[§skills-save-a-review-checklist]` |
| `gc.brigid.02` | Brigid | Our review book needs two new rules. Find it, read its spine, copy them in, and check every word. | `[§exercise-update-and-use-the-course-skill]` |
| `gc.brigid.shelf` | Brigid | The shelf index is Customize. The Installed tab, then filter to Skills. | `[§exercise-update-…]` |
| `gc.brigid.proof` | Brigid | Proof it. Only the two rules should have changed. | `[§exercise-update-…]` |
| `gc.brigid.bell` | Brigid | The readers still hold the old copy. Ring the bell: slash skills reload. | `[§exercise-update-…]` |
| `gc.brigid.lectern` | Brigid | Now read with it in Plan mode. Check the margin names the book, and check the plan against the files. | `[§exercise-update-…]` |
| `gc.brigid.03` | Brigid | Naming the skill makes your intent clear. It doesn't make the findings right. You check those. | `[§exercise-update-…]` |
| `gc.brigid.04` | Brigid | Brother Ewan keeps the chained library, along the north walk. Ask him what a book can't do. | nav |
| `gc.ewan.01` | Ewan | Look at that page, Captain. "Review without carving." And look at the apprentice's hand. | `[§core-concepts]` |
| `gc.ewan.02` | Ewan | A skill tells Copilot how to approach a task. It doesn't switch off a single tool. | `[§core-concepts]` |
| `gc.ewan.03` | Ewan | Some books carry scripts, or tell you to use tools. Read an unfamiliar one before you turn it on. | `[§core-concepts]` |
| `gc.ewan.04` | Ewan | The chains are on the tools, not in the books. Guildmaster Fergus can tell you about those. | `[§key-takeaways]` |
| `gc.fergus.01` | Fergus | You don't call one helper for every repair, Captain. You call the plumber, the electrician, the roofer. | `[§custom-agents-define-a-role-and-its-tools]` |
| `gc.fergus.02` | Fergus | A custom agent is a specialist: a name, instructions, and a set of available tools. | `[§custom-agents-…]` |
| `gc.fergus.03` | Fergus | A skill supplies the workflow. The agent is the role that does the work. It's not a new mode, or a new model. | `[§custom-agents-…]` |
| `gc.fergus.04` | Fergus | Rory's our new journeyman. He'll explain the Book App and change nothing. Come and fit him out. | `[§exercise-create-a-read-only-book-app-explainer]` |
| `gc.fergus.indenture` | Fergus | His indenture's his profile: a name, a description, a tools list, and his instructions below. | `[§custom-agents-…]` |
| `gc.fergus.rack` | Fergus | Match the tools to the task. An explainer only needs to read and search. | `[§exercise-create-…]` |
| `gc.fergus.door` | Fergus | The app loads custom agents when it starts. Closing the window isn't quitting. | `[§exercise-create-…]` |
| `gc.fergus.tests` | Fergus | His belt has no hammer, and that's on purpose. Use the default agent when you need actions. | `[§the-custom-agent-cannot-run-tests]` |
| `gc.rory.01` | Rory | The filters go through filterBooks to make filteredBooks. That same list feeds ReadingStats and the book cards. | `[§exercise-create-…]` |
| `gc.rory.02` | Rory | With Unread on, both show only unread books. I can read the tests, but I can't run them, so check it by hand. | `[§exercise-create-…]` |
| `gc.rory.done` | Rory | Read and search, Captain. That's all I carry, and all I need for this job. | `[§exercise-create-…]` |
| `gc.fergus.05` | Fergus | The tools list is the limit. Leave it out, and he'd get every tool there is. | `[§exercise-create-…]` |
| `gc.fergus.06` | Fergus | Abbess Seren keeps the bell, up by the tower. She'll test what you've learned. | nav |
| `gc.seren.01` | Seren | You've seen the house rules, the pattern books and the journeymen, Captain. | `[§key-takeaways]` |
| `gc.seren.02` | Seren | Save the craft, choose the right hands, and check the result. The Toolbelt Trial is ready when you are. | `[§key-takeaways]` |
| `gc.seren.03` | Seren | Next, Sunspire Sands. You'll connect tools from outside the app, and a plugin that brings its own skill. | `[§whats-next]` |
| `gc.seren.retry` | Seren | Not yet, Captain. Read the books again, and come back to the bell. | flavour |
| `gc.seren.assign.01` | Seren | One more job: take one recommendation from the review, and carry it through the inner loop. | `[§assignment]` |
| `gc.seren.assign.back` | Seren | A focused change, passing tests, and a record of only what ran. That's the craft. | `[§assignment]` |
| `gc.lyra.done`, `gc.elspeth.done`, `gc.aidan.done`, `gc.brigid.done`, `gc.ewan.done`, `gc.fergus.done`, `gc.seren.done` | each | one short "after" line each, pointing to the next stop or the sea (flavour, nav) | nav |
| `gc.elspeth.wait`, `gc.aidan.wait`, `gc.brigid.wait`, `gc.ewan.wait`, `gc.fergus.wait`, `gc.seren.wait` | each | one short "not yet" line each, naming the stop before theirs | nav |

**Moira's market lines** (`market.json` → `keepers.guildcrest`, Bram's keys): `gc.moira.market.hello`
"Welcome, Captain! Moira's Model Market. Hire a model that fits the job; bigger ones cost more
starfish." · `.open` · `.auto` · `.right` · `.fair` · `.keep` · `.over.effort` · `.short` · `.hard.auto` ·
`.broke` · `.done` · `.early` · `.bye` "Off up the brae? Your starfish and your jobs go with you." Each
keeps the meaning and citation of Bram's line with the same key.

**Voiced lines in the chapter file:** every line with a course citation goes in
`chapters/04-skills-custom-agents.json` → `voiced` (as Chapter 03's), so the content check holds its
source.

---

## 9. Battle 4: Keelhaven → Guildcrest (recaps Chapter 03, issue 358)

Each passage battle recaps the chapter you just finished (BATTLES §2.0, §2.0b). Battle 4 is built like
battle 3 (`KEELHAVEN_BATTLE`), with BATTLES §2.1's raiders and no kraken (G23).

| Item | Value |
|---|---|
| Id, plan | `passage-keelhaven-guildcrest`; `BATTLE_PLANS` index **3** (`GUILDCREST_BATTLE`, `guildcrestPassage(c)` in `src/world/battle/battle.ts`, rebuilt in `onCourseSelected`); `PASSAGE_BATTLES` `{ id: 'passage-keelhaven-guildcrest', plan: 3, from: 'keelhaven', to: 'guildcrest' }` |
| Waves | `[['cutter', 'cutter'], ['brigantine', 'cutter'], ['brigantine', 'cutter']]`, no events |
| When | the first time you sail from Keelhaven toward Guildcrest with the Seal of Keelhaven (`storyHolds('keelhaven', 'sealed')`); required, with **Skip battle** |
| Where | open water ≥ `BATTLE_MIN_OUT` (450 m) from Keelhaven's berth, ≥ 80 m from both islands' `contains`. Keelhaven's box ends at x 4640 / z −760; Guildcrest's starts at x 5280 / z −400: the zone is the ~900 m of sea between, south-east of Keelhaven. `battletest` checks the zone |
| Frame | **"Evidence Agrees."** The raiders are the sister ships of the wrecks on Keelhaven's reef. Your gunner fires only when the evidence agrees (BATTLES §2.1, built). Title card: "Evidence Agrees" (flavour) |
| Raiders by wave (name boards) | 1 *Confident Guess* ×2 · 2 *First Take* (the brigantine) and *Confident Guess* · 3 *Unchecked* (the brigantine) and *First Take* |
| Won line (`hooks.battles[…].won`) | "Three habits sank, and the evidence held. Guildcrest lies ahead, Captain." |
| Voiced lines | `b4.juno.sails` "Sails off the bow, Captain! Their name boards say *Confident Guess*." (flavour) · `b4.wingman.wave2` "*First Take*! They never look back at their own work." `[03 §inner-loop-develop-and-validate-on-your-machine]` · `b4.wingman.wave3` "*Unchecked*! Nobody read their checks." `[03 §fix-a-failing-check]` · `b4.juno.won` (the won line) · and the existing bosun lines |
| Data | `course.json` → `hooks.battles["passage-keelhaven-guildcrest"]` (`"chapter": "03"`, `won`, `waves[].quiz` N3.1–N3.3, `waves[].raiders`); `labels.json` → `battle:passage-keelhaven-guildcrest`; lines in `voice/lines.json` and `chapters/03-development-workflows.json` → `voiced` |
| Gates | `tools/battletest.mjs --battle=4` (add 4 to its accepted values: today 1 and 3): census ≤ 140 programs (expect ≤ 138) with Guildcrest resident; every raider's figurehead warmed (issue 266); sail jumps 0; no page error |

**The questions** (new scenario quizzes in `chapters/03-development-workflows.json`, `type: "mc"`, never
a Trial item; options shuffled):

| Id | Prompt | Answer | Wrong options (why) | Source (Chapter 03) |
|---|---|---|---|---|
| N3.1 | "Your tests and build pass on your machine. Which evidence answers 'Does CI agree with your local results?'" | The pull request's checks, in **Pull requests** | "The diff in **Changes**" (that shows if the change is focused) · "The running app in **Browser**" (that shows behavior) · "Copilot's summary" (a confident response isn't validated software) | `core-concept-trust-the-evidence` (`46abd535804e`) |
| N3.2 | "After a fix, the preview still shows the old unread count. What do you do?" | Go back to the change: inspect the diff, fix it, and reload the preview | "Open the pull request anyway" (repeat when the evidence shows a problem) · "Change the test to expect the old count" (don't weaken a test) · "Restart the app and hope" | `inner-loop-develop-and-validate-on-your-machine` (`10a0fe3998b5`) |
| N3.3 | "**Book app web** fails. Copilot offers an easy fix that edits the test's expected number. What do you do?" | Ask for the smallest code fix and keep the test | "Accept: the check goes green" · "Rerun until it passes" · "Merge: the local tests pass" | `fix-a-failing-check` (`f2156f9ed67c`) |

**Keelhaven's side:** Ottoline's `kh.otto.03` already points to Guildcrest. Keelhaven's
`tracker.next` changes (§4.2). Issue 358 closes with this battle.

---

## 10. Tech plan

### 10.1 The island package (copy Keelhaven's shape)

```
src/islands/guildcrest.ts                  GUILDCREST_ISLAND: IslandEntry (+ GUILDCREST_ARRIVAL)
src/world/islands/guildcrest/              (A, world)
  layout.ts           GUILDCREST, toWorld(u, v), every number in §3 (no three.js imports)
  anchors.ts          the anchors of §3.9 (source of truth after the build)
  height.ts           guildcrestHeightDry, guildcrestHeight, guildcrestMasks (+ test)
  terrain-regions.ts  villageGround, paths, grassHill, grassySlopes, forestFloor, bluff, cliff, campSand
  flora-palette.ts, flora.ts   heather, gorse, harebell, the sward (+ drifts)
  vegetation.ts       GUILDCREST_VEGETATION (pines, broadleaf at the glen's foot, shrubs, ferns)
  water.ts, water-mesh.ts      lochan, burn, linn, pool (shared natural water)
  rocks.ts            tors, the shared rock kit
  harbor.ts           berth, departure, landing, landingShot, lane (GUILDCREST_HARBOR)
  town.ts, town-build.ts       the town, the inn, the square, the guildhalls, the Charter Stone
  abbey.ts            gatehouse, cloister, scriptorium, library, church, bell tower, terrace
  ridge.ts            ridge path, guildhall yard, windmills (turning sails), tower stair
  circuit.ts          CIRCUIT_SPOTS.book and .belt, lamps, the stage's props (book, belt, banner)
  market.ts           Moira's booth (the shared stall parts)
  starfish.ts         GUILDCREST_STARFISH
  silhouette.ts       createIslandSilhouetteAsync
  chart.ts            GUILDCREST_CHART_TERRAIN
  waypoints.ts        GUILDCREST_WAYS (walk with heights; sea lanes)
  stream.ts           createGuildcrestStream (StreamLifecycle), ranges, footprint
  index.ts            createGuildcrestWorldAsync (sliced with breathe())
src/game/guildcrest-island.ts              GUILDCREST_CODE: IslandCode (a dynamic import, its own chunk)
src/game/guildcrest-session.ts             cast, chests, cues, sites, the two circuits, the Seal
src/game/guildcrest-npcs.ts                NPC specs (talkRadius 5.5 at the circuits' NPCs)
src/game/guildcrest-quests.ts              guildcrestScript(name) and helpers
src/game/guildcrest-circuits.ts            the CircuitStage for `book` and `belt` (§5.4)
courses/copilot-app/chapters/04-skills-custom-agents.json, quests/guildcrest.json,
  puzzles/pattern-book.json, puzzles/toolbelt.json (circuit), puzzles/song-chart.json (ceremony)  (B)
```

Registry line: `guildcrest: GUILDCREST_ISLAND` after `keelhaven` in `ISLAND_REGISTRY`. While A
builds, the entry can sit in `ISLANDS_IN_BUILD` (terrain regions and flora only) so the dev terrain
page shows it (`devpages/terrain.html?pack=guildcrest`).

### 10.2 The registry entry (`GUILDCREST_ISLAND`)

| Field | Value |
|---|---|
| `id`, `name`, `flag` | `guildcrest`, `Guildcrest`, `guildcrest` |
| `berthLabel`, `dockLabel` | `Guildcrest`, `Dock at Guildcrest's quay` |
| `mooring`, `departure`, `landingHeading`, `quay` | from `GUILDCREST_HARBOR` (§3.4) |
| `music` | `guildcrest`; `theme: { file: 'music_guildcrest_air', lufs: <measured> }` |
| `sky`, `mood` | `{ hours: 16.5, azimuth: <tuned for a 250° sun> }`; `{ fogScale: 1.8, hazeTint: [0.92, 0.96, 1.0] }` |
| `nextMorningAfter` | none (G4) |
| `open` | `{ after: { island: 'keelhaven', condition: 'sealed' } }` |
| `ranges`, `skyReach`, `footprint` | §3.1 |
| `starfish` | `GUILDCREST_STARFISH` (§3.10) |
| `courseBoard` | at the square's west entrance, facing down the lane; `where`: "At the west entrance to Guild Square, facing the lane up from the quay." |
| `chart` | `cx`, `cz` = centre; `scale` and the box as Keelhaven's (smaller box); `pack: 'guildcrest/chart'` (a coarse 8 m pack, O7's rule) |
| `chartLabelDy` | 80 (tune on the opening's chart) |
| `terrainRegions`, `floraPalette` | §3.2, G14 |
| `puzzles` | `{ 'pattern-book': 'circuit', toolbelt: 'circuit', 'song-chart': 'ceremony' }` |
| `market` | `{ keeper: { npc: 'moira', name: 'Moira' }, lines: 'keepers' }` |
| `stream` | `{ nearLoads: 'always', courseData: 'chapter-part', depthTile: true, reflected: false }` (its loch's shallows need its own floor tile) |
| `code` | `() => import('../game/guildcrest-island').then((m) => m.GUILDCREST_CODE)` |

### 10.3 The contract (step 0: `anchors.ts` names and `circuit.ts` spots)

The anchor names in §3.9 and the circuit places in §5.1 are the contract between A (world) and B
(content). B writes the content against these names before A's world exists (the pack leaves an island
ahead of the registry out at load: `withoutIslandsAhead`). A's `anchors.ts` exports
`GcAnchorName` with exactly the names of §3.9; `circuit.ts` exports `CIRCUIT_SPOTS.book` and
`CIRCUIT_SPOTS.belt` keyed by the places of §5.1.

### 10.4 Shared changes (each generic; course-neutral)

| Change | Where | Why |
|---|---|---|
| `CIRCUIT_PLACES.book`, `CIRCUIT_PLACES.belt` | `src/game/puzzles/circuit/places.ts`; the schema's enum | G7 |
| `STORY_CONDITIONS.guildcrest = ['firstVisit', 'bookCopied', 'journeymanHired', 'sealed']`, `STORY_EVENTS.guildcrest = []` | `src/game/story.ts` | §W.2 |
| `pineTree` species (or `buildPine`) and its impostor | `src/world/vegetation/` | G13 |
| heather, gorse, harebell rows | `floraSpeciesTable` (data) | G14 |
| crow-stepped gable piece | `src/world/village/pieces.ts` | G16 |
| swifts: `CreateBirdsOptions` gets `speed` (default 1) and the island passes `scale 0.55`, `altitude [6, 40]`, `speed 1.6`, perches on the belfry ledges | `src/world/life/birds/birds.ts`, `addIslandBirds` (an options object) | P3. No new material: same geometry and graph, smaller and faster; a darker per-instance colour only if the material already has one |
| lamp post (optional move) | `src/world/village/lamp-post.ts` from Keelhaven's `lamps.ts` | §5.4 |
| battle 4 | `src/world/battle/battle.ts`, `src/game/battles.ts` | §9 |
| `tools/lib/islands.json` | one line (the tools' id, scene names and spots) | adding-an-island |
| `neutral.test.ts` | `DENIED` patterns for Chapter 04's quest ids and words (`Q4.`, `book-app-reviewer`, `book-app-explainer`, `SKILL.md`) | the course-neutral rule |
| Keelhaven `tracker.next` | `quests/keelhaven.json` | §4.2 |

### 10.5 Arrival flyover (`GUILDCREST_ARRIVAL`)

Keys in the frame (`key(u, y, v, tu, ty, tv, pace)` as Keelhaven's):

| Key | Camera (u, y, v) | Target (u, y, v) | Pace | Beat |
|---|---|---|---|---|
| 1 | (−760, 24, −40) | (40, 60, 80) | 0.45 | H1: the loch mouth, the town, the tower, the mills, the ben; the card holds here |
| 2 | (−430, 16, −30) | (−196, 6, 8) | 1.1 | into the loch, the ship ahead |
| 3 | (−220, 26, 0) | (−96, 12, 46) | 0.8 | over the quay to the square and the linn |
| 4 | (−90, 44, 40) | (22, 40, 130) | 0.75 | up the brae to the abbey: the cloister from above |
| 5 | (10, 70, 100) | (150, 56, 200) | 0.8 | along the ridge: the guildhall and the turning mills |
| 6 | (90, 64, 120) | (56, 72, 114) | 0.8 | round the bell tower, swifts |
| 7 | (−170, 12, 20) | (−190, 3, 16) | 0.75 | down to the captain on the quay |

`seconds: 30`, `cardAt: 0.6`, `cardFor: 6.4`, `label: 'arrival:guildcrest'`. A test samples the spline
every 0.5 m: ≥ 3 m clear of terrain, the tower, the mills' sail discs and every collider.

### 10.6 Budgets per tier

**Whole frame** (PLAN §12.1; `check:frame-budgets`, settled, both sets: Keelhaven resident and freed).

| Tier | Draws / triangles gate | **Guildcrest's own groups** (gated) |
|---|---|---|
| Lite | < 100 / < 300k | ≤ 38 draws / ≤ 100k |
| Low | < 150 / < 500k | ≤ 58 / ≤ 180k |
| Medium | < 225 / < 1.00M | ≤ 90 / ≤ 380k |
| High | < 300 / < 2.00M | ≤ 125 / ≤ 750k |
| Ultra | < 400 / < 3.50M | ≤ 165 / ≤ 1.3M |

Inside the share: terrain Lite ≤ 12 draws / 40k; vegetation (pines with impostors past 60 m on Lite,
120 m on High) Lite ≤ 10 / 45k, High ≤ 26 / 420k; town + abbey + ridge Lite ≤ 10 / 25k (merged per
material; far blocks), High ≤ 50 / 200k; mills 1 draw each on Lite (sails merged into the tower's
bucket while the island is far; turning only within `detail`); fresh water and the linn 1 draw; the
silhouette ≤ 3 / 30k. **Plants count past their fade.**

**Shader programs** (PLAN §15.4): ≤ 150 on every tier and both backends; goal ≤ 135; **0 new expected,
≤ 2** (G12); battle 4 with Guildcrest resident ≤ 140. Census at the landing and after
`travelTo('island:guildcrest')`, both backends, every tier, after a walk to the cloister and the yard.

**Memory** (`check:memory`): `ROUTE` gets Guildcrest after Keelhaven; the ceilings in `budgets.json`
hold (High 661 MB tracked / 129 MB heap; Lite 228 / 103 MB). If Lite's heap goes over by the island
alone, measure, then raise to the measured peak + 15 % with the reason (Keelhaven O8's rule).

**Download:** the island's code chunk ≤ 120 KB gz (a `budgets.json` row like Keelhaven's); Chapter 04's
course part ≤ 28 KB gz; the terrain pack ≤ 1.0 MiB gz (smaller than Keelhaven's: 631 × 656); voice
≈ 2.5 MB; music ≈ 2.5 MB; SFX ≤ 0.5 MB.

### 10.7 Lite and Low cuts (PLAN §12.1)

| Feature | Lite | Low | Medium | High/Ultra |
|---|---|---|---|---|
| Pines | `KEEP` 0.25, impostors past 60 m | 0.45 | 0.7 | 1.0 |
| Heather/gorse clumps (flora) | terrain wash only | clumps to 30 m | to 48 m | full |
| Town houses | 12 (far ones as blocks) | 16 | 20 | 20 |
| Cloister arcade | merged, piers as boxes | full | full | full |
| Mills' sails | turn within `detail` only; one merged draw per mill | turn | turn | turn |
| Chimney smoke, linn spray (mist cards) | off | 1 card each | full | full |
| Swifts | off | 6 | 10 | 16 |
| Banners | flat, still | sway | sway | sway |
| Shadows | blob | cached 1024² | cached 2048² + characters | full |

---

## 11. Tests and gates

| Owner | Test |
|---|---|
| A | `height.test.ts`: the lane ≥ 6 m deep in a 30 m half-width and the turning circle; nothing above −6 m in them; the bounds reach the deep floor; the ben's top rounded |
| A | `layout.test.ts` / `index.test.ts`: every anchor on a walk surface with a 3 m clear radius; the route, the brae, the cloister walks, the ridge path, the yard and the tower stair sampled every 0.5 m have a surface, no step > 0.45 m, no collider across them; every stair has rails on both sides; flyover clearance (§10.5); every playable point's distance to Keelhaven's footprint > 1600 m |
| A | `npm run bake`: Anchorage, Port Meridian, Thousand-Bough and Keelhaven hashes unchanged; Guildcrest's stable between two runs |
| A | `harbor.test.ts`: the berth, departure and lane against the wind (both legs beam reaches, ≥ 60° off the wind); the ship's draft along the lane |
| A | `silhouette.test.ts`, `island-silhouettes`, `stream-rollback`, `residency.test.ts` (five islands; Guildcrest doesn't hold Keelhaven) |
| A | `flickertest --audit` views `gc-quay`, `gc-square`, `gc-cloister`, `gc-yard`, `gc-tower`; `cameratest` (`--max-bad 20`); `prop-audit.test.ts` for the cast's props (Rory's belt items, Brigid's quill, Ewan's key) |
| B | `ch04.test.ts` (or the content check): every `source.anchor` is in the ch04 snapshot with its hash; every app card's UI names appear in the chapter; hotspot rects inside their images |
| B | `circuit` tests for the new kinds: every station reachable; every wrong option has a `backTo` and a cite; the pattern book's lap needs six lamps, the toolbelt's seven |
| B | `guildcrest-quests.test.ts`: course order Q4.1 → Q4.8; a compass target for every step; every teaching line has a source; every dialogue line has a voice file and a lipsync entry; ≤ 4 lines before an action |
| B | `learning-store.test.ts` (real pack): A4.1–A4.6 render; Later never blocks; the Logbook claims app work only when confirmed |
| B | `neutral.test.ts`: Chapter 04's ids and words aren't in game code |
| B | `battles.test.ts`: battle 4 starts only with Keelhaven's Seal and once Guildcrest is open; its zone keeps 80 m off both islands |
| both | **`tools/guildcresttest.mjs`** (a copy of `tools/keelhaventest.mjs`, §11.1); `tools/battletest.mjs` takes `--battle=4` (today it accepts 1 and 3) |
| both | `wayfindtest --only=reach` (every NPC, chest, bottle, starfish, board and every circuit station from the landing), `--only=sea`, `--only=legs` (compass length within 1.5× the walk on every stop-to-stop leg) |
| both | `questtest` (Guildcrest's quests in the full run), `cardtest` (A4.1–A4.6 open, I did it / Later, the seen questions), `starfishtest`, `battletest` (battle 4), `revoyagetest`, `check:frame-budgets`, `check:memory`, `check:perf` (`guildcrest` and `gc-cloister` views), `check:opening`, `check:audio` (`--flow=islands` to Guildcrest), the census |

### 11.1 `tools/guildcresttest.mjs` (what it must play, by real input)

1. A continued save with Keelhaven sealed, at Keelhaven's quay; board, sail out; **battle 4** starts:
   fight wave 1 (answer N3.1 right), then **Skip battle** in one run and fight to the win in a second
   run (`--battle=fight|skip`). The won line plays; the sky goes forward to 16.5 h.
2. Sail into the loch, dock (the dock assist), step ashore. The arrival flyover plays once (Skip in the
   second run). Keelhaven goes to its silhouette, and is freed after 20 s.
3. Every stop in order by walking (the compass's route, `walkTo` with the player controller): Lyra (the
   ceremony by E; K4.1 with one wrong pick first), Elspeth (M4.1 with one wrong pair first; K4.2),
   Aidan (K4.3; card A4.1: **I did it** and the seen question), Brigid (**P4.1**: every station, one
   wrong option at each `choose`, then the right one; cards A4.2 **Later**, A4.3 **I did it**; chest
   C4.1), Ewan (K4.5; chest C4.2), Fergus (K4.6), the yard (**P4.2**: every station, one wrong tile and
   one wrong option at each `choose`; cards A4.4, A4.5; chest C4.3), Seren (**T4** once with a wrong
   answer → retry, then a pass; the reflection; the Seal cue; the bell).
4. The optional quest Q4.A: brief, card A4.6, K4.9 at the return.
5. Collect five starfish and four bottles (walk to each).
6. Reload the save on the island: the story holds (`bookCopied`, `journeymanHired`, `sealed`: the book's
   page, Rory's banner, the banners up); the hitch guard is empty after the warm.
7. Sail away to Keelhaven and back: Guildcrest is freed and comes back warm.
8. Fail on any page error, console error, WebGPU validation error, hitch, a stop that doesn't open, a
   quest out of order, a station the walker can't reach in 90 s, or a line with no audio.
9. Run it on WebGPU High and on WebGL2 Low. Save logs and JPEG shots at each stop under the session's
   files (not in the repo).

---

## 12. Build plan for the next agents

Two agents work in parallel from step 0, then join. **A** = world, **B** = content and voice. Each stage
ends with its gates green and a commit on `danwahlin-guildcrest` (no PR until Dan asks). Read §0 and
§10.3 first. When a number changes in the build, change `anchors.ts`/`layout.ts` and write it in §15.

| Stage | Who | Files | Done when |
|---|---|---|---|
| **0. Contract** (30 min) | A | `src/world/islands/guildcrest/layout.ts` (frame, `toWorld`, §3 numbers), `anchors.ts` (§3.9 names and positions), `circuit.ts` (`CIRCUIT_SPOTS.book`, `.belt`), `CIRCUIT_PLACES` additions + schema enum, `STORY_CONDITIONS.guildcrest` | typecheck; B can name every anchor, place and story condition |
| **1A. Terrain and water** | A | `height.ts`, `terrain-regions.ts`, `water.ts`, `water-mesh.ts`, bake (`npm run bake`), `chart.ts`, the chart pack, `harbor.ts`, `waypoints.ts` (sea lanes), `ISLANDS_IN_BUILD` entry; terrain dev page | §11 A height and harbor tests; other bake hashes unchanged; the dev page shows the loch, the knoll, the ridge and the ben on Lite and High |
| **1B. Course content** (parallel with 1A–2A) | B | `chapters/04-skills-custom-agents.json` (images, quizzes, pages, chests, glossary, trial T4, voiced), `quests/guildcrest.json` (tracker, quests, targets, beats, story, signs, scripts, notes, barks), `puzzles/pattern-book.json`, `puzzles/toolbelt.json`, `puzzles/song-chart.json`, `learning.json` (A4.1–A4.6, objectives, reflection, learned), `labels.json`, `market.json` (`keepers.guildcrest`), `course.json` (seal, arrival, hooks.islands.guildcrest), Keelhaven's `tracker.next`; battle 4: N3.1–N3.3 in `chapters/03-development-workflows.json`, `hooks.battles["passage-keelhaven-guildcrest"]` | `npm run content:check`, `npm run course:drift`, `npm test` (the content is "ahead of its island" until stage 3) |
| **2A. World art** | A | `flora-palette.ts`, `flora.ts`, `vegetation.ts` (+ pines, G13), `rocks.ts`, `town.ts`/`town-build.ts` (town, inn, square, guildhalls, Charter Stone), `abbey.ts`, `ridge.ts` (guildhall yard, mills, ridge path, tower stair), `market.ts`, `starfish.ts`, `silhouette.ts`, `stream.ts`, `index.ts`; swifts (§10.4); the crow-step piece | §11 A layout tests; `flickertest --audit`; a first `check:frame-budgets` on the dev page within the island share; census unchanged on the other islands |
| **2B. Voice and audio** (parallel) | B | `voice/cast.json` (8 voices, §8.3), `voice/lines.json`, `npx tsx tools/voice/generate.ts --course copilot-app --only=gc.,wingman.gc,wingman.starfish.guildcrest,b4.`, `npm run voice:lipsync -- --course copilot-app`; music (§8.1); SFX (§8.2); `docs/voices.md`, `ASSETS.md`, `ART_PROVENANCE.md` | every line has audio, timings and mouth cues; none pending; `check:secrets` |
| **3. Playable + battle 4** (join) | A + B | `src/islands/guildcrest.ts` (registry entry, arrival), registry line, `src/game/guildcrest-island.ts`, `-session.ts`, `-npcs.ts`, `-quests.ts`, `-circuits.ts`, NPC specs and palettes (`npc-palettes.ts`, `NPC_IDS`), the market stall, battle 4 (`battle.ts`, `battles.ts`), `tools/lib/islands.json`, `neutral.test.ts` patterns | the game sails from Keelhaven through battle 4 to Guildcrest; every stop plays; content check strict for Guildcrest |
| **4. Play-test and gates** | A + B | `tools/guildcresttest.mjs` (§11.1); fixes | `guildcresttest` passes on WebGPU High and WebGL2 Low (fight and skip); `wayfindtest --only=reach,legs,sea`; `questtest`, `cardtest`, `battletest`, `starfishtest`, `revoyagetest`; `check:frame-budgets` (both sets, the share), `check:memory`, `check:perf`, `check:opening`, `check:audio`; census; `npm run typecheck && npm run lint && npm run format:check && npm test`; `npm run build && npm run check:budgets && npm run check:secrets`; `npm run test:e2e` |
| **5. Records** | either | README (Guildcrest playable), PLAN §1 status and phase table, `.plans/issues.md` (358 closed; new rows for anything open), `docs/content-data.md`, the skill's island table (§1), this spec's §15 | — |

**Where the two can collide:** `courses/copilot-app/course.json` (B only), `src/game/story.ts` (A in
stage 0 only), `src/game/puzzles/circuit/places.ts` (A in stage 0 only), `voice/lines.json` (B only),
`tools/lib/islands.json` (stage 3). Everything else is separate files.

**If time runs short,** keep in this order (cut from the bottom): the playable route and both
circuits; battle 4; the Trial and the Seal; voices; the swifts; the mills' turning; the chests and
bottles; the optional quest; the generated music (fall back to `music_bards_tale` for the night and
record it in §15).

---

## 13. Acceptance

### 13.1 Checklist

| # | Item |
|---|---|
| A-1 | Sail from Keelhaven (battle 4 first, fought or skipped), dock at the quay, walk ashore; Keelhaven is freed while you play |
| A-2 | Eight quests at seven stops in the course's order, no walk back; the compass always points to the next (with heights) |
| A-3 | Both circuits play by keyboard, gamepad, mouse and touch (≥ 44 px), reduced motion and the text-only HUD; every wrong option has a sourced reason |
| A-4 | Every teaching line, check, card and page cites its Chapter 04 anchor; no UI name that isn't in the chapter |
| A-5 | Six app cards with the course's steps; Later never blocks; no GitHub check |
| A-6 | Budgets pass on Lite, Low, Medium, High, Ultra (WebGPU) and Lite, Low, Medium (WebGL2), with the island share; census ≤ 150 (goal ≤ 135) |
| A-7 | Hitch guard empty after the warm: by sea, by `travelTo`, from a save on the island |
| A-8 | `check:memory` passes with Guildcrest on the route |
| A-9 | The chart: miniature, card, status, fast travel; the silhouette from Keelhaven's Gate Light (H7) |
| A-10 | Starfish 5/5, chests 3/3, bottles 4/4 collectable and saved |
| A-11 | Voices for every line, one voice per character, lipsync, subtitles |
| A-12 | Guildcrest Air plays on the island and in the Songbook after the song chart |
| A-13 | `ASSETS.md`, `ART_PROVENANCE.md`, `docs/voices.md`, credits updated; `check:secrets` passes |

### 13.2 Screenshots (`tools/guildcrest-shots.mjs`, JPEG, 1920 × 1080)

H1–H7 on Lite, Medium and Ultra (WebGPU), H1 and H2 on WebGL2 Medium; the arrival as a 10 fps burst;
each circuit station right and wrong; the Seal as a burst. Saved under the session's files (or
`docs/reviews/<date>-island-04/` if Dan wants them committed), named `<shot>-<tier>-<backend>.jpg`.

### 13.3 The Walt Disney review (any "no" sends it back)

1. **Story:** can a first-time player say what this place is about (a guild that writes its craft down
   and hires specialists) without reading? 2. **The weenie:** is the bell tower the place you want to
   reach from the sea, the quay and the square? 3. **Wienies:** from every point, can you see the next
   thing? 4. **Highlands:** heather, pines, granite, a sea loch, mills on a ridge, long afternoon
   shadows? 5. **Colour story:** greens, purples and greys; saturated colour only on banners, doors,
   the sign, the bell? 6. **Kinetics:** sails, water, banners, swifts, smoke: something moving in every
   shot, nothing looping visibly? 7. **Readable paths** with the compass off? 8. **Delight:** the
   chained library, Rory's banner, the bell and the swifts at the Seal? 9. **Teaching through play:**
   after the circuits, can a player say why a skill's "don't edit" doesn't stop edits, and what does?
   10. **Illusion breakers:** terrain edges, floating props, z-fighting, the camera in the arcade, an NPC
   in a rail, text that doesn't match the course, an Octocat or a Copilot logo. 11. **Performance:** a
   single hitch on arrival, in the cloister or at the Seal is a "no".

---

## 14. Open risks

| Risk | Effect | Mitigation |
|---|---|---|
| **Overnight schedule** | stages run late | §12's cut order; A and B in parallel from stage 0; the circuits reuse a tested mechanic |
| **Pines** (new species) | the MegaKit zip's pine is missing or too heavy | G13's fallback (`buildPine`); impostors past 60 m on Lite; measure plants past their fade |
| **Lite triangles** (300k) | the town, the abbey and the pines together go over | far blocks for the town; the arcade as boxes on Lite; the share in §10.6 is gated per group |
| **Voices** | a Voice Library voice can't be added to the account, or is removed | §8.3's fallback search; record the swap in §15 and `docs/voices.md` |
| **Generated music** | a poor loop, or ElevenLabs Music unavailable | three takes; fall back to an existing theme for the night and record it (§12) |
| **The app's UI moves** (Customize, the agent picker) | stale names | the course's words only; `course:drift` in every gate run; the weekly refresh |
| **`/skills reload` or the agent picker missing in an app version** | a card's step fails | the course's own fallbacks (quit and reopen) are in A4.3, A4.4 and bottle B4.1 |
| **Battle census** | the peak passes 140 with Guildcrest resident | no kraken; same raiders and looks as battle 3; `battletest` census |
| **A circuit kind's place names** | they leak course words into code | `book`/`belt` places are the game's (shelf, spine, desk, rack, door…); the pack binds its ids with `"acts"`; `neutral.test.ts` |

---

## Wiring contract

### W.1 What the registry line does by itself

As Keelhaven W.1: Chapter 04's core and part load with the island; Keelhaven's `nextSail` shows once
Guildcrest is open; the content check turns strict for Guildcrest (cast, story names, signs, puzzles,
the market stall, audio for every line); the Course map and the Logbook include Chapter 04.

### W.2 Story (`src/game/story.ts`; the pack's `quests/guildcrest.json` → `story`)

| Name | `when` | What the game does with it |
|---|---|---|
| `firstVisit` | Q4.1 not done | Juno's and Wingman's welcome (`hooks.islands.guildcrest`) |
| `bookCopied` | Q4.4 done | the pattern book lies open on the scriptorium's lectern with its new page |
| `journeymanHired` | Q4.7 at `solved` or `done` | Rory's banner hangs on the roll board; his belt holds the reading glass and the lantern |
| `sealed` | Q4.8 done | the guild banners fly on the ridge; Sunspire's gate (later) |

### W.3 Cast (`NPC_IDS`, `IslandCode.cast`, `voice/cast.json`)

| NPC id | Speaker | Anchor | Beats and scripts |
|---|---|---|---|
| `lyra_guild` | Lyra | `lyra` | `lyra` |
| `elspeth` | Elspeth | `elspeth` | `elspeth` |
| `aidan` | Aidan | `aidan` | `aidan` |
| `brigid` | Brigid | `brigid` | `brigid`, `brigid.solved` |
| `ewan` | Ewan | `ewan` | `ewan` |
| `fergus` | Fergus | `fergus` | `fergus`, `fergus.belt`, `fergus.belt.solved` |
| `rory` | Rory | `rory` | (lines inside `fergus.belt` and the `bench` station) |
| `seren` | Seren | `seren` | `seren`, `seren.retry`, `trial.passed`, `seren.assignment`, `seren.assignment.back` |
| `moira` | Moira | `moira` | the market stall |
| `gc_fiddler`, `gc_whistler`, `gc_kid`, `gc_copyist`, `gc_miller`, `gc_shepherd` | — (barks) | `extra*` | barks only; the fiddler and whistler play in the ceremony; the copyist writes at `book.desk` |

### W.4 Cues (`host.cues`)

| Cue | Script | What the session does |
|---|---|---|
| `gc-chart` | `lyra` | runs the song chart ceremony (`puzzles/song-chart.json`) and unlocks Guildcrest Air |
| `gc-charter` | `elspeth` | the camera on the Charter Stone for M4.1 |
| `gc-book` | `brigid` | frames the cloister (`bookCam`) and opens P4.1 for its lap |
| `gc-chains` | `ewan` | the camera on the chained rack |
| `gc-belt` | `fergus.belt` | frames the yard (`beltCam`) and opens P4.2 |
| `gc-chest:C4.1`, `gc-chest:C4.3` | `brigid.solved`, `fergus.belt.solved` | opens the chest |
| `gc-seal` | `trial.passed` | the bell, the swifts, the banners (§4.5) |
| `celebrate` | `trial.passed` | as on the other islands |

### W.5 Compass ids → world places

`npc:<id>` for each NPC at its anchor; `book:*` and `belt:*` by prefix (only the waiting station is
usable, so the compass points to it); `chest:C4.x`, `bottle:B4.x` at §3.10's spots; `board:guildcrest`
(the course board).

### W.6 Puzzles

| File | Mechanic | `PUZZLE_STEPS` | Notes |
|---|---|---|---|
| `pattern-book.json` (`P4.1`) | `circuit` (`circuit: 'book'`) | `['book', 'solved']` | one lap, Q4.4 |
| `toolbelt.json` (`P4.2`) | `circuit` (`circuit: 'belt'`) | `['belt', 'solved']` | one lap, Q4.7 |
| `song-chart.json` | `ceremony` | `['start']` | Q4.1; `text` keys only |

`PUZZLE_STEPS` (src/course/puzzles.ts) for a circuit is keyed by the puzzle's name; add the two rows.

### W.7 Signs (`ISLAND_SIGNS.guildcrest` in src/course/pack.ts, the pack's `signs`)

`charterFoot` (`.github/copilot-instructions.md`), `shelfLabel` (`.github/skills/`), `bookSpine`
(`book-app-reviewer`), `bookFile` (`SKILL.md`), `rollBoard` (`.github/agents/`), `roryBanner`
(`book-app-explainer`), `beltRead` (`read`), `beltSearch` (`search`), `innSign` ("The Harp and
Whistle"), the three guild banners' names (`guildMasons`, `guildWeavers`, `guildMillwrights`).

### W.8 Chests, bottles, market and hooks

`IslandCode.chests`: C4.1 (opened by its cue), C4.2 (always), C4.3 (opened by its cue); bottles
B4.1–B4.4 (§3.10). `MARKET_STALLS`: `{ island: 'guildcrest', keeper: { npc: 'moira', name: 'Moira' },
lines: 'keepers' }`. `course.json` → `hooks.islands.guildcrest` and `islands[guildcrest].arrival`.

---

## 15. As built

Each stage writes what moved from this spec, and why.

### 15.1 Stage 0: the contract (agent A, 2026-11-01)

- `src/world/islands/guildcrest/layout.ts` (the frame, `toWorld`/`toFrame`, `headingUv`, §3's numbers),
  `anchors.ts` (`GUILDCREST_ANCHORS`, `GcAnchorName`: exactly §3.9's names; the stations are
  `book.<place>` and `belt.<place>`; `bookCam`/`beltCam` are `CameraAnchor`s with a `target`) and
  `circuit.ts` (`CIRCUIT_SPOTS.book`, `.belt`: `{ u, v, y, lamp, look }`, lamps `book:<place>`,
  `belt:<place>`). Positions are §3.9's until stage 1A/2A ground them; the names don't change.
- `CIRCUIT_PLACES.book`, `.belt` and the schema's enum; `STORY_CONDITIONS.guildcrest`,
  `STORY_EVENTS.guildcrest = []`.
- `story.test.ts` skips an island that isn't in the registry while the pack has no quests for it yet
  (Guildcrest until B's content joins): the check comes back by itself when either lands.
- `PUZZLE_STEPS` rows for `pattern-book` and `toolbelt` (W.6) are **not** added in stage 0: with no
  puzzle files in the pack yet, `steps.test.ts` fails on them. B (or stage 3) adds the two rows with
  the puzzle files.
- `tools/content/check.ts` asks for `quests/<island>.json` only once the island is in the registry (it
  failed on Guildcrest in stage 0, with `STORY_CONDITIONS.guildcrest` and no quests file yet).

### 15.2 Stage 1A: terrain and water (agent A)

- **Height** (`height.ts`): a superellipse coast with a wandering edge; granite sea cliffs only on the
  north-east flank (v > 70–170); an upland moor (27–33 m) with a shoulder rising east to the lochan's
  bowl; Ben Scrivener as a broad rounded cone (`BEN.r` 240, top 182, spurs, a corrie on its north
  face); the Guild Crest's crest line; the loch's sides as low hills; the town's slope (2.2 → 10 m) in
  an organic bowl under an escarpment that the brae climbs (a sharper crag where the linn falls);
  pads with cut and fill slopes for the quay, the square, the inn, the knoll (36), the gatehouse, the
  terrace shelf (40), the yard (42) and the mills; paths (quay lane, brae, ridge path, mill track,
  tower path); the loch carved last with the berth's dredged pocket.
- **Sun:** `azimuth` −21 puts the 16.5 h sun on bearing 250°, 23.8° up.
- **The loch is wider than §3.1** (about 100–112 m at the waterline, stations in `LOCH`): with the
  spec's 90–120 m and the lane's centre at v −30, the lane's 30 m half-width and the turning circle
  didn't keep 6 m of water. The turning room is r 40 at (−300, −33), ≥ 4.5 m deep (Keelhaven's is r
  40, 3.5 m).
- **The linn moved** to lip (−28, 63, y 34) → pool (−44, 58, level 10.2): at §3.3's place the brae's
  switchback stood 7 m from the falling water, and the lower brae crossed the pool. The burn now runs
  the glen at v ≈ 60 (south of the knoll), falls over a crag in the escarpment 20 m east of the brae's
  foot, and the **lower burn** runs south-west past the square's south-east corner to the loch's head
  (no footbridge on the route: the route never crosses water). The lochan's level is **46.5** (not 52):
  with the knoll standing proud of the moor, a 52 m lochan needed a levee.
- **The pebble cove** is a pebble shore at the loch's head (`PEBBLE_SHORE`, (−128, −8)), where the
  lower burn comes in: §3.10's (60, −150) was 180 m inland of the oval coast. `sf.g.cove` moves there
  (stage 2A, `starfish.ts`).
- **The berth:** bow to the mouth (bearing 323°), so her **starboard** side is to the quay (the
  spec's "port" doesn't fit a quay on the loch's north-east shore with the bow seaward; nothing in
  the game reads the side).
- **Sea chart:** `GUILDCREST_WAYS.sea` traced from the height (under 3.1 m, 18 m wider, 8 m
  tolerance; the loch's inner reach not widened), 48 points; a test keeps the berth, the departure,
  the turning room and the lane outside it.
- **Bake:** `tools/bake/bake-guildcrest.ts` (pack 3.95 MiB, **0.82 MiB gz**; chart pack 0.03 MiB gz);
  Anchorage `1aac2f2a`, Meridian `8d32083a`, Thousand-Bough `90dc42b3`, Keelhaven `dd928b70` and its
  chart `d3d7d814` unchanged.
- **Terrain regions** (existing keys): `villageGround` (town, square, knoll, yard), `paths`,
  `grassySlopes` (the moor), `forestFloor` (the pine stands, `stands.ts`), `campSand` (the pebble
  shore). The island is in `ISLANDS_IN_BUILD` (`GUILDCREST_IN_BUILD`); the dev terrain page has
  `?pack=guildcrest` with the hero views (§2.7) and ground views.

### 15.3 Stage 2A: world art (agent A)

**Built** (`src/world/islands/guildcrest/`): `town-build.ts` (the quay with fenders, bollards, a
rail along its face but for the gangway's gap, ship obstacles, a lamp and the slipway; 16 houses and
the inn; the three guildhalls; Guild Square with the Charter Stone, the market cross, benches, the
trough; the well, washing lines, lane lamps), `abbey.ts` (gatehouse, the four ranges with the slype,
the library's open bay and the east gate cut through, the arcaded walks under lean-to slate roofs, the
garth and its well, the Pattern Book's station pieces and lamps, the bell tower with its belfry, bell,
rope and slate cap, the terrace with its bench and the two railed flights down from the yard),
`ridge.ts` (the Guildhall of Journeymen, the yard's low walls and furniture, the Toolbelt's station
lamps, rails on the ridge path's steep side, three stone tower mills whose sails turn as one mesh each),
`market.ts` (Moira's booth), `rocks.ts`, `mist.ts` (the linn's spray and the chimneys' smoke, Low and
up), `vegetation.ts` (pine stands, broadleaf by the water, gorse and broom as shrubs, ferns),
`flora.ts`/`flora-palette.ts`, `silhouette.ts`, `stream.ts` (a `StreamLifecycle` like Keelhaven's),
`index.ts` (`createGuildcrestWorldAsync`), `starfish.ts`, `build.ts` (shared helpers: `GcOut`, railed
`flight`s, `lowWall`, `rail`, `lampPost`, `hangLantern`, `stoneHall`), `town.ts` (the town as data).

**What moved from the spec, and why:**

- **Houses are built here, not from the kit** (G16 said `house-builder.ts`): the kit's European
  houses are half-timbered (Tudor, not Highland) and their timber alone was 84k triangles on Lite
  (two `gc-town-wood` chunks). The harled houses are boxes in the kit's plaster with slate roofs,
  crow-stepped gables on about a third (all three guildhalls and the inn), chimney stacks, doors and
  windows: Lite's whole frame went from 133k to 68k triangles at the harbour.
- **Slate** is the kit's `paving` material painted slate grey (its `roofTile` is red clay, which no
  paint makes grey). No new material.
- **The cloister is smaller than §3.6's "36 m garth":** §3.9's station spots sit 14 m from the garth's
  middle, so the lawn is ±12 m, the walks ±12…16 m, the ranges ±16…24 m (u −2…46, v 106…154). The
  stations moved onto the walks (`circuit.ts`): shelf (8, 128), spine (8, 138), desk (16, 144), proof
  (30, 144), bell (36, 136), lectern (36, 122). Brigid (8, 121) by the scriptorium; Ewan in the library's
  open bay (24, 149) with the chained rack behind him (24.6, 152.6); the copyist at the desk
  (13.6, 144.6). The slype (v 116…120) takes you from the gatehouse (u −15…−7) into the west walk; the
  east gate (v 137…141) out of the east range onto the ridge path.
- **The guildhall yard:** the Guildhall of Journeymen stands on the yard's south side (u 88…116,
  v 134…144), its door (104, 144) and roll board on the yard. Stations: indenture (87, 160.5), rack
  (98, 165, the peg rail on the north wall), proof (103, 158, the table on the east wall), door
  (104, 149), roll (94, 148), bench (85, 152), testBench (80, 160). The mill track leaves by a gap at
  the north wall's east end; the tower stair leaves the yard's south-west corner.
- **The tower stair** runs (78, 147) → (80, 134) → two railed flights of 1 m → (77.6, 126) → the
  terrace (paved u 62…78, v 112…128, y 40).
- **The brae's top and the gatehouse are at 36** (the knoll's level; 34 made a 0.75 m step).
- **Scots pine** is built in code (`buildPine` in `vegetation/cactus.ts`, species `pineTree`, the
  procedural vegetation material, no impostor: drawn to `treeNear × 3` like the cypress), G13's
  fallback: the MegaKit pine would need a download, the model pipeline and a textured species. Lite
  keeps 25 % (`KEEP`), Low 45 %, Medium 70 %.
- **Flora:** four species (heather, gorse, harebell, a fern); the shared species table holds 24 rows
  and the five islands now fill it, so there's no thrift on the shingle. **The next island needs
  `FLORA_SPECIES_MAX` raised** (one uniform array's size; every island's grass shader changes once).
- **Swifts:** `CreateBirdsOptions` has `speed`, `count` and `lightness` (and `addIslandBirds` a
  `kind`); the island's swifts are 0.55 scale, 1.6 × speed, dark, 6–40 m up round the tower, 0 / 6 /
  10 / 16 / 16 by tier, perching on the belfry's ledges.
- **The pebble shore** is at (−110, −18); `sf.g.cove` (−100, −30). The other starfish: quay slipway
  (−153, 9.4), behind the linn's pool (−40, 50.5), by the cloister's well (22, 132.8), the far mill
  (172.5, 168).
- **Shared code moved (no behaviour change):** Keelhaven's walk decks → `village/walk-decks.ts` (its
  `DeckIndex` takes the island's `toFrame`), its lamp set → `village/lamp-set.ts`, `stoneUv` →
  `village/pieces.ts`; new pieces `crowStepGable` and `pitchedRoof`. The ridge, the glen and the path
  pads are continuous (each stretch's own, not the nearest's: the nearest-stretch switch made 3 m
  steps). `coplanar-audit.ts` reads only a mesh's draw range (a chunk's index holds its coarser
  levels after the full list: every face fought its own copy).

**Gates (stage 2A):** `npm run typecheck`, lint and Prettier (outside the scratch `tmp/`), `npm test`
(210 files, 1540 tests), `npm run build && npm run check:budgets && npm run check:secrets` pass.
Bake: other islands' hashes unchanged; Guildcrest `c2fb5af6` (stable run to run), 0.82 MiB gz.
Census (game, landed then each island by `travelTo`): High WebGPU 115 / 123 / 132 / 132 (base
115 / 125 / 132 / 132), Lite WebGL2 92 / 96 / 97 / 97 (base the same). Lamp audit: four Guildcrest
lamp rows added (`lamps.test.ts`). Coplanar audit (dev terrain page, `__dev.coplanar()`): what's left
is hidden faces inside walls (range against range, tower against church), the shared booth and the
mill sails' hub; no visible coplanar faces found.

**Frame budgets on the dev terrain page** (whole page: sky, ocean, terrain, the island; settled
views, not `check:frame-budgets`, which needs the island in the registry, stage 3):

| Tier | Worst view (draws / triangles) | Without the island's art | The art's share |
|---|---|---|---|
| Lite WebGL2 | 35 / 99k (tower) | 23 / 68k | ≤ 14 draws, ≤ 37k |
| Low | 50 / 165k (tower) | 23 / 96k | ≤ 27 draws, ≤ 77k |
| Medium | 118 / 304k (approach / harbour) | — | — |
| High | 118 / 664k (approach / harbour) | 98 / 405k | ≤ 38 draws, ≤ 324k |

**Open for stage 3:** the registry entry (`courseBoard` at `COURSE_BOARD_UV` in `town.ts`; footprint
measured from `guildcrestHeightDry`); sign poses for W.7 (the inn's board `INN_SIGN`, the roll board
by the hall's door, the Charter Stone's foot plate, the spine on the pattern book's case, the shelf's
press) are built as blank boards; Rory's banner, the book's new page and the Seal's banners are the
stage's to show; the sails' pace (`setSailPace`, ¼ with reduced motion); `flickertest` views
`gc-quay`, `gc-square`, `gc-cloister`, `gc-yard`, `gc-tower` once the island is in `tools/lib/islands.json`.
- **Later in stage 2A:** the Kirk Brae's two railed stair flights (the middle of each stretch, over the
  lane's ramp); Kenna's granite seat on the glen (`extraShepherd` is seated: its anchor is the seat's
  top); the arrival flyover's keys as data (`arrival.ts`, `GUILDCREST_ARRIVAL_KEYS`, §10.5's keys
  with key 4 at y 48, key 5 at 72 and key 6 at (100, 76, 110), clear of the ground, the tower and the
  sails by 3 m: a test); a docking test (the dock assist from the lane and from the turning room, no
  contact with the quay's obstacles) and the silhouette test (one draw, under 30k triangles on High).


### 15.4 Stages 1B and 2B: content, voice and audio (agent B, 2026-11-01)

Written ahead of the island (the content check holds it; the game leaves it out until the registry
line). Every new player-facing word is in the pack; a review copy is in the session's
`files/guildcrest/content.md`.

**Content (1B)**

- `chapters/04-skills-custom-agents.json`: five images, K4.1–K4.3, K4.5, K4.6, K4.9, M4.1, H4.1, H4.2,
  T4.1–T4.10 (the Trial's items, all scenarios but T4.4 and T4.10; hint tier 3 empty), 23 pages
  (§6.4 plus **`pg4.next`**, filed at the Seal as Keelhaven's `pg3.next`), chests C4.1–C4.3 and bottles
  B4.1–B4.4, six glossary terms, and `voiced` (every cited line). Part: 13.8 KB gz; a 28 KB row in
  `tools/budgets.json`.
- **H4.1/H4.2 measured** on the images: H4.1 (1920 × 1080) has four targets (the **Skills** filter
  [0.852, 0.093, 0.047, 0.042], the **Installed** tab, the search box, **Customize**) and the four badge
  masks; H4.2 (978 × 244, not 975) has four (the explainer's row, the default row, the agent picker, the
  mode). Both play in the circuits' close scripts after the screenshot, as Keelhaven's H3.1 does.
- `quests/guildcrest.json` as §4.2 and §4.4. Changes: **`gc.brigid.04` and `gc.brigid.done` were cut**
  (the credits ran out before them, below): Brigid's last beat is `none`, and her first bark says where
  Ewan is. **`rory` and `brigid` have barks** (text). The signs' guild names: "The Masons’ Guild",
  "The Weavers’ Guild", "The Millwrights’ Guild". Fergus's `fergus` script ends Q4.6 and starts Q4.7;
  the next talk plays `fergus.belt` (as Keelhaven's `cass.lap2`).
- `puzzles/pattern-book.json` (P4.1) and `puzzles/toolbelt.json` (P4.2) as §5.2–5.3. The toolbelt's
  `lines.benchAnswer` (`gc.rory.02`) is for the stage to play after the bench demo (`gc.rory.01` is the
  station's line). `PUZZLE_STEPS` rows `pattern-book: ['book', 'solved']`, `toolbelt: ['belt',
  'solved']` added (stage 0 left them to B).
- `puzzles/song-chart.json` (ceremony): **text keys are a proposal for stage 3**: `playFree`, `handOut`,
  `playChart`, `apart`, `together`, `unlocked`, `hint1`, `hint2`. No `PUZZLE_STEPS` row (as `retake`).
- `learning.json`: A4.1–A4.6 (no checks, G10), O4.1–O4.4 (word for word), the reflection. **The
  reflection is a choice** (the schema has no free text): five choices from the takeaways.
- `labels.json`: `arrival:guildcrest` (headline **"Save the craft, hire the right hands"**: the label's
  40-character limit; the arrival card keeps G25's line), `puzzle:P4.1`, `puzzle:P4.2`,
  `battle:passage-keelhaven-guildcrest` ("Evidence Agrees", Chapter 03's key takeaways).
- `course.json`: the seal, the arrival, `hooks.islands.guildcrest` (landing `gc.juno.arrive.01`; welcome
  `wingman.gc.01`, `@starfish`; tips **`wingman.gc.nav`**, a line the spec didn't list: the hook needs
  one) and battle 4's hook (N3.1–N3.3, the raiders by wave).
- **Battle lines, a generic schema addition:** `hooks.battles[].waves[].line` (a crew line as the wave
  sails in) and `wonLine` (the won line, voiced), in `course.schema.json`, `BattleHooks`
  (`src/course/catalog.ts`) and the content check. Battle 4's four lines (`b4.juno.sails`,
  `b4.wingman.wave2`, `b4.wingman.wave3`, `b4.juno.won`) are written but **pending** (below), so the
  hook doesn't name them yet. When they're voiced: hook them (waves 1–3 `line`, `wonLine`), and add
  `b4.wingman.wave2`/`.wave3` to Chapter 03's `voiced` (03 · inner-loop…, 03 · fix-a-failing-check).
- Keelhaven: `tracker.next` stays; **`tracker.nextSail`** "Guildcrest’s next. Board your ship and follow
  the compass south-east." (Anchorage's and Thousand-Bough's pattern). **Stage 3:** `keelhaven-island.ts`
  doesn't read `nextSail` yet (copy `thousand-bough-island.ts`'s two lines).
- `src/learn/content/ch04.test.ts`: cites in the snapshot, hotspots in bounds and clear of the masks,
  UI names only from the chapter, six cards with no check, the ten-item Trial over the takeaways, the
  quests' order and targets, at most four lines before an action, the circuits' six and seven stations
  with sourced wrong picks.

**Voice and audio (2B)**

- **All eight §8.3 voices worked** with a test line. Then **the ElevenLabs account ran out of credits**
  (the creator plan's 154k; it resets 2026-11-10) after Juno, Wingman, Lyra, Elspeth, Aidan and nine of
  Brigid's lines. Decision: **Ewan, Fergus, Rory, Seren and Moira speak with Azure stopgap voices**
  (`en-GB-AlfieNeural` −8 % −2 st; `en-GB-NoahNeural` −4 % −1 st; `en-IE-ConnorNeural` −2 %, Pim's
  voice at another rate; `en-GB-Sonia:DragonHDLatestNeural` −6 %; `en-GB-Ada:DragonHDLatestNeural`).
  Their planned ElevenLabs voices and the one-command swap are in `docs/voices.md`. 76 lines voiced,
  lip-synced and `--check`ed. Speech-to-text (Azure) on 21 lines: "skill", "agent", "Guildcrest",
  "/agent", "/skills reload" all heard; Fergus at −3 st was muddy, so he's at −1 st.
- **Music:** "Guildcrest Air", ElevenLabs Music, **one take** (the second and third hit the quota):
  149 s, −13.6 LUFS, `public/audio/music_guildcrest_air.{ogg,m4a}` via `tools/music/fetch.sh` (an
  `elevenlabs:` source, like `suno:`). Stage 3 sets `theme: { file: 'music_guildcrest_air', lufs: -13.6 }`.
  Credits screen updated.
- **SFX:** ElevenLabs sound effects hit the same quota. **Synthesized** (project-owned, deterministic,
  `tools/sfx/synth-guildcrest.{py,sh}`): `abbey_bell` (three strikes, 7.5 s) and `book_close`. **Reused:**
  `wheel_creak` for the windmills, `quill` for Cuthbert's quill, `tern` (quiet, far) for the swifts.

### 15.5 Stage 3: playable and battle 4 (2026-11-01)

**Built:** `src/islands/guildcrest.ts` (`GUILDCREST_ISLAND`, `GUILDCREST_ARRIVAL` from A's keys), the
registry line (and `ISLANDS_IN_BUILD` empty again), `src/game/guildcrest-island.ts`, `-session.ts`,
`-npcs.ts`, `-quests.ts`, `-circuits.ts`; 14 new NPC ids with bodies, palettes and accessories (only
existing accessory pieces); Moira's stall (`marketKeeper` anchor behind the booth's counter); the
manifest's `guildcrest/critical` and `guildcrest/chart` packs; `abbey_bell` and `book_close` in the SFX
bank; `ISLAND_SIGNS.guildcrest`; battle 4 (`GUILDCREST_BATTLE`, `BATTLE_PLANS[3]`,
`PASSAGE_BATTLES` row); `tools/lib/islands.json` (budget spots, decks, perf views `guildcrest` and
`gc-cloister`, flicker views `gc-quay`, `gc-square`, `gc-cloister`, `gc-yard`, `gc-tower`);
`tools/battletest.mjs --battle=4`; `tools/guildcresttest.mjs` (§11.1).

**Decisions:**

- **Pending battle lines show as captions.** The four `b4.*` lines stay `"pending": true` in
  `voice/lines.json` (no ElevenLabs credits until Nov 10). `tools/voice/generate.ts --pending` writes
  each pending line into the voice manifest as a caption (`pending: true`, no files, reading-time
  duration); every generate run rewrites them, and `--check` holds them. The game's `Dialogue` never
  waits on (or fetches) a pending line's voice. The content check lets a battle hook's crew lines
  (`waves[].line`, `wonLine`) be pending; nothing else may. When the lines are voiced: drop `pending`,
  run `generate.ts --only=b4.`, and add `b4.wingman.wave2`/`.wave3` to Chapter 03's `voiced`.
- **The won line plays only once it's voiced.** The win card already shows the same words; a pending
  caption under it read twice. `BattleRunOptions.voiced` tells the run.
- **Battle 4's raider names are six, not three** (`Confident Guess`, `Looks Fine` · `First Take`,
  `Green Enough` · `Unchecked`, `No Second Look`): `plans.test.ts` holds that a name is used once per
  battle (each hull has its own board). §9's three habits lead each wave. `b4.juno.sails` now says
  "The lead ship's name board says Confident Guess" (pending, so free to change).
- **Battle 4 has no "next morning"** (G4): the battle passes in Keelhaven's morning, and Guildcrest's
  16.5 h sky comes in with its waters as on the other islands.
- **Rory is an islander with barks** (`guildcrestExtras`), not a scripted NPC: his lines play inside
  `fergus.belt` and the bench station. `rory` and `brigid` barks are the pack's.
- **Ewan stands on the north walk** in front of the library's bay (23, 144.6): in the bay the talk's
  camera had no room between the presses.
- **Chests and bottles (as built):** C4.1 on the west walk by the scriptorium (7.1, 124.6); C4.2 in the
  library bay's front corner (27.6, 147.8); C4.3 by the yard's north wall (104, 164.6). B4.1 by the
  brae's switchback (−46.5, 82.5), B4.2 by the square's trough (−86.2, 36.6), B4.3 on the ridge path
  (57.2, 144.4), B4.4 by the test bench (82.6, 163.2). Each is read by E in `guildcresttest`.
- **The song chart ceremony** uses the pack's text keys as B proposed (`playFree`, `handOut`,
  `playChart`, `apart`, `together`, `unlocked`, `hint1`, `hint2`), played as a choice card with
  `lute_strum` (out of step, then together) like Keelhaven's re-take. There is no song unlock in the
  game (no Songbook mechanic exists yet): the `unlocked` line is the card's message.
- **The Pattern Book's camera** stands along the cloister walk under its roof (the arcade's piers came
  between a camera behind you and the station's wall); the yard's stays behind you to your right.
- **The Seal** (`gc-seal`): a cut to the belfry from east of the tower as the bell rings three times
  (`abbey_bell`), every station's lamp lights, then the ridge with the mills turning at 3× for 10 s.
  Reduced motion: no cuts, the bell, the lamps, the sails at their quarter speed. **Not built yet:**
  the guild banners unfurling, Rory's banner, the book's new page (`bookCopied`, `journeymanHired` hold
  in the save but show nothing), the swifts' burst.
- **Choice cards render `**bold**` and `` `code` ``** (`SeaChoice` through `Rich`; the screen reader's
  copy is plain): the pack's circuit prompts use them (Keelhaven's didn't).
- **Keelhaven reads `tracker.nextSail`** (as Thousand-Bough), and Guildcrest does too (generic).
- **Course images:** Chapter 04's five images are `pinned` in `lock.json` (the refs test asks it of
  every image the game shows).
- **Strict again:** `story.test.ts` no longer skips an island that isn't in the registry; the content
  check is strict for Guildcrest by itself (the registry line).

**Play-test (WebGPU High, the play page, `tools/guildcresttest.mjs`):** by the chart (`--battle=none`):
every stop, both circuits (a wrong pick first at every choice, a wrong tile), cards A4.1–A4.6 (A4.2
Later), the Trial failed once (three wrong, then away) and passed, the Seal, Q4.A, four bottles read,
no console error, empty hitch guard. Battle 4 (`--battle=fight`): 131–135 programs with Keelhaven and
Guildcrest resident, every wave's question, the crew's captions, then docking at the quay and the
arrival. `battletest --battle=4 --only=play`: won, saved, docked at Guildcrest, peak 135 programs.

**Left for stage 4:** the WebGL2 Low runs and the skip run of `guildcresttest`; reload on the island
(§11.1 step 6) and sail away and back (step 7); starfish collected by walking; `wayfindtest --reach`,
`questtest`, `cardtest`, `starfishtest`, `revoyagetest`; `check:frame-budgets`, `check:memory` (add
Guildcrest to `ROUTE`), `check:perf`, `check:opening`, `check:audio`; the census; `flickertest` and
`cameratest` on the new views; the W.7 signs painted (the boards are blank; the names are in
`ISLAND_SIGNS`); the Seal's banners, Rory's banner and the book's page; the swifts' burst. The
battle HUD shows a situation's single `*italics*` as asterisks (battles 3 and 4; pre-existing).

### 15.6 Stages 4 and 5: play-test, gates and records (2026-11-01)

**Built (the pieces stage 3 left):**

- **The signs read the pack.** The builders hand their lettering to the world as `GcOut.signs`
  (sign names, place, facing, size and look), and `index.ts` paints them all in the island's one
  `SignSet` (one draw, with the course board's notices) and repaints them in an `onCourse` hook,
  released with the world. A sign with no words (the dev page) is hidden. The inn's sign (lowered to
  3.7 m and enlarged: at 5.2 m its name was a few pixels), the guildhalls' three banners (their
  guild's name down the cloth), the Charter Stone's bronze plate at its foot, the shelf's label over
  the press, the pattern book's spine and its file on its case, the roll board's heading, and the peg
  rail's two tags (`read`, `search`). Big cloths seen from afar paint at a fixed width
  (`SignOptions.pixels`, generic): at 640 px/m the first atlas was 1152 × 9726 px.
- **The course board** (its registry placement had no timber or notices: its "Read the notices"
  prompt stood on bare ground at the square's west entrance) is built like Keelhaven's.
- **The story shows** (`GuildcrestWorld.show`): the copied book's new page lies open on its cover on
  the case (`bookCopied`, at the Pattern Book's close), Rory's banner (cream canvas, his name) unrolls
  on the roll board at the Toolbelt's close (`journeymanHired`), and the guilds' three banners hang
  by the mills (`sealed`). Decision: **the Seal's banners stand by the mills**, one a mill, on poles
  that always stand (their crossbars bare until the Seal), so the ridge shot at the Seal shows them
  unfurl (1.6 s each, from their crossbars); with reduced motion they're simply there. After a
  reload, `settle()` shows each from the save (only ever on: a lap's close shows its piece before its
  quest is through).
- **The swifts burst** from the belfry at the Seal's first bell (`BirdsSystem.burst`, generic: the
  perched take off, the flock climbs away at twice its pace for 5 s, then wheels back).

**Fixed (each at its root):**

- **Italics on the question cards** (issue 371): one inline markup (`src/learn/inline-markup.ts`:
  `**bold**`, `*italic*`, `` `code` ``; everything else escaped) for the battle's question card, the
  choice cards and the quiz panel. The packs' single-star spans are all names (`*Confident Guess*`,
  `*Muddy Main*`…).
- **The zigzag escarpment by the linn** (issue 370) wasn't the masks: the lochan's bowl ended at a
  hard 90 m radius, a 6 m wall west of the glen that no terrain level could draw. The bowl now eases
  into the moor from 62 to 96 m (`LOCHAN_SKIRT`). The burn runs down a slope there now (rapids) where
  it fell over the wall. Other islands' bake hashes unchanged; Guildcrest's is `cb241a4e`.
- **The gangway went into the loch** (issue 368, found by the player pass and `wayfindtest`): bow to
  the mouth put the brigantine's gangway on the loch side. The berth's bow is now up the loch (you
  come alongside as you sail in; the departure still faces the mouth). `height.test.ts` checks the
  gangway's foot lands on the quay.
- **The compass's walk round the cloister** ran into Brigid (mid-walk) and stopped, and Kenna had no
  route (issue 369): the west and north walks' lines keep to the arcade's side, and a route runs from
  the brae's switchback over the moor and the burn to her seat.
- **Battle question cards lost quick key taps** (issue 373): the keys' held state was read once a
  frame. A move key's press is now an edge (`InputState.navY`).

**Tests added or extended:** `tools/guildcrest-savetest.mjs` (§11.1 steps 6 and 7: a save on the
island, Continue, the story from the save, the chart to Keelhaven until Guildcrest is freed, and back,
hitch-free; it travels by the game's chart, `flow.travelTo`: `session.travel` skips the warm and saw
hitches the game wouldn't); `guildcresttest` walks onto each starfish; `wayfindtest` sails on to
Guildcrest in its sitting and walks Guildcrest's reach by default (Guildcrest's debug has
`railedTreads`/`stairHeads` from its flights); the session's debug has `shot` (a still camera) and
Guildcrest's `signs` and `showing`; video scenarios `battle4` and `guildcrest`.

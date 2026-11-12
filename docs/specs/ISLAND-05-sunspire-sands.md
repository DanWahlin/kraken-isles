# Spec: Island 05, Sunspire Sands (Chapter 05 · MCP Servers and Plugins)

> Status: **in the game, not yet play-tested end to end** (2026-11-11; §12 says what is done and what is left). A design spec with every decision made, in the form of
> [ISLAND-04](ISLAND-04-guildcrest.md), which it follows and whose code it reuses (the island
> package, the `circuit` mechanic, the shared stream, the wiring contract). It is shorter than
> ISLAND-04 because it does not repeat what that spec and
> [adding-an-island](../adding-an-island.md) already say. Read
> [PHASE-3](PHASE-3-islands-05-07.md) first: the arc, the toys, the gates and the build order.
>
> Course source: `github/copilot-app-for-beginners` at `8cb2792`, `05-mcp-plugins/README.md`.
> Written in ASD-STE100 Simplified Technical English. A build step that finds a decision wrong
> records the change and its reason in §12 ("As built"). It does not stop to ask.

---

## 0. Decisions

| # | Decision | Why |
|---|---|---|
| S1 | **Site:** centre `C = (6565, 3380)`. Frame as Guildcrest's: `u` along bearing 143° (the cove's mouth → inland), `v` along bearing 53°. Baked bounds x 5935…7195, z 2725…4035, cell 2 m (631 × 656) | 3 200 m from Guildcrest on bearing 168°: 65° off the wind (from 233°), a close reach, no tacking. Guildcrest (`unload` 1550) is freed while you play here |
| S2 | **The harbour is a cove that opens to the north-west**, axis 143°/323°, with Guildcrest's quay, berth, lane and turning-room numbers | Entry and exit are beam reaches (issue 292). The lane's depth and width are already proven by Guildcrest's tests |
| S3 | **Sky: the morning after Guildcrest.** `hours` 10.0, `nextMorningAfter: 'guildcrest'`, sun bearing target **60°** (tune `azimuth` ± 5°). `mood` `{ fogScale: 1.2, hazeTint: [1.0, 0.95, 0.86] }` | The mirrors need the sun. From the landing you look south-east (143°) at the mesas: a sun at 60° side-lights their cliffs. A sun behind them would turn the weenie into a black shape |
| S4 | **One weenie: the Sunspire.** A square adobe-and-stone heliograph tower on the High Mesa, base y 46, top y 92, with a great round mirror at y 86 that flashes. It is the island's lighthouse (`lampBurning`) | PHASE-3 §3 |
| S5 | **The signature toy is Mirror Beams** on the `circuit` mechanic's new `dial` station. A visible beam of light leaves the court's mirror and turns with it | PHASE-3 §5. The beam is the delight; it also teaches "enabled isn't connected" with no words |
| S6 | **Two circuits:** `signal` (P5.1 Mirror Beams, the MCP server, 8 stations at 6 places) and `crate` (P5.2 The Sealed Crate, the plugin, 6 stations at 5 places). Added to `CIRCUIT_PLACES` and the schema's enum | Chapter 05 has two exercises that don't depend on each other |
| S7 | **Eight quests at seven stops, course order, one direction,** plus the optional assignment. Longest gap 120 m | ISLAND-04 G9 |
| S8 | **Six "Do this in the app" cards** (A5.1–A5.6). No GitHub checks | Chapter 05 changes no files and opens no pull request |
| S9 | **Ids:** island `sunspire`; quests `Q5.1`–`Q5.8`, `Q5.A`; cards `A5.1`–`A5.6`; checks `K5.x`, `M5.1`, `H5.1`–`H5.3`; Trial `T5`; pages `pg5.*`; chests `C5.1`–`C5.3`; bottles `B5.1`–`B5.4`; puzzles `mirror-beams` (P5.1), `sealed-crate` (P5.2), `gear-song` (Lyra's ceremony); battle `passage-guildcrest-sunspire` | The chart and `course.json` already use `sunspire` |
| S10 | **Red rock:** try the existing `bluff` region for the mesas and `campSand` for the desert floor first. Add one new region key, `redRock` (warm banded sandstone), only if the terrain dev page shows that `bluff` does not read as red desert rock. Record the census if it is added | PLAN §6 promises red sandstone at Sunspire. ISLAND-04 G12 says a new key changes the shared terrain graph, so it must be earned |
| S11 | **Plants:** saguaro, prickly pear, agave and scrub from `vegetation/cactus.ts` (builders in the shared vegetation material); date palms (the existing palm) only at the oasis. Flowers are flora rows: desert marigold `#E8B830`, globe mallow `#E0763A`, sand verbena `#B46AAE` | No new material. A flower is data |
| S12 | **Buildings:** adobe cubes with rounded parapets, roof beams (vigas) and blue doors from the village kit's stone and timber buckets with `tintFor`; awnings and pennants in the cloth bucket | No new material |
| S13 | **Water:** the cove is the sea. Fresh water is one spring cistern on the Low Mesa, a short run through a slot canyon, a 16 m fall (the Weeping Wall) into the oasis pool, and a stone channel (the falaj) to the cove's head. Shared natural water, as Guildcrest's burn and linn | Kinetic water on the route, and little of it |
| S14 | **Birds:** gulls over the cove; **raptors** on thermals over the mesas (`kind`: scale 1.5, altitude 60–140, speed 0.6, count by tier) | PLAN §6 |
| S15 | **Lyra** plays in the caravanserai's courtyard and retells "Connecting the Gear". **Yusuf** keeps the Model Market stall on the quay | PLAN §3; MODEL-MARKET §2 |
| S16 | **Voices** as ISLAND-04 G22. Lines stay `"pending": true` until their audio exists | PHASE-3 §9 |
| S17 | **Music:** "Sunspire Crossing" (`music_sunspire_crossing`, 132 s, −15.5 LUFS), made by Dan with Suno from the brief in PHASE-3 §8. In the game since 2026-11-11 | PHASE-3 E10 |
| S18 | **Battle 5** on the Guildcrest → Sunspire passage: battle 4's form, questions N4.1–N4.3 (Chapter 04) | PHASE-3 §6.3 |
| S19 | **Arrival card:** eyebrow `Chapter 05 · MCP Servers & Plugins`, title `Sunspire Sands`, line `Reach farther, and carry only what you need` | Both halves of the chapter and the desert's rule |

---

## 1. Teaching map (Chapter 05)

Folder `05-mcp-plugins`. Anchors are the slugs `src/learn/course/sections.ts` makes. Hashes come from
`lock.json` after the sync. Images are `ch05/<file-without-extension>`.

| # | Anchor | What it teaches | Images | UI names |
|---|---|---|---|---|
| 1 | `learning-objectives` | Five objectives; ~45 minutes | — | — |
| 2 | `prerequisites` | Chapter 04; the fork; internet; permission to add a server and install a plugin. If your organization blocks an integration, read the example, note that you couldn't run it, and go on | — | **Customize** |
| 3 | `from-the-studio-connecting-the-gear` | A song chart doesn't connect a microphone. An MCP server is a connection to equipment: it exposes tools. A plugin is a packaged set of additions. Check what's included and what access it needs | `extending-copilot-app` | — |
| 4 | `mcp-server-versus-plugin` | The two-row table. A plugin can include an MCP server, but the two aren't interchangeable. Find both in **Customize**. Add an integration only when the task needs it: every extra tool is more noise and more access to review | `least-tool-principle` | **Customize** |
| 5 | `create-a-practice-session` | **Create from** → **Branches** → `main`; **Interactive**; **Default agent**; the prompt that finds three files. NOTE: a worktree separates file changes, not installed tools | — | **Create from**, **Branches**, **Interactive**, **Default agent** |
| 6 | `mcp-servers-get-information-from-another-service` | The browser-extension analogy. MCP defines how an AI application connects to tools and data; a server supplies the tools; it can run on your machine or at a remote service. Configure in **Customize** with the type filter **MCP**, not **Extensions**. Use MCP when the current tools don't supply what the task needs. One connection per service | `browser-extensions-analogy`, `app-customize-mcp` | **Customize**, **MCP**, **Extensions**, **MCP Servers**, **Installed** |
| 7 | `exercise-check-the-book-apps-input-labels-with-context7` | **Browse** → type filter (**All types**) → **MCP** → search `context7` → **Add server**; the dialog (Server name `context7`, Server type `HTTP`, the URL); **Installed**: the connected icon and the enabled toggle; the general question; expand the tool activity; open a source link; the local comparison. Expected: nested labels are fine; no files change | `app-context7-configuration` | **Browse**, **All types**, **MCP**, **Add server**, **Context7**, **Installed**, **MCP Servers**, **Interactive** |
| 8 | `plugins-use-a-packaged-capability` | A plugin can include skills, custom agents, MCP servers or canvas extensions. A **marketplace** is a catalog of plugins. Installing is different from invoking. Read its contents, not only the description. Some plugins start processes, call services or run hooks | — | **marketplace** |
| 9 | `exercise-plan-a-css-improvement-with-modern-web-guidance` | **Browse** → **Plugins** → search `modern-web-guidance`; **Add** > **Manage marketplaces…**, **awesome-copilot**, **Source** `github/awesome-copilot`; open the details and compare with the repository; **Install**; **Installed**; `/skills reload`; type `/` and select the skill (a plugin prefix); the prompt; inspect the skill activity. `text-wrap: balance` must say what happens where it isn't supported. Installation alone doesn't prove that the skill ran | `app-customize-plugins` | **Browse**, **Plugins**, **Add**, **Manage marketplaces…**, **Marketplaces**, **Source**, **Install**, **Installed** |
| 10 | Troubleshooting: `i-cannot-find-mcp-or-plugins-in-settings`, `an-mcp-server-is-enabled-but-its-tools-fail`, `a-plugin-is-installed-but-its-skill-is-missing`, `the-agent-cannot-use-the-integration` | Four problems and fixes | — | **Customize**, **Default agent**, **Tool permissions** |
| 11 | `key-takeaways` | Five takeaways (the Trial maps them) | — | — |
| 12 | `assignment` | The evidence table; correct unsupported claims; **Changes** lists no files; say why one is a server and one a plugin; disable only what you added | shared `assignment` | **Changes** |
| 13 | `whats-next` | Chapter 06: a community canvas installed through a plugin | — | — |

### 1.1 The metaphor, object by object

| Course object | Sunspire object | The rule it carries |
|---|---|---|
| MCP server | **A heliograph tower** | A connection to a service: it gives the crew tools to ask with |
| Context7 | **The Great Library** across the water, reached through Library Rock's light | A documentation service. It doesn't become part of your ship |
| **Customize** → **Browse** → **MCP** | The Signal House's roll of towers | Where you add one. Not **Extensions** |
| The Context7 dialog (name, `HTTP`, URL) | The tower's brass card: its name, its kind, its bearing | `HTTP`: a far tower you reach, not one you build in your own yard |
| Enabled toggle, connected icon | **The shutter** and **the beam's far end** | An open shutter alone doesn't prove the beam arrives |
| One connection per service | One beam to a tower | A second beam is a duplicate, not more reach |
| The general question | **The flashed message** | Flash the question. Keep the ship's own chart at home |
| Tool activity, source links | **The reply flash and its seal** | Check that a reply came, and who sealed it. Don't take the signaller's word |
| The local comparison | **The chart tent** in the court | The answer is compared with your own chart here. No more flashes |
| Plugin | **A sealed crate** | A package: skills, agents, servers or canvases can be inside |
| Marketplace, `awesome-copilot` | **The bazaar**; the caravan's own row of stalls | A catalog of crates |
| The plugin's details and repository | **The bill of lading** and the maker's mark | Read what's inside before you take it. Some crates hold things that start by themselves |
| Installed isn't invoked | The tool lies in the crate until you call for it | `/skills reload`, then `/` and the skill's name |
| The least-tool principle | **Packing for the crossing** | Every extra tool is weight, noise and one more thing to guard |
| A worktree separates files, not tools | Each tent is its own; **the well is everyone's** | A server or plugin you add serves every tent |

---

## 2. Art direction

- **The story the land tells:** a busy adobe port under red mesas. Caravans come down to the bazaar
  with sealed crates. Up on the rock the Signal Guild's mirrors talk across the sea. The Sunspire
  stands over all of it and flashes. **Port → bazaar → oasis → the signal mesa → the Sunspire.**
- **Look in one sentence:** a hard bright morning on a red desert island: a turquoise cove, a white
  and ochre adobe town with blue doors and striped awnings, a green oasis under a weeping red wall,
  saguaro on the slopes, and stepped mesas that carry mirror towers, the tallest one flashing.
- **Palette:** red rock `#B5562E`, shade `#7A3A24`, pale band `#D9A066`; sand `#E2C08D`; adobe
  `#E6D2B0`, ochre `#D49A52`, whitewash `#F1E9DA`; doors and trim cobalt `#2C5C9A`; awnings saffron
  `#E0A030`, madder `#B8443A`, indigo `#34507E`; oasis green `#4F8A4A`; saguaro `#5E7F4E`; brass
  `#C89B3C`; the beam warm white. Saturated colour only on doors, awnings, pennants, the mirrors
  and the Seal.
- **From the sea:** two stepped red tables and a higher butte behind; a pale town at their foot;
  one tall tower with a flash at its top; a small rock with a white light off the north-east coast.
- **Layered depth from the berth:** quay and stall → caravanserai gate → awnings → the square →
  palms of the oasis → the Weeping Wall → the Low Mesa and its court → the High Mesa → the
  Sunspire → Red Butte → sky.
- **Kinetic:** the Sunspire's flash; the beams in P5.1 and at the Seal; awnings and pennants; palms;
  the fall and the falaj; the well's wheel; raptors; dust wisps on the dunes (mist cards, Low and
  up); washing on roof lines. Reduced motion slows or stops them.
- **Delight:** the beam that sweeps the desert as you turn the mirror; the wind-up contraption that
  runs off when you open a crate you did not read; every mirror on the island answering at the Seal.
- **Signs use the course's exact strings:** `context7` (the brass card), `HTTP`,
  `https://mcp.context7.com/mcp`, `modern-web-guidance` (the crate's stencil), `awesome-copilot`
  (the caravan row's arch), `/skills reload` (the bell's plate). Never an Octocat or a Copilot logo.

### 2.1 Hero shots

| Id | Shot | Must show |
|---|---|---|
| H1 | The Approach (arrival key 1) | The cove mouth, the town, both mesas, the Sunspire's flash, Red Butte |
| H2 | First Look (landing) | The quay, the stall, the caravanserai gate, awnings, the Sunspire above |
| H3 | The Bazaar | The square, awnings, blue doors, Zahra's scales |
| H4 | The Oasis | The pool, palms, the Weeping Wall, the camp's tents, the well |
| H5 | The Mirror Court | Three mirrors, a live beam to the Sunspire, the sea behind |
| H6 | The Sunspire | The tower from the Sundial Terrace, raptors |
| H7 | Horizon | The island from 1 200 m: the tables, the tower, the flash |

---

## 3. Layout (frame metres; origin `C`; heights y)

All numbers live in `src/world/islands/sunspire/layout.ts` after the build. `u` is inland from the
cove's mouth; `v > 0` is the town's side.

| Thing | Where | Notes |
|---|---|---|
| Coast | oval: centre u 0, half-axes 430 × 350, power 2.5, noise 30 over 150 m, ragged 8 | Sea cliffs (red, 15–30 m) on the north-east and south-east; beaches and dunes on the south-west |
| The cove | Guildcrest's `LOCH` stations, with the south-west shore 60 m wider (a crescent beach) | The lane, the turning room and the berth pocket as Guildcrest's |
| Quay, berth, departure, landing | `QUAY { v 12.5, u −235…−150, top 2.2 }`, `BERTH (−196, 8)`, `DEPARTURE (−212, 2)`, `LANDING (−190, 16)` | As Guildcrest's |
| Caravanserai (the inn) | (−160, 44), y 3; a courtyard 18 × 14 with a gate to the quay | Lyra; chest C5.1 |
| The bazaar square | centre (−100, 50), half 20 × 15, y 8 | Zahra; the course board at its west entrance; awning lanes down to the quay |
| The oasis | pool (0, −34), r 14, water y 9.4; the camp (−30, −8), y 10; the well (−40, −20) | Idris; date palms; three tents |
| The Weeping Wall | lip (22, −40), y 26; falls to the pool | 16 m fall |
| The cistern | (60, −50), r 9, water y 27.5 | The spring on the Low Mesa; a short run through the slot canyon to the lip |
| The falaj | pool → (−40, −34) → (−70, −28) → (−96, −18) → (−124, −4) | A stone channel to the cove's head |
| The Signal Stair | (−80, 62, y 8) → (−50, 84, y 14) → (−10, 96, y 20) → (30, 92, y 26) | 120 m, 15 % |
| The Low Mesa | plateau u 30…150, v −20…110, y 26 | Cliffs 10–18 m; the stair on its north-west corner |
| The Signal House | (50, 86), y 26 | Noor; chest C5.2 |
| The Mirror Court | centre (84, 60), half 18 × 14, y 26 | P5.1; three mirror stands; the chart tent at its south end |
| The Crate Yard | centre (120, 20), half 16 × 12, y 26 | Samir; P5.2; chest C5.3; the caravan road's arch (`awesome-copilot`) |
| The Sun Stair | (136, 34, y 26) → (160, 50, y 34) → (176, 70, y 42) → (190, 80, y 46) | 75 m of stone steps with rails |
| The High Mesa | plateau u 150…250, v 30…130, y 46 | |
| The Sunspire | (206, 84), side 10, base 46, top 92; mirror at y 86 | The Trial on the Sundial Terrace (190, 80), y 46 |
| The Needle | a butte at (−30, 150), top y 30, with a relay mirror | The beam's second hop (a demo) |
| Library Rock | a sea stack at (−120, 520), top y 30, with a white-domed light | The beam's far end. Not walkable |
| Red Butte | (300, −40), top y 120, radius 200, flat top, stepped | The skyline |
| The dunes | v < −90, u −200…200, crests to 14 m | The south-west beach; starfish |

**Route:** landing → caravanserai 45 m → square 70 m → camp 110 m → Signal House 120 m (the stair)
→ court 30 m → crate yard 60 m → the Sunspire 110 m (the Sun Stair). 545 m, one direction, plus the
two laps (~70 m and ~50 m). The Sunspire is in view from every stop.

**Anchors** (names are the contract between the world and the content): `landing`, `juno`,
`lyra`, `lyraPlayerA`, `lyraPlayerB`, `zahra`, `idris`, `noor`, `samir`, `paloma`, `yusuf`,
`islander1`…`islander8`, `seal`, and the circuits' spots.

**Collectibles:** 5 starfish (the cove's beach, the cove head by the falaj, two on the dune shore,
one under the quay's steps); 3 chests (C5.1 caravanserai, C5.2 Signal House, C5.3 crate yard);
4 bottles (the cove beach, the oasis bank, the mesa's foot by the stair, the dune shore).

**Hard rules** (ISLAND-04 §3.11): every anchor on a walk surface with a 3 m clear radius; the route
and both stairs sampled every 0.5 m have a surface and no step over 0.45 m; rails on both sides of
every stair and on every mesa edge that the route passes within 4 m of.

---

## 4. Chapter beats

| Quest | Stop | Who | Course section | Check |
|---|---|---|---|---|
| — | Landing | Juno, Wingman | intro, `learning-objectives` | — |
| Q5.1 | Caravanserai | **Lyra** | `from-the-studio-connecting-the-gear` | the gear-song ceremony; K5.1 |
| Q5.2 | The bazaar | **Zahra**, bazaar master | `mcp-server-versus-plugin` | M5.1 (match what each adds); K5.2 (pack light) |
| Q5.3 | The oasis camp | **Idris**, camp keeper | `create-a-practice-session` | K5.3 (the shared well); card A5.1 |
| Q5.4 | The Signal House | **Noor**, signal master | `mcp-servers-get-information-from-another-service` | H5.1 on `app-customize-mcp`; K5.4 |
| Q5.5 | The Mirror Court | Noor | `exercise-check-the-book-apps-input-labels-with-context7` | **P5.1 Mirror Beams**; H5.2 on `app-context7-configuration`; cards A5.2, A5.3 |
| Q5.6 | The Crate Yard | **Samir**, crate merchant | `plugins-use-a-packaged-capability` | K5.6 |
| Q5.7 | The Crate Yard | Samir | `exercise-plan-a-css-improvement-with-modern-web-guidance` | **P5.2 The Sealed Crate**; H5.3 on `app-customize-plugins`; cards A5.4, A5.5 |
| Q5.8 | The Sundial Terrace | **Paloma**, warden of the Sunspire | `key-takeaways` | **Trial T5**; the Seal; every mirror answers; the Sunspire lights |
| Q5.A | Paloma (optional, after the Seal) | Paloma | `assignment` | card A5.6; K5.9 |

**Story conditions** (`STORY_CONDITIONS.sunspire`): `firstVisit`, `beamLanded`, `crateOpened`,
`sealed`. After a reload the world shows them from the save: the court's beam stands, the crate
is open on Samir's bench, the mirrors and pennants of the Seal are up.

**Cast:** Juno and Wingman (as always), Lyra and two players, Zahra, Idris, Noor, Samir, Paloma,
Yusuf (the stall), eight islanders (traders, a water carrier, signallers, a child with a toy
mirror). No lines before an action longer than four. Farewell (Paloma): Chapter 06's island, where
the work is kept on a chart that everyone marks.

---

## 5. The two circuits

Both are `circuit` puzzles. Every wrong option, position and tile has a reason and a cite.

### 5.1 P5.1 Mirror Beams (`puzzles/mirror-beams.json`, `circuit: "signal"`, quest Q5.5)

Places (the game's): `roll`, `card`, `shutter`, `mirror`, `key`, `tent`.

| # | Station | At | Kind | What the player does | Wrong picks teach |
|---|---|---|---|---|---|
| 1 | Find the tower | `roll` | choose | **Customize** → **Browse** → type filter **MCP** → search `context7` → **Add server** | Not in Settings; not the **Extensions** filter; not a second tower when one already answers |
| 2 | Read the card | `card` | choose | Server name `context7`, Server type `HTTP`, the URL: `HTTP` is a hosted server, not a local process | — |
| 3 | Open the shutter | `shutter` | watch + action | The shutter opens. A beam leaves the mirror and hits the cliff | The lamp does not light: enabled isn't connected |
| 4 | **Aim the mirror** | `mirror` | **dial** | Turn the mirror through six bearings. The beam turns with it. One bearing lands on the Sunspire, which sends it on to the Needle and Library Rock (a demo) | Every other bearing: the shutter is open, but nothing answers. Check the connection, not the toggle |
| 5 | Choose the message | `key` | choose | Flash only the general question about labels | Sending the file or its path; asking it to "fix my labels" |
| 6 | Read the reply | `key` | choose | Expand the tool activity: a Context7 tool returned documentation; open a source link | "The signaller says it worked"; "the toggle is on" |
| 7 | Compare at home | `tent` | choose | Compare the guidance with the file locally; no more external requests | Flashing the file across to "check it" |
| 8 | Read the result | `tent` | watch | Nested labels are already associated; no file changed | — |

The stage (`src/game/sunspire-circuits.ts`): the mirror head turns to the dial's bearing; the beam
is one thin lit strip from the mirror to where the bearing ends (the cliff, the sea, the dunes, the
Sunspire); at the right bearing the Sunspire's mirror lights and the beam runs on. The beam uses an
existing lit material (the kit's glow or the lighthouse halo): no new shader.

### 5.2 P5.2 The Sealed Crate (`puzzles/sealed-crate.json`, `circuit: "crate"`, quest Q5.7)

Places: `row`, `lading`, `scale`, `bell`, `bench`.

| # | Station | At | Kind | What the player does | Wrong picks teach |
|---|---|---|---|---|---|
| 1 | Find the crate | `row` | choose | **Browse** → **Plugins** → search `modern-web-guidance`; if nothing shows, **Add** > **Manage marketplaces…** and confirm **awesome-copilot** | Installing a different crate that sounds close |
| 2 | Read the lading | `lading` | choose | Open the details, then compare with the plugin's repository: the details don't show the source | "The description is enough": a decoy crate opens and a wind-up contraption runs off (some plugins start processes) |
| 3 | Take it in | `scale` | watch + action | **Install**; it shows under **Plugins** on **Installed** with its toggle on | — |
| 4 | Call for the tool | `bell` | choose | `/skills reload`, type `/`, select the skill (it can have a plugin prefix) | "It's installed, so it ran" |
| 5 | Word the order | `bench` | tiles | The claims that keep it safe stick: general terms only in external queries; at most one CSS-only change; no JavaScript, no file changes, no app checks; stop if the skill is unavailable | Rewrite the styles; send `app.css` out |
| 6 | Check the work | `bench` | choose | Inspect the skill activity and its guide-search output; the proposal names the real title element; `text-wrap: balance` says what happens where it isn't supported | Taking it because the maker is well known |

---

## 6. Checks, cards, Trial, pages

- **Hotspots:** H5.1 the **MCP** type filter and the connected server on `app-customize-mcp`; H5.2
  `HTTP` on `app-context7-configuration`; H5.3 **Install** (callout 4) on `app-customize-plugins`.
  Rects are measured on the snapshot's images.
- **Cards:** A5.1 the practice session; A5.2 add the Context7 server; A5.3 ask the general question,
  check the tool activity, compare locally; A5.4 install `modern-web-guidance`; A5.5 invoke its
  skill and inspect; A5.6 the assignment (the evidence table; **Changes** lists no files; disable
  only what you added). Each has **I did it** / **Later** and a "What did you see?" question. A
  card says what to do if the organization blocks the integration (the course's words).
- **Trial T5** (eight items): server versus plugin; what `HTTP` means; enabled isn't connected; the
  general question; evidence is the tool activity and its sources; installed isn't invoked; add
  only what the task needs; a worktree doesn't isolate installed tools.
- **Pages:** `pg5.studio`, `pg5.versus`, `pg5.least`, `pg5.practice`, `pg5.mcp`, `pg5.context7`,
  `pg5.local`, `pg5.plugins`, `pg5.marketplace`, `pg5.invoke`, `pg5.takeaways`, `pg5.assignment`.
  Chests: C5.1 the Awesome Copilot plugin directory (review before you install); C5.2 a server can
  run on your machine or at a remote service; C5.3 when your organization blocks an integration.
  Bottles B5.1–B5.4: the four troubleshooting anchors.

---

## 7. Battle 5 (Guildcrest → Sunspire, recaps Chapter 04)

Battle 4's form: three waves of two, no kraken. Questions N4.1–N4.3 go in
`chapters/04-skills-custom-agents.json`; the hook is `hooks.battles["passage-guildcrest-sunspire"]`.

| Wave | Raiders | Habit | Question |
|---|---|---|---|
| 1 | *Say It Again*, *One-Off* | Save a workflow you repeat as a skill (04 `choose-the-feature-that-fits-the-task`) | N4.1 |
| 2 | *Paper Lock*, *Just A Note* | A skill doesn't enforce what Copilot may do (04 `core-concepts`) | N4.2 |
| 3 | *Every Tool*, *No Role* | A custom agent's `tools` list limits its tools (04 `exercise-create-a-read-only-book-app-explainer`) | N4.3 |

Its end brings the next morning (as battle 3's does).

---

## 8. Tech plan

The package is Guildcrest's shape with `sunspire` names (ISLAND-04 §10.1): `src/islands/sunspire.ts`;
`src/world/islands/sunspire/` (`layout`, `anchors`, `height`, `terrain-regions`, `flora-palette`,
`flora`, `vegetation`, `water`, `water-mesh`, `rocks`, `harbor`, `town`, `town-build`, `mesa` (the
Signal House, the court, the yard, the stairs), `spire` (the Sunspire, the Needle, Library Rock),
`circuit`, `market`, `starfish`, `silhouette`, `chart`, `waypoints`, `arrival`, `stream`, `index`);
`src/game/sunspire-island.ts`, `-session.ts`, `-npcs.ts`, `-quests.ts`, `-circuits.ts`; the pack's
`chapters/05-mcp-plugins.json`, `quests/sunspire.json`, `puzzles/mirror-beams.json`,
`puzzles/sealed-crate.json`, `puzzles/gear-song.json`.

Shared changes, each generic: `CIRCUIT_PLACES.signal` and `.crate`; `STORY_CONDITIONS.sunspire`;
the `dial` station (done); cactus builders if `vegetation/cactus.ts` lacks one; the raptor flock
kind (data); battle 5; `tools/lib/islands.json`; `neutral.test.ts` patterns for Chapter 05's ids
and words; Guildcrest's `tracker.next`; `redRock` only under S10.

Registry entry: `flag` `sunspire`; `open: { after: { island: 'guildcrest', condition: 'sealed' } }`;
`nextMorningAfter: 'guildcrest'`; `ranges` `{ load: 1300, show: 1100, unload: 1550, detail: 600 }`;
`stream` `{ nearLoads: 'always', courseData: 'chapter-part', depthTile: true, reflected: false }`;
budgets as ISLAND-04 §10.6 (the desert has fewer plants, so the share is easier).

---

## 9. Tests and gates

ISLAND-04 §11 with `sunspire` names, plus PHASE-3 §7's Q1–Q8. In short: `height.test.ts` (the lane,
the bounds, the plateaus), `layout`/`index.test.ts` (anchors, route, stairs, rails, flyover
clearance), `harbor.test.ts`, the silhouette and residency tests, the content check, the circuit
tests for `signal` and `crate` (every station reachable; the dial has one right bearing and a
reason for every other), `sunspire-quests.test.ts`, `battles.test.ts` (battle 5), the **cast
contact test** (Q1), `flickertest --audit` on `ss-quay`, `ss-bazaar`, `ss-oasis`, `ss-court`,
`ss-spire` and the tour (Q2), `tools/sunspiretest.mjs` (Q5), and every budget gate.

## 10. The Walt Disney review

ISLAND-04 §13.3's eleven questions, with these words: **Story:** a port that reaches across the sea
and takes only what it needs. **The weenie:** the Sunspire's flash from the sea, the quay and every
stop. **Desert:** red tables, saguaro, an oasis, adobe, hard morning light. **Kinetics:** the flash,
beams, awnings, water, raptors. **Delight:** the beam under your hand. **Teaching through play:**
after the court, can a player say why an open shutter isn't a connection, and what proves the
answer came back?

## 11. Open risks

| Risk | Mitigation |
|---|---|
| Red rock needs a new terrain key (S10) | Try `bluff` first; measure the census if `redRock` is added |
| The beam as a lit strip looks flat | Two crossed strips and a soft end flare from the existing halo look; judge it in the browser |
| Hard noon-like light flattens the town | 10.0 h with a 60° sun gives long enough shadows; awnings add shade pattern |
| Voices | Lines stay pending until generated; the island plays with subtitles |
| The far sea stack is outside the walk area but inside the bounds | It is terrain plus one small mesh; the footprint test covers it |

## 12. As built

### 12.1 Stages 0 and 1A: the contract, terrain and water (2026-11-11)

Files: `src/world/islands/sunspire/` (`layout.ts`, `height.ts` + test, `water.ts`, `water-mesh.ts`,
`harbor.ts`, `chart.ts`, `terrain-regions.ts`), `src/islands/sunspire.ts` (`SUNSPIRE_IN_BUILD`, in
`ISLANDS_IN_BUILD`), its row in `tools/bake/bake-frame-island.ts` (run by `bake-terrain.ts`), the pack manifest's
`sunspire/critical` and `sunspire/chart`, and the terrain dev page
(`devpages/terrain.html?pack=sunspire&view=<name>`; views in `PACKS.sunspire`).

Changes from §3, each in `layout.ts` (the source of truth):

| What | Spec | As built | Why |
|---|---|---|---|
| The tables | Low Mesa y 26, High Mesa y 46, Sunspire top 92 | Low Mesa **y 28** (an 18 m wall), High Mesa **y 56** (a 34 m wall), the Sunspire base 56, top **104**, mirror 98 | From the quay the first tables read as low sand hills: the terrain's far levels soften a 12 m wall. Taller walls keep their shape at 400 m |
| The desert floor | rises to 12 m inland | rises to **8 m** | More wall above it |
| Red Butte | (300, −40), y 120, r 200 | **(300, −110), y 140, r 120**, benches at 60 and 100, 40 m walls | At (300, −40) its skirt covered both mesas; nearer the coast than (300, −110) the shore profile cut its top off |
| The Sun Stair | a straight ramp to (190, 80) | **cut into the High Mesa's west wall**: north along u ≈ 146 from the yard's corner, then east onto the top at (152, 110) | 28 m of rise needs 80 m of stair |
| The terrace, the Sunspire | (190, 80), (206, 84) | **(176, 98)**, **(198, 96)** | They follow the stair's top |
| Fresh water | cistern (60, −50) | cistern **(64, −6)** by the mesa's south rim, lip (31, −17), pool **(10, −28)** level 8.2 | (60, −50) is off the Low Mesa |
| The camp, the well | y 10 | **y 8.6** | The lower floor |
| The Needle, Library Rock | y 30 | **y 34** | Proportion with the taller tables |

**S10 decided: `redRock` was added** (`TerrainRegionMasks.redRock`, `terrain-material.ts`). The
existing `bluff` look is Port Meridian's warm limestone with scrub: it is not red desert rock. The
new look is warm stone with the cliff beds' own phase for one pale bed in each (so it uses the beds'
screen-space width and does not shimmer far off). It paints wherever the bake has cliff or rock, not
where the drawn slope is steep: a far level's faces are gentler, and the walls turned to sand colour
from the quay when the region read the slope. `campSand` gives the open ground its pale sand
(inland sand is worn earth without it). One graph change for every island: take the program census
in stage 4.

The generic `dial` station (PHASE-3 §5) is in `src/game/puzzles/circuit/` with its schema, content
check and tests.

Gates so far: `height.test.ts` (15 tests: the frame, the bounds, every pad level, the tables, Library
Rock in deep water, every path's grade, the water, the masks, the lane, the turning room, the berth,
the gangway, the beam reaches). Looked at on the dev page (WebGPU High): the banded red walls, the
stepped butte and the pale floor read as a desert from the landing.

### 12.2 Stages 1B, 2A, 2B and 3: content, world art, voices, and the island in the game (2026-11-11)

**Done.**

- **World art** (`src/world/islands/sunspire/`): `build.ts` (the adobe house, parapet, awning,
  pennant line and tent pieces), `town.ts` and `town-build.ts` (the quay, 26 houses, the
  caravanserai, the bazaar square, the camp and its well), `mesa.ts` (both stairs, the Signal House,
  the Mirror Court, the Crate Yard, a lamp at every station), `spire.ts` (the terrace, the Sunspire,
  the Needle's relay, Library Rock's light), `circuit.ts`, `anchors.ts`, `market.ts`,
  `vegetation.ts`, `flora-palette.ts`, `flora.ts`, `starfish.ts`, `silhouette.ts`, `arrival.ts`,
  `waypoints.ts`, `stream.ts`, `index.ts`.
- **The mirror and its beam** (`index.ts`): the court mirror's head turns to a bearing (`aim`) and a
  beam follows it; on the Sunspire it runs on to the Needle and Library Rock. The beam uses the
  lit-lamp material every island's lighthouse uses, and the glints use the halo material: no new
  shader. The Sunspire's mirror flashes every 3.4 s, and burns steadily once sealed or after dark
  (`lampBurning`).
- **Shared code added for the three new islands:** `src/world/islands/frame-build.ts` (the frame
  builders: boxes, rails, stairs, lamps, doors, windows, signs; Guildcrest's `build.ts` is the older
  copy), `src/world/islands/lettering.ts` (an island's lettered signs), `src/game/island-quests.ts`
  (an island's quest line from its id), `tools/islands/trace-coast.ts` (the sea-chart coast and the
  footprint), the `saguaro` plant species, `FLORA_SPECIES_MAX` 24 → 36.
- **Game** (`src/game/`): `sunspire-island.ts`, `-session.ts` (cues `ss-song`, `ss-scales`,
  `ss-well`, `ss-signal`, `ss-crate`, `ss-seal`, `ss-chest:<id>`), `-circuits.ts` (the stage: the
  `dial` turns the mirror; the Seal), `-npcs.ts`, `-quests.ts`. Sixteen characters in
  `src/world/characters/` (ids, palettes, accessories, bodies).
- **Registry:** `src/islands/sunspire.ts` (the full entry), the registry line, `STORY_CONDITIONS`,
  `CIRCUIT_PLACES.signal` and `.crate`, `ISLAND_SIGNS.sunspire`, `tools/lib/islands.json`.
- **Content** (`courses/copilot-app/`): `chapters/05-mcp-plugins.json` (6 images, 19 quizzes: 6 stop
  checks, 3 hotspots measured on the snapshot's screenshots, the matching quiz, the 9-item Trial;
  20 pages; 3 chests and 4 bottles; 4 glossary terms), `quests/sunspire.json`,
  `puzzles/mirror-beams.json`, `sealed-crate.json`, `gear-song.json`, six app cards and five
  objectives in `learning.json`, three labels, Yusuf's market lines, the course file's Seal, arrival
  and hooks. The content check passes with no entry to edit.
- **Voices:** all 76 lines are voiced (Azure AI Speech for the six new speakers; ElevenLabs for
  Juno, Wingman and Lyra). **The six new voices are provisional** and want Dan's ear before they are
  final: Zahra `en-GB-BellaNeural`, Idris `en-NG-AbeoNeural`, Noor `en-GB-LibbyNeural`, Samir
  `en-ZA-LukeNeural`, Paloma `en-ZA-LeahNeural`, Yusuf `en-KE-ChilembaNeural`. To recast one, change
  `voice/cast.json` and make its lines again.

**Changes from the spec.**

| What | Spec | As built | Why |
|---|---|---|---|
| Sun (S3) | bearing 60° | `azimuth` 150: bearing **255°**, 59° up | The town's fronts face the cove (south-west). A sun at 60° was behind them and behind the tables as seen from the landing: every wall the captain looks at was in shade |
| The caravanserai | (−160, 44) | **(−162, 50)** | The quay lane ran through its south wall |
| The dune starfish | on the south-west shore | **in the first dune's hollow** (−70, −120) | A 350 m walk for one starfish |
| Walls | adobe `#E6D2B0` | warmer and lighter tints in `town.ts` | The first tints read dull against the pale sand |
| The sea chart | traced | traced, then the cove's north-east edge put on the quay's face | The tracer's 18 m margin covered the berth |
| The fisher | a rod | a tackle pouch and a pipe | A rod's tip stands far from the body (the accessory audit) |

**Gates run.** Format, typecheck, lint, 1 655 unit tests, the content check and the drift check, the
production build (the island is its own chunk, 22.9 KB gz), the bundle budgets, the secrets check.
Looked at on WebGPU High: the terrain dev page, the island viewer (its tab, the tour) and the game
(travel to the quay; the arrival flight and its card play; the content reports 13 decks, 11
stations and the mirror's state; no console error).

### 12.3 Play-through, fixes, art pass, battle 5 and gates (2026-11-11)

**Played and fixed.** `tools/sunspiretest.mjs` plays Chapter 05 by real input: the chart to the
quay, the arrival, all six stops, both circuits (a wrong pick first at each choice; the mirror held
on the cliff once), the Trial failed once and then passed, the Seal, Q5.A, chest C5.1 opened by E,
the four bottles and the five starfish. The second run passed with no failure. What the first run
found, and the fix:

| Found | Fix |
|---|---|
| The story's dress (`beam`, `crate`, `sealed`) showed nothing: no sign carried a `show` | A flag by the roll of towers (`beamFlag`), a tag over Samir's bench (`crateTag`) and two banners on the Sunspire (`sealBanner`), each a hanging cloth that unrolls. The crate's lid is the world's own mesh: it comes off and leans on the crate, and the guide's scroll stands in it |
| The first beam built two shaders in play (a hitch) | The beams, halos and scroll are `userData.prewarm` |
| The mirror's dial was watched from a fixed shot: the beam left the frame | `beamShot(index)`: the camera stands over the court on the beam's right and turns with the dial, so the mirror, the beam across the frame and the landmark it lands on all show. The beam has an amber sheath (the same lit material), because a warm white beam is lost over sunlit sand |
| The Sunspire flashed on its own timer while you turned the mirror | `world.hush(seconds)`: no timed flash while the shutter or the dial is open. The flash is the answer |
| A post of the arcade stood between Lyra and the camera | The arcade has a wide middle bay |
| A lamp post stood in the middle of each station's shot | Timber posts (`FramePaint.post`), and seven of the eleven moved to the station's right |

**Wayfinding (`tools/wayfindtest.mjs --only=legs,reach`).** The first run failed on fourteen
checks. A bench stood on the square's east leg (it blocked the way to the oasis). The Sun Stair's
rails closed its head (node `sun.out`). The beach leg crossed the cove under water (seven dry nodes
now). Chest C5.1 had no node in the court (`serai.east`). Bottle B5.1 lay 1.8 m under water (moved to
the beach). The falaj's starfish moved to dry sand. The run now passes: every leg both ways, and the
compass route to every NPC, chest, bottle, board and station.

**Art pass.**

- **Ground:** a new shared region, `desertSand`: golden sand in broad drifts of tone with wind
  ripples square to the south-west wind. Each ripple set fades to its mean as its lines near a pixel
  apart, so it does not shimmer from the air. The beach keeps the bake's pale sand. The lane, the
  quay's apron and the town's ground are trodden earth (`town`).
- **Plants:** the saguaro is a lighter green with pleated ribs. Ten palms stand at chosen spots in
  the town.
- **Town dressing (`dressing.ts`, off on Lite):** two clay jars and a string of peppers at every
  house, a plastered bench with a carpet at every third, sacks, barrels, crates and a hand cart on the
  quay, baskets at the stalls, two beehive ovens, two shade cloths over the lane.
- **Stations:** the yard's scale is a balance (a gallows, a brass beam, a pan of weights, a crate in
  a sling, a dial). The key desk has a brass key and a stool. Timber is sun-bleached, not dark.

**Battle 5** ("Guide, Not Lock", `passage-guildcrest-sunspire`): the plan, the passage entry, the
hook in `course.json`, N4.1–N4.3 in Chapter 04, its chart label and a unit test.
`tools/battletest.mjs --battle=5` plays it to the win and docks at Sunspire. Its peak is 140 programs
with both islands in memory, which is the cap: there is no room to spare. Its crew lines are not
written (battle 4's are still pending too).

**Gates.**

| Gate | Result |
|---|---|
| Q1 cast contact (`tools/casttest.mjs --island=sunspire --raised=yusuf:0.33`) | Pass: 17 cast, each 0.00 m from its ground; the two players on their seat blocks; stills of every figure and every pair of feet looked at |
| Q2 flicker (`flickertest --audit`) | Pass: the six `ss-*` views, and four views from the air at the tour's distance (`ss-fly-n/e/s/w`), 0.000–0.064 % in regions against 0.2 %. The audit found one real overlap (the shade cloth's seam), now gone |
| Q3 wayfinding | Pass (above) |
| Q5 frame budgets (`budgettest --islands=sunspire --tiers=lite,low,high`) | Pass: Lite 177k of 300k triangles and 77 of 100 draws; Low 270k of 500k and 101 of 150; High 807k of 2.0M and 183 of 300 |
| Play-through | Four full runs; the last three pass with no failure |
| Code | Format, lint, typecheck, 1,656 unit tests, the content check, drift, the build, size budgets, secrets |

**Not done yet.**

| # | What | Note |
|---|---|---|
| 1 | ~~Lip-sync cues for the new lines~~ | **Done 2026-11-11**: Rhubarb 1.14.0 installed with Dan's go-ahead; `npm run voice:lipsync` made cues for all 73 of Sunspire's islander lines (and Inkwell's and Tidewheel's in the same run) |
| 2 | **Art, still open** | Boulders in the red-rock look; the fall's spray; the well's wheel should turn; the lading desk, the bell and the tent are still plain |
| 3 | **Battle 5's crew lines** | Written and voiced with battle 4's |
| 4 | **Gates still to run** | Memory, perf, and the program census with battle 5 at its cap |
| 5 | **A reload and an away-and-back** in the play-through | The tool does not do either yet |
| 6 | **Records** | PLAN, `docs/voices.md`, ASSETS, ART_PROVENANCE, the skill's island table, `docs/adding-an-island.md` (the shared helpers above) |
| 7 | **Music** | **Done** (2026-11-11): "Sunspire Crossing" is the island's theme |


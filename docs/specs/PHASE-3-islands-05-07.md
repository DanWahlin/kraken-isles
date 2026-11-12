# Phase 3: Islands 05–07 and the finale (plan review and build plan)

> Status: **islands 05, 06 and 07 and the Long Light are in the game and played end to end** (2026-11-11; §9). This page reviews `.plans/PLAN.md` §4's rows
> for the three islands that are not built (05 Sunspire Sands, 06 Inkwell Bluffs, 07 Tidewheel
> Caldera) against one question: **would Walt Disney approve this level of quality?** It records
> what the plan lacks, the decisions that fill each gap, the gates every new island must pass, and
> the build order. Each island then gets its own spec in the form of
> [ISLAND-04](ISLAND-04-guildcrest.md) (every decision made; "As built" at the end).
>
> Course source: `github/copilot-app-for-beginners` at `8cb2792` (chapters `05-mcp-plugins`,
> `06-canvases`, `07-automations`). Written in ASD-STE100 Simplified Technical English.

---

## 1. Verdict

**No, not yet.** The plan gives each island one table row: a biome, a landmark, a music mood and a
one-sentence puzzle. Islands 02–04 each needed a spec of 1 400–1 800 lines before they were good.
The rows are a sound start (the metaphors fit the course well), but ten things are missing. Each is
a place where a guest would see the seams.

| # | Gap in the plan | Why Walt would send it back | Decision (section) |
|---|---|---|---|
| E1 | **No ending.** "Earn all 8 to become Master Captain" is one clause. The kraken that names the game has no last scene | A park day ends with fireworks over the castle. The last island must pay off the fog, the lighthouses and the kraken | The Long Light (§6) |
| E2 | **No arc across the three islands.** Each row stands alone | Lands are sequenced: each one changes the mood and raises the stakes | Reach → See → Repeat, and a day that ends in night (§2) |
| E3 | **Inkwell's landmark is flat.** A "giant plaza chart table" can't be seen from the sea | Every land needs a weenie: one tall thing that pulls you in from far away | The Surveyor's Dome (§4) |
| E4 | **The puzzles are sentences, not toys.** Islands 03 and 04 both reused the `circuit` lap. Three more laps would feel the same | "Plus it." Each land needs one thing you can't do anywhere else | One physical toy per island on one new generic station kind (§5) |
| E5 | **The rows are older than the course.** Chapter 05 now teaches Context7 over HTTP, "keep the external question general", and a plugin that supplies a skill. Chapter 06 has three exercises and an Assess assignment. Chapter 07 has the four parts, the awake-computer rule, twelve event triggers and the cloud's Tools list | "Faithful to the course" is a pillar. A row written from memory teaches the wrong app | A teaching map per island, from the snapshot (§3–§5, each spec's §1) |
| E6 | **No kinetics, no delight list.** Nothing says what moves | A still land is a dead land. Something must move in every view | Per island: the showpiece, the small motions, the delight (§3–§5) |
| E7 | **Characters are not specified to a contact standard.** Feet in a plank, hips in a bench, a hand through a rail break the illusion at once | "An illusion breaker" is a hard no in every island's review | The cast contact audit (§7, Q1) |
| E8 | **Flicker is not gated per island.** A far shore flickered in the tour until the sea read its depth per pixel | One shimmering shore in the fly-by is a "no" | Flicker gates for every new island (§7, Q2) |
| E9 | **Battles 5–7 are not planned,** and BATTLES §2.2 wants a fourth, new-mechanic battle at the end | Four battles in three islands is repetition, and the ending should not be a fight | Two passage battles, one quiet passage, no finale battle (§6.3) |
| E10 | **No music for the three islands or the ending** | The score tells you where you are before you see it | Dan made the four tracks in Suno from the briefs in §8 (2026-11-11). "Sunspire Crossing", "Inkwell Waltz" and "Tidewheel Lullaby" are their islands' themes; "The Long Light" plays once, in the ending (the `ending` music cue) |

What stays from the plan: the island names, biomes, the chart positions, the music moods, the bird
casts, the palettes (red sandstone at Sunspire, dark basalt at Tidewheel), the metaphor table in
PLAN §3 (signal towers and sealed crates; the chart table; the clockwork lighthouse on a lever, a
clock or a bell; the siren's song), and every shared system.

---

## 2. The arc: reach, see, repeat (E2)

Islands 00–04 teach you to direct a crew. The last three teach you to **extend** it, to **see** its
work, and to **let it run without you**. The day runs with the story.

| Island | Verb | The land's story in one line | Hour | Light |
|---|---|---|---|---|
| 05 Sunspire Sands | **Reach** | A desert guild talks across the sea by mirror-flash, and takes only what the crossing needs | 10.0 h, the morning after Guildcrest (`nextMorningAfter`) | Hard, bright, hot. The mirrors need the sun |
| 06 Inkwell Bluffs | **See** | Mapmakers keep the whole job on one great chart that everyone marks, and ink nothing without a measured return | 18.3 h, golden hour | White walls go gold and rose |
| 07 Tidewheel Caldera | **Repeat** | Inside a drowned volcano the tide winds a lighthouse that runs itself, because someone tested it by hand first | 19.4 h, dusk; night at the ending | Blue hour, lamps, steam, the beam |

The passage goes forward through the day from Sunspire to Tidewheel (no cut). The ending needs the
dark so that eight lights read: every island's light already burns after dark (`lampBurning`,
`src/world/lighthouse-lamp.ts`).

Each spec must check that the sky supports its hour (cloud keys, `sky:bake` if a new key is needed)
before it fixes the number.

---

## 3. Island 05 · Sunspire Sands (Chapter 05, MCP Servers and Plugins)

| | |
|---|---|
| **Story** | The Signal Guild's heliographs reach the Great Library across the water. The bazaar sells sealed crates from the caravans. The desert teaches the chapter's rule by itself: **carry only what you need** |
| **Weenie** | **The Sunspire**: the tallest heliograph tower, on the high mesa, with a great mirror that flashes. It is the island's lighthouse, the place of the Trial, and you can see its glint from the sea |
| **Wienies** | The relay towers along the route, the bazaar's awnings, the oasis palms, the caravanserai gate, the well |
| **Kinetic** | Beams of light that cross the desert when a mirror turns; awnings and prayer-flag pennants; heat shimmer (existing mist cards, not a new shader); palms; a turning well wheel; raptors on thermals (PLAN §6) |
| **Delight** | Turn a mirror and a beam of light sweeps the desert and lands on the far tower. Open the wrong crate and a wind-up contraption runs off across the square (a plugin can start processes) |
| **Metaphor** | **Heliograph tower** = an MCP server (a connection to a service). **The Great Library** = Context7. **The shutter and the beam** = enabled and connected: an open shutter doesn't prove the beam arrives. **The flashed message** = the external question: flash the general question, keep the ship's own chart at home. **The reply and its seal** = tool activity and source links. **A sealed crate** = a plugin; **the bazaar** = a marketplace; **the bill of lading** = the plugin's contents; a tool in the crate does nothing until you call for it (installed isn't invoked). **The oasis well** = installed tools are shared by every tent (a worktree separates files, not tools). **Packing light** = the least-tool principle |
| **Stops (course order)** | Arrival → Lyra at the caravanserai (the studio: connecting the gear) → the Bazaar Master (server versus plugin; pack light) → the camp (the practice session; the shared well) → the Signal House (add the server; the Context7 dialog) → **P5.1 Mirror Beams** → the chart tent (keep the comparison local) → the crate merchant (**P5.2 The Sealed Crate**) → the Sunspire (Trial T5, the Seal, the mirror lights) |
| **Signature toy** | **Mirror Beams** (§5) |
| **Battle 5** | Guildcrest → Sunspire, recaps Chapter 04 (three waves, no kraken) |
| **Music** | "Sunspire Crossing" (§8) |

## 4. Island 06 · Inkwell Bluffs (Chapter 06, Canvases)

| | |
|---|---|
| **Story** | The cartographers chart the isles. Gossip on the stair gets buried; the job lives on the **Great Chart Table** in the plaza, where captain and mate mark the same chart, and a mark is inked only when a surveyor comes back with a measure |
| **Weenie (E3)** | **The Surveyor's Dome**: a whitewashed observatory light with a cobalt dome and a great brass quill for a weathervane, on the highest bluff. The lighthouse, the Trial, and the island's shape from the sea. The chart table is the hero set piece at its foot |
| **Wienies** | Bougainvillea arches, blue doors, the stair street, charts drying on lines, the sea arch and stacks, survey kites |
| **Kinetic** | Charts and washing on lines; petals on the wind; survey kites; gulls; fishing boats at the stacks; the quill turning; the mate walking the board |
| **Delight** | You and Juno both move pieces on a chart the size of a plaza. Mark a stage from gossip and the ink washes off; hang the surveyor's slate and it stays |
| **Metaphor** | **The Great Chart Table** = a canvas. **The gossip stair** = a long chat thread. **The four instrument desks** round the plaza = Plan, Terminal, Browser, Changes (built-in surfaces come first). **The visiting guild's board** = a community canvas from a plugin. **Brass rail** = Propose → Plan → Baseline → Implement → Validate (no Approve stage). **Bell pulls** = canvas buttons: each sends a surveyor (an agent-callable action). **The surveyor's slate** = evidence. **Ink that holds** = "only mark from recorded evidence, never chat inference" |
| **Stops (course order)** | Arrival → Lyra on the taverna terrace (the arrangement board) → the gossip stair and the plaza (chat versus canvas; built-in surfaces first) → **P6.1 The Borrowed Board** (the community canvas; move one card to Plan) → **P6.2 Two Hands, One Chart** (the Session Board; you and Juno both change it) → **P6.3 The Shared Chart** (the Feature Workbench) → the Dome (Trial T6, the Seal) |
| **Signature toy** | **The Shared Chart** (§5) |
| **Battle 6** | Sunspire → Inkwell, recaps Chapter 05 (three waves) |
| **Music** | "Inkwell Waltz" (§8) |

## 5. Island 07 · Tidewheel Caldera (Chapter 07, Automations) and the three toys

| | |
|---|---|
| **Story** | The tide turns a great wheel in the caldera's breach. The wheel winds the **Clockwork Lighthouse**. Its keepers save a routine on a lever, a clock or a bell, and they never put one on the clock before it has run by hand |
| **Weenie** | **The Clockwork Lighthouse**: brass gears in an open frame, a clock face, a turning lamp, and striking figures that ring the hour |
| **Wienies** | The tide wheel, the bell arch, the hot-spring terraces, fumaroles, lanterns on the black sand, the breach you sail through |
| **Kinetic** | The wheel, the gears, the lamp's beam, steam, the striking figures, bells, a music-box drum, fireflies at dusk |
| **Delight** | You sail **through the breach into the crater**. You pin a tune on a music-box drum, pull the lever, and the clockwork band plays it. At the Seal the last light of the isles turns on |
| **Metaphor** | **A music-box drum** = the saved prompt (the course's sequencer: "programmed pattern"). **The lever** = Manual. **The clock ring** = Daily at 08:00. **The bells** = event triggers. **The tool rack** = the least access needed. **The keeper's log** = Recent runs. **The tide** = a local run needs the computer awake and the app running. **The rock light out at sea** = cloud. **A forged message in a bottle** = prompt injection |
| **Stops (course order)** | Arrival through the breach → Lyra at the bandstand (programming the sequencer) → the Keeper (the four parts; start manual and local) → the bounty board (confirm work items exist) → **P7.1 The Lever** (create and run the report; read the log) → **P7.2 Gears & Bells** (schedule it; Next run; the tide) → the bell arch and the rock light (optional: event triggers and cloud; the forged bottle) → the lamp room (Trial T7, the Seal, **the Long Light**) |
| **Signature toy** | **Gears & Bells** (below) |
| **Battle 7** | None. The passage from Inkwell is the quiet beat before the ending (§6.3) |
| **Music** | "Tidewheel Lullaby" and "The Long Light" (§8) |

### The three toys (E4)

The `circuit` mechanic stays the frame (stations in course order, a sourced reason for every wrong
choice, saves, keyboard, touch, text-only). It gets **one new generic station kind, `dial`**: a
control with a ring of positions that the player turns. The pack gives each position its label and,
for a wrong one, its reason and source. The island's stage draws the toy. `dial` is course-neutral,
as `choose`, `watch` and `tiles` are.

| Toy | What the hands do | What it teaches (chapter) |
|---|---|---|
| **Mirror Beams** (05) | Turn each relay mirror until its beam lands on the next tower. A real beam of light crosses the desert. Choose the message to flash. Read the reply's seal | An open shutter isn't a connection (05 §An MCP server is enabled but its tools fail). One beam per tower (one connection per service). Flash the general question, not your chart. Check that a reply came back, with its source |
| **The Shared Chart** (06) | Walk the plaza-sized chart. Move the brass stage marker along the rail. Pull a bell rope to send a surveyor. Hang the returned slate. Juno moves pieces too | Both sides change one board. No Approve stage: approval is in the Plan tab. A stage is done only from recorded evidence. Final total ≥ baseline |
| **Gears & Bells** (07) | Pin the drum (the prompt). Seat the trigger gear (lever). Pull the lever and read the log. Then turn the clock ring to 08:00 and clear 09:00 | Four parts. Manual and local first. Daily → Hours 08:00 only. The run needs the tide (the computer awake) |

---

## 6. The ending: the Long Light (E1)

### 6.1 What happens

1. **The Seal of Tidewheel.** The Trial ends in the lamp room at dusk. The keeper lets you pull the
   last lever. The clockwork runs, the striking figures ring, and the lamp turns on.
2. **Night falls** (the sky runs forward to night over the scene; reduced motion cuts).
3. **The chart again.** The game's opening is a living 3D chart in the captain's cabin
   ([OPENING](OPENING-living-chart.md)). The ending goes back to it: the same chart, the fog gone,
   and the eight lighthouses turn on **one by one in voyage order**. As each lights, Juno says what
   you practised there, in the words of the course's "Course Complete" table (07 `course-complete`).
4. **The kraken.** It has followed the voyage in far sightings and took the raiders who sailed on a
   guess (battle 3). In the caldera's bay it rises once more beside your ship, calm, looks, and goes
   down for good. Juno: it never wanted the captain who checks.
5. **Master Captain.** The certificate (the player's name, the eight Seals, the date, a link to the
   course) and the credits. Free sailing after, with every island open and lit.

### 6.2 Rules

- No fail state and no fight. Skippable. Reduced motion uses cuts.
- Every line of step 3 cites `course-complete`. No new claims about the app.
- The course's last sentence is the game's last teaching line: human judgment stays in the loop at
  every major control point.

### 6.3 Battles (E9)

| Passage | Battle | Recaps | Form |
|---|---|---|---|
| Guildcrest → Sunspire | 5 | Chapter 04 | Battle 4's form: three waves of two, questions N4.1–N4.3 |
| Sunspire → Inkwell | 6 | Chapter 05 | The same, N5.1–N5.3 |
| Inkwell → Tidewheel | none | — | A calm dusk passage with the kraken's sightings near. Chapter 06 is recapped by Tidewheel's first stop |

BATTLES §2.2 ("Standing orders", the siren ship) stays a later option. The siren's lesson is taught
on the island by the forged bottle (07 `keeping-event-triggers-safe`).

---

## 7. Gates every new island must pass (E7, E8)

These add to ISLAND-04 §11 and §13. A "no" sends the island back.

| # | Gate | How it is checked |
|---|---|---|
| Q1 | **Cast contact.** Every NPC stands or sits on its surface: soles within 2 cm of the walk surface, a seated NPC's hips on the seat and feet on the floor, no part inside a collider, a rail, a bench, a board or the ground. Every held prop is in the hand | A unit test over the island's anchors (`seat-fit.ts`, the walk surfaces, the colliders); a browser tool that takes a close shot of each NPC's feet and seat; the shots are looked at one by one |
| Q2 | **No flicker.** The island's tour and its `flicker` views in `tools/lib/islands.json` show no shimmer, no z-fighting and no pop: far shore, terrain seams, roofs, water edges, beams and steam | `flickertest --audit` on the island's views; the island viewer's tour on High and Low; the tour smoothness test (it reads the registry). The island builds its own sea-floor tile (`depthTile: true`) |
| Q3 | **Lights at night.** The island's light and lamps follow `lampBurning` | A unit test; the viewer's Night |
| Q4 | **Reach.** The walker reaches every NPC, chest, bottle, starfish, board and puzzle station from the landing | `wayfindtest --only=reach,legs,sea` |
| Q5 | **Play-through.** A browser tool plays the island by real input: every stop, one wrong pick at each check, the Trial with a retry, the Seal, a reload, a sail away and back | `tools/<island>test.mjs` on WebGPU High and WebGL2 Low |
| Q6 | **Faithful.** Every teaching line, check, card and page cites its chapter anchor and hash. No UI name that isn't in the chapter | `content:check`, `course:drift`, `neutral.test.ts` |
| Q7 | **Budgets.** Frame, memory, perf, programs and download, per tier | `check:frame-budgets`, `check:memory`, `check:perf`, the census, `check:budgets` |
| Q8 | **The Walt Disney review.** Story readable without text; the weenie pulls from the sea, the quay and each stop; the next thing in view from every point; one colour story; something moving in every shot; readable paths with the compass off; one delight; teaching through play; no illusion breaker; no hitch | The eleven questions of ISLAND-04 §13.3, answered in each spec's "As built" with shots |

---

## 8. Music briefs for Suno (E10)

One instrumental track per row, 2:30–3:30, with a clean loop (the end returns to the opening
texture), no vocals, no spoken word. The game normalises loudness and encodes the files. In Suno,
use Custom mode, switch **Instrumental** on, and put the text in **Style of Music**.

| Track | Use | Style of Music |
|---|---|---|
| **Sunspire Crossing** | Sunspire Sands | `Instrumental desert caravan folk, warm and unhurried, D Phrygian dominant, 92 bpm. Nylon-string Spanish guitar lead, oud answering phrases, frame drum and darbuka with soft hand claps, low drone, light finger cymbals. Sunlit, open, a little mysterious, hopeful. Melodic hook that repeats. No vocals, no synths, no electric guitar. Seamless loop ending.` |
| **Inkwell Waltz** | Inkwell Bluffs | `Instrumental Mediterranean seaside waltz in 3/4, G major, 104 bpm. Mandolin tremolo melody, accordion countermelody, nylon guitar oom-pah-pah, upright bass, light brushed percussion, a few glockenspiel sparkles. Golden hour on white cliffs, gentle, graceful, a little wistful, charming. Clear singable theme. No vocals, no synths. Seamless loop ending.` |
| **Tidewheel Lullaby** | Tidewheel Caldera | `Instrumental music-box lullaby with soft orchestra, D Lydian, 72 bpm, 6/8. Music box and celesta melody, ticking clockwork percussion and soft bell chimes, warm string pads, harp arpeggios, a distant French horn. Dusk in a volcanic crater, steam and lantern light, wonder, calm, mechanical but tender. No vocals, no drums kit, no synth leads. Seamless loop ending.` |
| **The Long Light** | The ending | `Instrumental orchestral finale that begins as a solo music box and grows. D major, 76 bpm rising to 88. Music box alone, then harp and strings, then full warm orchestra with French horns, tin whistle and Celtic harp, tubular bells, a broad triumphant main theme, then a quiet music-box ending. Lighthouses lighting one by one across a night sea, pride, homecoming, a gentle goodnight. No vocals, no choir words, no electric instruments.` |
| **Raiders in the Haze** (optional) | Battles 5 and 6 | `Instrumental light-hearted sea battle music, D Dorian, 132 bpm. Driving bodhran and frame drums, fiddle and tin whistle riffs, staccato low strings, brass stabs, playful not grim, adventurous. No vocals, no electric guitar, no synths. Seamless loop ending.` |

If Suno puts words in a track, add `[Instrumental]` as the only text in the Lyrics box. Two or
three takes of each is enough: pick the one whose last bar leads back into its first.

---

## 9. Build order

One island at a time, in voyage order. Each island follows ISLAND-04 §12's stages: **0** contract
(layout, anchors, story names) → **1A** terrain, water and bake → **1B** course content → **2A**
world art → **2B** voice and audio → **3** playable, with its passage battle → **4** play-test and
gates (§7) → **5** records. An island moves from `ISLANDS_IN_BUILD` to the registry at stage 3.

| Step | What | State |
|---|---|---|
| 1 | Sync chapters 05–07 into the course snapshot and lock | **done** |
| 2 | The `dial` station kind (generic) with tests | **done** |
| 3 | [ISLAND-05-sunspire-sands.md](ISLAND-05-sunspire-sands.md), then the build, stages 0–5 | **played end to end; battle 5 in; cast, flicker and wayfinding gates pass.** Left: frame, memory and perf gates, some art (its §12.3) |
| 4 | [ISLAND-06-inkwell-bluffs.md](ISLAND-06-inkwell-bluffs.md), then the build, stages 0–5 | **played end to end** with its world, content, voices and battle 6 in. Left: its §12.2 |
| 5 | [ISLAND-07-tidewheel-caldera.md](ISLAND-07-tidewheel-caldera.md), then the build | **played end to end; voiced; cast, wayfinding and flicker gates pass.** Left: its §12.2 |
| 6 | The Long Light (§6), the certificate, the credits | **in the game** (`src/game/tidewheel-ending.ts`): nightfall, the night chart's eight lights, the kraken's farewell, Juno's last word; then the certificate. The credits list both tracks |
| 7 | PLAN §1 status, §4 rows, §10 roadmap, README, the skill's island table | **done**: README, the skill's table, `docs/adding-an-island.md` (the shared modules) and PLAN's status |

The three islands and Guildcrest now stand on one set of shared modules (`docs/adding-an-island.md`,
"A cove island from the shared modules"), and their play-throughs on one engine
(`tools/lib/island-play.mjs`; `--watch` shows a run live in a web page).

Voices follow ISLAND-04 G22 (one ElevenLabs voice per speaker, none shared on an island). Lines stay
`"pending": true` until their audio exists, so an island is playable with subtitles before it is
voiced.

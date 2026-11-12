# Spec: Island 07, Tidewheel Caldera (Chapter 07 · Automations)

> Status: **in build** (2026-11-11; §12 says what is done and what is left). A design spec with every
> decision made, in the form of [ISLAND-06](ISLAND-06-inkwell-bluffs.md). It reuses the shared island
> modules that islands 04–06 now stand on (`src/world/islands/{frame,cove-harbour,height-kit,
> anchor-kit,frame-build,frame-props,cove-quay,quay-booth,island-works}.ts`,
> `src/game/{frame-island-content,island-circuits}.ts`) and does not repeat what ISLAND-04, 05, 06
> and [adding-an-island](../adding-an-island.md) already say. Read
> [PHASE-3](PHASE-3-islands-05-07.md) first: the arc, the toys, the gates, the ending.
>
> Course source: `github/copilot-app-for-beginners` at `8cb2792`, `07-automations/README.md`.
> Written in ASD-STE100 Simplified Technical English. A build step that finds a decision wrong
> records the change and its reason in §12 ("As built"). It does not stop to ask.

---

## 0. Decisions

| # | Decision | Why |
|---|---|---|
| T1 | **Site:** the island's middle `M = (7775, 9050)`, 2 900 m from Inkwell on bearing 168°. The frame is the shared one (`u` along bearing 143°, `v` along 53°), but its origin is `O = (7975, 9265)`, 290 m up the axis from the middle. Baked bounds x 7145…8405, z 8395…9705, cell 2 m (631 × 656) | The same close reach as the last two passages (65° off the wind from 233°), no tacking. The shared cove harbour is fixed in the frame, and here the island is a ring **round** the cove, so the island's middle is the bay's, not the frame's |
| T2 | **The harbour is the shared cove harbour** (quay, berth, landing, lane, turning room), with **its own cove stations**: a throat 100 m wide (the breach), then a round bay 200 m across | "You sail through the breach into the crater" (PHASE-3 §5). The lane's numbers stay; the height tests prove the throat is clear |
| T3 | **The island is a caldera:** a ring wall, crest 250 m from `R0 = (u −290, v −30)`, 50–85 m high, steep and dark inside, with one gap to the north-west on the lane's own line. Everything a guest walks to is inside the ring | One island in eight with a wall all round it. The ring hides the town until the ship is through the breach: a reveal, as a park's berm and tunnel give |
| T4 | **Sky: last light, the same day.** `hours` 17.8 (the sun is 5° up; `night` is 0), `azimuth` set so the sun stands on bearing **323°**, in the breach. `mood` `{ fogScale: 1.15, hazeTint: [1.0, 0.82, 0.74] }` | PHASE-3 asked for 19.4 h, but then the sun is 17° under the horizon and `night` is 1: every island's own hour must be daylight (`lighthouse-lamp.test.ts`), and a crater at full night reads as black. At 17.8 h the low sun comes **through the breach** and lights the Lighthouse and the town's wall while the rest of the crater is in blue shadow. Night falls in the ending (§10), where it means something |
| T5 | **One weenie: the Clockwork Lighthouse**, on a rock spur at the bay's head, on the lane's line: dead ahead as you come through the breach. Stone base y 46, an open brass frame of turning gears to y 60, a clock face 7 m across facing the bay, the lamp room y 68–74, a cap and a vane to y 82. Two striking figures by the clock ring a bell. It is the island's lighthouse (`lampBurning`), and the last light of the isles | PHASE-3 §5 |
| T6 | **The Tide Wheel** stands in the breach, on its north jaw: an undershot wheel 26 m across that turns all the time. No stop is there; you pass under it on the way in and see it from every place inside, against the sun | The land's story in one picture: the tide turns the wheel, the wheel winds the light. A weenie's partner at the other end of the long axis |
| T7 | **The town climbs the crater's inner wall** on three terraces above the quay (as Inkwell's does, with other houses): dark basalt houses with ochre and rust doors, copper roofs gone green, a lantern at every door. The route goes quay → Bandstand (T1) → Bounty Square (T2) → the Four-Gear Gate (T3) → the Wheel Works (y 27) → the Clock Court (y 36) → the Lighthouse terrace (y 46) | Islands 05 and 06 differ in plan; 06 and 07 share a stair town because both stand on the shared cove harbour, so 07 differs in everything a guest sees: black rock for white, lamps for sun, machines for charts, a wall all round for an open cliff |
| T8 | **Two circuits:** `lever` (P7.1 The Lever, 6 stations at 6 places) at the Wheel Works and `clock` (P7.2 Gears & Bells, 8 stations at 7 places) at the Clock Court. Added to `CIRCUIT_PLACES` and the schema's enum. The `dial` is the Lighthouse's clock ring | Chapter 07 has two exercises. PHASE-3 §5's toy |
| T9 | **Seven quests at seven stops, course order, one direction,** plus the optional stop (event triggers, cloud) and the optional assignment. Longest gap 110 m | ISLAND-04 G9 |
| T10 | **Five "Do this in the app" cards** (A7.1–A7.5). No GitHub checks | The chapter's exercises read pull requests; they write nothing |
| T11 | **Ids:** island `tidewheel`; quests `Q7.1`–`Q7.7`, `Q7.O` (optional stop), `Q7.A` (assignment); cards `A7.1`–`A7.5`; checks `K7.x`, `M7.1`, `H7.1`–`H7.3`; Trial `T7`; pages `pg7.*`; chests `C7.1`–`C7.3`; bottles `B7.1`–`B7.5`; puzzles `the-lever` (P7.1), `gears-and-bells` (P7.2), `drum-song` (Lyra's ceremony). No battle | The chart and `course.json` already use `tidewheel` |
| T12 | **Two new terrain keys:** `basalt` (near-black rock with rust and sulphur streaks on the baked cliff and rock masks) and `blackSand` (the baked sand mask, dark). Both follow `chalk`'s pattern in `terrain-material.ts` | A caldera in the default sand and rock would be a brown hill. `chalk` showed the cost is small |
| T13 | **Plants:** pine and cypress (dark, on the ring's top and the benches), scrub, the flower bush as fireweed (magenta) and broom (yellow). Flowers are flora rows: fireweed `#C2337A`, broom `#E8C440`, sea thrift `#E8A6B8`, white yarrow `#F0EEE2` | No new material. Bright flowers on black ground are the island's colour accent |
| T14 | **Buildings:** the village kit's stone and plaster buckets painted dark basalt and soot-grey, copper-green roofs (flat, with a low parapet), brass and iron for the machines. Every door has a hanging lantern (`hangLantern`); the lane posts are lamps | No new material. Lamps at last light are the island's own look |
| T15 | **Steam and hot springs:** three stepped pools on the south shore and fumaroles on the wall, as built basins (still water of the kit's glass-blue paint) with steam from the existing chimney-smoke system (`chimneys` in `IslandOut`) | Kinetic and cheap. No new material |
| T16 | **Birds:** gulls over the bay; petrels (small, dark, fast) round the ring's top | PLAN §6 |
| T17 | **Lyra** plays on the Bandstand and retells "Programming the Sequencer". **Dot** keeps the Model Market stall on the quay | PLAN §3; MODEL-MARKET §2 |
| T18 | **Voices** as ISLAND-04 G22, by the precedent of islands 05 and 06 (provisional Azure speakers in `docs/voices.md`, made with the project's voice tool) | PHASE-3 §9 |
| T19 | **Music:** "Tidewheel Lullaby" (`music_tidewheel_lullaby`, 150 s, −15.3 LUFS) is the island's theme. "The Long Light" (`music_the_long_light`, 147 s, −15.4 LUFS) plays once in the ending | PHASE-3 E10 |
| T20 | **No battle** on the Inkwell → Tidewheel passage. The kraken is sighted far off on it | PHASE-3 §6.3 |
| T21 | **Arrival card:** eyebrow `Chapter 07 · Automations`, title `Tidewheel Caldera`, line `Test it by hand before the clock runs it` | The chapter's rule: "Start with a manual automation so you can test the prompt safely" |
| T22 | **The Seal starts the ending** (§10): the island's `sealed` story step plays the Long Light once, then the game goes on (free sailing) | PHASE-3 §6 |

---

## 1. Teaching map (Chapter 07)

Folder `07-automations`. Anchors are the slugs `src/learn/course/sections.ts` makes. Hashes come from
`lock.json`. Images are `ch07/<file-without-extension>`.

| # | Anchor | What it teaches | Images | UI names |
|---|---|---|---|---|
| 1 | `learning-objectives` | Five objectives (two optional); ~50 minutes | — | **Issue**, **Pull request** |
| 2 | `prerequisites` | Chapter 06. The **Pull requests** view from Chapter 03; the tool-access principles of Chapters 04 and 05. No canvas, MCP server or plugin needed. The report needs open pull requests: run the setup script if you skipped it | — | **Pull requests** |
| 3 | `from-the-studio-programming-the-sequencer` | A producer programs a pattern once. The table: programmed pattern → saved prompt; hit play → manual trigger; run on the clock → schedule; chosen instruments → selected tools; the producer checks the mix → a human reviews the result | `sequencer-automation` | — |
| 4 | `automation-is-a-saved-agent-run` | Four parts: **Trigger** (what starts it?), **Prompt** (what should the agent do?), **Tools** (the least access needed?), **Review path** (where do I inspect the result?) | `automation-trigger-to-run` | — |
| 5 | `start-manual-and-local` | A manual automation runs only when you start it. Keep it local while you test it: test the prompt, inspect output, adjust scope, avoid surprise runs, confirm tools are minimal. Add a schedule, an event trigger or cloud only after the manual prompt gives trustworthy results | `manual-first-path` | — |
| 6 | `a-good-starter-automation` | Work you already do more than once. Avoid first automations that write code, post comments, change labels, approve reviews or merge. Automations are saved in the app, not committed. Keep secrets out. Issue text can be untrusted: a read-only summary reduces **prompt-injection** risk | — | — |
| 7 | `confirm-work-items-exist` | **Pull requests** → **Authored by me**, with your fork's `repo:` term: at least three open pull requests from the setup script. The report shows whatever state they are in now | — | **Pull requests**, **Authored by me** |
| 8 | `exercise-create-a-manual-review-readiness-report` | **Automations** → **New automation**; name `PR review readiness report`; **Trigger** from **Daily** to **Manual**; **Run in the cloud** off; the prompt (five things for each open pull request, a table, "Do not edit files, add comments, change labels, approve reviews, or merge anything"); **Select repository**; **Workspace** → **Current checkout**; the arrow next to **Create** → **Create and run**. It appears under **Your automations**; the run under **Recent runs**. Open the run detail: the prompt matches, no error text, the result is a table with CI status, comment status and a next action | `app-new-automation` | **Automations**, **New automation**, **Trigger**, **Daily**, **Manual**, **Run in the cloud**, **Select repository**, **Workspace**, **Current checkout**, **Create**, **Create and run**, **Your automations**, **Recent runs** |
| 9 | `exercise-schedule-the-review-readiness-report` | A scheduled local run happens only when your computer is awake and the app is running. **Edit**; **Trigger** from **Manual** to **Daily**; **Hours** → **08:00**, clear any other hour (the default **09:00** too); **Minute** at **:00**; the repository picker still shows your fork; **Save automation**. The card shows **Daily**; **Automation details** shows the **Schedule** and the **Next run**. Next morning, **Recent runs**. If noisy, tighten the prompt | `app-automation-schedule` | **Edit**, **Hours**, **08:00**, **09:00**, **Minute**, **:00**, **Save automation**, **Automation details**, **Schedule**, **Next run**, **Run** |
| 10 | `why-schedule-instead-of-running-manually` | Manual answers "What's the status right now?" Scheduled answers "What changed since yesterday?" **Hourly**, **Weekly**, **CRON** (validated, with a preview) | — | **Hourly**, **Weekly**, **CRON** |
| 11 | `event-triggers` (optional) | Twelve event triggers in the Trigger menu (the table); the menu scrolls | `app-automation-new-triggers`, `app-automation-new-triggers-scrolled` | the twelve trigger names, **Upstream Automations** |
| 12 | `keeping-event-triggers-safe` (optional) | Start read-only; limit repository scope; filter by label or search query; no write tools until the summary is reliable; review run history | — | — |
| 13 | `cloud-automations`, `when-to-consider-cloud` (optional) | Local runs from your machine while the app is open; cloud runs on GitHub-hosted infrastructure. Needs: Copilot cloud agent enabled, a private or internal repository (not a public fork: read, do not create), billing. The **Tools** dropdown (**Select tools**, **Suggest tools**, **Search tools…**; groups; select only what the task needs; read tools **Read PR**, **List PRs**, **Search PRs**). **Type**: **Personal** (default) or **Shared**; Personal does not make the sessions private | `local-vs-cloud-automations`, `app-automation-cloud-tools` | as named |
| 14 | Troubleshooting: five anchors | `a-local-automation-does-not-run`, `the-review-readiness-report-is-empty`, `cloud-automations-are-unavailable`, `a-scheduled-run-is-noisy`, `the-automation-made-surprising-suggestions` | — | — |
| 15 | `key-takeaways` | Six takeaways (the Trial maps them) | — | — |
| 16 | `assignment` | One manual automation of your own: clear name, manual trigger, one bounded task, read-only, run once, inspect and revise. "Local automations have no tool list" | `assignment` | — |
| 17 | `course-complete` | The table of seven areas and what you practised; "human judgment stays in the loop at every major control point" | — | — |

Nothing in the game names a UI part that is not in this table.

---

## 2. Metaphor table (the land teaches the chapter)

| In the caldera | In the app | Source |
|---|---|---|
| A music-box **drum**, pinned once | The saved prompt | §3 table: programmed pattern → saved prompt |
| The **lever** | **Manual** | §3: hit play → manual trigger |
| The **clock ring** on the Lighthouse | **Daily**, **Hours** 08:00 | §9 |
| A peg left in the ring at nine | The default **09:00**, which you clear | §9 |
| The **tide gauge** | A local run needs the computer awake and the app running | §9 note |
| The **keeper's log** | **Recent runs**, the run detail | §8 |
| The **tool rack**: three reading glasses on hooks, the hammers locked away | The least access needed; read tools only | §4, §13 |
| The **bells** in the Bell Arch, one for each kind of news | Event triggers | §11 |
| A **forged message in a bottle** | Prompt injection through untrusted issue text | §6, §12 |
| The **rock light** outside the breach, lit when the bay sleeps | Cloud automations | §13 |
| The four great **gears** in the gate | Trigger, Prompt, Tools, Review path | §4 |

The island's rule, said by its keeper and shown by its machine: **a routine goes on the lever before
it goes on the clock.**

---

## 3. Layout (island frame; `R0 = (−290, −30)`)

```
            sea (NE cliff)
        .-''''''''ring crest 250 m''''''''-.
      .'    Bell Arch   Wheel Works  Gate    '.
     /   T3 ─────────────────────────┐         \
 jaw|    T2 ── Bounty Square ──      │ Clock    |
 ⚙ ──    T1 ── Bandstand ──          │ Court    |
breach   ====== quay ======  head    └─ ⌂ Lighthouse (on the lane's line)
 ───▶ lane ─▶ turning room ─▶ berth     spur    |
 jaw|                                           |
     \      black sand beach      hot springs  /
      '.                                     .'
        '-.............ring crest..........-'
```

| Place | Frame (u, v) | y | What is there |
|---|---|---|---|
| Quay, berth, landing, lane | shared (`cove-harbour.ts`) | 2.2 | Dot's booth at (−213, 21) |
| Breach | u −560…−470, v −95…+35 | sea | The throat; the Tide Wheel on the north jaw at (−512, 52) |
| Terraces T1, T2, T3 | u −222…−118; v 26–46, 52–68, 74–92 | 3.4, 11, 19 | Houses with their backs to the rock, lanterns, a lamp-lit lane on each |
| Bandstand (T1) | (−150, 40) | 3.4 | Lyra, two players, the music-box drum on its stand |
| Bounty Square (T2) | (−128, 61) | 11 | The bounty board, a hot-spring basin with steam, the course board |
| Lamp Stair | (−132, 42) → (−120, 60) → (−108, 62) → (−100, 80) → (−92, 82) | 3.4 → 19 | Two railed flights, a lantern at each head |
| Four-Gear Gate (T3 east end) | (−92, 84) | 19 | Four great gears in a stone gate, each with its plate; the Keeper |
| Works Stair | (−88, 88) → (−76, 104) | 19 → 27 | One railed flight |
| Wheel Works | (−84, 124), 34 × 26 | 27 | The drum bench, the gear rack, the cloud switch, the chart desk, the great lever, the keeper's log; the tool rack on the north wall |
| Clock Walk | (−68, 118) → (−40, 92) → (−34, 60) | 27 → 36 | A walled path along the inner wall with two flights; the bay below on the right |
| Clock Court | (−36, 44), 30 × 22 | 36 | The clock desk, the day gear, the ring's crank (the `dial`), the peg board, the save bell, the tide gauge, the morning log |
| Bell Arch | (−62, 62) at the court's north side | 36 | Twelve small bells in a stone arch, each with its plate; Nerys; a spyglass on the rock light |
| Lighthouse Stair | (−36, 30) → (−52, 4) → (−70, −14) | 36 → 46 | Two railed flights |
| Lighthouse terrace and tower | terrace (−80, −24) r 11; tower (−94, −30) | 46 | The Trial, the last lever, the Seal |
| Black sand beach, hot springs | the bay's south shore; pools at (−330, −222) | 0.6–6 | Three stepped pools with steam; a chest; two starfish; a bottle |
| Rock light | (−680, 48), outside the ring | sea | A small stone beacon on a skerry; a ship obstacle |

Reach: every stop is on one walk from the landing; the beach path leaves the lane at the cove's head.

---

## 4. Beats (course order)

| Quest | Stop | Who | Teaches (anchor) | Checks and cards |
|---|---|---|---|---|
| Q7.1 | Bandstand | Lyra Wren | `from-the-studio-programming-the-sequencer`; the `drum-song` ceremony: the band plays the pattern by hand and tires; you pin the drum; the box plays it | K7.1; song "Tidewheel Lullaby" |
| Q7.2 | Four-Gear Gate | Keeper Agnes Voss | `automation-is-a-saved-agent-run`, `start-manual-and-local`, `a-good-starter-automation` | M7.1 (four parts to four questions), K7.2, K7.3 |
| Q7.3 | Bounty Square | Tobin Marsh, bounty clerk | `confirm-work-items-exist` | K7.4; card A7.1 |
| Q7.4 | Wheel Works | Wheelwright Ansel Roe | `exercise-create-a-manual-review-readiness-report`: **P7.1 The Lever** | the circuit's checks; cards A7.2, A7.3; H7.1 |
| Q7.5 | Clock Court | Bellmaster Greta Hale | `exercise-schedule-the-review-readiness-report`, `why-schedule-instead-of-running-manually`: **P7.2 Gears & Bells** | the circuit's checks; cards A7.4, A7.5; H7.2, K7.5 |
| Q7.O | Bell Arch (optional) | Nerys Calder, ringer | `event-triggers`, `keeping-event-triggers-safe`, `cloud-automations`; the forged bottle | K7.6, K7.7, K7.8; H7.3 |
| Q7.6 | Lighthouse terrace | Old Keeper Silas Thorne | `key-takeaways`: Trial T7 (eight questions, T7.1–T7.8) | T7 |
| Q7.7 | The last lever | Silas, then Juno | the Seal; `course-complete`: **the Long Light** (§10) | — |
| Q7.A | (after the Seal) | Juno | `assignment` | — |

Chests C7.1 (Bandstand, the sequencer table), C7.2 (Wheel Works, the prompt), C7.3 (hot springs,
the six takeaways). Bottles B7.1–B7.5 are the five troubleshooting problems; B7.5 at the Bell Arch is
"the automation made surprising suggestions", written as the forged message.

---

## 5. The two circuits

Stations are in the chapter's step order. Every wrong choice has a reason and its anchor.

**P7.1 The Lever** (`lever`; places `drum`, `gear`, `switch`, `desk`, `lever`, `log`)

| # | Place | Kind | You do | The world shows |
|---|---|---|---|---|
| 1 | `drum` | choose | Pin the drum with the bounded, read-only pattern (the report's prompt), not one that comments or merges | Brass pins rise on the drum |
| 2 | `gear` | choose | Seat the hand gear: **Trigger** from **Daily** to **Manual** | The lever's gear drops into mesh |
| 3 | `switch` | choose | **Run in the cloud** off | The shutter toward the rock light closes |
| 4 | `desk` | tiles | **Select repository** (your fork), **Workspace** → **Current checkout** | The desk's two plates light |
| 5 | `lever` | watch | The arrow next to **Create** → **Create and run** | The great lever comes down; the Works' gears run; the drum plays one round |
| 6 | `log` | choose | Open the run detail: the prompt matches, no error text, a table with a next action for each | The log's page turns; the lap ends: the Works' lamps stay lit |

**P7.2 Gears & Bells** (`clock`; places `desk`, `gear`, `ring`, `pegs`, `bell`, `tide`, `log`)

| # | Place | Kind | You do | The world shows |
|---|---|---|---|---|
| 1 | `desk` | choose | **Automations** → the automation → **Edit** | — |
| 2 | `gear` | choose | **Trigger** from **Manual** to **Daily** | The day gear meshes with the clock train |
| 3 | `ring` | dial | Turn the ring to **08:00** (a time before the workday starts) | The Lighthouse's clock ring turns as you turn it; a wrong hour gets its reason |
| 4 | `pegs` | choose | Clear the other hours, the default **09:00** too; **Minute** at **:00** | The nine peg comes out of the ring |
| 5 | `bell` | choose, then watch | **Save automation**; the card shows **Daily**; **Automation details** shows the **Schedule** and **Next run** | The striking figures ring once |
| 6 | `tide` | choose | The run needs the computer awake and the app running | The gauge's float rises |
| 7 | `log` | watch | The next morning: **Recent runs** shows a run you did not start | Morning comes to the gauge; the log gains a line |
| 8 | `log` | choose | The summary is noisy: tighten the prompt, then save again | The lap ends: the clock ring holds eight; every lamp on the Clock Walk lights |

---

## 6. Cast and voices

Lyra Wren; Keeper Agnes Voss; Tobin Marsh; Wheelwright Ansel Roe; Bellmaster Greta Hale; Nerys
Calder; Old Keeper Silas Thorne; Dot (the market). Islanders with barks: Lyra's two players (seated),
a net mender on the quay, a lamplighter on the lane, an oiler at the Works, a child with a paper
boat at the basin, a bather's towel-keeper at the springs, a stargazer on the Lighthouse terrace.
Contact gate Q1 applies to each: soles on the walk surface, seats on blocks.

---

## 7. Kinetics and delight

Always moving: the Tide Wheel; the Lighthouse's gears and its clock's hands; the lamp's beam after
the Seal; steam at the springs, the basin and two fumaroles; the Bandstand's drum; pennants on the
Clock Walk; birds. Delights: the breach; pinning the drum and hearing the box play; the clock ring on
the tower turning in your hands; the last lever.

---

## 8. Technical plan

- `src/world/islands/tidewheel/`: `layout`, `height` (+ test), `terrain-regions`, `build`, `town`,
  `town-build`, `dressing`, `works` (the Wheel Works, the Clock Court, the Bell Arch, the walks),
  `lighthouse`, `wheel`, `circuit`, `anchors`, `index`, `vegetation`, `flora`, `flora-palette`,
  `silhouette`, `waypoints`, `starfish`, `arrival`, `harbor`, `market`, `stream`, `chart`.
- `src/game/tidewheel-{island,npcs,quests,session,circuits}.ts` on the shared content and stage.
- `src/islands/tidewheel.ts` and the registry line; `story.ts`; `CIRCUIT_PLACES`; the schema's enum;
  `ISLAND_SIGNS`; the characters; `tools/bake/bake-frame-island.ts` row; `tools/lib/islands.json`;
  `tools/budgets.json`; `src/dev/terrain.ts`.
- Course pack: `chapters/07-automations.json`, `quests/tidewheel.json`, three puzzles, `course.json`,
  `labels.json`, `learning.json`, `market.json`, `voice/*`, `lock.json` (nine images).

---

## 9. Checks

PHASE-3 §7's eight gates, with `tools/tidewheeltest.mjs` (the shared play-through library).

---

## 10. The ending: the Long Light

1. **The last lever.** After the Trial, Silas gives you the lever in the lamp room. The Seal's
   moment: the Works run, the striking figures ring, the lamp turns on and its beam goes out through
   the breach.
2. **Night falls.** The sky runs forward from 17.8 h to 21.5 h over six seconds (a cut with reduced
   motion). "The Long Light" starts.
3. **The chart again.** The opening's living chart, without its fog. The eight lights turn on in
   voyage order. For each of the seven areas of `course-complete`, Juno says what you practised
   there, in the table's words; Anchorage Cay and Port Meridian share the first line (setup and the
   tour are the course's orientation).
4. **The kraken.** Back in the caldera's bay, it rises once beside your ship, calm, looks, and goes
   down. Juno: "It never wanted the captain who checks."
5. **Master Captain.** Juno's last teaching line is the course's: human judgment stays in the loop at
   every major control point. Then the certificate and the credits.

Rules: no fail state, no fight, skippable at every step, reduced motion uses cuts, every line of
step 3 cites `course-complete`, it plays once (a story flag), and the game goes on after it.

---

## 11. Tech notes

- The ring's wall is a height term, not built geometry: `ringWall(d, θ)` in `height.ts`, with the
  breach as an angular gap. The cove carver cuts the throat through it.
- The Lighthouse's moving parts (gears, hands, ring, lamp, figures) and the wheel are single meshes
  in the kit's materials, turned in `update` inside `detail` range only; hidden ones carry
  `userData.prewarm`.
- The beam is the lit-lamp material (the same program as every island's lit lamp).

---

## 12. As built

### 12.1 The contract, terrain, world art, content and the ending (2026-11-11)

Changes from §0, §3, §4 and §10, each in `layout.ts` (the source of truth) or the pack:

| What | Spec | As built | Why |
|---|---|---|---|
| The frame (T1, T3) | origin (7975, 9265); the ring's middle `R0 = (−290, −30)`, crest 250 m | origin **(7956, 9241)**; the ring's middle **(−262, −30)**, crest **262 m**, foot 222 m, 50 to 84 m high | The shared quay must stand inside the ring with a town's depth behind it. The island's middle on the chart is where T1 put it |
| The breach (T2) | a throat 100 m wide | an angular gap (`breach.gap` 10°, full height by 17°), jaws that keep 60 m of wall, and the carve held to 1 m in the throat | The first cut was a bay's mouth, not a gate: too wide and too low to hide the crater |
| The hour (T4) | `hours` 17.8, the sun on bearing 323° | **17.6**, `azimuth` 46; `mood` gains `fill` 2.3 and `exposure` 1.3 | The sun a little higher, so the wall's top is lit. Most of the crater is in the wall's shade: without the fill the town was near black |
| The Lighthouse (T5) | on a spur at the bay's head, tower (−94, −30) | on a spur of the **east rim**, tower **(−34, −31)**, terrace (−49, −26) r 10, base y 46, top y 84 | At the bay's head the spur cut the beach path and stood in the turning room's light. On the rim it is still dead ahead through the breach |
| The Tide Wheel (T6) | (−512, 52), 26 m | **(−505, 33)**, r 13, on two stone piers | On the jaw's own rock |
| The route (T7, §3) | Bandstand → Bounty Square → Four-Gear Gate (T3) | Bandstand (T1) → **Gear Square** with Keeper Agnes and the four gears (T2, (−112, 61)) → **Bounty Corner** with Tobin (T3, (−108, 84)) | The four gears are the chapter's first picture, so they stand in the town's middle, where the course board is. The bounty board is the last thing before the Works Stair, as "confirm the work items" is the last thing before the exercise |
| The Works and the Court (§3) | (−84, 124) 34 × 26 at y 27; (−36, 44) 30 × 22 at y 36 | Wheel Works **(−136, 123)**, half 15 × 11, y 27; Clock Court **(−66, 52)**, half 13 × 11, y 36; Bell Arch (−66, 60.5) | Ledges on the wall, each on its own disc of rock. Smaller floors keep every station in one camera |
| Terrain keys (T12) | `basalt`, `blackSand` | **`lavaRock`**, `blackSand` | The name says what the paint is. Tones `#161515` to `#3d3a3a` with a little rust and sulphur: the first version read red-brown |
| Brass (T14) | the kit's metal | the bright pieces moved to the cloth bucket (`moveBright`) | The kit's metal reads brown under a low sun (docs/adding-an-island.md) |
| The springs (T15) | pools at (−330, −222) | three pools at (−300, −236), (−286, −229), (−275, −221); the water in the cloth bucket, `#86b4b0` | The carve's hold capped the first place. The kit's glass-blue read as neon in the shade |
| Bellmaster (§6) | Brigid | **Greta Hale** (`greta`) | A character `brigid` already exists |
| The gear keeper and the market's keeper (§6, T17) | Maren; Pim | **Keeper Agnes Voss** (`agnes`); **Dot** (`dot`) | Elder Maren is Thousand-Bough's and Pim is Anchorage's crane boy: the same name would have been the same voice. Two islanders changed too (Old Hob, Little Jory) |
| The kraken's farewell (§10.4) | in the bay | 50 m off the quay's end, off the berthed ship's bow, for 14 s; the sighting is `staged`, so the script's own quiet does not send it down | In the bay's middle she was a mark on dark water. The sightings' gate closes during any script, so an unstaged one left at once |
| Quests (T9, T11, §4) | `Q7.1`–`Q7.7` | **`Q7.1`–`Q7.6`**, `Q7.O`, `Q7.A`: the last lever is the Seal's own moment inside Q7.6 | A seventh quest with no teaching in it would be a stop that only says "pull" |
| The clock ring (T8) | a dial to 08:00 | hours `[8, 9, 10, 11, 12]`, starting on nine (the app's default), so the first thing you learn is that the default is not your hour | The chapter's step: clear the default 09:00 |
| The ending's place in the story (T22, §10) | a `sealed` story step plays it | the `tw-ending` cue inside the Seal's script, before `celebrate` | One script, one order: the lamp, the Long Light, then the certificate. Its lines are the pack's `ending.*` scripts |
| The chart of the ending (§10.3) | the opening's living chart | a night chart of its own (`.hud-ending`): the isles in their chart places, the voyage's line, a lamp on each | The opening's chart is a canvas scene bound to the opening. A DOM chart is light, readable at any size, and skippable |

**Done.**

- **Terrain** (`height.ts`, 18 tests): the ring wall with its breach, the bay, the town's three
  terraces on the inner wall, the ledges (Works, Court, the Lighthouse's spur) as discs of rock with
  wall-steep banks, the walks and stairs between them, the black beach, the springs' shelf, and the
  rock light's skerry outside the ring. Its row in `bake-frame-island.ts`; the pack's
  `tidewheel/critical` and `tidewheel/chart`.
- **World art** (`src/world/islands/tidewheel/`): `build.ts` (the paints, gears, bells and the forge
  house, on the shared `block-house.ts`), `town.ts` and `town-build.ts` (the quay, three rows of
  houses, the Bandstand, the Gear Square, the Lamp Stair, the Bounty Corner), `works.ts` (the Wheel
  Works, the walks, the Clock Court, the Bell Arch and its twelve bells), `lighthouse.ts`,
  `sights.ts` (the Tide Wheel, the rock light, the springs, the fumaroles), `machines.ts` (what
  moves), `mist.ts`, `market.ts`, `circuit.ts`, `anchors.ts`, `vegetation.ts`, `flora.ts`,
  `flora-palette.ts` (fireweed, yarrow, cinder-broom, sea thrift), `starfish.ts`, `silhouette.ts`,
  `arrival.ts`, `waypoints.ts`, `stream.ts`, `chart.ts`, `index.ts`.
- **What moves** (`index.ts`, `machines.ts`): the Tide Wheel; the Lighthouse's gears and clock hands;
  the Bandstand's drum and its pins; the great lever; the day gear; the clock ring and its nine peg;
  the striking hammer; the tide gauge's float; steam; and, once sealed, the lamp, its beam and the
  halos. Every one is in a kit material: no new shader. Hidden ones are marked `prewarm`.
- **Game** (`src/game/`): `tidewheel-island.ts`, `-quests.ts`, `-npcs.ts`, `-circuits.ts`,
  `-session.ts` (cues `tw-song`, `tw-gears`, `tw-bounty`, `tw-bells`, `tw-ending`) and
  `tidewheel-ending.ts`, all on `frame-island-content.ts` and `island-circuits.ts`. The host gained
  `sky` (`hours`, `set`, `home`) and `overlay` for the ending; the kraken's sightings gained
  `showAt`; the music gained the `ending` cue.
- **Course pack**: `chapters/07-automations.json`, `quests/tidewheel.json`, the three puzzles,
  `course.json`, `labels.json`, `learning.json`, `market.json`, `voice/*`, `lock.json` (nine images).

### 12.2 Play-through, fixes, art pass and gates (2026-11-11)

**Played.** `tools/tidewheeltest.mjs` (on `tools/lib/island-play.mjs`) plays Chapter 07 by real
input: the chart to the quay, the arrival, Lyra, Agnes, Tobin, the Lever (a wrong pick first at each
choice), Gears & Bells (the ring held on nine once, then turned to eight), Nerys's optional stop, the
Trial failed once and then passed, the Seal, the Long Light watched through, Q7.A, chests C7.1 and
C7.3 opened by E, the five bottles and the five starfish. It passes with no failure (163 stills),
before and after the voices. What the runs and the gates found, and the fix:

| Found | Fix |
|---|---|
| The Seal's script stopped in the ending: Port Meridian has no line of its own, and a missing script throws | The chart's lights are grouped by Juno's lines (`LIGHT_GROUPS`: Meridian lights with Anchorage). A fault in the ending is logged and the Seal's script goes on |
| The kraken never showed: the script's quiet sent it down at once | `SightingPlan.staged` (the row above) |
| The night chart was small and grey | Its frame is the isles' own box; each lamp has a warm glow and four rays; each leg of the voyage turns gold as its isle lights |
| The Wheel Works was dark stone in the wall's shade: the brass and the plates did not read | Its walls are limewashed over a dark plinth |
| A row's end house was a blank block in the sun | A lit window in each end wall (`forgeHouse`'s `dress`) |
| The quay's walk went through the market booth | `quay.pass`, seaward of the booth; the stall is a spur from the gangway |
| Agnes and Ansel stood 10 m from a stair's head (wayfinding's rule: near a head means in talk reach) | Agnes by the third gear, 13 m from the head; Ansel beside his lever, 15 m in |
| Grass grew at the springs keeper's feet | The pools' keep-clear box is 4.5 m |
| Two found chests (C7.1, C7.3) | The engine's `collect({ found })` takes a list |
| The engine's chunk went 1.3 KB over its budget (257.3 of 256 KB): the gears, and Inkwell's quill and kites, were three's `ExtrudeGeometry`, which brings its shape triangulation | `src/world/islands/plate-geometry.ts` (`flatTriangles`, `plateGeometry`) cuts them triangle by triangle: 251.5 KB. A gear now has wedge windows between its spokes |

**Gates.**

| Gate | Result |
|---|---|
| Contact (`casttest --island=tidewheel --raised=dot:0.22`) | pass: 18 of 18 on their ground or seat |
| Wayfinding (`wayfindtest --only=legs,reach --islands=tidewheel --reach=tidewheel`) | pass |
| Flicker (`flickertest --views=tw-…`, 11 views with the four fly-rounds) | pass: still ≤ 0.018 %, no z-fight. Its three "stacked" notes are two rail joints and the island's far silhouette, which is hidden while you are on the island (checked in play) |
| Unit tests, types, lint, format, content check, build, size budgets, audio (`check:audio`) | pass (1 700 tests; `vendor-three` 251.5 of 256 KB; chapter 07's part 15.4 of 28 KB) |
| Voices | 95 lines made (`tools/voice/generate.ts`); seven provisional Azure speakers in `docs/voices.md`; Juno, Wingman and Lyra in their own voices |

**Lip-sync (2026-11-11).** With Dan's go-ahead Rhubarb 1.14.0 went into `.tools/rhubarb`, and
`npm run voice:lipsync` made mouth cues for the 253 islander lines that had none: Sunspire 73, Inkwell
88, Tidewheel 79 and the Long Light 13 (Wingman's lines take none). `lipsync.json` now holds all 812
voiced islander lines (232.8 KB, 54.6 KB gzipped); the 559 older entries are unchanged. Each new
line's cues end within 0.35 s of its audio and the mouth is open for 65 % of it on average (70 % on
the older lines). In the game, Lyra's first Tidewheel line reaches her face with its 27 cues and her
mouth moves through it. The tool now passes over `pending` captions (battle 4's), which have no audio
to time and stopped the first run.

**Left.** Frame budgets, memory, perf and the program census for islands 05 to 07 (PHASE-3 §7.5 to
§7.7). Dan's audition of the provisional voices.

# Character voices

Every character voice is AI-generated (ElevenLabs or Azure AI Speech). Provenance and dates are in
[`ART_PROVENANCE.md`](../ART_PROVENANCE.md).

Voice lines belong to a course pack ([COURSE-PACKS.md](specs/COURSE-PACKS.md)). The Copilot app
course's are in [`courses/copilot-app/voice/lines.json`](../courses/copilot-app/voice/lines.json), and
their audio, word timings, `manifest.json` and `lipsync.json` are in `courses/copilot-app/public/voice/`
(served as `<base>courses/copilot-app/voice/`). [`tools/voice/generate.ts`](../tools/voice/generate.ts)
makes the audio, and `npm run voice:lipsync` the mouth cues; both take `--course <id>` (default
`copilot-app`):

```bash
npx tsx tools/voice/generate.ts --course copilot-app --only=mer.market.hello
npm run voice:lipsync -- --course copilot-app
```

Who voices each speaker is the pack's `voice/cast.json`: the speech service (`tts`), the `voice` (or
`voiceEnv`, an environment variable that names it, with a `fallbackVoice`), `model`, `prosody` and
`fx`. A line in `voice/lines.json` holds its id, speaker and text, and anything that's its own (a
`prosody`, a `sub`); a field on the line overrides its speaker's. To recast a character, change its
entry in `cast.json` and make its lines again (the cache key includes the voice, so they all change).
A line with `"pending": true` is written but not voiced yet (an island in build): it needs no cast
entry, and `generate.ts` and its `--check` leave it out until you drop the flag.

`generate.ts --check` makes nothing: it checks that every line, resolved against the cast, still
matches the audio in `manifest.json` (its text, speaker and cache hash), and `--check --list-stale`
lists the Azure lines that need making again (the weekly course refresh uses it).

**Text-only packs.** A pack with `"voice": false` in `course.json` (today `copilot-cli`) has no audio
and no `cast.json`. `generate.ts --course copilot-cli` writes its captions instead, calling no service: a
`manifest.json` marked `textOnly`, one `<id>.json` per line with its text and reading time, and an empty
`lipsync.json`. In the game a caption holds for its reading time, or moves on with **Next**, the
interact key or the gamepad's A. `--check` proves the captions match `lines.json`.

The cast below is the Copilot app course's. Another course can give the same characters other voices (or
another language) in its own `voice/cast.json`.

| Character | Service         | Voice                                                                                                                  | Notes                                                                                            |
| --------- | --------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Juno      | ElevenLabs      | [Charlotte – Podcasts & Lifestyle](https://elevenlabs.io/voices/XEQBC9sleaE3f5ff82UR) (`XEQBC9sleaE3f5ff82UR`)         | Australian, female. Voice Library, 730-day notice period.                                        |
| Wingman   | ElevenLabs      | [Willem – Casual British Conversational](https://elevenlabs.io/voices/tfsEebr1nWcNraaptkk3) (`tfsEebr1nWcNraaptkk3`)   | British, male. Voice Library, 730-day notice period. The `wingman-bird` effect raises the pitch. |
| Nell      | ElevenLabs      | [Clara – Natural and Convincing](https://elevenlabs.io/voices/EIsgvJT3rwoPvRFG6c4n) (`EIsgvJT3rwoPvRFG6c4n`)           | American, female. Voice Library, 730-day notice period.                                          |
| Ezra      | Azure AI Speech | `en-GB-Ollie:DragonHDLatestNeural` (from `AZURE_SPEECH_MALE_VOICE_UK`)                                                 | Fallback: `en-GB-OllieMultilingualNeural`                                                        |
| Bo        | Azure AI Speech | `en-GB-Ryan:DragonHDLatestNeural`                                                                                      | Fallback: `en-GB-RyanNeural`                                                                     |
| Suri      | Azure AI Speech | `en-US-Jenny:DragonHDLatestNeural`                                                                                     | Fallback: `en-US-JennyNeural`                                                                    |
| Pim       | Azure AI Speech | `en-IE-ConnorNeural`                                                                                                   |                                                                                                  |
| Pol       | Azure AI Speech | `en-IE-EmilyNeural`                                                                                                    |                                                                                                  |
| Lyra      | ElevenLabs      | Sasha (`AyCt0WmAXUcPJR11zeeP`) | Female. Chosen by Dan on 2026-10-25 (was Azure `en-GB-LibbyNeural` at −5 %); all 29 lines (`lyra.*`, `mer.lyra.*`, `tb.lyra.*`, `kh.lyra.*`) made again. |
| Tobias    | Azure AI Speech | `en-GB-ThomasNeural`                                                                                                   |                                                                                                  |
| Mina      | Azure AI Speech | `en-GB-HollieNeural`                                                                                                   |                                                                                                  |
| Anders    | Azure AI Speech | `en-GB-EthanNeural`                                                                                                    |                                                                                                  |
| Rhea      | Azure AI Speech | `en-GB-AbbiNeural`                                                                                                     |                                                                                                  |
| Oren      | Azure AI Speech | `en-GB-OliverNeural`                                                                                                   |                                                                                                  |
| Pell      | Azure AI Speech | `en-GB-ElliotNeural`                                                                                                   |                                                                                                  |
| Admiral   | Azure AI Speech | `en-GB-OliviaNeural`                                                                                                   |                                                                                                  |
| Tamsin    | ElevenLabs      | [Jo](https://elevenlabs.io/voices/L4so9SudEsIYzE9j4qlR) (`L4so9SudEsIYzE9j4qlR`)                                       | British, female. Voice Library, 730-day notice period.                                           |
| Saffi     | ElevenLabs      | [Beatrice – Mature, Gentle and Engaging](https://elevenlabs.io/voices/kkPJzQOWz2Oz9cUaEaQd) (`kkPJzQOWz2Oz9cUaEaQd`)   | British, female. Voice Library, 730-day notice period.                                           |
| Oak       | ElevenLabs      | [Joe – Warm and Confident](https://elevenlabs.io/voices/LEvd0YiWkwZ6hTZOmdVE) (`LEvd0YiWkwZ6hTZOmdVE`)                 | Nigerian English, male. Voice Library, 730-day notice period.                                    |
| Fen       | ElevenLabs      | [Hugh – Rhythmic and Engaging Storyteller](https://elevenlabs.io/voices/y6p0SvBlfEe2MH4XN7BP) (`y6p0SvBlfEe2MH4XN7BP`) | Scottish, male. Voice Library, 730-day notice period.                                            |
| Ines      | ElevenLabs      | [LOUISE – Warm, Bright and Confident](https://elevenlabs.io/voices/EoMKQ1XHxZPJ6KVTvPL3) (`EoMKQ1XHxZPJ6KVTvPL3`)      | Welsh/British, female. Voice Library, 730-day notice period.                                     |
| Rook      | ElevenLabs      | [Noah Yorkshire](https://elevenlabs.io/voices/poHOO1m3tBNm4Ywmzcaq) (`poHOO1m3tBNm4Ywmzcaq`)                           | Yorkshire, male. Voice Library, 730-day notice period.                                           |
| Pip       | ElevenLabs      | [Daniel – Bright, Warm and Commanding](https://elevenlabs.io/voices/gwU7DXdLrTvWCiUTPZG8) (`gwU7DXdLrTvWCiUTPZG8`)     | Warm, male voice. Voice Library, 730-day notice period.                                          |
| Maren     | ElevenLabs      | [Eleanor – Gracious and Authoritative](https://elevenlabs.io/voices/2qQJWjw5XdG80GreshqG) (`2qQJWjw5XdG80GreshqG`)     | British, female. Voice Library, 730-day notice period.                                           |
| Gilda | ElevenLabs | [Harriet – British Actress](https://elevenlabs.io/voices/aAsWcN5jdLdiYG7Hq0YL) (`aAsWcN5jdLdiYG7Hq0YL`) | British English, female, older; refined and a little bossy. Voice Library, 730-day notice period. The Model Market (Port Meridian). |
| Desmond | ElevenLabs | [Donovan Wilson](https://elevenlabs.io/voices/GLpuYaUYNnusyOVvP3PM) (`GLpuYaUYNnusyOVvP3PM`) | Jamaican English, male, middle-aged; warm and calm, natural rather than exaggerated. Voice Library, 730-day notice period. The Model Market's stall on Anchorage Cay: his own version of every market line, and a goodbye (`desmond.market.*`, 14 lines). |
| Lani | ElevenLabs | [Kalala – Calm & Friendly Pacific](https://elevenlabs.io/voices/sxEoZ67pB0EMoWOZZ37G) (`sxEoZ67pB0EMoWOZZ37G`) | Pacific English, female, middle-aged; warm and calm. Voice Library, 730-day notice period. The Model Market's stall on Thousand-Bough Isle: her own version of every market line, and a goodbye (`tb.lani.market.*`, 14 lines). |
| Hester | ElevenLabs | [Hollie – Warm & Clear, Friendly](https://elevenlabs.io/voices/0OwZP0QpHVtGE4KSbAqu) (`0OwZP0QpHVtGE4KSbAqu`) | Southwest England, female; warm and kind. Voice Library, 730-day notice period. Keelhaven’s master shipwright (`kh.hester.*`). |
| Dory | ElevenLabs | [Aisling](https://elevenlabs.io/voices/EfdW5L7xDpYTHDlIRmg9) (`EfdW5L7xDpYTHDlIRmg9`) | Irish, female, young; about 158 words a minute. Voice Library. Keelhaven’s yard apprentice (`kh.dory.*`, 9 lines). Chosen by Dan on 2026-10-25 (was “Louisamay – Warm and Engaging”, `t6WJWTYTryhcQnrBHdCr`). "hull" checked with speech-to-text. |
| Cass | ElevenLabs | [Ruby B – Authentic Cockney London Female](https://elevenlabs.io/voices/jUPSOpRcPt8GMPsWx5fy) (`jUPSOpRcPt8GMPsWx5fy`) | London, female, young; quick and sure. Voice Library, 365-day notice period. Keelhaven’s drydock foreman (`kh.cass.*`). |
| Barty | ElevenLabs | [Aldric Solheim](https://elevenlabs.io/voices/5GM4aByyJu1ecbL4rKms) (`5GM4aByyJu1ecbL4rKms`) | Nordic European English, male, older; deep and gentle. Voice Library, 30-day notice period. Keelhaven’s surveyor from another port (`kh.barty.*`). |
| Stroud | ElevenLabs | [Gideon – Rugged, Gravelly & Northern](https://elevenlabs.io/voices/q1h5HGdnfVxp4TXTJRNN) (`q1h5HGdnfVxp4TXTJRNN`) | Northern English, male, middle-aged; gravelly and serious. Voice Library, 730-day notice period. Keelhaven’s harbourmaster (`kh.stroud.*`). |
| Arlo | ElevenLabs | [Robert – Conversational and Helpful](https://elevenlabs.io/voices/A41HRDgOrF1mgUtjuSGM) (`A41HRDgOrF1mgUtjuSGM`) | Canadian, male, young; cheerful. Voice Library, 4015-day notice period. Keelhaven’s lock-keeper (`kh.arlo.*`). His "hull" can sound like "hole": three lines say it in a clearer way (ART_PROVENANCE.md). |
| Ottoline | ElevenLabs | [Cassandra Woodhouse](https://elevenlabs.io/voices/A3TiUH9xcSptIzvOUBnB) (`A3TiUH9xcSptIzvOUBnB`) | New Zealand English, female, middle-aged; calm and warm. Voice Library, 180-day notice period. Keeper of Keelhaven’s Gate Light and its Seal (`kh.otto.*`). |
| Bram | ElevenLabs | [Hendrik Vorster – Upbeat and Energetic](https://elevenlabs.io/voices/JbAJPrBwqw2dm8hxfklG) (`JbAJPrBwqw2dm8hxfklG`) | South African English, male, middle-aged; upbeat. Voice Library, no notice period (the owner can remove it at any time; the audio made stays). The Model Market’s stall on Keelhaven: his own version of every market line, and a goodbye (`kh.bram.market.*`, 14 lines). |
| Elspeth | ElevenLabs | [Isla Skye – Scottish, Soft, and Warm](https://elevenlabs.io/voices/TVmbglAk3F1GkiCoOq47) (`TVmbglAk3F1GkiCoOq47`) | Scottish, female, middle-aged; warm and brisk. Voice Library, 730-day notice period. Guildcrest’s reeve, at the Charter Stone (`gc.elspeth.*`, 6 lines). |
| Aidan | ElevenLabs | [Cillian – Low, Calm and Authentic](https://elevenlabs.io/voices/B5jEZPqk2OJ2vkPw3wBM) (`B5jEZPqk2OJ2vkPw3wBM`) | Irish, male, young; low and calm. Voice Library, 730-day notice period. The abbey’s porter (`gc.aidan.*`, 5 lines). |
| Brigid | ElevenLabs | [Orla – Calm & Friendly](https://elevenlabs.io/voices/WtSj8ZSBSK3JEi9xgqBG) (`WtSj8ZSBSK3JEi9xgqBG`) | Irish, female, middle-aged; calm and exact. Voice Library, 730-day notice period. The scriptorium (`gc.brigid.*`, 9 lines). |
| Ewan | Azure AI Speech | `en-GB-AlfieNeural`, −8 %, −2 st | **Stopgap** (2026-11-01): the ElevenLabs credits ran out mid-generation (they reset 2026-11-10). Planned: [Chris – Father's Legacy](https://elevenlabs.io/voices/aKQdyEogZx5VoND0oujS) (`aKQdyEogZx5VoND0oujS`), Welsh, 730-day notice. The chained library (`gc.ewan.*`, 6 lines). |
| Fergus | Azure AI Speech | `en-GB-NoahNeural`, −5 %, −3 st | **Stopgap**, as Ewan. Planned: [David – Deep, Smooth, and Scottish](https://elevenlabs.io/voices/1N4VgTBW1ZGBv5IHWRAf) (`1N4VgTBW1ZGBv5IHWRAf`), 365-day notice. The Guildhall of Journeymen (`gc.fergus.*`, 13 lines). |
| Rory | Azure AI Speech | `en-IE-ConnorNeural`, −2 % | **Stopgap**, as Ewan (the same Azure voice as Pim on Anchorage, at another rate; `en-GB-Harry:MAI-Voice-2.1` gives no word timings). Planned: [Steven – Warm Scottish English](https://elevenlabs.io/voices/wnbtVuRBgnPmE1cCeLUN) (`wnbtVuRBgnPmE1cCeLUN`), 730-day notice. The journeyman (`gc.rory.*`, 3 lines). |
| Seren | Azure AI Speech | `en-GB-Sonia:DragonHDLatestNeural`, −6 % | **Stopgap**, as Ewan. Fallback `en-GB-SoniaNeural`. Planned: [Hannah – Welsh and friendly](https://elevenlabs.io/voices/73fZMjboCm1aBVyxTbBp) (`73fZMjboCm1aBVyxTbBp`), 730-day notice. Keeper of the bell and the Seal (`gc.seren.*`, 12 lines). |
| Moira | Azure AI Speech | `en-GB-Ada:DragonHDLatestNeural` | **Stopgap**, as Ewan. Fallback `en-GB-AdaMultilingualNeural`. Planned: [Laura – Natural Scottish Conversational](https://elevenlabs.io/voices/XaIM9neHiD6g6r88bMbY) (`XaIM9neHiD6g6r88bMbY`), 730-day notice. The Model Market’s stall on Guildcrest (`gc.moira.market.*`, 14 lines). |
| Zahra | Azure AI Speech | `en-GB-BellaNeural`, +2 % | **Provisional** (2026-11-11): Sunspire Sands. Dan has not auditioned it yet. |
| Idris | Azure AI Speech | `en-NG-AbeoNeural`, −2 % | **Provisional** (2026-11-11): Sunspire Sands. Dan has not auditioned it yet. |
| Noor | Azure AI Speech | `en-GB-LibbyNeural`, −4 %, −1 st | **Provisional** (2026-11-11): Sunspire Sands. Dan has not auditioned it yet. |
| Samir | Azure AI Speech | `en-ZA-LukeNeural`, −3 % | **Provisional** (2026-11-11): Sunspire Sands. Dan has not auditioned it yet. |
| Paloma | Azure AI Speech | `en-ZA-LeahNeural`, −5 % | **Provisional** (2026-11-11): Sunspire Sands. Dan has not auditioned it yet. |
| Yusuf | Azure AI Speech | `en-KE-ChilembaNeural` | **Provisional** (2026-11-11): Sunspire Sands (the Model Market's keeper). Dan has not auditioned it yet. |
| Thea | Azure AI Speech | `en-AU-FreyaNeural`, −3 % | **Provisional** (2026-11-11): Inkwell Bluffs. Dan has not auditioned it yet. |
| Nikos | Azure AI Speech | `en-AU-WilliamNeural`, −2 % | **Provisional** (2026-11-11): Inkwell Bluffs. Dan has not auditioned it yet. |
| Calla | Azure AI Speech | `en-NZ-MollyNeural` | **Provisional** (2026-11-11): Inkwell Bluffs. Dan has not auditioned it yet. |
| Petra | Azure AI Speech | `en-AU-NatashaNeural`, +2 % | **Provisional** (2026-11-11): Inkwell Bluffs. Dan has not auditioned it yet. |
| Doran | Azure AI Speech | `en-AU-DarrenNeural`, −4 %, −1 st | **Provisional** (2026-11-11): Inkwell Bluffs. Dan has not auditioned it yet. |
| Iris | Azure AI Speech | `en-GB-MaisieNeural`, −5 % | **Provisional** (2026-11-11): Inkwell Bluffs. Dan has not auditioned it yet. |
| Kosta | Azure AI Speech | `en-NZ-MitchellNeural` | **Provisional** (2026-11-11): Inkwell Bluffs (the Model Market's keeper). Dan has not auditioned it yet. |

| Agnes | Azure AI Speech | `en-AU-AnnetteNeural`, −3 % | **Provisional** (2026-11-11): Tidewheel Caldera (Keeper Agnes Voss). Dan has not auditioned it yet. |
| Tobin | Azure AI Speech | `en-AU-DuncanNeural` | **Provisional** (2026-11-11): Tidewheel Caldera. Dan has not auditioned it yet. |
| Ansel | Azure AI Speech | `en-AU-KenNeural`, −3 %, −1 st | **Provisional** (2026-11-11): Tidewheel Caldera. Dan has not auditioned it yet. |
| Greta | Azure AI Speech | `en-AU-ElsieNeural` | **Provisional** (2026-11-11): Tidewheel Caldera. Dan has not auditioned it yet. |
| Nerys | Azure AI Speech | `en-CA-ClaraNeural` | **Provisional** (2026-11-11): Tidewheel Caldera. Dan has not auditioned it yet. |
| Silas | Azure AI Speech | `en-AU-NeilNeural`, −6 %, −2 st | **Provisional** (2026-11-11): Tidewheel Caldera. Dan has not auditioned it yet. |
| Dot | Azure AI Speech | `en-AU-CarlyNeural`, +2 % | **Provisional** (2026-11-11): Tidewheel Caldera (the Model Market's keeper). Dan has not auditioned it yet. |

**Sunspire's, Inkwell's and Tidewheel's provisional voices.** The twenty speakers new to Sunspire Sands, Inkwell
Bluffs and Tidewheel Caldera have Azure voices that nobody has auditioned (2026-11-11). To recast one, change its entry in `cast.json` and make
its lines again (`--only=<Speaker>`), then `npm run voice:lipsync` for its mouth cues (made for all of them on
2026-11-11; the tool needs Rhubarb, which `npm run toolchain` installs).

**Guildcrest's stopgap voices.** All eight of Guildcrest's ElevenLabs voices were checked with a test line on
2026-11-01, but the account's ElevenLabs credits ran out after Elspeth, Aidan and most of Brigid. Ewan, Fergus,
Rory, Seren and Moira speak with Azure voices until the credits reset (2026-11-10). To move one to its planned
voice, set `"tts": "elevenlabs"` and its `voice` in `cast.json` (drop `prosody` and `fallbackVoice`), then make
its lines again: `npx tsx tools/voice/generate.ts --course copilot-app --only=Ewan` and
`npm run voice:lipsync -- --course copilot-app`. Battle 4's four lines (`b4.*`, Juno and Wingman) are
`"pending": true` for the same reason: voice them, drop `pending`, and hook them in `course.json`
(`hooks.battles["passage-keelhaven-guildcrest"]`: `waves[].line`, `wonLine`) and Chapter 03's `voiced`.

ElevenLabs Voice Library voices can be removed by their owners. With a notice period, you can use the voice until
the period ends. Audio that you already made continues to work.

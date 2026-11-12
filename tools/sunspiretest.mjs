#!/usr/bin/env node
// End-to-end Chapter 05 run on Sunspire Sands, in the course's order (docs/specs/ISLAND-05-sunspire-sands.md
// §4): with Chapters 00-04 done (Guildcrest's Seal), by the chart to Sunspire's quay, the arrival
// flyover, and every stop by E: Lyra's gear song, Zahra's scales, Idris's camp (card A5.1), Noor and
// Mirror Beams' lap (a wrong pick first at each choice, and the mirror held on the cliff before it's
// turned to the Sunspire), Samir and the Sealed Crate's lap (a wrong tile and a wrong pick first), Paloma's
// Trial (failed once, then passed) and the Seal, and the optional assignment (Q5.A). Then the chests,
// the bottles (each read where it lies) and the starfish (each walked onto). The moves are the shared
// engine's (tools/lib/island-play.mjs).
//   node tools/sunspiretest.mjs [--base=http://127.0.0.1:5301] [--out=<dir>] [--tier=high] [--webgl]
//                                [--reduced] [--verbose] [--watch[=port]]
import { islandPlay } from './lib/island-play.mjs';

const P = await islandPlay({
  id: 'sunspire',
  name: 'Sunspire Sands',
  tool: 'sunspiretest',
  chapter: 5,
  prior: ['anchorage', 'meridian', 'thousand-bough', 'keelhaven', 'guildcrest'],
  priorCount: 38,
  wrongFirst: [
    // Mirror Beams: Settings for the list, a local server for a hosted one, the file for the question,
    // the answer for its activity, and sending the code out for comparing at home.
    ['browse', 'settings'],
    ['hosted', 'local'],
    ['general', 'file'],
    ['activity', 'said'],
    ['local', 'send'],
    // The Sealed Crate: another market, the label for the details, done for a reload, and trust for a look.
    ['market', 'other'],
    ['details', 'label'],
    ['reload', 'done'],
    ['inspect', 'trust'],
  ],
  // The mirror: held on the cliff once, then turned until its beam lands on the Sunspire.
  dial: {
    read: 'mirror',
    done: (m) => m.landed,
    what: 'the mirror never landed on the Sunspire',
    max: 12,
    turnMs: 1500,
    settleMs: 1600,
    shots: { done: 'mirror-landed', turn: 'mirror-turn' },
  },
  // Card A5.2 is put off with Later (it never blocks), the rest confirmed with I did it.
  cardLater: ['A5.2'],
  wrongOnce: ['K5.1', 'K5.4'],
  lyra: 'lyra_sunspire',
  seated: ['ss_player_a', 'ss_player_b'],
  // Yusuf stands on the booth's boards, which the walk surface under him doesn't count.
  onBoards: { yusuf: 0.33 },
  cast: 17,
});
const { fail, isle, learnState, talk, drive, after } = P;

await P.arrive();
await P.stop({ npc: 'lyra_sunspire', quest: 'Q5.1', next: 'Zahra' });
await P.stop({ npc: 'zahra', quest: 'Q5.2', next: 'Idris' });
await P.stop({ npc: 'idris', quest: 'Q5.3', next: 'Noor' });

// Noor, then Mirror Beams (P5.1) round the Mirror Court.
await talk('noor');
await drive('noor', (st) => st.quests['Q5.4'] === 'done' && !st.dialogue);
if ((await learnState()).quests['Q5.5'] !== 'signal') await after('noor', 'Noor');
if (await isle('showing', 'beam')) fail('the beam stands before Mirror Beams is walked');
await P.lap({ npc: 'noor', quest: 'Q5.5', step: 'signal', puzzle: 'mirror-beams' });
if (!P.dialWrong()) fail('the mirror’s dial never came up');
const mirror = await isle('mirror');
if (!mirror.landed) fail(`after Mirror Beams the beam isn’t on the Sunspire (${JSON.stringify(mirror)})`);
if (!(await isle('showing', 'beam'))) fail('the beam doesn’t stand after Mirror Beams');
if (!(await P.chestOpen('C5.2'))) fail('chest C5.2 didn’t open after Mirror Beams');
await after('noor', 'Samir');

// Samir, then the Sealed Crate (P5.2) round the Crate Yard.
await talk('samir');
await drive('samir', (st) => st.quests['Q5.6'] === 'done' && !st.dialogue);
if ((await learnState()).quests['Q5.7'] !== 'crate') await after('samir', 'Samir');
await P.lap({ npc: 'samir', quest: 'Q5.7', step: 'crate', puzzle: 'sealed-crate' });
if (!(await isle('showing', 'crate'))) fail('the crate doesn’t stand open after the Sealed Crate');
if (!(await P.chestOpen('C5.3'))) fail('chest C5.3 didn’t open after the Sealed Crate');
await after('samir', 'Paloma');

// Paloma's Trial and the Seal: every mirror answers and every station's lamp lights.
await P.trialAndSeal({
  npc: 'paloma',
  quest: 'Q5.8',
  lamps: ['signal:roll', 'signal:mirror', 'crate:row', 'crate:bench'],
});
await P.assignment({ npc: 'paloma', quest: 'Q5.A' });
// C5.1 is found, not given: walked up to by the caravanserai and opened with E.
await P.collect({ chests: 3, found: 'C5.1', bottles: 4, starfish: 'sf.s.' });
await P.finish();

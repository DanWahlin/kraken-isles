#!/usr/bin/env node
// End-to-end Chapter 07 run on Tidewheel Caldera, in the course's order
// (docs/specs/ISLAND-07-tidewheel-caldera.md §4): with Chapters 00-06 done (Inkwell's Seal), by the
// chart to Tidewheel's quay, the arrival flyover, and every stop by E: Lyra's drum song, Agnes's four
// gears, Tobin's bounty board (card A7.1), Ansel and the Lever's lap (a wrong tile and a wrong pick
// first), Greta and Gears & Bells' lap (a wrong pick first at each choice, and the clock ring held on
// nine before it's turned to eight), Nerys's bells (the optional stop), Silas's Trial (failed once,
// then passed), the Seal and the ending (the Long Light, watched through), and the optional
// assignment (Q7.A). Then the chests, the bottles (each read where it lies) and the starfish (each
// walked onto). The moves are the shared engine's (tools/lib/island-play.mjs).
//   node tools/tidewheeltest.mjs [--base=http://127.0.0.1:5301] [--out=<dir>] [--tier=high] [--webgl]
//                                 [--reduced] [--verbose] [--watch[=port]]
import { islandPlay } from './lib/island-play.mjs';

const P = await islandPlay({
  id: 'tidewheel',
  name: 'Tidewheel Caldera',
  tool: 'tidewheeltest',
  chapter: 7,
  prior: ['anchorage', 'meridian', 'thousand-bough', 'keelhaven', 'guildcrest', 'sunspire', 'inkwell'],
  priorCount: 56,
  wrongFirst: [
    // The Lever: a prompt that merges, the cloud switched on, Create without a run, and (below) the
    // trigger left on Daily.
    ['report', 'merge'],
    ['off', 'on'],
    ['createRun', 'create'],
    // Gears & Bells: a second automation, Hourly for Daily, both hours left, saving unchecked, a
    // schedule that needs nothing, and a summary nobody reads.
    ['edit', 'new'],
    ['daily', 'hourly'],
    // (After the clock's pair: the clock's gear card offers Manual and Daily too.)
    ['manual', 'daily'],
    ['clear', 'both'],
    ['details', 'trust'],
    ['awake', 'asleep'],
    ['tighten', 'stop'],
  ],
  // The clock ring: held where it starts (the default nine) once, then turned until it is on eight.
  dial: {
    read: 'machine',
    done: (m) => m.hour === 8 && m.settled,
    what: 'the ring never came to eight',
    max: 8,
    turnMs: 1500,
    settleMs: 900,
    shots: { done: 'ring-eight', turn: 'ring-turn' },
  },
  // Card A7.3 is put off with Later (it never blocks), the rest confirmed with I did it.
  cardLater: ['A7.3'],
  wrongOnce: ['K7.1', 'K7.4'],
  lyra: 'lyra_tidewheel',
  seated: ['tw_player_a', 'tw_player_b'],
  // Dot stands on the booth's boards, which the walk surface under her doesn't count.
  onBoards: { dot: 0.22 },
  cast: 18,
});
const { fail, isle, shot, learnState, talk, drive, after } = P;

await P.arrive();
await P.stop({ npc: 'lyra_tidewheel', quest: 'Q7.1', next: 'Agnes' });
await P.stop({ npc: 'agnes', quest: 'Q7.2', next: 'Tobin' });
await P.stop({ npc: 'tobin', quest: 'Q7.3', next: 'Ansel' });

// Ansel and the Lever.
if ((await isle('machine')).pinned) fail('the drum is pinned before the Lever is walked');
await P.lap({ npc: 'ansel', quest: 'Q7.4', step: 'lever', puzzle: 'the-lever' });
if (!(await isle('showing', 'ran'))) fail('the Works don’t show the run after the Lever');
if (!(await isle('machine')).pinned) fail('the drum isn’t pinned after the Lever');
if (!(await P.chestOpen('C7.2'))) fail('chest C7.2 didn’t open after the Lever');
await shot('lever-ran');
await after('ansel', 'Greta');

// Greta and Gears & Bells.
await P.lap({ npc: 'greta', quest: 'Q7.5', step: 'clock', puzzle: 'gears-and-bells' });
if (!P.dialWrong()) fail('the clock ring’s dial never came up');
const machine = await isle('machine');
if (machine.hour !== 8) fail(`after Gears & Bells the ring isn’t on eight (${JSON.stringify(machine)})`);
if (!(await isle('showing', 'scheduled'))) fail('the clock isn’t set after Gears & Bells');
await shot('clock-scheduled');
await after('greta', 'Silas');

// Nerys's bells: the optional stop (it never blocks the way to the Lighthouse).
await talk('nerys');
await drive('nerys', (st) => st.quests['Q7.O'] === 'done' && !st.dialogue && !st.quiz && !st.reveal);
if ((await learnState()).quests['Q7.6'] === 'done') fail('the optional stop sealed the island');
await after('nerys', 'Silas');

// Silas's Trial, the last lever (the Seal) and the ending: the Lighthouse lights, every station's lamp
// lights, and the Long Light plays through to the certificate.
let endingSeen = false;
let lightsLit = 0;
const endingWatch = (async () => {
  for (let i = 0; i < 4000 && !endingSeen; i++) {
    if ((await isle('ending'))?.playing) {
      endingSeen = true;
      for (const t of [1500, 5000, 5000, 5000, 5000, 5000, 5000]) {
        await P.page.waitForTimeout(t);
        const e = await isle('ending');
        lightsLit = Math.max(lightsLit, e?.lit ?? 0);
        if (!e?.playing) break;
        await shot('long-light');
      }
      return;
    }
    await P.page.waitForTimeout(200);
  }
})();
await P.trialAndSeal({
  npc: 'silas',
  quest: 'Q7.6',
  lamps: ['lever:drum', 'lever:log', 'clock:ring', 'clock:log'],
  ms: 600000,
});
const sawEnding = endingSeen;
endingSeen = true;
await endingWatch;
if (!sawEnding) fail('the Long Light never played');
const ending = await isle('ending');
if (!ending?.played || ending.playing) fail(`the ending isn’t over (${JSON.stringify(ending)})`);
if (lightsLit < 6) fail(`only ${lightsLit} of the chart’s eight lights were seen lit`);
await P.assignment({ npc: 'silas', quest: 'Q7.A' });
// C7.1 (by the Bandstand) and C7.3 (at the hot springs) are found, not given: walked up to and
// opened with E.
await P.collect({ chests: 3, found: ['C7.1', 'C7.3'], bottles: 5, starfish: 'sf.t.' });
await P.finish();

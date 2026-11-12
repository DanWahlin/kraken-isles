#!/usr/bin/env node
// End-to-end Chapter 06 run on Inkwell Bluffs, in the course's order (docs/specs/ISLAND-06-inkwell-bluffs.md
// §4): with Chapters 00-05 done (Sunspire's Seal), by the chart to Inkwell's quay, the arrival
// flyover, and every stop by E: Lyra's board song, Thea's stair, Nikos's desks (card A6.1), Calla and
// the Borrowed Board's lap, Petra and Two Hands' lap (a wrong tile and a wrong pick first), Doran and the
// Shared Chart's lap (a wrong pick first at each choice, and the rail's marker held on Propose before
// it's slid to Baseline), Iris's Trial (failed once, then passed) and the Seal, and the optional
// assignment (Q6.A). Then the chests, the bottles (each read where it lies) and the starfish (each
// walked onto). The moves are the shared engine's (tools/lib/island-play.mjs).
//   node tools/inkwelltest.mjs [--base=http://127.0.0.1:5301] [--out=<dir>] [--tier=high] [--webgl]
//                               [--reduced] [--verbose] [--watch[=port]]
import { islandPlay } from './lib/island-play.mjs';

const P = await islandPlay({
  id: 'inkwell',
  name: 'Inkwell Bluffs',
  tool: 'inkwelltest',
  chapter: 6,
  prior: ['anchorage', 'meridian', 'thousand-bough', 'keelhaven', 'guildcrest', 'sunspire'],
  priorCount: 47,
  wrongFirst: [
    // The Borrowed Board: installing unread, the open panel for the roll, a skills reload for the bell,
    // the package's name for the board's, and every card for one.
    ['confirm', 'blind'],
    ['installed', 'panel'],
    ['restart', 'skills'],
    ['kanban', 'package'],
    ['one', 'all'],
    // Two Hands, One Chart: a plain ask for the command, every box ticked, any answer for a matching
    // one, and the canvas's files for none.
    ['create', 'plain'],
    ['mark', 'all'],
    ['match', 'any'],
    ['none', 'canvas'],
    // The Shared Chart: a hand-written plan, the wrong approval, Implement before a baseline, a green
    // stage for a read slate, a skipped diff, and a note taken for a failure.
    ['generate', 'write'],
    ['exit', 'approve'],
    ['baseline', 'implement'],
    ['compare', 'trust'],
    ['changes', 'skip'],
    ['look', 'fail'],
  ],
  // The rail's marker: held where it starts (Propose) once (the ink washes off the chart), then slid
  // on until it is on Baseline.
  dial: {
    read: 'chart',
    done: (m) => m.marker === 2 && m.settled,
    what: 'the marker never came to Baseline',
    max: 8,
    turnMs: 1300,
    shots: { done: 'rail-baseline', wrong: 'rail-wash' },
  },
  // Card A6.2 is put off with Later (it never blocks), the rest confirmed with I did it.
  cardLater: ['A6.2'],
  wrongOnce: ['K6.1', 'K6.3'],
  lyra: 'lyra_inkwell',
  seated: ['iw_player_a', 'iw_player_b'],
  // Kosta stands on the booth's boards, which the walk surface under him doesn't count.
  onBoards: { kosta: 0.22 },
  cast: 18,
});
const { fail, isle, shot, talk, drive, after } = P;

await P.arrive();
await P.stop({ npc: 'lyra_inkwell', quest: 'Q6.1', next: 'Thea' });
await P.stop({ npc: 'thea', quest: 'Q6.2', next: 'Nikos' });
await P.stop({ npc: 'nikos', quest: 'Q6.3', next: 'Calla' });

// Calla and the Borrowed Board.
await P.lap({ npc: 'calla', quest: 'Q6.4', step: 'board', puzzle: 'borrowed-board' });
if (!(await isle('showing', 'borrowed'))) fail('the card isn’t on Ready after the Borrowed Board');
if ((await isle('chart')).card !== 'ready') fail('the guild’s card isn’t on Ready');
await shot('board-borrowed');
await after('calla', 'Petra');

// Petra and Two Hands, One Chart.
await P.lap({ npc: 'petra', quest: 'Q6.5', step: 'slate', puzzle: 'two-hands' });
if (!(await isle('showing', 'shared'))) fail('the slate isn’t marked after Two Hands, One Chart');
if (!(await P.chestOpen('C6.2'))) fail('chest C6.2 didn’t open after Two Hands');
await after('petra', 'Doran');

// Doran: the Great Chart, then the Shared Chart.
await talk('doran');
await drive('doran', (st) => st.quests['Q6.6'] === 'done' && !st.dialogue);
await after('doran', 'Doran');
await P.lap({ npc: 'doran', quest: 'Q6.7', step: 'chart', puzzle: 'shared-chart' });
if (!P.dialWrong()) fail('the rail’s dial never came up');
const chartNow = await isle('chart');
if (chartNow.slates !== 5 || chartNow.marker !== 4)
  fail(`after the Shared Chart the rack and the rail aren’t full (${JSON.stringify(chartNow)})`);
if (!(await isle('showing', 'inked'))) fail('the Great Chart isn’t inked after the Shared Chart');
await shot('chart-inked');
if (!(await P.chestOpen('C6.3'))) fail('chest C6.3 didn’t open after the Shared Chart');
await after('doran', 'Iris');

// Iris's Trial and the Seal: the Dome lights and every station's lamp lights.
await P.trialAndSeal({
  npc: 'iris',
  quest: 'Q6.8',
  lamps: ['board:notice', 'slate:easel', 'chart:rail', 'chart:soundings'],
});
await P.assignment({ npc: 'iris', quest: 'Q6.A' });
// C6.1 is found, not given: walked up to on the taverna's terrace and opened with E.
await P.collect({ chests: 3, found: 'C6.1', bottles: 4, starfish: 'sf.i.' });
await P.finish();

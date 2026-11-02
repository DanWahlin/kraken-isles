// Guildcrest (Chapter 04 · Skills & Custom Agents), a tour of the island in play: the arrival over the
// loch, Lyra's song chart (a tune played from memory, then from the chart: a skill), a lap of the
// Pattern Book round the cloister (finding the skill, reading its frontmatter, a wrong pick that sends
// you back), the Journeyman's Toolbelt in the guildhall yard (a custom agent's profile and its tools),
// and Abbess Seren's Toolbelt Trial and the Seal: the bell, the swifts, the guilds' banners unfurling by
// the mills. Steps between are done off camera. About two minutes (long stretches trimmed).
import { labelsShown, questsDone } from '../game.mjs';
import { skipTalk } from '../lib.mjs';

const PRIOR = [
  ...['Q0.2', 'Q0.3', 'Q0.4', 'Q0.5', 'Q0.6', 'Q0.7', 'Q0.8', 'Q0.9', 'Q0.10', 'Q0.11'],
  ...['Q1.1', 'Q1.2', 'Q1.3', 'Q1.4', 'Q1.5', 'Q1.6', 'Q1.7', 'Q1.8', 'Q1.A'],
  ...['Q2.1', 'Q2.2', 'Q2.3', 'Q2.4', 'Q2.5', 'Q2.6', 'Q2.7', 'Q2.8', 'Q2.9', 'Q2.A'],
  ...['Q3.1', 'Q3.2', 'Q3.3', 'Q3.4', 'Q3.5', 'Q3.6', 'Q3.7', 'Q3.8', 'Q3.9', 'Q3.10', 'Q3.A', 'Q3.B'],
];
/** A circuit card's wrong picks, tried once before the right one ([right, wrong]). */
const WRONG_FIRST = [
  ['customize', 'picker'],
  ['reload', 'main'],
  ['read', 'edit'],
];

const gc = (api, js) =>
  api.S((code) => new Function('d', `return ${code}`)(window.__dev.session().debug.island('guildcrest')), js);
const P = (api, name, k) =>
  api.S(([n, k]) => window.__dev.session().debug.puzzle(n)?.[k]?.() ?? null, [name, k]);

/**
 * Walks up to an NPC and opens the talk with them (by id: near the inn's porch the prompt can name
 * Callum or Isla instead of Lyra), once nothing else is talking.
 */
async function talk(api, spot, id) {
  await api.walkTo(spot.x, spot.z, { tol: 0.45 });
  await api.face(spot.npc.x, spot.npc.z);
  // The welcome ignores a talk: wait it out, then ask again until the talk opens.
  for (let t0 = Date.now(); Date.now() - t0 < 60_000;) {
    const busy = await api.S(() => window.__dev.state().welcome || window.__dev.state().dialogue);
    if (!busy) {
      await api.S((n) => window.__dev.session().debug.talk(n), id);
      await api.pause(1200);
      if (await api.S(() => window.__dev.state().dialogue && !window.__dev.state().welcome)) return;
    } else await api.pause(500);
  }
  api.log(`no talk with ${id}`);
}

/** The island's choice card, if one is up: read it, then pick (a wrong one first where there is one). */
async function choose(api, tried) {
  const v = await gc(api, 'd.card()');
  if (!v?.open || v.busy) return false;
  const ids = v.options.map((o) => o.id);
  const free = ids.filter((id) => !id.startsWith('·leave') && !id.startsWith('·skip'));
  if (!free.length) return false;
  let pick = free.find((id) => !v.options.find((o) => o.id === id).tried) ?? free[0];
  const pair = WRONG_FIRST.find(([r, w]) => ids.includes(r) && ids.includes(w));
  if (pair) pick = tried.has(pair[1]) ? pair[0] : pair[1];
  else {
    const r = WRONG_FIRST.find(([r]) => ids.includes(r));
    if (r) pick = r[0];
  }
  tried.add(pick);
  await api.pause(3000);
  await api.press(`Digit${ids.indexOf(pick) + 1}`);
  await api.pause(1800);
  return true;
}

/** Talks it through: choice cards, quizzes, cards and lines, until `until(state)`. */
async function drive(api, tried, until, timeout = 180_000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await choose(api, tried)) continue;
    const s = await api.learn();
    if (until(s)) return s;
    if (s.quiz) await api.answerQuiz({});
    else if (s.appTask || s.card) await api.answerCard(s, { readMs: 2600 });
    else if (s.reveal || s.banner) {
      await api.pause(2400);
      await api.press('KeyE');
      await api.pause(600);
    } else await api.pause(250);
  }
  api.log('drive timed out');
  return api.learn();
}

/** A circuit's lap: walk to each station the compass points at (long walks cut), E, its card. */
async function lap(api, name, tried, keep) {
  for (let guard = 0, n = 0; guard < 30; guard++) {
    const st = await P(api, name, 'station');
    if (!st) break;
    let spot = null;
    for (let w = 0; w < 30 && !spot; w++) {
      spot = (await P(api, name, 'spots')).find((x) => x.id.endsWith(`:${st.at}`) && x.on);
      if (!spot) await api.pause(400);
    }
    if (!spot) break;
    const shown = n++ < keep;
    const go = async () => {
      const walked = await api.walkTo(spot.x, spot.z, { tol: 0.6, timeout: 25_000 });
      if (!walked || !(await api.prompt())) await api.teleport(spot.x, spot.z, undefined, spot.y + 0.3);
      await api.pause(500);
      await api.interact('', { timeout: 4000, beat: 300 });
      await api.pause(800);
      for (let k = 0; k < 120 && (await P(api, name, 'open')); k++)
        if (!(await choose(api, tried))) await api.pause(300);
    };
    if (!shown) return;
    api.mark(`${name} ${st.at}`);
    await api.cutWhile(go, { head: 14_000, tail: 5_000 });
  }
}

export default {
  id: 'guildcrest',
  order: 12,
  code: 'Island 04',
  title: 'Guildcrest',
  island: 'Guildcrest',
  who: 'the guild town, the abbey and the ridge',
  subtitle:
    'Write your craft down as a skill, hire a specialist whose toolbelt is the restriction, and earn the Seal.',
  chapter: 'Course Chapter 04 · Skills & Custom Agents',
  flags: ['guildcrest'],
  time: 16.5,
  titleFrame: 6,

  async setup(page, api) {
    await questsDone(api, PRIOR);
    await labelsShown(api);
    const q = await api.S(() => window.__dev.session().islandQuay('guildcrest'));
    await api.S((q) => window.__dev.session().travel(q.x, q.z, q.heading), q);
    await page.waitForFunction(() => window.__dev.session().island === 'guildcrest', null, {
      timeout: 120_000,
    });
  },

  async play(page, api) {
    const tried = new Set();
    // The arrival over the loch (its middle trimmed), then Juno's welcome.
    api.mark('arrival');
    await api.cutWhile(
      () =>
        api.waitFor(
          () => window.__dev.state().mode === 'walk' && !window.__dev.state().welcome,
          null,
          60_000,
        ),
      { head: 12_000, tail: 2_000 },
    );
    await api.cut(() => skipTalk(page, 30_000));
    // Lyra's song chart on the inn's porch.
    const lyra = await api.cut(() => api.approachSpot('lyra_guild', { back: 3 }));
    await talk(api, lyra, 'lyra_guild');
    api.mark('Lyra');
    await api.cutWhile(() => drive(api, tried, (s) => s.quests['Q4.1'] === 'done' && !s.dialogue), {
      head: 28_000,
      tail: 3_000,
    });
    // Off camera: the Charter Stone and Aidan's carrel.
    await api.cut(async () => {
      await questsDone(api, ['Q4.2', 'Q4.3']);
      await api.pause(600);
    });
    // Brigid and the Pattern Book round the cloister: one station shown, the rest off camera.
    const brigid = await api.cut(() => api.approachSpot('brigid', { back: 3 }));
    await talk(api, brigid, 'brigid');
    api.mark('Brigid');
    await api.cutWhile(() => drive(api, tried, (s) => s.quests['Q4.4'] === 'book' && !s.dialogue), {
      head: 8_000,
      tail: 2_000,
    });
    await lap(api, 'pattern-book', tried, 1);
    // The rest of the lap off camera.
    await api.cut(async () => {
      await questsDone(api, ['Q4.4']);
      await api.pause(600);
    });
    // Fergus and the Journeyman's Toolbelt in the yard: its first station.
    await api.cut(async () => {
      await questsDone(api, ['Q4.5', 'Q4.6']);
      await api.pause(600);
    });
    const fergus = await api.cut(() => api.approachSpot('fergus', { back: 3 }));
    await talk(api, fergus, 'fergus');
    api.mark('Fergus');
    await api.cutWhile(() => drive(api, tried, (s) => s.quests['Q4.7'] === 'belt' && !s.dialogue), {
      head: 6_000,
      tail: 2_000,
    });
    await lap(api, 'toolbelt', tried, 1);
    await api.cut(async () => {
      await questsDone(api, ['Q4.7']);
      await api.pause(600);
    });
    // Abbess Seren's Toolbelt Trial (its middle trimmed) and the Seal.
    const seren = await api.cut(() => api.approachSpot('seren', { back: 3 }));
    await talk(api, seren, 'seren');
    api.mark('Trial');
    await api.cutWhile(
      async () => {
        const t0 = Date.now();
        while (Date.now() - t0 < 240_000) {
          if (await gc(api, 'd.sealing()')) return;
          const s = await api.learn();
          if (s.quiz) await api.answerQuiz({});
          else if (s.appTask || s.card) await api.answerCard(s, { readMs: 2400 });
          else if (s.reveal || s.banner) {
            await api.pause(2000);
            await api.press('KeyE');
          } else await api.pause(250);
        }
      },
      { head: 18_000, tail: 4_000 },
    );
    api.mark('Seal');
    await api.waitFor(() => !window.__dev.session().debug.island('guildcrest').sealing(), null, 40_000);
    api.mark('sealed');
    await drive(
      api,
      tried,
      (s) => s.quests['Q4.8'] === 'done' && !s.dialogue && !s.quiz && !s.reveal,
      60_000,
    );
    await api.pause(2500);
  },
};

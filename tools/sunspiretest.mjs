#!/usr/bin/env node
// End-to-end Chapter 05 run on Sunspire Sands, in the course's order (docs/specs/ISLAND-05-sunspire-sands.md
// §4): with Chapters 00-04 done (Guildcrest's Seal), by the chart to Sunspire's quay, the arrival
// flyover, and every stop by E: Lyra's gear song, Zahra's scales, Idris's camp (card A5.1), Noor and
// Mirror Beams' lap (a wrong pick first at each choice, and the mirror held on the cliff before it's
// turned to the Sunspire), Samir and the Sealed Crate's lap (a wrong tile and a wrong pick first), Paloma's
// Trial (failed once, then passed) and the Seal, and the optional assignment (Q5.A). Then the chests,
// the bottles (each read where it lies) and the starfish (each walked onto).
// Each NPC is walked up to from a free side and talked to with E; quizzes are answered, cards confirmed.
// Fails on any console error, a missing beat, a quest out of order, a cast member off the ground or a
// hitch after warm-up.
//   node tools/sunspiretest.mjs [--base=http://127.0.0.1:5301] [--out=<dir>] [--tier=high] [--webgl]
//                               [--reduced] [--verbose]
import { mkdirSync } from 'node:fs';
import { collectLogs, launchChrome, parseFlags } from './lib/browser.mjs';
import { answerCard, cardOpen, cardState } from './lib/learning-cards.mjs';

const opt = parseFlags();
const base = opt.base || 'http://localhost:5301';
const out = opt.out || 'tmp/shots/sunspire';
mkdirSync(out, { recursive: true });
const tag = `${opt.tier || 'auto'}-${opt.webgl ? 'gl' : 'gpu'}`;
const url =
  `${base}/devpages/play.html?auto&quiet&sunspire&shot` +
  `${opt.webgl ? '&webgl' : ''}${opt.tier ? `&tier=${opt.tier}` : ''}`;

const browser = await launchChrome({ autoplay: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
if (opt.reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
const logs = collectLogs(page, { types: ['error'] });
const fail = (m) => {
  logs.push(`[sunspiretest] ${m}`);
  if (opt.verbose) console.log(`FAIL ${m}`);
};
const note = (m) => opt.verbose && console.log(`${new Date().toISOString().slice(11, 19)} ${m}`);
await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction(() => window.__dev?.ready === true && window.__dev.session(), null, {
  timeout: 180000,
});
await page.waitForTimeout(1500);

const shots = [];
const shot = async (name) => {
  const path = `${out}/${tag}-${String(shots.length).padStart(2, '0')}-${name}.png`;
  await page.screenshot({ path });
  shots.push(path);
};
const S = (f, a) => page.evaluate(f, a);
/** The session's debug hooks, by an expression on `d` (`window.__dev.session().debug`). */
const D = (js) => page.evaluate(`(() => { const d = window.__dev.session().debug; return ${js}; })()`);
const tap = (code) => S((c) => window.__dev.tap(c), code);
const ss = (fn, ...args) =>
  S(
    ([fn, args]) => {
      const d = window.__dev.session().debug.island('sunspire');
      const v = d?.[fn];
      return typeof v === 'function' ? v(...args) : v;
    },
    [fn, args],
  );
const learnState = () =>
  S(() => {
    const l = window.__dev.learn.getState();
    const st = window.__dev.state();
    return {
      quiz: l.quiz
        ? { id: l.quiz.quiz.id, type: l.quiz.quiz.type, correct: l.quiz.last?.correct ?? null }
        : null,
      reveal: l.reveal?.page.id ?? null,
      banner: l.banner?.title ?? null,
      dialogue: st.dialogue,
      welcome: st.welcome,
      mode: st.mode,
      quests: window.__dev.learn.progress.data.quests,
      pages: l.pages.length,
      doubloons: l.doubloons,
    };
  });

async function clickHotspot() {
  const box = await S(() => {
    const quiz = window.__dev.learn.getState().quiz.quiz;
    const t = quiz.targets.find((x) => x.correct);
    const frame = document.querySelector('.ci-hotspot-frame').getBoundingClientRect();
    return {
      x: frame.left + frame.width * (t.rect[0] + t.rect[2] / 2),
      y: frame.top + frame.height * (t.rect[1] + t.rect[3] / 2),
    };
  });
  await page.mouse.click(box.x, box.y);
}

/**
 * A circuit station's choice card: a wrong pick first where there is one, so each way back is played
 * too. Pairs of [right, wrong] ids; the options show shuffled, so picks go by id (keys 1-9 as shown).
 */
const WRONG_FIRST = [
  // Mirror Beams: Settings for Customize, a local server for a hosted one, the whole file for the
  // general question, what the agent said for its tool activity, and sending the file to compare it.
  ['browse', 'settings'],
  ['hosted', 'local'],
  ['general', 'file'],
  ['activity', 'said'],
  ['local', 'send'],
  // The Sealed Crate: another catalog for the marketplace, the label for the details, a finished
  // install for the reload, and trusting the skill's proposal.
  ['market', 'other'],
  ['details', 'label'],
  ['reload', 'done'],
  ['inspect', 'trust'],
];
const cardTried = new Set();
/** Each choice card's options, in the order shown, and where the right one was (the shuffle's check). */
const cardOrders = [];
/** The mirror was held on a wrong landmark once before it was turned to the Sunspire. */
let dialWrong = false;
let dialTurns = 0;
const seen = new Set();
async function answerChoice() {
  const v = await ss('card');
  if (!v?.open || v.busy) return false;
  const ids = v.options.map((o) => o.id);
  const key = `${v.title}|${[...ids].sort().join(',')}`;
  if (!seen.has(`card-${key}`)) {
    seen.add(`card-${key}`);
    await page.waitForTimeout(400);
    await shot(`card-${v.title.replace(/[^\w]+/g, '_').slice(0, 24)}`);
    const right = WRONG_FIRST.find(([r, w]) => ids.includes(r) && ids.includes(w))?.[0];
    if (right) cardOrders.push(ids.indexOf(right));
  }
  // The mirror's dial: held where it starts (the cliff) once, then turned on until its beam lands.
  if (ids.includes('·set')) {
    const m = await ss('mirror');
    let pick = '·turn-on';
    if (m.landed) {
      // The beam's on the Sunspire: a look at its answer before the mirror's held there.
      await page.waitForTimeout(1600);
      await shot('mirror-landed');
      pick = '·set';
    } else if (!dialWrong) {
      dialWrong = true;
      pick = '·set';
    } else if (++dialTurns > 12) {
      fail('the mirror never landed on the Sunspire in twelve turns');
      pick = '·leave';
    }
    await tap(`Digit${ids.indexOf(pick) + 1}`);
    await page.waitForTimeout(pick === '·turn-on' ? 1500 : 300);
    if (pick === '·turn-on') await shot(`mirror-turn-${dialTurns}`);
    return true;
  }
  // Never the circuit's own Leave or Skip (a demo plays out by itself).
  const free = ids.filter((id) => !id.startsWith('·leave') && !id.startsWith('·skip'));
  if (!free.length) return false;
  let pick = free.find((id) => !v.options.find((o) => o.id === id).tried) ?? free[0];
  const pair = WRONG_FIRST.find(([r, w]) => ids.includes(r) && ids.includes(w));
  if (pair) pick = cardTried.has(`${key}|${pair[1]}`) ? pair[0] : pair[1];
  else {
    const r = WRONG_FIRST.find(([r]) => ids.includes(r));
    if (r) pick = r[0];
  }
  cardTried.add(`${key}|${pick}`);
  // Through the card's own keys (1-9), as a player would.
  await tap(`Digit${ids.indexOf(pick) + 1}`);
  return true;
}

/** Where each one-answer quiz's right answer showed (the answers shuffle per quiz and voyage). */
const quizOrders = [];
// Card A5.2 is put off with Later (it never blocks), the rest confirmed with I did it.
const cardPlan = { later: ['A5.2'] };
/** Quizzes answered wrong once before the right answer. */
const WRONG_ONCE = new Set(['K5.1', 'K5.4']);
const wrongDone = new Set();
/** The Trial's round (1: three wrong answers, so it's failed and retried; 2: passed). */
let trialRound = 0;
let lastQuiz = null;
const wrongFirst = (id) => WRONG_ONCE.has(id) || (trialRound === 1 && /^T5\.[123]$/.test(id));
/** Drives dialogue, quizzes, reveals, cards and set pieces until `done(state)`. */
async function drive(label, done, ms = 180000) {
  const t0 = Date.now();
  note(`drive ${label}`);
  while (Date.now() - t0 < ms) {
    const card = await page.evaluate(cardState);
    if (cardOpen(card)) {
      await answerCard(page, card, { shot, fail, seen, plan: cardPlan });
      await page.waitForTimeout(300);
      continue;
    }
    if (await answerChoice()) {
      await page.waitForTimeout(450);
      continue;
    }
    const s = await learnState();
    if (done(s)) return s;
    if (s.quiz) {
      if (s.quiz.id === 'T5.1' && lastQuiz !== 'T5.1') trialRound++;
      lastQuiz = s.quiz.id;
      // The first try: three wrong answers, then step away from the Trial (it's offered again).
      if (trialRound === 1 && s.quiz.id === 'T5.4') {
        await shot('trial-leave');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(800);
        continue;
      }
      if (!seen.has(s.quiz.id)) {
        seen.add(s.quiz.id);
        await page.waitForTimeout(600);
        await shot(`quiz-${s.quiz.id}`);
        if (s.quiz.type === 'mc' || s.quiz.type === 'scenario') {
          const at = await S(async () => {
            const q = window.__dev.learn.getState().quiz.quiz;
            const { quizOptions } = await import('/src/learn/option-order.ts');
            const shown = [...document.querySelectorAll('.ci-quiz .ci-options .ci-option span')].map((e) =>
              e.textContent.trim(),
            );
            const order = quizOptions(q);
            const right = order.findIndex((o) => o.id === q.answer);
            return { right, agrees: shown.length === order.length };
          });
          if (!at.agrees) fail(`quiz ${s.quiz.id}: the panel's options don't match the shuffled order`);
          quizOrders.push(at.right);
        }
      }
      if (s.quiz.correct) await tap('KeyE');
      else if (s.quiz.type === 'hotspot') await clickHotspot();
      else if (
        wrongFirst(s.quiz.id) &&
        !wrongDone.has(`${s.quiz.id}@${trialRound}`) &&
        (s.quiz.type === 'mc' || s.quiz.type === 'scenario')
      ) {
        // One wrong pick first: a wrong option, by its button.
        wrongDone.add(`${s.quiz.id}@${trialRound}`);
        const clicked = await S(async () => {
          const q = window.__dev.learn.getState().quiz.quiz;
          const { quizOptions } = await import('/src/learn/option-order.ts');
          const i = quizOptions(q).findIndex((o) => o.id !== q.answer);
          const b = document.querySelectorAll('.ci-quiz .ci-options .ci-option')[i];
          b?.click();
          return !!b;
        });
        if (!clicked) await S(() => window.__dev.answer());
        await page.waitForTimeout(900);
        await shot(`quiz-${s.quiz.id}-wrong`);
      } else await S(() => window.__dev.answer());
    } else if (s.reveal || s.banner) {
      const key = `reveal-${s.reveal ?? s.banner}`;
      if (!seen.has(key)) {
        seen.add(key);
        await page.waitForTimeout(600);
        await shot(key.replace(/[^\w.-]+/g, '_'));
      }
      await tap('KeyE');
    } else if (s.dialogue) await tap('KeyE');
    await page.waitForTimeout(350);
  }
  fail(`${label}: timed out`);
  return learnState();
}

/** Walks up to an NPC from wherever there's room, checks the prompt, and presses E. */
async function talk(id) {
  await page
    .waitForFunction(() => !window.__dev.state().dialogue && !window.__dev.state().welcome, null, {
      timeout: 30000,
    })
    .catch(() => fail(`still talking before ${id}`));
  const n = await S(
    (id) =>
      window.__dev
        .session()
        .debug.cast()
        .find((v) => v.id === id) ?? null,
    id,
  );
  if (!n) return fail(`no NPC ${id}`);
  if (Math.abs(n.y - n.ground) > 0.15) fail(`${id} stands ${(n.y - n.ground).toFixed(2)} m off the ground`);
  let ok = false;
  for (const reach of [2.0, 2.8]) {
    if (ok) break;
    for (const k of [0, 1, -1, 2, -2, 3, -3, 4]) {
      const a = n.h + (k * Math.PI) / 4;
      const at = await S(
        ([x, z, h, y]) => {
          window.__dev.session().debug.teleport(x, z, h, y);
          return window.__dev.state();
        },
        [n.x + Math.sin(a) * reach, n.z + Math.cos(a) * reach, a + Math.PI, n.y + 0.3],
      );
      await page.waitForTimeout(250);
      const prompt = await S(() => document.querySelector('.hud-prompt.show')?.textContent ?? null);
      const short = n.name.split(' ').at(-2) ?? n.name.split(' ')[0];
      if (
        Math.abs(at.y - n.y) < 1 &&
        prompt?.includes('Talk to') &&
        (prompt.includes(n.name.split(' ')[0]) || prompt.includes(short))
      ) {
        ok = true;
        break;
      }
    }
  }
  await S((a) => window.__dev.look(a, 0.16), n.h + Math.PI + 0.35);
  await page.waitForTimeout(700);
  await shot(`talk-${id}`);
  if (ok) await tap('KeyE');
  else {
    fail(`can't get a talk prompt at ${id} from any side`);
    await S((id) => window.__dev.session().debug.talk(id), id);
  }
  const started = await page
    .waitForFunction(() => window.__dev.state().dialogue || window.__dev.learn.getState().quiz, null, {
      timeout: 4000,
    })
    .then(() => true)
    .catch(() => false);
  if (!started) {
    fail(`E at ${id} didn't start a conversation`);
    await S((id) => window.__dev.session().debug.talk(id), id);
  }
  await page.waitForTimeout(1300);
  await shot(`stop-${id}`);
}
/** The compass's gold marker label (its next stop). */
const compassLabel = () => S(() => document.querySelector('.hud-compass-label')?.textContent ?? null);

/**
 * Plays a circuit's lap whose quest is `quest`: walks to the station that waits (the compass points
 * at it), presses E, answers its card (a wrong pick first where there is one), and goes on until the
 * lap's closing script is through and its quest is done.
 */
async function circuit(name, quest) {
  const P = (k) => S(([n, k]) => window.__dev.session().debug.puzzle(n)?.[k]?.() ?? null, [name, k]);
  for (let guard = 0; guard < 40; guard++) {
    const st = await P('station');
    if (!st) break;
    const c = await compassLabel();
    if (!c) fail(`${name} ${st.at}: no compass target`);
    // A line still playing holds the next station back a moment.
    let spot = null;
    for (let w = 0; w < 30 && !spot; w++) {
      spot = (await P('spots')).find((x) => x.id.endsWith(`:${st.at}`) && x.on);
      if (!spot) {
        if ((await learnState()).dialogue) await tap('KeyE');
        await page.waitForTimeout(400);
      }
    }
    if (!spot) {
      fail(`${name} ${st.at}: no usable station`);
      break;
    }
    await S(
      ([x, z, y]) => window.__dev.session().debug.teleport(x, z, undefined, y + 0.3),
      [spot.x, spot.z, spot.y],
    );
    const prompt = await page
      .waitForFunction(() => document.querySelector('.hud-prompt.show')?.textContent ?? null, null, {
        timeout: 8000,
      })
      .then((h) => h.jsonValue())
      .catch(() => null);
    if (!prompt) fail(`${name} ${st.at}: no prompt at the station`);
    await tap('KeyE');
    await page.waitForTimeout(600);
    const key = `${name}-${st.at}-${st.kind}`;
    if (!seen.has(key)) {
      seen.add(key);
      await page.waitForTimeout(900);
      await shot(key);
    }
    for (let k = 0; k < 200 && (await P('open')); k++) {
      if (!(await answerChoice())) await page.waitForTimeout(300);
      else await page.waitForTimeout(500);
    }
  }
  await drive(`${name} close`, (st) => st.quests[quest] === 'done' && !st.dialogue && !st.quiz && !st.reveal);
  await page.waitForTimeout(1200);
  await shot(`${name}-${quest}-done`);
}

/** Lets the welcome or any talk play out (E through it). */
async function calm(label, ms = 60000) {
  await drive(label, (s) => !s.dialogue && !s.welcome, ms);
}

// ---- Chapters 00-04 done: Guildcrest's Seal is yours ----
const PRIOR = await S(async () => {
  const { islandQuestList } = await import('/src/course/active.ts');
  return ['anchorage', 'meridian', 'thousand-bough', 'keelhaven', 'guildcrest'].flatMap((i) =>
    islandQuestList(i).map((q) => q.id),
  );
});
if (PRIOR.length < 38) fail(`only ${PRIOR.length} quests before Sunspire`);
await S((ids) => {
  const d = window.__dev.session().debug;
  for (const id of ids) d.quest(id, 'done');
}, PRIOR);
await page.waitForTimeout(800);

// ---- By the chart to Sunspire's quay ----
const quay = await S(() => window.__dev.session().islandQuay('sunspire'));
if (!quay) fail('Sunspire isn’t open after Guildcrest’s Seal');
else {
  await S((q) => window.__dev.session().travel(q.x, q.z, q.heading), quay);
  await page.waitForFunction(() => window.__dev.session().island === 'sunspire', null, { timeout: 120000 });
  await page.waitForTimeout(2500);
}

// ---- The arrival flyover ----
for (const t of [1.5, 8, 13, 18, 23]) {
  await S((t) => window.__dev.session().debug.holdArrival(t), t);
  await page.waitForTimeout(900);
  if ((await D('d.arrival()?.phase')) !== 'flying') break;
  await shot(`arrival-${t}`);
}
await S(() => window.__dev.session().debug.holdArrival(null));
if ((await D('d.arrival()?.phase')) === 'flying') await D('d.skipArrival()');
await page
  .waitForFunction(
    () =>
      window.__dev
        .session()
        .debug.cast()
        .some((n) => n.id === 'lyra_sunspire'),
    null,
    { timeout: 90000 },
  )
  .catch(() => fail('Sunspire’s cast never came'));
await page
  .waitForFunction(() => window.__dev.state().dialogue, null, { timeout: 8000 })
  .catch(() => fail('no Sunspire welcome'));
await page.waitForTimeout(1200);
await shot('welcome');
await calm('welcome');
await page.waitForTimeout(1200);
await shot('ashore');
const tracker = await S(() => window.__dev.learn.getState().tracker);
if (tracker?.island !== 'Sunspire Sands') fail(`tracker shows ${tracker?.island}`);
if (!(await compassLabel())?.includes('Lyra')) fail(`compass points at ${await compassLabel()}, not Lyra`);

// ---- The cast stands on its ground (the sitters on their seat blocks, Yusuf on his booth's floor) ----
const SEATED = new Set(['ss_player_a', 'ss_player_b']);
/** Yusuf stands on the booth's boards, which the walk surface under him doesn't count. */
const ON_BOARDS = { yusuf: 0.33 };
const cast = await D('d.cast()');
note(`cast: ${cast.length}`);
if (cast.length < 17) fail(`${cast.length} cast on Sunspire, not 17`);
for (const n of cast) {
  const off = n.y - n.ground - (ON_BOARDS[n.id] ?? 0);
  // A seat block is a solid, so the surface under a sitter is the block's own top.
  if (SEATED.has(n.id)) {
    if (off < -0.05 || off > 0.8) fail(`${n.id} sits ${off.toFixed(2)} m off its seat`);
  } else if (Math.abs(off) > 0.08) fail(`${n.id} stands ${off.toFixed(2)} m off the ground`);
}

// ---- The stops, in the course's order ----
const after = async (npc, next) => {
  await page.waitForTimeout(1200);
  await shot(`after-${npc}`);
  const c = await compassLabel();
  if (next && !c?.includes(next)) fail(`after ${npc} the compass points at ${c}, not ${next}`);
};
for (const s of [
  { npc: 'lyra_sunspire', quest: 'Q5.1', next: 'Zahra' },
  { npc: 'zahra', quest: 'Q5.2', next: 'Idris' },
  { npc: 'idris', quest: 'Q5.3', next: 'Noor' },
]) {
  await talk(s.npc);
  await drive(s.npc, (st) => st.quests[s.quest] === 'done' && !st.dialogue);
  await after(s.npc, s.next);
}

// Noor, then Mirror Beams (P5.1) round the Mirror Court.
await talk('noor');
await drive('noor', (st) => st.quests['Q5.4'] === 'done' && !st.dialogue);
if ((await learnState()).quests['Q5.5'] !== 'signal') {
  await after('noor', 'Noor');
  await talk('noor');
  await drive('noor signal', (st) => st.quests['Q5.5'] === 'signal' && !st.dialogue);
}
if (await ss('showing', 'beam')) fail('the beam stands before Mirror Beams is walked');
await circuit('mirror-beams', 'Q5.5');
if ((await learnState()).quests['Q5.5'] !== 'done') await talk('noor');
await drive('noor solved', (st) => st.quests['Q5.5'] === 'done' && !st.dialogue && !st.quiz && !st.reveal);
if (!dialWrong) fail('the mirror’s dial never came up');
const mirror = await ss('mirror');
if (!mirror.landed) fail(`after Mirror Beams the beam isn’t on the Sunspire (${JSON.stringify(mirror)})`);
if (!(await ss('showing', 'beam'))) fail('the beam doesn’t stand after Mirror Beams');
if (!(await S(() => window.__dev.learn.isChestOpen('C5.2'))))
  fail('chest C5.2 didn’t open after Mirror Beams');
await after('noor', 'Samir');

// Samir, then the Sealed Crate (P5.2) in the Crate Yard.
await talk('samir');
await drive('samir', (st) => st.quests['Q5.6'] === 'done' && !st.dialogue);
if ((await learnState()).quests['Q5.7'] !== 'crate') {
  await after('samir', 'Samir');
  await talk('samir');
  await drive('samir crate', (st) => st.quests['Q5.7'] === 'crate' && !st.dialogue);
}
await circuit('sealed-crate', 'Q5.7');
if ((await learnState()).quests['Q5.7'] !== 'done') await talk('samir');
await drive('samir solved', (st) => st.quests['Q5.7'] === 'done' && !st.dialogue && !st.quiz && !st.reveal);
if (!(await ss('showing', 'crate'))) fail('the crate doesn’t stand open after the Sealed Crate');
if (!(await S(() => window.__dev.learn.isChestOpen('C5.3'))))
  fail('chest C5.3 didn’t open after the Sealed Crate');
await after('samir', 'Paloma');

// Paloma's Trial and the Seal: the Sunspire's mirror answers and every station's lamp lights.
await talk('paloma');
// The first try: three wrong answers, then away from it: the Trial isn't passed yet, and Paloma offers it again.
await drive(
  'trial 1',
  (st) => trialRound >= 1 && !st.quiz && !st.dialogue && !st.reveal && !st.banner,
  240000,
);
if ((await learnState()).quests['Q5.8'] === 'done') fail('the Trial passed with three wrong answers');
await shot('trial-failed');
let sealSeen = false;
const sealWatch = (async () => {
  for (let i = 0; i < 2000 && !sealSeen; i++) {
    if (await ss('sealing')) {
      sealSeen = true;
      for (const t of [900, 1500, 2600]) {
        await page.waitForTimeout(t);
        await shot('seal');
      }
      return;
    }
    await page.waitForTimeout(150);
  }
})();
await talk('paloma');
await drive(
  'trial 2',
  (st) => st.quests['Q5.8'] === 'done' && !st.dialogue && !st.quiz && !st.reveal,
  300000,
);
if (trialRound !== 2) fail(`the Trial ran ${trialRound} times, not 2`);
const sealShot = sealSeen;
sealSeen = true;
await sealWatch;
if (!sealShot) fail('the Seal’s moment never played');
await shot('sealed');
if (!(await ss('showing', 'sealed'))) fail('the island isn’t dressed for its Seal');
for (const key of ['signal:roll', 'signal:mirror', 'crate:row', 'crate:bench'])
  if ((await ss('lamp', key)) !== 'ready') fail(`lamp ${key} isn’t lit after the Seal`);

// The optional assignment (Q5.A), from Paloma and back to her.
for (let round = 0; round < 3 && (await learnState()).quests['Q5.A'] !== 'done'; round++) {
  await talk('paloma');
  await drive(`paloma Q5.A`, (st) => !st.dialogue && !st.quiz && !st.reveal, 120000);
  await page.waitForTimeout(800);
}
if ((await learnState()).quests['Q5.A'] !== 'done') fail('Q5.A isn’t done after talking to Paloma');

// ---- Chests, bottles and starfish ----
const chests = await D("d.chests().filter((c) => c.id.startsWith('C5.'))");
if (chests.length !== 3) fail(`${chests.length} chests on Sunspire, not 3`);
// C5.1 is found, not given: walked up to by the caravanserai and opened with E.
{
  const c = chests.find((x) => x.id === 'C5.1');
  if (c && !c.opened) {
    let opened = false;
    for (const a of [c.h, c.h + Math.PI / 2, c.h - Math.PI / 2, c.h + Math.PI]) {
      await S(
        ([x, z, h]) => window.__dev.session().debug.teleport(x, z, h),
        [c.x + Math.sin(a) * 1.5, c.z + Math.cos(a) * 1.5, a + Math.PI],
      );
      await page.waitForTimeout(500);
      const prompt = await S(() => document.querySelector('.hud-prompt.show')?.textContent ?? null);
      if (!prompt?.toLowerCase().includes('chest')) continue;
      await shot('chest-C5.1');
      await tap('KeyE');
      await page
        .waitForFunction(() => !!window.__dev.learn.getState().reveal, null, { timeout: 8000 })
        .catch(() => fail('chest C5.1: E didn’t open it'));
      await drive('chest C5.1', (st) => !st.reveal && !st.banner && !st.dialogue, 30000);
      opened = true;
      break;
    }
    if (!opened) fail('chest C5.1: no prompt beside it from any side');
  }
}
for (const c of ['C5.1', 'C5.2', 'C5.3'])
  if (!(await S((id) => window.__dev.learn.isChestOpen(id), c))) fail(`chest ${c} is still shut at the end`);
const bottles = await D("d.bottles().filter((b) => b.id.startsWith('B5.'))");
if (bottles.length !== 4) fail(`${bottles.length} bottles on Sunspire, not 4`);
const starfish = await D("d.starfish().filter((s) => s.island === 'sunspire')");
if (starfish.length !== 5) fail(`${starfish.length} starfish on Sunspire, not 5`);
// Each bottle read where it lies (E at it).
for (const b of bottles) {
  await S(([x, z]) => window.__dev.session().debug.teleport(x + 1.2, z + 0.6), [b.x, b.z]);
  await page.waitForTimeout(500);
  const prompt = await S(() => document.querySelector('.hud-prompt.show')?.textContent ?? null);
  if (!prompt?.includes('bottle')) {
    fail(`bottle ${b.id}: no prompt beside it (${prompt})`);
    continue;
  }
  await shot(`bottle-${b.id}`);
  await tap('KeyE');
  // Its message opens as a reveal: wait for it, then read it through.
  await page
    .waitForFunction(() => !!window.__dev.learn.getState().reveal, null, { timeout: 6000 })
    .catch(() => fail(`bottle ${b.id}: E didn't open its message`));
  await drive(`bottle ${b.id}`, (st) => !st.reveal && !st.banner && !st.dialogue, 30000);
  await page.waitForTimeout(500);
}
const read = await D("d.bottles().filter((b) => b.id.startsWith('B5.') && b.read).length");
if (read !== 4) fail(`${read} of 4 bottles read`);

// Each starfish picked up by walking onto it: from 3 m off, W toward it until it's in the save.
const found = () => S(() => window.__dev.learn.progress.data.starfish.filter((id) => id.startsWith('sf.s.')));
for (const sf of starfish) {
  let got = false;
  for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    if (got) break;
    const x = sf.x + Math.sin(a) * 3;
    const z = sf.z + Math.cos(a) * 3;
    await S(([x, z, h, y]) => window.__dev.session().debug.teleport(x, z, h, y), [x, z, a + Math.PI, sf.y]);
    await page.waitForTimeout(400);
    for (let k = 0; k < 14 && !got; k++) {
      await S((ms) => window.__dev.hold(['KeyW'], ms), 120);
      got = (await found()).includes(sf.id);
    }
  }
  if (!got) fail(`starfish ${sf.id}: walking onto it didn't pick it up`);
  else await shot(`starfish-${sf.id}`);
}
const stars = (await found()).length;
if (stars !== 5) fail(`${stars} of 5 starfish found`);

for (const [what, list] of [
  ['quizzes', quizOrders],
  ['choice cards', cardOrders],
])
  if (list.length >= 5 && list.filter((i) => i === 0).length > list.length * 0.6)
    fail(`${what}: the right answer showed first in ${list.filter((i) => i === 0).length} of ${list.length}`);

const hitches = await S(() => window.__isles?.hitches?.() ?? []);
if (hitches.length) fail(`hitches after warm-up: ${JSON.stringify(hitches)}`);
console.log(JSON.stringify({ shots: shots.length, out, logs }, null, 2));
await browser.close();
process.exit(logs.length ? 1 : 0);

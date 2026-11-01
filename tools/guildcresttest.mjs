#!/usr/bin/env node
// End-to-end Chapter 04 run on Guildcrest, in the course's order (docs/specs/ISLAND-04-guildcrest.md
// §11.1): with Chapters 00-03 done (Keelhaven's Seal), ashore at Keelhaven's quay, aboard and out
// toward Guildcrest until battle 4 ("Evidence Agrees") starts; wave 1 fought and its question (N3.1)
// answered right, then either Skip battle (--battle=skip) or the fight to the win (--battle=fight, the
// default); the crew's lines show as captions (pending voices) without holding anything up. Then the
// sail on to Guildcrest, docking at its quay, the arrival flyover (Skip in the skip run), and every stop
// by E: Lyra's song chart, Elspeth's Charter Stone, Aidan's carrel (card A4.1), Brigid and the Pattern
// Book's lap (a wrong pick first at each choice; cards A4.2 Later, A4.3), Ewan's chained library, Fergus
// and the Journeyman's Toolbelt's lap (a wrong tile and a wrong pick first; cards A4.4, A4.5), Seren's
// Toolbelt Trial and the Seal (the bell, every station's lamp lit), and the optional assignment (Q4.A).
// Then the chests, the bottles (each read where it lies) and the starfish (each walked onto). --battle=none
// goes to Guildcrest by the chart instead.
// Each NPC is walked up to from a free side and talked to with E; quizzes are answered, cards confirmed.
// Fails on any console error, a missing beat, a quest out of order or a hitch after warm-up.
//   node tools/guildcresttest.mjs [--base=http://127.0.0.1:5301] [--out=<dir>] [--tier=high] [--webgl]
//                                 [--battle=fight|skip|none] [--reduced] [--verbose]
import { mkdirSync } from 'node:fs';
import { collectLogs, launchChrome, parseFlags } from './lib/browser.mjs';
import { answerCard, cardOpen, cardState } from './lib/learning-cards.mjs';

const opt = parseFlags();
const base = opt.base || 'http://localhost:5301';
const out = opt.out || 'tmp/shots/guildcrest';
const battle = opt.battle || 'fight';
if (!['fight', 'skip', 'none'].includes(battle)) throw new Error('--battle=fight|skip|none');
mkdirSync(out, { recursive: true });
const tag = `${opt.tier || 'auto'}-${opt.webgl ? 'gl' : 'gpu'}-${battle}`;
const url =
  `${base}/devpages/play.html?auto&quiet&guildcrest&shot` +
  `${opt.webgl ? '&webgl' : ''}${opt.tier ? `&tier=${opt.tier}` : ''}`;

const browser = await launchChrome({ autoplay: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
if (opt.reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
const logs = collectLogs(page, { types: ['error'] });
const fail = (m) => {
  logs.push(`[guildcresttest] ${m}`);
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
const gc = (fn, ...args) =>
  S(
    ([fn, args]) => {
      const d = window.__dev.session().debug.island('guildcrest');
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
  // The Pattern Book: the picker for skills, a book's name for its spine, a claim of a proof, a new
  // session from main, and trusting the plan.
  ['customize', 'picker'],
  ['description', 'name'],
  ['two', 'claim'],
  ['reload', 'main'],
  ['evidence', 'trust'],
  // The Journeyman's Toolbelt: a mode for a profile, edit on the belt, a long proof, a closed window,
  // a slash command, and shell access to run the tests.
  ['parts', 'mode'],
  ['read', 'edit'],
  ['tools', 'long'],
  ['restart', 'window'],
  ['agent', 'slash'],
  ['default', 'shell'],
];
const cardTried = new Set();
/** Each choice card's options, in the order shown, and where the right one was (the shuffle's check). */
const cardOrders = [];
async function answerChoice() {
  const v = await gc('card');
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
const seen = new Set();
// Card A4.2 is put off with Later (it never blocks), the rest confirmed with I did it.
const cardPlan = { later: ['A4.2'] };
/** Quizzes answered wrong once before the right answer (K4.1, M4.1). */
const WRONG_ONCE = new Set(['K4.1', 'M4.1']);
const wrongDone = new Set();
/** The Toolbelt Trial's round (1: three wrong answers, so it's failed and retried; 2: passed). */
let trialRound = 0;
let lastQuiz = null;
const wrongFirst = (id) => WRONG_ONCE.has(id) || (trialRound === 1 && /^T4\.[123]$/.test(id));
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
      if (s.quiz.id === 'T4.1' && lastQuiz !== 'T4.1') trialRound++;
      lastQuiz = s.quiz.id;
      // The first try: three wrong answers, then step away from the Trial (it's offered again).
      if (trialRound === 1 && s.quiz.id === 'T4.4') {
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
      if (Math.abs(at.y - n.y) < 1 && prompt?.includes('Talk to') && prompt.includes(n.name.split(' ')[0])) {
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
    // A line still playing (Rory's answer after the bench) holds the next station back a moment.
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

// ---- Chapters 00-03 done: Keelhaven's Seal is yours ----
const PRIOR = await S(async () => {
  const { islandQuestList } = await import('/src/course/active.ts');
  return ['anchorage', 'meridian', 'thousand-bough', 'keelhaven'].flatMap((i) =>
    islandQuestList(i).map((q) => q.id),
  );
});
if (PRIOR.length < 30) fail(`only ${PRIOR.length} quests before Guildcrest`);
await S((ids) => {
  const d = window.__dev.session().debug;
  for (const id of ids) d.quest(id, 'done');
}, PRIOR);
await page.waitForTimeout(800);

/** By the chart to an island's quay, past its arrival and welcome. */
async function travelTo(id, { skip = true } = {}) {
  const q = await S((id) => window.__dev.session().islandQuay(id), id);
  if (!q) return fail(`${id} isn’t open`);
  await S((q) => window.__dev.session().travel(q.x, q.z, q.heading), q);
  await page.waitForFunction((id) => window.__dev.session().island === id, id, { timeout: 120000 });
  await page.waitForTimeout(2500);
  if (skip) await D('d.skipArrival()');
}

// ---- Battle 4 on the passage from Keelhaven ----
const snap = () => D('d.battleRun()?.battle.snapshot({ bears: [0, 0], stores: {} }) ?? null');
async function waitPhase(phases, ms = 60000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const s = await snap();
    if (s && phases.includes(s.phase)) return s;
    await page.waitForTimeout(200);
  }
  return snap();
}
/** Steers for (x, z) with A/D for `ms` (or until `done()`), sails up with W. */
async function sailToward(x, z, ms, done = async () => false) {
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(2500);
  await page.keyboard.up('KeyW');
  const t0 = Date.now();
  let key = null;
  while (Date.now() - t0 < ms) {
    if (await done()) break;
    const st = await D('d.state().ship');
    const want = Math.atan2(x - st.x, z - st.z);
    const dd = Math.atan2(Math.sin(want - st.heading), Math.cos(want - st.heading));
    const next = Math.abs(dd) < 0.08 ? null : dd > 0 ? 'KeyA' : 'KeyD';
    if (next !== key) {
      if (key) await page.keyboard.up(key);
      if (next) await page.keyboard.down(next);
      key = next;
    }
    await page.waitForTimeout(150);
  }
  if (key) await page.keyboard.up(key);
}
/** A held key long enough for a frame's poll to see it. */
async function press(code) {
  await page.keyboard.down(code);
  await page.waitForTimeout(110);
  await page.keyboard.up(code);
  await page.waitForTimeout(160);
}
/** The captions the battle showed (the crew's lines), caught as they show. */
async function watchCaptions() {
  await S(() => {
    window.__gcCaptions = [];
    const look = () => {
      const t = document.querySelector('.hud-subtitle.show, .hud-subtitle')?.textContent?.trim();
      if (t && window.__gcCaptions.at(-1) !== t) window.__gcCaptions.push(t);
      window.__gcLook = requestAnimationFrame(look);
    };
    look();
  });
}
/** Fights the open wave to its question and answers it right (through the keyboard). */
async function fightWave(wave) {
  await waitPhase(['fight']);
  await page.keyboard.press('KeyR');
  let fired = false;
  const t0 = Date.now();
  while (Date.now() - t0 < 150000) {
    const s = await snap();
    if (!s || s.phase !== 'fight') break;
    if (!s.assist) await page.keyboard.press('KeyR');
    await D('d.battleRun().battle.raiders().forEach((r, i) => d.battleRun().battle.debugHull(i, 14))');
    if (s.bears[0] || s.bears[1]) {
      await page.keyboard.press('Space');
      if (!fired) {
        await page.waitForTimeout(450);
        await shot(`b4-wave${wave + 1}-broadside`);
        fired = true;
      }
      await page.waitForTimeout(1300);
    } else await page.waitForTimeout(400);
  }
  const s = await waitPhase(['question'], 40000);
  if (s?.phase !== 'question')
    return fail(`battle 4 wave ${wave + 1} didn't reach its question (${s?.phase})`);
  await page.waitForTimeout(1200);
  await shot(`b4-wave${wave + 1}-question`);
  const answerIdx = await S(async (wi) => {
    const run = window.__dev.session().debug.battleRun();
    const { QUIZZES } = await import('/src/learn/content/index.ts');
    const { quizOptions } = await import('/src/learn/option-order.ts');
    const quiz = QUIZZES.get(run.plan.waves[wi].quiz);
    return quizOptions(quiz).findIndex((o) => o.id === quiz.answer);
  }, wave);
  // The arrows move the focus from the first choice (E focuses it if nothing has it yet); read where it
  // is after each press, so a press the page missed is pressed again.
  const focused = () =>
    S(() => [...document.querySelectorAll('.bh-options .bh-choice')].indexOf(document.activeElement));
  if ((await focused()) < 0) await press('ArrowDown');
  for (let k = 0; k < 8 && (await focused()) !== answerIdx; k++)
    await press((await focused()) < answerIdx ? 'ArrowDown' : 'ArrowUp');
  if ((await focused()) !== answerIdx)
    note(`battle 4 wave ${wave + 1}: focus ${await focused()}, want ${answerIdx}`);
  await page.waitForTimeout(250);
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(800);
  if (!(await page.$('.bh-choice.right')))
    fail(`battle 4: the right answer wasn't marked right on wave ${wave + 1}`);
  await shot(`b4-wave${wave + 1}-answered`);
  await page.waitForTimeout(200);
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(800);
}

async function battle4() {
  await travelTo('keelhaven');
  await calm('keelhaven welcome');
  await D('d.board()');
  await page.waitForFunction(() => window.__dev.state().mode === 'sail', null, { timeout: 20000 });
  await page.waitForTimeout(800);
  if (!(await D('!!d.battleRun()'))) {
    await page.waitForTimeout(1500);
    if (!(await D('!!d.battleRun()'))) return fail('boarding at Keelhaven with its Seal built no battle');
  }
  if ((await D('d.battleRun().plan.id')) !== 'passage-keelhaven-guildcrest')
    fail(`the battle built is ${await D('d.battleRun().plan.id')}`);
  const ends = await S(async () => {
    const { ISLANDS } = await import('/src/game/islands.ts');
    return { from: ISLANDS.keelhaven.mooring, to: ISLANDS.guildcrest.mooring };
  });
  const started = () => D('!!d.battleRun()?.started');
  await sailToward(ends.to.x, ends.to.z, 25000, started);
  if (!(await started())) {
    const k = 0.5;
    const h = Math.atan2(ends.to.x - ends.from.x, ends.to.z - ends.from.z);
    await S(
      ([x, z, h]) => window.__dev.session().debug.sailTo(x, z, h),
      [ends.from.x + (ends.to.x - ends.from.x) * k, ends.from.z + (ends.to.z - ends.from.z) * k, h],
    );
    await sailToward(ends.to.x, ends.to.z, 90000, started);
  }
  if (!(await started())) return fail('battle 4 never started on the passage');
  await watchCaptions();
  await page.waitForTimeout(700);
  if (await page.$('.bh-brief')) {
    await shot('b4-briefing');
    await page.keyboard.press('Enter');
  }
  await page.waitForTimeout(3600);
  await shot('b4-sighting');
  const info = await S(() => window.__isles.info());
  const res = await D('d.residency()');
  note(`battle 4: ${info.programs} programs, resident ${res.resident}`);
  if (info.programs > 140) fail(`battle 4: ${info.programs} programs (cap 140)`);
  if (!res.resident.includes('guildcrest')) fail(`battle 4: Guildcrest isn't in memory (${res.resident})`);
  await D('d.battleRun().battle.setCalm(true)');
  await fightWave(0);
  if (battle === 'skip') {
    await page.waitForTimeout(1500);
    await page.click('.bh-skip');
    await page.waitForTimeout(1000);
    const s = await snap();
    if (s && s.phase !== 'skipped') fail(`battle 4 is ${s.phase} after Skip battle`);
    await shot('b4-skipped');
  } else {
    const waves = await D('d.battleRun().plan.waves.length');
    for (let w = 1; w < waves; w++) await fightWave(w);
    const won = await waitPhase(['won'], 20000);
    if (won?.phase !== 'won') fail(`battle 4 wasn't won (${won?.phase})`);
    await page.waitForTimeout(2500);
    await shot('b4-won');
  }
  // The crew's lines (pending voices) showed as captions.
  const caps = await S(() => {
    cancelAnimationFrame(window.__gcLook);
    return window.__gcCaptions;
  });
  note(`battle captions: ${JSON.stringify(caps)}`);
  if (!caps.some((c) => c.includes('Confident Guess')))
    fail('battle 4: no caption for the first wave’s crew line');
  // The won line is pending: the win card shows its words (no caption over it).
  if (battle === 'fight' && !(await S(() => document.body.textContent.includes('Three habits sank'))))
    fail('battle 4: the win card doesn’t show the won line');
  const saved = await D('d.battlesDone?.() ?? null');
  note(`battles saved: ${JSON.stringify(saved)}`);
  await page.waitForTimeout(6000);
  // On to Guildcrest: the berth opens now the passage is clear.
  await S(
    ([x, z, h]) => window.__dev.session().debug.sailTo(x, z, h),
    [ends.to.x, ends.to.z, ends.to.heading],
  );
  await page.waitForTimeout(2500);
  await D('d.dock()');
  await page
    .waitForFunction(
      () => window.__dev.session().island === 'guildcrest' && window.__dev.state().mode === 'walk',
      null,
      { timeout: 90000 },
    )
    .catch(() => fail('never docked at Guildcrest after battle 4'));
  if (await D('!!d.battleRun()')) fail('battle 4 is still built after docking');
}

if (battle === 'none') await travelTo('guildcrest', { skip: false });
else await battle4();

// ---- The arrival flyover (watched in the fight run, skipped in the skip run) ----
if (battle === 'skip') await D('d.skipArrival()');
else
  for (const t of [1.5, 9, 14, 19, 24]) {
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
        .some((n) => n.id === 'lyra_guild'),
    null,
    { timeout: 90000 },
  )
  .catch(() => fail('Guildcrest’s cast never came'));
await page
  .waitForFunction(() => window.__dev.state().dialogue, null, { timeout: 8000 })
  .catch(() => fail('no Guildcrest welcome'));
await page.waitForTimeout(1200);
await shot('welcome');
await calm('welcome');
await page.waitForTimeout(1200);
await shot('ashore');
const tracker = await S(() => window.__dev.learn.getState().tracker);
if (tracker?.island !== 'Guildcrest') fail(`tracker shows ${tracker?.island}`);
if (!(await compassLabel())?.includes('Lyra')) fail(`compass points at ${await compassLabel()}, not Lyra`);

// ---- The stops, in the course's order ----
const after = async (npc, next) => {
  await page.waitForTimeout(1200);
  await shot(`after-${npc}`);
  const c = await compassLabel();
  if (next && !c?.includes(next)) fail(`after ${npc} the compass points at ${c}, not ${next}`);
};
for (const s of [
  { npc: 'lyra_guild', quest: 'Q4.1', next: 'Elspeth' },
  { npc: 'elspeth', quest: 'Q4.2', next: 'Aidan' },
  { npc: 'aidan', quest: 'Q4.3', next: 'Brigid' },
]) {
  await talk(s.npc);
  await drive(s.npc, (st) => st.quests[s.quest] === 'done' && !st.dialogue);
  await after(s.npc, s.next);
}

// Brigid and the Pattern Book (P4.1), round the cloister.
await talk('brigid');
await drive('brigid', (st) => st.quests['Q4.4'] === 'book' && !st.dialogue);
await circuit('pattern-book', 'Q4.4');
// The lap's close plays Brigid's solved beat by itself; a talk finishes it if it's still waiting.
if ((await learnState()).quests['Q4.4'] !== 'done') await talk('brigid');
await drive('brigid solved', (st) => st.quests['Q4.4'] === 'done' && !st.dialogue && !st.quiz && !st.reveal);
if (!(await S(() => window.__dev.learn.isChestOpen('C4.1'))))
  fail('chest C4.1 didn’t open after the Pattern Book');
await after('brigid', 'Ewan');

await talk('ewan');
await drive('ewan', (st) => st.quests['Q4.5'] === 'done' && !st.dialogue);
await after('ewan', 'Fergus');

// Fergus, then the Journeyman's Toolbelt (P4.2) in the yard.
await talk('fergus');
await drive('fergus', (st) => st.quests['Q4.6'] === 'done' && !st.dialogue);
await after('fergus', 'Fergus');
await talk('fergus');
await drive('fergus belt', (st) => st.quests['Q4.7'] === 'belt' && !st.dialogue);
await circuit('toolbelt', 'Q4.7');
if ((await learnState()).quests['Q4.7'] !== 'done') await talk('fergus');
await drive('fergus solved', (st) => st.quests['Q4.7'] === 'done' && !st.dialogue && !st.quiz && !st.reveal);
if (!(await S(() => window.__dev.learn.isChestOpen('C4.3'))))
  fail('chest C4.3 didn’t open after the Toolbelt');
await after('fergus', 'Seren');

// Seren's Toolbelt Trial and the Seal: the bell rings and every station's lamp lights.
await talk('seren');
// The first try: three wrong answers, then away from it: the Trial isn't passed yet, and Seren offers it again.
await drive(
  'trial 1',
  (st) => trialRound >= 1 && !st.quiz && !st.dialogue && !st.reveal && !st.banner,
  240000,
);
if ((await learnState()).quests['Q4.8'] === 'done') fail('the Trial passed with three wrong answers');
await shot('trial-failed');
let sealSeen = false;
const sealWatch = (async () => {
  for (let i = 0; i < 2000 && !sealSeen; i++) {
    if (await gc('sealing')) {
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
await talk('seren');
await drive(
  'trial 2',
  (st) => st.quests['Q4.8'] === 'done' && !st.dialogue && !st.quiz && !st.reveal,
  300000,
);
if (trialRound !== 2) fail(`the Trial ran ${trialRound} times, not 2`);
const sealShot = sealSeen;
sealSeen = true;
await sealWatch;
if (!sealShot) fail('the Seal’s moment never played');
await shot('sealed');
for (const key of ['book:shelf', 'book:lectern', 'belt:indenture', 'belt:testBench'])
  if ((await gc('lamp', key)) !== 'ready') fail(`lamp ${key} isn’t lit after the Seal`);

// The optional assignment (Q4.A), from Seren and back to her.
for (let round = 0; round < 3 && (await learnState()).quests['Q4.A'] !== 'done'; round++) {
  await talk('seren');
  await drive(`seren Q4.A`, (st) => !st.dialogue && !st.quiz && !st.reveal, 120000);
  await page.waitForTimeout(800);
}
if ((await learnState()).quests['Q4.A'] !== 'done') fail('Q4.A isn’t done after talking to Seren');

// ---- Chests, bottles and starfish ----
const chests = await D("d.chests().filter((c) => c.id.startsWith('C4.'))");
if (chests.length !== 3) fail(`${chests.length} chests on Guildcrest, not 3`);
const bottles = await D("d.bottles().filter((b) => b.id.startsWith('B4.'))");
if (bottles.length !== 4) fail(`${bottles.length} bottles on Guildcrest, not 4`);
const starfish = await D("d.starfish().filter((s) => s.island === 'guildcrest')");
if (starfish.length !== 5) fail(`${starfish.length} starfish on Guildcrest, not 5`);
// Each bottle read where it lies (E at it).
for (const b of bottles) {
  await S(([x, z]) => window.__dev.session().debug.teleport(x + 1.2, z + 0.6), [b.x, b.z]);
  await page.waitForTimeout(500);
  const prompt = await S(() => document.querySelector('.hud-prompt.show')?.textContent ?? null);
  if (!prompt?.includes('bottle')) {
    fail(`bottle ${b.id}: no prompt beside it (${prompt})`);
    continue;
  }
  await tap('KeyE');
  // Its message opens as a reveal: wait for it, then read it through.
  await page
    .waitForFunction(() => !!window.__dev.learn.getState().reveal, null, { timeout: 6000 })
    .catch(() => fail(`bottle ${b.id}: E didn't open its message`));
  await drive(`bottle ${b.id}`, (st) => !st.reveal && !st.banner && !st.dialogue, 30000);
  await page.waitForTimeout(500);
}
const read = await D("d.bottles().filter((b) => b.id.startsWith('B4.') && b.read).length");
if (read !== 4) fail(`${read} of 4 bottles read`);

// Each starfish picked up by walking onto it: from 3 m off, W toward it until it's in the save.
const found = () => S(() => window.__dev.learn.progress.data.starfish.filter((id) => id.startsWith('sf.g.')));
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
console.log(JSON.stringify({ battle, shots: shots.length, out, logs }, null, 2));
await browser.close();
process.exit(logs.length ? 1 : 0);

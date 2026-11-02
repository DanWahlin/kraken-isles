#!/usr/bin/env node
// Guildcrest from a save, and its residency (docs/specs/ISLAND-04-guildcrest.md §11.1 steps 6 and 7),
// in the real game (index.html?debug): a new voyage with Chapters 00-04 done (Guildcrest sealed), the
// chart to Guildcrest, then a fresh page and Continue: you're back on Guildcrest, and the story holds
// from the save (the copied book's page, Rory's banner on the roll board, the guilds' banners on the
// ridge, every station's lamp lit), with an empty hitch guard after the warm. Then the chart to
// Keelhaven: Guildcrest is freed once its grace is over (StreamLifecycle), and the chart back rebuilds it
// from the save, warm (the same story, no hitch). Fails on page errors, a story piece that's missing, a
// hitch, or Guildcrest still in memory after its grace.
//   node tools/guildcrest-savetest.mjs [--base=http://localhost:5301] [--tier=high] [--webgl] [--out=<dir>]
import { mkdirSync } from 'node:fs';
import { collectLogs, launchChrome, parseFlags, waitForTitle } from './lib/browser.mjs';
import { passLearningPauses } from './lib/learning-cards.mjs';

const opt = parseFlags();
const base = opt.base || 'http://localhost:5301';
const tier = opt.tier || 'high';
const out = opt.out || 'tmp/shots/guildcrest-save';
mkdirSync(out, { recursive: true });
const tag = `${opt.webgl ? 'gl' : 'gpu'}-${tier}`;
const url = `${base}/?debug&tier=${tier}${opt.webgl ? '&webgl' : ''}`;

const CH0 = ['Q0.2', 'Q0.3', 'Q0.4', 'Q0.5', 'Q0.6', 'Q0.7', 'Q0.8', 'Q0.9', 'Q0.10', 'Q0.11'];
const CH1 = ['Q1.1', 'Q1.2', 'Q1.3', 'Q1.4', 'Q1.5', 'Q1.6', 'Q1.7', 'Q1.8', 'Q1.A'];
const CH2 = ['Q2.1', 'Q2.2', 'Q2.3', 'Q2.4', 'Q2.5', 'Q2.6', 'Q2.7', 'Q2.8', 'Q2.9', 'Q2.A'];
const CH3 = ['Q3.1', 'Q3.2', 'Q3.3', 'Q3.4', 'Q3.5', 'Q3.6', 'Q3.7', 'Q3.8', 'Q3.9', 'Q3.10', 'Q3.A', 'Q3.B'];
const CH4 = ['Q4.1', 'Q4.2', 'Q4.3', 'Q4.4', 'Q4.5', 'Q4.6', 'Q4.7', 'Q4.8'];

const browser = await launchChrome({ autoplay: true });
const logs = [];
const fail = (m) => {
  logs.push(`[guildcrest-savetest] ${m}`);
  console.log(`FAIL ${m}`);
};
const note = (m) => console.log(`${new Date().toISOString().slice(11, 19)} ${m}`);
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
collectLogs(page, { types: ['error'], logs });
const S = (js) => page.evaluate(`(() => { const s = window.__flow.debugSession; return ${js}; })()`);
const gc = (js) =>
  page.evaluate(
    `(() => { const d = window.__flow.debugSession.debug.island('guildcrest'); return ${js}; })()`,
  );
const shot = (name) => page.screenshot({ path: `${out}/${tag}-${name}.jpg`, quality: 85, type: 'jpeg' });
const playing = () =>
  page.waitForFunction(() => window.__flow.getState().screen === 'playing', null, { timeout: 180_000 });

/** By the chart (the game's own jump: it waits for the island's warm behind its fade), past its arrival and welcome. */
async function travel(id) {
  await page.evaluate((id) => window.__flow.travelTo(`island:${id}`), id);
  await page.waitForFunction(
    (id) => window.__flow.getState().screen === 'playing' && window.__flow.debugSession?.island === id,
    id,
    { timeout: 180_000 },
  );
  await page.waitForTimeout(2500);
  await S('s.debug.skipArrival()');
  await calm();
}
async function calm() {
  for (let i = 0, still = 0; i < 240 && still < 6; i++) {
    const st = await S('s.debug.state()');
    if (st.mode === 'walk' && !st.dialogue && !st.welcome) still++;
    else {
      still = 0;
      if (st.dialogue) await page.keyboard.press('KeyE');
    }
    await passLearningPauses(page);
    await page.waitForTimeout(400);
  }
}
/** Waits for Guildcrest's setup (its cast) and checks what the save shows. */
async function storyHolds(when) {
  await page
    .waitForFunction(() => window.__flow.debugSession.debug.island('guildcrest')?.ready?.() === true, null, {
      timeout: 120_000,
    })
    .catch(() => fail(`${when}: Guildcrest's content never set up`));
  await page.waitForTimeout(1500);
  for (const what of ['page', 'rory', 'sealed'])
    if (!(await gc(`d.showing('${what}')`))) fail(`${when}: the world doesn't show '${what}'`);
  for (const key of ['book:shelf', 'book:lectern', 'belt:indenture', 'belt:testBench', 'belt:roll'])
    if ((await gc(`d.lamp('${key}')`)) !== 'ready') fail(`${when}: lamp ${key} isn't lit`);
}
async function hitches(when) {
  const h = await page.evaluate(() => window.__isles?.hitches?.() ?? []);
  if (h.length) fail(`${when}: hitches ${JSON.stringify(h).slice(0, 400)}`);
}
// ---- A voyage with Chapters 00-04 done, by the chart to Guildcrest ----
await page.goto(url, { waitUntil: 'load' });
await page.evaluate(() => localStorage.clear());
await waitForTitle(page, 90_000);
await page.evaluate(() => window.__flow.chooseCaptain());
await page.waitForTimeout(600);
await page.evaluate(() => window.__flow.newVoyage('woman'));
await playing();
await page.waitForTimeout(1500);
await S('s.debug.skipArrival()');
await page.waitForFunction(() => window.__flow.debugSession.debug.state().mode === 'walk', null, {
  timeout: 20_000,
});
await page.evaluate(
  (quests) => {
    const d = window.__flow.debugSession.debug;
    for (const q of quests) d.quest(q, 'done');
  },
  [...CH0, ...CH1, ...CH2, ...CH3],
);
await page.waitForTimeout(800);
note('to Guildcrest');
await travel('guildcrest');
await page.evaluate((quests) => {
  const d = window.__flow.debugSession.debug;
  for (const q of quests) d.quest(q, 'done');
}, CH4);
await page.waitForTimeout(1500);
await calm();

// ---- A fresh page and Continue: back on Guildcrest, the story from the save ----
note('reload and continue');
await page.evaluate(() => window.__flow.pause());
await page.waitForTimeout(500);
await page.reload({ waitUntil: 'load' });
await waitForTitle(page, 90_000);
await page.evaluate(() => window.__flow.continueVoyage());
await playing();
await passLearningPauses(page);
await page.waitForTimeout(1500);
const where = await S('s.island');
if (where !== 'guildcrest') fail(`Continue landed on ${where}, not Guildcrest`);
await calm();
await storyHolds('after Continue');
await hitches('after Continue');
await shot('continued');

// ---- The chart to Keelhaven: Guildcrest is freed after its grace ----
note('to Keelhaven');
await travel('keelhaven');
const freed = await page
  .waitForFunction(
    () => !window.__flow.debugSession.debug.residency().resident.includes('guildcrest'),
    null,
    { timeout: 90_000, polling: 1000 },
  )
  .then(() => true)
  .catch(() => false);
const res = await S('s.debug.residency()');
note(`at Keelhaven: resident ${JSON.stringify(res.resident)}`);
if (!freed) fail(`Guildcrest still in memory at Keelhaven (${JSON.stringify(res.resident)})`);
await hitches('at Keelhaven');

// ---- And back: rebuilt from the save, warm ----
note('back to Guildcrest');
await travel('guildcrest');
await storyHolds('back on Guildcrest');
await page.waitForTimeout(3000);
await hitches('back on Guildcrest');
await shot('back');

console.log(JSON.stringify({ tier, webgl: !!opt.webgl, freed, logs }, null, 2));
await browser.close();
process.exit(logs.length ? 1 : 0);

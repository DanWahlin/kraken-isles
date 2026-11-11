#!/usr/bin/env node
// Cast contact check for one island: every NPC stands on its ground (a deck, a floor, the terrain) or
// sits on its seat, and none stands inside another. For each it measures feet to ground (`debug.cast()`:
// the NPC's y against the walkable surface under it), and takes two stills: the whole figure from the
// front quarter, and its feet (or seat) from low and close. The stills go on two contact sheets
// (`<island>-figures.png`, `<island>-feet.png`) for a look at feet through boards, benches and sand.
// Fails on a console error, a standing NPC more than --max off its ground (default 0.06 m), a sitter
// off its seat, or two NPCs closer than 0.45 m. A market keeper stands on the booth's boards
// (--raised=yusuf:0.33).
//   node tools/casttest.mjs --island=sunspire [--base=http://127.0.0.1:5301] [--out=<dir>] [--tier=high]
//                           [--max=0.06] [--raised=<id>:<m>,…] [--webgl] [--verbose]
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';
import { collectLogs, launchChrome, parseFlags } from './lib/browser.mjs';

const opt = parseFlags();
const island = opt.island;
if (!island) throw new Error('--island=<id>');
const base = opt.base || 'http://localhost:5301';
const out = opt.out || `tmp/shots/cast-${island}`;
const max = Number(opt.max ?? 0.06);
/** NPCs that stand on boards the walk surface doesn't count: `--raised=yusuf:0.33,moira:0.33`. */
const raised = Object.fromEntries(
  String(opt.raised ?? '')
    .split(',')
    .filter(Boolean)
    .map((p) => {
      const [id, m] = p.split(':');
      return [id, Number(m)];
    }),
);
mkdirSync(out, { recursive: true });
const url =
  `${base}/devpages/play.html?auto&quiet&allparts&${island}&shot` +
  `${opt.webgl ? '&webgl' : ''}${opt.tier ? `&tier=${opt.tier}` : ''}`;

const browser = await launchChrome({ autoplay: true });
const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
const logs = collectLogs(page, { types: ['error'] });
const fail = (m) => {
  logs.push(`[casttest] ${m}`);
  if (opt.verbose) console.log(`FAIL ${m}`);
};
await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction(() => window.__dev?.ready === true && window.__dev.session(), null, {
  timeout: 180000,
});
await page.waitForTimeout(1500);
const S = (f, a) => page.evaluate(f, a);
const D = (js) => page.evaluate(`(() => { const d = window.__dev.session().debug; return ${js}; })()`);

// Every earlier island's quests done, so this one is open and its cast is all out.
await S(async (island) => {
  const { islandQuestList } = await import('/src/course/active.ts');
  const { ISLAND_IDS } = await import('/src/islands/registry.ts');
  const d = window.__dev.session().debug;
  for (const id of ISLAND_IDS) {
    if (id === island) break;
    for (const q of islandQuestList(id)) d.quest(q.id, 'done');
  }
}, island);
await page.waitForTimeout(800);
const quay = await S((id) => window.__dev.session().islandQuay(id), island);
if (quay) {
  await S((q) => window.__dev.session().travel(q.x, q.z, q.heading), quay);
  await page.waitForFunction((id) => window.__dev.session().island === id, island, { timeout: 120000 });
  await page.waitForTimeout(2500);
  await D('d.skipArrival()');
}
// The welcome, read through.
for (let i = 0; i < 80; i++) {
  const st = await S(() => window.__dev.state());
  if (!st.dialogue && !st.welcome && i > 6) break;
  if (st.dialogue) await S(() => window.__dev.tap('KeyE'));
  await page.waitForTimeout(400);
}
await page
  .waitForFunction(() => window.__dev.session().debug.cast().length > 0, null, { timeout: 60000 })
  .catch(() => fail('no cast came'));
await page.waitForTimeout(4000);

const cast = await D('d.cast()');
const rows = [];
const figures = [];
const feet = [];
for (const n of cast) {
  const off = n.y - n.ground;
  const sits = n.clip === 'sit';
  rows.push({ id: n.id, off: Number(off.toFixed(3)), sits });
  // A seat is a solid, so the surface under a sitter is the seat's own top; a keeper on a booth's
  // boards stands `--raised=<id>:<m>` over the walk surface under them.
  const lift = raised[n.id] ?? 0;
  if (sits) {
    if (off < -0.05 || off > 0.8) fail(`${n.id} sits ${off.toFixed(2)} m off its seat`);
  } else if (Math.abs(off - lift) > max)
    fail(`${n.id} stands ${(off - lift).toFixed(3)} m off the ground (limit ${max})`);
  for (const m of cast)
    if (m.id < n.id && Math.hypot(m.x - n.x, m.z - n.z) < 0.45 && Math.abs(m.y - n.y) < 1)
      fail(`${n.id} and ${m.id} stand ${Math.hypot(m.x - n.x, m.z - n.z).toFixed(2)} m apart`);
  // The figure from its front quarter, then its feet (or seat) from low and close.
  for (const [list, dist, eye, target, name] of [
    [figures, 3.1, 1.25, 0.85, 'figure'],
    [feet, 1.5, 0.32, 0.12, 'feet'],
  ]) {
    const a = n.h + 0.7;
    await S((shot) => window.__dev.session().debug.shot(shot), {
      x: n.x + Math.sin(a) * dist,
      y: n.y + eye,
      z: n.z + Math.cos(a) * dist,
      tx: n.x,
      ty: n.y + target,
      tz: n.z,
    });
    await page.waitForTimeout(700);
    const path = `${out}/${n.id}-${name}.png`;
    await page.screenshot({ path });
    list.push({ id: n.id, path });
  }
}
await S(() => window.__dev.session().debug.shot(null));

/** A labelled sheet of stills, four across. */
async function sheet(list, file) {
  const W = 480;
  const H = 360;
  const cols = 4;
  const tiles = await Promise.all(
    list.map(async ({ id, path }, i) => ({
      input: await sharp(path)
        .resize(W, H)
        .composite([
          {
            input: Buffer.from(
              `<svg width="${W}" height="26"><rect width="${W}" height="26" fill="#000a"/>` +
                `<text x="8" y="18" font-family="sans-serif" font-size="15" fill="#fff">${id}</text></svg>`,
            ),
            top: 0,
            left: 0,
          },
        ])
        .png()
        .toBuffer(),
      left: (i % cols) * W,
      top: Math.floor(i / cols) * H,
    })),
  );
  await sharp({
    create: {
      width: W * cols,
      height: H * Math.ceil(list.length / cols),
      channels: 3,
      background: '#222',
    },
  })
    .composite(tiles)
    .png()
    .toFile(file);
}
if (figures.length) {
  await sheet(figures, `${out}/${island}-figures.png`);
  await sheet(feet, `${out}/${island}-feet.png`);
}
console.log(JSON.stringify({ island, cast: rows, out, logs }, null, 2));
await browser.close();
process.exit(logs.length ? 1 : 0);

// Sea battle 4, "Evidence Agrees" (the passage from Keelhaven to Guildcrest): Chapters 00-03 done off
// camera, the chart to Keelhaven, aboard and out toward Guildcrest until the lookout calls sails, then
// the three waves fought with the real controls (the first question answered wrong, Chapter 03's recap
// N3.1-N3.3 between them), the win card, and the sail on into Guildcrest's afternoon. About a minute
// and a half (long stretches trimmed).
import { ashore, questsDone } from '../game.mjs';
import { battleScenario } from './battle-1.mjs';

const QUESTS = [
  ...['Q0.2', 'Q0.3', 'Q0.4', 'Q0.5', 'Q0.6', 'Q0.7', 'Q0.8', 'Q0.9', 'Q0.10', 'Q0.11'],
  ...['Q1.1', 'Q1.2', 'Q1.3', 'Q1.4', 'Q1.5', 'Q1.6', 'Q1.7', 'Q1.8', 'Q1.A'],
  ...['Q2.1', 'Q2.2', 'Q2.3', 'Q2.4', 'Q2.5', 'Q2.6', 'Q2.7', 'Q2.8', 'Q2.9', 'Q2.A'],
  ...['Q3.1', 'Q3.2', 'Q3.3', 'Q3.4', 'Q3.5', 'Q3.6', 'Q3.7', 'Q3.8', 'Q3.9', 'Q3.10', 'Q3.A', 'Q3.B'],
];

const ends = (api) =>
  api.S(async () => {
    const { ISLANDS } = await import('/src/game/islands.ts');
    return { from: ISLANDS.keelhaven.mooring, to: ISLANDS.guildcrest.mooring };
  });

export default battleScenario({
  id: 'battle4',
  order: 11,
  code: 'Sea battle 4',
  title: 'Evidence Agrees',
  island: 'Keelhaven → Guildcrest',
  subtitle:
    'Three waves of raiders named for unchecked work. Fire when a battery bears, and answer the bosun between waves.',
  chapter: 'Questions from Course Chapter 03 · Development & GitHub Workflows',
  labelsSeen: true,
  reading: 3600,
  answered: 3800,
  lullCut: { head: 2500, tail: 1000 },
  fightCut: () => ({ head: 9_000, tail: 3_000 }),
  hurry: (wave, ms) => ms > 12_000,
  async board(page, api) {
    await questsDone(api, QUESTS);
    await ashore(page, api, 'keelhaven', 'lyra_keel');
    await api.S(() => window.__dev.session().debug.board());
    await page.waitForFunction(() => window.__dev.state().mode === 'sail', null, { timeout: 20_000 });
    await page.waitForFunction(() => !!window.__dev.session().debug.battleRun(), null, { timeout: 60_000 });
    const { from, to } = await ends(api);
    const h = Math.atan2(to.x - from.x, to.z - from.z);
    await api.S(
      ([x, z, h]) => window.__dev.session().debug.sailTo(x, z, h),
      [from.x + (to.x - from.x) * 0.3, from.z + (to.z - from.z) * 0.3, h],
    );
    await api.pause(3000);
  },
  toward: async (api) => (await ends(api)).to,
  async afterWin(page, api) {
    await api.pause(3000);
  },
});

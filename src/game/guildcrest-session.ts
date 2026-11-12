import { naturalWaterAt } from '../world/islands/fresh-water-natural';
import { GUILDCREST_ANCHORS } from '../world/islands/guildcrest/anchors';
import { guildcrestWater } from '../world/islands/guildcrest/height';
import type { GuildcrestWorld } from '../world/islands/guildcrest/index';
import { CHARTER_STONE, FRAME_KIT, GUILDCREST, SQUARE } from '../world/islands/guildcrest/layout';
import {
  chestIds,
  createFrameIslandContent,
  frameShot,
  playBandSong,
  type BottleSpot,
  type ChestSpot,
  type FrameIslandContent,
} from './frame-island-content';
import { createGuildcrestCircuits } from './guildcrest-circuits';
import { GUILDCREST_NPCS, guildcrestExtras } from './guildcrest-npcs';
import { guildcrestNpcScript } from './guildcrest-quests';
import type { IslandContentHost } from './island-code';

/**
 * Guildcrest's content in the play session (docs/specs/ISLAND-04-guildcrest.md §4-§7, W.3-W.8) on the
 * shared content (frame-island-content.ts): its cast, its chests and bottles, its water (the loch's
 * burn and the mill pond), and its set pieces (the cues, spec W.4: the song chart, the Charter Stone,
 * the chained library, the two circuits and the Seal).
 */
export type GuildcrestContent = FrameIslandContent<GuildcrestWorld>;

const shot = (u: number, y: number, v: number, tu: number, ty: number, tv: number) =>
  frameShot(FRAME_KIT, u, y, v, tu, ty, tv);

const RACK = GUILDCREST_ANCHORS.chainRack;
const SHOTS = {
  // Over the square from its south-west, down at the Charter Stone.
  charter: shot(
    CHARTER_STONE.u - 9,
    SQUARE.y + 5.2,
    CHARTER_STONE.v - 7,
    CHARTER_STONE.u,
    SQUARE.y + 1.6,
    CHARTER_STONE.v,
  ),
  // From the north walk into the library's bay, at the chained tools.
  chains: { ...shot(24.4, 40.2, 142.6, 24.6, 37.2, 152.6), ty: RACK.y + 1.2 },
  // The inn's porch: Lyra's players by the music stand.
  chart: shot(-174, 7.2, 30, -162, 4, 40),
} as const;

/**
 * The chests the island places (spec §3.10, as built): on the cloister's west walk by the scriptorium,
 * in the chained library's bay, and in the guildhall yard by its north wall.
 */
const CHESTS: readonly ChestSpot[] = [
  { id: 'C4.1', u: 7.1, v: 124.6, face: [1, 0] },
  { id: 'C4.2', u: 27.6, v: 147.8, face: [-0.4, -1] },
  { id: 'C4.3', u: 104, v: 164.6, face: [0, -1] },
];

/** The message bottles (the chapter's troubleshooting, B4.1-B4.4). */
const BOTTLES: readonly BottleSpot[] = [
  { id: 'B4.1', u: -46.5, v: 82.5 },
  { id: 'B4.2', u: -86.2, v: 36.6 },
  { id: 'B4.3', u: 57.2, v: 144.4 },
  { id: 'B4.4', u: 82.6, v: 163.2 },
];

/** Every chest and bottle id the island places (`IslandCode.chests`). */
export const GUILDCREST_CHEST_IDS = chestIds(CHESTS, BOTTLES);

export function createGuildcrestContent(host: IslandContentHost): GuildcrestContent {
  const water = guildcrestWater();
  return createFrameIslandContent<GuildcrestWorld>(host, {
    id: 'guildcrest',
    prefix: 'gc',
    frame: FRAME_KIT,
    center: GUILDCREST.center,
    cast: GUILDCREST_NPCS,
    extras: guildcrestExtras,
    npcScript: guildcrestNpcScript,
    chests: CHESTS,
    bottles: BOTTLES,
    inland: (x, z, ground, out) => naturalWaterAt(water, x, z, ground, out),
    // The mills' sails turn slowly with reduced motion.
    ready: (world) => world.setSailPace(host.reducedMotion() ? 0.25 : 1),
    pieces(t) {
      // The song chart (puzzles/song-chart.json): the players play from memory and drift apart; you
      // hand out the chart, and they play the song the same way.
      const lyra = GUILDCREST_ANCHORS.lyra;
      t.cue('chart', () =>
        playBandSong(t, {
          puzzle: 'song-chart',
          shot: SHOTS.chart,
          at: { x: lyra.x, y: lyra.y + 1.2, z: lyra.z },
          first: ['free', 'playFree'],
          // Out of step: the second player comes in late.
          async falter(strum) {
            for (let i = 0; i < 3; i++) {
              await strum(0.8, 230, 120);
              await strum(0.55, 520);
            }
          },
          wrong: 'apart',
          fix: ['hand', 'handOut', 'quill'],
          again: ['chart', 'playChart'],
          right: 'together',
          chord: 0.8,
        }),
      );
      // The Charter Stone: the camera turns to it for its matching quiz (M4.1, the next step).
      t.lookCue('charter', SHOTS.charter);
      // The chained library: the camera turns to the tools on their chains.
      t.lookCue('chains', SHOTS.chains);
      // The two circuits (spec §5) and the Seal (§4.5).
      return { circuits: createGuildcrestCircuits(host, t.circuitCard), kinds: ['book', 'belt'] };
    },
  });
}

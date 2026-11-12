import { naturalWaterAt } from '../world/islands/fresh-water-natural';
import { SUNSPIRE_ANCHORS } from '../world/islands/sunspire/anchors';
import { sunspireWater } from '../world/islands/sunspire/height';
import type { SunspireWorld } from '../world/islands/sunspire/index';
import { CARAVANSERAI, FRAME_KIT, SQUARE, SUNSPIRE, WELL } from '../world/islands/sunspire/layout';
import { SQUARE_PROPS } from '../world/islands/sunspire/town';
import {
  chestIds,
  createFrameIslandContent,
  frameShot,
  playBandSong,
  type BottleSpot,
  type ChestSpot,
  type FrameIslandContent,
} from './frame-island-content';
import type { IslandContentHost } from './island-code';
import { createSunspireCircuits, type SunspireCircuits } from './sunspire-circuits';
import { SUNSPIRE_NPCS, sunspireExtras } from './sunspire-npcs';
import { SUNSPIRE_QUESTS } from './sunspire-quests';

/**
 * Sunspire's content in the play session (docs/specs/ISLAND-05-sunspire-sands.md §4-§6) on the shared
 * content (frame-island-content.ts): its cast, its chests and bottles, its fresh water, and its set
 * pieces (the cues: the gear song, the weighing table, the well, the two circuits and the Seal).
 */
export type SunspireContent = FrameIslandContent<SunspireWorld>;

const shot = (u: number, y: number, v: number, tu: number, ty: number, tv: number) =>
  frameShot(FRAME_KIT, u, y, v, tu, ty, tv);

const SHOTS = {
  // Over the square from its south-west, down at the weighing table.
  scales: shot(
    SQUARE_PROPS.scales.u - 8,
    SQUARE.y + 4.6,
    SQUARE_PROPS.scales.v - 7,
    SQUARE_PROPS.scales.u,
    SQUARE.y + 1.4,
    SQUARE_PROPS.scales.v,
  ),
  // From the camp's side at the well and the tents round it.
  well: shot(WELL.u + 8, WELL.y + 4.4, WELL.v + 8, WELL.u, WELL.y + 1.2, WELL.v),
  // Inside the caravanserai's gate: Lyra and her players under the arcade.
  song: shot(
    CARAVANSERAI.u - 5,
    CARAVANSERAI.y + 2.6,
    CARAVANSERAI.v - 6,
    CARAVANSERAI.u,
    CARAVANSERAI.y + 1.3,
    CARAVANSERAI.v + 4.6,
  ),
} as const;

/**
 * The chests the island places (spec §3): in the caravanserai's court, by the Signal House's wall,
 * and in the Crate Yard by its east wall.
 */
const CHESTS: readonly ChestSpot[] = [
  { id: 'C5.1', u: CARAVANSERAI.u + 6.4, v: CARAVANSERAI.v - 4.6, face: [-1, 0.3] },
  { id: 'C5.2', u: 58.6, v: 79.4, face: [0, -1] },
  { id: 'C5.3', u: 132.6, v: 11.6, face: [-1, 0.4] },
];

/** The message bottles (the chapter's troubleshooting, B5.1-B5.4). */
const BOTTLES: readonly BottleSpot[] = [
  { id: 'B5.1', u: -166, v: -91.5 },
  { id: 'B5.2', u: -12, v: -12.5 },
  { id: 'B5.3', u: -76.5, v: 67.5 },
  { id: 'B5.4', u: -60, v: -108 },
];

/** Every chest and bottle id the island places (`IslandCode.chests`). */
export const SUNSPIRE_CHEST_IDS = chestIds(CHESTS, BOTTLES);

export function createSunspireContent(host: IslandContentHost): SunspireContent {
  const water = sunspireWater();
  return createFrameIslandContent<SunspireWorld>(host, {
    id: 'sunspire',
    prefix: 'ss',
    frame: FRAME_KIT,
    center: SUNSPIRE.center,
    cast: SUNSPIRE_NPCS,
    extras: sunspireExtras,
    npcScript: SUNSPIRE_QUESTS.npcScript,
    chests: CHESTS,
    bottles: BOTTLES,
    // The falaj, the oasis pool and the cistern.
    inland: (x, z, ground, out) => naturalWaterAt(water, x, z, ground, out),
    pieces(t) {
      // The gear song (puzzles/gear-song.json): the players play what the chart says, and nobody can
      // hear the singer; you connect the gear the session needs, and the song comes through.
      const lyra = SUNSPIRE_ANCHORS.lyra;
      t.cue('song', () =>
        playBandSong(t, {
          puzzle: 'gear-song',
          shot: SHOTS.song,
          at: { x: lyra.x, y: lyra.y + 1.2, z: lyra.z },
          first: ['chart', 'playChart'],
          async falter(strum) {
            for (let i = 0; i < 3; i++) await strum(0.3, 520);
          },
          wrong: 'faint',
          fix: ['connect', 'connect', 'lever'],
          again: ['gear', 'playGear'],
          right: 'clear',
        }),
      );
      // The weighing table: the camera turns to it for its matching quiz (M5.1, the next step).
      t.lookCue('scales', SHOTS.scales);
      // The well: the camera turns to it and the tents round it (one well for every tent).
      t.lookCue('well', SHOTS.well);
      // The two circuits (spec §5) and the Seal.
      return { circuits: createSunspireCircuits(host, t.circuitCard), kinds: ['signal', 'crate'] };
    },
    // The mirror's bearing and whether its beam lands on the Sunspire.
    debug: (circuits) => ({ mirror: () => (circuits as SunspireCircuits).debug.mirror() }),
  });
}

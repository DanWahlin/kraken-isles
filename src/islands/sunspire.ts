import { SUNSPIRE_ARRIVAL_KEYS } from '../world/islands/sunspire/arrival';
import { SUNSPIRE_FLORA_PALETTE } from '../world/islands/sunspire/flora-palette';
import { SUNSPIRE_HARBOR as H } from '../world/islands/sunspire/harbor';
import { sunspireHeight } from '../world/islands/sunspire/height';
import { headingUv, SUNSPIRE as S, toWorld } from '../world/islands/sunspire/layout';
import { SUNSPIRE_STARFISH } from '../world/islands/sunspire/starfish';
import { sunspireTerrainRegions } from '../world/islands/sunspire/terrain-regions';
import { COURSE_BOARD_UV } from '../world/islands/sunspire/town';
import { arrivalCard, type IslandArrival } from './arrival';
import type { IslandEntry } from './types';

/**
 * Sunspire Sands (docs/specs/ISLAND-05-sunspire-sands.md §2.1, H1): in low toward the cove's mouth
 * with the town, both tables, the Sunspire and Red Butte ahead, into the cove past the ship, over the
 * quay to the bazaar, across to the oasis and the Weeping Wall, up over the Mirror Court, round the
 * Sunspire, and down to the captain on the quay.
 */
export const SUNSPIRE_ARRIVAL: IslandArrival = {
  id: 'sunspire',
  card: arrivalCard('sunspire', 'Sunspire Sands'),
  label: 'arrival:sunspire',
  keys: [...SUNSPIRE_ARRIVAL_KEYS],
  landingShot: H.landingShot,
  seconds: 30,
  cardAt: 0.6,
  cardFor: 6.4,
};

const board = toWorld(COURSE_BOARD_UV.u, COURSE_BOARD_UV.v);

/**
 * Sunspire Sands (Chapter 05), streamed in like Guildcrest when something needs it
 * (world/islands/sunspire/stream.ts). It opens once the captain holds Guildcrest's Seal.
 */
export const SUNSPIRE_ISLAND: IslandEntry = {
  id: 'sunspire',
  name: 'Sunspire Sands',
  flag: 'sunspire',
  berthLabel: 'Sunspire Sands',
  dockLabel: "Dock at Sunspire's quay",
  mooring: H.berth,
  departure: H.departure,
  // Up the quay to the caravanserai's gate and the town.
  landingHeading: H.landing.heading,
  quay: H.landing,
  music: 'sunspire',
  // The morning after Guildcrest (spec S3): a high hard sun that lights the town's fronts.
  sky: S.sky,
  mood: { fogScale: S.mood.fogScale, hazeTint: S.mood.hazeTint },
  // Guildcrest's late afternoon holds on the passage, then a "next morning" cut (as Keelhaven's).
  nextMorningAfter: 'guildcrest',
  arrival: SUNSPIRE_ARRIVAL,
  contains: (x, z) => x >= S.bounds.minX && x <= S.bounds.maxX && z >= S.bounds.minZ && z <= S.bounds.maxZ,
  center: S.center,
  skyReach: S.skyReach,
  // Open once the captain holds the Seal of Guildcrest (Chapter 04 done).
  open: { after: { island: 'guildcrest', condition: 'sealed' } },
  // ~2 800 m of sea to Guildcrest's shore: each is freed while you play on the other.
  ranges: S.ranges,
  // `npx tsx tools/islands/trace-coast.ts sunspire` (`measureFootprint`); a test keeps it in step.
  footprint: {
    x: S.center.x,
    z: S.center.z,
    radii: [
      396, 424, 432, 428, 436, 424, 416, 440, 424, 408, 380, 348, 344, 340, 348, 368, 392, 424, 428, 132, 100,
      232, 424, 424, 396, 384, 384, 372, 360, 356, 372, 384,
    ],
  },
  starfish: SUNSPIRE_STARFISH,
  courseBoard: {
    where: 'At the west entrance to the bazaar square, facing the lane up from the quay.',
    ...board,
    y: sunspireHeight(board.x, board.z),
    rot: headingUv(COURSE_BOARD_UV.fu, COURSE_BOARD_UV.fv),
  },
  chartLabelDy: 80,
  chart: {
    cx: S.center.x,
    cz: S.center.z,
    ...S.chart,
    // A coarse pack for the chart only: the full pack loads when the island streams in.
    pack: 'sunspire/chart',
    terrain: () => import('../world/islands/sunspire/chart').then((m) => m.SUNSPIRE_CHART_TERRAIN),
  },
  // "Sunspire Crossing", made for Sunspire Sands by Dan with Suno: desert caravan folk in D Phrygian
  // dominant (docs/specs/PHASE-3-islands-05-07.md §8).
  theme: { file: 'music_sunspire_crossing', lufs: -15.5 },
  terrainRegions: sunspireTerrainRegions,
  floraPalette: SUNSPIRE_FLORA_PALETTE,
  puzzles: { 'mirror-beams': 'circuit', 'sealed-crate': 'circuit', 'gear-song': 'ceremony' },
  market: { keeper: { npc: 'yusuf', name: 'Yusuf' }, lines: 'keepers' },
  stream: {
    nearLoads: 'always',
    courseData: 'chapter-part',
    // Its own ocean floor tile: the cove's shallows are outside the home tile.
    depthTile: true,
    reflected: false,
  },
  code: () => import('../game/sunspire-island').then((m) => m.SUNSPIRE_CODE),
};

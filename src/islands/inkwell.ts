import { INKWELL_ARRIVAL_KEYS } from '../world/islands/inkwell/arrival';
import { INKWELL_FLORA_PALETTE } from '../world/islands/inkwell/flora-palette';
import { INKWELL_HARBOR as H } from '../world/islands/inkwell/harbor';
import { inkwellHeight } from '../world/islands/inkwell/height';
import { headingUv, INKWELL as S, toWorld } from '../world/islands/inkwell/layout';
import { INKWELL_STARFISH } from '../world/islands/inkwell/starfish';
import { inkwellTerrainRegions } from '../world/islands/inkwell/terrain-regions';
import { COURSE_BOARD_UV } from '../world/islands/inkwell/town';
import { arrivalCard, type IslandArrival } from './arrival';
import type { IslandEntry } from './types';

/**
 * Inkwell Bluffs (docs/specs/ISLAND-06-inkwell-bluffs.md §2.1, H1): in low toward the cove's mouth
 * with the white town, the cliff and the Dome ahead, into the cove past the ship, up over the terraces
 * and the Gossip Stair to the Plaza, along the Kite Walk, round the Great Chart and the Dome, and down
 * to the captain on the quay.
 */
export const INKWELL_ARRIVAL: IslandArrival = {
  id: 'inkwell',
  card: arrivalCard('inkwell', 'Inkwell Bluffs'),
  label: 'arrival:inkwell',
  keys: [...INKWELL_ARRIVAL_KEYS],
  landingShot: H.landingShot,
  seconds: 30,
  cardAt: 0.6,
  cardFor: 6.4,
};

const board = toWorld(COURSE_BOARD_UV.u, COURSE_BOARD_UV.v);

/**
 * Inkwell Bluffs (Chapter 06), streamed in like Sunspire when something needs it
 * (world/islands/inkwell/stream.ts). It opens once the captain holds Sunspire's Seal.
 */
export const INKWELL_ISLAND: IslandEntry = {
  id: 'inkwell',
  name: 'Inkwell Bluffs',
  flag: 'inkwell',
  berthLabel: 'Inkwell Bluffs',
  dockLabel: "Dock at Inkwell's quay",
  mooring: H.berth,
  departure: H.departure,
  // Up the lane toward the taverna and the terraces.
  landingHeading: H.landing.heading,
  quay: H.landing,
  music: 'inkwell',
  // Golden hour (spec I4): a low western sun on the town's white fronts. The passage from Sunspire
  // runs the day forward to it (no cut).
  sky: S.sky,
  mood: { fogScale: S.mood.fogScale, hazeTint: S.mood.hazeTint },
  arrival: INKWELL_ARRIVAL,
  contains: (x, z) => x >= S.bounds.minX && x <= S.bounds.maxX && z >= S.bounds.minZ && z <= S.bounds.maxZ,
  center: S.center,
  skyReach: S.skyReach,
  // Open once the captain holds the Seal of Sunspire (Chapter 05 done).
  open: { after: { island: 'sunspire', condition: 'sealed' } },
  // ~2 100 m of sea to Sunspire's shore: each is freed while you play on the other.
  ranges: S.ranges,
  // `npx tsx tools/islands/trace-coast.ts inkwell` (`measureFootprint`); a test keeps it in step.
  footprint: {
    x: S.center.x,
    z: S.center.z,
    radii: [
      248, 284, 328, 360, 400, 412, 432, 428, 400, 372, 352, 320, 304, 312, 320, 332, 360, 392, 420, 132, 100,
      256, 388, 336, 288, 260, 228, 212, 208, 204, 268, 220,
    ],
  },
  starfish: INKWELL_STARFISH,
  courseBoard: {
    where: 'On the Washing Square, facing the head of the first flight of the Gossip Stair.',
    ...board,
    y: inkwellHeight(board.x, board.z),
    rot: headingUv(COURSE_BOARD_UV.fu, COURSE_BOARD_UV.fv),
  },
  chartLabelDy: 80,
  chart: {
    cx: S.center.x,
    cz: S.center.z,
    ...S.chart,
    // A coarse pack for the chart only: the full pack loads when the island streams in.
    pack: 'inkwell/chart',
    terrain: () => import('../world/islands/inkwell/chart').then((m) => m.INKWELL_CHART_TERRAIN),
  },
  // "Inkwell Waltz", made for Inkwell Bluffs by Dan with Suno: a Mediterranean seaside waltz in G
  // major (docs/specs/PHASE-3-islands-05-07.md §8).
  theme: { file: 'music_inkwell_waltz', lufs: -16.0 },
  terrainRegions: inkwellTerrainRegions,
  floraPalette: INKWELL_FLORA_PALETTE,
  puzzles: {
    'borrowed-board': 'circuit',
    'two-hands': 'circuit',
    'shared-chart': 'circuit',
    'board-song': 'ceremony',
  },
  market: { keeper: { npc: 'kosta', name: 'Kosta' }, lines: 'keepers' },
  stream: {
    nearLoads: 'always',
    courseData: 'chapter-part',
    // Its own ocean floor tile: the cove's shallows are outside the home tile.
    depthTile: true,
    reflected: false,
  },
  code: () => import('../game/inkwell-island').then((m) => m.INKWELL_CODE),
};

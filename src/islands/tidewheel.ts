import { TIDEWHEEL_ARRIVAL_KEYS } from '../world/islands/tidewheel/arrival';
import { TIDEWHEEL_FLORA_PALETTE } from '../world/islands/tidewheel/flora-palette';
import { TIDEWHEEL_HARBOR as H } from '../world/islands/tidewheel/harbor';
import { tidewheelHeight } from '../world/islands/tidewheel/height';
import { headingUv, TIDEWHEEL as S, toWorld } from '../world/islands/tidewheel/layout';
import { TIDEWHEEL_STARFISH } from '../world/islands/tidewheel/starfish';
import { tidewheelTerrainRegions } from '../world/islands/tidewheel/terrain-regions';
import { COURSE_BOARD_UV } from '../world/islands/tidewheel/town';
import { arrivalCard, type IslandArrival } from './arrival';
import type { IslandEntry } from './types';

/**
 * Tidewheel Caldera (docs/specs/ISLAND-07-tidewheel-caldera.md T3, T5): in low toward the breach with
 * the ring's wall across the view and the Lighthouse in the gap, through the breach under the Tide
 * Wheel, across the bay to the quay, up over the lamp-lit terraces to the Wheel Works, along the
 * Clock Walk, round the Lighthouse's clock, and down to the captain on the quay.
 */
export const TIDEWHEEL_ARRIVAL: IslandArrival = {
  id: 'tidewheel',
  card: arrivalCard('tidewheel', 'Tidewheel Caldera'),
  label: 'arrival:tidewheel',
  keys: [...TIDEWHEEL_ARRIVAL_KEYS],
  landingShot: H.landingShot,
  seconds: 30,
  cardAt: 0.6,
  cardFor: 6.4,
};

const board = toWorld(COURSE_BOARD_UV.u, COURSE_BOARD_UV.v);

/**
 * Tidewheel Caldera (Chapter 07), streamed in like Inkwell when something needs it
 * (world/islands/tidewheel/stream.ts). It opens once the captain holds Inkwell's Seal. Its own Seal
 * ends the voyage (the Long Light).
 */
export const TIDEWHEEL_ISLAND: IslandEntry = {
  id: 'tidewheel',
  name: 'Tidewheel Caldera',
  flag: 'tidewheel',
  berthLabel: 'Tidewheel Caldera',
  dockLabel: "Dock at Tidewheel's quay",
  mooring: H.berth,
  departure: H.departure,
  // Up the lane toward the Bandstand and the terraces.
  landingHeading: H.landing.heading,
  quay: H.landing,
  music: 'tidewheel',
  // Last light (spec T4): the sun stands in the breach. The passage from Inkwell runs the day forward
  // to it (no cut).
  sky: S.sky,
  mood: S.mood,
  arrival: TIDEWHEEL_ARRIVAL,
  contains: (x, z) => x >= S.bounds.minX && x <= S.bounds.maxX && z >= S.bounds.minZ && z <= S.bounds.maxZ,
  center: S.center,
  skyReach: S.skyReach,
  // Open once the captain holds the Seal of Inkwell (Chapter 06 done).
  open: { after: { island: 'inkwell', condition: 'sealed' } },
  // ~2 200 m of sea to Inkwell's shore: each is freed while you play on the other.
  ranges: S.ranges,
  // `npx tsx tools/islands/trace-coast.ts tidewheel` (`measureFootprint`); a test keeps it in step.
  footprint: {
    x: S.center.x,
    z: S.center.z,
    // (Nothing on the two bearings through the breach: the middle is in the bay.)
    radii: [
      304, 312, 308, 320, 316, 312, 316, 316, 316, 312, 316, 304, 312, 308, 308, 316, 316, 312, 312, 312, 0,
      0, 304, 312, 316, 316, 312, 312, 304, 308, 304, 308,
    ],
  },
  starfish: TIDEWHEEL_STARFISH,
  courseBoard: {
    where: 'On Gear Square, facing the head of the first flight of the Lamp Stair.',
    ...board,
    y: tidewheelHeight(board.x, board.z),
    rot: headingUv(COURSE_BOARD_UV.fu, COURSE_BOARD_UV.fv),
  },
  chartLabelDy: 80,
  chart: {
    cx: S.center.x,
    cz: S.center.z,
    ...S.chart,
    // A coarse pack for the chart only: the full pack loads when the island streams in.
    pack: 'tidewheel/chart',
    terrain: () => import('../world/islands/tidewheel/chart').then((m) => m.TIDEWHEEL_CHART_TERRAIN),
  },
  // "Tidewheel Lullaby", made for Tidewheel Caldera by Dan with Suno: a music-box lullaby with a slow
  // tide under it (docs/specs/PHASE-3-islands-05-07.md §8).
  theme: { file: 'music_tidewheel_lullaby', lufs: -15.3 },
  terrainRegions: tidewheelTerrainRegions,
  floraPalette: TIDEWHEEL_FLORA_PALETTE,
  puzzles: {
    'the-lever': 'circuit',
    'gears-and-bells': 'circuit',
    'drum-song': 'ceremony',
  },
  market: { keeper: { npc: 'dot', name: 'Dot' }, lines: 'keepers' },
  stream: {
    nearLoads: 'always',
    courseData: 'chapter-part',
    // Its own ocean floor tile: the bay's shallows are outside the home tile.
    depthTile: true,
    reflected: false,
  },
  code: () => import('../game/tidewheel-island').then((m) => m.TIDEWHEEL_CODE),
};

import { GUILDCREST_ARRIVAL_KEYS } from '../world/islands/guildcrest/arrival';
import { GUILDCREST_FLORA_PALETTE } from '../world/islands/guildcrest/flora-palette';
import { GUILDCREST_HARBOR as H } from '../world/islands/guildcrest/harbor';
import { guildcrestHeight } from '../world/islands/guildcrest/height';
import { GUILDCREST as G, headingUv, toWorld } from '../world/islands/guildcrest/layout';
import { GUILDCREST_STARFISH } from '../world/islands/guildcrest/starfish';
import { guildcrestTerrainRegions } from '../world/islands/guildcrest/terrain-regions';
import { COURSE_BOARD_UV } from '../world/islands/guildcrest/town';
import { arrivalCard, type IslandArrival } from './arrival';
import type { IslandEntry } from './types';

/**
 * Guildcrest (docs/specs/ISLAND-04-guildcrest.md §10.5, in the as-built island frame): in low toward
 * the sea loch's mouth with the town, the bell tower, the mills and the ben ahead, into the loch past
 * the ship, over the quay to the square and the linn, up the brae over the cloister, along the ridge
 * past the turning mills, round the bell tower, and down to the captain on the quay.
 */
export const GUILDCREST_ARRIVAL: IslandArrival = {
  id: 'guildcrest',
  card: arrivalCard('guildcrest', 'Guildcrest'),
  label: 'arrival:guildcrest',
  keys: [...GUILDCREST_ARRIVAL_KEYS],
  landingShot: H.landingShot,
  seconds: 30,
  cardAt: 0.6,
  cardFor: 6.4,
};

const board = toWorld(COURSE_BOARD_UV.u, COURSE_BOARD_UV.v);

/**
 * Guildcrest (Chapter 04), streamed in like Keelhaven when something needs it
 * (world/islands/guildcrest/stream.ts). It opens once the captain holds Keelhaven's Seal.
 */
export const GUILDCREST_ISLAND: IslandEntry = {
  id: 'guildcrest',
  name: 'Guildcrest',
  flag: 'guildcrest',
  berthLabel: 'Guildcrest',
  dockLabel: "Dock at Guildcrest's quay",
  mooring: H.berth,
  departure: H.departure,
  // Up the quay to the inn and the town.
  landingHeading: H.landing.heading,
  quay: H.landing,
  music: 'guildcrest',
  // Late afternoon, clear and cool (spec G4): the sun low in the west-south-west.
  sky: G.sky,
  mood: { fogScale: G.mood.fogScale, hazeTint: G.mood.hazeTint },
  arrival: GUILDCREST_ARRIVAL,
  contains: (x, z) => x >= G.bounds.minX && x <= G.bounds.maxX && z >= G.bounds.minZ && z <= G.bounds.maxZ,
  center: G.center,
  skyReach: G.skyReach,
  // Open once the captain holds the Seal of Keelhaven (Chapter 03 done).
  open: { after: { island: 'keelhaven', condition: 'sealed' } },
  // ~2 000 m of sea to Keelhaven's shore: each is freed while you play on the other.
  ranges: G.ranges,
  // `measureFootprint(guildcrestHeightDry, …, 32, 900)`; a test keeps it in step.
  footprint: {
    x: G.center.x,
    z: G.center.z,
    radii: [
      376, 404, 412, 424, 416, 412, 420, 424, 392, 388, 368, 352, 328, 328, 324, 344, 356, 392, 400, 396, 96,
      232, 400, 404, 408, 380, 356, 332, 332, 324, 332, 344,
    ],
  },
  starfish: GUILDCREST_STARFISH,
  courseBoard: {
    where: 'At the west entrance to Guild Square, facing the lane up from the quay.',
    ...board,
    y: guildcrestHeight(board.x, board.z),
    rot: headingUv(COURSE_BOARD_UV.fu, COURSE_BOARD_UV.fv),
  },
  chartLabelDy: 80,
  chart: {
    cx: G.center.x,
    cz: G.center.z,
    ...G.chart,
    // A coarse pack for the chart only: the full pack loads when the island streams in.
    pack: 'guildcrest/chart',
    terrain: () => import('../world/islands/guildcrest/chart').then((m) => m.GUILDCREST_CHART_TERRAIN),
  },
  // "Harp's Return", made for Guildcrest by Dan with Suno: pastoral Celtic folk in D Dorian.
  theme: { file: 'music_harps_return', lufs: -15.6 },
  terrainRegions: guildcrestTerrainRegions,
  floraPalette: GUILDCREST_FLORA_PALETTE,
  puzzles: { 'pattern-book': 'circuit', toolbelt: 'circuit', 'song-chart': 'ceremony' },
  market: { keeper: { npc: 'moira', name: 'Moira' }, lines: 'keepers' },
  stream: {
    nearLoads: 'always',
    courseData: 'chapter-part',
    // Its own ocean floor tile: the loch's shallows are outside the home tile.
    depthTile: true,
    reflected: false,
  },
  code: () => import('../game/guildcrest-island').then((m) => m.GUILDCREST_CODE),
};

/**
 * Sunspire Sands (island 05, course Chapter 05): every number of the island's layout, as plain data
 * (docs/specs/ISLAND-05-sunspire-sands.md §3). No three.js here: tests, tools and the bake may
 * import it.
 *
 * A red desert island: a cove cut in from the north-west with an adobe port on its north-east
 * shore, the bazaar square on a shelf above it, an oasis under a weeping red wall, the Low Mesa (the
 * Signal House, the Mirror Court, the Crate Yard), the High Mesa with the Sunspire, Red Butte behind
 * them, dunes down the south-west, and Library Rock off the north-east coast.
 *
 * Conventions: metres; x east, z south, y up; sea level y 0. The island frame: `u` along bearing 143°
 * (from the cove's mouth inland), `v` along bearing 53° (v > 0 is the cove's north-east shore, the
 * town's side). Its origin is the island's centre.
 */

import {
  COVE_BERTH,
  COVE_DEPARTURE,
  COVE_LANDING,
  COVE_LANE,
  COVE_QUAY,
  COVE_STATIONS,
} from '../cove-harbour';
import { islandFrame } from '../frame';

export type { Uv, Uvy } from '../frame';

/** The island's middle (world). */
const CENTER = { x: 6565, z: 3380 } as const;

/** The island frame: `u` along bearing 143°, `v` along bearing 53°, round the island's middle. */
export const FRAME_KIT = islandFrame(CENTER, 143);
export const { FRAME, toFrame, toWorld, headingUv, headingBetween } = FRAME_KIT;

export const SUNSPIRE = {
  /** The island's middle (for distances and the chart). */
  center: CENTER,
  /** Baked height data; the ground falls to the deep floor (−58) at every edge. */
  bounds: { minX: 5935, maxX: 7195, minZ: 2725, maxZ: 4035, cell: 2 },
  deepDepth: 58,
  seabedRadius: 1000,

  /**
   * The coast: an oval in the frame (half-axes `halfU` × `halfV` round `centerU`; `power` > 2 makes
   * the sides straighter) whose edge wanders `noise` m over about `noiseScale` m, and `ragged` m over
   * a short scale.
   */
  coast: { centerU: 0, halfU: 430, halfV: 350, power: 2.5, noise: 30, noiseScale: 150, ragged: 8 },

  /**
   * Sky (spec S3, as built §12): the morning after Guildcrest, a high hard sun (59° up). `azimuth` 150
   * puts it on bearing 255°: it lights the town's fronts (they face the cove) and rakes the tables'
   * north-west walls, which is what the landing looks at.
   */
  sky: { hours: 10.0, azimuth: 150 },
  mood: { fogScale: 1.2, hazeTint: [1.0, 0.95, 0.86] as const },

  /** How far its parts stream and show (footprintDistance). */
  ranges: { load: 1300, show: 1100, unload: 1550, detail: 600 },
  skyReach: { reach: 1300, full: 800 },

  /** Its terrain mesh: mesa walls are steep, so the far levels are prefiltered; one block from the sea. */
  terrain: {
    maxMergedTriangles: 24_000,
    prefilter: false,
    morphFrames: 24,
    seabed: { below: -15, level: 2 },
  },

  /**
   * The chart miniature's sampled box (a coarse pack): the land, Library Rock and their shallows, no
   * wider (the opening chart's cartouche is close to the island's place on the sheet).
   */
  chart: { minX: 6070, maxX: 7040, minZ: 2880, maxZ: 3880, cell: 12, scale: 1 / 10000 },
} as const;

/** The harbour is the shared cove (`cove-harbour.ts`): the quay, the berth, the lane and the cove itself. */
export const QUAY = COVE_QUAY;
export const BERTH = COVE_BERTH;
export const DEPARTURE = COVE_DEPARTURE;
export const LANDING = COVE_LANDING;
export const LANE = COVE_LANE;
export const COVE = COVE_STATIONS;

/** The harbour town (adobe houses on terraced pads between the quay and the square). */
export const TOWN = { u0: -205, u1: -70, v0: 20, v1: 100 } as const;

/** The caravanserai (the inn) at the quay's head: a courtyard behind a gate. */
export const CARAVANSERAI = { u: -162, v: 50, y: 3.4, halfU: 10, halfV: 8 } as const;

/** The bazaar square: centre, half-size (u × v), its pad height. */
export const SQUARE = { u: -100, v: 50, halfU: 20, halfV: 15, y: 8 } as const;

/** The lane from the quay up past the caravanserai to the square's west side. */
export const QUAY_LANE = [
  { u: -190, v: 18, y: QUAY.top },
  { u: -172, v: 30, y: 2.6 },
  { u: -150, v: 36, y: 4 },
  { u: -132, v: 42, y: 6 },
  { u: SQUARE.u - SQUARE.halfU, v: SQUARE.v - 4, y: SQUARE.y },
] as const;

/** The oasis camp and its well, in the hollow south of the square. */
export const CAMP = { u: -30, v: -8, y: 8.6, r: 11 } as const;
export const WELL = { u: -40, v: -20, y: 8.6 } as const;

/** The path from the square down to the camp. */
export const OASIS_PATH = [
  { u: SQUARE.u + SQUARE.halfU, v: SQUARE.v - 8, y: SQUARE.y },
  { u: -66, v: 28, y: 8.4 },
  { u: -48, v: 8, y: 8.6 },
  { u: CAMP.u, v: CAMP.v, y: CAMP.y },
] as const;

/**
 * Fresh water (spec S13): the cistern (a spring) by the Low Mesa's south rim; a short run along a
 * slot in the rim to the Weeping Wall's lip at the mesa's south-west corner; the fall into the oasis
 * pool at the wall's foot; the falaj (a stone channel) from the pool to the cove's head.
 */
export const WATER = {
  cistern: { u: 64, v: -6, r: 8, y: 27.2 },
  canyon: [
    [52, -10],
    [42, -14],
  ] as const,
  fallLip: { u: 31, v: -17, y: 26.6 },
  pool: { u: 10, v: -28, r: 13, y: 8.2 },
  falaj: [
    [-6, -30],
    [-30, -32],
    [-60, -28],
    [-92, -18],
    [-110, -10],
    [-124, -4],
  ] as const,
} as const;

/** The Low Mesa (the signal mesa): its plateau (frame box) and height. */
export const LOW_MESA = { u0: 30, u1: 150, v0: -20, v1: 110, y: 28 } as const;

/** The Signal Stair: the ramp from the square up the Low Mesa's north-west corner. */
export const SIGNAL_STAIR = [
  { u: -80, v: 62, y: 8 },
  { u: -50, v: 84, y: 14 },
  { u: -10, v: 96, y: 21 },
  { u: 30, v: 92, y: LOW_MESA.y },
] as const;

/** The Signal House on the Low Mesa, where the stair comes up. */
export const SIGNAL_HOUSE = { u: 50, v: 86, y: LOW_MESA.y, halfU: 7, halfV: 5 } as const;

/** The Mirror Court (P5.1): a paved court with three mirror stands and the chart tent. */
export const COURT = { u: 84, v: 60, halfU: 18, halfV: 14, y: LOW_MESA.y } as const;

/** The Crate Yard (P5.2) and the caravan road's arch. */
export const YARD = { u: 120, v: 20, halfU: 16, halfV: 12, y: LOW_MESA.y } as const;

/** The mesa-top path: Signal House → court → yard → the Sun Stair's foot. */
export const MESA_PATH = [
  { u: 30, v: 92, y: LOW_MESA.y },
  { u: SIGNAL_HOUSE.u, v: SIGNAL_HOUSE.v - 8, y: LOW_MESA.y },
  { u: COURT.u - 6, v: COURT.v + COURT.halfV, y: LOW_MESA.y },
  { u: COURT.u + COURT.halfU, v: COURT.v - 6, y: LOW_MESA.y },
  { u: YARD.u - 4, v: YARD.v + YARD.halfV, y: LOW_MESA.y },
  { u: 136, v: 34, y: LOW_MESA.y },
] as const;

/** The High Mesa (the Sunspire's table). */
export const HIGH_MESA = { u0: 150, u1: 250, v0: 30, v1: 130, y: 56 } as const;

/**
 * The Sun Stair: stone steps cut into the High Mesa's west wall, north along it from the Crate Yard's
 * corner, then east onto its top.
 */
export const SUN_STAIR = [
  { u: 136, v: 34, y: LOW_MESA.y },
  { u: 144, v: 44, y: 31 },
  { u: 146, v: 70, y: 40 },
  { u: 146, v: 96, y: 50 },
  { u: 152, v: 110, y: HIGH_MESA.y },
  { u: 165, v: 104, y: HIGH_MESA.y },
] as const;

/** The Sundial Terrace at the stair's top, west of the tower (the Trial and the Seal). */
export const TERRACE = { u: 176, v: 98, y: HIGH_MESA.y, r: 9 } as const;

/** The Sunspire: its footprint (side) round its centre, base and top; its great mirror's height. */
export const SPIRE = { u: 198, v: 96, side: 10, base: HIGH_MESA.y, top: 104, mirror: 98 } as const;

/** The Needle: a butte north of the town with a relay mirror (the beam's second hop). */
export const NEEDLE = { u: -30, v: 150, y: 34, r: 16 } as const;

/** Library Rock: a sea stack off the north-east coast with a white-domed light (the beam's far end). */
export const LIBRARY_ROCK = { u: -120, v: 520, y: 34, r: 26 } as const;

/** Red Butte: the flat-topped massif behind the mesas (the skyline). */
export const BUTTE = { u: 300, v: -110, y: 140, r: 120 } as const;

/** The dune field down the south-west side. */
export const DUNES = { u0: -220, u1: 230, v0: -330, v1: -95, crest: 14 } as const;

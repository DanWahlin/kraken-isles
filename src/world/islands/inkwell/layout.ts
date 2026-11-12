/**
 * Inkwell Bluffs (island 06, course Chapter 06): every number of the island's layout, as plain data
 * (docs/specs/ISLAND-06-inkwell-bluffs.md §3). No three.js here: tests, tools and the bake may
 * import it.
 *
 * A white-cliff island: a cove cut in from the north-west with a whitewashed port on its north-east
 * shore, the town on three terraces above the quay, the Gossip Stair up through them to the Plaza on
 * the bluff's rim, the Kite Walk along the sea cliff to the Chart Court, the Dome on the highest
 * head, a green valley and a long beach down the south-west, and white stacks off the cliff.
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
const CENTER = { x: 7170, z: 6215 } as const;

/** The island frame: `u` along bearing 143°, `v` along bearing 53°, round the island's middle. */
export const FRAME_KIT = islandFrame(CENTER, 143);
export const { FRAME, toFrame, toWorld, headingUv, headingBetween } = FRAME_KIT;

export const INKWELL = {
  /** The island's middle (for distances and the chart). */
  center: CENTER,
  /** Baked height data; the ground falls to the deep floor (−58) at every edge. */
  bounds: { minX: 6540, maxX: 7800, minZ: 5560, maxZ: 6870, cell: 2 },
  deepDepth: 58,
  seabedRadius: 1000,

  /**
   * The coast: an oval in the frame (half-axes `halfU` × `halfV` round (`centerU`, `centerV`);
   * `power` > 2 makes the sides straighter) whose edge wanders `noise` m over about `noiseScale` m,
   * and `ragged` m over a short scale. Its middle is south-west of the frame's, so the north-east
   * coast (the sea cliff) is close behind the town.
   */
  coast: {
    centerU: 0,
    centerV: -50,
    halfU: 420,
    halfV: 260,
    power: 2.4,
    noise: 20,
    noiseScale: 140,
    ragged: 7,
  },

  /**
   * Sky (spec I4, as built §12): golden hour on the day of Sunspire's morning (the passage runs the
   * day forward). At 17.3 h the sun is 12° up; `azimuth` −12 puts it on bearing 262°, so it lights the
   * town's fronts (they face the cove) and the bluff's white wall, and it is behind the captain at the
   * landing.
   */
  sky: { hours: 17.3, azimuth: -12 },
  mood: { fogScale: 1.1, hazeTint: [1.0, 0.9, 0.78] as const },

  /** How far its parts stream and show (footprintDistance). */
  ranges: { load: 1300, show: 1100, unload: 1550, detail: 600 },
  skyReach: { reach: 1300, full: 800 },

  /** Its terrain mesh: the cliffs are steep; one block from the sea. */
  terrain: {
    maxMergedTriangles: 24_000,
    prefilter: false,
    morphFrames: 24,
    seabed: { below: -15, level: 2 },
  },

  /** The chart miniature's sampled box (a coarse pack): the land, the stacks and their shallows. */
  chart: { minX: 6690, maxX: 7650, minZ: 5730, maxZ: 6700, cell: 12, scale: 1 / 10000 },
} as const;

/** The harbour is the shared cove (`cove-harbour.ts`): the quay, the berth, the lane and the cove itself. */
export const QUAY = COVE_QUAY;
export const BERTH = COVE_BERTH;
export const DEPARTURE = COVE_DEPARTURE;
export const LANDING = COVE_LANDING;
export const LANE = COVE_LANE;
export const COVE = COVE_STATIONS;

/**
 * The town's three terraces above the quay (spec §3): each a level strip along the cove (its `v`
 * range and height), with a white rock riser up to the next. They run from `TOWN.u0` to `TOWN.u1`.
 */
export const TOWN = { u0: -215, u1: -40, v0: 20, v1: 96 } as const;
export const TERRACES = [
  { v0: 26, v1: 46, y: 3.4 },
  { v0: 52, v1: 68, y: 11 },
  { v0: 74, v1: 92, y: 19 },
] as const;

/** The taverna at the quay's head: a terrace with a pergola (Lyra and her players under it). */
export const TAVERNA = { u: -150, v: 40, y: 3.4, halfU: 9, halfV: 6 } as const;

/** The Washing Square: the Gossip Stair's first landing, on the second terrace. */
export const SQUARE = { u: -112, v: 61, halfU: 10, halfV: 6.5, y: 11 } as const;

/** The lane from the quay along the first terrace, past the taverna, to the stair's foot. */
export const QUAY_LANE = [
  { u: -190, v: 18, y: QUAY.top },
  // Level across the quay's paved apron, then up onto the first terrace.
  { u: -183, v: 24.5, y: QUAY.top },
  { u: -177, v: 28.4, y: 3.4 },
  { u: -164, v: 30, y: 3.4 },
  { u: -140, v: 30, y: 3.4 },
  { u: -132, v: 42, y: 3.4 },
] as const;

/** The bluff's level at the Plaza. */
const RIM = 27;

/**
 * The Gossip Stair: three flights up through the terraces to the Plaza, with a landing on each
 * terrace (the first is the Washing Square).
 */
export const GOSSIP_STAIR = [
  { u: -132, v: 42, y: 3.4 },
  { u: -120, v: 60, y: 11 },
  { u: -104, v: 62, y: 11 },
  { u: -92, v: 80, y: 19 },
  { u: -76, v: 82, y: 19 },
  { u: -64, v: 100, y: RIM },
  { u: -60, v: 108, y: RIM },
] as const;

/**
 * The bluff: a rounded band of high ground along the north-east coast, as a line of discs (their
 * middle, radius and top). Its sea side is the cliff; its land side is a white wall over green slopes.
 */
export const BLUFF = [
  // Level under the Plaza, the Loggia and the Draughting Terrace.
  { u: -60, v: 150, r: 56, y: RIM },
  { u: -24, v: 152, r: 50, y: RIM },
  // The Kite Walk's rise.
  { u: 20, v: 158, r: 40, y: 30 },
  { u: 70, v: 158, r: 36, y: 37 },
  // Level under the Chart Court.
  { u: 108, v: 146, r: 40, y: 44 },
  { u: 134, v: 140, r: 46, y: 44 },
  { u: 170, v: 124, r: 36, y: 44 },
] as const;

/** The Plaza on the bluff's rim, where the stair comes up: the four instrument desks at its corners. */
export const PLAZA = { u: -46, v: 124, halfU: 20, halfV: 16, y: RIM } as const;

/** The Loggia (P6.1): the visiting guild's board under a colonnade, west of the Plaza. */
export const LOGGIA = { u: -80, v: 134, halfU: 8, halfV: 6, y: RIM } as const;

/** The Draughting Terrace (P6.2), north of the Plaza toward the cliff. */
export const DRAUGHT = { u: -40, v: 158, halfU: 11, halfV: 7, y: RIM } as const;

/** The Chart Court (P6.3): the Great Chart laid in its floor, at the Dome's foot. */
export const COURT = { u: 134, v: 132, halfU: 24, halfV: 18, y: 44 } as const;

/** The Great Chart in the court's floor: its middle and half-size. */
export const GREAT_CHART = { u: COURT.u - 2, v: COURT.v - 1, halfU: 15, halfV: 11 } as const;

/** The plaza's paths: the stair's head → the Plaza; the Plaza → the Loggia; the Plaza → the terrace. */
export const PLAZA_PATHS = [
  [
    { u: -60, v: 108, y: RIM },
    { u: PLAZA.u - 12, v: PLAZA.v - PLAZA.halfV + 3, y: RIM },
  ],
  [
    { u: PLAZA.u - PLAZA.halfU, v: PLAZA.v + 6, y: RIM },
    { u: LOGGIA.u + LOGGIA.halfU, v: LOGGIA.v - 2, y: RIM },
  ],
  [
    { u: PLAZA.u + 4, v: PLAZA.v + PLAZA.halfV, y: RIM },
    { u: DRAUGHT.u + 2, v: DRAUGHT.v - DRAUGHT.halfV, y: RIM },
  ],
] as const;

/** The Kite Walk: along the cliff's edge from the Plaza to the Chart Court. */
export const KITE_WALK = [
  { u: PLAZA.u + PLAZA.halfU, v: PLAZA.v + 4, y: RIM },
  { u: 20, v: 140, y: 30 },
  { u: 70, v: 146, y: 37 },
  { u: COURT.u - COURT.halfU, v: COURT.v + 6, y: COURT.y },
] as const;

/** The Dome head: the highest table, a round top over the Chart Court. */
export const DOME_HEAD = { u: 214, v: 100, r: 30, y: 62 } as const;

/** The Dome Stair: stone steps from the Chart Court's corner up the head's wall. */
export const DOME_STAIR = [
  { u: COURT.u + COURT.halfU, v: COURT.v - 6, y: COURT.y },
  { u: 176, v: 116, y: 51.5 },
  { u: 192, v: 110, y: 58.5 },
  { u: 200, v: 104, y: DOME_HEAD.y },
] as const;

/** The Dome's terrace at the stair's top, west of the tower (the Trial and the Seal). */
export const TERRACE = { u: 207, v: 100, y: DOME_HEAD.y, r: 9 } as const;

/**
 * The Surveyor's Dome: a round white tower. Its radius, base, the lamp gallery, the dome's top and
 * the tip of the brass quill (the weathervane).
 */
export const DOME = { u: 226, v: 94, r: 6.5, base: DOME_HEAD.y, gallery: 79, top: 90, quill: 98 } as const;

/** The Quills: white sea stacks off the cliff, and the Old Quill by the cove's mouth. */
export const STACKS = [
  { u: 60, v: 252, r: 10, y: 30 },
  { u: 100, v: 266, r: 12, y: 42 },
  { u: 150, v: 250, r: 8, y: 22 },
  { u: -350, v: 196, r: 11, y: 36 },
] as const;

/** Olive Hill: a low rounded hill in the south of the valley (the skyline from the south and the west). */
export const HILL = { u: 120, v: -120, r: 170, y: 30 } as const;

/** The valley south-west of the bluff: meadow, olives and cypress down to the long beach. */
export const VALLEY = { u0: -90, u1: 260, v0: -260, v1: 70 } as const;

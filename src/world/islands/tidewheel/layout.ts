/**
 * Tidewheel Caldera (island 07, course Chapter 07): every number of the island's layout, as plain
 * data (docs/specs/ISLAND-07-tidewheel-caldera.md §3). No three.js here: tests, tools and the bake
 * may import it.
 *
 * A drowned volcano: a ring wall of black rock round a bay, open to the sea by one breach on the
 * north-west. The ship comes through the breach, under the Tide Wheel on its north jaw, with the
 * Clockwork Lighthouse dead ahead on a spur at the bay's head. The port is on the bay's north-east
 * shore; the town climbs the crater's inner wall on three terraces; the Wheel Works and the Clock
 * Court stand on ledges above it, and a walk along the wall leads to the Lighthouse. The bay's south
 * shore is a black sand beach with hot springs.
 *
 * Conventions: metres; x east, z south, y up; sea level y 0. The island frame: `u` along bearing 143°
 * (from the breach inland), `v` along bearing 53° (v > 0 is the bay's north-east shore, the town's
 * side). The frame's origin is where the shared cove harbour puts it; the island's middle is the
 * ring's (`RING`), 262 m back down the axis.
 */

import {
  COVE_BERTH,
  COVE_DEPARTURE,
  COVE_LANDING,
  COVE_LANE,
  COVE_QUAY,
  type CoveStations,
} from '../cove-harbour';
import { islandFrame } from '../frame';

export type { Uv, Uvy } from '../frame';

/** The frame's origin (world). */
const ORIGIN = { x: 7956, z: 9241 } as const;

/** The island frame: `u` along bearing 143°, `v` along bearing 53°. */
export const FRAME_KIT = islandFrame(ORIGIN, 143);
export const { FRAME, toFrame, toWorld, headingUv, headingBetween } = FRAME_KIT;

/**
 * The ring: its middle (frame), the crest's distance from it, how far in the wall's foot is, and the
 * breach: a gap on the −u side (the lane's line), clear within `gap` degrees of it and full height by
 * `full` degrees.
 */
export const RING = {
  u: -262,
  v: -30,
  crest: 262,
  foot: 222,
  /** The crest's height: lowest behind the Lighthouse (it must stand against the sky), highest north and south. */
  low: 50,
  high: 84,
  breach: { gap: 10, full: 17 },
} as const;

const MIDDLE = toWorld(RING.u, RING.v);

export const TIDEWHEEL = {
  /** The island's middle: the ring's (for distances, the chart and its footprint). */
  center: { x: Math.round(MIDDLE.x), z: Math.round(MIDDLE.z) },
  /** Baked height data; the ground falls to the deep floor (−58) at every edge. */
  bounds: { minX: 7145, maxX: 8405, minZ: 8395, maxZ: 9705, cell: 2 },
  deepDepth: 58,
  seabedRadius: 1000,

  /** The coast: a circle round the ring's middle, 50 m outside its crest, whose edge wanders. */
  coast: {
    centerU: RING.u,
    centerV: RING.v,
    halfU: 312,
    halfV: 312,
    power: 2,
    noise: 14,
    noiseScale: 120,
    ragged: 6,
  },

  /**
   * Sky (spec T4): last light. At 17.6 h the sun is 8° up; `azimuth` puts it on bearing 323°, in the
   * breach, so it comes through the gap along the lane and lights the quay, the lower town and the
   * Lighthouse while the ring's wall shades the rest of the crater.
   */
  sky: { hours: 17.6, azimuth: 46 },
  // (The sky's fill and the exposure are up: most of the crater is in the wall's shade.)
  mood: { fogScale: 1.15, hazeTint: [1.0, 0.82, 0.74] as const, fill: 2.3, exposure: 1.3 },

  /** How far its parts stream and show (footprintDistance). */
  ranges: { load: 1300, show: 1100, unload: 1550, detail: 600 },
  skyReach: { reach: 1300, full: 800 },

  /** Its terrain mesh: the wall is steep; one block from the sea. */
  terrain: {
    maxMergedTriangles: 24_000,
    prefilter: false,
    morphFrames: 24,
    seabed: { below: -15, level: 2 },
  },

  /** The chart miniature's sampled box (a coarse pack): the ring and the rock light. */
  chart: { minX: 7295, maxX: 8255, minZ: 8565, maxZ: 9535, cell: 12, scale: 1 / 10000 },
} as const;

/** The harbour is the shared cove's (`cove-harbour.ts`): the quay, the berth and the lane. */
export const QUAY = COVE_QUAY;
export const BERTH = COVE_BERTH;
export const DEPARTURE = COVE_DEPARTURE;
export const LANDING = COVE_LANDING;
export const LANE = COVE_LANE;

/**
 * The bay and its breach: stations along u, each with its two shores (v) at the waterline and its
 * floor. The open sea, the breach's throat (100 m wide round the lane's line), then the round bay
 * and the shared harbour's last four stations (the quay's shore and the head).
 */
export const COVE: CoveStations = [
  { u: -640, vMin: -190, vMax: 130, floor: -22 },
  { u: -585, vMin: -120, vMax: 60, floor: -18 },
  { u: -530, vMin: -92, vMax: 32, floor: -14 },
  { u: -480, vMin: -96, vMax: 30, floor: -12 },
  { u: -420, vMin: -150, vMax: 26, floor: -11 },
  { u: -330, vMin: -176, vMax: 24, floor: -11 },
  { u: -255, vMin: -168, vMax: 15, floor: -9 },
  { u: -175, vMin: -120, vMax: 12.5, floor: -7.5 },
  { u: -140, vMin: -88, vMax: 10, floor: -4 },
  { u: -122, vMin: -58, vMax: 4, floor: -1.5 },
];

/**
 * The town's three terraces on the inner wall above the quay (spec §3): each a level strip along the
 * bay (its `v` range and height) with a wall of black rock up to the next.
 */
export const TOWN = { u0: -222, u1: -84, v0: 20, v1: 96 } as const;
export const TERRACES = [
  { v0: 26, v1: 46, y: 3.4 },
  { v0: 52, v1: 68, y: 11 },
  { v0: 74, v1: 92, y: 19 },
] as const;

/** The Bandstand at the quay's head: a round stage with a canopy (Lyra, her players, the music-box drum). */
export const BANDSTAND = { u: -150, v: 40, y: 3.4, halfU: 9, halfV: 6 } as const;

/** Gear Square: the Lamp Stair's first landing, on the second terrace (the four great gears). */
export const SQUARE = { u: -112, v: 61, halfU: 10, halfV: 6.5, y: 11 } as const;

/** The lane from the quay along the first terrace, past the Bandstand, to the stair's foot. */
export const QUAY_LANE = [
  { u: -190, v: 18, y: QUAY.top },
  // Level across the quay's paved apron, then up onto the first terrace.
  { u: -183, v: 24.5, y: QUAY.top },
  { u: -177, v: 28.4, y: 3.4 },
  { u: -164, v: 30, y: 3.4 },
  { u: -140, v: 30, y: 3.4 },
  { u: -132, v: 42, y: 3.4 },
] as const;

/** The Works' level, the Clock Court's and the Lighthouse terrace's. */
const WORKS_Y = 27;
const COURT_Y = 36;
const LIGHT_Y = 46;

/**
 * The Lamp Stair: two flights up through the terraces (the first landing is Gear Square).
 */
export const LAMP_STAIR = [
  { u: -132, v: 42, y: 3.4 },
  { u: -120, v: 60, y: 11 },
  { u: -104, v: 62, y: 11 },
  { u: -92, v: 80, y: 19 },
  { u: -100, v: 84, y: 19 },
] as const;

/** Bounty Corner: the bounty board on the third terrace, between the two stairs. */
export const BOUNTY = { u: -108, v: 84, y: 19 } as const;

/** The Works Stair: one flight from the third terrace up to the Wheel Works. */
export const WORKS_STAIR = [
  { u: -100, v: 84, y: 19 },
  { u: -118, v: 88, y: 19 },
  { u: -126, v: 109, y: WORKS_Y },
  { u: -126, v: 113, y: WORKS_Y },
] as const;

/** The Wheel Works (P7.1): a walled yard on a ledge above the town. */
export const WORKS = { u: -136, v: 123, halfU: 15, halfV: 11, y: WORKS_Y } as const;

/** The Clock Walk: a lamp-lit ledge along the inner wall from the Works to the Clock Court. */
export const CLOCK_WALK = [
  { u: WORKS.u + WORKS.halfU, v: WORKS.v + 1, y: WORKS_Y },
  { u: -104, v: 118, y: 30 },
  { u: -88, v: 102, y: 33 },
  { u: -76, v: 78, y: 35.5 },
  { u: -68, v: 63, y: COURT_Y },
] as const;

/** The Clock Court (P7.2), under the Lighthouse's clock face; the Bell Arch stands on its north side. */
export const COURT = { u: -66, v: 52, halfU: 13, halfV: 11, y: COURT_Y } as const;

/** The Bell Arch: twelve bells in a stone arch across the court's north end. */
export const BELL_ARCH = { u: -66, v: 60.5, span: 9 } as const;

/** The Light Walk: from the Clock Court along the wall up to the Lighthouse's terrace. */
export const LIGHT_WALK = [
  { u: -66, v: COURT.v - COURT.halfV, y: COURT_Y },
  { u: -60, v: 18, y: 41 },
  { u: -54, v: -4, y: LIGHT_Y },
  { u: -50, v: -16, y: LIGHT_Y },
] as const;

/**
 * The spur the Lighthouse stands on: a round shoulder of the ring's wall at the bay's head, on the
 * lane's line.
 */
export const SPUR = { u: -40, v: -28, r: 22, y: LIGHT_Y } as const;

/** The Lighthouse's terrace, west of the tower (the Trial, the last lever and the Seal). */
export const TERRACE = { u: -49, v: -26, y: LIGHT_Y, r: 10 } as const;

/**
 * The Clockwork Lighthouse: a round stone base, an open brass frame of gears, the clock (its face to
 * the bay, along −u), the lamp room, its cap and the vane's tip.
 */
export const LIGHTHOUSE = {
  u: -34,
  v: -31,
  r: 5.5,
  base: LIGHT_Y,
  gears: 60,
  clock: 64,
  lamp: 71,
  cap: 76,
  top: 84,
} as const;

/** The Tide Wheel on the breach's north jaw: its hub (frame, y) and radius; its plane lies along u. */
export const WHEEL = { u: -505, v: 33, y: 9, r: 13 } as const;

/** The hot springs: three stepped pools on a bench above the black sand beach. */
export const SPRINGS = [
  { u: -300, v: -236, r: 7, y: 6 },
  { u: -286, v: -229, r: 5.5, y: 4.6 },
  { u: -275, v: -221, r: 4.5, y: 3.4 },
] as const;

/** The beach path: from the lane's end round the bay's head and along the south shore to the springs. */
export const BEACH_PATH = [
  { u: -140, v: 30, y: 3.4 },
  { u: -112, v: 22, y: 2.6 },
  { u: -99, v: 4, y: 2.2 },
  { u: -99, v: -36, y: 2.2 },
] as const;

/** The rock light: a beacon on a skerry outside the breach (it burns when the bay sleeps). */
export const ROCK_LIGHT = { u: -650, v: 40, r: 9, y: 7, lamp: 16 } as const;

/** Fumaroles on the inner wall (steam). */
export const FUMAROLES = [
  { u: -356, v: -238 },
  { u: -402, v: 96 },
] as const;

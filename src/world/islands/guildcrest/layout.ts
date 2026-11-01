/**
 * Guildcrest (island 04, course Chapter 04): every number of the island's layout, as plain data
 * (docs/specs/ISLAND-04-guildcrest.md §3, as built in §15). No three.js here: tests, tools and the
 * bake may import it.
 *
 * A temperate highland island: a sea loch cut in from the north-west, a harled harbour town on its
 * north-east shore, Guild Square on a shelf above it, the Kirk Brae up an escarpment to the Abbey Knoll
 * (the cloister and the bell tower), the Guild Crest ridge behind with three windmills, and Ben
 * Scrivener's bare heather top at the south-east end.
 *
 * Conventions: metres; x east, z south, y up; sea level y 0. The island frame: `u` along bearing 143°
 * (from the loch's mouth inland), `v` along bearing 53° (v > 0 is the loch's north-east shore, the
 * town's side). Its origin is the island's centre.
 */

/** A point in the island frame. */
export interface Uv {
  readonly u: number;
  readonly v: number;
}

const DEG = Math.PI / 180;
const AXIS_BEARING = 143;

/** The island's middle (world). */
const CENTER = { x: 5900, z: 250 } as const;

/** The island frame: its origin (the centre) and its two axes (unit vectors in x, z). */
export const FRAME = {
  origin: CENTER,
  axis: { x: Math.sin(AXIS_BEARING * DEG), z: -Math.cos(AXIS_BEARING * DEG) },
  across: { x: Math.sin((AXIS_BEARING - 90) * DEG), z: -Math.cos((AXIS_BEARING - 90) * DEG) },
} as const;

/** World (x, z) to the island frame (u, v), written into `out`. */
export function toFrame(x: number, z: number, out: { u: number; v: number }): { u: number; v: number } {
  const dx = x - FRAME.origin.x;
  const dz = z - FRAME.origin.z;
  out.u = dx * FRAME.axis.x + dz * FRAME.axis.z;
  out.v = dx * FRAME.across.x + dz * FRAME.across.z;
  return out;
}

/** The island frame (u, v) to world (x, z). */
export function toWorld(u: number, v: number): { x: number; z: number } {
  return {
    x: FRAME.origin.x + u * FRAME.axis.x + v * FRAME.across.x,
    z: FRAME.origin.z + u * FRAME.axis.z + v * FRAME.across.z,
  };
}

/** The heading of frame direction (du, dv) (a heading h faces (sin h, cos h)). */
export function headingUv(du: number, dv: number): number {
  const x = du * FRAME.axis.x + dv * FRAME.across.x;
  const z = du * FRAME.axis.z + dv * FRAME.across.z;
  return Math.atan2(x, z);
}

/** The heading from frame point `a` toward frame point `b`. */
export function headingBetween(a: Uv, b: Uv): number {
  return headingUv(b.u - a.u, b.v - a.v);
}

export const GUILDCREST = {
  /** The island's middle (for distances and the chart). */
  center: CENTER,
  /** Baked height data; the ground falls to the deep floor (−58) at every edge. */
  bounds: { minX: 5280, maxX: 6540, minZ: -400, maxZ: 910, cell: 2 },
  deepDepth: 58,
  seabedRadius: 1000,

  /**
   * The coast: an oval in the frame (half-axes `halfU` × `halfV` round `centerU`; `power` > 2 makes
   * the sides straighter) whose edge wanders `noise` m over about `noiseScale` m, and `ragged` m over
   * a short scale.
   */
  coast: { centerU: 10, halfU: 410, halfV: 330, power: 2.4, noise: 28, noiseScale: 140, ragged: 8 },

  /** Sky (spec G4): late afternoon, the sun low in the west-south-west (bearing ~250°). */
  // `azimuth` −21 puts the sun on bearing 250° (23.8° up): §15.
  sky: { hours: 16.5, azimuth: -21 },
  mood: { fogScale: 1.8, hazeTint: [0.92, 0.96, 1.0] as const },

  /** How far its parts stream and show (footprintDistance, spec §3.1). */
  ranges: { load: 1300, show: 1100, unload: 1550, detail: 600 },
  skyReach: { reach: 1300, full: 800 },

  /** Its terrain mesh: gentle ground (no prefilter needed), the island one block from the sea. */
  terrain: {
    maxMergedTriangles: 24_000,
    prefilter: false,
    morphFrames: 24,
    seabed: { below: -15, level: 2 },
  },

  /** The chart miniature's sampled box (a coarse pack, O7). */
  chart: { minX: 5320, maxX: 6500, minZ: -360, maxZ: 870, cell: 12, scale: 1 / 10000 },
} as const;

/** The quay on the loch's north-east shore: its face along `v`, from `u0` to `u1`, its deck at `top`. */
export const QUAY = { v: 12.5, u0: -235, u1: -150, top: 2.2 } as const;

/** The berth alongside the quay (spec §3.4): port side to its face, bow toward the mouth. */
export const BERTH = { u: -196, v: 8 } as const;
export const DEPARTURE = { u: -212, v: 2 } as const;
export const LANDING = { u: -190, v: 16 } as const;

/** The lane in from the open sea (spec §3.4): lane start, the mouth, the turning room. */
export const LANE = {
  start: { u: -560, v: -30 },
  mouth: { u: -430, v: -30 },
  turning: { u: -300, v: -33, r: 40, depth: 4.5 },
  halfWidth: 30,
  floor: -6,
} as const;

/** The harbour town (terraced pads between the quay and the square). */
export const TOWN = { u0: -200, u1: -100, v0: 20, v1: 90 } as const;

/** The inn, The Harp and Whistle, at the quay's head; its porch faces the landing. */
export const INN = { u: -160, v: 44, y: 3 } as const;

/** Guild Square: centre, half-size (u × v), its pad height. */
export const SQUARE = { u: -96, v: 46, halfU: 17, halfV: 13, y: 10 } as const;

/** The Charter Stone in the square's middle. */
export const CHARTER_STONE = { u: -96, v: 46, h: 3 } as const;

/** The Kirk Brae: the lane from the square up to the abbey's gatehouse (points with heights). */
export const BRAE = [
  { u: -74, v: 60, y: 10 },
  { u: -48, v: 80, y: 22 },
  { u: -18, v: 106, y: 36 },
] as const;

/** The Abbey Knoll's plateau (frame box) and its height. */
export const KNOLL = { u0: -25, u1: 60, v0: 100, v1: 160, y: 36 } as const;

/** The cloister: the garth (a square of `garth` m round its centre) and its walks' width. */
export const CLOISTER = { u: 22, v: 130, garth: 36, walk: 4, y: 36 } as const;

/** The bell tower: its footprint (side) round its centre, base and cap top; the terrace on its east. */
export const TOWER = { u: 56, v: 114, side: 9, base: 36, top: 76, belfry: [64, 70] as const } as const;
export const TERRACE = { u: 66, v: 116, y: 40 } as const;

/** The gatehouse at the brae's top, and the east gate onto the ridge. */
export const GATEHOUSE = { u: -18, v: 106, y: 36 } as const;
export const EAST_GATE = { u: 42, v: 139, y: 36 } as const;

/** The Guild Crest: its crest line (frame, heights) from the abbey to its east top. */
export const RIDGE = [
  { u: 60, v: 150, y: 39 },
  { u: 90, v: 154, y: 42 },
  { u: 150, v: 200, y: 56 },
  { u: 200, v: 190, y: 62 },
  { u: 300, v: 120, y: 70 },
] as const;

/** The Guildhall of Journeymen's yard (a pad round its centre). */
export const YARD = { u: 92, v: 156, halfU: 15, halfV: 11, y: 42 } as const;

/** The three tower mills on the ridge (pads 12 m across). */
export const MILLS = [
  { u: 122, v: 190, y: 52 },
  { u: 150, v: 214, y: 58 },
  { u: 176, v: 172, y: 56 },
] as const;
export const MILL = { tower: 14, cap: 3, sail: 9, pad: 6 } as const;

/** Ben Scrivener: summit, height, radius of its cone. */
export const BEN = { u: 260, v: -60, y: 182, r: 240 } as const;

/**
 * The sea loch, cut in from the north-west (as built, §15: wider than the spec's 90-120 m so the
 * lane's 30 m half-width keeps 6 m of water): stations along u, each with the loch's two shores (v)
 * at the waterline and its floor in the middle. Past the coast it runs on into the sea's floor.
 */
export const LOCH = [
  { u: -560, vMin: -100, vMax: 40, floor: -18 },
  { u: -460, vMin: -92, vMax: 26, floor: -14 },
  { u: -330, vMin: -88, vMax: 24, floor: -11 },
  { u: -255, vMin: -80, vMax: 15, floor: -9 },
  { u: -175, vMin: -62, vMax: 12.5, floor: -7.5 },
  { u: -140, vMin: -44, vMax: 10, floor: -4 },
  { u: -122, vMin: -26, vMax: 4, floor: -1.5 },
] as const;

/**
 * Fresh water (spec §3.3, as built §15): the lochan on the knoll's back; the Scriptor's Burn down the
 * glen south of the knoll to the linn's lip on the escarpment; the Copyist's Linn down its crag into
 * the pool at its foot (east of the square, beside the brae's foot); the lower burn south-west past the
 * square's south-east corner to the loch's head, where it spreads over a pebble shore.
 */
export const WATER = {
  lochan: { u: 84, v: 60, r: 18, y: 46.5 },
  burn: [
    [66, 62],
    [46, 58],
    [26, 62],
    [6, 60],
    [-12, 62],
    [-24, 63],
  ] as const,
  linnLip: { u: -28, v: 63, y: 34 },
  linnPool: { u: -44, v: 58, r: 8, y: 10.2 },
  lowerBurn: [
    [-52, 53],
    [-62, 45],
    [-71, 34],
    [-83, 24],
    [-98, 16],
    [-112, 9],
    [-124, 2],
    [-134, -5],
  ] as const,
} as const;

/** The pebble shore at the loch's head, where the lower burn comes in (a starfish spot). */
export const PEBBLE_SHORE = { u: -110, v: -18, r: 14 } as const;

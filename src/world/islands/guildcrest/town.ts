import { CLOISTER, INN, SQUARE, YARD, type Uv } from './layout';

/**
 * Guildcrest's town as data (spec §3.5, as built §15): its houses (the kit's European houses, harled
 * and slated), the inn at the quay's head, the three guildhalls round Guild Square, the square's
 * furniture, and where the abbey's and the ridge's buildings stand, so the plants, the flora and the
 * tests keep off them. Plain data (no three.js).
 */

export interface TownHouse {
  readonly u: number;
  readonly v: number;
  /** Its door's side faces this frame direction. */
  readonly fu: number;
  readonly fv: number;
  readonly w: 4 | 6 | 8;
  readonly d: 4 | 6 | 8;
  readonly storeys: 1 | 2;
  readonly tint: number;
  /** Kept on Lite (the far ones go). */
  readonly lite: boolean;
}

const HARL = 0xe9e3d3;
const OCHRE = 0xd8b97a;
const PINK = 0xd9b8ae;
const GREY = 0xcfcabd;

/** The houses, from the quay up the town's slope (each faces down toward the loch or the lane). */
export const HOUSES: readonly TownHouse[] = [
  { u: -216, v: 37, fu: 0, fv: -1, w: 6, d: 6, storeys: 2, tint: HARL, lite: true },
  { u: -229, v: 42, fu: 0, fv: -1, w: 6, d: 4, storeys: 1, tint: GREY, lite: false },
  { u: -203, v: 49, fu: 0, fv: -1, w: 6, d: 6, storeys: 2, tint: OCHRE, lite: true },
  { u: -190, v: 41, fu: 0.6, fv: -0.8, w: 6, d: 6, storeys: 2, tint: PINK, lite: true },
  { u: -178, v: 53, fu: 0, fv: -1, w: 6, d: 6, storeys: 2, tint: HARL, lite: true },
  { u: -141, v: 53, fu: 0, fv: -1, w: 6, d: 8, storeys: 2, tint: PINK, lite: true },
  { u: -127, v: 55, fu: 0, fv: -1, w: 6, d: 6, storeys: 2, tint: HARL, lite: false },
  { u: -188, v: 65, fu: 0, fv: -1, w: 6, d: 6, storeys: 2, tint: HARL, lite: true },
  { u: -174, v: 69, fu: 0, fv: -1, w: 6, d: 6, storeys: 2, tint: OCHRE, lite: false },
  { u: -158, v: 68, fu: 0, fv: -1, w: 6, d: 8, storeys: 2, tint: HARL, lite: true },
  { u: -142, v: 70, fu: 0, fv: -1, w: 6, d: 6, storeys: 2, tint: PINK, lite: false },
  { u: -126, v: 71, fu: 0, fv: -1, w: 6, d: 6, storeys: 1, tint: GREY, lite: false },
  { u: -117, v: 84, fu: 0, fv: -1, w: 6, d: 6, storeys: 2, tint: OCHRE, lite: false },
  { u: -176, v: 85, fu: 0, fv: -1, w: 6, d: 6, storeys: 2, tint: HARL, lite: true },
  { u: -158, v: 87, fu: 0, fv: -1, w: 6, d: 6, storeys: 1, tint: PINK, lite: false },
  { u: -139, v: 87, fu: 0, fv: -1, w: 6, d: 6, storeys: 2, tint: HARL, lite: true },
];

/** The inn (The Harp and Whistle): an 8 × 8 house at the quay's head, its porch toward the landing. */
export const INN_HOUSE: TownHouse = {
  u: INN.u + 4,
  v: INN.v + 4,
  fu: 0,
  fv: -1,
  w: 8,
  d: 8,
  storeys: 2,
  tint: OCHRE,
  lite: true,
};

/** A guildhall round the square: its middle, its long axis, its front's facing and its banner. */
export interface Guildhall {
  readonly id: 'masons' | 'weavers' | 'millwrights';
  readonly u: number;
  readonly v: number;
  readonly along: 'u' | 'v';
  readonly length: number;
  readonly depth: number;
  readonly fu: number;
  readonly fv: number;
  readonly banner: number;
}

/** The three guildhalls (spec G16): the Masons' north, the Weavers' east, the Millwrights' south. */
export const GUILDHALLS: readonly Guildhall[] = [
  { id: 'masons', u: -100, v: 66, along: 'u', length: 13, depth: 8, fu: 0, fv: -1, banner: 0x2f5d8a },
  { id: 'weavers', u: -70.5, v: 47, along: 'v', length: 12, depth: 8, fu: -1, fv: 0, banner: 0x9c3a4a },
  { id: 'millwrights', u: -96, v: 26.5, along: 'u', length: 12, depth: 8, fu: 0, fv: 1, banner: 0xc08a2a },
];

/** The square's furniture (frame): the market cross, benches (their facing), the horse trough, the well. */
export const SQUARE_PROPS = {
  cross: { u: -86, v: 54 },
  benches: [
    { u: -108, v: 55, fu: 0, fv: -1 },
    { u: -88, v: 37, fu: 0, fv: 1 },
  ] as readonly { u: number; v: number; fu: number; fv: number }[],
  trough: { u: -83.5, v: 35.5 },
  well: { u: -150, v: 61 },
} as const;

/** The course notice board: at the square's west entrance, facing down the lane from the quay. */
export const COURSE_BOARD_UV = {
  u: SQUARE.u - SQUARE.halfU - 2.5,
  v: SQUARE.v + 6.5,
  fu: -1,
  fv: -0.15,
} as const;

/** Moira's booth on the quay, 22 m west of the landing, its front to the landing. */
export const BOOTH_UV = { u: -213, v: 21 } as const;

/** The abbey's ranges (frame boxes): the cloister's buildings round its walks. */
const C = CLOISTER;
export const ABBEY = {
  /** The garth's lawn (half-size), the walks' outer edge, and the ranges' outer edge (from C). */
  garth: 12,
  walk: 16,
  outer: 24,
  /** The slype (the passage through the west range from the gatehouse) and the east gate (v spans). */
  slype: { v0: 116, v1: 120 },
  eastGate: { v0: 137, v1: 141 },
  /** The library's open bay in the north range (u span). */
  libraryBay: { u0: 19, u1: 29 },
  /** The gatehouse west of the cloister (frame box), its passage along u at the slype's v. */
  gatehouse: { u0: -15, u1: -7, v0: 111, v1: 125 },
  /** The church: the south range, on east to the tower. */
  churchEast: 51.5,
} as const;

/** The Guildhall of Journeymen on the yard's south side (frame box), its door at (104, 144). */
export const JOURNEYMEN_HALL = { u0: 88, u1: 116, v0: 134, v1: 144, door: { u: 104, v: 144 } } as const;

/** Everything built that plants and flowers keep off (frame boxes, with their margins). */
const BUILT: readonly { u0: number; u1: number; v0: number; v1: number }[] = [
  ...HOUSES.map((h) => box(h.u, h.v, h.fu === 0 ? h.w : h.d, h.fu === 0 ? h.d : h.w, 1.5)),
  box(INN_HOUSE.u, INN_HOUSE.v, 8, 8, 3),
  ...GUILDHALLS.map((g) =>
    box(g.u, g.v, g.along === 'u' ? g.length : g.depth, g.along === 'u' ? g.depth : g.length, 1.5),
  ),
  {
    u0: SQUARE.u - SQUARE.halfU,
    u1: SQUARE.u + SQUARE.halfU,
    v0: SQUARE.v - SQUARE.halfV,
    v1: SQUARE.v + SQUARE.halfV,
  },
  {
    u0: C.u - ABBEY.outer - 1,
    u1: ABBEY.churchEast + 10,
    v0: C.v - ABBEY.outer - 1,
    v1: C.v + ABBEY.outer + 1,
  },
  {
    u0: ABBEY.gatehouse.u0 - 1,
    u1: ABBEY.gatehouse.u1 + 1,
    v0: ABBEY.gatehouse.v0 - 1,
    v1: ABBEY.gatehouse.v1 + 1,
  },
  {
    u0: JOURNEYMEN_HALL.u0 - 1,
    u1: JOURNEYMEN_HALL.u1 + 1,
    v0: JOURNEYMEN_HALL.v0 - 1,
    v1: JOURNEYMEN_HALL.v1 + 1,
  },
  { u0: YARD.u - YARD.halfU, u1: YARD.u + YARD.halfU, v0: YARD.v - YARD.halfV, v1: YARD.v + YARD.halfV },
  // The quay and its booth.
  { u0: -240, u1: -145, v0: 10, v1: 28 },
];

function box(u: number, v: number, su: number, sv: number, m: number) {
  return { u0: u - su / 2 - m, u1: u + su / 2 + m, v0: v - sv / 2 - m, v1: v + sv / 2 + m };
}

/** Whether frame (u, v) is within `r` m of anything built. */
export function inBuilt(u: number, v: number, r = 0): boolean {
  for (const b of BUILT) if (u > b.u0 - r && u < b.u1 + r && v > b.v0 - r && v < b.v1 + r) return true;
  return false;
}

/** A frame point's distance to a house's footprint, 0 inside. */
export function houseDistance(p: Uv, h: TownHouse): number {
  const su = h.fu === 0 ? h.w : h.d;
  const sv = h.fu === 0 ? h.d : h.w;
  return Math.hypot(Math.max(0, Math.abs(p.u - h.u) - su / 2), Math.max(0, Math.abs(p.v - h.v) - sv / 2));
}

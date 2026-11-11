import type { AdobeHouse } from './build';
import { CAMP, CARAVANSERAI, COURT, QUAY, SIGNAL_HOUSE, SPIRE, SQUARE, TERRACE, WELL, YARD } from './layout';

/**
 * Sunspire's town as data (spec §3): its adobe houses, the caravanserai at the quay's head, the
 * bazaar square's stalls and furniture, and where the mesa's buildings stand, so the plants, the
 * flora and the tests keep off them. Plain data (no three.js).
 */

const ADOBE = 0xe8c090;
const OCHRE = 0xe0a060;
const WHITE = 0xfff4dc;
const ROSE = 0xe4ae90;
const SAFFRON = 0xe0a030;
const MADDER = 0xb8443a;
const INDIGO = 0x34507e;

/** The houses, from the quay up the town's slope (each faces the cove, the lane or the square). */
export const HOUSES: readonly AdobeHouse[] = [
  // Behind the quay.
  { u: -229, v: 30, fu: 0, fv: -1, w: 7, d: 6, storeys: 1, tint: WHITE, awning: INDIGO, lite: true },
  { u: -217, v: 32, fu: 0, fv: -1, w: 6, d: 6, storeys: 2, tint: ADOBE, lite: true },
  { u: -204, v: 31, fu: 0, fv: -1, w: 7, d: 6, storeys: 1, tint: OCHRE, ladder: true, lite: false },
  // West of the caravanserai.
  { u: -200, v: 47, fu: 0, fv: -1, w: 7, d: 7, storeys: 2, tint: ROSE, awning: SAFFRON, lite: true },
  { u: -186, v: 52, fu: 0, fv: -1, w: 6, d: 6, storeys: 1, tint: WHITE, lite: false },
  // Along the lane, between the caravanserai and the square.
  { u: -140, v: 52, fu: 0, fv: -1, w: 7, d: 7, storeys: 2, tint: ADOBE, awning: MADDER, lite: true },
  { u: -129, v: 60, fu: 0, fv: -1, w: 6, d: 6, storeys: 1, tint: OCHRE, lite: false },
  // Round the square: north (their doors to it), east and south.
  { u: -110, v: 70.5, fu: 0, fv: -1, w: 8, d: 7, storeys: 2, tint: WHITE, lite: true },
  { u: -96, v: 71, fu: 0, fv: -1, w: 7, d: 7, storeys: 1, tint: ROSE, ladder: true, lite: true },
  { u: -73.5, v: 52, fu: -1, fv: 0, w: 6, d: 7, storeys: 2, tint: ADOBE, lite: true },
  { u: -104, v: 28.5, fu: 0, fv: 1, w: 8, d: 7, storeys: 1, tint: OCHRE, lite: true },
  { u: -89, v: 28.5, fu: 0, fv: 1, w: 6, d: 6, storeys: 2, tint: WHITE, lite: false },
  // The upper terrace.
  { u: -190, v: 70, fu: 0, fv: -1, w: 7, d: 6, storeys: 1, tint: ADOBE, lite: false },
  { u: -174, v: 74, fu: 0, fv: -1, w: 6, d: 6, storeys: 2, tint: OCHRE, lite: true },
  { u: -152, v: 76, fu: 0, fv: -1, w: 7, d: 6, storeys: 1, tint: WHITE, lite: false },
  { u: -136, v: 82, fu: 0, fv: -1, w: 6, d: 6, storeys: 2, tint: ROSE, lite: true },
  { u: -118, v: 86, fu: 0, fv: -1, w: 7, d: 6, storeys: 1, tint: ADOBE, lite: false },
  // Infill: the lanes between the quay, the caravanserai and the square close up into a town.
  { u: -178, v: 40, fu: 1, fv: 0, w: 6, d: 6, storeys: 1, tint: OCHRE, lite: false },
  { u: -214, v: 46, fu: 0, fv: -1, w: 6, d: 6, storeys: 1, tint: ADOBE, awning: MADDER, lite: false },
  { u: -212, v: 60, fu: 0, fv: -1, w: 7, d: 6, storeys: 2, tint: WHITE, lite: false },
  { u: -198, v: 60, fu: 0, fv: -1, w: 6, d: 6, storeys: 1, tint: OCHRE, lite: false },
  { u: -141, v: 66, fu: 0, fv: -1, w: 6, d: 6, storeys: 1, tint: ROSE, lite: false },
  { u: -124, v: 73, fu: 0, fv: -1, w: 6, d: 6, storeys: 2, tint: ADOBE, lite: false },
  { u: -164, v: 86, fu: 0, fv: -1, w: 6, d: 6, storeys: 1, tint: WHITE, lite: false },
  { u: -61, v: 45, fu: -1, fv: 0, w: 6, d: 7, storeys: 1, tint: OCHRE, awning: INDIGO, lite: false },
  { u: -119, v: 28, fu: 0, fv: 1, w: 6, d: 6, storeys: 1, tint: ROSE, lite: false },
];

/**
 * The caravanserai: a walled courtyard (its box is `CARAVANSERAI`), a gate in its south wall toward
 * the quay lane, an arcade along its north side with the players' rug under it.
 */
export const SERAI = {
  wall: 4.2,
  gate: { halfWidth: 1.9, height: 3.1 },
  /** The arcade's depth (from the north wall) and its roof's height over the court. */
  arcade: { depth: 3.6, height: 3.0 },
} as const;

/** The square's stalls: each a counter under an awning, its front to the square's middle. */
export const STALLS: readonly {
  u: number;
  v: number;
  fu: number;
  fv: number;
  cloth: number;
  goods: number;
}[] = [
  { u: -114, v: 61, fu: 0, fv: -1, cloth: SAFFRON, goods: 0xb8443a },
  { u: -104, v: 61.5, fu: 0, fv: -1, cloth: INDIGO, goods: 0xe0a030 },
  { u: -90, v: 61.5, fu: 0, fv: -1, cloth: MADDER, goods: 0x6a8a4a },
  { u: -115, v: 39, fu: 0, fv: 1, cloth: MADDER, goods: 0xd9b48a },
  { u: -93, v: 38.5, fu: 0, fv: 1, cloth: SAFFRON, goods: 0x34507e },
];

/** The square's furniture (frame): Zahra's weighing table, the fountain, two benches (their facing). */
export const SQUARE_PROPS = {
  scales: { u: -103, v: 50 },
  fountain: { u: -90, v: 49 },
  benches: [
    { u: -97, v: 56, fu: 0, fv: -1 },
    { u: -84, v: 44, fu: -1, fv: 0 },
  ] as readonly { u: number; v: number; fu: number; fv: number }[],
} as const;

/** The course notice board: at the square's west entrance, facing down the lane from the quay. */
export const COURSE_BOARD_UV = {
  u: SQUARE.u - SQUARE.halfU - 2.5,
  v: SQUARE.v + 6,
  fu: -1,
  fv: -0.15,
} as const;

/** Yusuf's booth on the quay, 23 m west of the landing, its front to the landing. */
export const BOOTH_UV = { u: -213, v: 21 } as const;

/** The camp's tents (frame): each its middle, its ridge's direction and its cloth. */
export const TENTS: readonly { u: number; v: number; du: number; dv: number; cloth: number }[] = [
  { u: -36, v: 0, du: 1, dv: 0, cloth: 0xf0e6d0 },
  { u: -22, v: -2, du: 0, dv: 1, cloth: SAFFRON },
  { u: -24, v: -15, du: 1, dv: 0, cloth: INDIGO },
];

function box(u: number, v: number, su: number, sv: number, m: number) {
  return { u0: u - su / 2 - m, u1: u + su / 2 + m, v0: v - sv / 2 - m, v1: v + sv / 2 + m };
}
const pad = (c: { u: number; v: number; halfU: number; halfV: number }, m = 0) =>
  box(c.u, c.v, c.halfU * 2, c.halfV * 2, m);

/** Everything built that plants and flowers keep off (frame boxes, with their margins). */
const BUILT: readonly { u0: number; u1: number; v0: number; v1: number }[] = [
  ...HOUSES.map((h) => box(h.u, h.v, h.fu === 0 ? h.w : h.d, h.fu === 0 ? h.d : h.w, 1.5)),
  pad(CARAVANSERAI, 2),
  pad(SQUARE, 1),
  pad(COURT, 1),
  pad(YARD, 1),
  pad(SIGNAL_HOUSE, 3),
  box(CAMP.u, CAMP.v, CAMP.r * 2, CAMP.r * 2, 0),
  box(WELL.u, WELL.v, 4, 4, 0),
  box(TERRACE.u, TERRACE.v, TERRACE.r * 2, TERRACE.r * 2, 1),
  box(SPIRE.u, SPIRE.v, SPIRE.side, SPIRE.side, 4),
  // The quay and its booth.
  { u0: QUAY.u0 - 5, u1: QUAY.u1 + 5, v0: 10, v1: 28 },
];

/** Whether frame (u, v) is within `r` m of anything built. */
export function inBuilt(u: number, v: number, r = 0): boolean {
  for (const b of BUILT) if (u > b.u0 - r && u < b.u1 + r && v > b.v0 - r && v < b.v1 + r) return true;
  return false;
}

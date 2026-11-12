import type { CubeHouse } from './build';
import {
  COURT,
  DOME,
  DRAUGHT,
  HILL,
  LOGGIA,
  PLAZA,
  QUAY,
  SQUARE,
  TAVERNA,
  TERRACE,
  TERRACES,
} from './layout';

/**
 * Inkwell's town as data (spec §3): its whitewashed houses on the three terraces, the taverna at the
 * quay's head, the Washing Square's furniture, and where the bluff's buildings stand, so the plants,
 * the flora and the tests keep off them. Plain data (no three.js).
 */

const WHITE = 0xfffaf0;
const CREAM = 0xf6ecd8;
const SHELL = 0xf4dccb;
const COBALT = 0x2c5c9a;
const SKY = 0x5e8fc8;
const TEAL = 0x3f8f9a;
const SAFFRON = 0xe6b84a;
const MADDER = 0xc8452f;

/** The stretches of each terrace (frame u) that the taverna, the square and the stair's flights keep clear. */
const KEEP_CLEAR: readonly (readonly (readonly [number, number])[])[] = [
  [[-162.5, -124]],
  [[-127, -95]],
  [[-99, -61]],
];

const TRIMS = [COBALT, TEAL, COBALT, SKY, COBALT] as const;
const WIDTHS = [8, 7, 9, 7, 8, 7.5] as const;

/**
 * A terrace's row of houses from its west end to its east: each stands with its back to the wall of
 * rock behind it, a narrow gap to its neighbour, and none where the row is kept clear.
 */
function row(t: number, u0: number, u1: number, seed: number): CubeHouse[] {
  const out: CubeHouse[] = [];
  const d = 7;
  const v = TERRACES[t]!.v1 - d / 2 - 0.3;
  let u = u0;
  for (let k = seed; u < u1; k++) {
    const w = WIDTHS[k % WIDTHS.length]!;
    const a = u;
    const e = u + w;
    u = e + 1.3 + (k % 3) * 0.5;
    if (e > u1 + 1) break;
    if (KEEP_CLEAR[t]!.some(([c0, c1]) => e > c0 && a < c1)) continue;
    out.push({
      u: (a + e) / 2,
      v: v + (k % 2 ? 0.25 : 0),
      fu: 0,
      fv: -1,
      w,
      d,
      storeys: k % 3 === 1 ? 2 : 1,
      tint: k % 7 === 3 ? SHELL : k % 5 === 2 ? CREAM : WHITE,
      trim: TRIMS[k % TRIMS.length]!,
      ...(k % 5 === 1 ? { dome: true } : {}),
      ...(k % 4 === 2 ? { awning: k % 8 === 2 ? SAFFRON : MADDER } : {}),
      ...(k % 2 === 0 ? { tub: true } : {}),
      lite: k % 2 === 1 || k % 5 === 1,
    });
  }
  return out;
}

/** The houses, terrace by terrace (each faces the cove). */
export const HOUSES: readonly CubeHouse[] = [
  ...row(0, -214, -64, 0),
  ...row(1, -210, -56, 3),
  ...row(2, -206, -50, 1),
];

/** The taverna: a paved terrace (`TAVERNA`) with a pergola along its north side and tables in front. */
export const TAVERN = {
  /** The pergola's depth from the terrace's north edge, and its beams' height over the floor. */
  pergola: { depth: 4.2, height: 2.9 },
  /** The taverna's house behind the pergola (its bar door opens onto the terrace). */
  house: { depth: 5 },
  tables: [
    { u: TAVERNA.u - 5.6, v: TAVERNA.v - 3.4 },
    { u: TAVERNA.u + 5.6, v: TAVERNA.v - 3.6 },
  ] as readonly { u: number; v: number }[],
} as const;

/** The Washing Square's furniture (frame): Thea's notice post, the fountain, two benches (their facing). */
export const SQUARE_PROPS = {
  // East of the first flight's head by 12 m and more: whoever stands by them isn't met at the stair.
  post: { u: SQUARE.u + 5.5, v: SQUARE.v + 4.6 },
  fountain: { u: SQUARE.u + 3, v: SQUARE.v - 2.2 },
  benches: [
    { u: SQUARE.u - 8, v: SQUARE.v + 5.2, fu: 0, fv: -1 },
    { u: SQUARE.u + 7.4, v: SQUARE.v - 5.6, fu: 0, fv: 1 },
  ] as readonly { u: number; v: number; fu: number; fv: number }[],
} as const;

/** The course notice board: on the square's south side, facing the head of the first flight. */
export const COURSE_BOARD_UV = {
  u: SQUARE.u - 1,
  v: SQUARE.v - 5.4,
  fu: -0.5,
  fv: 1,
} as const;

/** Kosta's booth on the quay, 23 m west of the landing, its front to the landing. */
export const BOOTH_UV = { u: -213, v: 21 } as const;

function box(u: number, v: number, su: number, sv: number, m: number) {
  return { u0: u - su / 2 - m, u1: u + su / 2 + m, v0: v - sv / 2 - m, v1: v + sv / 2 + m };
}
const pad = (c: { u: number; v: number; halfU: number; halfV: number }, m = 0) =>
  box(c.u, c.v, c.halfU * 2, c.halfV * 2, m);

/** Everything built that plants and flowers keep off (frame boxes, with their margins). */
const BUILT: readonly { u0: number; u1: number; v0: number; v1: number }[] = [
  ...HOUSES.map((h) => box(h.u, h.v, h.fu === 0 ? h.w : h.d, h.fu === 0 ? h.d : h.w, 1.5)),
  // The taverna and its house behind.
  {
    u0: TAVERNA.u - TAVERNA.halfU - 2,
    u1: TAVERNA.u + TAVERNA.halfU + 2,
    v0: TAVERNA.v - TAVERNA.halfV - 2,
    v1: TAVERNA.v + TAVERNA.halfV + TAVERN.house.depth + 2,
  },
  pad(SQUARE, 1),
  pad(PLAZA, 1.5),
  pad(LOGGIA, 2),
  pad(DRAUGHT, 1.5),
  pad(COURT, 1.5),
  box(TERRACE.u, TERRACE.v, TERRACE.r * 2, TERRACE.r * 2, 1),
  box(DOME.u, DOME.v, DOME.r * 2, DOME.r * 2, 4),
  // The quay and its booth.
  { u0: QUAY.u0 - 5, u1: QUAY.u1 + 5, v0: 10, v1: 28 },
  // The chapel on Olive Hill.
  box(HILL.u, HILL.v, 7, 6, 4),
];

/** Whether frame (u, v) is within `r` m of anything built. */
export function inBuilt(u: number, v: number, r = 0): boolean {
  for (const b of BUILT) if (u > b.u0 - r && u < b.u1 + r && v > b.v0 - r && v < b.v1 + r) return true;
  return false;
}

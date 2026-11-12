import type { ForgeHouse } from './build';
import {
  BANDSTAND,
  BOUNTY,
  COURT,
  LIGHTHOUSE,
  QUAY,
  SPRINGS,
  SQUARE,
  TERRACE,
  TERRACES,
  WORKS,
} from './layout';

/**
 * Tidewheel's town as data (spec §3): its forge houses on the three terraces, the Bandstand at the
 * quay's head, Gear Square's furniture, and where the ledges' buildings stand, so the plants, the
 * flora and the tests keep off them. Plain data (no three.js).
 */

const BASALT = 0x56524e;
const SOOT = 0x6a655f;
const ASH = 0x858078;
const OCHRE = 0xd89a3a;
const RUST = 0xb5532c;
const COPPER = 0x4f9a86;
const CANVAS = 0xe9ddc6;

/** The stretches of each terrace (frame u) that the Bandstand, the square, the stairs and Bounty Corner keep clear. */
const KEEP_CLEAR: readonly (readonly (readonly [number, number])[])[] = [
  [[-162.5, -122]],
  [[-127, -92]],
  [[-128, -84]],
];

const TRIMS = [OCHRE, RUST, OCHRE, COPPER, RUST] as const;
const WIDTHS = [8, 7, 9, 7, 8, 7.5] as const;

/**
 * A terrace's row of houses from its west end to its east: each stands with its back to the wall of
 * rock behind it, a narrow gap to its neighbour, and none where the row is kept clear.
 */
function row(t: number, u0: number, u1: number, seed: number): ForgeHouse[] {
  const out: ForgeHouse[] = [];
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
      tint: k % 7 === 3 ? ASH : k % 5 === 2 ? SOOT : BASALT,
      trim: TRIMS[k % TRIMS.length]!,
      ...(k % 4 === 1 ? { chimney: true } : {}),
      ...(k % 4 === 2 ? { awning: k % 8 === 2 ? OCHRE : CANVAS } : {}),
      ...(k % 2 === 0 ? { jar: true } : {}),
      lite: k % 2 === 1 || k % 5 === 1,
    });
  }
  return out;
}

/** The houses, terrace by terrace (each faces the bay). */
export const HOUSES: readonly ForgeHouse[] = [
  ...row(0, -214, -106, 0),
  ...row(1, -210, -96, 3),
  ...row(2, -206, -126, 1),
];

/**
 * The Bandstand: a round stage (`r`, its floor `rise` over the terrace) under a copper canopy on six
 * posts, with the music-box drum on its stand at the stage's west side.
 */
export const BAND = {
  u: BANDSTAND.u,
  v: BANDSTAND.v + 1,
  r: 4.6,
  rise: 0.36,
  canopy: 3.4,
  /** The music-box drum's stand (frame), and the drum's middle over the stage's floor. */
  drum: { u: BANDSTAND.u - 2.6, v: BANDSTAND.v + 2.2, y: 1.15, r: 0.42, len: 1.1 },
} as const;

/**
 * Gear Square's furniture (frame): the four great gears on the square's back wall, the hot-spring
 * basin with its steam, and two benches (their facing).
 */
export const SQUARE_PROPS = {
  /** Each gear's middle along the back wall (u), its height over the square, and its radius. */
  gears: [
    { u: SQUARE.u - 6.4, y: 2.2, r: 1.5 },
    { u: SQUARE.u - 2.9, y: 2.9, r: 1.9 },
    { u: SQUARE.u + 1.1, y: 2.3, r: 1.6 },
    { u: SQUARE.u + 4.6, y: 2.8, r: 1.8 },
  ],
  wall: SQUARE.v + SQUARE.halfV - 0.5,
  // East of the first flight's head by 12 m and more: whoever stands by it isn't met at the stair.
  basin: { u: SQUARE.u + 3.4, v: SQUARE.v - 2.4, r: 1.5 },
  benches: [
    { u: SQUARE.u - 8, v: SQUARE.v + 3.6, fu: 0, fv: -1 },
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

/** The bounty board at Bounty Corner: against the rock behind the third terrace, facing the bay. */
export const BOUNTY_BOARD = { u: BOUNTY.u, v: BOUNTY.v + 6.4, w: 3.2 } as const;

/** Dot's booth on the quay, 23 m west of the landing, its front to the landing. */
export const BOOTH_UV = { u: -213, v: 21 } as const;

function box(u: number, v: number, su: number, sv: number, m: number) {
  return { u0: u - su / 2 - m, u1: u + su / 2 + m, v0: v - sv / 2 - m, v1: v + sv / 2 + m };
}
const pad = (c: { u: number; v: number; halfU: number; halfV: number }, m = 0) =>
  box(c.u, c.v, c.halfU * 2, c.halfV * 2, m);

/** Everything built that plants and flowers keep off (frame boxes, with their margins). */
const BUILT: readonly { u0: number; u1: number; v0: number; v1: number }[] = [
  ...HOUSES.map((h) => box(h.u, h.v, h.fu === 0 ? h.w : h.d, h.fu === 0 ? h.d : h.w, 1.5)),
  pad(BANDSTAND, 2),
  pad(SQUARE, 1),
  box(BOUNTY.u, BOUNTY.v + 3, 10, 10, 1),
  pad(WORKS, 1.5),
  pad(COURT, 1.5),
  box(TERRACE.u, TERRACE.v, TERRACE.r * 2, TERRACE.r * 2, 1),
  box(LIGHTHOUSE.u, LIGHTHOUSE.v, LIGHTHOUSE.r * 2, LIGHTHOUSE.r * 2, 4),
  // The quay and its booth.
  { u0: QUAY.u0 - 5, u1: QUAY.u1 + 5, v0: 10, v1: 28 },
  // The pools and the ground beside them, where the springs' keeper stands.
  ...SPRINGS.map((p) => box(p.u, p.v, p.r * 2, p.r * 2, 4.5)),
];

/** Whether frame (u, v) is within `r` m of anything built. */
export function inBuilt(u: number, v: number, r = 0): boolean {
  for (const b of BUILT) if (u > b.u0 - r && u < b.u1 + r && v > b.v0 - r && v < b.v1 + r) return true;
  return false;
}

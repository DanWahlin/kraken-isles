import { crowStepGable, pitchedRoof, rod, type Buckets } from '../../village/pieces';
import { frameBuilder, makeIslandOut, type IslandOut, type IslandSign } from '../frame-build';
import { guildcrestHeight } from './height';
import { FRAME, toWorld } from './layout';

/**
 * Guildcrest's building helpers (the town, the abbey and the ridge share them): the shared frame
 * builders with the island's frame, ground and paints, the stone and slate palette (spec §2.3), and
 * its own pieces: stone halls with crow-stepped gables, and chimneys. Every piece goes into the
 * village kit's material buckets (no new shader).
 */

/** What the story shows: the book's new page, Rory's banner, the Seal's banners on the ridge. */
export type GcShow = 'page' | 'rory' | 'sealed';

export type GcOut = IslandOut<GcShow>;
export type GcSign = IslandSign<GcShow>;

export const makeOut = (): GcOut => makeIslandOut<GcShow>();

/** Guildcrest's colours (spec §2.3), as vertex paint over the kit's materials. */
export const GC_PAINT = {
  stone: 0xe8e2d6,
  rubble: 0xc4bcae,
  granite: 0xcfcbc2,
  wetStone: 0x5f5a52,
  paving: 0xd2cabc,
  slate: 0x6c7484,
  harl: 0xe9e3d3,
  ochre: 0xd8b97a,
  pink: 0xd9b8ae,
  timber: 0x6b5038,
  tar: 0x2e2620,
  iron: 0x3c3b3a,
  bronze: 0xb07a3a,
  masons: 0x2f5d8a,
  weavers: 0x9c3a4a,
  millwrights: 0xc08a2a,
  canvas: 0xf2ece0,
  door: 0x2f4a3a,
  doorRed: 0x8a3030,
} as const;

/** The island's frame builders as one set, for the shared builders that take it whole. */
export const B = frameBuilder<GcShow>(FRAME, guildcrestHeight, {
  iron: GC_PAINT.iron,
  stone: GC_PAINT.stone,
  rubble: GC_PAINT.rubble,
  door: GC_PAINT.door,
});

export const {
  YAW_U,
  signAt,
  yawAlong,
  at,
  ground,
  groundSpan,
  ubox,
  uvSpan,
  solid,
  rail,
  lowWall,
  flight,
  lampPost,
  hangLantern,
  door,
  windowPane,
} = B;

export { SIGN_CREAM } from '../frame-build';

/**
 * A stone hall: walls from its foundation (the lowest ground under it, less half a metre) to its eaves
 * `wall` m over `floor`, a slate roof with `rise`, and crow-stepped gables at both ends (`crow`). Its
 * ridge runs along the frame direction `along` ('u' or 'v'). Colliders and camera boxes over it.
 */
export function stoneHall(
  b: Buckets,
  out: GcOut,
  u: number,
  v: number,
  along: 'u' | 'v',
  length: number,
  depth: number,
  floor: number,
  wall: number,
  rise: number,
  colour: number,
  crow: boolean,
): { eaves: number; ridge: number } {
  const su = along === 'u' ? length : depth;
  const sv = along === 'u' ? depth : length;
  const { lo } = groundSpan(u, v, su / 2, sv / 2);
  const y0 = Math.min(lo, floor) - 0.5;
  const eaves = floor + wall;
  ubox(b, 'stone', u, (y0 + eaves) / 2, v, su, eaves - y0, sv, colour);
  // A plinth course a little proud of the wall at its foot.
  ubox(
    b,
    'stone',
    u,
    (y0 - 0.05 + floor + 0.6) / 2,
    v,
    su + 0.24,
    floor + 0.65 - y0,
    sv + 0.24,
    GC_PAINT.rubble,
  );
  const p = toWorld(u, v);
  const yaw = along === 'u' ? YAW_U : YAW_U + Math.PI / 2;
  const roofLen = crow ? length - 0.5 : length + 0.6;
  pitchedRoof(b, 'paving', p.x, eaves, p.z, yaw, roofLen, depth, rise, GC_PAINT.slate, 0.45);
  if (crow) {
    for (const side of [-1, 1]) {
      const end = side * (length / 2 - 0.2);
      const gu = along === 'u' ? u + end : u;
      const gv = along === 'u' ? v : v + end;
      const g = toWorld(gu, gv);
      crowStepGable(b, 'stone', g.x, eaves, g.z, yaw + Math.PI / 2, depth + 0.3, rise + 0.3, 0.55, 3, colour);
    }
  } else {
    // Plain gables: a stack of courses under the roof's line (hidden by the roof's ends).
    for (const side of [-1, 1]) {
      const end = side * (length / 2 - 0.25);
      const gu = along === 'u' ? u + end : u;
      const gv = along === 'u' ? v : v + end;
      const g = toWorld(gu, gv);
      crowStepGable(
        b,
        'stone',
        g.x,
        eaves,
        g.z,
        yaw + Math.PI / 2,
        depth - 0.2,
        rise * 0.92,
        0.45,
        5,
        colour,
      );
    }
  }
  solid(out, u, v, su + 0.3, sv + 0.3, y0, eaves + rise);
  return { eaves, ridge: eaves + rise };
}

/** A chimney stack on a roof at frame (u, v), its top at `top`; recorded for the smoke. */
export function chimney(b: Buckets, out: GcOut, u: number, v: number, base: number, top: number): void {
  ubox(b, 'stone', u, (base + top) / 2, v, 0.9, top - base, 0.7, GC_PAINT.rubble);
  ubox(b, 'stone', u, top + 0.06, v, 1.05, 0.12, 0.85, GC_PAINT.stone);
  for (const o of [-0.2, 0.2]) {
    const p = at(u + o, top + 0.12, v);
    rod(b, 'stone', p, { x: p.x, y: top + 0.42, z: p.z }, 0.11, 6, 0x9a6a4a);
  }
  out.chimneys.push(at(u, top + 0.5, v));
}

import { SphereGeometry, TorusGeometry, type BufferGeometry } from 'three/webgpu';
import { paint } from '../../village/kit';
import { box, rod, rope, type Buckets } from '../../village/pieces';
import { blockHouseBuilder, type BlockHouse } from '../block-house';
import { frameProps } from '../frame-props';
import { frameBuilder, makeIslandOut, type IslandOut } from '../frame-build';
import { inkwellHeight } from './height';
import { FRAME } from './layout';

/**
 * Inkwell's building helpers (the town, the plaza and the Dome share them): the shared frame builders
 * with the island's frame, ground and paints, the whitewash palette (spec §2), and its own pieces:
 * whitewashed cube houses with blue doors, shutters and domes, awnings, pergolas, lines of charts, and
 * flower tubs. Every piece goes into the village kit's material buckets (no new shader).
 */

/**
 * What the story shows: the card on Ready in the Loggia, the draughting slate's marks, the Great
 * Chart's slates and green posts, the Seal's banners.
 */
export type IwShow = 'borrowed' | 'shared' | 'inked' | 'sealed';

export type IwOut = IslandOut<IwShow>;
export const makeOut = (): IwOut => makeIslandOut<IwShow>();

/** Inkwell's colours (spec §2), as vertex paint over the kit's materials. */
export const IW_PAINT = {
  whitewash: 0xfffaf0,
  cream: 0xf6ecd8,
  shell: 0xf4dccb,
  chalk: 0xe9e2d2,
  paleStone: 0xd8cfbd,
  wetStone: 0x8c8c7e,
  paving: 0xebe3d0,
  // Weathered timber: the kit's planks are dark, and dark wood reads as black blocks on white walls.
  timber: 0xc8a878,
  darkTimber: 0x86664a,
  iron: 0x3c3b3a,
  brass: 0xe0b040,
  cobalt: 0x2c5c9a,
  sky: 0x5e8fc8,
  teal: 0x3f8f9a,
  magenta: 0xc2337a,
  terracotta: 0xc0683c,
  saffron: 0xe6b84a,
  madder: 0xc8452f,
  parchment: 0xe9ddbf,
  canvas: 0xf6ecd8,
  ink: 0x2a2e48,
  slate: 0x3a4048,
  leaf: 0x5e8a44,
  reed: 0xc4b07a,
} as const;

/** The colours a row of cloth uses in turn (washing, kites, awnings). */
export const CLOTHS = [IW_PAINT.cobalt, IW_PAINT.whitewash, IW_PAINT.saffron, IW_PAINT.madder] as const;

/** The island's frame builders as one set, for the shared builders that take it whole. */
export const B = frameBuilder<IwShow>(FRAME, inkwellHeight, {
  iron: IW_PAINT.iron,
  // Lamp posts are pale timber here: black iron reads as bars against white walls.
  post: IW_PAINT.timber,
  stone: IW_PAINT.paleStone,
  rubble: IW_PAINT.chalk,
  door: IW_PAINT.cobalt,
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

/** The shared port props in this island's frame and paints. */
export const { awning, pennants, jar, basket, barrel, crate, cart, pave, stationLamps } = frameProps(
  B,
  IW_PAINT,
  CLOTHS,
);

/** A dome (the upper half of a ball, `squash` its height over its radius) on (x, y, z), in a bucket. */
export function dome(
  b: Buckets,
  key: 'plaster' | 'metal' | 'stone',
  x: number,
  y: number,
  z: number,
  r: number,
  colour: number,
  squash = 1,
  seg = 16,
): BufferGeometry {
  const g = new SphereGeometry(r, seg, Math.max(4, seg >> 1), 0, Math.PI * 2, 0, Math.PI / 2);
  g.scale(1, squash, 1);
  g.translate(x, y, z);
  paint(g, colour);
  b[key].push(g);
  return g;
}

/** A brass hoop of radius `r` round (x, y, z), turned `rx` about x and `rz` about z, in the metal bucket. */
export function hoop(
  b: Buckets,
  x: number,
  y: number,
  z: number,
  r: number,
  tube: number,
  rx: number,
  rz: number,
  colour: number,
): BufferGeometry {
  const g = new TorusGeometry(r, tube, 6, 28);
  g.rotateX(rx);
  g.rotateZ(rz);
  g.translate(x, y, z);
  paint(g, colour);
  b.metal.push(g);
  return g;
}

/** A whitewashed house: a block house with its trim's paint and its dress. */
export interface CubeHouse extends BlockHouse {
  /** Its door's and shutters' paint. */
  readonly trim: number;
  /** A blue dome on its roof. */
  readonly dome?: boolean;
  /** A flower tub by its door. */
  readonly tub?: boolean;
}

/**
 * A whitewashed house (spec I13): a plastered block on a chalk footing that takes up the slope, a flat
 * roof behind a thin parapet, a painted door with a step, shuttered windows, and (on a two-storey
 * house) a smaller upper room set back from the front. One in five has a blue dome. Its roof is a
 * perch.
 */
export const cubeHouse = blockHouseBuilder<CubeHouse, IwShow>(B, awning, {
  footing: IW_PAINT.chalk,
  wall: 3.2,
  parapetHeight: 0.3,
  parapet,
  door: [1.05, 2.1],
  doorPaint: (h) => h.trim,
  window: (b, u, v, y, fu, fv, h) => shutteredWindow(b, u, v, y, fu, fv, h.trim),
  // A chalk step at the door.
  threshold(b, { h, base, door: [du, dv] }) {
    const alongU = h.fu === 0;
    ubox(
      b,
      'stone',
      du + h.fu * 0.4,
      base - 0.08,
      dv + h.fv * 0.4,
      alongU ? 1.5 : 0.8,
      0.2,
      alongU ? 0.8 : 1.5,
      IW_PAINT.paleStone,
    );
  },
  // A low drum and a blue dome over the house's highest room.
  crown(b, { h, su, sv, top }) {
    if (!h.dome) return undefined;
    const r = Math.min(su, sv) * (h.storeys === 2 ? 0.26 : 0.32);
    const c = at(top.u, 0, top.v);
    rod(
      b,
      'plaster',
      { x: c.x, y: top.roof - 0.02, z: c.z },
      { x: c.x, y: top.roof + 0.5, z: c.z },
      r + 0.12,
      14,
      h.tint,
      r + 0.12,
    );
    dome(b, 'plaster', c.x, top.roof + 0.5, c.z, r, IW_PAINT.cobalt, 0.92, 14);
    return top.roof + 0.5 + r;
  },
  dress(b, out, { h, base, across }) {
    if (!h.tub) return;
    const [tu, tv] = across(h.w >= 7 ? 0.6 : 1.5, 0.55);
    flowerTub(b, out, tu, tv, base - 0.1);
  },
  perchOnTop: true,
});

/** A thin parapet round a flat roof at `y`, its corners rounded off by a small block (whitewash's soft edge). */
export function parapet(
  b: Buckets,
  u: number,
  v: number,
  su: number,
  sv: number,
  y: number,
  tint: number,
): void {
  const t = 0.26;
  const h = 0.3;
  uvSpan(b, 'plaster', u - su / 2, u + su / 2, v - sv / 2, v - sv / 2 + t, y - 0.02, y + h, tint);
  uvSpan(b, 'plaster', u - su / 2, u + su / 2, v + sv / 2 - t, v + sv / 2, y - 0.02, y + h, tint);
  uvSpan(b, 'plaster', u - su / 2, u - su / 2 + t, v - sv / 2 + t, v + sv / 2 - t, y - 0.02, y + h, tint);
  uvSpan(b, 'plaster', u + su / 2 - t, u + su / 2, v - sv / 2 + t, v + sv / 2 - t, y - 0.02, y + h, tint);
}

/** A window with a painted shutter either side of it, in a wall facing frame direction (fu, fv). */
export function shutteredWindow(
  b: Buckets,
  u: number,
  v: number,
  y: number,
  fu: number,
  fv: number,
  trim: number,
): void {
  windowPane(b, u, v, y, fu, fv, 0.7, 0.95);
  const yaw = yawAlong(-fv, fu) - YAW_U;
  for (const side of [-1, 1]) {
    const su = u - fv * side * 0.56 + fu * 0.04;
    const sv = v + fu * side * 0.56 + fv * 0.04;
    ubox(b, 'wood', su, y, sv, 0.36, 0.98, 0.05, trim, yaw);
  }
}

/** A terracotta tub of flowers at frame (u, v) on `y` (bougainvillea's magenta over green). */
export function flowerTub(
  b: Buckets,
  out: IwOut,
  u: number,
  v: number,
  y: number,
  bloom: number = IW_PAINT.magenta,
): void {
  const p = at(u, y, v);
  rod(b, 'plaster', p, { x: p.x, y: y + 0.5, z: p.z }, 0.26, 10, IW_PAINT.terracotta, 0.34);
  dome(b, 'plaster', p.x, y + 0.46, p.z, 0.4, IW_PAINT.leaf, 0.8, 8);
  for (const [dx, dy, dz, r] of [
    [0.16, 0.66, 0.08, 0.2],
    [-0.14, 0.6, 0.14, 0.18],
    [0.02, 0.72, -0.16, 0.17],
    [-0.1, 0.78, -0.02, 0.15],
  ] as const)
    dome(b, 'plaster', p.x + dx, y + dy, p.z + dz, r, bloom, 0.9, 6);
  out.circles.push({ x: p.x, z: p.z, r: 0.4, y0: y - 0.3, y1: y + 0.9, height: 0.9 });
}

/**
 * A fall of bougainvillea down a wall facing frame direction (fu, fv): clumps of magenta over green
 * from `top` down `drop` m, `w` m wide, its middle at frame (u, v).
 */
export function bougainvillea(
  b: Buckets,
  u: number,
  v: number,
  top: number,
  fu: number,
  fv: number,
  w: number,
  drop: number,
  bloom: number = IW_PAINT.magenta,
): void {
  const n = Math.max(5, Math.round(w * drop * 1.6));
  for (let k = 0; k < n; k++) {
    // A fixed scatter: wide at the top, a ragged point below.
    const fx = ((k * 0.618034) % 1) - 0.5;
    const fy = (k * 0.381966) % 1;
    const t = fx * w * (1 - 0.55 * fy);
    const r = 0.26 + 0.2 * ((k * 0.754877) % 1);
    const pu = u - fv * t + fu * (0.12 + 0.1 * ((k * 0.57) % 1));
    const pv = v + fu * t + fv * (0.12 + 0.1 * ((k * 0.57) % 1));
    const p = at(pu, top - fy * drop - 0.1, pv);
    const g = new SphereGeometry(r, 7, 5);
    g.scale(1, 0.8, 1);
    g.translate(p.x, p.y, p.z);
    paint(g, k % 4 === 0 ? IW_PAINT.leaf : bloom);
    b.plaster.push(g);
  }
}

/** A line of charts drying from a to b (frame u, v, y each), sagging `sag`, a sheet every 1.1 m. */
export function chartLine(
  b: Buckets,
  a: readonly [number, number, number],
  e: readonly [number, number, number],
  sag = 0.4,
): void {
  const len = Math.hypot(e[0] - a[0], e[1] - a[1]);
  const n = Math.max(2, Math.round(len / 1.1));
  const yaw = yawAlong(e[0] - a[0], e[1] - a[1]);
  rope(b, at(a[0], a[2], a[1]), at(e[0], e[2], e[1]), sag, 0.012, IW_PAINT.timber, n);
  for (let k = 1; k < n; k++) {
    const t = k / n;
    const p = at(
      a[0] + (e[0] - a[0]) * t,
      a[2] + (e[2] - a[2]) * t - sag * 4 * t * (1 - t),
      a[1] + (e[1] - a[1]) * t,
    );
    // A sheet of parchment with a blue wash of sea on it, hung by its top edge.
    box(b, 'cloth', p.x, p.y - 0.36, p.z, 0.78, 0.66, 0.012, yaw, IW_PAINT.parchment);
    box(
      b,
      'cloth',
      p.x,
      p.y - 0.4 - 0.08 * (k % 3),
      p.z,
      0.5,
      0.26,
      0.02,
      yaw,
      k % 2 ? IW_PAINT.sky : IW_PAINT.cobalt,
    );
  }
}

/**
 * A pergola over a frame box (u0…u1, v0…v1) with its beams' underside at `y`: timber posts at the
 * corners (and along the long sides), rafters across, and a vine over it with flowers. Its posts'
 * circles go to `out`.
 */
export function pergola(
  b: Buckets,
  out: IwOut,
  u0: number,
  u1: number,
  v0: number,
  v1: number,
  floor: number,
  y: number,
  posts: readonly number[],
): void {
  for (const u of posts)
    for (const v of [v0, v1]) {
      const p = at(u, floor, v);
      rod(b, 'wood', { x: p.x, y: floor - 0.2, z: p.z }, { x: p.x, y, z: p.z }, 0.09, 6, IW_PAINT.timber);
      out.circles.push({ x: p.x, z: p.z, r: 0.18, y0: floor - 0.3, y1: y, height: y - floor });
    }
  for (const v of [v0, v1])
    ubox(b, 'wood', (u0 + u1) / 2, y + 0.08, v, u1 - u0 + 0.6, 0.16, 0.14, IW_PAINT.darkTimber);
  for (let u = u0; u <= u1 + 0.01; u += 0.9)
    ubox(b, 'wood', u, y + 0.22, (v0 + v1) / 2, 0.1, 0.12, v1 - v0 + 0.7, IW_PAINT.timber);
  // The vine: leaf pads over the rafters, with bloom here and there.
  let k = 0;
  for (let u = u0 + 0.5; u < u1; u += 1.3)
    for (let v = v0 + 0.5; v < v1; v += 1.2) {
      const p = at(u + 0.3 * ((k * 0.618) % 1), y + 0.3, v + 0.3 * ((k * 0.381) % 1));
      const g = new SphereGeometry(0.62, 7, 4);
      g.scale(1, 0.3, 1);
      g.translate(p.x, p.y, p.z);
      paint(g, k % 3 === 0 ? IW_PAINT.magenta : IW_PAINT.leaf);
      b.plaster.push(g);
      k++;
    }
}

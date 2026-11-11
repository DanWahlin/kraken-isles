import { box, rod, type Buckets } from '../../village/pieces';
import { frameBuilder, makeIslandOut, type IslandOut, type IslandSign } from '../frame-build';
import { sunspireHeight } from './height';
import { FRAME } from './layout';

/**
 * Sunspire's building helpers (the town, the mesa and the Sunspire share them): the shared frame
 * builders with the island's frame, ground and paints, the adobe palette (spec §2), and its own
 * pieces: adobe houses with parapets and roof beams, awnings, pennant lines and tents. Every piece
 * goes into the village kit's material buckets (no new shader).
 */

/** What the story shows: the court's standing beam, the opened crate, the Seal's pennants and mirrors. */
export type SsShow = 'beam' | 'crate' | 'sealed';

export type SsOut = IslandOut<SsShow>;
export type SsSign = IslandSign<SsShow>;

export const makeOut = (): SsOut => makeIslandOut<SsShow>();

/** Sunspire's colours (spec §2), as vertex paint over the kit's materials. */
export const SS_PAINT = {
  adobe: 0xe8c090,
  ochre: 0xe0a060,
  whitewash: 0xfff4dc,
  rose: 0xe4ae90,
  redStone: 0xb5694a,
  paleStone: 0xd9b48a,
  wetStone: 0x6e5444,
  paving: 0xf2dcb4,
  timber: 0x6b4a30,
  darkTimber: 0x3a2a20,
  iron: 0x3c3b3a,
  brass: 0xc89b3c,
  cobalt: 0x2c5c9a,
  saffron: 0xe0a030,
  madder: 0xb8443a,
  indigo: 0x34507e,
  canvas: 0xf0e6d0,
  mirror: 0xe8f0f4,
  reed: 0xb89a5a,
} as const;

/** The awnings' and pennants' colours, in the order a row uses them. */
export const CLOTHS = [SS_PAINT.saffron, SS_PAINT.madder, SS_PAINT.indigo, SS_PAINT.canvas] as const;

const B = frameBuilder<SsShow>(FRAME, sunspireHeight, {
  iron: SS_PAINT.iron,
  stone: SS_PAINT.paleStone,
  rubble: SS_PAINT.redStone,
  door: SS_PAINT.cobalt,
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

/** An adobe house: where it stands, its size, which way its door faces, and its dress. */
export interface AdobeHouse {
  readonly u: number;
  readonly v: number;
  /** Its door's side faces this frame direction (an axis: one of them is 0). */
  readonly fu: number;
  readonly fv: number;
  /** Its width (along its front) and depth (m). */
  readonly w: number;
  readonly d: number;
  readonly storeys: 1 | 2;
  readonly tint: number;
  /** An awning over its door, in this colour. */
  readonly awning?: number;
  /** A ladder to its roof on its right side. */
  readonly ladder?: boolean;
  /** Kept on Lite (the far ones go). */
  readonly lite: boolean;
}

/**
 * An adobe house (spec S12): a plastered block on a red stone footing that takes up the slope, a flat
 * roof behind a parapet, roof beams through the front wall, a cobalt door, deep-set windows, and (on
 * a two-storey house) a smaller upper room set back from the front. Its roof is a perch.
 */
export function adobeHouse(b: Buckets, out: SsOut, h: AdobeHouse): { roof: number; base: number } {
  const alongU = h.fu === 0;
  const su = alongU ? h.w : h.d;
  const sv = alongU ? h.d : h.w;
  const { lo, hi } = groundSpan(h.u, h.v, su / 2 + 0.3, sv / 2 + 0.3);
  const base = hi + 0.12;
  uvSpan(
    b,
    'stone',
    h.u - su / 2 - 0.1,
    h.u + su / 2 + 0.1,
    h.v - sv / 2 - 0.1,
    h.v + sv / 2 + 0.1,
    lo - 0.5,
    base,
    SS_PAINT.redStone,
  );
  const wall = 3.3;
  const roof = base + wall;
  uvSpan(b, 'plaster', h.u - su / 2, h.u + su / 2, h.v - sv / 2, h.v + sv / 2, base - 0.02, roof, h.tint);
  parapet(b, h.u, h.v, su, sv, roof, h.tint);
  // The front: the frame direction across it, and a point `t` m along it.
  const half = (alongU ? sv : su) / 2;
  const across = (t: number, off = 0.01): [number, number] =>
    alongU ? [h.u + t, h.v + h.fv * (half + off)] : [h.u + h.fu * (half + off), h.v + t];
  // Roof beams (vigas) through the front wall, under the parapet.
  for (let t = -h.w / 2 + 0.7; t <= h.w / 2 - 0.69; t += 1.1) {
    const [bu, bv] = across(t, 0);
    const a = at(bu - h.fu * 0.3, roof - 0.32, bv - h.fv * 0.3);
    const e = at(bu + h.fu * 0.45, roof - 0.32, bv + h.fv * 0.45);
    rod(b, 'wood', a, e, 0.085, 6, SS_PAINT.darkTimber);
  }
  const [du, dv] = across(h.w >= 7 ? -1.2 : 0);
  door(b, du, dv, base, h.fu, h.fv, 1.1, 2.15, SS_PAINT.cobalt);
  for (const t of h.w >= 7 ? [h.w * 0.12, h.w * 0.34] : [h.w * 0.3, -h.w * 0.3]) {
    const [wu, wv] = across(t);
    windowPane(b, wu, wv, base + 1.65, h.fu, h.fv, 0.7, 0.9);
  }
  let top = roof + 0.5;
  if (h.storeys === 2) {
    // The upper room: set back from the front, a third of the roof left as a terrace.
    const k = 0.62;
    const cu = h.u - h.fu * (su * (1 - k)) * 0.5;
    const cv = h.v - h.fv * (sv * (1 - k)) * 0.5;
    const uu = alongU ? su - 0.8 : su * k;
    const uv = alongU ? sv * k : sv - 0.8;
    const upper = roof + 2.8;
    uvSpan(b, 'plaster', cu - uu / 2, cu + uu / 2, cv - uv / 2, cv + uv / 2, roof - 0.02, upper, h.tint);
    parapet(b, cu, cv, uu, uv, upper, h.tint);
    const fd = (alongU ? uv : uu) / 2 + 0.01;
    windowPane(b, cu + h.fu * fd, cv + h.fv * fd, roof + 1.5, h.fu, h.fv, 0.7, 0.9);
    top = upper + 0.5;
  }
  if (h.awning !== undefined)
    awning(b, du + h.fu * 1.1, dv + h.fv * 1.1, base + 2.55, h.fu, h.fv, 2.6, 2, h.awning);
  if (h.ladder) {
    // A ladder leaning on the right-hand wall, up to the roof.
    const side = (alongU ? su : sv) / 2 + 0.25;
    const lu = alongU ? h.u + side : h.u + h.fu * (half - 1);
    const lv = alongU ? h.v + h.fv * (half - 1) : h.v + side;
    const lean = alongU ? [0.5, 0] : [0, 0.5];
    for (const o of [-0.22, 0.22]) {
      const fu = alongU ? 0 : o;
      const fv = alongU ? o : 0;
      const foot = at(lu + lean[0]! + fu, ground(lu + lean[0]!, lv + lean[1]!), lv + lean[1]! + fv);
      const head = at(lu - lean[0]! * 0.2 + fu, roof + 0.7, lv - lean[1]! * 0.2 + fv);
      rod(b, 'wood', foot, head, 0.035, 5, SS_PAINT.timber);
    }
  }
  solid(out, h.u, h.v, su + 0.3, sv + 0.3, lo - 0.5, top);
  out.perches.push(at(h.u, top + 0.05, h.v));
  return { roof, base };
}

/** A parapet round a flat roof at `y`: four low walls, their corners a little higher (adobe's soft crown). */
export function parapet(
  b: Buckets,
  u: number,
  v: number,
  su: number,
  sv: number,
  y: number,
  tint: number,
): void {
  const t = 0.32;
  const h = 0.5;
  uvSpan(b, 'plaster', u - su / 2, u + su / 2, v - sv / 2, v - sv / 2 + t, y - 0.02, y + h, tint);
  uvSpan(b, 'plaster', u - su / 2, u + su / 2, v + sv / 2 - t, v + sv / 2, y - 0.02, y + h, tint);
  uvSpan(b, 'plaster', u - su / 2, u - su / 2 + t, v - sv / 2 + t, v + sv / 2 - t, y - 0.02, y + h, tint);
  uvSpan(b, 'plaster', u + su / 2 - t, u + su / 2, v - sv / 2 + t, v + sv / 2 - t, y - 0.02, y + h, tint);
  for (const cu of [-1, 1])
    for (const cv of [-1, 1])
      ubox(
        b,
        'plaster',
        u + cu * (su / 2 - 0.3),
        y + h + 0.11,
        v + cv * (sv / 2 - 0.3),
        0.6,
        0.26,
        0.6,
        tint,
      );
}

/**
 * An awning: a striped cloth from a wall (`fu`, `fv` point away from it) out and down to two poles,
 * `w` wide and `reach` m deep, its wall edge at `y`. The middle of its wall edge is (u, v) less half
 * its reach.
 */
export function awning(
  b: Buckets,
  u: number,
  v: number,
  y: number,
  fu: number,
  fv: number,
  w: number,
  reach: number,
  colour: number,
): void {
  const yaw = yawAlong(-fv, fu);
  const drop = 0.5;
  const pitch = Math.atan2(drop, reach);
  const stripes = Math.max(3, Math.round(w / 0.55));
  for (let k = 0; k < stripes; k++) {
    const t = -w / 2 + ((k + 0.5) * w) / stripes;
    const su = u - fv * t;
    const sv = v + fu * t;
    const p = at(su, y - drop / 2, sv);
    box(
      b,
      'cloth',
      p.x,
      p.y,
      p.z,
      w / stripes + 0.005,
      0.03,
      Math.hypot(reach, drop),
      yaw,
      k % 2 ? SS_PAINT.canvas : colour,
      pitch,
    );
  }
  for (const side of [-1, 1]) {
    const pu = u - fv * side * (w / 2 - 0.1) + fu * (reach / 2 - 0.1);
    const pv = v + fu * side * (w / 2 - 0.1) + fv * (reach / 2 - 0.1);
    const g = ground(pu, pv);
    const foot = at(pu, g - 0.2, pv);
    rod(b, 'wood', foot, { x: foot.x, y: y - drop + 0.02, z: foot.z }, 0.05, 5, SS_PAINT.timber);
  }
}

/** A line of pennants from a to b (frame u, v, y each), sagging `sag`, a flag every 0.9 m. */
export function pennants(
  b: Buckets,
  a: readonly [number, number, number],
  e: readonly [number, number, number],
  sag = 0.5,
): void {
  const len = Math.hypot(e[0] - a[0], e[1] - a[1]);
  const n = Math.max(2, Math.round(len / 0.9));
  const yaw = yawAlong(e[0] - a[0], e[1] - a[1]);
  let prev = at(a[0], a[2], a[1]);
  for (let k = 1; k <= n; k++) {
    const t = k / n;
    const p = at(
      a[0] + (e[0] - a[0]) * t,
      a[2] + (e[2] - a[2]) * t - sag * 4 * t * (1 - t),
      a[1] + (e[1] - a[1]) * t,
    );
    rod(b, 'rope', prev, p, 0.01, 4, SS_PAINT.timber, 0.01, true);
    if (k < n) box(b, 'cloth', p.x, p.y - 0.2, p.z, 0.34, 0.4, 0.015, yaw, CLOTHS[k % CLOTHS.length]!);
    prev = p;
  }
}

/** A ridge tent at frame (u, v): a canvas ridge on two poles, `l` long (along frame direction du, dv), `w` wide. */
export function tent(
  b: Buckets,
  out: SsOut,
  u: number,
  v: number,
  du: number,
  dv: number,
  l: number,
  w: number,
  colour: number,
): void {
  const g = ground(u, v);
  const h = 2.3;
  const yaw = yawAlong(du, dv);
  const side = Math.hypot(w / 2, h - 0.5);
  const pitch = Math.atan2(h - 0.5, w / 2);
  for (const s of [-1, 1]) {
    const cu = u - dv * s * (w / 4);
    const cv = v + du * s * (w / 4);
    const p = at(cu, g + 0.5 + (h - 0.5) / 2, cv);
    box(b, 'cloth', p.x, p.y, p.z, l, 0.03, side, yaw, colour, s * pitch);
  }
  for (const s of [-1, 1]) {
    const p = at(u + du * s * (l / 2 - 0.05), g, v + dv * s * (l / 2 - 0.05));
    rod(
      b,
      'wood',
      { x: p.x, y: g - 0.2, z: p.z },
      { x: p.x, y: g + h + 0.25, z: p.z },
      0.045,
      5,
      SS_PAINT.timber,
    );
  }
  solid(out, u, v, Math.abs(du) > 0.5 ? l : w, Math.abs(du) > 0.5 ? w : l, g, g + h, false);
}

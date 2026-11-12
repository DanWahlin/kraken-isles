import { box, rod, type Buckets } from '../../village/pieces';
import { blockHouseBuilder, type BlockHouse } from '../block-house';
import { frameProps } from '../frame-props';
import { frameBuilder, makeIslandOut, type IslandOut } from '../frame-build';
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
  // Sun-bleached timber: the kit's planks are dark, and dark wood reads as black blocks on sand.
  timber: 0xcaa472,
  darkTimber: 0x8a6444,
  iron: 0x3c3b3a,
  brass: 0xe0b040,
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

/** The island's frame builders as one set, for the shared builders that take it whole. */
export const B = frameBuilder<SsShow>(FRAME, sunspireHeight, {
  iron: SS_PAINT.iron,
  // Lamp posts are timber here: black iron reads as bars against the sand.
  post: SS_PAINT.timber,
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

/** The shared port props in this island's frame and paints. */
export const { awning, pennants, jar, basket, barrel, crate, cart, pave, stationLamps } = frameProps(
  B,
  SS_PAINT,
  CLOTHS,
);

/** An adobe house: a block house with, on some, a ladder to its roof on its right side. */
export interface AdobeHouse extends BlockHouse {
  readonly ladder?: boolean;
}

/**
 * An adobe house (spec S12): a plastered block on a red stone footing that takes up the slope, a flat
 * roof behind a parapet, roof beams through the front wall, a cobalt door, deep-set windows, and (on
 * a two-storey house) a smaller upper room set back from the front. Its roof is a perch.
 */
export const adobeHouse = blockHouseBuilder<AdobeHouse, SsShow>(B, awning, {
  footing: SS_PAINT.redStone,
  wall: 3.3,
  parapetHeight: 0.5,
  parapet,
  door: [1.1, 2.15],
  doorPaint: () => SS_PAINT.cobalt,
  window: (b, u, v, y, fu, fv) => windowPane(b, u, v, y, fu, fv, 0.7, 0.9),
  // Roof beams (vigas) through the front wall, under the parapet.
  eaves(b, { h, roof, across }) {
    for (let t = -h.w / 2 + 0.7; t <= h.w / 2 - 0.69; t += 1.1) {
      const [bu, bv] = across(t, 0);
      const a = at(bu - h.fu * 0.3, roof - 0.32, bv - h.fv * 0.3);
      const e = at(bu + h.fu * 0.45, roof - 0.32, bv + h.fv * 0.45);
      rod(b, 'wood', a, e, 0.085, 6, SS_PAINT.darkTimber);
    }
  },
  dress(b, _out, { h, su, sv, roof }) {
    if (!h.ladder) return;
    // A ladder leaning on the right-hand wall, up to the roof.
    const alongU = h.fu === 0;
    const half = (alongU ? sv : su) / 2;
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
  },
});

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

import type { Buckets } from '../village/pieces';
import type { FrameBuilder, IslandOut } from './frame-build';

/**
 * The flat-roofed house every frame island's port is built of (Sunspire's adobe, Inkwell's whitewash,
 * Tidewheel's basalt): a block on a stone footing that takes up the slope, a flat roof behind a
 * parapet, a door, two windows, and (on a two-storey house) a smaller upper room set back from the
 * front. An island gives its `BlockHouseStyle`: its paints and the pieces only it has (roof beams, a
 * dome, shutters, a lantern). Every piece goes into the village kit's material buckets, the house has
 * a collider, and its roof is a perch.
 */

/** A house: where it stands, its size, which way its door faces, and its wash. */
export interface BlockHouse {
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
  /** Kept on Lite (the far ones go). */
  readonly lite: boolean;
}

/** What a style's pieces know of the house being built. */
export interface HouseParts<H extends BlockHouse> {
  readonly h: H;
  /** Its footprint along u and v. */
  readonly su: number;
  readonly sv: number;
  /** Its floor's height and its (lower) roof's. */
  readonly base: number;
  readonly roof: number;
  /** The frame point `t` m along its front, `off` m out from the wall. */
  across(t: number, off?: number): [number, number];
  /** Its door (frame). */
  readonly door: readonly [number, number];
  /** The middle of its highest room, and that room's roof. */
  readonly top: { readonly u: number; readonly v: number; readonly roof: number };
}

/** An island's house: its paints and its own pieces, each added at its place in the build. */
export interface BlockHouseStyle<H extends BlockHouse, S extends string> {
  /** The footing's stone. */
  footing: number;
  /** The walls' height (m), and the parapet's over the roof. */
  wall: number;
  parapetHeight: number;
  /** The parapet round a flat roof at `y`. */
  parapet(b: Buckets, u: number, v: number, su: number, sv: number, y: number, tint: number): void;
  /** The door's width and height, and its paint. */
  door: readonly [number, number];
  doorPaint(h: H): number;
  /** A window in a wall facing frame direction (fu, fv), its middle at (u, y, v). */
  window(b: Buckets, u: number, v: number, y: number, fu: number, fv: number, h: H): void;
  /** Under the parapet, before the door (roof beams through the wall). */
  eaves?(b: Buckets, p: HouseParts<H>): void;
  /** At the door, before the windows (a step). */
  threshold?(b: Buckets, p: HouseParts<H>): void;
  /** On the highest roof (a dome); returns the house's new top if it stands over the parapet. */
  crown?(b: Buckets, p: HouseParts<H>): number | undefined;
  /** Round the house, after its awning (a flower tub, a ladder, a lantern). */
  dress?(b: Buckets, out: IslandOut<S>, p: HouseParts<H>): void;
  /** The perch is over the upper room (not the house's middle). */
  perchOnTop?: boolean;
}

/** The house builder for one island: its frame builders, its awning and its style. */
export function blockHouseBuilder<H extends BlockHouse, S extends string>(
  {
    at,
    groundSpan,
    uvSpan,
    door,
    solid,
  }: Pick<FrameBuilder<S>, 'at' | 'groundSpan' | 'uvSpan' | 'door' | 'solid'>,
  awning: (
    b: Buckets,
    u: number,
    v: number,
    y: number,
    fu: number,
    fv: number,
    w: number,
    reach: number,
    colour: number,
  ) => void,
  style: BlockHouseStyle<H, S>,
) {
  return function blockHouse(b: Buckets, out: IslandOut<S>, h: H): { roof: number; base: number } {
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
      style.footing,
    );
    const roof = base + style.wall;
    uvSpan(b, 'plaster', h.u - su / 2, h.u + su / 2, h.v - sv / 2, h.v + sv / 2, base - 0.02, roof, h.tint);
    style.parapet(b, h.u, h.v, su, sv, roof, h.tint);
    // The front: the frame direction across it, and a point `t` m along it.
    const half = (alongU ? sv : su) / 2;
    const across = (t: number, off = 0.01): [number, number] =>
      alongU ? [h.u + t, h.v + h.fv * (half + off)] : [h.u + h.fu * (half + off), h.v + t];
    const doorAt = across(h.w >= 7 ? -1.2 : 0);
    const parts = { h, su, sv, base, roof, across, door: doorAt, top: { u: h.u, v: h.v, roof } };
    style.eaves?.(b, parts);
    const [du, dv] = doorAt;
    door(b, du, dv, base, h.fu, h.fv, style.door[0], style.door[1], style.doorPaint(h));
    style.threshold?.(b, parts);
    for (const t of h.w >= 7 ? [h.w * 0.12, h.w * 0.34] : [h.w * 0.3, -h.w * 0.3]) {
      const [wu, wv] = across(t);
      style.window(b, wu, wv, base + 1.65, h.fu, h.fv, h);
    }
    let top = roof + style.parapetHeight;
    if (h.storeys === 2) {
      // The upper room: set back from the front, a third of the roof left as a terrace.
      const k = 0.62;
      const cu = h.u - h.fu * (su * (1 - k)) * 0.5;
      const cv = h.v - h.fv * (sv * (1 - k)) * 0.5;
      const uu = alongU ? su - 0.8 : su * k;
      const uv = alongU ? sv * k : sv - 0.8;
      const upper = roof + 2.8;
      uvSpan(b, 'plaster', cu - uu / 2, cu + uu / 2, cv - uv / 2, cv + uv / 2, roof - 0.02, upper, h.tint);
      style.parapet(b, cu, cv, uu, uv, upper, h.tint);
      const fd = (alongU ? uv : uu) / 2 + 0.01;
      style.window(b, cu + h.fu * fd, cv + h.fv * fd, roof + 1.5, h.fu, h.fv, h);
      top = upper + style.parapetHeight;
      parts.top = { u: cu, v: cv, roof: upper };
    }
    top = style.crown?.(b, parts) ?? top;
    if (h.awning !== undefined)
      awning(b, du + h.fu * 1.1, dv + h.fv * 1.1, base + 2.55, h.fu, h.fv, 2.6, 2, h.awning);
    style.dress?.(b, out, parts);
    solid(out, h.u, h.v, su + 0.3, sv + 0.3, lo - 0.5, top);
    const perch = style.perchOnTop ? parts.top : h;
    out.perches.push(at(perch.u, top + 0.05, perch.v));
    return { roof, base };
  };
}

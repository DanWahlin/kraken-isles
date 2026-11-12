/**
 * An island's own frame: metres along an axis (`u`, a compass bearing from its centre) and across it
 * (`v`, 90° to the left of `u`). A streamed island's layout, builders, anchors and routes are written
 * in its frame, so a whole island can be laid out with round numbers and turned to face the wind.
 * Plain data and maths (no three.js): tests, tools and the bake import it.
 */

/** A point in an island's frame. */
export interface Uv {
  readonly u: number;
  readonly v: number;
}

/** A point of a path in an island's frame, with its height. */
export interface Uvy extends Uv {
  readonly y: number;
}

/** A frame's origin (the island's centre, world) and its two axes (unit vectors in x, z). */
export interface IslandFrame {
  readonly origin: { readonly x: number; readonly z: number };
  readonly axis: { readonly x: number; readonly z: number };
  readonly across: { readonly x: number; readonly z: number };
}

/** A frame with its conversions (`islandFrame`). */
export interface IslandFrameKit {
  readonly FRAME: IslandFrame;
  /** World (x, z) to the frame (u, v), written into `out`. */
  toFrame(x: number, z: number, out: { u: number; v: number }): { u: number; v: number };
  /** The frame (u, v) to world (x, z). */
  toWorld(u: number, v: number): { x: number; z: number };
  /** The heading of frame direction (du, dv) (a heading h faces (sin h, cos h)). */
  headingUv(du: number, dv: number): number;
  /** The heading from frame point `a` toward frame point `b`. */
  headingBetween(a: Uv, b: Uv): number;
}

const DEG = Math.PI / 180;

/** The frame round `center` whose `u` runs along compass bearing `axisBearing` (degrees). */
export function islandFrame(
  center: { readonly x: number; readonly z: number },
  axisBearing: number,
): IslandFrameKit {
  const FRAME: IslandFrame = {
    origin: center,
    axis: { x: Math.sin(axisBearing * DEG), z: -Math.cos(axisBearing * DEG) },
    across: { x: Math.sin((axisBearing - 90) * DEG), z: -Math.cos((axisBearing - 90) * DEG) },
  };
  const headingUv = (du: number, dv: number): number => {
    const x = du * FRAME.axis.x + dv * FRAME.across.x;
    const z = du * FRAME.axis.z + dv * FRAME.across.z;
    return Math.atan2(x, z);
  };
  return {
    FRAME,
    toFrame(x, z, out) {
      const dx = x - FRAME.origin.x;
      const dz = z - FRAME.origin.z;
      out.u = dx * FRAME.axis.x + dz * FRAME.axis.z;
      out.v = dx * FRAME.across.x + dz * FRAME.across.z;
      return out;
    },
    toWorld: (u, v) => ({
      x: FRAME.origin.x + u * FRAME.axis.x + v * FRAME.across.x,
      z: FRAME.origin.z + u * FRAME.axis.z + v * FRAME.across.z,
    }),
    headingUv,
    headingBetween: (a, b) => headingUv(b.u - a.u, b.v - a.v),
  };
}

/** The world box that holds a frame box (flora cells and the like are world-aligned). */
export function frameBounds(
  frame: Pick<IslandFrameKit, 'toWorld'>,
  u0: number,
  u1: number,
  v0: number,
  v1: number,
): { minX: number; maxX: number; minZ: number; maxZ: number } {
  const pts = [frame.toWorld(u0, v0), frame.toWorld(u1, v0), frame.toWorld(u0, v1), frame.toWorld(u1, v1)];
  return {
    minX: Math.min(...pts.map((p) => p.x)),
    maxX: Math.max(...pts.map((p) => p.x)),
    minZ: Math.min(...pts.map((p) => p.z)),
    maxZ: Math.max(...pts.map((p) => p.z)),
  };
}

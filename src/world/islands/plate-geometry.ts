import { BufferGeometry, Float32BufferAttribute } from 'three/webgpu';

/**
 * Flat pieces cut from plate (a gear, a kite, a brass feather), built triangle by triangle. They take
 * the place of three's `ExtrudeGeometry`, whose shape triangulation would add 6 KB to the engine's
 * chunk for a handful of simple outlines.
 */

type Point = readonly [number, number, number];

/** Collects flat-shaded triangles into one unindexed geometry (position, normal, and uv = x, y). */
export function flatTriangles() {
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  /** A triangle, wound so that it faces (nx, ny, nz). */
  function tri(p: Point, q: Point, w: Point, nx: number, ny: number, nz: number): void {
    const cx = (q[1] - p[1]) * (w[2] - p[2]) - (q[2] - p[2]) * (w[1] - p[1]);
    const cy = (q[2] - p[2]) * (w[0] - p[0]) - (q[0] - p[0]) * (w[2] - p[2]);
    const cz = (q[0] - p[0]) * (w[1] - p[1]) - (q[1] - p[1]) * (w[0] - p[0]);
    const sign = cx * nx + cy * ny + cz * nz < 0 ? -1 : 1;
    const len = Math.hypot(cx, cy, cz) || 1;
    for (const v of sign < 0 ? [p, w, q] : [p, q, w]) {
      pos.push(v[0], v[1], v[2]);
      nor.push((cx / len) * sign, (cy / len) * sign, (cz / len) * sign);
      uv.push(v[0], v[1]);
    }
  }
  return {
    tri,
    /** A flat four-sided face p, q, w, x (in order round it), facing (nx, ny, nz). */
    quad(p: Point, q: Point, w: Point, x: Point, nx: number, ny: number, nz: number): void {
      tri(p, q, w, nx, ny, nz);
      tri(p, w, x, nx, ny, nz);
    },
    geometry(): BufferGeometry {
      const g = new BufferGeometry();
      g.setAttribute('position', new Float32BufferAttribute(pos, 3));
      g.setAttribute('normal', new Float32BufferAttribute(nor, 3));
      g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
      return g;
    },
  };
}

/**
 * A plate `thick` m thick in the XY plane, centred on z = 0: the polygon `outline` (any outline whose
 * middle point sees every corner: a diamond, a leaf, a feather).
 */
export function plateGeometry(
  outline: readonly (readonly [number, number])[],
  thick: number,
): BufferGeometry {
  const f = flatTriangles();
  const h = thick / 2;
  const mx = outline.reduce((s, p) => s + p[0], 0) / outline.length;
  const my = outline.reduce((s, p) => s + p[1], 0) / outline.length;
  for (let i = 0; i < outline.length; i++) {
    const [ax, ay] = outline[i]!;
    const [bx, by] = outline[(i + 1) % outline.length]!;
    for (const z of [h, -h]) f.tri([mx, my, z], [ax, ay, z], [bx, by, z], 0, 0, Math.sign(z));
    // The edge's wall, facing away from the middle.
    f.quad([ax, ay, -h], [bx, by, -h], [bx, by, h], [ax, ay, h], (ax + bx) / 2 - mx, (ay + by) / 2 - my, 0);
  }
  return f.geometry();
}

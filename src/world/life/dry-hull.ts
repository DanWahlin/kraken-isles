import { BufferAttribute, BufferGeometry, type Matrix4 } from 'three/webgpu';

/**
 * An open boat rides with its floor under the waterline, and the sea's surface is one sheet: without
 * help it draws straight through the hull, and you see water where the boards should be.
 *
 * This builds a flat cover that fits inside the hull at one height (its outline cut from the hull's
 * own triangles there, drawn in a little). Drawn before the sea with depth only (no colour), it keeps
 * the sea's surface from drawing under it, so the boat's own floor shows. Every line of sight into
 * the boat crosses the cover, since it spans the opening just under the rail.
 *
 * `positions` are the hull's triangles (three vertices each, not indexed) and `matrix` takes them to
 * the space the cover is built in, with the boat's length along z. Returns null when the hull has no
 * outline at that height.
 */
export function dryHullCover(
  positions: ArrayLike<number>,
  matrix: Matrix4,
  y: number,
  o: { stations?: number; inset?: number } = {},
): BufferGeometry | null {
  const stations = o.stations ?? 24;
  const inset = o.inset ?? 0.03;
  const e = matrix.elements;
  const at = (i: number, out: [number, number, number]) => {
    const x = positions[i]!,
      py = positions[i + 1]!,
      z = positions[i + 2]!;
    out[0] = e[0]! * x + e[4]! * py + e[8]! * z + e[12]!;
    out[1] = e[1]! * x + e[5]! * py + e[9]! * z + e[13]!;
    out[2] = e[2]! * x + e[6]! * py + e[10]! * z + e[14]!;
  };

  // Where each triangle crosses the height: a segment of the hull's outline there (x, z at both ends).
  const segments: number[] = [];
  const v: [number, number, number][] = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const cut: number[] = [];
  let zMin = Infinity,
    zMax = -Infinity;
  for (let i = 0; i + 8 < positions.length; i += 9) {
    at(i, v[0]!);
    at(i + 3, v[1]!);
    at(i + 6, v[2]!);
    cut.length = 0;
    for (let k = 0; k < 3; k++) {
      const a = v[k]!,
        b = v[(k + 1) % 3]!;
      if (a[1] < y === b[1] < y) continue;
      const t = (y - a[1]) / (b[1] - a[1]);
      cut.push(a[0] + (b[0] - a[0]) * t, a[2] + (b[2] - a[2]) * t);
    }
    if (cut.length !== 4) continue;
    segments.push(cut[0]!, cut[1]!, cut[2]!, cut[3]!);
    zMin = Math.min(zMin, cut[1]!, cut[3]!);
    zMax = Math.max(zMax, cut[1]!, cut[3]!);
  }
  if (!segments.length || !(zMax - zMin > inset * 4)) return null;

  /** The outline's two sides at `z` (into `span`), or false where the hull has none there. */
  const span: [number, number] = [0, 0];
  const sidesAt = (z: number): boolean => {
    let lo = Infinity,
      hi = -Infinity;
    for (let i = 0; i < segments.length; i += 4) {
      const z0 = segments[i + 1]!,
        z1 = segments[i + 3]!;
      if (z < Math.min(z0, z1) || z > Math.max(z0, z1)) continue;
      const t = z1 === z0 ? 0 : (z - z0) / (z1 - z0);
      const x = segments[i]! + (segments[i + 2]! - segments[i]!) * t;
      lo = Math.min(lo, x);
      hi = Math.max(hi, x);
    }
    span[0] = lo;
    span[1] = hi;
    return hi > lo;
  };

  // At each station along the length the cover is as narrow as the hull gets within half a station
  // either way (a low-poly hull's outline has kinks a straight run between stations would cross),
  // then drawn in by `inset`.
  const left: number[] = [];
  const right: number[] = [];
  const along: number[] = [];
  const step = (zMax - zMin - inset * 2) / (stations - 1);
  for (let s = 0; s < stations; s++) {
    const z = zMin + inset + step * s;
    let lo = -Infinity,
      hi = Infinity;
    for (let k = -2; k <= 2; k++) {
      const zk = Math.min(zMax - inset, Math.max(zMin + inset, z + (step * k) / 4));
      if (!sidesAt(zk)) {
        lo = Infinity;
        break;
      }
      lo = Math.max(lo, span[0]);
      hi = Math.min(hi, span[1]);
    }
    if (!(hi - lo > inset * 2)) continue;
    left.push(lo + inset);
    right.push(hi - inset);
    along.push(z);
  }
  if (along.length < 2) return null;

  const out = new Float32Array((along.length - 1) * 18);
  let n = 0;
  const put = (x: number, z: number) => {
    out[n++] = x;
    out[n++] = y;
    out[n++] = z;
  };
  for (let s = 0; s + 1 < along.length; s++) {
    // Two triangles a strip, facing up.
    put(left[s]!, along[s]!);
    put(left[s + 1]!, along[s + 1]!);
    put(right[s]!, along[s]!);
    put(right[s]!, along[s]!);
    put(left[s + 1]!, along[s + 1]!);
    put(right[s + 1]!, along[s + 1]!);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(out, 3));
  return geometry;
}

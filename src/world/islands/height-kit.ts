import { clamp01, smoothstep } from '../../util/math';
import { fbm2 } from '../terrain/cove-height';
import { COVE_QUAY, type CoveStations } from './cove-harbour';
import type { Uvy } from './frame';

/**
 * The pieces a frame island's height function is made of (Sunspire Sands, Inkwell Bluffs, Tidewheel
 * Caldera): smooth joins, pads and paths cut into a slope, tables with sheer walls, an oval coast with
 * a wandering edge, the shared cove, and the bake's edge apron. Each island's `height.ts` composes
 * them with its own layout; nothing here knows an island. Pure maths, sampled by the bake.
 */

export function smin(a: number, b: number, k: number): number {
  const h = clamp01(0.5 + (0.5 * (b - a)) / k);
  return b + (a - b) * h - k * h * (1 - h);
}

export function smax(a: number, b: number, k: number): number {
  return -smin(-a, -b, k);
}

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** A distance to a segment and how far along it (0-1). */
export interface Seg {
  d: number;
  t: number;
}

/** Distance from (u, v) to segment a-b, and how far along it (0-1), into `out`. */
export function segment(u: number, v: number, au: number, av: number, bu: number, bv: number, out: Seg): Seg {
  const du = bu - au;
  const dv = bv - av;
  const len2 = du * du + dv * dv || 1;
  const t = clamp01(((u - au) * du + (v - av) * dv) / len2);
  out.d = Math.hypot(u - au - du * t, v - av - dv * t);
  out.t = t;
  return out;
}
const seg: Seg = { d: 0, t: 0 };

/** The nearest point of a polyline with heights: its distance and the height there, into `out`. */
export function polyline(
  u: number,
  v: number,
  pts: readonly Uvy[],
  out: Seg & { y: number },
): Seg & { y: number } {
  out.d = Infinity;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    segment(u, v, a.u, a.v, b.u, b.v, seg);
    if (seg.d < out.d) {
      out.d = seg.d;
      out.t = seg.t;
      out.y = lerp(a.y, b.y, seg.t);
    }
  }
  return out;
}
const near = { d: 0, t: 0, y: 0 };

/**
 * Holds the ground at `y` inside a pad (`out` = how far outside it, m), with cut and fill slopes
 * (rise per metre) outside: the ground returns to its own height where it's within reach.
 */
export function pad(h: number, out: number, y: number, cut = 1.1, fill = 0.75): number {
  const lo = y - fill * out;
  const hi = y + cut * out;
  return smin(smax(h, lo, 0.6), hi, 0.6);
}

/** How far (m) outside a frame box round (cu, cv) with half-sizes (hu, hv). */
export function boxOut(u: number, v: number, cu: number, cv: number, hu: number, hv: number): number {
  return Math.hypot(Math.max(0, Math.abs(u - cu) - hu), Math.max(0, Math.abs(v - cv) - hv));
}

/** How far outside a frame box given by its corners. */
export function cornersOut(
  u: number,
  v: number,
  b: { u0: number; u1: number; v0: number; v1: number },
): number {
  return boxOut(u, v, (b.u0 + b.u1) / 2, (b.v0 + b.v1) / 2, (b.u1 - b.u0) / 2, (b.v1 - b.v0) / 2);
}

/**
 * A table's height `out` m outside its flat top: a sheer wall `wall` m high (about 73°), then a skirt
 * (`skirt` m of fall a metre) down to the lower ground.
 */
export function table(out: number, top: number, wall: number, skirt: number): number {
  if (out <= 0) return top;
  const run = wall / 3.3;
  if (out < run) return top - out * 3.3;
  return top - wall - (out - run) * skirt;
}

/** A path with its half-width (m). */
export type PathPad = readonly [readonly Uvy[], number];

/**
 * Each path's stretches as pads in turn, over ground `h` at frame (u, v). `fill` is the slope (rise a
 * metre) of the bank under a path that stands over the ground: a gentle bank, or a wall's (3.3) for a
 * path on a ledge.
 */
export function pathPads(h: number, u: number, v: number, paths: readonly PathPad[], fill = 0.9): number {
  for (const [pts, w] of paths)
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i]!;
      const b = pts[i + 1]!;
      segment(u, v, a.u, a.v, b.u, b.v, seg);
      h = pad(h, Math.max(0, seg.d - w), lerp(a.y, b.y, seg.t), 1.3, fill);
    }
  return h;
}

/** How much frame (u, v) is on one of `paths` (trodden ground), 0-1. */
export function onPaths(u: number, v: number, paths: readonly PathPad[]): number {
  let t = 0;
  for (const [pts, w] of paths) {
    polyline(u, v, pts, near);
    t = Math.max(t, 1 - smoothstep(w - 0.6, w + 1, near.d));
  }
  return t;
}

/** 1 inside a frame box, easing to 0 over `edge` m outside it. */
export function inBox(
  u: number,
  v: number,
  cu: number,
  cv: number,
  hu: number,
  hv: number,
  edge = 1.5,
): number {
  return 1 - smoothstep(0, edge, boxOut(u, v, cu, cv, hu, hv));
}

/** An oval coast: half-axes round its middle, how square it is, and how its edge wanders. */
export interface OvalCoast {
  readonly centerU: number;
  /** Its middle across the frame (0 when left out). */
  readonly centerV?: number;
  readonly halfU: number;
  readonly halfV: number;
  /** Over 2 makes the sides straighter. */
  readonly power: number;
  /** How far the edge wanders (m) over about `noiseScale` m, and `ragged` m over a short scale. */
  readonly noise: number;
  readonly noiseScale: number;
  readonly ragged: number;
}

/** The signed distance (m) inland from an oval coast at frame (u, v), world (x, z) for its noise. */
export function coastDistance(
  c: OvalCoast,
  seed: number,
  u: number,
  v: number,
  x: number,
  z: number,
): number {
  const du = u - c.centerU;
  const dv = v - (c.centerV ?? 0);
  const dist = Math.hypot(du, dv);
  const r = (Math.abs(du / c.halfU) ** c.power + Math.abs(dv / c.halfV) ** c.power) ** (1 / c.power);
  const d = r > 1e-6 ? dist * (1 / r - 1) : c.halfV;
  return (
    d +
    c.noise * fbm2(x / c.noiseScale, z / c.noiseScale, 3, seed + 1) +
    c.ragged * fbm2(x / 34, z / 34, 2, seed + 2)
  );
}

/** A coast's sea cliffs: their top's height and wander, how steep they rise, and how the land climbs behind. */
export interface CliffProfile {
  readonly top: number;
  readonly topNoise: number;
  /** Metres of rise a metre inland up the cliff's face. */
  readonly rise: number;
  /** Metres of rise a metre inland behind its top. */
  readonly back: number;
}

/**
 * The land's rise from the coast (`d` inland), and the sea's floor off it (`d` < 0): a gentle shore
 * where `cliff` is 0, a sea cliff where it is 1.
 */
export function coastProfile(
  d: number,
  cliff: number,
  x: number,
  z: number,
  o: CliffProfile & { deepDepth: number; seed: number },
): number {
  if (d < 0) {
    const off = -d;
    const gentle = off * 0.1 + off * off * 0.0014;
    const steep = off * 0.6 + off * off * 0.002;
    return -Math.min(o.deepDepth, lerp(gentle, steep, cliff) + 0.6);
  }
  // Past the shore's first 45 m the coast no longer holds the land down.
  const free = Math.max(0, d - 45) ** 2 * 0.04;
  const gentle = 0.7 + d * 0.12 + free;
  const top = o.top + o.topNoise * fbm2(x / 90, z / 90, 2, o.seed + 3);
  const steep = d < top / o.rise ? d * o.rise : top + (d - top / o.rise) * o.back;
  return lerp(gentle, steep + free, cliff);
}

/** A cove's shores (v) and floor at one station along it. */
interface CoveSection {
  vMin: number;
  vMax: number;
  floor: number;
}

/**
 * The shared cove, carved into an island's ground (`cove-harbour.ts`): its shores wander (less along
 * the quay), it closes in a rounded end past its head, its `v < 0` side shelves as a beach, and the
 * berth has a dredged pocket along the quay's face. `headFade` eases the carve out past the head (a
 * beach, not a ledge, where nothing else covers the end of the carve). The carve holds the land low
 * behind each shore (a beach, a town's first terrace); `hold` says how far behind the shore at `u`
 * on `side` (−1 the beach's, 1 the quay's) that lasts, where higher ground (a crater's wall, a
 * breach's jaw) must stand close to the water. Without it the hold has no end.
 */
export function coveCarver(
  stations: CoveStations,
  seed: number,
  o: { headFade?: boolean; hold?(u: number, side: -1 | 1): number } = {},
) {
  const Q = COVE_QUAY;
  const first = stations[0]!;
  const head = stations[stations.length - 1]!;
  const cove: CoveSection = { vMin: 0, vMax: 0, floor: 0 };

  /** The cove's shores, floor, interpolated along u, into `out` (false outside it). */
  function coveAt(u: number, out: CoveSection): boolean {
    if (u < first.u || u > head.u + 20) return false;
    let i = 0;
    while (i + 2 < stations.length && u > stations[i + 1]!.u) i++;
    const a = stations[i]!;
    const b = stations[i + 1]!;
    const t = clamp01((u - a.u) / (b.u - a.u));
    out.vMin = lerp(a.vMin, b.vMin, t);
    out.vMax = lerp(a.vMax, b.vMax, t);
    out.floor = lerp(a.floor, b.floor, t);
    // The shores wander (no ruled edge), less so along the quay.
    const quay = u > Q.u0 - 20 && u < Q.u1 + 10 ? 0.15 : 1;
    out.vMin += 9 * fbm2(u / 70, 3.1, 2, seed + 21);
    out.vMax += 5 * quay * fbm2(u / 50, 7.7, 2, seed + 22);
    // Past the head the cove closes in a rounded end.
    if (u > b.u) {
      const k = (u - b.u) / 20;
      const mid = (out.vMin + out.vMax) / 2;
      const half = ((out.vMax - out.vMin) / 2) * Math.sqrt(Math.max(0, 1 - k * k));
      out.vMin = mid - half;
      out.vMax = mid + half;
      out.floor = lerp(out.floor, 0.5, k);
    }
    return true;
  }

  return {
    /** The distance (m) from the cove's waterline (0 in it), for its shores' rise. */
    shoreDistance(u: number, v: number): number {
      const uc = Math.min(head.u, Math.max(first.u, u));
      coveAt(uc, cove);
      const across = Math.max(0, v - cove.vMax, cove.vMin - v);
      return Math.hypot(Math.max(0, u - head.u), across);
    },
    /** Ground `h` at frame (u, v) with the cove carved into it. */
    carve(h: number, u: number, v: number): number {
      // The quay's deck stands over the cove's edge (its face is a wall).
      if (v >= Q.v - 0.6 && u >= Q.u0 && u <= Q.u1) return h;
      if (!coveAt(u, cove)) return h;
      const mid = (cove.vMin + cove.vMax) / 2;
      const half = Math.max(1, (cove.vMax - cove.vMin) / 2);
      const side = v < mid ? -1 : 1;
      const t = Math.abs(v - mid) / half;
      let bed: number;
      // The beach side shelves (a long shallow run); the quay's side drops off sooner.
      const shelf = side < 0 ? 0.62 : 0.86;
      if (t < shelf) bed = cove.floor * (1 - 0.12 * t * t);
      else if (t < 1)
        bed = lerp(
          cove.floor * (1 - 0.12 * shelf * shelf),
          0.6,
          ((t - shelf) / (1 - shelf)) ** (side < 0 ? 0.7 : 1),
        );
      else {
        const behind = (t - 1) * half;
        bed = 0.6 + behind * (side < 0 ? 0.1 : 0.45);
        // Past the hold the land is free to rise steeply.
        const free = o.hold ? behind - o.hold(u, side) : -1;
        if (free > 0) bed += free * 2.2 + free * free * 0.05;
      }
      if (o.headFade) {
        const fade = u > head.u ? smoothstep(0.5, 1, (u - head.u) / 20) : 0;
        h = lerp(smin(h, bed, 2.5), h, fade);
      } else h = smin(h, bed, 2.5);
      // The berth's dredged pocket along the quay's face.
      const pocket = boxOut(u, v, (Q.u0 + Q.u1) / 2, Q.v - 9.5, (Q.u1 - Q.u0) / 2 + 6, 8.6);
      if (pocket < 12 && v < Q.v - 0.6) h = Math.min(h, -6.5 + pocket * 0.9);
      return h;
    },
  };
}

/** The quay's deck as a pad over ground `h` (its face is the stone wall). */
export function quayPad(h: number, u: number, v: number): number {
  const Q = COVE_QUAY;
  if (v < Q.v - 0.6) return h;
  return pad(h, boxOut(u, v, (Q.u0 + Q.u1) / 2, Q.v + 7, (Q.u1 - Q.u0) / 2, 7), Q.top, 1.4, 1);
}

/** How much frame (u, v) is the quay's deck, 0-1. */
export function onQuay(u: number, v: number): number {
  const Q = COVE_QUAY;
  return inBox(u, v, (Q.u0 + Q.u1) / 2, Q.v + 7, (Q.u1 - Q.u0) / 2, 7);
}

/** The sea floor eases down to the deep floor in the last 60 m inside the baked bounds. */
export function edgeApron(
  b: { minX: number; maxX: number; minZ: number; maxZ: number },
  deepDepth: number,
  x: number,
  z: number,
  h: number,
): number {
  const edge = Math.min(x - b.minX, b.maxX - x, z - b.minZ, b.maxZ - z);
  if (edge >= 60 || h > -1) return h;
  return h + (-deepDepth - h) * smoothstep(60, 4, edge) * smoothstep(-1, -8, h);
}

/** The ground's normal at (x, z), from the height's central differences 1.5 m either side. */
export function heightNormal(
  heightAt: (x: number, z: number) => number,
  x: number,
  z: number,
  out: Float32Array | number[],
): Float32Array | number[] {
  const e = 1.5;
  const nx = -(heightAt(x + e, z) - heightAt(x - e, z)) / (2 * e);
  const nz = -(heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e);
  const len = Math.hypot(nx, 1, nz) || 1;
  out[0] = nx / len;
  out[1] = 1 / len;
  out[2] = nz / len;
  return out;
}

/** Ground masks that sum to 1 (the bake's four). */
export interface GroundMasks {
  sand: number;
  grass: number;
  rock: number;
  cliff: number;
}

/** The four masks from their raw weights: cliff first, then rock, grass and sand under it. */
export function normalizeMasks(sand: number, grass: number, rock: number, cliff: number): GroundMasks {
  const total = sand + grass + rock + cliff;
  if (total < 0.001) return { sand: 0.7, grass: 0, rock: 0.3, cliff: 0 };
  return { sand: sand / total, grass: grass / total, rock: rock / total, cliff: cliff / total };
}

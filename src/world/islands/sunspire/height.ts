import { fbm2 } from '../../terrain/cove-height';
import { clamp01, smoothstep } from '../../../util/math';
import type { TerrainFreshWater } from '../../terrain/water-caps';
import {
  BUTTE,
  CAMP,
  CARAVANSERAI,
  COURT,
  COVE,
  DUNES,
  HIGH_MESA,
  LIBRARY_ROCK,
  LOW_MESA,
  MESA_PATH,
  NEEDLE,
  OASIS_PATH,
  QUAY,
  QUAY_LANE,
  SIGNAL_HOUSE,
  SIGNAL_STAIR,
  SPIRE,
  SQUARE,
  SUN_STAIR,
  SUNSPIRE as S,
  TERRACE,
  toFrame,
  WATER,
  WELL,
  YARD,
  type Uvy,
} from './layout';
import { createSunspireWater, type SunspireWater } from './water';

/**
 * Sunspire Sands' ground: one height function (frame u, v), sampled by the bake.
 *
 * 1. The coast: a superellipse in the frame whose edge wanders. `d` is the distance inland from it.
 *    The north-east and south-east end in red sea cliffs (15-30 m); the south-west shelves gently
 *    (beaches, then dunes).
 * 2. The desert floor (the bajada): low ground that rises a little inland, and the town's slope from
 *    the quay to the bazaar square.
 * 3. The tables: the Low Mesa and the High Mesa (flat tops, sheer walls, a talus skirt), Red Butte
 *    (three stepped benches), the Needle, and Library Rock out at sea.
 * 4. The dunes down the south-west side: crests across the wind.
 * 5. The pads and paths: the quay, the caravanserai, the square, the camp, the houses on the mesa,
 *    the court, the yard, the terrace, and the two stairs up the walls.
 * 6. The cove, carved in last, with the berth's dredged pocket; the fresh water (`water.ts`) is
 *    carved into this by `sunspireHeight`.
 */

const SEED = 0x5a_9d_05;

function smin(a: number, b: number, k: number): number {
  const h = clamp01(0.5 + (0.5 * (b - a)) / k);
  return b + (a - b) * h - k * h * (1 - h);
}

function smax(a: number, b: number, k: number): number {
  return -smin(-a, -b, k);
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Distance from (u, v) to segment a-b, and how far along it (0-1), into `out`. */
function segment(u: number, v: number, au: number, av: number, bu: number, bv: number, out: Seg): Seg {
  const du = bu - au;
  const dv = bv - av;
  const len2 = du * du + dv * dv || 1;
  const t = clamp01(((u - au) * du + (v - av) * dv) / len2);
  out.d = Math.hypot(u - au - du * t, v - av - dv * t);
  out.t = t;
  return out;
}
interface Seg {
  d: number;
  t: number;
}
const seg: Seg = { d: 0, t: 0 };

/** The nearest point of a polyline with heights: its distance and the height there, into `out`. */
function polyline(u: number, v: number, pts: readonly Uvy[], out: Seg & { y: number }): Seg & { y: number } {
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
function pad(h: number, out: number, y: number, cut = 1.1, fill = 0.75): number {
  const lo = y - fill * out;
  const hi = y + cut * out;
  return smin(smax(h, lo, 0.6), hi, 0.6);
}

/** How far (m) outside a frame box round (cu, cv) with half-sizes (hu, hv). */
function boxOut(u: number, v: number, cu: number, cv: number, hu: number, hv: number): number {
  return Math.hypot(Math.max(0, Math.abs(u - cu) - hu), Math.max(0, Math.abs(v - cv) - hv));
}

/** How far outside a frame box given by its corners. */
function cornersOut(u: number, v: number, b: { u0: number; u1: number; v0: number; v1: number }): number {
  return boxOut(u, v, (b.u0 + b.u1) / 2, (b.v0 + b.v1) / 2, (b.u1 - b.u0) / 2, (b.v1 - b.v0) / 2);
}

// --- 1. The coast --------------------------------------------------------------------------------

const C = S.coast;

/** The signed distance (m) inland from the coast at frame (u, v), world (x, z) for its noise. */
function coastDistance(u: number, v: number, x: number, z: number): number {
  const du = u - C.centerU;
  const dist = Math.hypot(du, v);
  const r = (Math.abs(du / C.halfU) ** C.power + Math.abs(v / C.halfV) ** C.power) ** (1 / C.power);
  const d = r > 1e-6 ? dist * (1 / r - 1) : C.halfV;
  return (
    d +
    C.noise * fbm2(x / C.noiseScale, z / C.noiseScale, 3, SEED + 1) +
    C.ragged * fbm2(x / 34, z / 34, 2, SEED + 2)
  );
}

/** How much of the coast here is red sea cliff (the north-east and the south-east; 0 the gentle rest). */
function cliffiness(u: number, v: number): number {
  const northEast = smoothstep(150, 240, v) * smoothstep(-300, -220, u);
  const southEast = smoothstep(260, 340, u) * smoothstep(-160, -60, v);
  return Math.max(northEast, southEast);
}

/** The land's rise from the coast (`d` inland), and the sea's floor off it (`d` < 0). */
function coastProfile(d: number, cliff: number, x: number, z: number): number {
  if (d < 0) {
    const off = -d;
    const gentle = off * 0.1 + off * off * 0.0014;
    const steep = off * 0.6 + off * off * 0.002;
    return -Math.min(S.deepDepth, lerp(gentle, steep, cliff) + 0.6);
  }
  // Past the shore's first 45 m the coast no longer holds the land down.
  const free = Math.max(0, d - 45) ** 2 * 0.04;
  const gentle = 0.7 + d * 0.12 + free;
  const top = 20 + 9 * fbm2(x / 90, z / 90, 2, SEED + 3);
  const steep = d < top / 3.4 ? d * 3.4 : top + (d - top / 3.4) * 0.2;
  return lerp(gentle, steep + free, cliff);
}

// --- 2. The desert floor -------------------------------------------------------------------------

/** The bajada: low, open ground that rises a little inland, with long shallow swells. */
function floor(d: number, x: number, z: number): number {
  return (
    3 +
    5 * smoothstep(0, 260, d) +
    1.4 * fbm2(x / 120, z / 120, 3, SEED + 5) +
    0.5 * fbm2(x / 28, z / 28, 2, SEED + 6)
  );
}

/** The town's slope from the quay (2.2 m) to the square (8 m). */
function townSlope(u: number, v: number, x: number, z: number): number {
  const rise = 2.2 + 5.8 * smoothstep(-170, -110, u) * smoothstep(-6, 30, v) + 0.03 * Math.max(0, v - 44);
  return rise + 0.5 * fbm2(x / 50, z / 50, 2, SEED + 7);
}

/** How much of the ground is the town's, easing out at its edges. */
function townWeight(u: number, v: number, x: number, z: number): number {
  const e = Math.hypot((u + 132) / 96, (v - 52) / 56) + 0.08 * fbm2(x / 50, z / 50, 2, SEED + 9);
  return 1 - smoothstep(0.9, 1.4, e);
}

/** The distance (m) from the cove's waterline (0 in it), for its shores' rise. */
function coveShoreDistance(u: number, v: number): number {
  const head = COVE[COVE.length - 1]!;
  const uc = Math.min(head.u, Math.max(COVE[0].u, u));
  coveAt(uc, cove);
  const across = Math.max(0, v - cove.vMax, cove.vMin - v);
  return Math.hypot(Math.max(0, u - head.u), across);
}

// --- 3. The tables -------------------------------------------------------------------------------

/**
 * A table's height `out` m outside its flat top: a sheer wall `wall` m high (about 73°), then a talus
 * skirt down to the desert floor.
 */
function table(out: number, top: number, wall: number): number {
  if (out <= 0) return top;
  const run = wall / 3.3;
  if (out < run) return top - out * 3.3;
  return top - wall - (out - run) * 0.62;
}

/** The rim's wander (m): a table's edge is ragged, but not where something is built against it. */
function rim(x: number, z: number): number {
  return 3.5 * fbm2(x / 46, z / 46, 3, SEED + 11) + 1.2 * fbm2(x / 12, z / 12, 2, SEED + 12);
}

/** The Low Mesa and the High Mesa over the floor. */
function mesas(h: number, u: number, v: number, x: number, z: number): number {
  const r = rim(x, z);
  const low = cornersOut(u, v, LOW_MESA);
  h = smax(h, table(low > 3 ? low + r : low, LOW_MESA.y, 18), 2);
  const high = cornersOut(u, v, HIGH_MESA);
  h = smax(h, table(high > 3 ? high + r : high, HIGH_MESA.y, 34), 2);
  return h;
}

/** Red Butte: three stepped benches (60, 100 and the top), a 40 m wall between each. */
function butte(h: number, u: number, v: number, x: number, z: number): number {
  const r0 = Math.hypot(u - BUTTE.u, v - BUTTE.v);
  if (r0 > BUTTE.r + 110) return h;
  const r = r0 + 7 * fbm2(x / 70, z / 70, 3, SEED + 13) + 2.5 * fbm2(x / 16, z / 16, 2, SEED + 14);
  const top = table(r - BUTTE.r * 0.34, BUTTE.y, 40);
  const mid = table(r - BUTTE.r * 0.62, 100, 40);
  const foot = table(r - BUTTE.r, 60, 44);
  return smax(h, Math.max(top, mid, foot), 3);
}

/** The Needle (a butte with a relay mirror) and Library Rock (a sea stack). */
function needle(h: number, u: number, v: number): number {
  const r = Math.hypot(u - NEEDLE.u, v - NEEDLE.v);
  if (r > NEEDLE.r + 50) return h;
  return smax(h, table(r - NEEDLE.r * 0.55, NEEDLE.y, 20), 2);
}

function libraryRock(h: number, u: number, v: number, x: number, z: number): number {
  const r0 = Math.hypot(u - LIBRARY_ROCK.u, v - LIBRARY_ROCK.v);
  if (r0 > LIBRARY_ROCK.r + 60) return h;
  const r = r0 + 3 * fbm2(x / 18, z / 18, 2, SEED + 15);
  // A stack straight out of deep water: its wall runs down past the waterline to a rubble foot.
  const stack = r < LIBRARY_ROCK.r * 0.5 ? LIBRARY_ROCK.y : LIBRARY_ROCK.y - (r - LIBRARY_ROCK.r * 0.5) * 3.4;
  const footing = -4 - (r - LIBRARY_ROCK.r) * 0.5;
  return Math.max(h, Math.max(stack, Math.min(footing, -2)));
}

// --- 4. The dunes --------------------------------------------------------------------------------

/** The wind's own axes (it blows from the south-west): along it and across it. */
const WIND = { x: 0.8, z: -0.6 } as const;

/** How much of the ground here is the dune field (0-1). */
function duneWeight(u: number, v: number, d: number): number {
  return (
    smoothstep(DUNES.u0 - 40, DUNES.u0 + 40, u) *
    (1 - smoothstep(DUNES.u1 - 60, DUNES.u1 + 30, u)) *
    (1 - smoothstep(DUNES.v1 - 50, DUNES.v1 + 20, v)) *
    smoothstep(24, 80, d)
  );
}

/** Dune crests across the wind: a gentle windward back and a steeper slip face. */
function dunes(u: number, v: number, x: number, z: number, d: number): number {
  const w = duneWeight(u, v, d);
  if (w <= 0) return 0;
  const along = x * WIND.x + z * WIND.z;
  const across = -x * WIND.z + z * WIND.x;
  const n = fbm2(
    along / 64 + 0.35 * fbm2(across / 150, along / 300, 2, SEED + 17),
    across / 210,
    3,
    SEED + 16,
  );
  const ridged = 1 - Math.abs(n) * 2;
  return w * DUNES.crest * Math.max(0, ridged) ** 1.5;
}

// --- 5. The pads and paths -----------------------------------------------------------------------

const PATHS: readonly (readonly [readonly Uvy[], number])[] = [
  [QUAY_LANE, 2.4],
  [OASIS_PATH, 2],
  [SIGNAL_STAIR, 2.2],
  [MESA_PATH, 2],
  [SUN_STAIR, 2],
];

/** Each path's stretches as pads in turn. */
function paths(h: number, u: number, v: number): number {
  for (const [pts, w] of PATHS)
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i]!;
      const b = pts[i + 1]!;
      segment(u, v, a.u, a.v, b.u, b.v, seg);
      h = pad(h, Math.max(0, seg.d - w), lerp(a.y, b.y, seg.t), 1.3, 0.9);
    }
  return h;
}

function pads(h: number, u: number, v: number): number {
  // The quay's deck (its face is the stone wall).
  if (v >= QUAY.v - 0.6)
    h = pad(
      h,
      boxOut(u, v, (QUAY.u0 + QUAY.u1) / 2, QUAY.v + 7, (QUAY.u1 - QUAY.u0) / 2, 7),
      QUAY.top,
      1.4,
      1,
    );
  h = pad(h, boxOut(u, v, SQUARE.u, SQUARE.v, SQUARE.halfU, SQUARE.halfV), SQUARE.y, 1.2, 0.9);
  h = pad(
    h,
    boxOut(u, v, CARAVANSERAI.u, CARAVANSERAI.v, CARAVANSERAI.halfU, CARAVANSERAI.halfV),
    CARAVANSERAI.y,
    1.2,
    0.9,
  );
  // The camp's ground and the well beside it.
  h = pad(h, Math.max(0, Math.hypot(u - CAMP.u, v - CAMP.v) - CAMP.r), CAMP.y, 0.6, 0.5);
  h = pad(h, Math.max(0, Math.hypot(u - WELL.u, v - WELL.v) - 3), WELL.y, 0.6, 0.5);
  // On the Low Mesa: the Signal House, the court and the yard (the plateau holds their level already).
  h = pad(
    h,
    boxOut(u, v, SIGNAL_HOUSE.u, SIGNAL_HOUSE.v, SIGNAL_HOUSE.halfU + 2, SIGNAL_HOUSE.halfV + 2),
    SIGNAL_HOUSE.y,
    1.4,
    1,
  );
  h = pad(h, boxOut(u, v, COURT.u, COURT.v, COURT.halfU, COURT.halfV), COURT.y, 1.4, 1);
  h = pad(h, boxOut(u, v, YARD.u, YARD.v, YARD.halfU, YARD.halfV), YARD.y, 1.4, 1);
  // On the High Mesa: the terrace and the Sunspire's foot.
  h = pad(h, Math.max(0, Math.hypot(u - TERRACE.u, v - TERRACE.v) - TERRACE.r), TERRACE.y, 1.4, 1);
  h = pad(h, boxOut(u, v, SPIRE.u, SPIRE.v, SPIRE.side / 2 + 3, SPIRE.side / 2 + 3), SPIRE.base, 1.4, 1);
  return h;
}

// --- 6. The cove ---------------------------------------------------------------------------------

/** The cove's shores (v), floor and the across-fraction, interpolated along u, into `out`. */
function coveAt(u: number, out: { vMin: number; vMax: number; floor: number }): boolean {
  if (u < COVE[0].u || u > COVE[COVE.length - 1]!.u + 20) return false;
  let i = 0;
  while (i + 2 < COVE.length && u > COVE[i + 1]!.u) i++;
  const a = COVE[i]!;
  const b = COVE[i + 1]!;
  const t = clamp01((u - a.u) / (b.u - a.u));
  out.vMin = lerp(a.vMin, b.vMin, t);
  out.vMax = lerp(a.vMax, b.vMax, t);
  out.floor = lerp(a.floor, b.floor, t);
  // The shores wander (no ruled edge), less so along the quay.
  const quay = u > QUAY.u0 - 20 && u < QUAY.u1 + 10 ? 0.15 : 1;
  out.vMin += 9 * fbm2(u / 70, 3.1, 2, SEED + 21);
  out.vMax += 5 * quay * fbm2(u / 50, 7.7, 2, SEED + 22);
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
const cove = { vMin: 0, vMax: 0, floor: 0 };

function carveCove(h: number, u: number, v: number): number {
  // The quay's deck stands over the cove's edge (its face is a wall).
  if (v >= QUAY.v - 0.6 && u >= QUAY.u0 && u <= QUAY.u1) return h;
  if (!coveAt(u, cove)) return h;
  const mid = (cove.vMin + cove.vMax) / 2;
  const half = Math.max(1, (cove.vMax - cove.vMin) / 2);
  const side = v < mid ? -1 : 1;
  const t = Math.abs(v - mid) / half;
  let bed: number;
  // The south-west side shelves as a beach (a long shallow run); the town's side drops off sooner.
  const shelf = side < 0 ? 0.62 : 0.86;
  if (t < shelf) bed = cove.floor * (1 - 0.12 * t * t);
  else if (t < 1)
    bed = lerp(
      cove.floor * (1 - 0.12 * shelf * shelf),
      0.6,
      ((t - shelf) / (1 - shelf)) ** (side < 0 ? 0.7 : 1),
    );
  else bed = 0.6 + (t - 1) * half * (side < 0 ? 0.1 : 0.45);
  h = smin(h, bed, 2.5);
  // The berth's dredged pocket along the quay's face.
  const pocket = boxOut(u, v, (QUAY.u0 + QUAY.u1) / 2, QUAY.v - 9.5, (QUAY.u1 - QUAY.u0) / 2 + 6, 8.6);
  if (pocket < 12 && v < QUAY.v - 0.6) h = Math.min(h, -6.5 + pocket * 0.9);
  return h;
}

/** The sea floor eases down to the deep floor in the last 60 m inside the baked bounds. */
function edgeApron(x: number, z: number, h: number): number {
  const b = S.bounds;
  const edge = Math.min(x - b.minX, b.maxX - x, z - b.minZ, b.maxZ - z);
  if (edge >= 60 || h > -1) return h;
  return h + (-S.deepDepth - h) * smoothstep(60, 4, edge) * smoothstep(-1, -8, h);
}

/** The land's height off the coast and the cove: the floor, the town, the tables and the dunes. */
function inlandHeight(u: number, v: number, x: number, z: number, d: number): number {
  let h = floor(d, x, z);
  // The cove's shores rise gently to the floor.
  const dl = coveShoreDistance(u, v);
  h = smin(h, 0.8 + dl * 0.1 + Math.max(0, dl - 60) ** 2 * 0.004, 4);
  const tw = townWeight(u, v, x, z);
  if (tw > 0) h = lerp(h, townSlope(u, v, x, z), tw);
  h += dunes(u, v, x, z, d);
  h = mesas(h, u, v, x, z);
  h = butte(h, u, v, x, z);
  return needle(h, u, v);
}

const frame = { u: 0, v: 0 };

/** Sunspire's ground height (m) at world (x, z), before its fresh water is carved. */
export function sunspireHeightDry(x: number, z: number): number {
  toFrame(x, z, frame);
  const { u, v } = frame;
  const d = coastDistance(u, v, x, z);
  const cliff = cliffiness(u, v);
  const coastal = coastProfile(d, cliff, x, z);
  let h: number;
  if (d < -40) h = coastal;
  else {
    h = smin(inlandHeight(u, v, x, z, d), coastal, 6);
    h = paths(pads(h, u, v), u, v);
    // The pads mustn't lift ground out of the sea at the coast.
    if (d < 6) h = Math.min(h, coastal + Math.max(0, d) * 3);
  }
  h = carveCove(h, u, v);
  h = libraryRock(h, u, v, x, z);
  return edgeApron(x, z, Math.max(h, -S.deepDepth));
}

let water: SunspireWater | null = null;

/** Sunspire's fresh water, carved into its uncarved height (made once). */
export function sunspireWater(): SunspireWater {
  return (water ??= createSunspireWater(sunspireHeightDry));
}

/** Sunspire's water over its ground for the terrain's coarse levels to keep under. */
export function sunspireTerrainWater(): TerrainFreshWater {
  const fresh = sunspireWater();
  return { box: fresh.box, levelAt: (x, z) => fresh.levelAt(x, z) };
}

/** Sunspire's ground height (m) at world (x, z), with its fresh water carved in. */
export function sunspireHeight(x: number, z: number): number {
  return sunspireWater().carve(x, z, sunspireHeightDry(x, z));
}

/** The ground's normal at (x, z), from the height's central differences 1.5 m either side. */
export function sunspireNormal(
  x: number,
  z: number,
  out: Float32Array | number[],
  heightAt: (x: number, z: number) => number = sunspireHeight,
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

/** The signed distance (m) inland from the coast at world (x, z) (< 0 at sea, the cove not counted). */
export function sunspireCoastDistance(x: number, z: number): number {
  toFrame(x, z, frame);
  return coastDistance(frame.u, frame.v, x, z);
}

/** How much frame (u, v) is on a built pad or path (trodden ground), 0-1. */
export function sunspireTrodden(u: number, v: number): number {
  let t = 0;
  for (const [pts, w] of PATHS) {
    polyline(u, v, pts, near);
    t = Math.max(t, 1 - smoothstep(w - 0.6, w + 1, near.d));
  }
  const box = (cu: number, cv: number, hu: number, hv: number, edge = 1.5) =>
    1 - smoothstep(0, edge, boxOut(u, v, cu, cv, hu, hv));
  t = Math.max(t, box(SQUARE.u, SQUARE.v, SQUARE.halfU, SQUARE.halfV));
  t = Math.max(t, box((QUAY.u0 + QUAY.u1) / 2, QUAY.v + 7, (QUAY.u1 - QUAY.u0) / 2, 7));
  t = Math.max(t, box(CARAVANSERAI.u, CARAVANSERAI.v, CARAVANSERAI.halfU, CARAVANSERAI.halfV));
  t = Math.max(t, box(COURT.u, COURT.v, COURT.halfU, COURT.halfV));
  t = Math.max(t, box(YARD.u, YARD.v, YARD.halfU, YARD.halfV));
  t = Math.max(t, box(SIGNAL_HOUSE.u, SIGNAL_HOUSE.v, SIGNAL_HOUSE.halfU + 2, SIGNAL_HOUSE.halfV + 2));
  t = Math.max(t, 1 - smoothstep(CAMP.r - 2, CAMP.r + 1, Math.hypot(u - CAMP.u, v - CAMP.v)));
  t = Math.max(t, 1 - smoothstep(TERRACE.r - 1, TERRACE.r + 1, Math.hypot(u - TERRACE.u, v - TERRACE.v)));
  return t;
}

/** How much frame (u, v) is the oasis: the green ground round the pool, the camp and the falaj (0-1). */
export function sunspireOasis(u: number, v: number): number {
  const p = WATER.pool;
  const grove = 1 - smoothstep(26, 44, Math.hypot((u - (p.u - 12)) * 0.8, v - (p.v + 6)));
  return grove;
}

const normal = [0, 1, 0];
const maskFrame = { u: 0, v: 0 };

/**
 * Ground masks. Sand: nearly everything that isn't steep (the desert floor, the dunes, the beaches,
 * the tables' tops, trodden ground). Cliff: the tables' walls and the red sea cliffs. Rock: talus
 * under the walls, wet stones at the water's edge, the sea floor's rock. Grass: only the oasis and
 * the banks of its water (the rest of the island grows cactus and scrub, not turf).
 */
export function sunspireMasks(
  x: number,
  z: number,
  heightAt: (x: number, z: number) => number = sunspireHeight,
): { sand: number; grass: number; rock: number; cliff: number } {
  const h = heightAt(x, z);
  const n = sunspireNormal(x, z, normal, heightAt);
  const slope = Math.hypot(n[0]!, n[2]!) / Math.max(0.05, n[1]!);
  toFrame(x, z, maskFrame);
  const { u, v } = maskFrame;
  // Walls: every steep face above the tide line.
  const wall = smoothstep(1.0, 1.9, slope) * smoothstep(-4, -1, h);
  // Talus: the broken skirt under a wall (moderate slopes), patchy.
  const patch = smoothstep(-0.15, 0.25, fbm2(x / 26, z / 26, 3, SEED + 31));
  const talus =
    smoothstep(0.38, 0.6, slope) *
    (1 - smoothstep(0.95, 1.2, slope)) *
    (0.6 + 0.4 * patch) *
    smoothstep(1.5, 4, h);
  const underSea = 1 - smoothstep(-1.2, -0.2, h);
  const seabed = underSea * Math.max(0.2, smoothstep(0.1, 0.35, fbm2(x / 13, z / 13, 3, SEED + 33)) * 0.8);
  let rock = Math.max(talus, seabed);
  let sand = 1 - smoothstep(0.5, 1.0, slope);
  // The oasis: turf by the water, thinning to bare sand at the grove's edge.
  const oasis = h > 0.5 ? sunspireOasis(u, v) * (1 - smoothstep(0.35, 0.7, slope)) : 0;
  let grass = oasis * (0.55 + 0.45 * smoothstep(-0.2, 0.3, fbm2(x / 9, z / 9, 2, SEED + 35)));
  // Trodden ground stays bare.
  const trodden = h > 0.4 ? sunspireTrodden(u, v) : 0;
  grass *= 1 - trodden;
  rock *= 1 - trodden;
  // Fresh water: wet stones at its edge, a green bank behind them.
  const fresh = sunspireWater().shoreDistance(x, z, 10);
  if (fresh < 10 && h > 0.5) {
    const wet = 1 - smoothstep(0, 1.2, fresh);
    const bank =
      (1 - smoothstep(1, 5, fresh)) * (1 - wet) * (1 - smoothstep(0.5, 1.1, slope)) * (1 - trodden);
    rock = Math.max(rock, wet * 0.75);
    grass = Math.max(grass, bank * 0.9);
  }
  const cliff = clamp01(wall);
  rock = clamp01(rock * (1 - cliff));
  grass = clamp01(grass * (1 - cliff) * (1 - rock * 0.8));
  sand = clamp01(sand * (1 - cliff) * (1 - rock * 0.85) * (1 - grass * 0.9));
  const total = sand + grass + rock + cliff;
  if (total < 0.001) return { sand: 0.7, grass: 0, rock: 0.3, cliff: 0 };
  return { sand: sand / total, grass: grass / total, rock: rock / total, cliff: cliff / total };
}

import { fbm2 } from '../../terrain/cove-height';
import { clamp01, smoothstep } from '../../../util/math';
import type { TerrainFreshWater } from '../../terrain/water-caps';
import {
  BEN,
  BRAE,
  CLOISTER,
  EAST_GATE,
  GATEHOUSE,
  GUILDCREST as G,
  KNOLL,
  LOCH,
  MILL,
  MILLS,
  PEBBLE_SHORE,
  QUAY,
  RIDGE,
  SQUARE,
  TERRACE,
  toFrame,
  WATER,
  YARD,
} from './layout';
import { createGuildcrestWater, type GuildcrestWater } from './water';

/**
 * Guildcrest's ground: one height function (frame u, v), sampled by the bake.
 *
 * 1. The coast: a superellipse in the frame whose edge wanders. `d` is the distance inland from it.
 *    The north-east flank ends in granite sea cliffs (20-45 m); the south-west and the loch's mouth
 *    shelve gently.
 * 2. The upland: a moor at 30-40 m, a broad shoulder that rises east to the lochan's bowl, Ben
 *    Scrivener's dome (182 m, a corrie on its north face) and the Guild Crest's ridge.
 * 3. The lowland: the harbour town's slope from the quay (2.2 m) to Guild Square (10 m), and low hills
 *    round the loch, below an escarpment (the Kirk Brae climbs it; the Copyist's Linn falls over a
 *    crag in it) up to the upland.
 * 4. The glen: the Scriptor's Burn's valley from the lochan west to the linn's lip.
 * 5. The pads: the quay, the square, the brae's lane, the knoll's plateau (the abbey), the ridge path,
 *    the guildhall yard and the mills' pads, each holding its level with cut and fill slopes.
 * 6. The sea loch, carved in last, with the berth's dredged pocket; the fresh water (`water.ts`) is
 *    carved into this by `guildcrestHeight`.
 */

const SEED = 0x6c_1d_04;

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
function polyline(
  u: number,
  v: number,
  pts: readonly { readonly u: number; readonly v: number; readonly y: number }[],
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
function pad(h: number, out: number, y: number, cut = 1.1, fill = 0.75): number {
  const lo = y - fill * out;
  const hi = y + cut * out;
  return smin(smax(h, lo, 0.6), hi, 0.6);
}

/** How far (m) outside a frame box round (cu, cv) with half-sizes (hu, hv). */
function boxOut(u: number, v: number, cu: number, cv: number, hu: number, hv: number): number {
  return Math.hypot(Math.max(0, Math.abs(u - cu) - hu), Math.max(0, Math.abs(v - cv) - hv));
}

// --- 1. The coast --------------------------------------------------------------------------------

const C = G.coast;

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

/** How much of the coast here is the north-east's granite sea cliff (0 the gentle south-west). */
function cliffiness(u: number, v: number): number {
  return smoothstep(70, 170, v) * smoothstep(-330, -250, u);
}

/** The land's rise from the coast (`d` inland), and the sea's floor off it (`d` < 0). */
function coastProfile(d: number, cliff: number, x: number, z: number): number {
  if (d < 0) {
    const off = -d;
    const gentle = off * 0.13 + off * off * 0.0016;
    const steep = off * 0.6 + off * off * 0.002;
    return -Math.min(G.deepDepth, lerp(gentle, steep, cliff) + 0.6);
  }
  // Past the shore’s first 45 m the coast no longer holds the land down.
  const free = Math.max(0, d - 45) ** 2 * 0.04;
  const gentle = 0.9 + d * 0.3 + free;
  const top = 32 + 13 * fbm2(x / 90, z / 90, 2, SEED + 3);
  const steep = d < top / 3.2 ? d * 3.2 : top + (d - top / 3.2) * 0.34;
  return lerp(gentle, steep + free, cliff);
}

// --- 2. The upland -------------------------------------------------------------------------------

/** Ben Scrivener: a broad cone with a rounded top, spurs down its flanks, and a corrie on its north face. */
function ben(u: number, v: number, x: number, z: number): number {
  const r = Math.hypot(u - BEN.u, v - BEN.v);
  const R = BEN.r + 25 * fbm2(x / 140, z / 140, 2, SEED + 4);
  const t = Math.min(1, r / R);
  // A cone that rounds over at the top (no spire) and flares out at its foot.
  let h = BEN.y * (1 - t ** 1.6) ** 1.9;
  // Spurs and gullies down its flanks (ridged noise, strongest mid-slope).
  const ridged = 1 - Math.abs(fbm2(x / 70, z / 70, 3, SEED + 13));
  h += 26 * (ridged - 0.55) * Math.sin(Math.PI * t);
  // The corrie: a bowl in its north face (north is frame (−0.8, 0.6)).
  const cu = BEN.u - 0.8 * 80;
  const cv = BEN.v + 0.6 * 80;
  const cr = Math.hypot(u - cu, v - cv);
  if (cr < 52) h -= 22 * (1 - (cr / 52) ** 2) ** 2;
  return h;
}

/**
 * The Guild Crest: its crest line's height, falling ~22° to either side (the highest of each stretch's
 * own, so no step where the nearest stretch changes).
 */
function ridge(u: number, v: number): number {
  let h = -Infinity;
  for (let i = 0; i + 1 < RIDGE.length; i++) {
    const a = RIDGE[i]!;
    const b = RIDGE[i + 1]!;
    segment(u, v, a.u, a.v, b.u, b.v, seg);
    h = Math.max(h, lerp(a.y, b.y, seg.t) - Math.max(0, seg.d - 3) * 0.4);
  }
  return h;
}

/** The upland: moor, the shoulder east of the knoll, the ben and the ridge. */
function upland(u: number, v: number, x: number, z: number): number {
  const moor = 27 + 6 * fbm2(x / 220, z / 220, 3, SEED + 5);
  const shoulder = 70 - 0.22 * Math.hypot(u - 190, v - 20);
  let h = smax(moor, shoulder, 8);
  // The lochan's bowl on the knoll's back.
  const lr = Math.hypot(u - WATER.lochan.u, v - WATER.lochan.v);
  if (lr < 90) h = smax(h, WATER.lochan.y + 1.6 - Math.max(0, lr - 24) * 0.2, 6);
  h = smax(h, ben(u, v, x, z), 16);
  h = smax(h, ridge(u, v), 8);
  // Low rolling on the moor (heather hummocks, tens of metres across).
  return h + 1.6 * fbm2(x / 40, z / 40, 3, SEED + 6);
}

// --- 3. The lowland and the escarpment -----------------------------------------------------------

/** The town's slope from the quay to the square. */
function lowland(u: number, v: number, x: number, z: number): number {
  const town = 2.2 + 7.8 * smoothstep(-165, -100, u) * smoothstep(-10, 30, v) + 0.04 * Math.max(0, v - 40);
  return town + 0.8 * fbm2(x / 50, z / 50, 2, SEED + 7);
}

/** How much of the upland stands over the town (0 the town's slope, 1 above the escarpment). */
function uplandWeight(u: number, v: number): number {
  const s = u + 0.25 * (v - 80);
  const broad = smoothstep(-64, -32, s);
  // The linn's crag: the escarpment steps sharply where the burn falls over it.
  const lip = WATER.linnLip;
  const pool = WATER.linnPool;
  const mu = (lip.u + pool.u) / 2;
  const mv = (lip.v + pool.v) / 2;
  const crag = 1 - smoothstep(14, 26, Math.hypot(u - mu, v - mv));
  return lerp(broad, smoothstep(-41, -32, s), crag);
}

/** How much of the ground is the town's (its slope under the escarpment), easing out at its edges. */
function townWeight(u: number, v: number, x: number, z: number): number {
  const e = Math.hypot((u + 128) / 100, (v - 50) / 52) + 0.08 * fbm2(x / 50, z / 50, 2, SEED + 9);
  return 1 - smoothstep(0.92, 1.45, e);
}

/** The distance (m) from the loch's waterline (0 in it), for its shores' rise. */
function lochShoreDistance(u: number, v: number): number {
  const head = LOCH[LOCH.length - 1]!;
  const uc = Math.min(head.u, Math.max(LOCH[0].u, u));
  lochAt(uc, loch);
  const across = Math.max(0, v - loch.vMax, loch.vMin - v);
  return Math.hypot(Math.max(0, u - head.u), across);
}

/** The land's height off the coast and the loch: the upland, the loch's hillsides, the town. */
function inlandHeight(u: number, v: number, x: number, z: number): number {
  let h = upland(u, v, x, z);
  // The loch's sides rise as low hills (about 20°) to the moor.
  const dl = lochShoreDistance(u, v);
  const hills = 1 + dl * 0.36 + Math.max(0, dl - 110) ** 2 * 0.012;
  h = smin(h, hills + 4 * fbm2(x / 60, z / 60, 2, SEED + 8) * smoothstep(10, 40, dl), 8);
  const tw = townWeight(u, v, x, z);
  if (tw > 0) h = lerp(h, lerp(lowland(u, v, x, z), h, uplandWeight(u, v)), tw);
  return glen(h, u, v);
}

// --- 4. The glen ---------------------------------------------------------------------------------

const GLEN = [
  { u: WATER.lochan.u, v: WATER.lochan.v, y: WATER.lochan.y - 0.6 },
  ...WATER.burn.map(([u, v], i, all) => ({
    u,
    v,
    y: lerp(WATER.lochan.y - 1.2, WATER.linnLip.y + 0.4, (i + 1) / all.length),
  })),
  { u: WATER.linnLip.u, v: WATER.linnLip.v, y: WATER.linnLip.y },
];

function glen(h: number, u: number, v: number): number {
  // The lowest of each stretch's valley (continuous where the nearest stretch changes).
  let floor = Infinity;
  for (let i = 0; i + 1 < GLEN.length; i++) {
    const a = GLEN[i]!;
    const b = GLEN[i + 1]!;
    segment(u, v, a.u, a.v, b.u, b.v, seg);
    const d = seg.d;
    floor = Math.min(
      floor,
      lerp(a.y, b.y, seg.t) + Math.max(0, d - 5) * 0.3 + Math.max(0, d - 40) ** 2 * 0.02,
    );
  }
  return smin(h, floor, 4);
}

// --- 5. The pads ---------------------------------------------------------------------------------

/** The ridge path: from the east gate along the crest to the guildhall yard, then on past the mills. */
export const RIDGE_PATH = [
  { u: EAST_GATE.u, v: EAST_GATE.v, y: EAST_GATE.y },
  { u: 49, v: 139.5, y: 36.4 },
  { u: 56, v: 146, y: 37.6 },
  { u: 70, v: 152, y: 40 },
  { u: YARD.u - YARD.halfU, v: YARD.v - 2, y: YARD.y },
] as const;

/** The track on from the yard to the mills. */
export const MILL_TRACK = [
  { u: 104.5, v: YARD.v + 4, y: YARD.y },
  { u: 104.5, v: YARD.v + YARD.halfV + 1.5, y: YARD.y },
  { u: 112, v: 176, y: 47 },
  { u: MILLS[0].u, v: MILLS[0].v, y: MILLS[0].y },
  { u: 140, v: 204, y: 55.5 },
  { u: MILLS[1].u, v: MILLS[1].v, y: MILLS[1].y },
  { u: 166, v: 190, y: 57.5 },
  { u: MILLS[2].u, v: MILLS[2].v, y: MILLS[2].y },
] as const;

/** The tower stair's path: from the yard's west side down to the tower terrace's foot. */
export const TOWER_PATH = [
  { u: 78, v: 147, y: YARD.y },
  { u: 80, v: 134, y: YARD.y },
  { u: 79, v: 131, y: 41 },
  { u: 78.6, v: 129, y: 41 },
  { u: 77.6, v: 126, y: TERRACE.y },
  { u: 72, v: 121, y: TERRACE.y },
] as const;

/** The lane from the quay up past the inn to the square's west side. */
export const QUAY_LANE = [
  { u: -190, v: 18, y: QUAY.top },
  { u: -170, v: 30, y: 2.6 },
  { u: -150, v: 38, y: 4.2 },
  { u: -130, v: 41, y: 7 },
  { u: SQUARE.u - SQUARE.halfU, v: SQUARE.v - 4, y: SQUARE.y },
] as const;

/** Each path's stretches as pads in turn (no cut-off: a far pad's slopes are out of reach anyway). */
function paths(h: number, u: number, v: number): number {
  for (const [pts, w] of PATHS)
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i]!;
      const b = pts[i + 1]!;
      segment(u, v, a.u, a.v, b.u, b.v, seg);
      h = pad(h, Math.max(0, seg.d - w), lerp(a.y, b.y, seg.t), 1.2, 0.8);
    }
  return h;
}

const PATHS = [
  [QUAY_LANE, 2.4],
  [BRAE, 2.2],
  [RIDGE_PATH, 2],
  [MILL_TRACK, 1.6],
  [TOWER_PATH, 1.6],
] as const;

function pads(h: number, u: number, v: number): number {
  // The quay's deck (its face is the stone wall, stage 2) and the slipway at its east end.
  if (v >= QUAY.v - 0.6)
    h = pad(
      h,
      boxOut(u, v, (QUAY.u0 + QUAY.u1) / 2, QUAY.v + 7, (QUAY.u1 - QUAY.u0) / 2, 7),
      QUAY.top,
      1.4,
      1,
    );
  // Guild Square.
  h = pad(h, boxOut(u, v, SQUARE.u, SQUARE.v, SQUARE.halfU, SQUARE.halfV), SQUARE.y, 1.2, 0.9);
  // The inn's yard and porch at the quay's head.
  h = pad(h, boxOut(u, v, -160, 40, 10, 8), 3, 1.2, 0.9);
  // The Abbey Knoll's plateau; the gatehouse's apron at the brae's top a step down.
  h = pad(
    h,
    boxOut(
      u,
      v,
      (KNOLL.u0 + KNOLL.u1) / 2,
      (KNOLL.v0 + KNOLL.v1) / 2,
      (KNOLL.u1 - KNOLL.u0) / 2,
      (KNOLL.v1 - KNOLL.v0) / 2,
    ),
    KNOLL.y,
    0.7,
    1.4,
  );
  h = pad(h, boxOut(u, v, GATEHOUSE.u, GATEHOUSE.v, 4, 5), GATEHOUSE.y, 1.6, 1.2);
  // The tower's terrace stands on a plinth (stage 2): the ground round it at the knoll's level, and
  // a shelf east of the tower toward the yard.
  h = pad(h, boxOut(u, v, TERRACE.u + 4, TERRACE.v + 4, 8, 8), TERRACE.y, 1.4, 1);
  // The guildhall yard and the Guildhall of Journeymen on its south side.
  h = pad(h, boxOut(u, v, YARD.u, YARD.v, YARD.halfU, YARD.halfV), YARD.y, 1.4, 0.9);
  h = pad(h, boxOut(u, v, 102, 139, 14.5, 5.5), YARD.y, 1.4, 0.9);
  // The mills' pads.
  for (const m of MILLS) h = pad(h, Math.max(0, Math.hypot(u - m.u, v - m.v) - MILL.pad), m.y, 1.2, 0.8);
  return h;
}

// --- 6. The sea loch -----------------------------------------------------------------------------

/** The loch's shores (v), floor and the across-fraction, interpolated along u, into `out`. */
function lochAt(u: number, out: { vMin: number; vMax: number; floor: number }): boolean {
  if (u < LOCH[0].u || u > LOCH[LOCH.length - 1]!.u + 20) return false;
  let i = 0;
  while (i + 2 < LOCH.length && u > LOCH[i + 1]!.u) i++;
  const a = LOCH[i]!;
  const b = LOCH[i + 1]!;
  const t = clamp01((u - a.u) / (b.u - a.u));
  out.vMin = lerp(a.vMin, b.vMin, t);
  out.vMax = lerp(a.vMax, b.vMax, t);
  out.floor = lerp(a.floor, b.floor, t);
  // The shores wander (no ruled edge), less so along the quay.
  const quay = u > QUAY.u0 - 20 && u < QUAY.u1 + 10 ? 0.15 : 1;
  out.vMin += 7 * fbm2(u / 60, 3.1, 2, SEED + 11);
  out.vMax += 5 * quay * fbm2(u / 50, 7.7, 2, SEED + 12);
  // Past the head the loch closes in a rounded end.
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
const loch = { vMin: 0, vMax: 0, floor: 0 };

function sealoch(h: number, u: number, v: number): number {
  // The quay's deck stands over the loch's edge (its face is a wall).
  if (v >= QUAY.v - 0.6 && u >= QUAY.u0 && u <= QUAY.u1) return h;
  if (!lochAt(u, loch)) return h;
  const mid = (loch.vMin + loch.vMax) / 2;
  const half = Math.max(1, (loch.vMax - loch.vMin) / 2);
  const t = Math.abs(v - mid) / half;
  let floor: number;
  if (t < 0.86) floor = loch.floor * (1 - 0.12 * t * t);
  else if (t < 1) floor = lerp(loch.floor * 0.91, 0.6, (t - 0.86) / 0.14);
  else floor = 0.6 + (t - 1) * half * 0.45;
  h = smin(h, floor, 2.5);
  // The berth's dredged pocket along the quay's face.
  const pocket = boxOut(u, v, (QUAY.u0 + QUAY.u1) / 2, QUAY.v - 9.5, (QUAY.u1 - QUAY.u0) / 2 + 6, 8.6);
  if (pocket < 12 && v < QUAY.v - 0.6) h = Math.min(h, -6.5 + pocket * 0.9);
  return h;
}

/** The pebble shore at the loch's head: a low gravel beach where the lower burn comes in. */
function pebbleShore(h: number, u: number, v: number): number {
  const r = Math.hypot(u - PEBBLE_SHORE.u, v - PEBBLE_SHORE.v);
  if (r > PEBBLE_SHORE.r + 20) return h;
  const beach = -0.8 + Math.max(0, r - 4) * 0.12;
  return lerp(h, Math.min(h, Math.max(beach, -1.4)), 1 - smoothstep(PEBBLE_SHORE.r, PEBBLE_SHORE.r + 16, r));
}

/** The sea floor eases down to the deep floor in the last 60 m inside the baked bounds. */
function edgeApron(x: number, z: number, h: number): number {
  const b = G.bounds;
  const edge = Math.min(x - b.minX, b.maxX - x, z - b.minZ, b.maxZ - z);
  if (edge >= 60 || h > -1) return h;
  return h + (-G.deepDepth - h) * smoothstep(60, 4, edge) * smoothstep(-1, -8, h);
}

const frame = { u: 0, v: 0 };

/** Guildcrest's ground height (m) at world (x, z), before its fresh water is carved. */
export function guildcrestHeightDry(x: number, z: number): number {
  toFrame(x, z, frame);
  const { u, v } = frame;
  const d = coastDistance(u, v, x, z);
  const cliff = cliffiness(u, v);
  const coastal = coastProfile(d, cliff, x, z);
  let h: number;
  if (d < -40) h = coastal;
  else {
    h = smin(inlandHeight(u, v, x, z), coastal, 6);
    h = paths(pads(h, u, v), u, v);
    // The pads mustn't lift ground out of the sea at the coast.
    if (d < 6) h = Math.min(h, coastal + Math.max(0, d) * 3);
  }
  h = sealoch(h, u, v);
  h = pebbleShore(h, u, v);
  return edgeApron(x, z, Math.max(h, -G.deepDepth));
}

let water: GuildcrestWater | null = null;

/** Guildcrest's fresh water, carved into its uncarved height (made once). */
export function guildcrestWater(): GuildcrestWater {
  return (water ??= createGuildcrestWater(guildcrestHeightDry));
}

/** Guildcrest's water over its ground for the terrain's coarse levels to keep under. */
export function guildcrestTerrainWater(): TerrainFreshWater {
  const fresh = guildcrestWater();
  return { box: fresh.box, levelAt: (x, z) => fresh.levelAt(x, z) };
}

/** Guildcrest's ground height (m) at world (x, z), with its fresh water carved in. */
export function guildcrestHeight(x: number, z: number): number {
  return guildcrestWater().carve(x, z, guildcrestHeightDry(x, z));
}

/** The ground's normal at (x, z), from the height's central differences 1.5 m either side. */
export function guildcrestNormal(
  x: number,
  z: number,
  out: Float32Array | number[],
  heightAt: (x: number, z: number) => number = guildcrestHeight,
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

/** The signed distance (m) inland from the coast at world (x, z) (< 0 at sea, the loch not counted). */
export function guildcrestCoastDistance(x: number, z: number): number {
  toFrame(x, z, frame);
  return coastDistance(frame.u, frame.v, x, z);
}

/** Whether frame (u, v) is on a built pad or path (trodden ground: the bake's sand there). */
export function guildcrestTrodden(u: number, v: number): number {
  let t = 0;
  for (const [pts, w] of [
    [QUAY_LANE, 2.4],
    [BRAE, 2.2],
    [RIDGE_PATH, 2],
    [MILL_TRACK, 1.4],
    [TOWER_PATH, 1.6],
  ] as const) {
    polyline(u, v, pts, near);
    t = Math.max(t, 1 - smoothstep(w - 0.6, w + 1, near.d));
  }
  const box = (cu: number, cv: number, hu: number, hv: number, edge = 1.5) =>
    1 - smoothstep(0, edge, boxOut(u, v, cu, cv, hu, hv));
  t = Math.max(t, box(SQUARE.u, SQUARE.v, SQUARE.halfU, SQUARE.halfV));
  t = Math.max(t, box((QUAY.u0 + QUAY.u1) / 2, QUAY.v + 7, (QUAY.u1 - QUAY.u0) / 2, 7));
  t = Math.max(t, box(-160, 40, 10, 8));
  t = Math.max(t, box(YARD.u, YARD.v, YARD.halfU, YARD.halfV));
  t = Math.max(t, box(GATEHOUSE.u, GATEHOUSE.v, 4, 5));
  // The cloister's walks (the garth is lawn).
  const g = CLOISTER.garth / 2;
  const walks =
    box(CLOISTER.u, CLOISTER.v, g + CLOISTER.walk, g + CLOISTER.walk, 0.5) *
    (1 - box(CLOISTER.u, CLOISTER.v, g, g, 0.5));
  t = Math.max(t, walks);
  for (const m of MILLS)
    t = Math.max(t, 1 - smoothstep(MILL.pad - 1, MILL.pad + 1, Math.hypot(u - m.u, v - m.v)));
  return t;
}

const normal = [0, 1, 0];
const maskFrame = { u: 0, v: 0 };

/**
 * Ground masks. Sand: the pebble shore and the loch's tide line, and trodden ground (the town's lanes,
 * the square, the paths: the `villageGround`/`paths` regions read it as worn earth). Cliff: the
 * north-east's granite sea cliffs. Rock: tors and crags (steep faces and the ben's top), wet stones at
 * the water's edge, the sea floor's rock. Grass: the rest (the moor, the glen, the town's greens).
 */
export function guildcrestMasks(
  x: number,
  z: number,
  heightAt: (x: number, z: number) => number = guildcrestHeight,
): { sand: number; grass: number; rock: number; cliff: number } {
  const h = heightAt(x, z);
  const n = guildcrestNormal(x, z, normal, heightAt);
  const slope = Math.hypot(n[0]!, n[2]!) / Math.max(0.05, n[1]!);
  toFrame(x, z, maskFrame);
  const { u, v } = maskFrame;
  const d = coastDistance(u, v, x, z);
  const cliffy = cliffiness(u, v);
  // The sea cliff: steep, low, near the coast (the north-east).
  const band =
    smoothstep(1.2, 2.2, slope) *
    (1 - smoothstep(40, 56, h)) *
    (1 - smoothstep(18, 40, d)) *
    smoothstep(-6, -2, h) *
    smoothstep(0.2, 0.6, cliffy);
  // Tide line: a narrow band of shingle at the water's edge round the loch and the gentle coasts.
  const tide = smoothstep(-1.6, -0.4, h) * (1 - smoothstep(1.2, 2.4, h)) * (1 - smoothstep(0.35, 0.7, slope));
  const shore =
    1 -
    smoothstep(PEBBLE_SHORE.r - 4, PEBBLE_SHORE.r + 6, Math.hypot(u - PEBBLE_SHORE.u, v - PEBBLE_SHORE.v));
  let sand = Math.max(tide * 0.85, shore * smoothstep(-2, -0.6, h) * (1 - smoothstep(2, 4, h)));
  // Tors and crags: patches on steep ground, granite on the ben's top.
  const patch = smoothstep(-0.1, 0.3, fbm2(x / 30, z / 30, 3, SEED + 21));
  const crag = smoothstep(0.75, 1.3, slope) * (0.45 + 0.55 * patch);
  const top = smoothstep(160, 178, h) * (0.4 + 0.6 * patch);
  const tors = smoothstep(0.42, 0.6, fbm2(x / 22, z / 22, 3, SEED + 23)) * smoothstep(70, 100, h) * 0.9;
  const underSea = 1 - smoothstep(-1.2, -0.2, h);
  const seabed = underSea * Math.max(0.25, smoothstep(0.05, 0.3, fbm2(x / 13, z / 13, 3, SEED + 25)) * 0.9);
  if (underSea > 0) sand = Math.max(sand, underSea * smoothstep(-24, -6, h) * 0.8);
  let rock = Math.max(crag, top, tors, seabed);
  let grass = smoothstep(0.4, 2.4, h) * (1 - band);
  // Trodden ground: the town's lanes, the square, the paths and pads.
  const trodden = h > 0.4 ? guildcrestTrodden(u, v) : 0;
  if (trodden > 0) {
    sand = Math.max(sand, trodden * 0.95);
    grass *= 1 - trodden * 0.9;
    rock *= 1 - trodden;
  }
  // Fresh water: wet stones at its edge, a green bank behind them.
  const fresh = guildcrestWater().shoreDistance(x, z, 10);
  if (fresh < 10 && h > 0.5) {
    const wet = 1 - smoothstep(0, 1.2, fresh);
    const bank = (1 - smoothstep(1, 6, fresh)) * (1 - wet) * (1 - smoothstep(0.5, 1.1, slope));
    rock = Math.max(rock, wet * 0.75);
    grass = Math.max(grass, bank);
    sand *= 1 - wet;
  }
  const cliff = clamp01(band);
  rock = clamp01(rock * (1 - cliff));
  sand = clamp01(sand * (1 - cliff));
  grass = clamp01(grass * (1 - sand * 0.8) * (1 - rock * 0.8));
  const total = sand + grass + rock + cliff;
  if (total < 0.001) return { sand: 0.3, grass: 0, rock: 0.7, cliff: 0 };
  return { sand: sand / total, grass: grass / total, rock: rock / total, cliff: cliff / total };
}

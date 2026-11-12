import { fbm2 } from '../../terrain/cove-height';
import { clamp01, smoothstep } from '../../../util/math';
import {
  boxOut,
  coastDistance as ovalCoastDistance,
  coveCarver,
  edgeApron,
  heightNormal,
  inBox,
  lerp,
  normalizeMasks,
  onPaths,
  onQuay,
  pad,
  pathPads,
  quayPad,
  segment,
  smax,
  smin,
  table,
  type PathPad,
  type Seg,
} from '../height-kit';
import {
  BANDSTAND,
  BEACH_PATH,
  CLOCK_WALK,
  COURT,
  COVE,
  LAMP_STAIR,
  LIGHT_WALK,
  LIGHTHOUSE,
  QUAY,
  QUAY_LANE,
  RING,
  ROCK_LIGHT,
  SPRINGS,
  SPUR,
  SQUARE,
  TERRACE,
  TERRACES,
  TIDEWHEEL as S,
  toFrame,
  TOWN,
  WORKS,
  WORKS_STAIR,
} from './layout';

/**
 * Tidewheel Caldera's ground: one height function (frame u, v), sampled by the bake.
 *
 * 1. The coast: a circle in the frame whose edge wanders. `d` is the distance inland from it.
 * 2. The ring: a wall of black rock whose crest is `RING.crest` from the ring's middle, steep inside,
 *    falling to the sea outside, with the breach as a gap on the lane's line.
 * 3. The crater's floor: low ground that rises a little from the bay's shore to the wall's foot.
 * 4. The town: three level terraces above the quay with rock risers between them.
 * 5. The ledges: a band of benches along the inner wall (the Wheel Works, the Clock Walk, the Clock
 *    Court, the Light Walk) and the spur the Lighthouse stands on.
 * 6. The pads and paths, and the hot springs' pools.
 * 7. The bay and the breach, carved in last, with the berth's dredged pocket; the rock light's skerry.
 */

const SEED = 0x7d_ca_07;

// --- 1. The coast --------------------------------------------------------------------------------

/** The signed distance (m) inland from the coast at frame (u, v), world (x, z) for its noise. */
const coastDistance = (u: number, v: number, x: number, z: number) =>
  ovalCoastDistance(S.coast, SEED, u, v, x, z);

/** The sea's floor off the coast (`d` < 0) and the foot of the outer flank (`d` ≥ 0): steep all round. */
function coastProfile(d: number): number {
  if (d < 0) return -Math.min(S.deepDepth, -d * 0.6 + d * d * 0.002 + 0.6);
  return d * 1.9;
}

// --- 2. The ring ---------------------------------------------------------------------------------

const DEG = 180 / Math.PI;

/** The ring's wall at frame (u, v): 0 on the crater's floor and in the breach. */
function ringWall(u: number, v: number, x: number, z: number): number {
  const du = u - RING.u;
  const dv = v - RING.v;
  const dr = Math.hypot(du, dv);
  if (dr < RING.foot - 30) return 0;
  // The angle from the breach's line (the −u axis), 0-180°.
  const off = Math.abs(Math.atan2(dv, -du)) * DEG;
  const open = smoothstep(RING.breach.gap, RING.breach.full, off);
  if (open <= 0) return 0;
  // Highest north and south, lowest behind the Lighthouse (the +u side), with a broken skyline.
  const side = Math.sin((off / 180) * Math.PI);
  const top =
    // (The jaws keep 60 m: the breach is a gate, not a saddle.)
    Math.max(lerp(RING.low, RING.high, side * side), 60 * (1 - smoothstep(30, 70, off))) +
    7 * fbm2(x / 70, z / 70, 3, SEED + 11) +
    2.5 * fbm2(x / 17, z / 17, 2, SEED + 12);
  // The crest wanders in and out, and the wall's foot with it.
  const r = dr + 9 * fbm2(x / 90, z / 90, 2, SEED + 13);
  let wall: number;
  if (r < RING.crest) {
    // Inside: a talus foot, then a face that steepens to the crest.
    const t = clamp01((r - (RING.foot - 16)) / (RING.crest - RING.foot + 16));
    wall = top * (0.16 * t + 0.84 * t ** 2.4);
  } else wall = top - (r - RING.crest) * 1.5 - Math.max(0, r - RING.crest - 20) ** 2 * 0.02;
  return Math.max(0, wall) * open;
}

// --- 3. The crater's floor -----------------------------------------------------------------------

/**
 * Low ground that rises away from the bay (`dl` m from its shore) and up the talus toward the wall's
 * foot (`dr` m from the ring's middle), with long shallow swells.
 */
function floor(dl: number, dr: number, x: number, z: number): number {
  return (
    2.8 +
    4 * smoothstep(40, 150, dl) +
    20 * smoothstep(RING.foot - 130, RING.foot, dr) ** 1.2 +
    1.2 * fbm2(x / 90, z / 90, 3, SEED + 5) +
    0.4 * fbm2(x / 22, z / 22, 2, SEED + 6)
  );
}

// --- 4. The town ---------------------------------------------------------------------------------

/** The terraces' height at `v`: level strips with a wall of rock 3 m deep between them. */
function terraceHeight(v: number): number {
  let h: number = QUAY.top;
  let from: number = QUAY.top;
  for (const t of TERRACES) {
    h += (t.y - from) * smoothstep(t.v0 - 3.4, t.v0 - 0.4, v);
    from = t.y;
  }
  return h;
}

/** How much of the ground is the town's terraces, easing out at their ends. */
function townWeight(u: number, v: number, x: number, z: number): number {
  const n = 6 * fbm2(x / 50, z / 50, 2, SEED + 9);
  const along =
    smoothstep(TOWN.u0 - 22, TOWN.u0 + 4, u + n) * (1 - smoothstep(TOWN.u1 - 4, TOWN.u1 + 22, u + n));
  // Behind the top terrace the wall's talus takes over.
  return along * smoothstep(TOWN.v0 - 6, TOWN.v0 + 2, v) * (1 - smoothstep(TOWN.v1 + 1, TOWN.v1 + 14, v));
}

// --- 5. The ledges and the spur ------------------------------------------------------------------

/**
 * The band of benches along the inner wall, as a line of discs (their middle, radius and top): under
 * the Wheel Works, the Clock Walk, the Clock Court and the Light Walk, up to the spur.
 */
const LEDGE = [
  { u: WORKS.u - 6, v: WORKS.v + 2, r: 22, y: WORKS.y },
  { u: WORKS.u + 10, v: WORKS.v + 1, r: 18, y: WORKS.y },
  { u: -104, v: 118, r: 11, y: 30 },
  { u: -88, v: 102, r: 10, y: 33 },
  { u: -76, v: 78, r: 9, y: 35.5 },
  { u: COURT.u, v: COURT.v + 3, r: 18, y: COURT.y },
  { u: COURT.u + 1, v: COURT.v - 6, r: 17, y: COURT.y },
  { u: -60, v: 18, r: 10, y: 41 },
  { u: SPUR.u, v: SPUR.v, r: SPUR.r, y: SPUR.y },
] as const;

/** The ledge's edge wanders (m), but not where something is built against it. */
function rim(x: number, z: number): number {
  return 2.4 * fbm2(x / 40, z / 40, 3, SEED + 15) + 0.8 * fbm2(x / 11, z / 11, 2, SEED + 16);
}

const seg: Seg = { d: 0, t: 0 };

/** The ledges over the lower ground: a 12 m rock wall on their bay side, then a steep talus skirt. */
function ledges(h: number, u: number, v: number, x: number, z: number): number {
  let d = Infinity;
  let y = 0;
  for (let i = 0; i + 1 < LEDGE.length; i++) {
    const a = LEDGE[i]!;
    const b = LEDGE[i + 1]!;
    segment(u, v, a.u, a.v, b.u, b.v, seg);
    const out = seg.d - lerp(a.r, b.r, seg.t);
    if (out < d) {
      d = out;
      y = lerp(a.y, b.y, seg.t);
    }
  }
  if (d > 60) return h;
  const out = d > 3 ? d + rim(x, z) : d;
  return smax(h, table(out, y, 12, 1.5), 1.2);
}

// --- 6. The pads and paths -----------------------------------------------------------------------

/** The town's paths and the beach's: on the ground. */
const GROUND_PATHS: readonly PathPad[] = [
  [QUAY_LANE, 2.4],
  [LAMP_STAIR, 2.2],
  // (Up the talus behind the top terrace: a bank carries it.)
  [WORKS_STAIR, 2.2],
  [BEACH_PATH, 1.8],
];

/** The paths on the ledges: each stands on a wall over the town, not on a bank. */
const LEDGE_PATHS: readonly PathPad[] = [
  [CLOCK_WALK, 2.2],
  [LIGHT_WALK, 2.2],
];

const PATHS: readonly PathPad[] = [...GROUND_PATHS, ...LEDGE_PATHS];

/** A wall's slope (rise a metre): the bank under a place that stands on a ledge. */
const WALL = 3.3;

/** The level places on the ground, and the ones on the ledges: each a frame box at its height. */
const GROUND_PADS = [BANDSTAND, SQUARE] as const;
const LEDGE_PADS = [WORKS, COURT] as const;
const PADS = [...GROUND_PADS, ...LEDGE_PADS] as const;

function pads(h: number, u: number, v: number): number {
  h = quayPad(h, u, v);
  for (const p of GROUND_PADS) h = pad(h, boxOut(u, v, p.u, p.v, p.halfU, p.halfV), p.y, 1.3, 1);
  for (const p of LEDGE_PADS) h = pad(h, boxOut(u, v, p.u, p.v, p.halfU, p.halfV), p.y, 1.3, WALL);
  // On the spur: the terrace and the Lighthouse's foot.
  h = pad(h, Math.max(0, Math.hypot(u - TERRACE.u, v - TERRACE.v) - TERRACE.r), TERRACE.y, 1.4, WALL);
  h = pad(
    h,
    Math.max(0, Math.hypot(u - LIGHTHOUSE.u, v - LIGHTHOUSE.v) - LIGHTHOUSE.r - 3),
    LIGHTHOUSE.base,
    1.4,
    WALL,
  );
  // The hot springs: each pool a level basin, stepped down to the beach.
  for (const p of SPRINGS) h = pad(h, Math.max(0, Math.hypot(u - p.u, v - p.v) - p.r - 1.5), p.y, 0.9, 0.7);
  return h;
}

// --- 7. The bay, the breach and the skerry -------------------------------------------------------

/**
 * How far behind the shore the carve holds the land low: the town's side to the quay's west end has
 * no end (its terraces are the town's own); in the breach's throat the jaws stand in the water; the
 * south shore keeps a beach 46 m deep under the wall.
 */
function hold(u: number, side: -1 | 1): number {
  const throat = 1 - smoothstep(-470, -400, u);
  if (side > 0) return u > -250 ? Infinity : lerp(40, 1, throat);
  return lerp(46, 1, throat);
}

const cove = coveCarver(COVE, SEED, { headFade: true, hold });

/** The rock light's skerry: a low hump of rock out of deep water. */
function skerry(h: number, u: number, v: number, x: number, z: number): number {
  const r0 = Math.hypot(u - ROCK_LIGHT.u, v - ROCK_LIGHT.v);
  if (r0 > ROCK_LIGHT.r + 60) return h;
  const R = ROCK_LIGHT.r * (1 + 0.3 * fbm2(x / 9, z / 9, 2, SEED + 21));
  const t = r0 / R;
  const rock = t < 1 ? ROCK_LIGHT.y * (1 - t ** 2.2) : -(r0 - R) * 1.6;
  return Math.max(h, Math.max(rock, Math.min(-3 - (r0 - R) * 0.5, -2)));
}

/** The land's height off the coast and the bay: the floor, the town, the ledges and the ring's wall. */
function inlandHeight(u: number, v: number, x: number, z: number): number {
  const dl = cove.shoreDistance(u, v);
  let h = floor(dl, Math.hypot(u - RING.u, v - RING.v), x, z);
  // The shore holds the floor down (a beach, then a gentle rise); the talus term lifts it to the wall.
  h = smin(h, 0.8 + dl * 0.13, 4);
  const tw = townWeight(u, v, x, z);
  if (tw > 0) h = lerp(h, terraceHeight(v), tw);
  h = ledges(h, u, v, x, z);
  return smax(h, ringWall(u, v, x, z), 3);
}

const frame = { u: 0, v: 0 };

/** Tidewheel's ground height (m) at world (x, z). */
export function tidewheelHeight(x: number, z: number): number {
  toFrame(x, z, frame);
  const { u, v } = frame;
  const d = coastDistance(u, v, x, z);
  const coastal = coastProfile(d);
  let h: number;
  if (d < -40) h = coastal;
  else {
    h = smin(inlandHeight(u, v, x, z), coastal, 6);
    // The town's paths first; the ledges' walks stand over them on their walls.
    h = pathPads(pathPads(pads(h, u, v), u, v, GROUND_PATHS), u, v, LEDGE_PATHS, WALL);
    // The pads mustn't lift ground out of the sea at the coast.
    if (d < 6) h = Math.min(h, coastal + Math.max(0, d) * 3);
  }
  h = cove.carve(h, u, v);
  h = skerry(h, u, v, x, z);
  return edgeApron(S.bounds, S.deepDepth, x, z, Math.max(h, -S.deepDepth));
}

/** The ground's normal at (x, z), from the height's central differences 1.5 m either side. */
export function tidewheelNormal(
  x: number,
  z: number,
  out: Float32Array | number[],
  heightAt: (x: number, z: number) => number = tidewheelHeight,
): Float32Array | number[] {
  return heightNormal(heightAt, x, z, out);
}

/** How much frame (u, v) is on a built pad or path (trodden ground), 0-1. */
export function tidewheelTrodden(u: number, v: number): number {
  let t = Math.max(onPaths(u, v, PATHS), onQuay(u, v));
  for (const p of PADS) t = Math.max(t, inBox(u, v, p.u, p.v, p.halfU, p.halfV));
  t = Math.max(t, 1 - smoothstep(TERRACE.r - 1, TERRACE.r + 1, Math.hypot(u - TERRACE.u, v - TERRACE.v)));
  t = Math.max(
    t,
    1 - smoothstep(LIGHTHOUSE.r + 2, LIGHTHOUSE.r + 4, Math.hypot(u - LIGHTHOUSE.u, v - LIGHTHOUSE.v)),
  );
  return t;
}

/** How much frame (u, v) is the town's terraces (bare trodden ground between the houses), 0-1. */
export function tidewheelTown(u: number, v: number): number {
  return (
    smoothstep(TOWN.u0 - 12, TOWN.u0 + 6, u) *
    (1 - smoothstep(TOWN.u1 - 6, TOWN.u1 + 14, u)) *
    smoothstep(TOWN.v0 - 6, TOWN.v0, v) *
    (1 - smoothstep(TOWN.v1 - 2, TOWN.v1 + 6, v))
  );
}

/** How much frame (u, v) is the crater's floor inside the wall's foot (0-1), for the plants. */
export function tidewheelFloor(u: number, v: number): number {
  return 1 - smoothstep(RING.foot - 30, RING.foot - 6, Math.hypot(u - RING.u, v - RING.v));
}

const normal = [0, 1, 0];
const maskFrame = { u: 0, v: 0 };

/**
 * Ground masks. Grass: thin turf on the floor's gentle ground and the ring's top. Cliff: the ring's
 * wall inside and out, the ledges' walls and the terraces' risers (black rock). Rock: talus under the
 * walls, wet stones at the water's edge, the sea floor's rock. Sand: the black beach, and the town's
 * trodden ground.
 */
export function tidewheelMasks(
  x: number,
  z: number,
  heightAt: (x: number, z: number) => number = tidewheelHeight,
): { sand: number; grass: number; rock: number; cliff: number } {
  const h = heightAt(x, z);
  const n = tidewheelNormal(x, z, normal, heightAt);
  const slope = Math.hypot(n[0]!, n[2]!) / Math.max(0.05, n[1]!);
  toFrame(x, z, maskFrame);
  const { u, v } = maskFrame;
  // Walls: every steep face above the tide line.
  const wall = smoothstep(0.9, 1.6, slope) * smoothstep(-4, -1, h);
  // Talus: the broken skirt under a wall (moderate slopes), patchy.
  const patch = smoothstep(-0.05, 0.3, fbm2(x / 26, z / 26, 3, SEED + 31));
  const talus =
    smoothstep(0.45, 0.7, slope) *
    (1 - smoothstep(0.9, 1.15, slope)) *
    (0.45 + 0.4 * patch) *
    smoothstep(1.5, 4, h);
  const underSea = 1 - smoothstep(-1.2, -0.2, h);
  const seabed = underSea * Math.max(0.2, smoothstep(0.1, 0.35, fbm2(x / 13, z / 13, 3, SEED + 33)) * 0.8);
  let rock = Math.max(talus, seabed);
  // Thin turf from above the beach, in patches (the ground is young rock); thinner on steeper ground.
  let grass =
    smoothstep(2.6, 4.2, h) *
    (1 - smoothstep(0.5, 0.85, slope)) *
    (0.1 + 0.6 * smoothstep(0.02, 0.4, fbm2(x / 34, z / 34, 3, SEED + 35)));
  // Trodden ground and the town stay bare.
  const trodden = h > 0.4 ? Math.max(tidewheelTrodden(u, v), tidewheelTown(u, v) * 0.9) : 0;
  grass *= 1 - trodden;
  rock *= 1 - trodden;
  const cliff = clamp01(wall);
  rock = clamp01(rock * (1 - cliff));
  grass = clamp01(grass * (1 - cliff) * (1 - rock * 0.8));
  let sand = 1 - smoothstep(0.5, 1.0, slope);
  sand = clamp01(sand * (1 - cliff) * (1 - rock * 0.85) * (1 - grass));
  return normalizeMasks(sand, grass, rock, cliff);
}

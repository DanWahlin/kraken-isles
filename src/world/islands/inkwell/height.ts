import { fbm2 } from '../../terrain/cove-height';
import { clamp01, smoothstep } from '../../../util/math';
import {
  boxOut,
  coastDistance as ovalCoastDistance,
  coastProfile as cliffCoastProfile,
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
  BLUFF,
  COURT,
  COVE,
  DOME,
  DOME_HEAD,
  DOME_STAIR,
  DRAUGHT,
  GOSSIP_STAIR,
  HILL,
  INKWELL as S,
  KITE_WALK,
  LOGGIA,
  PLAZA,
  PLAZA_PATHS,
  QUAY,
  QUAY_LANE,
  SQUARE,
  STACKS,
  TAVERNA,
  TERRACE,
  TERRACES,
  toFrame,
  TOWN,
  VALLEY,
} from './layout';

/**
 * Inkwell Bluffs' ground: one height function (frame u, v), sampled by the bake.
 *
 * 1. The coast: a superellipse in the frame whose edge wanders. `d` is the distance inland from it.
 *    The north-east and the south-east end in white sea cliffs (24-50 m); the south-west shelves
 *    gently (a long beach).
 * 2. The valley: low green ground that rises a little inland.
 * 3. The town: three level terraces above the quay with white rock risers between them.
 * 4. The bluff: a rounded band of high ground along the north-east coast (the Plaza, the Kite Walk,
 *    the Chart Court), the Dome head above its far end, and the Quills (stacks) out at sea.
 * 5. The pads and paths: the quay, the taverna, the square, the Plaza, the Loggia, the terrace, the
 *    court, the Dome's terrace, the Gossip Stair, the Kite Walk and the Dome Stair.
 * 6. The cove, carved in last, with the berth's dredged pocket.
 */

const SEED = 0x1b_3e_06;

// --- 1. The coast --------------------------------------------------------------------------------

/** The signed distance (m) inland from the coast at frame (u, v), world (x, z) for its noise. */
const coastDistance = (u: number, v: number, x: number, z: number) =>
  ovalCoastDistance(S.coast, SEED, u, v, x, z);

/** How much of the coast here is white sea cliff (the north-east and the south-east; 0 the gentle rest). */
function cliffiness(u: number, v: number): number {
  const northEast = smoothstep(100, 150, v) * smoothstep(-330, -250, u);
  const southEast = smoothstep(250, 330, u) * smoothstep(-150, -60, v);
  return Math.max(northEast, southEast);
}

/** The white sea cliffs: as high as the land behind them will be (the bluff's top cuts them lower). */
const CLIFFS = { top: 46, topNoise: 8, rise: 3.6, back: 0.3, deepDepth: S.deepDepth, seed: SEED } as const;
const coastProfile = (d: number, cliff: number, x: number, z: number) =>
  cliffCoastProfile(d, cliff, x, z, CLIFFS);

// --- 2. The valley -------------------------------------------------------------------------------

/** Low green ground that rises away from the cove (`dl` m from its shore), with long shallow swells. */
function floor(dl: number, x: number, z: number): number {
  return (
    3.2 +
    7 * smoothstep(90, 330, dl) +
    1.5 * fbm2(x / 110, z / 110, 3, SEED + 5) +
    0.5 * fbm2(x / 26, z / 26, 2, SEED + 6)
  );
}

// --- 3. The town ---------------------------------------------------------------------------------

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
    smoothstep(TOWN.u0 - 22, TOWN.u0 + 4, u + n) * (1 - smoothstep(TOWN.u1 - 4, TOWN.u1 + 26, u + n));
  return along * smoothstep(TOWN.v0 - 6, TOWN.v0 + 2, v);
}

// --- 4. The bluff --------------------------------------------------------------------------------

/** The rim's wander (m): a table's edge is ragged, but not where something is built against it. */
function rim(x: number, z: number): number {
  return 3 * fbm2(x / 46, z / 46, 3, SEED + 11) + 1 * fbm2(x / 12, z / 12, 2, SEED + 12);
}

/** How far outside the bluff's band (a line of discs) frame (u, v) is, and the top's height there. */
function bluffAt(u: number, v: number, out: { d: number; y: number }): void {
  out.d = Infinity;
  for (let i = 0; i + 1 < BLUFF.length; i++) {
    const a = BLUFF[i]!;
    const b = BLUFF[i + 1]!;
    segment(u, v, a.u, a.v, b.u, b.v, seg);
    const d = seg.d - lerp(a.r, b.r, seg.t);
    if (d < out.d) {
      out.d = d;
      out.y = lerp(a.y, b.y, seg.t);
    }
  }
}
const bluffHit = { d: 0, y: 0 };

/** The bluff over the lower ground: a 12 m white wall on its land side, then a green skirt. */
function bluff(h: number, u: number, v: number, x: number, z: number): number {
  bluffAt(u, v, bluffHit);
  if (bluffHit.d > 70) return h;
  const out = bluffHit.d > 3 ? bluffHit.d + rim(x, z) : bluffHit.d;
  return smax(h, table(out, bluffHit.y, 12, 0.34), 2);
}

/** The Dome head: a round table over the bluff's far end. */
function domeHead(h: number, u: number, v: number, x: number, z: number): number {
  const r0 = Math.hypot(u - DOME_HEAD.u, v - DOME_HEAD.v) - DOME_HEAD.r;
  if (r0 > 70) return h;
  const out = r0 > 3 ? r0 + rim(x, z) : r0;
  return smax(h, table(out, DOME_HEAD.y, 15, 0.4), 2);
}

/** The Quills: white pinnacles straight out of deep water, each with a rubble foot. */
function stacks(h: number, u: number, v: number, x: number, z: number): number {
  for (const s of STACKS) {
    const r0 = Math.hypot(u - s.u, v - s.v);
    if (r0 > s.r + 50) continue;
    // An uneven foot (wider one way than the other), a steep side and a rounded top.
    const R = s.r * (1 + 0.28 * fbm2(x / 11, z / 11, 2, SEED + 15));
    const t = r0 / R;
    const stack = t < 1 ? s.y * (1 - t ** 2.6) : -(r0 - R) * 2.4;
    const footing = -4 - (r0 - R) * 0.5;
    h = Math.max(h, Math.max(stack, Math.min(footing, -2)));
  }
  return h;
}

/** Olive Hill's rise over the valley's floor at frame (u, v). */
function hill(u: number, v: number): number {
  const t = Math.min(1, Math.hypot(u - HILL.u, v - HILL.v) / HILL.r);
  return HILL.y * (0.5 + 0.5 * Math.cos(Math.PI * t)) ** 1.3;
}

// --- 5. The pads and paths -----------------------------------------------------------------------

const PATHS: readonly PathPad[] = [
  [QUAY_LANE, 2.4],
  [GOSSIP_STAIR, 2.2],
  ...PLAZA_PATHS.map((p) => [p, 2.2] as const),
  [KITE_WALK, 2.2],
  [DOME_STAIR, 2],
];

/** The level places: each a frame box at its height. */
const PADS = [TAVERNA, SQUARE, PLAZA, LOGGIA, DRAUGHT, COURT] as const;

function pads(h: number, u: number, v: number): number {
  h = quayPad(h, u, v);
  for (const p of PADS) h = pad(h, boxOut(u, v, p.u, p.v, p.halfU, p.halfV), p.y, 1.3, 1);
  // On the Dome head: the terrace and the Dome's foot.
  h = pad(h, Math.max(0, Math.hypot(u - TERRACE.u, v - TERRACE.v) - TERRACE.r), TERRACE.y, 1.4, 1);
  h = pad(h, Math.max(0, Math.hypot(u - DOME.u, v - DOME.v) - DOME.r - 3), DOME.base, 1.4, 1);
  return h;
}

// --- 6. The cove ---------------------------------------------------------------------------------

/** (Past its head the carve fades out: the cove's end is a beach here, not a ledge.) */
const cove = coveCarver(COVE, SEED, { headFade: true });
const seg: Seg = { d: 0, t: 0 };

/** The land's height off the coast and the cove: the valley, the town's terraces, the bluff and the head. */
function inlandHeight(u: number, v: number, x: number, z: number): number {
  // The cove's shores rise gently to the valley.
  const dl = cove.shoreDistance(u, v);
  let h = floor(dl, x, z) + hill(u, v);
  h = smin(h, 0.8 + dl * 0.1 + Math.max(0, dl - 60) ** 2 * 0.004, 4);
  const tw = townWeight(u, v, x, z);
  // Level: each terrace is paved from wall to wall.
  if (tw > 0) h = lerp(h, terraceHeight(v), tw);
  h = bluff(h, u, v, x, z);
  return domeHead(h, u, v, x, z);
}

const frame = { u: 0, v: 0 };

/** Inkwell's ground height (m) at world (x, z). */
export function inkwellHeight(x: number, z: number): number {
  toFrame(x, z, frame);
  const { u, v } = frame;
  const d = coastDistance(u, v, x, z);
  const cliff = cliffiness(u, v);
  const coastal = coastProfile(d, cliff, x, z);
  let h: number;
  if (d < -40) h = coastal;
  else {
    h = smin(inlandHeight(u, v, x, z), coastal, 6);
    h = pathPads(pads(h, u, v), u, v, PATHS);
    // The pads mustn't lift ground out of the sea at the coast.
    if (d < 6) h = Math.min(h, coastal + Math.max(0, d) * 3);
  }
  h = cove.carve(h, u, v);
  h = stacks(h, u, v, x, z);
  return edgeApron(S.bounds, S.deepDepth, x, z, Math.max(h, -S.deepDepth));
}

/** The ground's normal at (x, z), from the height's central differences 1.5 m either side. */
export function inkwellNormal(
  x: number,
  z: number,
  out: Float32Array | number[],
  heightAt: (x: number, z: number) => number = inkwellHeight,
): Float32Array | number[] {
  return heightNormal(heightAt, x, z, out);
}

/** How much frame (u, v) is on a built pad or path (trodden ground), 0-1. */
export function inkwellTrodden(u: number, v: number): number {
  let t = Math.max(onPaths(u, v, PATHS), onQuay(u, v));
  for (const p of PADS) t = Math.max(t, inBox(u, v, p.u, p.v, p.halfU, p.halfV));
  t = Math.max(t, 1 - smoothstep(TERRACE.r - 1, TERRACE.r + 1, Math.hypot(u - TERRACE.u, v - TERRACE.v)));
  t = Math.max(t, 1 - smoothstep(DOME.r + 2, DOME.r + 4, Math.hypot(u - DOME.u, v - DOME.v)));
  return t;
}

/** How much frame (u, v) is the town's terraces (bare trodden earth between the houses), 0-1. */
export function inkwellTown(u: number, v: number): number {
  return (
    smoothstep(TOWN.u0 - 12, TOWN.u0 + 6, u) *
    (1 - smoothstep(TOWN.u1 - 6, TOWN.u1 + 14, u)) *
    smoothstep(TOWN.v0 - 6, TOWN.v0, v) *
    (1 - smoothstep(TOWN.v1 - 2, TOWN.v1 + 6, v))
  );
}

/** How much frame (u, v) is the valley's meadow (0-1), for the plants. */
export function inkwellValley(u: number, v: number): number {
  return (
    smoothstep(VALLEY.u0 - 30, VALLEY.u0 + 30, u) *
    (1 - smoothstep(VALLEY.u1 - 40, VALLEY.u1 + 20, u)) *
    (1 - smoothstep(VALLEY.v1 - 30, VALLEY.v1 + 20, v))
  );
}

const normal = [0, 1, 0];
const maskFrame = { u: 0, v: 0 };

/**
 * Ground masks. Grass: every flat and gentle slope above the beach (the valley, the bluff's top, the
 * skirts). Cliff: the sea cliffs, the bluff's wall and the terraces' risers (white rock). Rock:
 * rubble under the walls, wet stones at the water's edge, the sea floor's rock. Sand: the beaches,
 * and the town's trodden ground.
 */
export function inkwellMasks(
  x: number,
  z: number,
  heightAt: (x: number, z: number) => number = inkwellHeight,
): { sand: number; grass: number; rock: number; cliff: number } {
  const h = heightAt(x, z);
  const n = inkwellNormal(x, z, normal, heightAt);
  const slope = Math.hypot(n[0]!, n[2]!) / Math.max(0.05, n[1]!);
  toFrame(x, z, maskFrame);
  const { u, v } = maskFrame;
  // Walls: every steep face above the tide line.
  const wall = smoothstep(0.95, 1.7, slope) * smoothstep(-4, -1, h);
  // Rubble: the broken skirt under a wall (moderate slopes), patchy.
  const patch = smoothstep(-0.05, 0.3, fbm2(x / 26, z / 26, 3, SEED + 31));
  const talus =
    smoothstep(0.5, 0.75, slope) *
    (1 - smoothstep(0.95, 1.2, slope)) *
    (0.35 + 0.4 * patch) *
    smoothstep(1.5, 4, h);
  const underSea = 1 - smoothstep(-1.2, -0.2, h);
  const seabed = underSea * Math.max(0.2, smoothstep(0.1, 0.35, fbm2(x / 13, z / 13, 3, SEED + 33)) * 0.8);
  let rock = Math.max(talus, seabed);
  // Turf from just above the beach; thinner on steeper ground.
  let grass =
    smoothstep(2.0, 3.4, h) *
    (1 - smoothstep(0.6, 0.95, slope)) *
    (0.8 + 0.2 * smoothstep(-0.2, 0.3, fbm2(x / 9, z / 9, 2, SEED + 35)));
  // Trodden ground and the town stay bare.
  const trodden = h > 0.4 ? Math.max(inkwellTrodden(u, v), inkwellTown(u, v) * 0.9) : 0;
  grass *= 1 - trodden;
  rock *= 1 - trodden;
  const cliff = clamp01(wall);
  rock = clamp01(rock * (1 - cliff));
  grass = clamp01(grass * (1 - cliff) * (1 - rock * 0.8));
  let sand = 1 - smoothstep(0.5, 1.0, slope);
  sand = clamp01(sand * (1 - cliff) * (1 - rock * 0.85) * (1 - grass));
  return normalizeMasks(sand, grass, rock, cliff);
}

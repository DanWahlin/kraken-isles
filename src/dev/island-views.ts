import type { IslandEntry } from '../islands/types';
import { footprintDistance } from '../world/islands/footprint';
import type { CamPose } from './harness';

/** A named camera pose on an island, for the island viewer's buttons. */
export interface IslandView {
  id: string;
  label: string;
  pose: CamPose;
}

/** Where a camera is and what it looks at (the game's `CameraShot`). */
export interface TourShot {
  x: number;
  y: number;
  z: number;
  tx: number;
  ty: number;
  tz: number;
}

/** Seconds for one lap of an island's tour. */
export const TOUR_LAP = 50;

/**
 * How far inside an island's swap distance (`ranges.show`) the tour keeps: past it the island draws
 * as its far silhouette, not itself (the swap waits 20 m either side, silhouette-swap.ts).
 */
export const TOUR_INSIDE_SHOW = 60;

/**
 * Brings a point in toward the island's middle (on the ground plane) until it's inside the island's
 * swap distance, less `TOUR_INSIDE_SHOW`. Past that distance the game draws the island's far
 * silhouette, and from high up not even that: the bare sea shows over its footprint. Returns whether
 * it moved the point. No allocation.
 */
export function keepInsideShow(island: IslandEntry, p: { x: number; z: number }): boolean {
  const { center, footprint } = island;
  const limit = island.ranges.show - TOUR_INSIDE_SHOW;
  let moved = false;
  for (let k = 0; k < 4; k++) {
    const over = footprintDistance(footprint, p.x, p.z) - limit;
    if (over <= 0) break;
    const dx = p.x - center.x;
    const dz = p.z - center.z;
    const out = Math.hypot(dx, dz);
    if (out < 1e-6) break;
    const keep = Math.max(0, out - over) / out;
    p.x = center.x + dx * keep;
    p.z = center.z + dz * keep;
    moved = true;
  }
  return moved;
}

/** The steps of a lap the tour's distance out is worked out at. */
const TOUR_STEPS = 360;
/** How many steps either side the tour's distance out is evened over (a fifth of a lap in all). */
const TOUR_EASE = 36;
/** Metres kept in hand for what the limit can dip between two steps (at a corner of the outline). */
const TOUR_STEP_SLACK = 6;
const tourShares = new WeakMap<IslandEntry, Float32Array>();

/** How far out and how high the tour would fly on a bearing, round an island it could see from any distance. */
function tourOrbit(reach: number, turn: number, out: { off: number; high: number }): void {
  // 0 over the berth's side, 1 over the far side.
  const far = (1 - Math.cos(turn)) / 2;
  out.off = reach * (1.9 - 0.55 * far);
  out.high = reach * (1.05 - 0.6 * far);
}

/**
 * The share (0 to 1) of its full distance out that the tour keeps at each step of a lap, so that it
 * stays inside the island's swap distance all the way round. Where a big island's swap distance is
 * closer than the tour would fly (most of a lap round Port Meridian and Keelhaven), the limit follows
 * the island's outline, which has corners: stopping the camera at it turned the flight sharply at
 * each one. So the share at each step is the least of those near it, evened out over the same
 * span: never past the limit, and with no corners.
 */
function tourShare(island: IslandEntry): Float32Array {
  let share = tourShares.get(island);
  if (share) return share;
  const { center, mooring, footprint } = island;
  const reach = Math.max(...footprint.radii);
  const limit = island.ranges.show - TOUR_INSIDE_SHOW - TOUR_STEP_SLACK;
  const berth = Math.atan2(mooring.x - center.x, mooring.z - center.z);
  const orbit = { off: 0, high: 0 };
  const n = TOUR_STEPS;
  // The most of its full distance each step may keep (found by halving: farther out is farther off).
  const most = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    const turn = (k / n) * Math.PI * 2;
    tourOrbit(reach, turn, orbit);
    const sin = Math.sin(berth + turn);
    const cos = Math.cos(berth + turn);
    const inside = (r: number) =>
      footprintDistance(footprint, center.x + sin * r, center.z + cos * r) <= limit;
    let lo = orbit.off;
    if (!inside(lo)) {
      lo = 0;
      let hi = orbit.off;
      for (let i = 0; i < 24; i++) {
        const mid = (lo + hi) / 2;
        if (inside(mid)) lo = mid;
        else hi = mid;
      }
    }
    most[k] = lo / orbit.off;
  }
  // The least within the span, so the evened-out share is never more than a step may keep…
  const least = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    let m = 1;
    for (let j = -TOUR_EASE; j <= TOUR_EASE; j++) m = Math.min(m, most[(k + j + n) % n]!);
    least[k] = m;
  }
  // …then a weighted mean over the span (a raised cosine: the weights fall away smoothly to nothing).
  share = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    let sum = 0;
    let weights = 0;
    for (let j = -TOUR_EASE; j <= TOUR_EASE; j++) {
      const w = 0.5 + 0.5 * Math.cos((Math.PI * j) / (TOUR_EASE + 1));
      sum += w * least[(k + j + n) % n]!;
      weights += w;
    }
    share[k] = sum / weights;
  }
  tourShares.set(island, share);
  return share;
}

/** The share at any point of a lap: a smooth curve through the steps (Catmull-Rom). */
function tourShareAt(island: IslandEntry, lap: number): number {
  const share = tourShare(island);
  const n = share.length;
  const at = (lap - Math.floor(lap)) * n;
  const i = Math.floor(at);
  const t = at - i;
  const p0 = share[(i - 1 + n) % n]!;
  const p1 = share[i % n]!;
  const p2 = share[(i + 1) % n]!;
  const p3 = share[(i + 2) % n]!;
  return p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)));
}

const orbit = { off: 0, high: 0 };

/**
 * The island tour: the camera circles the island, looking at its middle, and shows it from different
 * angles on the way. It starts high over the side the berth is on (the overview), comes down and
 * closer round the far side, and climbs back as it comes round again; then it goes on round. It
 * never goes out past the island's swap distance, where the game would draw its silhouette: round a
 * big island it flies closer in and higher instead, on a path with no corners (`tourShare`).
 * `seconds` is the time into the tour; `out` takes the pose. No allocation (after an island's first call).
 */
export function islandTour(island: IslandEntry, seconds: number, out: TourShot): void {
  const { center, mooring, footprint } = island;
  const reach = Math.max(...footprint.radii);
  const lap = seconds / TOUR_LAP;
  const turn = lap * Math.PI * 2;
  const bearing = Math.atan2(mooring.x - center.x, mooring.z - center.z) + turn;
  tourOrbit(reach, turn, orbit);
  // It comes in to where the island still draws as itself, and climbs to stay as far from its middle.
  const away = Math.hypot(orbit.off, orbit.high);
  const off = orbit.off * tourShareAt(island, lap);
  out.x = center.x + Math.sin(bearing) * off;
  out.z = center.z + Math.cos(bearing) * off;
  out.y = Math.sqrt(away * away - off * off);
  out.tx = center.x;
  out.ty = 20;
  out.tz = center.z;
}

/**
 * The views the island viewer offers for an island, all from its registry entry (so a new island
 * gets them with no code here): the whole island from over its harbour side, its harbour from the
 * sea, the quay at eye level, where its arrival flight settles, and each stop of that flight.
 * `groundAt` is the world's height there (the quay's own height isn't in the entry).
 */
export function islandViews(island: IslandEntry, groundAt: (x: number, z: number) => number): IslandView[] {
  const { quay, arrival } = island;
  const views: IslandView[] = [];

  // The whole island: from over the side its berth is on, high enough to take in its far shore
  // (where the tour starts).
  const start: TourShot = { x: 0, y: 0, z: 0, tx: 0, ty: 0, tz: 0 };
  islandTour(island, 0, start);
  views.push({
    id: 'overview',
    label: 'Overview',
    pose: [
      [start.x, start.y, start.z],
      [start.tx, start.ty, start.tz],
    ],
  });

  // The way you face stepping ashore (a heading of 0 looks along +z).
  const fx = Math.sin(island.landingHeading);
  const fz = Math.cos(island.landingHeading);
  const ground = Math.max(0, groundAt(quay.x, quay.z));
  views.push({
    id: 'harbour',
    label: 'Harbour',
    pose: [
      [quay.x - fx * 75, ground + 20, quay.z - fz * 75],
      [quay.x + fx * 40, ground + 5, quay.z + fz * 40],
    ],
  });
  views.push({
    id: 'quay',
    label: 'Quay',
    pose: [
      [quay.x - fx * 5, ground + 1.8, quay.z - fz * 5],
      [quay.x + fx * 30, ground + 4, quay.z + fz * 30],
    ],
  });

  const landing = arrival.landingShot;
  if (landing)
    views.push({
      id: 'landing',
      label: 'Landing',
      pose: [
        [landing.x, landing.y, landing.z],
        [landing.tx, landing.ty, landing.tz],
      ],
    });
  arrival.keys.forEach((k, i) =>
    views.push({
      id: `stop-${i + 1}`,
      label: String(i + 1),
      pose: [
        [k.x, k.y, k.z],
        [k.tx, k.ty, k.tz],
      ],
    }),
  );
  return views;
}

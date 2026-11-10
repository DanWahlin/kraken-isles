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
 * The island tour: the camera circles the island, looking at its middle, and shows it from different
 * angles on the way. It starts high over the side the berth is on (the overview), comes down and
 * closer round the far side, and climbs back as it comes round again; then it goes on round. It
 * never goes out past the island's swap distance, where the game would draw its silhouette.
 * `seconds` is the time into the tour; `out` takes the pose. No allocation.
 */
export function islandTour(island: IslandEntry, seconds: number, out: TourShot): void {
  const { center, mooring, footprint } = island;
  const reach = Math.max(...footprint.radii);
  const turn = (seconds / TOUR_LAP) * Math.PI * 2;
  // 0 over the berth's side, 1 over the far side.
  const far = (1 - Math.cos(turn)) / 2;
  const bearing = Math.atan2(mooring.x - center.x, mooring.z - center.z) + turn;
  const sin = Math.sin(bearing);
  const cos = Math.cos(bearing);
  // How far out and how high it would fly round an island it can see from any distance.
  let off = reach * (1.9 - 0.55 * far);
  const high = reach * (1.05 - 0.6 * far);
  const away = Math.hypot(off, high);
  // It comes in to where the island still draws as itself, and climbs to keep it all in view.
  const limit = island.ranges.show - TOUR_INSIDE_SHOW;
  for (let k = 0; k < 4; k++) {
    const d = footprintDistance(footprint, center.x + sin * off, center.z + cos * off);
    if (d <= limit) break;
    off -= d - limit;
  }
  out.x = center.x + sin * off;
  out.y = Math.sqrt(Math.max(away * away - off * off, (reach * 0.3) ** 2));
  out.z = center.z + cos * off;
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

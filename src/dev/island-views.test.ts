import { describe, expect, it } from 'vitest';
import { ISLAND_LIST } from '../islands/registry';
import { footprintDistance } from '../world/islands/footprint';
import { islandTour, islandViews, TOUR_INSIDE_SHOW, TOUR_LAP, type TourShot } from './island-views';

describe("the island viewer's views", () => {
  const flat = () => 2;

  it.each(ISLAND_LIST.map((e) => [e.name, e] as const))(
    '%s has its views, each a real pose',
    (_name, island) => {
      const views = islandViews(island, flat);
      const ids = views.map((v) => v.id);
      expect(ids.slice(0, 3)).toEqual(['overview', 'harbour', 'quay']);
      expect(new Set(ids).size).toBe(ids.length);
      // One stop for each key of its arrival flight.
      expect(ids.filter((id) => id.startsWith('stop-'))).toHaveLength(island.arrival.keys.length);
      for (const v of views) {
        for (const n of [...v.pose[0], ...v.pose[1]]) expect(Number.isFinite(n)).toBe(true);
        // The camera is somewhere other than what it looks at, and above the sea.
        expect(Math.hypot(...v.pose[0].map((n, i) => n - v.pose[1][i]!))).toBeGreaterThan(1);
        expect(v.pose[0][1]).toBeGreaterThan(0);
      }
    },
  );

  it.each(ISLAND_LIST.map((e) => [e.name, e] as const))(
    '%s: the overview takes in the whole island',
    (_n, island) => {
      const [eye, at] = islandViews(island, flat)[0]!.pose;
      const reach = Math.max(...island.footprint.radii);
      expect(at[0]).toBe(island.center.x);
      expect(at[2]).toBe(island.center.z);
      // Far enough from its middle to take it in, well above it, on the side its berth is on.
      expect(Math.hypot(eye[0]! - island.center.x, eye[1]!, eye[2]! - island.center.z)).toBeGreaterThan(
        reach * 2,
      );
      expect(eye[1]).toBeGreaterThan(reach * 0.5);
      const toBerth = [island.mooring.x - island.center.x, island.mooring.z - island.center.z];
      expect(
        (eye[0]! - island.center.x) * toBerth[0]! + (eye[2]! - island.center.z) * toBerth[1]!,
      ).toBeGreaterThan(0);
    },
  );

  it('stands on the quay at eye level, looking the way you step ashore', () => {
    for (const island of ISLAND_LIST) {
      const quay = islandViews(island, () => 3.5).find((v) => v.id === 'quay')!;
      const [eye, at] = quay.pose;
      expect(eye[1]).toBeCloseTo(3.5 + 1.8, 6);
      const look = Math.atan2(at[0]! - eye[0]!, at[2]! - eye[2]!);
      const turn = Math.atan2(Math.sin(look - island.landingHeading), Math.cos(look - island.landingHeading));
      expect(Math.abs(turn)).toBeLessThan(1e-6);
    }
  });

  it('tours each island from its overview, right round and back, where the island draws as itself', () => {
    const shot: TourShot = { x: 0, y: 0, z: 0, tx: 0, ty: 0, tz: 0 };
    for (const island of ISLAND_LIST) {
      const { footprint, center } = island;
      const reach = Math.max(...footprint.radii);
      const mean = footprint.radii.reduce((a, b) => a + b, 0) / footprint.radii.length;
      const [eye, at] = islandViews(island, flat)[0]!.pose;
      islandTour(island, 0, shot);
      expect([shot.x, shot.y, shot.z, shot.tx, shot.ty, shot.tz]).toEqual([...eye, ...at]);

      const bearings: number[] = [];
      let low = Infinity;
      for (let s = 0; s <= TOUR_LAP; s += 0.5) {
        islandTour(island, s, shot);
        expect([shot.tx, shot.tz]).toEqual([center.x, center.z]);
        // Off its shore, inside its swap distance (past it the game draws its silhouette), and well up.
        const off = footprintDistance(footprint, shot.x, shot.z);
        expect(off).toBeGreaterThan(mean + 50);
        expect(off).toBeLessThanOrEqual(island.ranges.show - TOUR_INSIDE_SHOW + 1);
        expect(shot.y).toBeGreaterThan(reach * 0.3 - 1e-6);
        // Far enough from its middle to take a good part of it in.
        expect(Math.hypot(shot.x - center.x, shot.y, shot.z - center.z)).toBeGreaterThan(reach * 1.3);
        low = Math.min(low, shot.y);
        bearings.push(Math.atan2(shot.x - center.x, shot.z - center.z));
      }
      // It comes down for a lower look on the far side, and it has been all the way round.
      expect(low).toBeLessThan(eye[1]! * 0.8);
      const swept = bearings.slice(1).reduce((sum, b, k) => {
        const d = b - bearings[k]!;
        return sum + Math.atan2(Math.sin(d), Math.cos(d));
      }, 0);
      expect(swept).toBeCloseTo(Math.PI * 2, 6);
      islandTour(island, TOUR_LAP, shot);
      expect(shot.x).toBeCloseTo(eye[0]!, 6);
      expect(shot.y).toBeCloseTo(eye[1]!, 6);
      expect(shot.z).toBeCloseTo(eye[2]!, 6);
    }
  });
});

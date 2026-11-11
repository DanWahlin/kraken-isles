import { describe, expect, it } from 'vitest';
import { windAt } from '../../wind';
import { windOnBow } from '../../ship/dynamics';
import { GANGWAY_FOOT } from '../../ship/brigantine';
import { SUNSPIRE_HARBOR as H } from './harbor';
import { sunspireHeight, sunspireMasks, sunspireWater } from './height';
import {
  BUTTE,
  CAMP,
  CARAVANSERAI,
  COURT,
  HIGH_MESA,
  LIBRARY_ROCK,
  LOW_MESA,
  MESA_PATH,
  NEEDLE,
  OASIS_PATH,
  QUAY_LANE,
  SIGNAL_HOUSE,
  SIGNAL_STAIR,
  SPIRE,
  SQUARE,
  SUN_STAIR,
  SUNSPIRE as S,
  TERRACE,
  toFrame,
  toWorld,
  WATER,
  YARD,
  type Uvy,
} from './layout';

const heightAt = (u: number, v: number) => {
  const p = toWorld(u, v);
  return sunspireHeight(p.x, p.z);
};

describe('Sunspire frame', () => {
  it('maps the frame to the world and back', () => {
    const p = toWorld(123, -45);
    const f = toFrame(p.x, p.z, { u: 0, v: 0 });
    expect(f.u).toBeCloseTo(123, 6);
    expect(f.v).toBeCloseTo(-45, 6);
  });

  it('runs u inland along bearing 143° (the cove’s axis) and v along 53°', () => {
    const o = toWorld(0, 0);
    const u = toWorld(1, 0);
    const v = toWorld(0, 1);
    const bearing = (a: { x: number; z: number }) =>
      ((Math.atan2(a.x - o.x, -(a.z - o.z)) * 180) / Math.PI + 360) % 360;
    expect(bearing(u)).toBeCloseTo(143, 6);
    expect(bearing(v)).toBeCloseTo(53, 6);
  });
});

describe('sunspireHeight', () => {
  it('is finite and inside the pack range everywhere in the bounds', () => {
    const b = S.bounds;
    let min = Infinity;
    let max = -Infinity;
    for (let z = b.minZ; z <= b.maxZ; z += 12)
      for (let x = b.minX; x <= b.maxX; x += 12) {
        const h = sunspireHeight(x, z);
        expect(Number.isFinite(h)).toBe(true);
        min = Math.min(min, h);
        max = Math.max(max, h);
      }
    expect(min).toBeGreaterThanOrEqual(-S.deepDepth);
    expect(max).toBeGreaterThan(BUTTE.y - 4);
    expect(max).toBeLessThan(BUTTE.y + 4);
  });

  it('falls to the deep floor all round the edges of the bake', () => {
    const b = S.bounds;
    for (let t = 0; t <= 1; t += 1 / 64) {
      const x = b.minX + (b.maxX - b.minX) * t;
      const z = b.minZ + (b.maxZ - b.minZ) * t;
      for (const h of [
        sunspireHeight(x, b.minZ),
        sunspireHeight(x, b.maxZ),
        sunspireHeight(b.minX, z),
        sunspireHeight(b.maxX, z),
      ])
        expect(h).toBeLessThan(-S.deepDepth + 1);
    }
  });

  it('holds every built place level at its height', () => {
    const level = (u: number, v: number, y: number, r: number, name: string) => {
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4)
        for (const k of [0, 0.5, 1])
          expect(heightAt(u + Math.cos(a) * r * k, v + Math.sin(a) * r * k), name).toBeCloseTo(y, 0);
    };
    level(SQUARE.u, SQUARE.v, SQUARE.y, 12, 'square');
    level(CARAVANSERAI.u, CARAVANSERAI.v, CARAVANSERAI.y, 6, 'caravanserai');
    level(CAMP.u, CAMP.v, CAMP.y, 8, 'camp');
    level(SIGNAL_HOUSE.u, SIGNAL_HOUSE.v, SIGNAL_HOUSE.y, 5, 'signal house');
    level(COURT.u, COURT.v, COURT.y, 12, 'court');
    level(YARD.u, YARD.v, YARD.y, 10, 'yard');
    level(TERRACE.u, TERRACE.v, TERRACE.y, 7, 'terrace');
    level(SPIRE.u, SPIRE.v, SPIRE.base, 6, 'spire');
  });

  it('stands the tables as tables: flat tops over sheer walls', () => {
    // Each plateau's middle is at its height, and the ground 12 m outside its wall is well below.
    for (const m of [LOW_MESA, HIGH_MESA]) {
      const cu = (m.u0 + m.u1) / 2;
      const cv = (m.v0 + m.v1) / 2;
      expect(heightAt(cu, cv)).toBeCloseTo(m.y, 0);
    }
    expect(heightAt(LOW_MESA.u0 + 40, LOW_MESA.v1 + 20)).toBeLessThan(LOW_MESA.y - 14);
    expect(heightAt(HIGH_MESA.u1 + 24, HIGH_MESA.v1 - 30)).toBeLessThan(HIGH_MESA.y - 30);
    expect(heightAt(BUTTE.u, BUTTE.v)).toBeCloseTo(BUTTE.y, 0);
    expect(heightAt(NEEDLE.u, NEEDLE.v)).toBeCloseTo(NEEDLE.y, 0);
  });

  it('stands Library Rock out of deep water, clear of the island', () => {
    expect(heightAt(LIBRARY_ROCK.u, LIBRARY_ROCK.v)).toBeCloseTo(LIBRARY_ROCK.y, 0);
    // Sea all round it, and between it and the coast.
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6)
      expect(heightAt(LIBRARY_ROCK.u + Math.cos(a) * 60, LIBRARY_ROCK.v + Math.sin(a) * 60)).toBeLessThan(-2);
    expect(heightAt(LIBRARY_ROCK.u, LIBRARY_ROCK.v - 100)).toBeLessThan(-4);
  });

  it('gives every path a walkable grade: no step over 0.45 m in half a metre', () => {
    const paths: Record<string, readonly Uvy[]> = {
      QUAY_LANE,
      OASIS_PATH,
      SIGNAL_STAIR,
      MESA_PATH,
      SUN_STAIR,
    };
    for (const [name, pts] of Object.entries(paths))
      for (let i = 0; i + 1 < pts.length; i++) {
        const a = pts[i]!;
        const b = pts[i + 1]!;
        const len = Math.hypot(b.u - a.u, b.v - a.v);
        let prev = heightAt(a.u, a.v);
        for (let s = 0.5; s <= len; s += 0.5) {
          const t = s / len;
          const h = heightAt(a.u + (b.u - a.u) * t, a.v + (b.v - a.v) * t);
          expect(Math.abs(h - prev), `${name} leg ${i} at ${s} m`).toBeLessThan(0.45);
          // And the path holds its planned height.
          expect(Math.abs(h - (a.y + (b.y - a.y) * t)), `${name} leg ${i} at ${s} m`).toBeLessThan(0.8);
          prev = h;
        }
      }
  });

  it('holds the cistern over the Weeping Wall, and the falaj runs down to the cove', () => {
    const w = sunspireWater();
    expect(w.basins.cistern.level).toBeCloseTo(WATER.cistern.y, 1);
    expect(w.basins.pool.level).toBeCloseTo(WATER.pool.y, 1);
    const fall = w.streams[0]!;
    expect(fall.surface[0]! - fall.surface[fall.count - 1]!).toBeGreaterThan(12);
    const falaj = w.streams[1]!;
    expect(falaj.surface[falaj.count - 1]!).toBeLessThan(1);
  });

  it('gives every mask a total of 1, with turf only at the oasis', () => {
    for (const [u, v] of [
      [-180, 30],
      [SQUARE.u, SQUARE.v],
      [COURT.u, COURT.v],
      [BUTTE.u, BUTTE.v],
      [0, 250],
      [-500, 0],
      [28, 40],
      [0, -200],
    ] as const) {
      const p = toWorld(u, v);
      const m = sunspireMasks(p.x, p.z);
      expect(m.sand + m.grass + m.rock + m.cliff).toBeCloseTo(1, 4);
    }
    const mask = (u: number, v: number) => {
      const p = toWorld(u, v);
      return sunspireMasks(p.x, p.z);
    };
    expect(mask(-60, 140).grass).toBe(0);
    expect(mask(0, -200).grass).toBe(0);
    expect(mask(WATER.pool.u - 10, WATER.pool.v + 16).grass).toBeGreaterThan(0.3);
  });
});

describe('Sunspire’s cove (the ship’s way in)', () => {
  it('keeps the lane 6 m deep for 30 m either side, from the open sea to the turning room', () => {
    const lane = H.lane;
    for (let i = 0; i + 1 < lane.length - 1; i++) {
      const a = lane[i]!;
      const b = lane[i + 1]!;
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      const ux = (b.x - a.x) / len;
      const uz = (b.z - a.z) / len;
      for (let s = 0; s <= len; s += 5)
        for (const off of [-30, -15, 0, 15, 30]) {
          const x = a.x + ux * s - uz * off;
          const z = a.z + uz * s + ux * off;
          expect(sunspireHeight(x, z), `${x.toFixed(0)},${z.toFixed(0)}`).toBeLessThan(H.laneFloor);
        }
    }
  });

  it('keeps the turning room deep', () => {
    const t = H.turning;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 12)
      for (const r of [0, t.r / 2, t.r]) {
        const x = t.x + Math.cos(a) * r;
        const z = t.z + Math.sin(a) * r;
        expect(sunspireHeight(x, z), `${x.toFixed(0)},${z.toFixed(0)}`).toBeLessThan(-t.depth);
      }
  });

  it('berths the ship in deep water alongside the quay', () => {
    const b = H.berth;
    for (const along of [-12, -6, 0, 6, 12])
      for (const across of [-3.3, 0, 3.3]) {
        const x = b.x + Math.sin(b.heading) * along + Math.cos(b.heading) * across;
        const z = b.z + Math.cos(b.heading) * along - Math.sin(b.heading) * across;
        expect(sunspireHeight(x, z)).toBeLessThan(-4);
      }
    expect(sunspireHeight(H.landing.x, H.landing.z)).toBeGreaterThan(H.deck - 0.4);
  });

  it('lays the gangway on the quay at the berth', () => {
    const { berth } = H;
    const lx = GANGWAY_FOOT.x;
    const lz = GANGWAY_FOOT.z;
    const x = berth.x + Math.cos(berth.heading) * lx + Math.sin(berth.heading) * lz;
    const z = berth.z - Math.sin(berth.heading) * lx + Math.cos(berth.heading) * lz;
    expect(sunspireHeight(x, z)).toBeGreaterThan(H.deck - 0.4);
  });

  it('sails in and out on beam reaches (≥ 60° off the wind)', () => {
    const w = windAt(0, 0, 0, [0, 0]);
    const lane = H.lane;
    const a = lane[2]!;
    const b = lane[lane.length - 1]!;
    const entry = Math.atan2(b.x - a.x, b.z - a.z);
    for (const heading of [entry, H.berth.heading, H.departure.heading]) {
      const off = Math.abs(windOnBow(heading, w[0]!, w[1]!).angle);
      expect(off, `heading ${heading.toFixed(2)}`).toBeGreaterThan((60 * Math.PI) / 180);
    }
  });
});

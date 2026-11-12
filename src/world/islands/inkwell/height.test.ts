import { describe, expect, it } from 'vitest';
import { windAt } from '../../wind';
import { windOnBow } from '../../ship/dynamics';
import { GANGWAY_FOOT } from '../../ship/brigantine';
import { INKWELL_HARBOR as H } from './harbor';
import { inkwellHeight, inkwellMasks } from './height';
import {
  BLUFF,
  COURT,
  DOME,
  DOME_HEAD,
  DOME_STAIR,
  DRAUGHT,
  GOSSIP_STAIR,
  INKWELL as S,
  KITE_WALK,
  LOGGIA,
  PLAZA,
  PLAZA_PATHS,
  QUAY_LANE,
  SQUARE,
  STACKS,
  TAVERNA,
  TERRACE,
  TERRACES,
  toFrame,
  toWorld,
  type Uvy,
} from './layout';

const heightAt = (u: number, v: number) => {
  const p = toWorld(u, v);
  return inkwellHeight(p.x, p.z);
};

describe('Inkwell frame', () => {
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

describe('inkwellHeight', () => {
  it('is finite and inside the pack range everywhere in the bounds', () => {
    const b = S.bounds;
    let min = Infinity;
    let max = -Infinity;
    for (let z = b.minZ; z <= b.maxZ; z += 12)
      for (let x = b.minX; x <= b.maxX; x += 12) {
        const h = inkwellHeight(x, z);
        expect(Number.isFinite(h)).toBe(true);
        min = Math.min(min, h);
        max = Math.max(max, h);
      }
    expect(min).toBeGreaterThanOrEqual(-S.deepDepth);
    // The Dome head is the island's top.
    expect(max).toBeGreaterThan(DOME_HEAD.y - 1);
    expect(max).toBeLessThan(DOME_HEAD.y + 4);
  });

  it('falls to the deep floor all round the edges of the bake', () => {
    const b = S.bounds;
    for (let t = 0; t <= 1; t += 1 / 64) {
      const x = b.minX + (b.maxX - b.minX) * t;
      const z = b.minZ + (b.maxZ - b.minZ) * t;
      for (const h of [
        inkwellHeight(x, b.minZ),
        inkwellHeight(x, b.maxZ),
        inkwellHeight(b.minX, z),
        inkwellHeight(b.maxX, z),
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
    level(TAVERNA.u, TAVERNA.v, TAVERNA.y, 5, 'taverna');
    level(SQUARE.u - 1, SQUARE.v, SQUARE.y, 4.5, 'square');
    level(PLAZA.u, PLAZA.v, PLAZA.y, 14, 'plaza');
    level(LOGGIA.u, LOGGIA.v, LOGGIA.y, 5, 'loggia');
    level(DRAUGHT.u, DRAUGHT.v, DRAUGHT.y, 6, 'draughting terrace');
    level(COURT.u, COURT.v, COURT.y, 16, 'chart court');
    level(TERRACE.u, TERRACE.v, TERRACE.y, 7, 'terrace');
    level(DOME.u, DOME.v, DOME.base, 6, 'dome');
  });

  it('steps the town up three level terraces', () => {
    for (const t of TERRACES)
      for (const u of [-200, -170, -140, -90, -60])
        expect(heightAt(u, (t.v0 + t.v1) / 2 + 3), `terrace ${t.y} at u ${u}`).toBeCloseTo(t.y, 0);
  });

  it('stands the bluff over the town and the valley, with a sea cliff behind it', () => {
    // (The last disc's middle is under the Dome Stair's first flight.)
    for (const d of BLUFF.slice(0, -1)) expect(heightAt(d.u, d.v)).toBeCloseTo(d.y, 0);
    // The land side: 20 m outside the first disc the ground is the third terrace or lower.
    const a = BLUFF[0];
    expect(heightAt(a.u, a.v - a.r - 20)).toBeLessThan(a.y - 6);
    // The sea side of the Kite Walk: a cliff of 20 m or more within 60 m.
    const k = KITE_WALK[2];
    let low = Infinity;
    for (let d = 0; d <= 60; d += 2) low = Math.min(low, heightAt(k.u, k.v + d));
    expect(low).toBeLessThan(k.y - 20);
    expect(heightAt(DOME_HEAD.u, DOME_HEAD.v)).toBeCloseTo(DOME_HEAD.y, 0);
  });

  it('stands the Quills out of the water, clear of the lane', () => {
    for (const s of STACKS) {
      expect(heightAt(s.u, s.v)).toBeGreaterThan(s.y - 2);
      // Sea round each one's far side.
      expect(heightAt(s.u, s.v + s.r + 24)).toBeLessThan(-2);
    }
    const old = STACKS[3];
    expect(old.v).toBeGreaterThan(120);
  });

  it('gives every path a walkable grade: no step over 0.45 m in half a metre', () => {
    const paths: Record<string, readonly Uvy[]> = {
      QUAY_LANE,
      GOSSIP_STAIR,
      KITE_WALK,
      DOME_STAIR,
      PLAZA_0: PLAZA_PATHS[0],
      PLAZA_1: PLAZA_PATHS[1],
      PLAZA_2: PLAZA_PATHS[2],
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

  it('gives every mask a total of 1, with turf on the tops and none in the town', () => {
    const mask = (u: number, v: number) => {
      const p = toWorld(u, v);
      return inkwellMasks(p.x, p.z);
    };
    for (const [u, v] of [
      [-180, 30],
      [SQUARE.u, SQUARE.v],
      [COURT.u, COURT.v],
      [40, 170],
      [0, 250],
      [-500, 0],
      [0, -200],
    ] as const) {
      const m = mask(u, v);
      expect(m.sand + m.grass + m.rock + m.cliff).toBeCloseTo(1, 4);
    }
    expect(mask(40, 170).grass).toBeGreaterThan(0.5);
    expect(mask(20, -60).grass).toBeGreaterThan(0.5);
    expect(mask(-170, 60).grass).toBeLessThan(0.2);
  });
});

describe('Inkwell’s cove (the ship’s way in)', () => {
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
          expect(inkwellHeight(x, z), `${x.toFixed(0)},${z.toFixed(0)}`).toBeLessThan(H.laneFloor);
        }
    }
  });

  it('keeps the turning room deep', () => {
    const t = H.turning;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 12)
      for (const r of [0, t.r / 2, t.r]) {
        const x = t.x + Math.cos(a) * r;
        const z = t.z + Math.sin(a) * r;
        expect(inkwellHeight(x, z), `${x.toFixed(0)},${z.toFixed(0)}`).toBeLessThan(-t.depth);
      }
  });

  it('berths the ship in deep water alongside the quay', () => {
    const b = H.berth;
    for (const along of [-12, -6, 0, 6, 12])
      for (const across of [-3.3, 0, 3.3]) {
        const x = b.x + Math.sin(b.heading) * along + Math.cos(b.heading) * across;
        const z = b.z + Math.cos(b.heading) * along - Math.sin(b.heading) * across;
        expect(inkwellHeight(x, z)).toBeLessThan(-4);
      }
    expect(inkwellHeight(H.landing.x, H.landing.z)).toBeGreaterThan(H.deck - 0.4);
  });

  it('lays the gangway on the quay at the berth', () => {
    const { berth } = H;
    const lx = GANGWAY_FOOT.x;
    const lz = GANGWAY_FOOT.z;
    const x = berth.x + Math.cos(berth.heading) * lx + Math.sin(berth.heading) * lz;
    const z = berth.z - Math.sin(berth.heading) * lx + Math.cos(berth.heading) * lz;
    expect(inkwellHeight(x, z)).toBeGreaterThan(H.deck - 0.4);
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

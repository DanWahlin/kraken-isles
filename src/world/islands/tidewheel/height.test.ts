import { describe, expect, it } from 'vitest';
import { windAt } from '../../wind';
import { windOnBow } from '../../ship/dynamics';
import { GANGWAY_FOOT } from '../../ship/brigantine';
import { TIDEWHEEL_HARBOR as H } from './harbor';
import { tidewheelHeight, tidewheelMasks } from './height';
import {
  BANDSTAND,
  BEACH_PATH,
  BOUNTY,
  CLOCK_WALK,
  COURT,
  LAMP_STAIR,
  LIGHT_WALK,
  LIGHTHOUSE,
  QUAY_LANE,
  RING,
  ROCK_LIGHT,
  SPRINGS,
  SQUARE,
  TERRACE,
  TERRACES,
  TIDEWHEEL as S,
  toFrame,
  toWorld,
  WHEEL,
  WORKS,
  WORKS_STAIR,
  type Uvy,
} from './layout';

const heightAt = (u: number, v: number) => {
  const p = toWorld(u, v);
  return tidewheelHeight(p.x, p.z);
};

/** A point on the ring `r` m from its middle, `deg` degrees round from the breach's line (the −u axis). */
const onRing = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return [RING.u - r * Math.cos(a), RING.v + r * Math.sin(a)] as const;
};

describe('Tidewheel frame', () => {
  it('maps the frame to the world and back', () => {
    const p = toWorld(123, -45);
    const f = toFrame(p.x, p.z, { u: 0, v: 0 });
    expect(f.u).toBeCloseTo(123, 6);
    expect(f.v).toBeCloseTo(-45, 6);
  });

  it('runs u inland along bearing 143° (the breach’s axis) and v along 53°', () => {
    const o = toWorld(0, 0);
    const u = toWorld(1, 0);
    const v = toWorld(0, 1);
    const bearing = (a: { x: number; z: number }) =>
      ((Math.atan2(a.x - o.x, -(a.z - o.z)) * 180) / Math.PI + 360) % 360;
    expect(bearing(u)).toBeCloseTo(143, 6);
    expect(bearing(v)).toBeCloseTo(53, 6);
  });

  it('centres the island on the ring’s middle, inside its baked bounds', () => {
    const m = toWorld(RING.u, RING.v);
    expect(Math.hypot(S.center.x - m.x, S.center.z - m.z)).toBeLessThan(1);
    const b = S.bounds;
    expect((b.minX + b.maxX) / 2).toBeCloseTo(S.center.x, -1);
    expect((b.minZ + b.maxZ) / 2).toBeCloseTo(S.center.z, -1);
  });
});

describe('tidewheelHeight', () => {
  it('is finite and inside the pack range everywhere in the bounds', () => {
    const b = S.bounds;
    let min = Infinity;
    let max = -Infinity;
    for (let z = b.minZ; z <= b.maxZ; z += 12)
      for (let x = b.minX; x <= b.maxX; x += 12) {
        const h = tidewheelHeight(x, z);
        expect(Number.isFinite(h)).toBe(true);
        min = Math.min(min, h);
        max = Math.max(max, h);
      }
    expect(min).toBeGreaterThanOrEqual(-S.deepDepth);
    // The ring's crest is the island's top.
    expect(max).toBeGreaterThan(RING.high - 12);
    expect(max).toBeLessThan(RING.high + 16);
  });

  it('falls to the deep floor all round the edges of the bake', () => {
    const b = S.bounds;
    for (let t = 0; t <= 1; t += 1 / 64) {
      const x = b.minX + (b.maxX - b.minX) * t;
      const z = b.minZ + (b.maxZ - b.minZ) * t;
      for (const h of [
        tidewheelHeight(x, b.minZ),
        tidewheelHeight(x, b.maxZ),
        tidewheelHeight(b.minX, z),
        tidewheelHeight(b.maxX, z),
      ])
        expect(h).toBeLessThan(-S.deepDepth + 1);
    }
  });

  it('stands a wall all round the bay but for the breach', () => {
    // The crest: 40 m or more everywhere past 40° from the breach's line.
    for (let deg = 40; deg <= 320; deg += 10) {
      let top = -Infinity;
      for (let r = RING.crest - 24; r <= RING.crest + 24; r += 4)
        top = Math.max(top, heightAt(...onRing(r, deg)));
      expect(top, `crest at ${deg}°`).toBeGreaterThan(40);
    }
    // The breach: open water on the ring's own circle, within 10° of its line.
    for (const deg of [-10, -5, 0, 5, 10])
      expect(heightAt(...onRing(RING.crest, deg)), `${deg}°`).toBeLessThan(-6);
    // The sea outside: 80 m past the crest, all round.
    for (let deg = 0; deg < 360; deg += 15)
      expect(heightAt(...onRing(RING.crest + 80, deg)), `outside at ${deg}°`).toBeLessThan(-2);
  });

  it('stands the Lighthouse’s spur over the crest behind it', () => {
    // The tower's lamp is above everything east of it on the lane's line.
    for (let u = LIGHTHOUSE.u; u <= 60; u += 4)
      expect(heightAt(u, LIGHTHOUSE.v)).toBeLessThan(LIGHTHOUSE.lamp - 8);
  });

  it('holds every built place level at its height', () => {
    const level = (u: number, v: number, y: number, r: number, name: string) => {
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4)
        for (const k of [0, 0.5, 1])
          expect(heightAt(u + Math.cos(a) * r * k, v + Math.sin(a) * r * k), name).toBeCloseTo(y, 0);
    };
    level(BANDSTAND.u, BANDSTAND.v, BANDSTAND.y, 5, 'bandstand');
    level(SQUARE.u - 1, SQUARE.v, SQUARE.y, 4.5, 'gear square');
    level(BOUNTY.u, BOUNTY.v, BOUNTY.y, 3, 'bounty corner');
    level(WORKS.u, WORKS.v, WORKS.y, 10, 'wheel works');
    level(COURT.u, COURT.v, COURT.y, 10, 'clock court');
    level(TERRACE.u, TERRACE.v, TERRACE.y, 8, 'terrace');
    level(LIGHTHOUSE.u, LIGHTHOUSE.v, LIGHTHOUSE.base, 6, 'lighthouse');
    for (const p of SPRINGS) level(p.u, p.v, p.y, p.r - 1, 'spring');
  });

  it('steps the town up three level terraces', () => {
    for (const t of TERRACES)
      for (const u of [-200, -170, -140, -110])
        expect(heightAt(u, (t.v0 + t.v1) / 2 + 3), `terrace ${t.y} at u ${u}`).toBeCloseTo(t.y, 0);
  });

  it('stands the wheel’s pier on the north jaw with water under the wheel, clear of the lane', () => {
    // Water at the wheel's foot (it dips in), rock within 30 m behind it.
    expect(heightAt(WHEEL.u, WHEEL.v - 6)).toBeLessThan(-0.5);
    let rock = -Infinity;
    for (let d = 0; d <= 30; d += 2) rock = Math.max(rock, heightAt(WHEEL.u, WHEEL.v + d));
    expect(rock).toBeGreaterThan(4);
    // The lane's edge is at v 0: the wheel's plane is 30 m or more from it.
    expect(WHEEL.v).toBeGreaterThan(30);
  });

  it('stands the rock light out of the sea outside the ring, clear of the lane', () => {
    expect(heightAt(ROCK_LIGHT.u, ROCK_LIGHT.v)).toBeGreaterThan(ROCK_LIGHT.y - 1);
    expect(heightAt(ROCK_LIGHT.u, ROCK_LIGHT.v - 40)).toBeLessThan(-4);
    expect(ROCK_LIGHT.v - ROCK_LIGHT.r - 12).toBeGreaterThan(0);
  });

  it('gives every path a walkable grade: no step over 0.45 m in half a metre', () => {
    const paths: Record<string, readonly Uvy[]> = {
      QUAY_LANE,
      LAMP_STAIR,
      WORKS_STAIR,
      CLOCK_WALK,
      LIGHT_WALK,
      BEACH_PATH,
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

  it('gives every mask a total of 1, with rock on the wall and none in the town', () => {
    const mask = (u: number, v: number) => {
      const p = toWorld(u, v);
      return tidewheelMasks(p.x, p.z);
    };
    for (const [u, v] of [
      [-180, 30],
      [SQUARE.u, SQUARE.v],
      [COURT.u, COURT.v],
      [-262, 200],
      [-262, -230],
      [-600, -30],
      [-300, -190],
    ] as const) {
      const m = mask(u, v);
      expect(m.sand + m.grass + m.rock + m.cliff).toBeCloseTo(1, 4);
    }
    // The inner wall's face, north.
    const face = mask(...onRing(RING.crest - 14, 90));
    expect(face.cliff + face.rock).toBeGreaterThan(0.6);
    expect(mask(-170, 60).grass).toBeLessThan(0.2);
    // The south shore's beach.
    expect(mask(-300, -190).sand).toBeGreaterThan(0.5);
  });
});

describe('Tidewheel’s breach and bay (the ship’s way in)', () => {
  it('keeps the lane 6 m deep for 30 m either side, from the open sea through the breach to the turning room', () => {
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
          expect(tidewheelHeight(x, z), `${x.toFixed(0)},${z.toFixed(0)}`).toBeLessThan(H.laneFloor);
        }
    }
  });

  it('keeps the turning room deep', () => {
    const t = H.turning;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 12)
      for (const r of [0, t.r / 2, t.r]) {
        const x = t.x + Math.cos(a) * r;
        const z = t.z + Math.sin(a) * r;
        expect(tidewheelHeight(x, z), `${x.toFixed(0)},${z.toFixed(0)}`).toBeLessThan(-t.depth);
      }
  });

  it('berths the ship in deep water alongside the quay', () => {
    const b = H.berth;
    for (const along of [-12, -6, 0, 6, 12])
      for (const across of [-3.3, 0, 3.3]) {
        const x = b.x + Math.sin(b.heading) * along + Math.cos(b.heading) * across;
        const z = b.z + Math.cos(b.heading) * along - Math.sin(b.heading) * across;
        expect(tidewheelHeight(x, z)).toBeLessThan(-4);
      }
    expect(tidewheelHeight(H.landing.x, H.landing.z)).toBeGreaterThan(H.deck - 0.4);
  });

  it('lays the gangway on the quay at the berth', () => {
    const { berth } = H;
    const lx = GANGWAY_FOOT.x;
    const lz = GANGWAY_FOOT.z;
    const x = berth.x + Math.cos(berth.heading) * lx + Math.sin(berth.heading) * lz;
    const z = berth.z - Math.sin(berth.heading) * lx + Math.cos(berth.heading) * lz;
    expect(tidewheelHeight(x, z)).toBeGreaterThan(H.deck - 0.4);
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

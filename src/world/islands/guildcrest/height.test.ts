import { describe, expect, it } from 'vitest';
import { windAt } from '../../wind';
import { windOnBow } from '../../ship/dynamics';
import { GUILDCREST_HARBOR as H } from './harbor';
import { guildcrestHeight, guildcrestMasks, guildcrestWater } from './height';
import { BEN, GUILDCREST as G, toFrame, toWorld, WATER } from './layout';
import { GUILDCREST_WAYS } from './waypoints';

const heightAt = (u: number, v: number) => {
  const p = toWorld(u, v);
  return guildcrestHeight(p.x, p.z);
};

describe('Guildcrest frame', () => {
  it('maps the frame to the world and back', () => {
    const p = toWorld(123, -45);
    const f = toFrame(p.x, p.z, { u: 0, v: 0 });
    expect(f.u).toBeCloseTo(123, 6);
    expect(f.v).toBeCloseTo(-45, 6);
  });

  it('runs u inland along bearing 143° (the loch’s axis) and v along 53°', () => {
    const o = toWorld(0, 0);
    const u = toWorld(1, 0);
    const v = toWorld(0, 1);
    const bearing = (a: { x: number; z: number }) =>
      ((Math.atan2(a.x - o.x, -(a.z - o.z)) * 180) / Math.PI + 360) % 360;
    expect(bearing(u)).toBeCloseTo(143, 6);
    expect(bearing(v)).toBeCloseTo(53, 6);
  });
});

describe('guildcrestHeight', () => {
  it('is finite and inside the pack range everywhere in the bounds', () => {
    const b = G.bounds;
    let min = Infinity;
    let max = -Infinity;
    for (let z = b.minZ; z <= b.maxZ; z += 12)
      for (let x = b.minX; x <= b.maxX; x += 12) {
        const h = guildcrestHeight(x, z);
        expect(Number.isFinite(h)).toBe(true);
        min = Math.min(min, h);
        max = Math.max(max, h);
      }
    expect(min).toBeGreaterThanOrEqual(-G.deepDepth);
    expect(max).toBeGreaterThan(170);
    expect(max).toBeLessThan(200);
  });

  it('falls to the deep floor all round the edges of the bake', () => {
    const b = G.bounds;
    for (let t = 0; t <= 1; t += 1 / 64) {
      const x = b.minX + (b.maxX - b.minX) * t;
      const z = b.minZ + (b.maxZ - b.minZ) * t;
      for (const h of [
        guildcrestHeight(x, b.minZ),
        guildcrestHeight(x, b.maxZ),
        guildcrestHeight(b.minX, z),
        guildcrestHeight(b.maxX, z),
      ])
        expect(h).toBeLessThan(-G.deepDepth + 1);
    }
  });

  it('rounds Ben Scrivener’s top (no spire): within 6 m of its top 10 m from it', () => {
    let top = -Infinity;
    let tu = 0;
    let tv = 0;
    for (let du = -40; du <= 40; du += 2)
      for (let dv = -40; dv <= 40; dv += 2) {
        const h = heightAt(BEN.u + du, BEN.v + dv);
        if (h > top) [top, tu, tv] = [h, BEN.u + du, BEN.v + dv];
      }
    expect(top).toBeGreaterThan(BEN.y - 8);
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4)
      expect(top - heightAt(tu + 10 * Math.cos(a), tv + 10 * Math.sin(a))).toBeLessThan(6);
  });

  it('holds the lochan over the linn, and the burn runs down to the loch', () => {
    const w = guildcrestWater();
    expect(w.basins.lochan.level).toBeCloseTo(WATER.lochan.y, 1);
    const burn = w.streams[0]!;
    expect(burn.surface[0]! - burn.surface[burn.count - 1]!).toBeGreaterThan(30);
    const lower = w.streams[1]!;
    expect(lower.surface[lower.count - 1]!).toBeLessThan(1);
  });

  it('gives every mask a total of 1', () => {
    for (const [u, v] of [
      [-180, 30],
      [-96, 46],
      [22, 130],
      [BEN.u, BEN.v],
      [0, 300],
      [-500, 0],
    ] as const) {
      const p = toWorld(u, v);
      const m = guildcrestMasks(p.x, p.z);
      expect(m.sand + m.grass + m.rock + m.cliff).toBeCloseTo(1, 4);
    }
  });
});

describe('Guildcrest’s loch (the ship’s way in)', () => {
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
          expect(guildcrestHeight(x, z), `${x.toFixed(0)},${z.toFixed(0)}`).toBeLessThan(H.laneFloor);
        }
    }
  });

  it('keeps the turning room deep', () => {
    const t = H.turning;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 12)
      for (const r of [0, t.r / 2, t.r]) {
        const x = t.x + Math.cos(a) * r;
        const z = t.z + Math.sin(a) * r;
        expect(guildcrestHeight(x, z), `${x.toFixed(0)},${z.toFixed(0)}`).toBeLessThan(-t.depth);
      }
  });

  it('berths the ship in deep water alongside the quay, bow to the mouth', () => {
    const b = H.berth;
    for (const along of [-12, -6, 0, 6, 12])
      for (const across of [-3.3, 0, 3.3]) {
        const x = b.x + Math.sin(b.heading) * along + Math.cos(b.heading) * across;
        const z = b.z + Math.cos(b.heading) * along - Math.sin(b.heading) * across;
        expect(guildcrestHeight(x, z)).toBeLessThan(-4);
      }
    expect(guildcrestHeight(H.landing.x, H.landing.z)).toBeGreaterThan(H.deck - 0.4);
  });

  it('sails in and out on beam reaches (≥ 60° off the wind; P08)', () => {
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

  it('keeps the berth, the turning room and the lane outside the sea chart’s coast', () => {
    const poly = GUILDCREST_WAYS.sea.coasts[0]!;
    const inside = (x: number, z: number) => {
      let c = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const a = poly[i]!;
        const b = poly[j]!;
        if (a.z > z !== b.z > z && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x) c = !c;
      }
      return c;
    };
    for (const p of [H.berth, H.departure, H.turning, ...H.lane]) expect(inside(p.x, p.z)).toBe(false);
    expect(inside(G.center.x, G.center.z)).toBe(true);
  });
});

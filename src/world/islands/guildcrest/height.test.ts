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

describe('Guildcrest’s quay and the berthed ship', () => {
  it('keeps the quay’s ship obstacles half a metre clear of the berthed hull', async () => {
    const { BRIGANTINE_CAPSULES } = await import('../../ship/lines');
    const { makeBuckets } = await import('../../village/pieces');
    const { makeOut } = await import('./build');
    const { buildTown } = await import('./town-build');
    const out = makeOut();
    const steps = buildTown(makeBuckets(), out, false);
    for (let r = steps.next(); !r.done; r = steps.next());
    expect(out.shipObstacles.length).toBeGreaterThan(20);
    const b = H.berth;
    for (const cap of BRIGANTINE_CAPSULES) {
      const x = b.x + Math.sin(b.heading) * cap.z;
      const z = b.z + Math.cos(b.heading) * cap.z;
      for (const o of out.shipObstacles)
        expect(Math.hypot(o.x - x, o.z - z), `capsule ${cap.z}`).toBeGreaterThan(o.r + cap.radius + 0.5);
    }
  });
});

describe('Guildcrest’s berth, sailed', () => {
  it('docks cleanly from the lane and from the turning room', { timeout: 60_000 }, async () => {
    const { ShipDynamics } = await import('../../ship/dynamics');
    const { makeBuckets } = await import('../../village/pieces');
    const { makeOut } = await import('./build');
    const { buildTown } = await import('./town-build');
    const out = makeOut();
    const steps = buildTown(makeBuckets(), out, false);
    for (let r = steps.next(); !r.done; r = steps.next());
    const obstacles = out.shipObstacles;
    const ground = {
      heightAt: guildcrestHeight,
      normalAt: (_x: number, _z: number, o: Float32Array | number[]) => {
        o[0] = 0;
        o[1] = 1;
        o[2] = 0;
        return o;
      },
      masksAt: () => ({ sand: 0, grass: 1, rock: 0, cliff: 0 }),
    };
    const calm = {
      heightAt: () => 0,
      velocityAt: (_x: number, _z: number, _t: number, o: Float32Array | number[]) => {
        o[0] = 0;
        o[1] = 0;
        return o;
      },
    };
    const b = H.berth;
    const inner = H.lane[3]!;
    const t = H.turning;
    for (const [x, z, heading] of [
      [inner.x, inner.z, Math.atan2(b.x - inner.x, b.z - inner.z)],
      [t.x + 10, t.z - 10, b.heading],
    ] as const) {
      const ship = new ShipDynamics(x, z, heading);
      ship.dockAssist(b);
      const env = { waves: calm, ground, obstacles: [...obstacles], t: 0 };
      let worst = -Infinity;
      let i = 0;
      for (; i < 90 * 60 && !ship.dockComplete; i++) {
        env.t += 1 / 60;
        ship.step(1 / 60, { trim: 0, rudder: 0 }, env);
        const s = Math.sin(ship.pose.heading);
        const c = Math.cos(ship.pose.heading);
        for (const cap of ship.capsules)
          for (const o of obstacles)
            worst = Math.max(
              worst,
              cap.radius + o.r - Math.hypot(ship.pose.x + s * cap.z - o.x, ship.pose.z + c * cap.z - o.z),
            );
      }
      expect(ship.dockComplete, `from ${x.toFixed(0)},${z.toFixed(0)}`).toBe(true);
      expect(i / 60).toBeLessThan(80);
      expect(worst, `from ${x.toFixed(0)},${z.toFixed(0)}`).toBeLessThan(0.05);
    }
  });
});

describe('Guildcrest arrival flyover', () => {
  it('clears the ground by 3 m, and the tower and the mills’ sails by 3 m, along its keys', async () => {
    const { GUILDCREST_ARRIVAL_KEYS } = await import('./arrival');
    const { MILL, MILLS, TOWER } = await import('./layout');
    const keys = [...GUILDCREST_ARRIVAL_KEYS, { ...H.landingShot, pace: 1 }];
    const tower = toWorld(TOWER.u, TOWER.v);
    for (let i = 0; i < keys.length - 1; i++) {
      const a = keys[i]!;
      const b = keys[i + 1]!;
      const len = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
      for (let s = 0; s <= len; s += 0.5) {
        const t = s / len;
        const x = a.x + (b.x - a.x) * t;
        const y = a.y + (b.y - a.y) * t;
        const z = a.z + (b.z - a.z) * t;
        const at = `key ${i} at ${x.toFixed(0)},${z.toFixed(0)}`;
        expect(y - guildcrestHeight(x, z), at).toBeGreaterThan(3);
        if (y < TOWER.top + 3)
          expect(Math.hypot(x - tower.x, z - tower.z), at).toBeGreaterThan(TOWER.side / 2 + 4);
        for (const m of MILLS) {
          const p = toWorld(m.u, m.v);
          if (y < m.y + MILL.tower + MILL.sail + 4)
            expect(Math.hypot(x - p.x, z - p.z), at).toBeGreaterThan(MILL.sail + 4);
        }
      }
    }
  });
});

import { describe, expect, it } from 'vitest';
import type { BoxCollider } from '../../../game/collision';
import type { CircleObstacle } from '../../contracts';
import { makeBuckets } from '../../village/pieces';
import { DeckIndex } from '../../village/walk-decks';
import { KEELHAVEN_ISLAND } from '../../../islands/keelhaven';
import { footprintDistance } from '../footprint';
import { buildAbbey } from './abbey';
import { GUILDCREST_ANCHORS } from './anchors';
import { makeOut, type GcOut } from './build';
import { CIRCUIT_SPOTS } from './circuit';
import { guildcrestHeight } from './height';
import { toFrame, toWorld } from './layout';
import { buildRidge } from './ridge';
import { GUILDCREST_STARFISH } from './starfish';
import { buildTown } from './town-build';
import { GUILDCREST_WAYS } from './waypoints';

function build(lite: boolean): GcOut {
  const out = makeOut();
  const b = makeBuckets();
  for (const steps of [buildTown(b, out, lite), buildAbbey(b, out, lite), buildRidge(b, out, lite)])
    for (let r = steps.next(); !r.done; r = steps.next());
  return out;
}
const built = build(false);
const decks = new DeckIndex(built.decks, toFrame);

/** The walk height at world (x, z) for feet near `y`: a deck there within a step, else the ground. */
function walkAt(x: number, z: number, y = 1e6): number {
  const g = guildcrestHeight(x, z);
  const d = decks.heightAt(x, z, y);
  return d !== null && d > g - 0.05 ? d : g;
}

/** How far (m) world (x, z) at feet height `y` is from the nearest collider that blocks there. */
function clearance(out: GcOut, x: number, z: number, y: number): number {
  let best = Infinity;
  const spans = (c: { y0?: number; y1?: number }) =>
    (c.y0 === undefined || y + 0.3 >= c.y0) && (c.y1 === undefined || y + 0.3 <= c.y1);
  for (const c of out.circles as CircleObstacle[])
    if (spans(c)) best = Math.min(best, Math.hypot(x - c.x, z - c.z) - c.r);
  for (const c of out.colliders as BoxCollider[]) {
    if (!spans(c)) continue;
    const dx = x - c.x;
    const dz = z - c.z;
    const cs = Math.cos(c.rot);
    const sn = Math.sin(c.rot);
    const lx = dx * cs - dz * sn;
    const lz = dx * sn + dz * cs;
    const ox = Math.max(0, Math.abs(lx) - c.hx);
    const oz = Math.max(0, Math.abs(lz) - c.hz);
    best = Math.min(
      best,
      ox === 0 && oz === 0 ? -Math.min(c.hx - Math.abs(lx), c.hz - Math.abs(lz)) : Math.hypot(ox, oz),
    );
  }
  return best;
}

describe('Guildcrest’s places', () => {
  it('stands every anchor on its walk surface, clear of every collider', () => {
    for (const [name, a] of Object.entries(GUILDCREST_ANCHORS)) {
      // Cameras, and the set pieces the cast look at (the stone, the rack, the bell rope, the stand).
      if (name.endsWith('Cam') || ['charterStone', 'chainRack', 'bellRope', 'chartStand'].includes(name))
        continue;
      const y = walkAt(a.x, a.z, a.y + 0.5);
      expect(Math.abs(y - a.y), `${name} stands on its ground`).toBeLessThan(0.35);
      expect(clearance(built, a.x, a.z, y), `${name} clear`).toBeGreaterThan(0.6);
    }
  });

  it('keeps a 2.5 m clear radius round the cast and the stations (props may stand nearer)', () => {
    const tall = makeOut();
    tall.colliders.push(...built.colliders.filter((c) => (c.height ?? 9) > 2.4));
    tall.circles.push(...built.circles.filter((c) => (c.height ?? 9) > 2.4 && c.r > 0.3));
    for (const name of [
      'lyra',
      'elspeth',
      'aidan',
      'brigid',
      'ewan',
      'fergus',
      'rory',
      'seren',
      'landing',
    ] as const) {
      const a = GUILDCREST_ANCHORS[name];
      expect(clearance(tall, a.x, a.z, a.y), name).toBeGreaterThan(1.6);
    }
    for (const kind of ['book', 'belt'] as const)
      for (const [place, s] of Object.entries(CIRCUIT_SPOTS[kind])) {
        const p = toWorld(s.u, s.v);
        expect(clearance(tall, p.x, p.z, s.y), `${kind}:${place}`).toBeGreaterThan(1.5);
      }
  });

  it('walks every leg of the compass’s route: a surface all along, no step over 0.45 m, no collider across it', () => {
    const nodes = new Map(GUILDCREST_WAYS.walk.nodes.map((n) => [n.id, n]));
    for (const [ia, ib] of GUILDCREST_WAYS.walk.legs) {
      const a = nodes.get(ia)!;
      const b = nodes.get(ib)!;
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      const n = Math.max(1, Math.ceil(len / 0.5));
      let prev = walkAt(a.x, a.z, a.y + 0.5);
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        const x = a.x + (b.x - a.x) * t;
        const z = a.z + (b.z - a.z) * t;
        const y = walkAt(x, z, prev + 0.5);
        expect(Math.abs(y - prev), `${ia} → ${ib} step at ${t.toFixed(2)}`).toBeLessThan(0.45);
        expect(clearance(built, x, z, y), `${ia} → ${ib} blocked at ${t.toFixed(2)}`).toBeGreaterThan(0.25);
        prev = y;
      }
    }
  });

  it('puts every starfish on reachable ground, clear of colliders and out of the water', () => {
    for (const s of GUILDCREST_STARFISH) {
      const y = walkAt(s.x, s.z, s.y ?? 1e6);
      expect(y, s.id).toBeGreaterThan(-0.3);
      expect(clearance(built, s.x, s.z, y), s.id).toBeGreaterThan(0.4);
    }
  });

  it('keeps every playable place more than 1600 m from Keelhaven’s shore', () => {
    for (const a of Object.values(GUILDCREST_ANCHORS))
      expect(footprintDistance(KEELHAVEN_ISLAND.footprint, a.x, a.z)).toBeGreaterThan(1600);
  });

  it('builds the same walk surfaces and colliders on Lite (the cuts are looks only)', () => {
    const lite = build(true);
    expect(lite.decks.length).toBe(built.decks.length);
    expect(lite.colliders.length).toBeGreaterThan(built.colliders.length * 0.8);
  });

  it('frames each anchor in the island frame it was written in', () => {
    const f = toFrame(GUILDCREST_ANCHORS.landing.x, GUILDCREST_ANCHORS.landing.z, { u: 0, v: 0 });
    expect(f.u).toBeCloseTo(-190, 4);
    expect(f.v).toBeCloseTo(16, 4);
  });
});

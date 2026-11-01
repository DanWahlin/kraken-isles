import type { Group } from 'three/webgpu';
import type { Tier } from '../../contracts';
import { smoothstep } from '../../../util/math';
import { sunState } from '../../sky/sun';
import { fbm2 } from '../../terrain/cove-height';
import {
  createIslandSilhouetteAsync,
  mixHex,
  type SilhouetteBlock,
  type SilhouetteMasks,
  type SilhouetteTower,
} from '../silhouette';
import { guildcrestHeightDry } from './height';
import { CLOISTER, GUILDCREST as G, MILL, MILLS, toFrame, toWorld, TOWER, YARD, WATER } from './layout';
import { PINE_STANDS } from './stands';
import { ABBEY, GUILDHALLS, HOUSES, INN_HOUSE, JOURNEYMEN_HALL } from './town';

/** The island's sky (late afternoon, the sun low in the west-south-west). */
export const GUILDCREST_SILHOUETTE_SKY = G.sky;

const F = { u: 0, v: 0 };
const E = 6;

/** The frame's u axis as a yaw (three's, as `BoxCollider.rot`). */
const YAW_U = (() => {
  const o = toWorld(0, 0);
  const p = toWorld(1, 0);
  return Math.atan2(-(p.z - o.z), p.x - o.x);
})();

/**
 * Guildcrest's cover, cheap enough for a far grid: the north-east's granite sea cliffs (steep, low,
 * near the coast), bare granite on the ben's top and the steepest faces, the shingle at the waterline,
 * and moor everywhere else (the heather's purple-brown carried by `moss`).
 */
function masks(x: number, z: number): SilhouetteMasks {
  const h = guildcrestHeightDry(x, z);
  const sx = guildcrestHeightDry(x + E, z) - h;
  const sz = guildcrestHeightDry(x, z + E) - h;
  const slope = Math.hypot(sx, sz) / E;
  toFrame(x, z, F);
  const sand = smoothstep(-1.6, -0.4, h) * (1 - smoothstep(1.4, 2.6, h)) * (1 - smoothstep(0.3, 0.6, slope));
  const cliff =
    smoothstep(0.9, 1.6, slope) *
    (1 - smoothstep(40, 56, h)) *
    smoothstep(-6, -2, h) *
    smoothstep(70, 170, F.v);
  const rock = Math.max(smoothstep(160, 178, h), smoothstep(1.1, 1.8, slope) * (1 - cliff)) * 0.8;
  return { sand, grass: smoothstep(0.5, 2.5, h) * (1 - cliff) * (1 - rock), rock, cliff };
}

/** How much of the ground is a pine stand (0-1): the tree line on the hills. */
function forest(x: number, z: number): number {
  toFrame(x, z, F);
  let best = 0;
  for (const s of PINE_STANDS) {
    const d = ((F.u - s.u) / s.ru) ** 2 + ((F.v - s.v) / s.rv) ** 2;
    best = Math.max(best, 1 - smoothstep(0.5, 1, d));
  }
  return best * 0.85;
}

/** A frame box as a block (its yaw along u). */
function block(
  u: number,
  v: number,
  su: number,
  sv: number,
  y0: number,
  y1: number,
  color: number,
  roof?: number,
  rise?: number,
): SilhouetteBlock {
  const p = toWorld(u, v);
  return {
    x: p.x,
    z: p.z,
    hx: su / 2,
    hz: sv / 2,
    rot: YAW_U,
    y0,
    y1,
    color,
    ...(roof ? { roof, roofRise: rise } : {}),
  };
}

const SLATE = 0x5a606c;

/**
 * The town's houses, the guildhalls, the abbey's ranges and its church, the Guildhall of Journeymen
 * as blocks with slate roofs; the bell tower and the three mills as prisms (their caps), each from
 * the same data the builders use.
 */
function masses(tier: Tier): { blocks: SilhouetteBlock[]; towers: SilhouetteTower[] } {
  const blocks: SilhouetteBlock[] = [];
  const sparse = tier === 'lite' || tier === 'low';
  for (const h of [...HOUSES, INN_HOUSE]) {
    if (sparse && !h.lite) continue;
    const su = h.fu === 0 ? h.w : h.d;
    const sv = h.fu === 0 ? h.d : h.w;
    const p = toWorld(h.u, h.v);
    const base = guildcrestHeightDry(p.x, p.z) + 0.2;
    blocks.push(
      block(
        h.u,
        h.v,
        su,
        sv,
        base - 0.5,
        base + (h.storeys === 2 ? 5.6 : 3.1),
        mixHex(h.tint, 0xb8b0a0, 0.2),
        SLATE,
        h.d * 0.42,
      ),
    );
  }
  const stone = 0xbab2a4;
  for (const g of GUILDHALLS) {
    const su = g.along === 'u' ? g.length : g.depth;
    const sv = g.along === 'u' ? g.depth : g.length;
    blocks.push(block(g.u, g.v, su, sv, 9.5, 16.5, stone, SLATE, 3.6));
  }
  const c = CLOISTER;
  const o = ABBEY.outer;
  const w = ABBEY.walk;
  const y = c.y;
  blocks.push(block(c.u - (o + w) / 2, c.v, o - w, 2 * o, y - 1, y + 7.5, stone, SLATE, 3.6));
  blocks.push(block(c.u + (o + w) / 2, c.v + 2, o - w, 2 * w, y - 1, y + 7.5, stone, SLATE, 3.6));
  blocks.push(block(c.u, c.v + (o + w) / 2, 2 * w, o - w, y - 1, y + 7.5, stone, SLATE, 3.6));
  blocks.push(
    block(
      (c.u - w + ABBEY.churchEast) / 2,
      c.v - (o + w) / 2,
      ABBEY.churchEast - c.u + w,
      o - w,
      y - 1,
      y + 10.5,
      stone,
      SLATE,
      4.4,
    ),
  );
  const jh = JOURNEYMEN_HALL;
  blocks.push(
    block(
      (jh.u0 + jh.u1) / 2,
      (jh.v0 + jh.v1) / 2,
      jh.u1 - jh.u0,
      jh.v1 - jh.v0,
      YARD.y - 1,
      YARD.y + 6.5,
      stone,
      SLATE,
      4,
    ),
  );
  const towers: SilhouetteTower[] = [];
  const t = toWorld(TOWER.u, TOWER.v);
  const half = TOWER.side / 2;
  towers.push({
    x: t.x,
    z: t.z,
    r0: half * 1.15,
    r1: half * 1.15,
    y0: TOWER.base - 1,
    y1: TOWER.belfry[1] + 0.6,
    color: stone,
    cap: { color: SLATE, height: TOWER.top - TOWER.belfry[1] - 0.6 },
  });
  for (const m of MILLS) {
    const p = toWorld(m.u, m.v);
    towers.push({
      x: p.x,
      z: p.z,
      r0: 3.1,
      r1: 2.35,
      y0: m.y - 1,
      y1: m.y + MILL.tower,
      color: 0xe4ddcf,
      cap: { color: 0x6b5038, height: MILL.cap },
    });
    // The sails as a pale cross (two thin blocks across the hub, facing the wind).
    const hub = { x: p.x - 0.8 * 2.7, z: p.z + 0.6 * 2.7 };
    const hy = m.y + MILL.tower + 1;
    const rot = Math.atan2(0.6, 0.8);
    blocks.push({
      x: hub.x,
      z: hub.z,
      hx: 0.25,
      hz: 0.9,
      rot,
      y0: hy - MILL.sail,
      y1: hy + MILL.sail,
      color: 0xf2ece0,
    });
    blocks.push({
      x: hub.x,
      z: hub.z,
      hx: 0.25,
      hz: MILL.sail,
      rot,
      y0: hy - 0.9,
      y1: hy + 0.9,
      color: 0xf2ece0,
    });
  }
  return { blocks, towers };
}

/** The linn as a soft white strip down its crag. */
function falls(): {
  points: [number, number][];
  halfWidth: number;
  lift: number;
  color: number;
  soft?: number;
}[] {
  const lip = toWorld(WATER.linnLip.u, WATER.linnLip.v);
  const pool = toWorld(WATER.linnPool.u, WATER.linnPool.v);
  return [
    {
      points: [
        [lip.x, lip.z],
        [(lip.x + pool.x) / 2, (lip.z + pool.z) / 2],
        [pool.x, pool.z],
      ],
      halfWidth: 3,
      lift: 1.5,
      color: 0xdfe8ea,
      soft: 0.8,
    },
  ];
}

/**
 * Guildcrest as a far silhouette (before it streams in, and while the camera's past its show range),
 * to read like the island at its swap distance: its own ground (`guildcrestHeightDry`) as moor with
 * heather drifts, granite on the ben's top and the north-east sea cliffs, the pine stands as a tree
 * line, under its late-afternoon sun; the town's harled houses and slate roofs, the guildhalls, the
 * abbey's ranges, the bell tower and the mills with their sails as a cross. One draw, in the islands'
 * shared far graph. Built a few grid rows a breath (`ready`).
 */
export function createGuildcrestSilhouette(
  tier: Tier,
  breathe: () => Promise<void>,
): { group: Group; ready: Promise<void> } {
  const b = G.bounds;
  const sun = sunState(GUILDCREST_SILHOUETTE_SKY.hours, GUILDCREST_SILHOUETTE_SKY.azimuth).sun;
  return createIslandSilhouetteAsync(
    {
      name: 'guildcrest-silhouette',
      bounds: { minX: b.minX + 40, maxX: b.maxX - 40, minZ: b.minZ + 40, maxZ: b.maxZ - 40 },
      cell: tier === 'lite' || tier === 'low' ? 16 : 10,
      height: guildcrestHeightDry,
      masks,
      land: 0x6a8448,
      rock: 0x8e8a82,
      cliff: 0x5a5650,
      sand: 0xb8ae98,
      // The heather: purple-brown drifts over the moor's higher ground.
      moss: (x, z, m) =>
        m.grass *
        smoothstep(40, 80, guildcrestHeightDry(x, z)) *
        (0.15 + 0.3 * smoothstep(-0.2, 0.4, fbm2(x / 90, z / 90, 2, 0x6c4))),
      mossColor: 0x76687a,
      forest,
      forestColor: 0x2e4630,
      forestHeight: 9,
      sheen: 0.4,
      light: {
        dir: sun,
        sun: [1.0, 0.88, 0.74],
        ambient: [0.6, 0.66, 0.76],
        ground: [0.22, 0.25, 0.3],
        wrap: 0.3,
      },
      ...masses(tier),
      ribbons: falls(),
    },
    breathe,
  );
}

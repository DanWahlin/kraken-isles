import type { Group } from 'three/webgpu';
import type { Tier } from '../../contracts';
import { smoothstep } from '../../../util/math';
import { sunState } from '../../sky/sun';
import {
  createIslandSilhouetteAsync,
  mixHex,
  type SilhouetteBlock,
  type SilhouetteMasks,
  type SilhouetteTower,
} from '../silhouette';
import { tidewheelFloor, tidewheelHeight } from './height';
import { LIGHTHOUSE, TIDEWHEEL as S, toWorld, WORKS } from './layout';
import { HOUSES } from './town';

/** The island's sky (the last sun, in the breach). */
export const TIDEWHEEL_SILHOUETTE_SKY = S.sky;

const E = 6;

/** The frame's u axis as a yaw (three's, as `BoxCollider.rot`). */
const YAW_U = (() => {
  const o = toWorld(0, 0);
  const p = toWorld(1, 0);
  return Math.atan2(-(p.z - o.z), p.x - o.x);
})();

/**
 * Tidewheel's cover, cheap enough for a far grid: black rock on every steep face (the ring's wall inside
 * and out, the ledges, the terraces' risers), thin turf on the gentle ground above the beach.
 */
function masks(x: number, z: number): SilhouetteMasks {
  const h = tidewheelHeight(x, z);
  const sx = tidewheelHeight(x + E, z) - h;
  const sz = tidewheelHeight(x, z + E) - h;
  const slope = Math.hypot(sx, sz) / E;
  const cliff = smoothstep(0.8, 1.5, slope) * smoothstep(-4, -1, h);
  const rock = smoothstep(0.5, 0.8, slope) * (1 - cliff) * 0.5;
  const sand = (1 - smoothstep(0.4, 0.9, slope)) * smoothstep(-1.6, -0.4, h) * (1 - smoothstep(2.4, 4, h));
  return { sand, grass: smoothstep(0.5, 2.5, h) * (1 - cliff) * (1 - rock), rock, cliff };
}

/** How much of the ground is the floor's stands of pine (0-1). */
function grove(x: number, z: number): number {
  const o = toWorld(0, 0);
  const pu = toWorld(1, 0);
  const pv = toWorld(0, 1);
  const u = (x - o.x) * (pu.x - o.x) + (z - o.z) * (pu.z - o.z);
  const v = (x - o.x) * (pv.x - o.x) + (z - o.z) * (pv.z - o.z);
  return tidewheelFloor(u, v) * 0.25;
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
): SilhouetteBlock {
  const p = toWorld(u, v);
  return { x: p.x, z: p.z, hx: su / 2, hz: sv / 2, rot: YAW_U, y0, y1, color };
}

/** The town's dark houses and the Works' wall as flat-roofed blocks; the Lighthouse as a prism with a copper cap. */
function masses(tier: Tier): { blocks: SilhouetteBlock[]; towers: SilhouetteTower[] } {
  const blocks: SilhouetteBlock[] = [];
  const sparse = tier === 'lite' || tier === 'low';
  for (const h of HOUSES) {
    if (sparse && !h.lite) continue;
    const su = h.fu === 0 ? h.w : h.d;
    const sv = h.fu === 0 ? h.d : h.w;
    const p = toWorld(h.u, h.v);
    const base = tidewheelHeight(p.x, p.z) + 0.2;
    blocks.push(
      block(
        h.u,
        h.v,
        su,
        sv,
        base - 0.5,
        base + (h.storeys === 2 ? 6.4 : 3.6),
        mixHex(h.tint, 0x4f9a86, 0.25),
      ),
    );
  }
  const w = WORKS;
  blocks.push(block(w.u, w.v + w.halfV, w.halfU * 2, 0.8, w.y - 1, w.y + 3.5, 0x6a655f));
  const towers: SilhouetteTower[] = [];
  const d = toWorld(LIGHTHOUSE.u, LIGHTHOUSE.v);
  towers.push({
    x: d.x,
    z: d.z,
    r0: LIGHTHOUSE.r,
    r1: LIGHTHOUSE.r - 1.4,
    y0: LIGHTHOUSE.base - 1,
    y1: LIGHTHOUSE.cap - 2,
    color: 0x6a655f,
    cap: { color: 0x4f9a86, height: 7 },
  });
  return { blocks, towers };
}

/**
 * Tidewheel as a far silhouette (before it streams in, and while the camera's past its show range), to
 * read like the island at its swap distance: a dark ring of rock with one gap, under its low sun; thin
 * green on the floor; the town's dark blocks; the Lighthouse as a grey prism with a green cap. One
 * draw, in the islands' shared far graph. Built a few grid rows a breath.
 */
export function createTidewheelSilhouette(
  tier: Tier,
  breathe: () => Promise<void>,
): { group: Group; ready: Promise<void> } {
  const b = S.bounds;
  const sun = sunState(TIDEWHEEL_SILHOUETTE_SKY.hours, TIDEWHEEL_SILHOUETTE_SKY.azimuth).sun;
  return createIslandSilhouetteAsync(
    {
      name: 'tidewheel-silhouette',
      bounds: { minX: b.minX + 40, maxX: b.maxX - 40, minZ: b.minZ + 40, maxZ: b.maxZ - 40 },
      cell: tier === 'lite' || tier === 'low' ? 16 : 10,
      height: tidewheelHeight,
      masks,
      land: 0x55603f,
      rock: 0x3c3936,
      cliff: 0x2c2a29,
      sand: 0x3a3836,
      forest: grove,
      forestColor: 0x2c4530,
      forestHeight: 5,
      sheen: 0.2,
      light: {
        dir: sun,
        sun: [1.0, 0.74, 0.5],
        ambient: [0.5, 0.52, 0.64],
        ground: [0.3, 0.26, 0.22],
        wrap: 0.3,
      },
      ...masses(tier),
    },
    breathe,
  );
}

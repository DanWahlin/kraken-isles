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
import { sunspireHeightDry } from './height';
import {
  CARAVANSERAI,
  LIBRARY_ROCK,
  NEEDLE,
  SIGNAL_HOUSE,
  SPIRE,
  SUNSPIRE as S,
  toWorld,
  WATER,
} from './layout';
import { HOUSES, SERAI } from './town';

/** The island's sky (a high morning sun in the west-south-west). */
export const SUNSPIRE_SILHOUETTE_SKY = S.sky;

const E = 6;

/** The frame's u axis as a yaw (three's, as `BoxCollider.rot`). */
const YAW_U = (() => {
  const o = toWorld(0, 0);
  const p = toWorld(1, 0);
  return Math.atan2(-(p.z - o.z), p.x - o.x);
})();

/**
 * Sunspire's cover, cheap enough for a far grid: red rock on every steep face (the tables' walls, the
 * butte, the sea cliffs), sand everywhere else.
 */
function masks(x: number, z: number): SilhouetteMasks {
  const h = sunspireHeightDry(x, z);
  const sx = sunspireHeightDry(x + E, z) - h;
  const sz = sunspireHeightDry(x, z + E) - h;
  const slope = Math.hypot(sx, sz) / E;
  const cliff = smoothstep(0.8, 1.5, slope) * smoothstep(-4, -1, h);
  const rock = smoothstep(0.4, 0.8, slope) * (1 - cliff) * 0.7;
  const sand = (1 - smoothstep(0.4, 0.9, slope)) * smoothstep(-1.6, -0.4, h) * (1 - smoothstep(2.4, 4, h));
  return { sand, grass: smoothstep(0.5, 2.5, h) * (1 - cliff) * (1 - rock), rock, cliff };
}

/** How much of the ground is the oasis's palm grove (0-1). */
function grove(x: number, z: number): number {
  const p = toWorld(WATER.pool.u - 12, WATER.pool.v + 6);
  return (1 - smoothstep(22, 40, Math.hypot(x - p.x, z - p.z))) * 0.9;
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

/** The town's adobe houses, the caravanserai and the Signal House as flat-roofed blocks; the Sunspire and the two lights as prisms. */
function masses(tier: Tier): { blocks: SilhouetteBlock[]; towers: SilhouetteTower[] } {
  const blocks: SilhouetteBlock[] = [];
  const sparse = tier === 'lite' || tier === 'low';
  for (const h of HOUSES) {
    if (sparse && !h.lite) continue;
    const su = h.fu === 0 ? h.w : h.d;
    const sv = h.fu === 0 ? h.d : h.w;
    const p = toWorld(h.u, h.v);
    const base = sunspireHeightDry(p.x, p.z) + 0.2;
    blocks.push(
      block(
        h.u,
        h.v,
        su,
        sv,
        base - 0.5,
        base + (h.storeys === 2 ? 6.6 : 3.8),
        mixHex(h.tint, 0xc8a078, 0.25),
      ),
    );
  }
  const c = CARAVANSERAI;
  blocks.push(block(c.u, c.v, c.halfU * 2, c.halfV * 2, c.y - 1, c.y + SERAI.wall, 0xdcb88c));
  const sh = SIGNAL_HOUSE;
  blocks.push(block(sh.u, sh.v, 12, sh.halfV * 2, sh.y - 1, sh.y + 6.6, 0xf2e6cc));
  const towers: SilhouetteTower[] = [];
  const t = toWorld(SPIRE.u, SPIRE.v);
  towers.push({
    x: t.x,
    z: t.z,
    r0: 6.4,
    r1: 4,
    y0: SPIRE.base - 1,
    y1: SPIRE.base + 44,
    color: 0xdcb88c,
    cap: { color: 0xa8443a, height: SPIRE.top - SPIRE.base - 44 },
  });
  const n = toWorld(NEEDLE.u, NEEDLE.v);
  towers.push({ x: n.x, z: n.z, r0: 0.5, r1: 0.5, y0: NEEDLE.y, y1: NEEDLE.y + 5.8, color: 0x4a3a2c });
  const r = toWorld(LIBRARY_ROCK.u, LIBRARY_ROCK.v);
  towers.push({
    x: r.x,
    z: r.z,
    r0: 2.4,
    r1: 1.9,
    y0: LIBRARY_ROCK.y - 1,
    y1: LIBRARY_ROCK.y + 8.3,
    color: 0xf4ecdc,
    cap: { color: 0x2c5c9a, height: 3.4 },
  });
  return { blocks, towers };
}

/** The Weeping Wall as a soft white strip down the Low Mesa's corner. */
function falls(): {
  points: [number, number][];
  halfWidth: number;
  lift: number;
  color: number;
  soft?: number;
}[] {
  const lip = toWorld(WATER.fallLip.u, WATER.fallLip.v);
  const pool = toWorld(WATER.pool.u + 6, WATER.pool.v + 3);
  return [
    {
      points: [
        [lip.x, lip.z],
        [(lip.x + pool.x) / 2, (lip.z + pool.z) / 2],
        [pool.x, pool.z],
      ],
      halfWidth: 2.4,
      lift: 1.5,
      color: 0xdfe8ea,
      soft: 0.8,
    },
  ];
}

/**
 * Sunspire as a far silhouette (before it streams in, and while the camera's past its show range), to
 * read like the island at its swap distance: its own ground (`sunspireHeightDry`) as pale sand with
 * red rock on every wall, under its morning sun; the oasis's grove as a tree line; the town's adobe
 * blocks, the caravanserai and the Signal House; the Sunspire, the Needle's mast and Library Rock's
 * white light as prisms. One draw, in the islands' shared far graph. Built a few grid rows a breath.
 */
export function createSunspireSilhouette(
  tier: Tier,
  breathe: () => Promise<void>,
): { group: Group; ready: Promise<void> } {
  const b = S.bounds;
  const sun = sunState(SUNSPIRE_SILHOUETTE_SKY.hours, SUNSPIRE_SILHOUETTE_SKY.azimuth).sun;
  return createIslandSilhouetteAsync(
    {
      name: 'sunspire-silhouette',
      bounds: { minX: b.minX + 40, maxX: b.maxX - 40, minZ: b.minZ + 40, maxZ: b.maxZ - 40 },
      cell: tier === 'lite' || tier === 'low' ? 16 : 10,
      height: sunspireHeightDry,
      masks,
      land: 0xdcbe8e,
      rock: 0xb5623a,
      cliff: 0x9a4a2e,
      sand: 0xe6cc9c,
      forest: grove,
      forestColor: 0x3f6a34,
      forestHeight: 7,
      sheen: 0.2,
      light: {
        dir: sun,
        sun: [1.0, 0.95, 0.84],
        ambient: [0.62, 0.66, 0.72],
        ground: [0.3, 0.26, 0.22],
        wrap: 0.3,
      },
      ...masses(tier),
      ribbons: falls(),
    },
    breathe,
  );
}

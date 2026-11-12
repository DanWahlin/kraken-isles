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
import { inkwellHeight, inkwellValley } from './height';
import { DOME, INKWELL as S, LOGGIA, TAVERNA, toWorld } from './layout';
import { HOUSES, TAVERN } from './town';

/** The island's sky (a low golden sun in the west-south-west). */
export const INKWELL_SILHOUETTE_SKY = S.sky;

const E = 6;

/** The frame's u axis as a yaw (three's, as `BoxCollider.rot`). */
const YAW_U = (() => {
  const o = toWorld(0, 0);
  const p = toWorld(1, 0);
  return Math.atan2(-(p.z - o.z), p.x - o.x);
})();

/**
 * Inkwell's cover, cheap enough for a far grid: white chalk on every steep face (the sea cliffs, the
 * bluff's wall, the terraces' risers), turf everywhere else above the beach.
 */
function masks(x: number, z: number): SilhouetteMasks {
  const h = inkwellHeight(x, z);
  const sx = inkwellHeight(x + E, z) - h;
  const sz = inkwellHeight(x, z + E) - h;
  const slope = Math.hypot(sx, sz) / E;
  const cliff = smoothstep(0.8, 1.5, slope) * smoothstep(-4, -1, h);
  const rock = smoothstep(0.5, 0.8, slope) * (1 - cliff) * 0.5;
  const sand = (1 - smoothstep(0.4, 0.9, slope)) * smoothstep(-1.6, -0.4, h) * (1 - smoothstep(2.4, 4, h));
  return { sand, grass: smoothstep(0.5, 2.5, h) * (1 - cliff) * (1 - rock), rock, cliff };
}

/** How much of the ground is the valley's olive and cypress (0-1). */
function grove(x: number, z: number): number {
  const f = { u: 0, v: 0 };
  const o = toWorld(0, 0);
  const pu = toWorld(1, 0);
  const pv = toWorld(0, 1);
  f.u = (x - o.x) * (pu.x - o.x) + (z - o.z) * (pu.z - o.z);
  f.v = (x - o.x) * (pv.x - o.x) + (z - o.z) * (pv.z - o.z);
  return inkwellValley(f.u, f.v) * 0.5;
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

/** The town's white houses, the taverna and the Loggia as flat-roofed blocks; the Dome as a prism with a blue cap. */
function masses(tier: Tier): { blocks: SilhouetteBlock[]; towers: SilhouetteTower[] } {
  const blocks: SilhouetteBlock[] = [];
  const sparse = tier === 'lite' || tier === 'low';
  for (const h of HOUSES) {
    if (sparse && !h.lite) continue;
    const su = h.fu === 0 ? h.w : h.d;
    const sv = h.fu === 0 ? h.d : h.w;
    const p = toWorld(h.u, h.v);
    const base = inkwellHeight(p.x, p.z) + 0.2;
    blocks.push(
      block(
        h.u,
        h.v,
        su,
        sv,
        base - 0.5,
        base + (h.storeys === 2 ? 6.3 : 3.5),
        mixHex(h.tint, 0xe8d8b8, 0.2),
      ),
    );
  }
  const t = TAVERNA;
  blocks.push(
    block(
      t.u,
      t.v + t.halfV + TAVERN.house.depth / 2,
      t.halfU * 2,
      TAVERN.house.depth,
      t.y - 1,
      t.y + 3.9,
      0xf6efe0,
    ),
  );
  const l = LOGGIA;
  blocks.push(block(l.u, l.v, l.halfU * 2, l.halfV * 2, l.y - 1, l.y + 4.6, 0xf6efe0));
  const towers: SilhouetteTower[] = [];
  const d = toWorld(DOME.u, DOME.v);
  towers.push({
    x: d.x,
    z: d.z,
    r0: DOME.r,
    r1: DOME.r - 1.3,
    y0: DOME.base - 1,
    y1: DOME.top - 6,
    color: 0xf6efe0,
    cap: { color: 0x2c5c9a, height: 6 },
  });
  return { blocks, towers };
}

/**
 * Inkwell as a far silhouette (before it streams in, and while the camera's past its show range), to
 * read like the island at its swap distance: its own ground as turf with white chalk on every wall,
 * under its golden sun; the valley's trees as a low tree line; the town's white blocks, the taverna
 * and the Loggia; the Dome as a white prism with a blue cap. One draw, in the islands' shared far
 * graph. Built a few grid rows a breath.
 */
export function createInkwellSilhouette(
  tier: Tier,
  breathe: () => Promise<void>,
): { group: Group; ready: Promise<void> } {
  const b = S.bounds;
  const sun = sunState(INKWELL_SILHOUETTE_SKY.hours, INKWELL_SILHOUETTE_SKY.azimuth).sun;
  return createIslandSilhouetteAsync(
    {
      name: 'inkwell-silhouette',
      bounds: { minX: b.minX + 40, maxX: b.maxX - 40, minZ: b.minZ + 40, maxZ: b.maxZ - 40 },
      cell: tier === 'lite' || tier === 'low' ? 16 : 10,
      height: inkwellHeight,
      masks,
      land: 0x7e9a56,
      rock: 0xcfc6b0,
      cliff: 0xece5d6,
      sand: 0xe8dcc0,
      forest: grove,
      forestColor: 0x4e6a3c,
      forestHeight: 5,
      sheen: 0.2,
      light: {
        dir: sun,
        sun: [1.0, 0.86, 0.66],
        ambient: [0.62, 0.66, 0.72],
        ground: [0.3, 0.26, 0.22],
        wrap: 0.3,
      },
      ...masses(tier),
    },
    breathe,
  );
}

import { float, max, smoothstep } from 'three/tsl';
import { segmentMaskNode, type TerrainRegions } from '../../terrain/terrain-regions';
import {
  CAMP,
  COURT,
  FRAME,
  OASIS_PATH,
  MESA_PATH,
  QUAY,
  QUAY_LANE,
  SIGNAL_STAIR,
  SQUARE,
  SUN_STAIR,
  SUNSPIRE as S,
  toWorld,
  YARD,
} from './layout';

/**
 * Sunspire's ground (spec S10). The square, the court and the yard are a town's trodden earth; the
 * desert floor, the dunes and the tables' tops are golden sand with wind ripples (`desertSand`); the
 * bake's cliff and rock are red sandstone (`redRock`); the paths are worn earth. The oasis is the
 * bake's grass, and the beach its own pale sand. Written as numbers from the layout.
 */
export const sunspireTerrainRegions: TerrainRegions = (ctx) => {
  const { P, y } = ctx;
  const b = S.bounds;
  const island = smoothstep(b.minX, b.minX + 30, P.x)
    .mul(float(1).sub(smoothstep(b.maxX - 30, b.maxX, P.x)))
    .mul(smoothstep(b.minZ, b.minZ + 30, P.z))
    .mul(float(1).sub(smoothstep(b.maxZ - 30, b.maxZ, P.z)));
  const dx = P.x.sub(FRAME.origin.x);
  const dz = P.z.sub(FRAME.origin.z);
  const u = dx.mul(FRAME.axis.x).add(dz.mul(FRAME.axis.z));
  const v = dx.mul(FRAME.across.x).add(dz.mul(FRAME.across.z));
  /** 1 inside a frame box, easing out over `e` m. */
  const box = (u0: number, u1: number, v0: number, v1: number, e = 6) =>
    smoothstep(u0 - e, u0, u)
      .mul(float(1).sub(smoothstep(u1, u1 + e, u)))
      .mul(smoothstep(v0 - e, v0, v))
      .mul(float(1).sub(smoothstep(v1, v1 + e, v)));
  const pad = (c: { u: number; v: number; halfU: number; halfV: number }, e = 4) =>
    box(c.u - c.halfU, c.u + c.halfU, c.v - c.halfV, c.v + c.halfV, e);
  /** A line of the layout as a band of ground, `r` m to its edge. */
  const band = (pts: readonly { u: number; v: number }[], r: number) =>
    pts
      .slice(1)
      .map((q, i) => {
        const a = pts[i]!;
        const wa = toWorld(a.u, a.v);
        const wb = toWorld(q.u, q.v);
        return segmentMaskNode(wa.x, wa.z, wb.x, wb.z, r, r + 1.4, P);
      })
      .reduce((a, q) => a.max(q));
  // A town's trodden earth: under the paved places, along the lane from the quay to the square, on
  // the quay's apron, and (lighter) over the whole of the town, so its houses stand on worn ground.
  const apron = box(QUAY.u0, QUAY.u1, QUAY.v + 2, QUAY.v + 11, 4);
  const townArea = box(-232, -60, 18, 90, 12).mul(0.5);
  const paved = max(pad(SQUARE), max(pad(COURT), pad(YARD)));
  const town = max(paved, max(max(band(QUAY_LANE, 2.6), apron), townArea)).mul(island);
  // Red sandstone wherever the bake has cliff or rock (the material reads those masks).
  const redRock = island.mul(smoothstep(-3, 0.5, y));
  const camp = float(1).sub(
    smoothstep(CAMP.r - 2, CAMP.r + 2, u.sub(CAMP.u).pow(2).add(v.sub(CAMP.v).pow(2)).sqrt()),
  );
  const paths = max(
    max(band(OASIS_PATH, 2), band(SIGNAL_STAIR, 2)),
    max(max(band(MESA_PATH, 2), band(SUN_STAIR, 2)), camp),
  ).mul(island);
  // The desert floor on all the open ground above the beach (the beach is the bake's own pale sand),
  // off the paved places and the trodden paths.
  const desertSand = island
    .mul(smoothstep(1.5, 3.0, y))
    .mul(float(1).sub(town))
    .mul(float(1).sub(paths.mul(0.85)));
  return { town, paths, desertSand, redRock };
};

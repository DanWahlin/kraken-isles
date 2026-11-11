import { float, max, smoothstep } from 'three/tsl';
import { segmentMaskNode, type TerrainRegions } from '../../terrain/terrain-regions';
import {
  CAMP,
  COURT,
  FRAME,
  OASIS_PATH,
  MESA_PATH,
  SIGNAL_STAIR,
  SQUARE,
  SUN_STAIR,
  SUNSPIRE as S,
  toWorld,
  YARD,
} from './layout';

/**
 * Sunspire's ground (spec S10). The square, the court and the yard are a town's trodden earth; the
 * desert floor, the dunes and the tables' tops are bare pale sand (`campSand`: inland sand is worn
 * earth without it); the bake's cliff and rock are red sandstone (`redRock`); the paths are worn
 * earth. The oasis is the bake's grass. Written as numbers from the layout.
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
  // The paved places: a town's trodden earth under the stalls and the stands.
  const town = max(pad(SQUARE), max(pad(COURT), pad(YARD))).mul(island);
  // Red sandstone wherever the bake has cliff or rock (the material reads those masks).
  const redRock = island.mul(smoothstep(-3, 0.5, y));
  // Bare pale sand on all the open ground above the beach (the beach is the bake's own sand).
  // (Half strength: the worn earth under it warms the pale sand to a desert's golden tan.)
  const campSand = island
    .mul(smoothstep(2.2, 4.5, y))
    .mul(float(1).sub(town))
    .mul(0.5);
  const lines = [OASIS_PATH, SIGNAL_STAIR, MESA_PATH, SUN_STAIR].flatMap((pts) =>
    pts.slice(1).map((q, i) => {
      const a = pts[i]!;
      const wa = toWorld(a.u, a.v);
      const wb = toWorld(q.u, q.v);
      return segmentMaskNode(wa.x, wa.z, wb.x, wb.z, 2, 3.2, P);
    }),
  );
  const camp = float(1).sub(
    smoothstep(CAMP.r - 2, CAMP.r + 2, u.sub(CAMP.u).pow(2).add(v.sub(CAMP.v).pow(2)).sqrt()),
  );
  const paths = max(
    lines.reduce((a, q) => a.max(q)),
    camp,
  ).mul(island);
  return { town, paths, campSand, redRock };
};

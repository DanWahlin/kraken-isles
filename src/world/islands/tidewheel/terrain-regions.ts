import { float, max, smoothstep } from 'three/tsl';
import { segmentMaskNode, type TerrainRegions } from '../../terrain/terrain-regions';
import {
  BANDSTAND,
  BEACH_PATH,
  CLOCK_WALK,
  COURT,
  FRAME,
  LAMP_STAIR,
  LIGHT_WALK,
  QUAY,
  QUAY_LANE,
  SQUARE,
  TIDEWHEEL as S,
  toWorld,
  WORKS,
  WORKS_STAIR,
} from './layout';

/**
 * Tidewheel's ground (spec T12). The terraces, the quay's apron and the paved places are a town's
 * trodden earth; every cliff, wall and riser is young volcanic rock (`lavaRock`); the open ground is
 * black sand and cinder (`blackSand`) with thin turf; the walks are worn earth. Written as numbers
 * from the layout.
 */
export const tidewheelTerrainRegions: TerrainRegions = (ctx) => {
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
  // A town's trodden earth: on the terraces, the quay's apron, the lane and the stairs, and under the
  // paved places.
  const apron = box(QUAY.u0, QUAY.u1, QUAY.v + 2, QUAY.v + 11, 4);
  const paved = [BANDSTAND, SQUARE, WORKS, COURT].map((c) => pad(c)).reduce((a, q) => max(a, q));
  const street = max(band(QUAY_LANE, 2.6), max(band(LAMP_STAIR, 2.6), band(WORKS_STAIR, 2.4)));
  // (The terraces between the houses stay cinder: no pale earth on this island.)
  const town = max(max(paved, street), apron).mul(island);
  const paths = max(band(BEACH_PATH, 1.8), max(band(CLOCK_WALK, 2.2), band(LIGHT_WALK, 2.2))).mul(island);
  // Volcanic rock wherever the bake has cliff or rock above the tide, and black sand on the open
  // ground (the material reads the bake's masks for both).
  const lavaRock = island.mul(smoothstep(-3, 0.5, y));
  const blackSand = island.mul(float(1).sub(town.mul(0.8)));
  return { town, paths, lavaRock, blackSand };
};

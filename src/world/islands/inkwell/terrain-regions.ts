import { float, max, smoothstep } from 'three/tsl';
import { segmentMaskNode, type TerrainRegions } from '../../terrain/terrain-regions';
import {
  COURT,
  DOME_STAIR,
  DRAUGHT,
  FRAME,
  GOSSIP_STAIR,
  INKWELL as S,
  KITE_WALK,
  LOGGIA,
  PLAZA,
  PLAZA_PATHS,
  QUAY,
  QUAY_LANE,
  SQUARE,
  TAVERNA,
  toWorld,
  TOWN,
} from './layout';

/**
 * Inkwell's ground (spec I11). The terraces, the quay's apron and the paved places are a town's
 * trodden earth; every cliff, wall and riser is white chalk (`chalk`); the paths are worn
 * earth; the rest is the bake's turf and its pale beach sand. Written as numbers from the layout.
 */
export const inkwellTerrainRegions: TerrainRegions = (ctx) => {
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
  // A town's trodden earth: on the terraces, the quay's apron, the lane and stair, and under the
  // paved places.
  const apron = box(QUAY.u0, QUAY.u1, QUAY.v + 2, QUAY.v + 11, 4);
  const terraces = box(TOWN.u0, TOWN.u1, TOWN.v0, TOWN.v1, 8).mul(0.7);
  const paved = [TAVERNA, SQUARE, PLAZA, LOGGIA, DRAUGHT, COURT]
    .map((c) => pad(c))
    .reduce((a, q) => max(a, q));
  const street = max(band(QUAY_LANE, 2.6), band(GOSSIP_STAIR, 2.6));
  const town = max(max(paved, street), max(apron, terraces)).mul(island);
  const paths = max(
    PLAZA_PATHS.map((p) => band(p, 2)).reduce((a, q) => a.max(q)),
    max(band(KITE_WALK, 2), band(DOME_STAIR, 2)),
  ).mul(island);
  // White chalk wherever the bake has cliff or rock above the tide (the material reads those masks).
  const chalk = island.mul(smoothstep(-3, 0.5, y));
  return { town, paths, chalk };
};

import { float, max, smoothstep } from 'three/tsl';
import type { TerrainRegions } from '../../terrain/terrain-regions';
import { CLOISTER, FRAME, GUILDCREST as G, KNOLL, PEBBLE_SHORE, SQUARE, YARD } from './layout';
import { PINE_STANDS } from './stands';

/**
 * Guildcrest's ground (spec §3.2, G12: existing keys only). The town, the square, the abbey's knoll
 * and the guildhall yard are lived-in village ground (their lanes and pads are the bake's trodden
 * sand); the moor and the hills are grassy slopes (no cliff colour but on near-sheer faces: the flora
 * palette paints the heather); the pine stands have a forest floor; the pebble shore at the loch's
 * head is bare sand. Written as numbers from the layout.
 */
export const guildcrestTerrainRegions: TerrainRegions = (ctx) => {
  const { P, y } = ctx;
  const b = G.bounds;
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
  const town = box(-240, -60, 12, 96, 10).mul(smoothstep(0.6, 1.6, y));
  const square = box(
    SQUARE.u - SQUARE.halfU,
    SQUARE.u + SQUARE.halfU,
    SQUARE.v - SQUARE.halfV,
    SQUARE.v + SQUARE.halfV,
  );
  const g = CLOISTER.garth / 2 + CLOISTER.walk;
  const abbey = box(KNOLL.u0 - 4, KNOLL.u1 + 10, KNOLL.v0 - 2, KNOLL.v1, 6).max(
    box(CLOISTER.u - g, CLOISTER.u + g, CLOISTER.v - g, CLOISTER.v + g, 2),
  );
  const yard = box(YARD.u - YARD.halfU, YARD.u + YARD.halfU, YARD.v - YARD.halfV, YARD.v + YARD.halfV, 4);
  const villageGround = max(max(town, square), max(abbey, yard)).mul(island);
  // The moor and the hills: every slope above the shore, except where it's built on.
  const grassySlopes = island.mul(smoothstep(2, 6, y)).mul(float(1).sub(villageGround));
  // The pine stands' floor (their trees, vegetation.ts), on the gentle ground.
  const stands = PINE_STANDS.map((s) =>
    float(1).sub(smoothstep(0.7, 1.15, u.sub(s.u).div(s.ru).pow(2).add(v.sub(s.v).div(s.rv).pow(2)))),
  ).reduce((a, b) => a.max(b));
  const forestFloor = stands
    .mul(island)
    .mul(smoothstep(0.82, 0.9, ctx.up))
    .mul(smoothstep(3, 7, y));
  const shore = u.sub(PEBBLE_SHORE.u).pow(2).add(v.sub(PEBBLE_SHORE.v).pow(2)).sqrt();
  const campSand = float(1)
    .sub(smoothstep(PEBBLE_SHORE.r - 4, PEBBLE_SHORE.r + 4, shore))
    .mul(float(1).sub(smoothstep(2.5, 4, y)));
  // Trodden sand over the shore's shingle is worn earth (the lanes, the paths, the pads).
  const paths = island.mul(smoothstep(3, 6, y));
  return { villageGround, paths, grassySlopes, forestFloor, campSand };
};

import { smoothstep } from '../../../util/math';
import type { FloraRules } from '../../flora/types';
import { SUNSPIRE_FLORA_PALETTE } from './flora-palette';
import { sunspireOasis, sunspireTrodden, sunspireWater } from './height';
import { DUNES, toFrame, toWorld, WATER } from './layout';
import { inBuilt } from './town';

const FRAME = { u: 0, v: 0 };
const NORMAL = [0, 1, 0];
/** Where the Weeping Wall's spray wets the ground (m from its foot). */
const SPRAY = 14;
const fallFoot = toWorld(WATER.pool.u + 6, WATER.pool.v + 3);

/**
 * Where Sunspire's flora grows: the part of the island you walk and see close (the port, the oasis,
 * the desert floor between them and round the tables' feet, the dunes' edge). The floor is open
 * ground with sparse dry tufts where marigold and mallow drift; the oasis is green sward with ferns
 * by the water and in the fall's spray; verbena creeps on the dunes' feet. Nothing on the lanes, the
 * pads, the tables' paved tops or in the water.
 */
export const SUNSPIRE_FLORA: FloraRules = {
  palette: SUNSPIRE_FLORA_PALETTE,
  bounds: { ...boundsOf(-260, 260, -220, 180) },
  flowersPerCell: 40,
  bladeDensity: 0.35,
  habitatFill: { meadow: 0.14, forest: 0.3, bank: 0.55, spray: 0.7, dune: 0.22, village: 0.12 },
  habitatAt(x, z, y, masks, field, out) {
    if (y < 1.2) return null;
    if (masks.cliff > 0.3 || masks.rock > 0.6) return null;
    const n = field.normalAt(x, z, NORMAL);
    if (n[1]! < 0.8) return null;
    toFrame(x, z, FRAME);
    const { u, v } = FRAME;
    if (inBuilt(u, v) || sunspireTrodden(u, v) > 0.3) return null;
    const shore = sunspireWater().shoreDistance(x, z, 8);
    if (shore < 0.6) return null;
    const oasis = sunspireOasis(u, v);
    const spray = Math.hypot(x - fallFoot.x, z - fallFoot.z) < SPRAY;
    if (spray || shore < 4 || oasis > 0.35) {
      out.habitat = spray ? 'spray' : shore < 4 ? 'bank' : 'meadow';
      out.kind = 'meadow';
      out.weight = Math.max(masks.grass, 0.5) * (1 - masks.rock * 0.7);
      out.ramp = 0.15;
      return out;
    }
    const dunes = v < DUNES.v1 && u > DUNES.u0 && u < DUNES.u1;
    if (dunes || y < 3.2) {
      // The beach's back and the dunes' feet: creeping verbena, thin.
      if (y < 2.2) return null;
      out.habitat = 'dune';
      out.kind = 'creeper';
      out.weight = 0.3 * smoothstep(2.2, 3.4, y);
      out.ramp = 0.7;
      return out;
    }
    const town = u < -60 && u > -240 && v > 10 && v < 100;
    out.habitat = town ? 'village' : 'meadow';
    // Dry bunchgrass: a tuft here and there on the open floor.
    out.kind = 'seaOats';
    out.weight = town ? 0.18 : 0.26;
    out.ramp = 0.85;
    return out;
  },
};

/** The world box of a frame box (the flora's cells are world-aligned). */
function boundsOf(u0: number, u1: number, v0: number, v1: number) {
  const pts = [toWorld(u0, v0), toWorld(u1, v0), toWorld(u0, v1), toWorld(u1, v1)];
  return {
    minX: Math.min(...pts.map((p) => p.x)),
    maxX: Math.max(...pts.map((p) => p.x)),
    minZ: Math.min(...pts.map((p) => p.z)),
    maxZ: Math.max(...pts.map((p) => p.z)),
  };
}

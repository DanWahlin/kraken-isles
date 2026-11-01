import { smoothstep } from '../../../util/math';
import type { FloraRules } from '../../flora/types';
import { GUILDCREST_FLORA_PALETTE } from './flora-palette';
import { guildcrestTrodden, guildcrestWater } from './height';
import { toFrame, toWorld, WATER } from './layout';
import { inBuilt } from './town';
import { PINE_STANDS } from './stands';

const FRAME = { u: 0, v: 0 };
const NORMAL = [0, 1, 0];
/** Where the linn's spray wets the ground (m from its foot). */
const SPRAY = 18;
const linnFoot = toWorld(WATER.linnPool.u, WATER.linnPool.v);

function inStand(u: number, v: number): boolean {
  for (const s of PINE_STANDS) if (((u - s.u) / s.ru) ** 2 + ((v - s.v) / s.rv) ** 2 < 1) return true;
  return false;
}

/**
 * Where Guildcrest's flora grows: the part of the island you walk and see close (the town, the glen,
 * the knoll, the ridge and the moor round them). The moor is open ground where the heather and the
 * gorse drift; the town's greens and the cloister's garth are short sward with harebells; ferns under
 * the pines, by the burns and in the linn's spray; creeping blades on the shingle by the loch. Nothing on the
 * lanes, the pads or in the water.
 */
export const GUILDCREST_FLORA: FloraRules = {
  palette: GUILDCREST_FLORA_PALETTE,
  bounds: { minX: 5640, maxX: 6260, minZ: -40, maxZ: 420 },
  flowersPerCell: 64,
  bladeDensity: 0.7,
  habitatFill: { meadow: 0.3, forest: 0.4, bank: 0.55, spray: 0.7, dune: 0.4, village: 0.25 },
  habitatAt(x, z, y, masks, field, out) {
    if (y < 0.7) return null;
    if (masks.cliff > 0.3 || masks.rock > 0.6) return null;
    const n = field.normalAt(x, z, NORMAL);
    if (n[1]! < 0.74) return null;
    toFrame(x, z, FRAME);
    const { u, v } = FRAME;
    if (inBuilt(u, v) || guildcrestTrodden(u, v) > 0.3) return null;
    const shore = guildcrestWater().shoreDistance(x, z, 8);
    if (shore < 0.7) return null;
    if (masks.sand > 0.5) {
      if (y < 1.6) return null;
      out.habitat = 'dune';
      out.kind = 'creeper';
      out.weight = 0.4 * smoothstep(1.6, 2.6, y);
      out.ramp = 0.55;
      return out;
    }
    const spray = Math.hypot(x - linnFoot.x, z - linnFoot.z) < SPRAY;
    const town = u < -40 && u > -240 && v > 10 && v < 100;
    const garth = Math.abs(u - 22) < 18 && Math.abs(v - 130) < 18;
    const forest = inStand(u, v);
    out.habitat = spray
      ? 'spray'
      : shore < 5
        ? 'bank'
        : forest
          ? 'forest'
          : town || garth
            ? 'village'
            : 'meadow';
    out.kind = forest ? 'moss' : 'meadow';
    // The moor's sward is short and patchy over the heather; the greens and the glen are fuller.
    out.weight = masks.grass * (1 - masks.rock * 0.7) * (town || garth ? 1.1 : forest ? 0.6 : 0.85);
    // Cool and green low down; drier and more straw-coloured up on the moor.
    out.ramp = town || garth ? 0.4 : forest ? 0.15 : 0.4 + smoothstep(30, 90, y) * 0.3;
    return out;
  },
};

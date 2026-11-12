import { smoothstep } from '../../../util/math';
import type { FloraRules } from '../../flora/types';
import { frameBounds } from '../frame';
import { TIDEWHEEL_FLORA_PALETTE } from './flora-palette';
import { tidewheelTown, tidewheelTrodden } from './height';
import { FRAME_KIT, toFrame } from './layout';
import { inBuilt } from './town';

const FRAME = { u: 0, v: 0 };
const NORMAL = [0, 1, 0];

/**
 * Where Tidewheel's flora grows: the part of the island you walk and see close (the port, the crater's
 * floor behind it, the ledges, the bay's head and its south shore). The floor is thin summer turf on
 * black ground with fireweed and yarrow in drifts; the talus under the wall is rough grass with
 * broom; sea thrift creeps on the black beach's back; the terraces grow tufts at the walls' feet.
 * Nothing on the lanes, the pads or the paved places.
 */
export const TIDEWHEEL_FLORA: FloraRules = {
  palette: TIDEWHEEL_FLORA_PALETTE,
  bounds: frameBounds(FRAME_KIT, -440, -20, -260, 210),
  flowersPerCell: 30,
  bladeDensity: 0.36,
  habitatFill: { meadow: 0.5, forest: 0.3, bank: 0.45, spray: 0.7, dune: 0.22, village: 0.14 },
  habitatAt(x, z, y, masks, field, out) {
    if (y < 1.2) return null;
    if (masks.cliff > 0.3 || masks.rock > 0.6) return null;
    const n = field.normalAt(x, z, NORMAL);
    if (n[1]! < 0.78) return null;
    toFrame(x, z, FRAME);
    const { u, v } = FRAME;
    if (inBuilt(u, v) || tidewheelTrodden(u, v) > 0.3) return null;
    if (y < 3.2) {
      // The beach's back: creeping sea thrift, thin.
      if (y < 2.2) return null;
      out.habitat = 'dune';
      out.kind = 'creeper';
      out.weight = 0.3 * smoothstep(2.2, 3.2, y);
      out.ramp = 0.7;
      return out;
    }
    if (tidewheelTown(u, v) > 0.5) {
      out.habitat = 'village';
      out.kind = 'seaOats';
      out.weight = 0.16;
      out.ramp = 0.8;
      return out;
    }
    const steep = n[1]! < 0.93;
    out.habitat = steep ? 'bank' : 'meadow';
    out.kind = 'meadow';
    out.weight = Math.max(masks.grass, 0.4) * (1 - masks.rock * 0.7);
    out.ramp = steep ? 0.55 : 0.25;
    return out;
  },
};

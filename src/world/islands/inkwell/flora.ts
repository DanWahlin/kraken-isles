import { smoothstep } from '../../../util/math';
import type { FloraRules } from '../../flora/types';
import { frameBounds } from '../frame';
import { INKWELL_FLORA_PALETTE } from './flora-palette';
import { inkwellTown, inkwellTrodden } from './height';
import { FRAME_KIT, toFrame } from './layout';
import { inBuilt } from './town';

const FRAME = { u: 0, v: 0 };
const NORMAL = [0, 1, 0];

/**
 * Where Inkwell's flora grows: the part of the island you walk and see close (the port, the bluff's
 * top from the Plaza to the Dome, the skirts under its wall, the valley by the cove, the cove's beach).
 * The bluff's top and the valley are summer meadow with poppies and chamomile; the steeper skirts are
 * rough grass with broom; lavender creeps on the beach's back; the terraces grow tufts at the walls'
 * feet. Nothing on the lanes, the pads or the paved tops.
 */
export const INKWELL_FLORA: FloraRules = {
  palette: INKWELL_FLORA_PALETTE,
  bounds: frameBounds(FRAME_KIT, -270, 260, -200, 200),
  flowersPerCell: 46,
  bladeDensity: 0.6,
  habitatFill: { meadow: 0.5, forest: 0.3, bank: 0.45, spray: 0.7, dune: 0.22, village: 0.14 },
  habitatAt(x, z, y, masks, field, out) {
    if (y < 1.2) return null;
    if (masks.cliff > 0.3 || masks.rock > 0.6) return null;
    const n = field.normalAt(x, z, NORMAL);
    if (n[1]! < 0.78) return null;
    toFrame(x, z, FRAME);
    const { u, v } = FRAME;
    if (inBuilt(u, v) || inkwellTrodden(u, v) > 0.3) return null;
    if (y < 3.2) {
      // The beach's back: creeping lavender, thin.
      if (y < 2.2) return null;
      out.habitat = 'dune';
      out.kind = 'creeper';
      out.weight = 0.3 * smoothstep(2.2, 3.2, y);
      out.ramp = 0.7;
      return out;
    }
    if (inkwellTown(u, v) > 0.5) {
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

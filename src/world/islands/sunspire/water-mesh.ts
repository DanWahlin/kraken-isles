import type { WaterStrips } from '../../sites/water';
import { createMeridianWaterMesh } from '../meridian-water-mesh';
import { toWorld, WATER } from './layout';
import { sunspireHeight, sunspireWater } from './height';

/**
 * Sunspire's fresh water as one static mesh in the shared flowing-water material (no new program):
 * the cistern, the run to the lip, the oasis pool and the falaj as natural water over the drawn
 * ground (`ground`: the tier's own height field), the Weeping Wall in the falling-water look.
 */
export function createSunspireWaterMesh(
  ground: (x: number, z: number) => number = sunspireHeight,
): WaterStrips {
  const foot = toWorld(WATER.pool.u + 6, WATER.pool.v + 3);
  return createMeridianWaterMesh(sunspireWater(), {
    name: 'sunspire fresh water',
    maxQuads: 2000,
    natural: {
      ground,
      // Where the Weeping Wall lands in the pool.
      plunges: [{ x: foot.x, z: foot.z, r: 6 }],
    },
  });
}

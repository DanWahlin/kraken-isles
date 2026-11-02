import type { WaterStrips } from '../../sites/water';
import { createMeridianWaterMesh } from '../meridian-water-mesh';
import { toWorld, WATER } from './layout';
import { guildcrestHeight, guildcrestWater } from './height';

/**
 * Guildcrest's fresh water as one static mesh in the shared flowing-water material (no new program):
 * the lochan, the burns and the linn's pool as natural water over the drawn ground (`ground`: the
 * tier's own height field), the Copyist's Linn down its crag in the falling-water look.
 */
export function createGuildcrestWaterMesh(
  ground: (x: number, z: number) => number = guildcrestHeight,
): WaterStrips {
  const foot = toWorld(WATER.linnPool.u + 3, WATER.linnPool.v + 1.5);
  return createMeridianWaterMesh(guildcrestWater(), {
    name: 'guildcrest fresh water',
    maxQuads: 2400,
    natural: {
      ground,
      // Where the linn lands in its pool.
      plunges: [{ x: foot.x, z: foot.z, r: 6 }],
    },
  });
}

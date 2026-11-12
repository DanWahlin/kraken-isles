import type { IslandStreamCreateContext } from '../island-stream';
import { createStreamedIsland, type StreamedIsland } from '../streamed-island';
import { SUNSPIRE_FLORA } from './flora';
import { sunspireTerrainWater } from './height';
import { createSunspireWorldAsync, type SunspireWorld } from './index';
import { SUNSPIRE as S } from './layout';
import { createSunspireSilhouette } from './silhouette';
import { SUNSPIRE_PLANT_LOOK } from './vegetation';

/** Sunspire's stream (its registry entry holds its ranges and outline): its world is the port, the mesa and the Sunspire. */
export type SunspireStream = StreamedIsland<SunspireWorld>;

/**
 * Sunspire streamed in on demand, like Guildcrest (skill §3, §4): its baked terrain, coast foam (surf
 * on the red sea cliffs' feet), the port, the caravanserai, the bazaar, the oasis camp, the Low Mesa's
 * court and yard, the Sunspire, and its plants arrive hidden, and the game's flow warms them before
 * they're first drawn. Until then (and while the camera's far) its silhouette stands on the horizon.
 */
export function createSunspireStream(ctx: IslandStreamCreateContext): SunspireStream {
  return createStreamedIsland<SunspireWorld>(ctx, {
    silhouette: createSunspireSilhouette,
    mood: S.mood,
    terrain: () => ({
      // Its far levels keep under the cistern, the fall and the pool; the whole island is one block
      // from the sea.
      freshWater: sunspireTerrainWater(),
      prefilter: S.terrain.prefilter,
      maxMergedTriangles: S.terrain.maxMergedTriangles,
      morphFrames: S.terrain.morphFrames,
      seabed: S.terrain.seabed,
    }),
    // Surf on the north-east's and south-east's cliff feet; the cove is sheltered.
    foam: { maxDistance: 1100, exposure: 1 },
    world: createSunspireWorldAsync,
    flora: SUNSPIRE_FLORA,
    plantLook: SUNSPIRE_PLANT_LOOK,
    // Gulls over the cove, and raptors high over the tables.
    flocks: (world) => world.birds,
    onFlock(world, flock, birds) {
      if (flock.kind) world.raptors = birds;
    },
  });
}

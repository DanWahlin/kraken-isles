import type { IslandStreamCreateContext } from '../island-stream';
import { createStreamedIsland, type StreamedIsland } from '../streamed-island';
import { TIDEWHEEL_FLORA } from './flora';
import { createTidewheelWorldAsync, type TidewheelWorld } from './index';
import { TIDEWHEEL as S } from './layout';
import { createTidewheelSilhouette } from './silhouette';
import { TIDEWHEEL_PLANT_LOOK } from './vegetation';

/** Tidewheel's stream (its registry entry holds its ranges and outline): its world is the port, the ledges and the Lighthouse. */
export type TidewheelStream = StreamedIsland<TidewheelWorld>;

/**
 * Tidewheel streamed in on demand, like Inkwell (skill §3, §4): its baked terrain, coast foam (surf
 * on the ring's outer foot; the bay is sheltered), the port and its terraces, the Wheel Works, the
 * Clock Court, the Lighthouse, the Tide Wheel, and its plants arrive hidden, and the game's flow
 * warms them before they're first drawn. Until then (and while the camera's far) its silhouette
 * stands on the horizon.
 */
export function createTidewheelStream(ctx: IslandStreamCreateContext): TidewheelStream {
  return createStreamedIsland<TidewheelWorld>(ctx, {
    silhouette: createTidewheelSilhouette,
    mood: S.mood,
    terrain: () => ({
      // The whole island is one block from the sea.
      prefilter: S.terrain.prefilter,
      maxMergedTriangles: S.terrain.maxMergedTriangles,
      morphFrames: S.terrain.morphFrames,
      seabed: S.terrain.seabed,
    }),
    // Surf on the ring's outer foot; the bay is sheltered.
    foam: { maxDistance: 1100, exposure: 1 },
    world: createTidewheelWorldAsync,
    flora: TIDEWHEEL_FLORA,
    plantLook: TIDEWHEEL_PLANT_LOOK,
    // Gulls over the bay, petrels round the ring's top.
    flocks: (world) => world.birds,
  });
}

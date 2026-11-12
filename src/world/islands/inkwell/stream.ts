import type { IslandStreamCreateContext } from '../island-stream';
import { createStreamedIsland, type StreamedIsland } from '../streamed-island';
import { INKWELL_FLORA } from './flora';
import { createInkwellWorldAsync, type InkwellWorld } from './index';
import { INKWELL as S } from './layout';
import { createInkwellSilhouette } from './silhouette';
import { INKWELL_PLANT_LOOK } from './vegetation';

/** Inkwell's stream (its registry entry holds its ranges and outline): its world is the port, the bluff and the Dome. */
export type InkwellStream = StreamedIsland<InkwellWorld>;

/**
 * Inkwell streamed in on demand, like Sunspire (skill §3, §4): its baked terrain, coast foam (surf on
 * the white cliffs' feet and the stacks), the port and its terraces, the Plaza, the Loggia, the
 * Draughting Terrace, the Chart Court, the Dome, and its plants arrive hidden, and the game's flow
 * warms them before they're first drawn. Until then (and while the camera's far) its silhouette stands
 * on the horizon.
 */
export function createInkwellStream(ctx: IslandStreamCreateContext): InkwellStream {
  return createStreamedIsland<InkwellWorld>(ctx, {
    silhouette: createInkwellSilhouette,
    mood: S.mood,
    terrain: () => ({
      // The whole island is one block from the sea.
      prefilter: S.terrain.prefilter,
      maxMergedTriangles: S.terrain.maxMergedTriangles,
      morphFrames: S.terrain.morphFrames,
      seabed: S.terrain.seabed,
    }),
    // Surf on the cliff's feet and round the stacks; the cove is sheltered.
    foam: { maxDistance: 1100, exposure: 1 },
    world: createInkwellWorldAsync,
    flora: INKWELL_FLORA,
    plantLook: INKWELL_PLANT_LOOK,
    // Gulls over the cove and along the cliff.
    flocks: (world) => world.birds,
  });
}

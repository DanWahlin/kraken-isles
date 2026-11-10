import type { IslandStreamCreateContext } from '../island-stream';
import { createStreamedIsland, type StreamedIsland } from '../streamed-island';
import { GUILDCREST_FLORA } from './flora';
import { guildcrestTerrainWater } from './height';
import { createGuildcrestWorldAsync, type GuildcrestWorld } from './index';
import { GUILDCREST as G } from './layout';
import { createGuildcrestSilhouette } from './silhouette';
import { GUILDCREST_PLANT_LOOK } from './vegetation';

/** Guildcrest's stream (its registry entry holds its ranges and outline): its world is the town, abbey and ridge. */
export type GuildcrestStream = StreamedIsland<GuildcrestWorld>;

/**
 * Guildcrest streamed in on demand, like Keelhaven (skill §3, §4): its baked terrain, coast foam (surf
 * on the north-east cliffs' feet), the town, the abbey, the ridge and its mills, the burn and the linn,
 * and its plants arrive hidden, and the game's flow warms them before they're first drawn. Until then
 * (and while the camera's far) its silhouette stands on the horizon.
 */
export function createGuildcrestStream(ctx: IslandStreamCreateContext): GuildcrestStream {
  return createStreamedIsland<GuildcrestWorld>(ctx, {
    silhouette: createGuildcrestSilhouette,
    mood: G.mood,
    terrain: () => ({
      // Its far levels keep under the burn, the linn and the lochan; the whole island is one block
      // from the sea.
      freshWater: guildcrestTerrainWater(),
      prefilter: G.terrain.prefilter,
      maxMergedTriangles: G.terrain.maxMergedTriangles,
      morphFrames: G.terrain.morphFrames,
      seabed: G.terrain.seabed,
    }),
    // Surf on the north-east's cliff feet; the loch is sheltered.
    foam: { maxDistance: 1100, exposure: 1 },
    world: createGuildcrestWorldAsync,
    flora: GUILDCREST_FLORA,
    plantLook: GUILDCREST_PLANT_LOOK,
    // Gulls over the loch, and swifts round the bell tower with perches on its belfry's ledges.
    flocks: (world) => world.birds,
    onFlock(world, flock, birds) {
      if (flock.kind) world.swifts = birds;
    },
  });
}

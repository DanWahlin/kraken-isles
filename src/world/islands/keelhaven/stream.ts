import { wreckWaterline } from '../../wreck/wreck';
import type { IslandStreamCreateContext } from '../island-stream';
import { createStreamedIsland, type StreamedIsland } from '../streamed-island';
import { worksFoamSkip, worksSkin } from './apron';
import { KEELHAVEN_FLORA } from './flora';
import { keelhavenTerrainWater } from './height';
import { createKeelhavenWorldAsync, type KeelhavenWorld } from './index';
import { KEELHAVEN as K } from './layout';
import { createKeelhavenSilhouette } from './silhouette';
import { KEELHAVEN_PLANT_LOOK } from './vegetation';
import { worksApronSteps, worksPin, worksSeaFloor } from './works';
import { KEELHAVEN_WRECKS } from './wrecks';

/** Keelhaven's stream (its registry entry holds its ranges and outline): its world is the town and works. */
export type KeelhavenStream = StreamedIsland<KeelhavenWorld>;

/**
 * Keelhaven streamed in on demand, like Thousand-Bough (skill §3): its baked terrain, coast foam (with
 * surf on the exposed cliff feet and a wash round each wreck), the town, the shipyard, the falls and
 * its plants arrive hidden, and the game's flow warms them before they're first drawn. Until then (and
 * while the camera's far) its silhouette stands on the horizon.
 */
export function createKeelhavenStream(ctx: IslandStreamCreateContext): KeelhavenStream {
  return createStreamedIsland<KeelhavenWorld>(ctx, {
    silhouette: createKeelhavenSilhouette,
    mood: K.mood,
    async terrain(breathe) {
      // The works' apron (made once): a skin of ground over the ramp the pinned lock floors make.
      const apronSteps = worksApronSteps();
      let apron = apronSteps.next();
      while (!apron.done) {
        await breathe();
        apron = apronSteps.next();
      }
      return {
        // Its far levels keep under the river and the falls; its tall fluted walls take prefiltered
        // coarse levels, and the whole island is one block from the sea.
        freshWater: keelhavenTerrainWater(),
        prefilter: K.terrain.prefilter,
        maxMergedTriangles: K.terrain.maxMergedTriangles,
        morphFrames: K.terrain.morphFrames,
        seabed: K.terrain.seabed,
        // Every level keeps the works' floors and pads level, and the apron covers the ramp between.
        pin: worksPin,
        skin: worksSkin(apron.value),
      };
    },
    foam: {
      maxDistance: 1100,
      // Surf on the outer coast's cliff feet, and a wash round each wreck on the reef.
      exposure: 1,
      rings: KEELHAVEN_WRECKS.map((d) => wreckWaterline(d.pose)),
      // None along the works' walls (the cut's water is sheltered).
      skip: worksFoamSkip,
    },
    // The ocean reads the cut's floor (its sea is deep right to its walls).
    seaFloor: worksSeaFloor,
    world: createKeelhavenWorldAsync,
    flora: KEELHAVEN_FLORA,
    plantLook: KEELHAVEN_PLANT_LOOK,
    // Gulls over the harbour, and over the reef with perches on the standing wreck's masts.
    flocks: (world) => world.birds,
  });
}

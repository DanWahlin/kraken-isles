import { Vector3 } from 'three/webgpu';
import { coarserRocksOnLite, singlePassWaterOnLite } from '../island-parts';
import { createMeridianTownAsync, type MeridianTownSystem } from '../meridian-town';
import { meridianTownPlants } from '../meridian-town/plantings';
import type { CameraBlockerBox } from '../terrain/camera-blockers';
import type { PlantInstance } from '../vegetation/types';
import type { IslandStreamCreateContext } from './island-stream';
import {
  MERIDIAN,
  createMeridianRocks,
  meridianNaturalWater,
  meridianRockCameraBlockersSliced,
  meridianRockShipObstacles,
  meridianWater,
} from './meridian';
import { MERIDIAN_FLORA } from './meridian-flora';
import { meridianPlantsSliced } from './meridian-plants';
import { createMeridianSilhouette } from './meridian-silhouette';
import { createMeridianWaterMesh } from './meridian-water-mesh';
import { SMALL_ROCKS } from './stream-stones';
import { createStreamedIsland, type StreamedIsland, type StreamedWorld } from './streamed-island';

/**
 * Port Meridian's world as its stream builds it: the town, and what rides with it (the camera-only
 * blockers of its coastal rocks, the rocks' obstacles for the ship, and the hills' plants).
 */
export interface MeridianWorld extends StreamedWorld {
  /** The town: its walks, anchors, lighthouse, lift and mooring lines. */
  readonly town: MeridianTownSystem;
  /** Camera-only blockers for its coastal rocks, built in slices before the town. */
  readonly rockCameraBlockers: CameraBlockerBox[];
}

/** Port Meridian's stream (its registry entry, src/islands/meridian.ts, holds its ranges and outline). */
export type MeridianStream = StreamedIsland<MeridianWorld>;

/**
 * Port Meridian streamed in on demand and freed again once you've left it (issue 232; PLAN §13.3):
 * its baked terrain, water, foam, town, plants and gulls arrive hidden, and the game's flow warms
 * them before they're first drawn. Until then (and while the camera's far) its silhouette stands on
 * the horizon.
 */
export function createMeridianStream(ctx: IslandStreamCreateContext): MeridianStream {
  return createStreamedIsland<MeridianWorld>(ctx, {
    silhouette: createMeridianSilhouette,
    // Its far shape draws from any height (the opening's dive and the arrivals look down on it).
    silhouetteFromAbove: true,
    terrain: () => ({
      createRocks: createMeridianRocks,
      // Its far levels keep under the brook, the lake and the pools (no stream hidden in the distance).
      freshWater: meridianWater(),
    }),
    async afterTerrain(terrain) {
      await coarserRocksOnLite(terrain.group, ctx.tier);
      // The tarn, cascade, brook, lake and outflow ride with the terrain (shown and hidden with it), as
      // natural water over the tier's drawn ground.
      const ground = terrain.heightField;
      const water = createMeridianWaterMesh(meridianWater(), {
        maxQuads: 2400,
        natural: meridianNaturalWater((x, z) => ground.heightAt(x, z), SMALL_ROCKS[ctx.tier.tier]),
      });
      terrain.group.add(water.mesh);
      singlePassWaterOnLite(water.mesh, ctx.tier);
      return () => water.dispose();
    },
    foam: { maxDistance: 1100 },
    async world({ tier, heightField, kit }, breathe) {
      const blockers = meridianRockCameraBlockersSliced(heightField);
      let step = blockers.next();
      while (!step.done) {
        await breathe();
        step = blockers.next();
      }
      const town = await createMeridianTownAsync({ tier, heightField, kit }, breathe);
      return {
        town,
        group: town.group,
        rockCameraBlockers: step.value,
        shipObstacles: () => [...town.shipObstacles, ...meridianRockShipObstacles(heightField)],
        // Its plants (hills and town) as their own vegetation batches, shown with the island.
        async plants(breathe) {
          const flora: PlantInstance[] = [];
          const steps = meridianPlantsSliced(tier.tier);
          let r = steps.next();
          while (!r.done) {
            await breathe();
            r = steps.next();
          }
          flora.push(...r.value, ...meridianTownPlants(tier.tier));
          return flora;
        },
        update: (dt, t, camera) => town.update(dt, t, camera),
        dispose: () => town.dispose(),
      };
    },
    // Low draws its cached shadow map for the town (engine/quality.ts `islandsTakeSunShadows`).
    worldKeepsSunShadows: true,
    flora: MERIDIAN_FLORA,
    // Gulls wheeling over Meridian's harbour and the mole, like Anchorage's.
    flocks: () => [
      {
        center: new Vector3(MERIDIAN.harbor.center.x + 30, 0, MERIDIAN.harbor.center.z - 40),
        radius: 170,
        seed: 0x3e51d,
      },
    ],
  });
}

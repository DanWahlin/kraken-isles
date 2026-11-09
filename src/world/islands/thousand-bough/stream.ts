import { Vector3 } from 'three/webgpu';
import type { TierSettings } from '../../../engine/quality';
import { loadLodSimplifier } from '../../characters/character-lod';
import { LITE_ROCK_ERROR, simplifyInPlace } from '../../village/chunks';
import type { IslandStreamCreateContext } from '../island-stream';
import { SMALL_ROCKS } from '../stream-stones';
import { createStreamedIsland, type StreamedIsland } from '../streamed-island';
import { THOUSAND_BOUGH_FLORA } from './flora';
import { thousandBoughWater } from './height';
import { createThousandBoughAsync, type ThousandBoughWorld } from './index';
import { THOUSAND_BOUGH as TB } from './layout';
import { createThousandBoughRocks, type ThousandBoughRocks } from './rocks';
import { createThousandBoughSilhouette } from './tree/silhouette';

/** The boulders cast the sun's shadow on High and Ultra (Low and Medium spend those triangles elsewhere). */
const ROCK_SHADOWS = (tier: TierSettings['tier']) => tier === 'high' || tier === 'ultra';

/** Thousand-Bough's stream (its registry entry holds its ranges and outline): its world is the tree village. */
export type ThousandBoughStream = StreamedIsland<ThousandBoughWorld>;

/**
 * Thousand-Bough Isle streamed in on demand, like Port Meridian (skill §3): its baked terrain, coast
 * foam, the tree village and its plants arrive hidden, and the game's flow warms them before they're
 * first drawn. Until then (and while the camera's far) its silhouette stands on the horizon.
 */
export function createThousandBoughStream(ctx: IslandStreamCreateContext): ThousandBoughStream {
  const { tier } = ctx;
  // The island's own boulders and the Spire ride with the terrain (shown and warmed with it): each
  // load makes them with its terrain, and its world is built round them.
  let rocks: ThousandBoughRocks | null = null;
  return createStreamedIsland<ThousandBoughWorld>(ctx, {
    silhouette: createThousandBoughSilhouette,
    mood: TB.mood,
    terrain() {
      rocks = null;
      return {
        // Its far levels keep under the streams and the pools (no stream hidden in the distance).
        freshWater: thousandBoughWater(),
        createRocks: (hf) =>
          (rocks = createThousandBoughRocks(hf, undefined, SMALL_ROCKS[tier.tier], ROCK_SHADOWS(tier.tier)))
            .group,
      };
    },
    async afterTerrain() {
      // Lite's rocks (the boulders, the cave's roof and the flume's stones share their shapes) take
      // the coarser shape the other islands' loose rocks have there. Before anything draws them, so
      // nothing uploads twice.
      const shapes = rocks?.flumeStones.geometries ?? [];
      const simplify = tier.tier === 'lite' && shapes.length ? await loadLodSimplifier() : null;
      if (simplify) for (const g of shapes) simplifyInPlace(g, simplify, LITE_ROCK_ERROR);
    },
    foam: { maxDistance: 1100 },
    world: (parts, breathe) => createThousandBoughAsync({ ...parts, rocks }, breathe),
    flora: THOUSAND_BOUGH_FLORA,
    flocks: () => [{ center: new Vector3(TB.tree.x - 30, 0, TB.tree.z + 60), radius: 200, seed: 0x7b0b9 }],
  });
}

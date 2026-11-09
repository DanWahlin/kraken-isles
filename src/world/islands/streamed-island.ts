import { Group, type Camera, type Mesh, type Object3D, type Vector3 } from 'three/webgpu';
import type { CircleObstacle, Tier } from '../contracts';
import { FarCull } from '../far-cull';
import type { FloraRules } from '../flora/types';
import {
  addIslandBirds,
  addIslandGround,
  addIslandPlants,
  disposeTree,
  removeIslandGround,
} from '../island-parts';
import type { BirdsSystem, CreateBirdsOptions } from '../life/birds';
import { skipSunShadows } from '../sky/cached-sun-shadow';
import { applyIslandMood, resetMood, type IslandMood } from '../sky/mood';
import { freeInSlices, StreamLifecycle } from '../stream-lifecycle';
import { loadTerrainPack } from '../terrain/bake';
import { createCoastFoam, type CoastFoamOptions } from '../terrain/coast-foam';
import { createTerrainAsync, type CreatedTerrain, type CreateTerrainOptions } from '../terrain/terrain-mesh';
import type { PlantInstance, PlantPatchLook, VegetationPatch } from '../vegetation/types';
import { loadVillageKit, type VillageKit } from '../village/kit';
import { createIslandDepthTile } from './depth-tile';
import { footprintDistance } from './footprint';
import type { IslandStream, IslandStreamCreateContext } from './island-stream';
import { SilhouetteSwap } from './silhouette-swap';

/** No plant colliders (the island's plants aren't in). */
const NO_COLLIDERS: readonly CircleObstacle[] = [];

/** How far an island's air reaches when its registry entry doesn't say (`IslandEntry.skyReach`). */
const DEFAULT_SKY_REACH = { reach: 1300, full: 800 };

/** What a streamed island's world (its town, village or works) gives the stream that builds it. */
export interface StreamedWorld {
  readonly group: Group;
  /** Its quays, piles and rocks, for the ship. */
  shipObstacles(): CircleObstacle[];
  /** Its plants, built a slice at a time, for `vegetation.addPlants`. */
  plants(breathe: () => Promise<void>): Promise<PlantInstance[]>;
  /** Picks levels of detail for the camera (no allocation). */
  frame(camera: Camera): void;
  update(dt: number, t: number): void;
  dispose(): void;
}

/** A flock over a streamed island (`addIslandBirds`). */
export interface IslandFlock {
  center: Vector3;
  radius: number;
  seed: number;
  /** Where its birds may land. */
  perches?: readonly Vector3[];
  /** A flock of its own kind (smaller, faster, darker, its own count). */
  kind?: Pick<CreateBirdsOptions, 'scale' | 'altitude' | 'speed' | 'count' | 'lightness'>;
}

/** What an island's world is built on: the tier, its terrain's height field and the village kit. */
export interface StreamedWorldParts {
  tier: IslandStreamCreateContext['tier'];
  heightField: CreatedTerrain['heightField'];
  kit: VillageKit;
}

/**
 * What is an island's own in its stream; everything else (the order things arrive in, what a failed
 * or abandoned load takes back, showing and hiding by range, the warm-up's hold, freeing) is
 * `createStreamedIsland`'s, the same for every island.
 */
export interface StreamedIslandSpec<W extends StreamedWorld> {
  /** The far shape that stands on the horizon until the island's own ground is drawn. */
  silhouette(tier: Tier, breathe: () => Promise<void>): { group: Group; ready: Promise<void> };
  /** Its air (haze, tint, fill, exposure), eased in with its light as the camera nears. */
  mood: IslandMood;
  /**
   * Its terrain's own options, on each load. It may make something first, a slice a breath (an apron
   * its terrain is skinned with); the stream checks it's still wanted before it builds the terrain.
   */
  terrain(breathe: () => Promise<void>): TerrainPart | Promise<TerrainPart>;
  /** Work on the built terrain before anything draws it (so nothing uploads twice). */
  afterTerrain?(terrain: CreatedTerrain): Promise<void>;
  /** Its coast foam: how far it shows, surf on exposed feet, washes round wrecks, shores without any. */
  foam: CoastFoamOptions;
  /** A sea floor the bake doesn't hold, for the ocean's depth colour (a cut that's deep to its walls). */
  seaFloor?: (x: number, z: number) => number | null;
  /** Builds its world on the terrain, a slice a breath. */
  world(parts: StreamedWorldParts, breathe: () => Promise<void>): Promise<W>;
  /** Its plants' rules, and how they're drawn if not as every island's. */
  flora: FloraRules;
  plantLook?: PlantPatchLook;
  /** Its flocks, and anything the world keeps of one (a flock it steers itself). */
  flocks(world: W): readonly IslandFlock[];
  onFlock?(world: W, flock: IslandFlock, birds: BirdsSystem): void;
}

/** An island's own terrain options: the stream gives the tier, the bake, the name and the cloud shadow. */
export type TerrainPart = Omit<CreateTerrainOptions, 'tier' | 'data' | 'name' | 'cloudShadowNode'>;

/** A streamed island's stream; `system` is its world (the same as `world`), null until it's in. */
export interface StreamedIsland<W extends StreamedWorld> extends IslandStream<W> {
  readonly system: W | null;
}

/**
 * An island streamed in on demand (PLAN §13.3, skill §3): its baked terrain, coast foam, world and
 * plants arrive hidden, and the game's flow warms them before they're first drawn. Until then (and
 * while the camera's far) its silhouette stands on the horizon. Its registry entry (`ctx.island`)
 * holds its id (its pack's folder and its parts' names), ranges, outline, centre and light's reach;
 * `spec` holds what only this island does.
 */
export function createStreamedIsland<W extends StreamedWorld>(
  ctx: IslandStreamCreateContext,
  spec: StreamedIslandSpec<W>,
): StreamedIsland<W> {
  const { scene, tier } = ctx;
  const { id, ranges, footprint, center } = ctx.island;
  const far = ctx.disabled
    ? { group: new Group(), ready: Promise.resolve() }
    : spec.silhouette(tier.tier, ctx.breathe);
  const silhouette = far.group;
  scene.add(silhouette);
  let disposed = false;
  let held = false;
  const swap = new SilhouetteSwap(ranges.show);
  let plants: VegetationPatch | null = null;
  const flocks: BirdsSystem[] = [];
  let obstacles: CircleObstacle[] = [];
  let priority: RequestPriority = 'auto';
  // Its own floor for the ocean's depth colour (its shallows), lent while it's in memory.
  const depth = ctx.island.stream?.depthTile ? createIslandDepthTile(id) : null;
  const detail = new FarCull(center.x, center.z, ranges.detail, tier.detailCullRatio);

  const buildParts = async (): Promise<W | null> => {
    // The island's course data (its chapter part) loads with its terrain, at the same priority.
    const [data] = await Promise.all([
      loadTerrainPack(`${ctx.packBase}/${id}/terrain`, priority),
      ctx.courseData?.(priority),
    ]);
    if (disposed) return null;
    const part = await spec.terrain(ctx.breathe);
    if (disposed) return null;
    const terrain = await createTerrainAsync(
      { ...part, tier, data, name: `${id}-terrain`, cloudShadowNode: ctx.cloudShadowNode },
      ctx.breathe,
    );
    // Owned from here: a failure later takes it back (teardown).
    self.terrain = terrain;
    await spec.afterTerrain?.(terrain);
    await ctx.breathe();
    if (ctx.skipShadows) skipSunShadows(terrain.group);
    const foam = createCoastFoam(data, terrain.heightField, spec.foam);
    self.foam = foam;
    // The ocean reads the island's floor.
    await depth?.build(data, ctx.breathe, spec.seaFloor);
    if (disposed) {
      depth?.drop();
      return null;
    }
    addIslandGround(ctx, data, terrain, foam);
    self.ready = true;
    const kit = await loadVillageKit();
    if (disposed) return null;
    const system = await spec.world({ tier, heightField: terrain.heightField, kit }, ctx.breathe);
    if (disposed) {
      system.dispose();
      return null;
    }
    system.group.visible = false;
    if (ctx.skipShadows) skipSunShadows(system.group);
    scene.add(system.group);
    self.system = system;
    obstacles = system.shipObstacles();
    ctx.shipObstacles.push(...obstacles);
    const vegetation = ctx.vegetation();
    if (vegetation) {
      const flora = await system.plants(ctx.breathe);
      if (disposed) return null;
      plants = await addIslandPlants(
        ctx,
        vegetation,
        flora,
        `${id}-plants`,
        spec.flora,
        terrain,
        spec.plantLook,
      );
    }
    for (const f of spec.flocks(system)) {
      const b = addIslandBirds(ctx, f.center, f.radius, f.seed, f.perches, f.kind);
      if (!b) continue;
      flocks.push(b);
      spec.onFlock?.(system, f, b);
    }
    return system;
  };

  const teardown = async (): Promise<void> => {
    const { terrain, foam, system } = self;
    const patch = plants;
    const birds = flocks.splice(0);
    self.ready = false;
    self.terrain = null;
    self.foam = null;
    self.system = null;
    plants = null;
    removeIslandGround(ctx, terrain, obstacles);
    obstacles = [];
    depth?.drop();
    // Its air goes back to the open sea's.
    resetMood(ctx.sky.mood);
    const vegetation = ctx.vegetation();
    await freeInSlices(
      scene,
      [terrain?.group, foam, system?.group, patch?.group, ...birds.map((b) => b.group)],
      [
        () => patch && vegetation?.removePlants(patch),
        () => {
          for (const b of birds) b.dispose();
        },
        () => system?.dispose(),
        () => foam && disposeTree(foam),
        () => terrain?.dispose(),
      ],
      ctx.breathe,
    );
  };

  /** A stream that fails part-way (a 404, offline) takes back what it had added, then reports it. */
  const build = async (): Promise<W | null> => {
    try {
      return await buildParts();
    } catch (error) {
      await teardown();
      throw error;
    }
  };

  const life = new StreamLifecycle<W>(build, teardown, ctx.disabled);
  const reach = ctx.island.skyReach ?? DEFAULT_SKY_REACH;

  const self: StreamedIsland<W> & {
    terrain: CreatedTerrain | null;
    foam: Mesh | null;
    system: W | null;
    ready: boolean;
  } = {
    silhouette,
    silhouetteReady: far.ready,
    terrain: null,
    foam: null,
    system: null,
    ready: false,
    detail,
    get plantColliders() {
      return plants?.colliders ?? NO_COLLIDERS;
    },
    get world() {
      return self.system;
    },
    get state() {
      return life.state;
    },
    get loads() {
      return life.loads;
    },
    get worldReady() {
      return life.ready;
    },
    onReady: (fn) => life.onReady(fn),
    unload: () => life.unload(),
    load(p: RequestPriority = 'auto', retry = false) {
      // A load that's needed now raises a prefetch's priority for whatever it hasn't fetched yet.
      if (life.state !== 'loading' || p !== 'low') priority = p;
      return life.load(retry);
    },
    roots() {
      const roots: (Object3D | null | undefined)[] = [
        self.terrain?.group,
        self.foam,
        self.system?.group,
        plants?.group,
        ...flocks.map((b) => b.group),
      ];
      return roots.filter((r): r is Object3D => !!r);
    },
    hold(on) {
      held = on;
      if (on) depth?.lend(self.ready);
    },
    get held() {
      return held;
    },
    update(camera, dt, t) {
      const d = Math.hypot(camera.position.x - center.x, camera.position.z - center.z);
      // The island's air eases in with its light (the passage blend, from the identity at sea).
      const k0 = Math.min(1, Math.max(0, (reach.reach - d) / (reach.reach - reach.full)));
      const k = k0 * k0 * (3 - 2 * k0);
      applyIslandMood(ctx.sky.mood, spec.mood, k);
      const off = footprintDistance(footprint, camera.position.x, camera.position.z);
      if (off < ranges.load && ctx.nearLoads()) void self.load();
      const near = !swap.update(off);
      const show = near || held;
      if (self.ready && self.terrain && self.foam && !held) {
        if (show) depth?.lend(true);
        self.terrain.group.visible = show;
        self.foam.visible = show;
        if (self.system) self.system.group.visible = show;
        if (plants) plants.group.visible = show;
        for (let i = 0; i < flocks.length; i++) flocks[i]!.group.visible = show;
      }
      if (show) self.terrain?.update(camera);
      // Held for its warm-up: the levels of detail stay as the warm shows them (both drawn once).
      if (show && !held) self.system?.frame(camera);
      // The far shape stands in until the island's own ground is drawn.
      // From high above (an aerial view) the coarse silhouette would show as a sheet: only from low.
      silhouette.visible = !(near && self.ready) && camera.position.y < 150;
      detail.update(camera.position.x, camera.position.z);
      if (!show) return;
      self.system?.update(dt, t);
      for (let i = 0; i < flocks.length; i++) flocks[i]!.update(dt, t, camera);
    },
    mirrorHidden(out) {
      out.push(self.terrain?.group, self.foam, self.system?.group, silhouette);
      for (const b of flocks) out.push(b.group);
    },
    dispose() {
      disposed = true;
      life.end();
      depth?.drop();
      scene.remove(silhouette);
      disposeTree(silhouette);
      if (self.terrain) {
        scene.remove(self.terrain.group);
        self.terrain.dispose();
      }
      if (self.foam) {
        scene.remove(self.foam);
        disposeTree(self.foam);
      }
      if (self.system) {
        scene.remove(self.system.group);
        self.system.dispose();
      }
      for (const b of flocks.splice(0)) {
        scene.remove(b.group);
        b.dispose();
      }
    },
  };
  return self;
}

import { Group, Mesh, Vector3, type Camera, type Material } from 'three/webgpu';
import { loadLodSimplifier } from '../../characters/character-lod';
import { ChunkLods, chunkLodEdges, chunkLodFloor } from '../../village/chunks';
import type { TierSettings } from '../../../engine/quality';
import type { CircleObstacle, HeightField } from '../../contracts';
import type { CreateBirdsOptions } from '../../life/birds';
import type { PlantInstance } from '../../vegetation/types';
import type { VillageKit } from '../../village/kit';
import { LampSet, type LampLook } from '../../village/lamp-set';
import { makeBuckets, meshesFromBuckets } from '../../village/pieces';
import { buildAbbey } from './abbey';
import { GUILDCREST_ANCHORS } from './anchors';
import { makeOut, type GcOut } from './build';
import { toWorld, TOWER } from './layout';
import { addGuildcrestMarket } from './market';
import { createGuildcrestMist } from './mist';
import { buildRidge } from './ridge';
import { createGuildcrestRocks } from './rocks';
import { buildTown } from './town-build';
import { guildcrestPlantsSliced } from './vegetation';
import { createGuildcrestWaterMesh } from './water-mesh';

/**
 * Guildcrest's world (spec §10.1; no gameplay yet): the world its stream builds (`IslandStream.world`,
 * like Keelhaven's): its fresh water and the linn, the linn's spray and the chimneys' smoke, the town
 * and its quay, the abbey and its tower, the ridge with the guildhall and the three mills (their sails
 * turn), the rocks, and its plants (for `addIslandPlants` with `GUILDCREST_FLORA` and
 * `GUILDCREST_PLANT_LOOK`).
 */
export interface GuildcrestWorld {
  group: Group;
  /** Colliders, camera boxes, ship obstacles, walk decks and perches (for the wiring). */
  works: GcOut;
  /** Where the cast, the islanders and the stations stand (spec §3.9, as built). */
  anchors: typeof GUILDCREST_ANCHORS;
  /** The circuits' lamps (`book:<place>`, `belt:<place>`). */
  circuit: GuildcrestCircuitWorld;
  /** The quay's circles, for the ship. */
  shipObstacles(): CircleObstacle[];
  /** Picks the levels of detail for the camera (no allocation). */
  frame(camera: Camera): void;
  /**
   * Gulls over the loch and swifts round the tower (perches on the belfry's ledges), for
   * `addIslandBirds` (each flock's `kind`; spec §10.4).
   */
  birds: {
    center: Vector3;
    radius: number;
    seed: number;
    perches: Vector3[];
    kind?: Pick<CreateBirdsOptions, 'scale' | 'altitude' | 'speed' | 'count' | 'lightness'>;
  }[];
  /** How fast the mills' sails turn (1 their usual pace; 0.25 with reduced motion; 3 at the Seal). */
  setSailPace(pace: number): void;
  /** Turns the sails (within `detail`, by the stream's `shown`). */
  update(dt: number, t: number): void;
  /** The island's plants, built a slice at a time, for `vegetation.addPlants`. */
  plants(breathe: () => Promise<void>): Promise<PlantInstance[]>;
  dispose(): void;
}

/** The circuits' lamps (the game's puzzle drives them; nothing here keeps time). */
export interface GuildcrestCircuitWorld {
  lamp(key: string, look: LampLook): void;
  look(key: string): LampLook | null;
}

export interface GuildcrestWorldOptions {
  tier: TierSettings;
  /** The island's own baked ground (the drawn ground: the water's depth reads over it). */
  heightField: HeightField;
  kit: VillageKit;
}

/** Swifts (spec §10.4): smaller, faster and darker than the gulls, low round the tower. */
const SWIFTS = { scale: 0.55, altitude: [6, 40] as const, speed: 1.6, lightness: 0.16 };
const SWIFT_COUNT: Record<TierSettings['tier'], number> = {
  lite: 0,
  low: 6,
  medium: 10,
  high: 16,
  ultra: 16,
};

/** The sails' turn (rad/s) at their usual pace: about 6 s a turn. */
const SAIL_SPIN = 1.05;

/** Builds Guildcrest's world a few milliseconds a frame (`breathe` between parts). */
export async function createGuildcrestWorldAsync(
  o: GuildcrestWorldOptions,
  breathe: () => Promise<void>,
): Promise<GuildcrestWorld> {
  const lite = o.tier.tier === 'lite';
  const group = new Group();
  group.name = 'guildcrest';
  const water = createGuildcrestWaterMesh((x, z) => o.heightField.heightAt(x, z));
  group.add(water.mesh);
  await breathe();
  const out = makeOut();
  const buckets = makeBuckets();
  for (const steps of [buildTown(buckets, out, lite), buildAbbey(buckets, out, lite)])
    for (let r = steps.next(); !r.done; r = steps.next()) await breathe();
  const ridge = buildRidge(buckets, out, lite);
  let rr = ridge.next();
  for (; !rr.done; rr = ridge.next()) await breathe();
  const sailParts = rr.value;
  addGuildcrestMarket(buckets, out, lite || o.tier.tier === 'low');
  await breathe();
  const town = new Group();
  town.name = 'guildcrest-town';
  const chunkLods = new ChunkLods(chunkLodEdges(o.tier), chunkLodFloor(o.tier));
  const simplify = await loadLodSimplifier();
  const meshes: Mesh[] = await meshesFromBuckets(buckets, o.kit, o.tier, 'gc-town', town, breathe, true, {
    simplify,
    chunkLods,
    permissive: true,
  });
  group.add(town);
  // The lamps that change, one mesh in the kit's glow material.
  const lamps = new LampSet(out.lamps, o.kit.materials.glow as Material);
  out.lamps.length = 0;
  if (lamps.mesh) {
    lamps.mesh.updateMatrixWorld(true);
    group.add(lamps.mesh);
  }
  // The mills' sails: one geometry, a mesh each (in the kit's cloth material), turned in `update`.
  const sails: Mesh[] = [];
  const sailGeometry = sailParts[0]?.geometry ?? null;
  for (const s of sailParts) {
    if (s.geometry !== sailGeometry) s.geometry.dispose();
    const m = new Mesh(sailGeometry!, o.kit.materials.cloth);
    m.name = 'guildcrest-mill-sails';
    m.position.set(s.hub.x, s.hub.y, s.hub.z);
    m.rotation.set(0, s.yaw, 0.4 + sails.length * 0.7, 'YXZ');
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    sails.push(m);
  }
  await breathe();
  const mist = createGuildcrestMist(o.tier, out.chimneys);
  if (mist) group.add(mist.sprite);
  const rocks = createGuildcrestRocks(o.tier.tier);
  group.add(rocks.group);
  out.circles.push(...rocks.circles);
  await breathe();
  const loch = toWorld(-260, -20);
  const tower = toWorld(TOWER.u, TOWER.v);
  let pace = 1;
  return {
    group,
    works: out,
    anchors: GUILDCREST_ANCHORS,
    circuit: { lamp: (key, look) => lamps.set(key, look), look: (key) => lamps.look(key) },
    shipObstacles: () => out.shipObstacles,
    birds: [
      { center: new Vector3(loch.x, 0, loch.z), radius: 160, seed: 0x6c0b1, perches: [] },
      {
        center: new Vector3(tower.x, TOWER.top - 30, tower.z),
        radius: 70,
        seed: 0x6c0b2,
        perches: out.perches.map((p) => new Vector3(p.x, p.y, p.z)),
        kind: { ...SWIFTS, count: SWIFT_COUNT[o.tier.tier] },
      },
    ],
    setSailPace(p) {
      pace = p;
    },
    update(dt) {
      for (const m of sails) m.rotation.z += SAIL_SPIN * pace * dt;
    },
    frame(camera) {
      chunkLods.update(camera.position.x, camera.position.y, camera.position.z);
    },
    async plants(breathe) {
      const steps = guildcrestPlantsSliced(o.tier.tier, o.heightField);
      for (;;) {
        const r = steps.next();
        if (r.done) return r.value;
        await breathe();
      }
    },
    dispose() {
      water.dispose();
      mist?.dispose();
      for (const m of meshes) m.geometry.dispose();
      sailGeometry?.dispose();
      lamps.dispose();
      rocks.dispose();
    },
  };
}

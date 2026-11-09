import { Group, Mesh, PerspectiveCamera, Scene, Vector3 } from 'three/webgpu';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tierSettings } from '../../engine/quality';
import type { IslandEntry } from '../../islands/types';
import type { CircleObstacle } from '../contracts';
import { CompositeHeightField } from '../terrain/composite-height-field';
import type { IslandStreamCreateContext } from './island-stream';
import type { StreamedIslandSpec, StreamedWorld } from './streamed-island';

// The shared stream (every streamed island but Port Meridian runs on it) with its parts stubbed: the
// order they arrive in, what's shown when, and what a free or an abandoned load takes back.
const made = vi.hoisted(() => ({
  terrains: [] as { group: Group; update: () => void; dispose: () => void }[],
  options: [] as Record<string, unknown>[],
  foams: [] as { data: unknown; options: unknown }[],
  birds: [] as { group: Group; update: () => void; dispose: () => void }[],
  depth: { build: vi.fn(async () => {}), lend: vi.fn(), drop: vi.fn() },
}));
vi.mock('../terrain/bake', () => ({
  loadTerrainPack: vi.fn(async () => ({ minX: -10, maxX: 10, minZ: -10, maxZ: 10 })),
}));
vi.mock('../terrain/terrain-mesh', () => ({
  createTerrainAsync: async (options: Record<string, unknown>) => {
    const t = {
      group: new Group(),
      heightField: { heightAt: () => 5, normalAt: () => [0, 1, 0] },
      update: vi.fn(),
      dispose: vi.fn(),
    };
    made.options.push(options);
    made.terrains.push(t);
    return t;
  },
}));
vi.mock('../terrain/coast-foam', () => ({
  createCoastFoam: (data: unknown, _hf: unknown, options: unknown) => {
    made.foams.push({ data, options });
    return new Mesh();
  },
}));
vi.mock('../village/kit', () => ({ loadVillageKit: async () => ({ kit: true }) }));
vi.mock('../life/birds', () => ({
  createBirds: () => {
    const b = { group: new Group(), update: vi.fn(), dispose: vi.fn() };
    made.birds.push(b);
    return b;
  },
}));
vi.mock('./depth-tile', () => ({ createIslandDepthTile: () => made.depth }));

const { createStreamedIsland } = await import('./streamed-island');
const { loadTerrainPack } = await import('../terrain/bake');

/** An island 100 m across at the origin: it shows inside 300 m and streams in inside 500 m. */
const ISLE = {
  id: 'testisle',
  center: { x: 0, z: 0 },
  ranges: { load: 500, show: 300, unload: 600, detail: 100 },
  footprint: { x: 0, z: 0, radii: new Array<number>(8).fill(100) },
  stream: { nearLoads: 'always', reflected: false, courseData: 'none', depthTile: true },
} as unknown as IslandEntry;

interface TestWorld extends StreamedWorld {
  kept: unknown;
}

function fakeWorld(): TestWorld {
  return {
    group: new Group(),
    shipObstacles: () => [{ x: 3, z: 3, r: 2 } as CircleObstacle],
    plants: async () => [],
    frame: vi.fn<StreamedWorld['frame']>(),
    update: vi.fn<StreamedWorld['update']>(),
    dispose: vi.fn<StreamedWorld['dispose']>(),
    kept: null,
  };
}

function setup(over: Partial<StreamedIslandSpec<TestWorld>> = {}) {
  const scene = new Scene();
  const heightField = new CompositeHeightField();
  const shipObstacles: CircleObstacle[] = [{ x: 1, z: 1, r: 1 } as CircleObstacle];
  const mood = { fogScale: 1, hazeTint: [1, 1, 1] as [number, number, number], fill: 1, exposure: 1 };
  const ctx: IslandStreamCreateContext = {
    scene,
    heightField,
    shipObstacles,
    tier: tierSettings('high'),
    packBase: '/packs',
    breathe: async () => {},
    vegetation: () => null,
    birds: true,
    skipShadows: false,
    disabled: false,
    sky: { mood },
    island: ISLE,
    nearLoads: () => false,
  };
  const world = fakeWorld();
  const far = new Group();
  const seaFloor = () => -4;
  const flock = { center: new Vector3(), radius: 50, seed: 7, kind: { count: 3 } };
  const spec: StreamedIslandSpec<TestWorld> = {
    silhouette: () => ({ group: far, ready: Promise.resolve() }),
    mood: { fogScale: 2, hazeTint: [1, 1, 1] },
    terrain: () => ({ maxMergedTriangles: 1234 }),
    foam: { maxDistance: 900 },
    seaFloor,
    world: async () => world,
    flora: {} as StreamedIslandSpec<TestWorld>['flora'],
    flocks: () => [flock],
    onFlock: (w, _f, b) => void (w.kept = b),
    ...over,
  };
  const stream = createStreamedIsland(ctx, spec);
  const camera = new PerspectiveCamera();
  const at = (x: number) => {
    camera.position.set(x, 10, 0);
    stream.update(camera, 0.016, 1);
  };
  return { ctx, scene, heightField, shipObstacles, mood, world, far, seaFloor, stream, at };
}

describe('a streamed island', () => {
  beforeEach(() => {
    made.terrains.length = made.options.length = made.foams.length = made.birds.length = 0;
    made.depth.build.mockClear();
    made.depth.lend.mockClear();
    made.depth.drop.mockClear();
    vi.mocked(loadTerrainPack).mockClear();
  });

  it('streams in hidden, from its own pack, with its own terrain, foam, sea floor and flocks', async () => {
    const s = setup();
    expect(s.scene.children).toEqual([s.far]);

    expect(await s.stream.load('low')).toBe(s.world);
    expect(loadTerrainPack).toHaveBeenCalledWith('/packs/testisle/terrain', 'low');
    expect(made.options[0]).toMatchObject({ name: 'testisle-terrain', maxMergedTriangles: 1234 });
    expect(made.foams[0]!.options).toEqual({ maxDistance: 900 });
    expect(made.depth.build).toHaveBeenCalledWith(expect.anything(), s.ctx.breathe, s.seaFloor);

    expect(s.stream.state).toBe('resident');
    expect(s.stream.ready).toBe(true);
    expect(s.stream.world).toBe(s.world);
    expect(s.stream.system).toBe(s.world);
    // Its ground is the world's ground there, and the ship steers round its quays.
    expect(s.heightField.heightAt(0, 0)).toBe(5);
    expect(s.shipObstacles).toHaveLength(2);
    // The world keeps the flock it asked for.
    expect(made.birds).toHaveLength(1);
    expect(s.world.kept).toBe(made.birds[0]);
    // Everything waits hidden for its warm-up.
    const roots = s.stream.roots();
    expect(roots).toEqual([made.terrains[0]!.group, s.stream.foam, s.world.group, made.birds[0]!.group]);
    for (const r of roots) {
      expect(r.parent).toBe(s.scene);
      expect(r.visible).toBe(false);
    }
  });

  it('draws its own ground near and its silhouette far, and its air eases in', async () => {
    const s = setup();
    await s.stream.load();

    s.at(0);
    for (const r of s.stream.roots()) expect(r.visible).toBe(true);
    expect(s.far.visible).toBe(false);
    expect(s.world.frame).toHaveBeenCalledTimes(1);
    expect(s.world.update).toHaveBeenCalledTimes(1);
    expect(made.birds[0]!.update).toHaveBeenCalledTimes(1);
    expect(made.depth.lend).toHaveBeenCalledWith(true);
    // Inside its light's full reach, the island's air is all its own.
    expect(s.mood.fogScale).toBe(2);

    s.at(2000);
    for (const r of s.stream.roots()) expect(r.visible).toBe(false);
    expect(s.far.visible).toBe(true);
    // Out of sight, its world rests.
    expect(s.world.update).toHaveBeenCalledTimes(1);
  });

  it("leaves what's shown to a warm-up that holds it", async () => {
    const s = setup();
    await s.stream.load();
    s.stream.hold(true);
    expect(s.stream.held).toBe(true);

    s.at(0);
    for (const r of s.stream.roots()) expect(r.visible).toBe(false);
    // The warm picks the levels of detail itself.
    expect(s.world.frame).not.toHaveBeenCalled();
    expect(s.world.update).toHaveBeenCalledTimes(1);

    s.stream.hold(false);
    s.at(0);
    for (const r of s.stream.roots()) expect(r.visible).toBe(true);
    expect(s.world.frame).toHaveBeenCalledTimes(1);
  });

  it('comes near and streams itself in, only where the world lets it', async () => {
    const s = setup();
    s.at(0);
    expect(s.stream.state).toBe('absent');

    s.ctx.nearLoads = () => true;
    s.at(2000);
    expect(s.stream.state).toBe('absent');
    s.at(400);
    expect(s.stream.state).toBe('loading');
    expect(await s.stream.worldReady).toBe(s.world);
  });

  it('frees everything it added, and streams in again', async () => {
    const s = setup();
    await s.stream.load();
    const terrain = made.terrains[0]!;
    const roots = s.stream.roots();

    await s.stream.unload();
    expect(s.stream.state).toBe('absent');
    expect(s.stream.ready).toBe(false);
    expect(s.stream.world).toBeNull();
    expect(s.stream.roots()).toEqual([]);
    expect(s.scene.children).toEqual([s.far]);
    for (const r of roots) expect(r.parent).toBeNull();
    expect(terrain.dispose).toHaveBeenCalledTimes(1);
    expect(s.world.dispose).toHaveBeenCalledTimes(1);
    expect(made.birds[0]!.dispose).toHaveBeenCalledTimes(1);
    expect(made.depth.drop).toHaveBeenCalled();
    expect(s.heightField.heightAt(0, 0)).toBe(-52);
    expect(s.shipObstacles).toHaveLength(1);

    expect(await s.stream.load()).toBe(s.world);
    expect(s.stream.loads).toBe(2);
    expect(made.terrains).toHaveLength(2);
  });

  it('frees a world that finishes building after the voyage has ended', async () => {
    let finish: (w: TestWorld) => void = () => {};
    const building = new Promise<TestWorld>((r) => (finish = r));
    let started: () => void = () => {};
    const worldStarted = new Promise<void>((r) => (started = r));
    const s = setup({
      world: () => {
        started();
        return building;
      },
    });
    const loading = s.stream.load();
    await worldStarted;
    s.stream.dispose();
    finish(s.world);

    expect(await loading).toBeNull();
    expect(s.world.dispose).toHaveBeenCalledTimes(1);
    expect(s.world.group.parent).toBeNull();
    expect(s.far.parent).toBeNull();
  });
});

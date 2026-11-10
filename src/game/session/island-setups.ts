import type { Object3D } from 'three/webgpu';
import { COURSE, courseIsland } from '../../course/catalog';
import type { Engine } from '../../engine/engine';
import { HOME_ISLAND, ISLAND_LIST, STREAMED_ISLANDS } from '../../islands/registry';
import { releaseRemovedObjects } from '../../util/dispose-three';
import type { CircleObstacle } from '../../world/contracts';
import type { CoveScene } from '../../world/cove-scene';
import { footprintDistance } from '../../world/islands/footprint';
import type { IslandId } from '../arrivals';
import type { CollisionWorld } from '../collision';
import type { Interactions } from '../interaction';
import type { IslandContent, IslandSetup } from '../island-code';
import { Residency, type ResidencyDecision } from '../residency';
import type { Markets } from './markets';
import type { SessionStatus, StreamedIsland } from './types';

export interface IslandSetupsHost {
  status: SessionStatus;
  engine: Engine;
  cove: CoveScene;
  world: CollisionWorld;
  interactions: Interactions;
  /** The streamed islands' content, by island. */
  contents: ReadonlyMap<IslandId, IslandContent>;
  markets: Markets;
  /** Anchorage's cast, stall and chests: what sleeps with it while it's dormant. */
  anchorageContent(): Object3D[];
  /** An island's course notice board (the interaction; `course-board:<id>`). */
  addCourseBoard(id: IslandId): void;
  /** Something has the player (a talk, a puzzle, a flight, a ride): nothing's freed under it. */
  busy(): boolean;
  /** Where you are for residency: your feet ashore, the ship at sea (not the camera, which roams). */
  focus(): { x: number; z: number };
  /** The island the compass sends the ship to while you're aboard (null ashore). */
  target(): IslandId | null;
  /** Whether an island's open to sail to. */
  reachable(id: IslandId): boolean;
}

/** An island's content had nothing to set up (it went again, or the session ended). */
export const noSetup: IslandSetup = { roots: [], reveal() {} };

/**
 * The islands that stream in and out (PLAN §13.3). Each time an island's world streams in, its
 * content goes on it and the listeners (the flow's warm, the dev page's precompile) hear of it;
 * before its world is freed, its content comes off. Twice a second the residency rules
 * (game/residency.ts) say what to stream in and what to free.
 */
export type IslandSetups = ReturnType<typeof createIslandSetups>;

export function createIslandSetups(host: IslandSetupsHost) {
  const { status, engine, cove, world, interactions, contents, markets } = host;
  const streams = cove.residents;
  const setupListeners = new Set<(id: StreamedIsland, setup: IslandSetup) => void>();
  // Anchorage's content went in with the session (its first setup).
  const setupGen = Object.fromEntries(ISLAND_LIST.map((e) => [e.id, e.stream ? 0 : 1])) as Record<
    StreamedIsland,
    number
  >;
  const currentSetup: Partial<Record<StreamedIsland, IslandSetup>> = { [HOME_ISLAND]: noSetup };
  const deferred = () => {
    let resolve!: (s: IslandSetup) => void;
    const promise = new Promise<IslandSetup>((r) => (resolve = r));
    return { promise, resolve };
  };
  const nextSetup = Object.fromEntries(ISLAND_LIST.map((e) => [e.id, deferred()])) as Record<
    StreamedIsland,
    ReturnType<typeof deferred>
  >;
  nextSetup[HOME_ISLAND].resolve(noSetup);
  /** Anchorage's cast and chests while it's dormant, and whether each was shown. */
  let anchorageParked: { object: Object3D; visible: boolean }[] = [];
  /** Anchorage wakes: its cast and chests go back in (hidden until the warm-up shows them). */
  const setupAnchorage = async (): Promise<IslandSetup> => {
    const parked = anchorageParked;
    anchorageParked = [];
    for (const p of parked) {
      p.object.visible = false;
      engine.scene.add(p.object);
    }
    return {
      roots: parked.map((p) => p.object),
      reveal() {
        for (const p of parked) p.object.visible = p.visible;
        cove.anchorage.reveal();
      },
    };
  };
  /** Islands whose content is being built, or taken down. */
  const settingUp = new Set<StreamedIsland>();
  const unloading = new Set<StreamedIsland>();
  const runSetup = (id: StreamedIsland, make: () => Promise<IslandSetup>) => {
    settingUp.add(id);
    void make().then((setup) => {
      settingUp.delete(id);
      if (status.disposed || setup === noSetup) return;
      setupGen[id]++;
      currentSetup[id] = setup;
      nextSetup[id].resolve(setup);
      for (const fn of setupListeners) fn(id, setup);
    });
  };
  // A course that doesn't use an island leaves it as scenery: no cast, sites or puzzles there.
  const inCourse = (id: IslandId) => !!courseIsland(id, COURSE);
  /** Each streamed island's plant colliders while they're in the world (`IslandStream.plantColliders`). */
  const islandPlants = new Map<IslandId, readonly CircleObstacle[]>();
  const addIslandPlants = (id: IslandId) => {
    const list = cove.islands[id]?.plantColliders ?? [];
    if (islandPlants.has(id) || list.length === 0) return;
    for (const c of list) world.addCircle(c);
    islandPlants.set(id, list);
  };
  const removeIslandPlants = (id: IslandId) => {
    const list = islandPlants.get(id);
    if (!list) return;
    world.remove(list);
    islandPlants.delete(id);
  };
  /** A streamed island's world is in: its content goes on it, then its course board and market stall. */
  const onIslandWorld = (id: IslandId, built: unknown) =>
    runSetup(id, async () => {
      // Its plants block walkers in every course, with or without its content.
      addIslandPlants(id);
      const content = contents.get(id);
      if (!content || status.disposed || !inCourse(id)) return noSetup;
      const setup = await content.setup(built);
      if (!setup) return noSetup;
      if (status.disposed || cove.islands[id]?.world !== built) return setup;
      host.addCourseBoard(id);
      const market = markets.add(id, content.market?.(built) ?? null);
      if (!market) return setup;
      return {
        roots: [...setup.roots, market],
        reveal() {
          setup.reveal();
          market.visible = true;
        },
      };
    });
  const unsubscribeStreams = [cove.anchorage.onReady(() => runSetup(HOME_ISLAND, setupAnchorage))];
  for (const e of STREAMED_ISLANDS) {
    const stream = cove.islands[e.id];
    if (!stream) continue;
    unsubscribeStreams.push(stream.onReady((built) => onIslandWorld(e.id, built)));
    // Streamed in before the session (a save there).
    if (stream.state === 'resident' && stream.world) onIslandWorld(e.id, stream.world);
  }

  /** Frees an island you've left: its content comes off first, then its world, a part a frame. */
  async function unloadIsland(id: StreamedIsland): Promise<void> {
    if (unloading.has(id) || settingUp.has(id)) return;
    unloading.add(id);
    try {
      await engine.counters.excuse(
        (async () => {
          // Everything its content put in the scene: once it's out, three is told it's disposed, or
          // its render objects (and through them the cast, chests and sites) stay alive (skill §4).
          const leaving: Object3D[] = [];
          if (id !== HOME_ISLAND)
            for (const r of currentSetup[id]?.roots ?? []) r.traverse((o) => void leaving.push(o));
          currentSetup[id] = undefined;
          nextSetup[id] = deferred();
          removeIslandPlants(id);
          const content = contents.get(id);
          if (content) {
            content.teardown();
            markets.remove(id);
            interactions.remove(`course-board:${id}`);
          } else if (id === HOME_ISLAND) {
            // Anchorage sleeps with its cast and chests (they stay as they are, out of the scene).
            const parked = host.anchorageContent().filter((o) => o.parent);
            anchorageParked = parked.map((object) => ({ object, visible: object.visible }));
            cove.anchorage.extra = parked;
          }
          releaseRemovedObjects(leaving, engine.scene);
          await streams[id].unload();
        })(),
      );
    } finally {
      unloading.delete(id);
    }
  }
  const residency = new Residency(
    ISLAND_LIST.map((e) => ({
      id: e.id,
      x: e.center.x,
      z: e.center.z,
      load: e.ranges.load,
      unload: e.ranges.unload,
      distance: e.ranges.byCentre
        ? undefined
        : (x: number, z: number) => footprintDistance(e.footprint, x, z),
    })),
  );
  const residencyOut: ResidencyDecision = { load: [], unload: [] };
  let residencyIn = 0;
  /** Tests hold every island in memory (`debug.keepResident`). */
  let keepResident = false;
  /** Twice a second: streams in what you'll need, frees what you've left (game/residency.ts). */
  const updateResidency = (dt: number, t: number) => {
    if ((residencyIn -= dt) > 0) return;
    residencyIn = 0.5;
    const busy = keepResident || host.busy();
    const f = host.focus();
    residency.update(
      {
        now: t,
        x: f.x,
        z: f.z,
        on: status.island,
        target: host.target(),
        busy,
        state: (id) => streams[id].state,
        held: (id) => streams[id].held || settingUp.has(id) || unloading.has(id),
      },
      residencyOut,
    );
    for (const l of residencyOut.load)
      if (host.reachable(l.id) && !unloading.has(l.id)) void streams[l.id].load(l.priority);
    for (const id of residencyOut.unload) void unloadIsland(id);
  };

  return {
    /** An island's next setup: pending until its world streams in and its content is on it. */
    next: (id: StreamedIsland) => nextSetup[id].promise,
    /** Hears each setup of an island (a first visit, and each time it streams in again). */
    onSetup(fn: (id: StreamedIsland, setup: IslandSetup) => void): () => void {
      setupListeners.add(fn);
      return () => setupListeners.delete(fn);
    },
    /** The islands whose content is in the scene now, and which setup (1, 2, …) it is. */
    list() {
      const out: { id: StreamedIsland; setup: IslandSetup; gen: number }[] = [];
      for (const id of ISLAND_LIST.map((e) => e.id)) {
        const setup = currentSetup[id];
        if (setup) out.push({ id, setup, gen: setupGen[id] });
      }
      return out;
    },
    gen: (id: StreamedIsland) => setupGen[id],
    unload: unloadIsland,
    update: updateResidency,
    /** Tests hold every island in memory that is (nothing's freed) while on. */
    keepResident(on: boolean): void {
      keepResident = on;
    },
    /** Which islands are in memory, and whether everything you've left is freed and all you need is in. */
    report() {
      const states: Record<string, string> = {};
      let settled = true;
      const resident: string[] = [];
      const f = host.focus();
      const target = host.target();
      for (const r of residency.rules) {
        const state = streams[r.id].state;
        states[r.id] = state;
        if (state === 'resident' || state === 'loading') resident.push(r.id);
        const d = Math.hypot(f.x - r.x, f.z - r.z);
        const keep = status.island === r.id || target === r.id || d <= r.unload;
        const needed = status.island === r.id || target === r.id || d < r.load;
        if (state === 'loading' || state === 'unloading' || settingUp.has(r.id) || unloading.has(r.id))
          settled = false;
        else if (state === 'resident' && !keep) settled = false;
        else if (state === 'absent' && needed && host.reachable(r.id)) settled = false;
      }
      return { resident, states, settled };
    },
    /**
     * The session's over. Returns what's out of the scene with Anchorage dormant (its cast and
     * chests), for the caller to release once they're disposed.
     */
    dispose(): Object3D[] {
      for (const u of unsubscribeStreams) u();
      const parked: Object3D[] = [];
      for (const p of anchorageParked) p.object.traverse((o) => void parked.push(o));
      anchorageParked = [];
      setupListeners.clear();
      return parked;
    },
  };
}

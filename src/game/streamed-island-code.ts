import { islandOpen } from '../islands/open';
import { ISLAND_LIST, islandEntry, type IslandId } from '../islands/registry';
import type { IslandStreamFactory } from '../world/islands/island-stream';
import type { IslandWays } from '../world/islands/waypoints';
import type { MarketStallLayout } from '../world/market-stall/layout';
import type { VillageAnchor } from '../world/village/kit';
import type { InlandWater, SurfaceKind, WalkBox, WalkSurface } from './collision';
import type { IslandCode, IslandContent, IslandContentHost, IslandQuests, IslandSetup } from './island-code';
import type { Npc } from './npcs';
import type { QuestTracker } from './quest-list';
import type { ScriptStep } from './script';
import { storyHolds, type QuestState } from './story';

/**
 * A streamed island's content as its session module makes it (src/game/<island>-session.ts): its
 * cast, chests, sites and puzzles on the island's world `W`, and the walks and water they stand on.
 */
export interface StreamedContent<W> {
  /** The island's walk surfaces, live once its world has streamed in. */
  readonly surface: WalkSurface;
  /** Its pools and streams, for wading. */
  inland(x: number, z: number, ground: number, out: InlandWater): boolean;
  /** Builds the cast, chests and sites once the world's in (hidden until `reveal`). */
  setup(world: W): Promise<IslandSetup>;
  /** Takes all of that out again before the island's world is freed; the next `setup` reads the save. */
  teardown(): void;
  readonly npcs: readonly Npc[];
  readonly ids: ReadonlySet<string>;
  script(id: string): { steps: readonly ScriptStep[] } | null;
  updateNpcs(dt: number, at: { x: number; y: number; z: number }, eye: { x: number; z: number }): void;
  update(dt: number, t: number): void;
  bottles(): { id: string; x: number; z: number; read: boolean }[];
  debug: Record<string, (...args: never[]) => unknown>;
  dispose(): void;
}

/** What is a streamed island's own in its code; `streamedIslandCode` adds what every one shares. */
export interface StreamedIslandCodeSpec<W, C extends StreamedContent<W>> {
  /** Its id in the registry (its gate there says whose Seal sends the compass on to it). */
  id: IslandId;
  stream: IslandStreamFactory<W>;
  chests: IslandCode['chests'];
  cast: IslandCode['cast'];
  ways: IslandWays;
  quests: Pick<IslandQuests, 'log' | 'target' | 'current' | 'optionalTargets'> & {
    tracker(q: QuestState): QuestTracker;
    /** The task list's last line once the next island is open (read on each call: it's the course's). */
    nextSail(): string | undefined;
  };
  /** Where its walks and water can be (its bake). */
  bounds: WalkBox;
  /** What its walks are underfoot until its content says. */
  ground: SurfaceKind;
  /** Its content in a session (src/game/<island>-session.ts). */
  content(host: IslandContentHost<W>): C;
  /** Its Model Market stall: the anchor its lettering goes on. */
  market(world: W): { at: VillageAnchor; layout: MarketStallLayout } | null;
}

/**
 * A streamed island's code (`IslandCode`, src/game/island-code.ts) from what's its own. The same for
 * every one: its task list points on to the next island once that's open, the hint key talks about
 * its active main task, the compass sends you here once the Seal its gate names is won, and its walks
 * and water read its content, live once its world has streamed in and its content is up.
 */
export function streamedIslandCode<W, C extends StreamedContent<W>>(
  spec: StreamedIslandCodeSpec<W, C>,
): IslandCode<W> {
  const { quests } = spec;
  /** The island this one's Seal opens (the next in the voyage), if the game has it. */
  const next = ISLAND_LIST.find((e) => e.open?.after?.island === spec.id) ?? null;
  const gate = islandEntry(spec.id).open?.after;
  /** Each session's content, for its walk surfaces (made before the content, read once it's there). */
  const own = new WeakMap<IslandContent<W>, C>();

  return {
    stream: spec.stream,
    chests: spec.chests,
    cast: spec.cast,
    ways: spec.ways,
    quests: {
      log: quests.log,
      // The task list points on to the next island once it's open.
      tracker: (q) => {
        const t = quests.tracker(q);
        const sail = quests.nextSail();
        return sail && next && islandOpen(next.id) ? { ...t, next: sail } : t;
      },
      target: quests.target,
      current: quests.current,
      optionalTargets: quests.optionalTargets,
      hintTask: (q) => quests.tracker(q).tasks.find((t) => t.status === 'active' && !t.optional),
      // Once the Seal its gate names is won, the compass points on to it.
      sailHere: gate ? (q) => storyHolds(gate.island, gate.condition, q) : undefined,
    },
    walk: ({ content }) => {
      const live = () => {
        const c = content();
        return c ? (own.get(c) ?? null) : null;
      };
      return {
        box: spec.bounds,
        surfaces: [
          {
            heightAt: (x, z, y) => live()?.surface.heightAt(x, z, y) ?? null,
            kind: (x, z) => {
              const k = live()?.surface.kind ?? spec.ground;
              return typeof k === 'function' ? k(x, z) : k;
            },
          },
        ],
        inland: (x, z, g, out) => live()?.inland(x, z, g, out) ?? false,
      };
    },
    content: (host) => {
      const c = spec.content(host);
      const content: IslandContent<W> = {
        get npcs() {
          return c.npcs;
        },
        owns: (id) => c.ids.has(id),
        script: (id) => c.script(id),
        setup: (world) => c.setup(world),
        market: (world) => spec.market(world),
        bottles: () => c.bottles(),
        teardown: () => c.teardown(),
        updateNpcs: (dt, at, eye) => c.updateNpcs(dt, at, eye),
        update: (dt, t) => c.update(dt, t),
        debug: c.debug,
        dispose: () => c.dispose(),
      };
      own.set(content, c);
      return content;
    },
  };
}

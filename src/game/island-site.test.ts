import { Group, Vector3 } from 'three/webgpu';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CircleObstacle } from '../world/contracts';
import type { BoxCollider } from './collision';
import type { Interactable } from './interaction';
import type { IslandSessionHost } from './island-code';
import type { Puzzle } from './puzzles/types';

// What an island's content adds through its site, and that `clear` takes every bit of it back.
const made = vi.hoisted(() => ({
  crowds: [] as { list: unknown[]; dispose: () => void; update: () => void }[],
  bottles: [] as { group: Group; setCollected: (id: string, on: boolean) => void; dispose: () => void }[],
}));
vi.mock('../engine/build-slice', () => ({ buildSlice: async () => {} }));
vi.mock('../world/village/kit', () => ({ loadVillageKit: async () => ({}) }));
vi.mock('./npcs', () => ({
  NpcCrowd: {
    createAsync: async (_lib: unknown, specs: readonly { id: string }[]) => {
      const crowd = {
        list: specs.map((spec) => ({ spec, character: { group: new Group() } })),
        dispose: vi.fn(),
        update: vi.fn(),
      };
      made.crowds.push(crowd);
      return crowd;
    },
  },
}));
vi.mock('../world/sites/bottles', () => ({
  createBottles: (o: { spots: readonly { id: string; x: number; z: number }[] }) => {
    const site = {
      group: new Group(),
      spots: () => Object.fromEntries(o.spots.map((s) => [s.id, new Vector3(s.x, 1, s.z)])),
      setCollected: vi.fn(),
      dispose: vi.fn(),
    };
    made.bottles.push(site);
    return site;
  },
}));

const { createIslandSite } = await import('./island-site');

function setup(open: string[] = []) {
  const interactions = new Map<string, Interactable>();
  const opened = new Set(open);
  const scene = new Group();
  const chests: string[] = [];
  /** What the collision world was asked to take out (copied: the site empties its list after). */
  const removed: unknown[] = [];
  const host = {
    characters: {},
    tier: {},
    camera: {},
    scene: { add: (o: Group) => void scene.add(o) },
    detail: { add: vi.fn() },
    world: {
      addBox: vi.fn(),
      addCircle: vi.fn(),
      addCameraBox: vi.fn(),
      remove: (items: Iterable<unknown>) => void removed.push(...items),
    },
    interactions: {
      add: (i: Interactable) => (interactions.set(i.id, i), i),
      remove: (id: string) => void interactions.delete(id),
    },
    puzzles: [] as Puzzle[],
    puzzleHost: { canAct: () => true },
    audio: null,
    learn: {
      isChestOpen: (id: string) => opened.has(id),
      openChest: async (id: string) => void opened.add(id),
    },
    addNpcTalk: (n: { spec: { id: string } }) =>
      void interactions.set(`npc:${n.spec.id}`, {} as Interactable),
    // The session has no chest for an id it doesn't know.
    placeChest: (id: string) => (id === 'unknown' ? null : (chests.push(id), new Group())),
    removeChests: vi.fn((ids: readonly string[]) => {
      for (const id of ids) chests.splice(chests.indexOf(id), 1);
    }),
  };
  const site = createIslandSite(host as unknown as IslandSessionHost);
  return { host, site, interactions, opened, scene, chests, removed };
}

const anchor = { x: 0, y: 0, z: 0, rot: 0 };
const castOf = (s: ReturnType<typeof setup>, alive: () => boolean, roots: Group[]) =>
  s.site.cast({
    cast: [{ id: 'ada' }, { id: 'bo' }] as never,
    anchors: { ada: anchor } as never,
    fallback: anchor as never,
    alive,
    roots,
  });

describe("an island's site", () => {
  beforeEach(() => {
    made.crowds.length = made.bottles.length = 0;
  });

  it('adds the cast, chests, bottles, colliders and puzzles hidden, and clears them all', async () => {
    const s = setup();
    const roots: Group[] = [];
    const box = { id: 'box' } as unknown as BoxCollider;
    const circle = { x: 0, z: 0, r: 1 } as CircleObstacle;
    const puzzle = { dispose: vi.fn() } as unknown as Puzzle;

    s.site.colliders([box], [circle], [box]);
    expect(await castOf(s, () => true, roots)).toBe(true);
    s.site.chest('gold', 1, 2, 3, 0, roots);
    s.site.chest('unknown', 1, 2, 3, 0, roots);
    expect(
      await s.site.bottles({
        spots: [{ id: 'b1', x: 4, z: 5, yaw: 0 }],
        ground: () => 0,
        alive: () => true,
        roots,
      }),
    ).toBe(true);
    s.site.puzzle(puzzle);
    s.site.interaction({ id: 'bell' } as Interactable);

    // Two characters, one chest (the unknown one isn't placed) and the bottles, all hidden.
    expect(roots).toHaveLength(4);
    for (const r of roots) expect(r.visible).toBe(false);
    expect(s.site.npcs).toHaveLength(2);
    expect([...s.interactions.keys()].sort()).toEqual(['bell', 'bottle:b1', 'npc:ada', 'npc:bo']);
    expect(s.chests).toEqual(['gold']);
    expect(s.host.puzzles).toEqual([puzzle]);
    expect(s.site.bottleList()).toEqual([{ id: 'b1', x: 4, z: 5, read: false }]);

    s.site.clear();
    expect(s.removed).toEqual([box, circle, box]);
    expect(s.interactions.size).toBe(0);
    expect(s.chests).toEqual([]);
    expect(s.host.puzzles).toEqual([]);
    expect(puzzle.dispose).toHaveBeenCalledTimes(1);
    expect(made.crowds[0]!.dispose).toHaveBeenCalledTimes(1);
    expect(made.bottles[0]!.dispose).toHaveBeenCalledTimes(1);
    expect(made.bottles[0]!.group.parent).toBeNull();
    expect(s.site.crowd).toBeNull();
    expect(s.site.npcs).toEqual([]);
    expect(s.site.bottleList()).toEqual([]);
  });

  it('frees a cast made for an island that has gone, and adds none of it', async () => {
    const s = setup();
    const roots: Group[] = [];
    expect(await castOf(s, () => false, roots)).toBe(false);
    expect(made.crowds[0]!.dispose).toHaveBeenCalledTimes(1);
    expect(roots).toEqual([]);
    expect(s.interactions.size).toBe(0);
    expect(s.site.crowd).toBeNull();
    // The kit arrived for an island that's gone: no bottles either.
    expect(await s.site.bottles({ spots: [], ground: () => 0, alive: () => false, roots })).toBe(false);
    expect(made.bottles).toHaveLength(0);
  });

  it('keeps a read bottle collected, and reading one opens its message', async () => {
    const s = setup(['b1']);
    await s.site.bottles({
      spots: [
        { id: 'b1', x: 0, z: 0, yaw: 0 },
        { id: 'b2', x: 9, z: 9, yaw: 0 },
      ],
      ground: () => 0,
      alive: () => true,
      roots: [],
    });
    const bottles = made.bottles[0]!;
    expect(bottles.setCollected).toHaveBeenCalledWith('b1', true);
    expect(s.interactions.get('bottle:b1')!.enabled!()).toBe(false);
    const b2 = s.interactions.get('bottle:b2')!;
    expect(b2.enabled!()).toBe(true);

    b2.onInteract();
    await Promise.resolve();
    expect(bottles.setCollected).toHaveBeenCalledWith('b2', true);
    expect(s.opened.has('b2')).toBe(true);
    expect(s.site.bottleList().map((b) => b.read)).toEqual([true, true]);
  });
});

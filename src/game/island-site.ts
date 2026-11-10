import type { Object3D } from 'three/webgpu';
import { buildSlice } from '../engine/build-slice';
import type { CircleObstacle } from '../world/contracts';
import { createBottles, type BottleSite, type BottleSpot } from '../world/sites/bottles';
import { loadVillageKit, type VillageAnchor } from '../world/village/kit';
import type { BoxCollider } from './collision';
import type { Interactable } from './interaction';
import type { IslandSessionHost } from './island-code';
import { NpcCrowd, type Npc, type NpcSpec } from './npcs';
import type { Puzzle } from './puzzles/types';

/**
 * What an island's content puts into the session while its world is in (its colliders, cast,
 * chests, message bottles, interactions and puzzles), kept so `clear` takes every one out again
 * before the world is freed. Each island's content (src/game/<island>-session.ts) builds on one:
 * what it adds is the island's, how it's added and taken back is the same for all.
 */
export interface IslandSite {
  /** The island's cast, once it's in (null before, and after it's cleared). */
  readonly crowd: NpcCrowd | null;
  /** The cast as a list (empty until it's in). */
  readonly npcs: readonly Npc[];
  /** The world's colliders and camera blockers join the session's collision world. */
  colliders(
    boxes: readonly BoxCollider[],
    circles: readonly CircleObstacle[],
    cameraBoxes: readonly BoxCollider[],
  ): void;
  interaction(i: Interactable): Interactable;
  puzzle(p: Puzzle): void;
  /**
   * The cast at their anchors, a character a slice (the whole cast at once stalls a frame), hidden,
   * each one's talk added. False when the island went (or the session ended) while they were made.
   */
  cast(o: {
    cast: readonly NpcSpec[];
    anchors: Record<string, VillageAnchor>;
    /** Where an NPC without an anchor stands. */
    fallback: VillageAnchor;
    alive: () => boolean;
    roots: Object3D[];
  }): Promise<boolean>;
  /** A treasure chest at a spot, hidden (not placed when the session has none for `id`). */
  chest(id: string, x: number, y: number, z: number, heading: number, roots: Object3D[]): void;
  /**
   * The island's message bottles, hidden, each with its prompt (a read one stays collected). False
   * when the island went while the kit loaded.
   */
  bottles(o: {
    spots: readonly BottleSpot[];
    ground: (x: number, z: number) => number;
    alive: () => boolean;
    roots: Object3D[];
  }): Promise<boolean>;
  /** The bottles for the chart and the compass: where each is and whether it's been read. */
  bottleList(): { id: string; x: number; z: number; read: boolean }[];
  /** Takes everything added out of the session (what the player did there lives in the save). */
  clear(): void;
  /** Frees the cast and the bottles only (the session is ending and frees the rest itself). */
  dropLife(): void;
}

export function createIslandSite(host: IslandSessionHost): IslandSite {
  let crowd: NpcCrowd | null = null;
  let bottleSite: BottleSite | null = null;
  const added = {
    colliders: [] as (BoxCollider | CircleObstacle)[],
    interactions: [] as string[],
    chests: [] as string[],
    puzzles: [] as Puzzle[],
  };

  const readBottle = async (id: string, at: { x: number; y: number; z: number }): Promise<void> => {
    host.audio?.sfx.oneShot('bottle_pop', at, 0.9);
    bottleSite?.setCollected(id, true);
    await host.learn?.openChest(id);
  };

  const dropLife = () => {
    crowd?.dispose();
    crowd = null;
    if (bottleSite) {
      bottleSite.group.removeFromParent();
      bottleSite.dispose();
      bottleSite = null;
    }
  };

  const site: IslandSite = {
    get crowd() {
      return crowd;
    },
    get npcs() {
      return crowd?.list ?? [];
    },
    colliders(boxes, circles, cameraBoxes) {
      for (const b of boxes) host.world.addBox(b);
      for (const c of circles) host.world.addCircle(c);
      for (const b of cameraBoxes) host.world.addCameraBox(b);
      added.colliders.push(...boxes, ...circles, ...cameraBoxes);
    },
    interaction(i) {
      added.interactions.push(i.id);
      return host.interactions.add(i);
    },
    puzzle(p) {
      host.puzzles.push(p);
      added.puzzles.push(p);
    },
    async cast({ cast, anchors, fallback, alive, roots }) {
      const made = await NpcCrowd.createAsync(
        host.characters,
        cast,
        anchors,
        host.world,
        host.tier,
        host.camera,
        { ...fallback },
        buildSlice,
        alive,
      );
      if (!alive()) {
        made.dispose();
        return false;
      }
      crowd = made;
      await buildSlice();
      // The island went in that slice: `clear` has freed the cast already.
      if (!alive()) return false;
      for (const n of made.list) {
        n.character.group.visible = false;
        host.scene.add(n.character.group);
        host.detail.add(n.character.group);
        host.addNpcTalk(n);
        added.interactions.push(`npc:${n.spec.id}`);
        roots.push(n.character.group);
      }
      await buildSlice();
      return alive();
    },
    chest(id, x, y, z, heading, roots) {
      const g = host.placeChest(id, x, y, z, heading, host.detail);
      if (!g) return;
      added.chests.push(id);
      g.visible = false;
      roots.push(g);
    },
    async bottles({ spots, ground, alive, roots }) {
      const kit = await loadVillageKit();
      if (!alive()) return false;
      const made = createBottles({ kit, ground, spots });
      bottleSite = made;
      made.group.visible = false;
      host.scene.add(made.group);
      host.detail.add(made.group);
      roots.push(made.group);
      for (const [id, p] of Object.entries(made.spots())) {
        if (host.learn?.isChestOpen(id)) made.setCollected(id, true);
        site.interaction({
          id: `bottle:${id}`,
          label: () => 'Read the message in the bottle',
          x: p.x,
          y: p.y,
          z: p.z,
          radius: 2,
          enabled: () => host.puzzleHost.canAct() && !!host.learn && !host.learn.isChestOpen(id),
          onInteract: () => void readBottle(id, p),
        });
      }
      return true;
    },
    bottleList: () =>
      Object.entries(bottleSite?.spots() ?? {}).map(([id, p]) => ({
        id,
        x: p.x,
        z: p.z,
        read: !!host.learn?.isChestOpen(id),
      })),
    clear() {
      host.world.remove(added.colliders);
      for (const id of added.interactions) host.interactions.remove(id);
      for (const p of added.puzzles) {
        const i = host.puzzles.indexOf(p);
        if (i >= 0) host.puzzles.splice(i, 1);
        p.dispose();
      }
      host.removeChests(added.chests);
      added.colliders.length = added.interactions.length = added.chests.length = added.puzzles.length = 0;
      dropLife();
    },
    dropLife,
  };
  return site;
}

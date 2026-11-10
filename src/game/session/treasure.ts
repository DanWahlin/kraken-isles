import type { Object3D } from 'three/webgpu';
import type { IslesAudio } from '../../audio';
import type { Input } from '../../engine/input';
import type { LearnStore } from '../../learn/store';
import type { CircleObstacle } from '../../world/contracts';
import type { CoveScene } from '../../world/cove-scene';
import type { FarCull } from '../../world/far-cull';
import { createChest, type TreasureChest } from '../chest';
import type { CollisionWorld } from '../collision';
import { COVE_CHESTS } from '../cove-quests';
import type { Interactions } from '../interaction';
import type { Npc } from '../npcs';
import type { SessionStatus } from './types';

export interface TreasureHost {
  status: SessionStatus;
  scene: Object3D;
  /** The lite tier's chests (fewer parts). */
  lite: boolean;
  world: CollisionWorld;
  interactions: Interactions;
  learn: LearnStore | null;
  audio: IslesAudio | null;
  input: Input;
  /** The scripts' cues: Nell opens her chest in one. */
  cues: Map<string, () => Promise<void>>;
  /** Anchorage's cast (its chests sit beside them) and where its content hides from afar. */
  home: { npcs: readonly Npc[]; detail: FarCull };
  bottles: CoveScene['sites']['bottles'];
}

/**
 * The session's treasure: the chests beside their islanders (each grants a Logbook page once) and
 * the message bottles on the beaches. A streamed island's chests come and go with its content.
 */
export type Treasure = ReturnType<typeof createTreasure>;

export function createTreasure(host: TreasureHost) {
  const { status, scene, world, interactions, learn, audio, input, cues, home, bottles } = host;
  const chests: {
    id: string;
    chest: TreasureChest;
    x: number;
    y: number;
    z: number;
    circle: CircleObstacle;
  }[] = [];
  const placeChest = (c: { id: string; side: number; back: number }, n: Npc, detail: FarCull) => {
    const s = Math.sin(n.heading);
    const co = Math.cos(n.heading);
    // NPC-right (for a character facing +heading) is (-cos, +sin) in xz.
    const x = n.home.x + s * (n.spec.out ?? 0) - co * c.side - s * c.back;
    const z = n.home.z + co * (n.spec.out ?? 0) + s * c.side - co * c.back;
    const y = world.surfaceHeightAt(x, z) ?? world.groundAt(x, z);
    return placeChestAt(c.id, x, y, z, n.heading, detail);
  };
  /** A chest at a spot (Thousand-Bough's sit by the booths and behind the falls, not by an NPC). */
  const placeChestAt = (id: string, x: number, y: number, z: number, heading: number, detail: FarCull) => {
    const c = { id };
    const chest = createChest({ lite: host.lite });
    chest.group.position.set(x, y, z);
    chest.group.rotation.y = heading;
    if (learn?.isChestOpen(c.id)) chest.setOpen();
    scene.add(chest.group);
    detail.add(chest.group);
    const circle = { x, z, r: 0.55 };
    world.addCircle(circle);
    chests.push({ id: c.id, chest, x, y, z, circle });
    interactions.add({
      id: `chest:${c.id}`,
      label: () => 'Open the chest',
      x,
      y,
      z,
      radius: 2.2,
      enabled: () => status.mode === 'walk' && !chest.opened && !status.scripting,
      onInteract: () => void openChest(c.id, chest),
    });
    return chest.group;
  };
  for (const c of COVE_CHESTS) {
    const n = home.npcs.find((v) => v.spec.id === c.npc);
    if (n) placeChest(c, n, home.detail);
  }
  /** Takes chests away with their island (whether each is open lives in the save, not the chest). */
  const removeChests = (ids: readonly string[]) => {
    for (const id of ids) {
      const i = chests.findIndex((c) => c.id === id);
      if (i < 0) continue;
      const c = chests[i]!;
      chests.splice(i, 1);
      interactions.remove(`chest:${id}`);
      world.remove([c.circle]);
      c.chest.group.removeFromParent();
      c.chest.dispose();
    }
  };
  async function openChest(id: string, chest: TreasureChest): Promise<void> {
    input.enabled = false;
    audio?.sfx.oneShot('step_wood', chest.group.position, 1);
    await chest.open();
    await learn?.openChest(id);
    input.enabled = !status.paused;
  }
  // Nell opens her chest while she talks you through the prerequisites (the `nell-chest` cue).
  const nellChest = COVE_CHESTS.find((c) => c.npc === 'nell')?.id;
  cues.set('nell-chest', async () => {
    const c = chests.find((v) => v.id === nellChest);
    if (!c) return;
    if (!c.chest.opened) {
      audio?.sfx.oneShot('step_wood', c.chest.group.position, 1);
      await c.chest.open();
    }
    await learn?.openChest(c.id);
  });

  // Message bottles on the beaches (B0.1-B0.4): optional troubleshooting pages.
  const bottleSpots = bottles.spots();
  for (const [id, p] of Object.entries(bottleSpots)) {
    if (learn?.isChestOpen(id)) bottles.setCollected(id, true);
    interactions.add({
      id: `bottle:${id}`,
      label: () => 'Read the message in the bottle',
      x: p.x,
      y: p.y,
      z: p.z,
      radius: 2,
      enabled: () => status.mode === 'walk' && !!learn && !learn.isChestOpen(id) && !status.scripting,
      onInteract: () => void openBottle(id, p),
    });
  }
  async function openBottle(id: string, at: { x: number; y: number; z: number }): Promise<void> {
    input.enabled = false;
    audio?.sfx.oneShot('bottle_pop', at, 0.9);
    bottles.setCollected(id, true);
    await learn?.openChest(id);
    input.enabled = !status.paused;
  }

  return {
    /** Every chest in the world now. */
    chests: chests as readonly Readonly<(typeof chests)[number]>[],
    bottleSpots,
    /** A chest beside an islander (`side` to their right, `back` behind them). */
    placeChest,
    placeChestAt,
    removeChests,
    /** Opens a chest in a script (its lid, then its page), wherever you're standing. */
    async open(id: string): Promise<void> {
      const c = chests.find((v) => v.id === id);
      if (c && !c.chest.opened) {
        audio?.sfx.oneShot('step_wood', c.chest.group.position, 1);
        await c.chest.open();
      }
      await learn?.openChest(id);
    },
    update(dt: number, t: number): void {
      for (const c of chests) c.chest.update(dt, t);
    },
    dispose(): void {
      for (const c of chests) c.chest.dispose();
    },
  };
}

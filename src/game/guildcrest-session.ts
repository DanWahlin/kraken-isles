import type { Object3D } from 'three/webgpu';
import { buildSlice } from '../engine/build-slice';
import { puzzleContent, puzzleOn, textOf } from '../course/puzzles';
import type { CircleObstacle } from '../world/contracts';
import { naturalWaterAt } from '../world/islands/fresh-water-natural';
import { GUILDCREST_ANCHORS } from '../world/islands/guildcrest/anchors';
import { guildcrestWater } from '../world/islands/guildcrest/height';
import type { GuildcrestWorld } from '../world/islands/guildcrest/index';
import { CHARTER_STONE, GUILDCREST, SQUARE, toFrame, toWorld } from '../world/islands/guildcrest/layout';
import { createBottles, type BottleSite } from '../world/sites/bottles';
import { loadVillageKit } from '../world/village/kit';
import { DeckIndex } from '../world/village/walk-decks';
import { createChoiceCard } from './choice-card';
import type { BoxCollider, InlandWater, WalkSurface } from './collision';
import type { CameraShot } from './follow-camera';
import { createGuildcrestCircuits } from './guildcrest-circuits';
import { GUILDCREST_NPCS, guildcrestExtras } from './guildcrest-npcs';
import { guildcrestNpcScript } from './guildcrest-quests';
import type { IslandContentHost } from './island-code';
import { MARKET_PUZZLE, marketStall } from './market/stalls';
import { NpcCrowd, type Npc } from './npcs';
import type { Puzzle } from './puzzles/types';
import type { ScriptStep } from './script';

/**
 * Guildcrest's content in the play session (docs/specs/ISLAND-04-guildcrest.md §4-§7, W.3-W.8): the
 * cast at the island's anchors, its chests and bottles, the town's, abbey's and ridge's colliders and
 * camera boxes, its walk surfaces (the quay, the brae's and the tower's stairs, the terrace, the
 * cloister's walks) and its water, and the set pieces the scripts wait on (the cues: the song chart,
 * the Charter Stone, the chained rack, the two circuits, the chests and the Seal). It talks to the
 * world only through `GuildcrestWorld` and its layout data, and to the session through the host.
 */
export interface GuildcrestContent {
  /** The island's walk surfaces, live once the world's streamed. */
  readonly surface: WalkSurface;
  /** The burn, the linn's pool and the lochan (wade their shallows). */
  inland(x: number, z: number, ground: number, out: InlandWater): boolean;
  setup(world: GuildcrestWorld): Promise<{ roots: Object3D[]; reveal(): void }>;
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

/** Within this distance (m) of the island's centre its cast runs. */
const NEAR = 800;

/** An island frame point (u, y, v) and what to look at, as a camera shot. */
function shotUv(u: number, y: number, v: number, tu: number, ty: number, tv: number): CameraShot {
  const p = toWorld(u, v);
  const t = toWorld(tu, tv);
  return { x: p.x, y, z: p.z, tx: t.x, ty, tz: t.z };
}

const RACK = GUILDCREST_ANCHORS.chainRack;
const SHOTS = {
  // Over the square from its south-west, down at the Charter Stone.
  charter: shotUv(
    CHARTER_STONE.u - 9,
    SQUARE.y + 5.2,
    CHARTER_STONE.v - 7,
    CHARTER_STONE.u,
    SQUARE.y + 1.6,
    CHARTER_STONE.v,
  ),
  // From the north walk into the library's bay, at the chained tools.
  chains: { ...shotUv(24.4, 40.2, 142.6, 24.6, 37.2, 152.6), ty: RACK.y + 1.2 },
  // The inn's porch: Lyra's players by the music stand.
  chart: shotUv(-174, 7.2, 30, -162, 4, 40),
} as const;

/**
 * The chests the island places (spec §3.10, as built): on the cloister's west walk by the scriptorium,
 * in the chained library's bay, and in the guildhall yard by its north wall. `face` is where its lid
 * opens toward (frame).
 */
const CHESTS = [
  { id: 'C4.1', u: 7.1, v: 124.6, face: [1, 0] },
  { id: 'C4.2', u: 27.6, v: 147.8, face: [-0.4, -1] },
  { id: 'C4.3', u: 104, v: 164.6, face: [0, -1] },
] as const;

/** The message bottles (the chapter's troubleshooting, B4.1-B4.4). */
const BOTTLES = [
  { id: 'B4.1', u: -46.5, v: 82.5 },
  { id: 'B4.2', u: -86.2, v: 36.6 },
  { id: 'B4.3', u: 57.2, v: 144.4 },
  { id: 'B4.4', u: 82.6, v: 163.2 },
] as const;

/** Every chest and bottle id the island places (`IslandCode.chests`). */
export const GUILDCREST_CHEST_IDS: readonly string[] = [
  ...CHESTS.map((c) => c.id),
  ...BOTTLES.map((b) => b.id),
];

export function createGuildcrestContent(host: IslandContentHost): GuildcrestContent {
  let world: GuildcrestWorld | null = null;
  let decks: DeckIndex | null = null;
  let crowd: NpcCrowd | null = null;
  let bottleSite: BottleSite | null = null;
  let disposed = false;
  const ids = new Set(GUILDCREST_NPCS.map((n) => n.id));
  const q = () => host.puzzleHost.quests();
  const water = guildcrestWater();
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const card = createChoiceCard({ blocked: () => !!host.learn?.busy, reduced: host.reducedMotion });
  /** The set pieces' card: it has the keys while it's up. */
  const ask = async (a: Parameters<typeof card.ask>[0]): Promise<string> => {
    host.setModal(true);
    try {
      return await card.ask(a);
    } finally {
      host.setModal(false);
    }
  };

  const surface: WalkSurface = {
    heightAt: (x, z, y) => decks?.heightAt(x, z, y) ?? null,
    kind: (x, z) => (decks?.woodAt(x, z) ? 'wood' : 'stone'),
  };

  /** Bumped by each teardown, so a setup still building for a freed world stops. */
  let generation = 0;
  /** What this setup added to the session's world, interactions, chests and puzzles. */
  const added = {
    colliders: [] as (BoxCollider | CircleObstacle)[],
    interactions: [] as string[],
    chests: [] as string[],
    puzzles: [] as Puzzle[],
  };

  // ---- Cues the scripts wait on (spec W.4) ----

  /**
   * The song chart (puzzles/song-chart.json, a ceremony): the players play from memory and drift
   * apart; you hand out the chart, and they play the song the same way.
   */
  host.cues.set('gc-chart', async () => {
    if (!puzzleOn('song-chart') || !world) return;
    const T = (k: string) => textOf(puzzleContent('song-chart'), k);
    const lyra = GUILDCREST_ANCHORS.lyra;
    const at = { x: lyra.x, y: lyra.y + 1.2, z: lyra.z };
    const play = async (n: number, apart: boolean) => {
      for (let i = 0; i < n; i++) {
        host.audio?.sfx.oneShot('lute_strum', at, 0.8);
        // Out of step: the second player comes in late.
        if (apart) {
          await wait(host.reducedMotion() ? 120 : 230);
          host.audio?.sfx.oneShot('lute_strum', at, 0.55);
        }
        await wait(host.reducedMotion() ? 260 : 520);
      }
    };
    host.frame(SHOTS.chart);
    const head = { eyebrow: 'Lyra Wren', title: T('playFree') };
    const free = await ask({ ...head, prompt: T('hint1'), options: [{ id: 'free', label: T('playFree') }] });
    if (!free || !world) return card.close();
    card.busy(true);
    await play(3, true);
    card.busy(false);
    card.message(T('apart'), 'bad');
    await wait(1100);
    const hand = await ask({
      ...head,
      title: T('handOut'),
      prompt: T('hint2'),
      options: [{ id: 'hand', label: T('handOut') }],
    });
    if (!hand || !world) return card.close();
    host.audio?.sfx.oneShot('quill', at, 0.6);
    const together = await ask({
      ...head,
      title: T('playChart'),
      prompt: T('hint2'),
      options: [{ id: 'chart', label: T('playChart') }],
    });
    if (!together || !world) return card.close();
    card.busy(true);
    await play(4, false);
    host.audio?.sfx.oneShot('chime_solve', at, 0.8);
    card.message(T('together'), 'good');
    await wait(1300);
    card.message(T('unlocked'), 'good');
    await wait(1300);
    card.busy(false);
    card.close();
    host.backToTalk();
  });

  /** The Charter Stone: the camera turns to it for its matching quiz (M4.1, the next step). */
  host.cues.set('gc-charter', async () => {
    host.frame(SHOTS.charter);
    await wait(host.reducedMotion() ? 500 : 1400);
  });

  /** The chained library: the camera turns to the tools on their chains. */
  host.cues.set('gc-chains', async () => {
    host.frame(SHOTS.chains);
    await wait(host.reducedMotion() ? 500 : 1400);
  });

  for (const c of CHESTS)
    host.cues.set(`gc-chest:${c.id}`, async () => {
      await host.openChest(c.id);
    });

  // ---- The two circuits (spec §5) and the Seal (§4.5) ----
  const circuits = createGuildcrestCircuits(host, {
    ask,
    card: {
      message: (t, tone) => card.message(t, tone),
      busy: (on) => card.busy(on),
      close: () => card.close(),
      choose: (id) => card.choose(id),
    },
  });
  host.cues.set('gc-book', () => circuits.cue('book'));
  host.cues.set('gc-belt', () => circuits.cue('belt'));
  host.cues.set('gc-seal', () => circuits.seal());

  async function setup(w: GuildcrestWorld): Promise<{ roots: Object3D[]; reveal(): void }> {
    const none = { roots: [] as Object3D[], reveal() {} };
    if (disposed || world) return none;
    world = w;
    const gen = generation;
    const gone = () => disposed || gen !== generation;
    const works = w.works;
    decks = new DeckIndex(works.decks, toFrame);
    for (const b of works.colliders) host.world.addBox(b);
    for (const c of works.circles) host.world.addCircle(c);
    for (const b of works.cameraBoxes) host.world.addCameraBox(b);
    added.colliders.push(...works.colliders, ...works.circles, ...works.cameraBoxes);
    w.setSailPace(host.reducedMotion() ? 0.25 : 1);

    // The cast at their anchors (on the walk surfaces there), a character a slice.
    const anchors = { ...w.anchors } as Record<string, (typeof w.anchors)['lyra']>;
    const cast = [
      ...GUILDCREST_NPCS,
      ...guildcrestExtras(anchors).filter(
        (n) => n.id !== marketStall('guildcrest').keeper.npc || puzzleOn(MARKET_PUZZLE),
      ),
    ];
    const made = await NpcCrowd.createAsync(
      host.characters,
      cast,
      anchors,
      host.world,
      host.tier,
      host.camera,
      { ...anchors.lyra! },
      buildSlice,
      () => !gone(),
    );
    if (gone()) {
      made.dispose();
      return none;
    }
    crowd = made;
    await buildSlice();
    const roots: Object3D[] = [];
    for (const n of crowd.list) {
      n.character.group.visible = false;
      host.scene.add(n.character.group);
      host.detail.add(n.character.group);
      host.addNpcTalk(n);
      added.interactions.push(`npc:${n.spec.id}`);
      roots.push(n.character.group);
    }
    await buildSlice();
    if (gone()) return none;

    for (const c of CHESTS) {
      const p = toWorld(c.u, c.v);
      const y = host.world.surfaceHeightAt(p.x, p.z) ?? host.world.groundAt(p.x, p.z);
      const f = toWorld(c.u + c.face[0], c.v + c.face[1]);
      const g = host.placeChest(c.id, p.x, y, p.z, Math.atan2(f.x - p.x, f.z - p.z), host.detail);
      if (!g) continue;
      added.chests.push(c.id);
      g.visible = false;
      roots.push(g);
    }
    // Message bottles (B4.1-B4.4): the chapter's troubleshooting.
    const kit = await loadVillageKit();
    if (gone()) return none;
    bottleSite = createBottles({
      kit,
      ground: (x, z) => host.world.surfaceHeightAt(x, z) ?? host.world.groundAt(x, z),
      spots: BOTTLES.map((b, i) => ({ id: b.id, ...toWorld(b.u, b.v), yaw: 0.6 + i * 1.9 })),
    });
    bottleSite.group.visible = false;
    host.scene.add(bottleSite.group);
    host.detail.add(bottleSite.group);
    roots.push(bottleSite.group);
    for (const [id, p] of Object.entries(bottleSite.spots())) {
      if (host.learn?.isChestOpen(id)) bottleSite.setCollected(id, true);
      added.interactions.push(`bottle:${id}`);
      host.interactions.add({
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
    // The circuits: their stations and lamps, laid out as the save says.
    for (const p of circuits.create(w)) {
      host.puzzles.push(p);
      added.puzzles.push(p);
    }
    return {
      roots,
      reveal() {
        for (const r of roots) r.visible = true;
      },
    };
  }

  async function readBottle(id: string, at: { x: number; y: number; z: number }): Promise<void> {
    host.audio?.sfx.oneShot('bottle_pop', at, 0.9);
    bottleSite?.setCollected(id, true);
    await host.learn?.openChest(id);
  }

  function teardown(): void {
    generation++;
    card.close();
    circuits.teardown();
    if (!world) return;
    host.world.remove(added.colliders);
    for (const id of added.interactions) host.interactions.remove(id);
    for (const p of added.puzzles) {
      const i = host.puzzles.indexOf(p);
      if (i >= 0) host.puzzles.splice(i, 1);
      p.dispose();
    }
    host.removeChests(added.chests);
    added.colliders.length = added.interactions.length = added.chests.length = added.puzzles.length = 0;
    crowd?.dispose();
    crowd = null;
    if (bottleSite) {
      bottleSite.group.removeFromParent();
      bottleSite.dispose();
      bottleSite = null;
    }
    decks = null;
    world = null;
  }

  return {
    surface,
    inland(x, z, ground, out) {
      if (!world) return false;
      return naturalWaterAt(water, x, z, ground, out);
    },
    setup,
    teardown,
    get npcs() {
      return crowd?.list ?? [];
    },
    ids,
    script: (id) => guildcrestNpcScript(id, q()),
    updateNpcs(dt, at, eye) {
      if (crowd && Math.hypot(eye.x - GUILDCREST.center.x, eye.z - GUILDCREST.center.z) < NEAR)
        crowd.update(dt, at);
    },
    update(dt) {
      if (world) circuits.update(dt);
    },
    bottles: () =>
      Object.entries(bottleSite?.spots() ?? {}).map(([id, p]) => ({
        id,
        x: p.x,
        z: p.z,
        read: !!host.learn?.isChestOpen(id),
      })),
    debug: {
      ready: () => !!world,
      decks: () => world?.works.decks.length ?? 0,
      card: () => card.view,
      choose: (id: string) => card.choose(id),
      /** Plays the Seal's moment (for a test's shots). */
      seal: () => circuits.seal(),
      lamp: (key: string) => circuits.debug.lamp(key),
      stations: () => circuits.debug.spots(),
      /** Every chest and bottle spot (tests walk to each). */
      chestSpots: () => [
        ...CHESTS.map((c) => ({ id: c.id, ...toWorld(c.u, c.v) })),
        ...BOTTLES.map((b) => ({ id: b.id, ...toWorld(b.u, b.v) })),
      ],
    },
    dispose() {
      disposed = true;
      teardown();
      card.dispose();
    },
  };
}

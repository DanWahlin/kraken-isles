import type { Object3D } from 'three/webgpu';
import { puzzleContent, puzzleOn, textOf } from '../course/puzzles';
import { naturalWaterAt } from '../world/islands/fresh-water-natural';
import { SUNSPIRE_ANCHORS } from '../world/islands/sunspire/anchors';
import { sunspireWater } from '../world/islands/sunspire/height';
import type { SunspireWorld } from '../world/islands/sunspire/index';
import {
  CARAVANSERAI,
  headingUv,
  SQUARE,
  SUNSPIRE,
  toFrame,
  toWorld,
  WELL,
} from '../world/islands/sunspire/layout';
import { SQUARE_PROPS } from '../world/islands/sunspire/town';
import { DeckIndex } from '../world/village/walk-decks';
import { createChoiceCard } from './choice-card';
import type { InlandWater, WalkSurface } from './collision';
import type { CameraShot } from './follow-camera';
import { createSunspireCircuits } from './sunspire-circuits';
import { SUNSPIRE_NPCS, sunspireExtras } from './sunspire-npcs';
import { SUNSPIRE_QUESTS } from './sunspire-quests';
import type { IslandContentHost } from './island-code';
import { createIslandSite } from './island-site';
import { MARKET_PUZZLE, marketStall } from './market/stalls';
import type { Npc } from './npcs';
import type { ScriptStep } from './script';

/**
 * Sunspire's content in the play session (docs/specs/ISLAND-05-sunspire-sands.md §4-§6): the cast at
 * the island's anchors, its chests and bottles, the port's, the mesa's and the Sunspire's colliders
 * and camera boxes, its walk surfaces (the quay, the courts, the two stairs, the terrace) and its
 * water, and the set pieces the scripts wait on (the cues: the gear song, the scales, the well, the
 * two circuits, the chests and the Seal). It talks to the world only through `SunspireWorld` and its
 * layout data, and to the session through the host.
 */
export interface SunspireContent {
  /** The island's walk surfaces, live once the world's streamed. */
  readonly surface: WalkSurface;
  /** The cistern, the oasis pool and the falaj (wade their shallows). */
  inland(x: number, z: number, ground: number, out: InlandWater): boolean;
  setup(world: SunspireWorld): Promise<{ roots: Object3D[]; reveal(): void }>;
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

const SHOTS = {
  // Over the square from its south-west, down at the weighing table.
  scales: shotUv(
    SQUARE_PROPS.scales.u - 8,
    SQUARE.y + 4.6,
    SQUARE_PROPS.scales.v - 7,
    SQUARE_PROPS.scales.u,
    SQUARE.y + 1.4,
    SQUARE_PROPS.scales.v,
  ),
  // From the camp's side at the well and the tents round it.
  well: shotUv(WELL.u + 8, WELL.y + 4.4, WELL.v + 8, WELL.u, WELL.y + 1.2, WELL.v),
  // Inside the caravanserai's gate: Lyra and her players under the arcade.
  song: shotUv(
    CARAVANSERAI.u - 5,
    CARAVANSERAI.y + 2.6,
    CARAVANSERAI.v - 6,
    CARAVANSERAI.u,
    CARAVANSERAI.y + 1.3,
    CARAVANSERAI.v + 4.6,
  ),
} as const;

/**
 * The chests the island places (spec §3): in the caravanserai's court, by the Signal House's wall,
 * and in the Crate Yard by its east wall. `face` is where its lid opens toward (frame).
 */
const CHESTS = [
  { id: 'C5.1', u: CARAVANSERAI.u + 6.4, v: CARAVANSERAI.v - 4.6, face: [-1, 0.3] },
  { id: 'C5.2', u: 58.6, v: 79.4, face: [0, -1] },
  { id: 'C5.3', u: 132.6, v: 11.6, face: [-1, 0.4] },
] as const;

/** The message bottles (the chapter's troubleshooting, B5.1-B5.4). */
const BOTTLES = [
  { id: 'B5.1', u: -166, v: -91.5 },
  { id: 'B5.2', u: -12, v: -12.5 },
  { id: 'B5.3', u: -76.5, v: 67.5 },
  { id: 'B5.4', u: -60, v: -108 },
] as const;

/** Every chest and bottle id the island places (`IslandCode.chests`). */
export const SUNSPIRE_CHEST_IDS: readonly string[] = [
  ...CHESTS.map((c) => c.id),
  ...BOTTLES.map((b) => b.id),
];

export function createSunspireContent(host: IslandContentHost): SunspireContent {
  let world: SunspireWorld | null = null;
  let decks: DeckIndex | null = null;
  let disposed = false;
  const ids = new Set(SUNSPIRE_NPCS.map((n) => n.id));
  const q = () => host.puzzleHost.quests();
  const water = sunspireWater();
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
  /** What a setup adds to the session's world, interactions, chests and puzzles. */
  const site = createIslandSite(host);

  // ---- Cues the scripts wait on ----

  /**
   * The gear song (puzzles/gear-song.json, a ceremony): the players play what the chart says, and
   * nobody can hear the singer; you connect the gear the session needs, and the song comes through.
   */
  host.cues.set('ss-song', async () => {
    if (!puzzleOn('gear-song') || !world) return;
    const T = (k: string) => textOf(puzzleContent('gear-song'), k);
    const lyra = SUNSPIRE_ANCHORS.lyra;
    const at = { x: lyra.x, y: lyra.y + 1.2, z: lyra.z };
    const play = async (n: number, volume: number) => {
      for (let i = 0; i < n; i++) {
        host.audio?.sfx.oneShot('lute_strum', at, volume);
        await wait(host.reducedMotion() ? 260 : 520);
      }
    };
    host.frame(SHOTS.song);
    const head = { eyebrow: 'Lyra Wren', title: T('playChart') };
    const first = await ask({
      ...head,
      prompt: T('hint1'),
      options: [{ id: 'chart', label: T('playChart') }],
    });
    if (!first || !world) return card.close();
    card.busy(true);
    await play(3, 0.3);
    card.busy(false);
    card.message(T('faint'), 'bad');
    await wait(1100);
    const plug = await ask({
      ...head,
      title: T('connect'),
      prompt: T('hint2'),
      options: [{ id: 'connect', label: T('connect') }],
    });
    if (!plug || !world) return card.close();
    host.audio?.sfx.oneShot('lever', at, 0.7);
    const again = await ask({
      ...head,
      title: T('playGear'),
      prompt: T('hint2'),
      options: [{ id: 'gear', label: T('playGear') }],
    });
    if (!again || !world) return card.close();
    card.busy(true);
    await play(4, 0.9);
    host.audio?.sfx.oneShot('chime_solve', at, 0.8);
    card.message(T('clear'), 'good');
    await wait(1300);
    card.message(T('unlocked'), 'good');
    await wait(1300);
    card.busy(false);
    card.close();
    host.backToTalk();
  });

  /** The weighing table: the camera turns to it for the matching quiz (M5.1, the next step). */
  host.cues.set('ss-scales', async () => {
    host.frame(SHOTS.scales);
    await wait(host.reducedMotion() ? 500 : 1400);
  });

  /** The well: the camera turns to it and the tents round it (one well for every tent). */
  host.cues.set('ss-well', async () => {
    host.frame(SHOTS.well);
    await wait(host.reducedMotion() ? 500 : 1400);
  });

  for (const c of CHESTS)
    host.cues.set(`ss-chest:${c.id}`, async () => {
      await host.openChest(c.id);
    });

  // ---- The two circuits (spec §5) and the Seal ----
  const circuits = createSunspireCircuits(host, {
    ask,
    card: {
      message: (t, tone) => card.message(t, tone),
      busy: (on) => card.busy(on),
      close: () => card.close(),
      choose: (id) => card.choose(id),
    },
  });
  host.cues.set('ss-signal', () => circuits.cue('signal'));
  host.cues.set('ss-crate', () => circuits.cue('crate'));
  host.cues.set('ss-seal', () => circuits.seal());

  async function setup(w: SunspireWorld): Promise<{ roots: Object3D[]; reveal(): void }> {
    const none = { roots: [] as Object3D[], reveal() {} };
    if (disposed || world) return none;
    world = w;
    const gen = generation;
    const gone = () => disposed || gen !== generation;
    const works = w.works;
    decks = new DeckIndex(works.decks, toFrame);
    site.colliders(works.colliders, works.circles, works.cameraBoxes);

    // The cast at their anchors (on the walk surfaces there), a character a slice.
    const anchors = { ...w.anchors } as Record<string, (typeof w.anchors)['lyra']>;
    const cast = [
      ...SUNSPIRE_NPCS,
      ...sunspireExtras(anchors).filter(
        (n) => n.id !== marketStall('sunspire').keeper.npc || puzzleOn(MARKET_PUZZLE),
      ),
    ];
    const roots: Object3D[] = [];
    if (!(await site.cast({ cast, anchors, fallback: anchors.lyra!, alive: () => !gone(), roots })))
      return none;

    for (const c of CHESTS) {
      const p = toWorld(c.u, c.v);
      const y = host.world.surfaceHeightAt(p.x, p.z) ?? host.world.groundAt(p.x, p.z);
      const f = toWorld(c.u + c.face[0], c.v + c.face[1]);
      site.chest(c.id, p.x, y, p.z, Math.atan2(f.x - p.x, f.z - p.z), roots);
    }
    // Message bottles (B5.1-B5.4): the chapter's troubleshooting.
    const bottled = await site.bottles({
      spots: BOTTLES.map((b, i) => ({ id: b.id, ...toWorld(b.u, b.v), yaw: 0.6 + i * 1.9 })),
      ground: (x, z) => host.world.surfaceHeightAt(x, z) ?? host.world.groundAt(x, z),
      alive: () => !gone(),
      roots,
    });
    if (!bottled) return none;
    // The circuits: their stations and lamps, laid out as the save says.
    for (const p of circuits.create(w)) site.puzzle(p);
    return {
      roots,
      reveal() {
        for (const r of roots) r.visible = true;
      },
    };
  }

  function teardown(): void {
    generation++;
    card.close();
    circuits.teardown();
    if (!world) return;
    site.clear();
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
      return site.npcs;
    },
    ids,
    script: (id) => SUNSPIRE_QUESTS.npcScript(id, q()),
    updateNpcs(dt, at, eye) {
      if (Math.hypot(eye.x - SUNSPIRE.center.x, eye.z - SUNSPIRE.center.z) < NEAR) site.crowd?.update(dt, at);
    },
    update(dt) {
      if (world) circuits.update(dt);
    },
    bottles: () => site.bottleList(),
    debug: {
      ready: () => !!world,
      decks: () => world?.works.decks.length ?? 0,
      card: () => card.view,
      choose: (id: string) => card.choose(id),
      /** Plays the Seal's moment (for a test's shots). */
      seal: () => circuits.seal(),
      lamp: (key: string) => circuits.debug.lamp(key),
      sealing: () => circuits.debug.sealing(),
      /** Every third tread's middle of each railed flight, and the way it climbs (tests push at its rails). */
      railedTreads: () =>
        (world?.works.flights ?? []).flatMap(({ a, e }) => {
          const out: { x: number; y: number; z: number; heading: number }[] = [];
          const up = e[2] > a[2];
          const heading = up ? headingUv(e[0] - a[0], e[1] - a[1]) : headingUv(a[0] - e[0], a[1] - e[1]);
          for (let t = 0.15; t < 0.9; t += 0.25) {
            const p = toWorld(a[0] + (e[0] - a[0]) * t, a[1] + (e[1] - a[1]) * t);
            out.push({ ...p, y: a[2] + (e[2] - a[2]) * t, heading });
          }
          return out;
        }),
      /** Where each flight comes out at its top: where a climber arrives. */
      stairHeads: () =>
        (world?.works.flights ?? []).map(({ a, e }) => {
          const top = e[2] > a[2] ? e : a;
          return { ...toWorld(top[0], top[1]), y: top[2] };
        }),
      /** The island's lettered signs (their sign names, place and facing): tests look at each. */
      signs: () =>
        world?.works.signs.map((g) => ({ lines: g.lines, x: g.x, y: g.y, z: g.z, heading: g.heading })) ?? [],
      /** Whether the world shows the standing beam, the opened crate or the Seal's dress. */
      showing: (what: 'beam' | 'crate' | 'sealed') => circuits.debug.showing(what),
      /** The court mirror's bearing and whether its beam lands on the Sunspire. */
      mirror: () => circuits.debug.mirror(),
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

import type { Object3D } from 'three/webgpu';
import { puzzleContent, puzzleOn, textOf } from '../course/puzzles';
import type { IslandId } from '../islands/registry';
import type { IslandFrameKit } from '../world/islands/frame';
import type { IslandOut } from '../world/islands/frame-build';
import { DeckIndex } from '../world/village/walk-decks';
import { createChoiceCard, type ChoiceAsk } from './choice-card';
import type { InlandWater, WalkSurface } from './collision';
import type { CameraShot } from './follow-camera';
import type { IslandContentHost } from './island-code';
import type { IslandCircuits } from './island-circuits';
import { createIslandSite } from './island-site';
import { MARKET_PUZZLE, marketStall } from './market/stalls';
import type { Npc, NpcSpec } from './npcs';
import type { CircuitHost } from './puzzles/circuit/puzzle';
import type { ScriptStep } from './script';

/**
 * A frame island's content in the play session, the part every island shares: the cast at the
 * island's anchors, its chests and bottles, its colliders and camera boxes, its walk surfaces (the
 * quay, the paved places, the stairs' flights), the set pieces' choice card, its circuits' puzzles and
 * the hooks its tests read. An island's own `<island>-session.ts` gives the rest as an `IslandPlan`:
 * who and what stands where, and its set pieces (the cues its scripts wait on). The content talks to
 * the world only through `IslandOut` and the island's layout data, and to the session through the host.
 */
export interface FrameIslandContent<W> {
  /** The island's walk surfaces, live once the world's streamed. */
  readonly surface: WalkSurface;
  /** The island's fresh water to wade (false where there's none). */
  inland(x: number, z: number, ground: number, out: InlandWater): boolean;
  setup(world: W): Promise<{ roots: Object3D[]; reveal(): void }>;
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

/** What the content reads of an island's world. */
export interface ContentWorld {
  works: Pick<IslandOut, 'colliders' | 'circles' | 'cameraBoxes' | 'decks' | 'flights' | 'signs'>;
  anchors: Readonly<Record<string, { x: number; y: number; z: number; heading: number }>>;
}

/** A chest's spot (island frame); its lid opens toward `face`. */
export interface ChestSpot {
  readonly id: string;
  readonly u: number;
  readonly v: number;
  readonly face: readonly [number, number];
}

/** A message bottle's spot (island frame). */
export interface BottleSpot {
  readonly id: string;
  readonly u: number;
  readonly v: number;
}

/** What an island's set pieces work with. */
export interface PieceTools<W> {
  host: IslandContentHost;
  /** The streamed world (null until it's there, and once it's gone). */
  world(): W | null;
  /** The set pieces' card: it has the keys while it's up. */
  ask(a: ChoiceAsk): Promise<string>;
  card: ReturnType<typeof createChoiceCard>;
  /** The card as a circuit's host takes it. */
  circuitCard: { ask(a: ChoiceAsk): Promise<string>; card: CircuitHost['card'] };
  wait(ms: number): Promise<unknown>;
  /** Registers a cue the scripts wait on, under the island's prefix (`look` → `ss-look`). */
  cue(name: string, run: () => Promise<void>): void;
  /** A cue that turns the camera to `shot` and holds `ms` (0.5 s with reduced motion). */
  lookCue(name: string, shot: CameraShot, ms?: number): void;
}

/** An island's own part of its content. */
export interface IslandPlan<W extends ContentWorld> {
  id: IslandId;
  /** The prefix of its cues' names (`ss`: `ss-chest:C5.1`, `ss-seal`). */
  prefix: string;
  frame: IslandFrameKit;
  /** Its middle: its cast runs while the camera is within 800 m of it. */
  center: { x: number; z: number };
  cast: readonly NpcSpec[];
  /** The islanders with barks, and the market's keeper (whoever's anchor is there). */
  extras(anchors: Readonly<Record<string, { x: number; z: number }>>): NpcSpec[];
  /** A cast member's script for where the quests stand. */
  npcScript(npc: string, quests: Readonly<Record<string, string>>): { steps: readonly ScriptStep[] } | null;
  chests: readonly ChestSpot[];
  bottles: readonly BottleSpot[];
  inland?(x: number, z: number, ground: number, out: InlandWater): boolean;
  /** The world has arrived (before its cast is built). */
  ready?(world: W): void;
  /**
   * The island's set pieces: registers the cues only it has and makes its circuits (their cues, by
   * kind, and the Seal's are registered for it: `<prefix>-<kind>`, `<prefix>-seal`).
   */
  pieces(tools: PieceTools<W>): {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- each island's kinds and shows are its own
    circuits: IslandCircuits<W, any, any>;
    kinds: readonly string[];
    /** Frees what the set pieces made (an overlay, a listener). */
    dispose?(): void;
  };
  /** More hooks for the island's tests. */
  debug?(circuits: IslandCircuits<W, string, string>): Record<string, (...args: never[]) => unknown>;
}

/** Within this distance (m) of the island's centre its cast runs. */
const NEAR = 800;

/** Every chest and bottle id a plan places (`IslandCode.chests`). */
export function chestIds(chests: readonly ChestSpot[], bottles: readonly BottleSpot[]): readonly string[] {
  return [...chests.map((c) => c.id), ...bottles.map((b) => b.id)];
}

/** An island frame point (u, y, v) and what to look at, as a camera shot. */
export function frameShot(
  frame: IslandFrameKit,
  u: number,
  y: number,
  v: number,
  tu: number,
  ty: number,
  tv: number,
): CameraShot {
  const p = frame.toWorld(u, v);
  const t = frame.toWorld(tu, tv);
  return { x: p.x, y, z: p.z, tx: t.x, ty, tz: t.z };
}

/**
 * Lyra's song (a `ceremony` puzzle), the same three beats on every island: the band plays it the old
 * way and it goes wrong, you make the chapter's one change, and they play it right.
 */
export interface BandSong {
  /** The puzzle's name in the pack; its text keys name each button and message. */
  puzzle: string;
  shot: CameraShot;
  /** Where the band plays (the strums' place). */
  at: { x: number; y: number; z: number };
  /** The first ask: its button's id and text key. */
  first: readonly [id: string, key: string];
  /** The band's first try: how it goes wrong (`strum` plays one chord, then waits its gap). */
  falter(strum: (volume: number, gapMs: number, reducedGapMs?: number) => Promise<void>): Promise<void>;
  /** The message when it has gone wrong. */
  wrong: string;
  /** The change you make: its button's id and text key, and its sound. */
  fix: readonly [id: string, key: string, sfx: 'lever' | 'quill'];
  /** The second playing: its button's id and text key. */
  again: readonly [id: string, key: string];
  /** The message when it holds. */
  right: string;
  /** How loud the four chords of the second playing are (0.9 unless given). */
  chord?: number;
}

/** Plays a band's song on the island's card (nothing where the course has the puzzle off). */
export async function playBandSong<W>(t: PieceTools<W>, song: BandSong): Promise<void> {
  const { host, card, ask, wait } = t;
  if (!puzzleOn(song.puzzle) || !t.world()) return;
  const T = (k: string) => textOf(puzzleContent(song.puzzle), k);
  const strum = async (volume: number, gapMs: number, reducedGapMs = 260) => {
    host.audio?.sfx.oneShot('lute_strum', song.at, volume);
    await wait(host.reducedMotion() ? reducedGapMs : gapMs);
  };
  host.frame(song.shot);
  const head = { eyebrow: 'Lyra Wren', title: T(song.first[1]) };
  const first = await ask({
    ...head,
    prompt: T('hint1'),
    options: [{ id: song.first[0], label: T(song.first[1]) }],
  });
  if (!first || !t.world()) return card.close();
  card.busy(true);
  await song.falter(strum);
  card.busy(false);
  card.message(T(song.wrong), 'bad');
  await wait(1100);
  const fixed = await ask({
    ...head,
    title: T(song.fix[1]),
    prompt: T('hint2'),
    options: [{ id: song.fix[0], label: T(song.fix[1]) }],
  });
  if (!fixed || !t.world()) return card.close();
  host.audio?.sfx.oneShot(song.fix[2], song.at, song.fix[2] === 'quill' ? 0.6 : 0.7);
  const again = await ask({
    ...head,
    title: T(song.again[1]),
    prompt: T('hint2'),
    options: [{ id: song.again[0], label: T(song.again[1]) }],
  });
  if (!again || !t.world()) return card.close();
  card.busy(true);
  for (let i = 0; i < 4; i++) await strum(song.chord ?? 0.9, 520);
  host.audio?.sfx.oneShot('chime_solve', song.at, 0.8);
  card.message(T(song.right), 'good');
  await wait(1300);
  card.message(T('unlocked'), 'good');
  await wait(1300);
  card.busy(false);
  card.close();
  host.backToTalk();
}

export function createFrameIslandContent<W extends ContentWorld>(
  host: IslandContentHost,
  plan: IslandPlan<W>,
): FrameIslandContent<W> {
  const { toWorld, toFrame, headingUv } = plan.frame;
  let world: W | null = null;
  let decks: DeckIndex | null = null;
  let disposed = false;
  const ids = new Set(plan.cast.map((n) => n.id));
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const card = createChoiceCard({ blocked: () => !!host.learn?.busy, reduced: host.reducedMotion });
  const ask = async (a: ChoiceAsk): Promise<string> => {
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
  const cue = (name: string, run: () => Promise<void>) => void host.cues.set(`${plan.prefix}-${name}`, run);
  const pieces = plan.pieces({
    host,
    world: () => world,
    ask,
    card,
    circuitCard: {
      ask,
      card: {
        message: (t, tone) => card.message(t, tone),
        busy: (on) => card.busy(on),
        close: () => card.close(),
        choose: (id) => card.choose(id),
      },
    },
    wait,
    cue,
    lookCue(name, shot, ms = 1400) {
      cue(name, async () => {
        host.frame(shot);
        await wait(host.reducedMotion() ? 500 : ms);
      });
    },
  });
  const { circuits, kinds } = pieces;
  for (const c of plan.chests)
    cue(`chest:${c.id}`, async () => {
      await host.openChest(c.id);
    });
  for (const kind of kinds) cue(kind, () => circuits.cue(kind));
  cue('seal', () => circuits.seal());

  const groundAt = (x: number, z: number) => host.world.surfaceHeightAt(x, z) ?? host.world.groundAt(x, z);

  async function setup(w: W): Promise<{ roots: Object3D[]; reveal(): void }> {
    const none = { roots: [] as Object3D[], reveal() {} };
    if (disposed || world) return none;
    world = w;
    const gen = generation;
    const gone = () => disposed || gen !== generation;
    const works = w.works;
    decks = new DeckIndex(works.decks, toFrame);
    site.colliders(works.colliders, works.circles, works.cameraBoxes);
    plan.ready?.(w);

    // The cast at their anchors (on the walk surfaces there), a character a slice.
    const anchors = { ...w.anchors };
    const keeper = marketStall(plan.id).keeper.npc;
    const cast = [
      ...plan.cast,
      ...plan.extras(anchors).filter((n) => n.id !== keeper || puzzleOn(MARKET_PUZZLE)),
    ];
    const roots: Object3D[] = [];
    if (!(await site.cast({ cast, anchors, fallback: anchors.lyra!, alive: () => !gone(), roots })))
      return none;

    for (const c of plan.chests) {
      const p = toWorld(c.u, c.v);
      const f = toWorld(c.u + c.face[0], c.v + c.face[1]);
      site.chest(c.id, p.x, groundAt(p.x, p.z), p.z, Math.atan2(f.x - p.x, f.z - p.z), roots);
    }
    // Message bottles: the chapter's troubleshooting.
    const bottled = await site.bottles({
      spots: plan.bottles.map((b, i) => ({ id: b.id, ...toWorld(b.u, b.v), yaw: 0.6 + i * 1.9 })),
      ground: groundAt,
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
    inland: (x, z, ground, out) => (world && plan.inland ? plan.inland(x, z, ground, out) : false),
    setup,
    teardown,
    get npcs() {
      return site.npcs;
    },
    ids,
    script: (id) => plan.npcScript(id, host.puzzleHost.quests()),
    updateNpcs(dt, at, eye) {
      if (Math.hypot(eye.x - plan.center.x, eye.z - plan.center.z) < NEAR) site.crowd?.update(dt, at);
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
      /** Whether the world shows one of the story's pieces. */
      showing: (what: string) => circuits.debug.showing(what),
      stations: () => circuits.debug.spots(),
      /** Every chest and bottle spot (tests walk to each). */
      chestSpots: () => [...plan.chests, ...plan.bottles].map((c) => ({ id: c.id, ...toWorld(c.u, c.v) })),
      ...plan.debug?.(circuits),
    },
    dispose() {
      disposed = true;
      teardown();
      pieces.dispose?.();
      card.dispose();
    },
  };
}

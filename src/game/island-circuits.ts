import { puzzleMaybe, puzzleOn, textOf } from '../course/puzzles';
import type { CameraAnchor, StationSpot } from '../world/islands/anchor-kit';
import type { IslandCircuitWorld } from '../world/islands/island-works';
import type { LampLook } from '../world/village/lamp-set';
import type { ChoiceAsk } from './choice-card';
import type { CameraShot } from './follow-camera';
import type { IslandContentHost } from './island-code';
import { createCircuit, type CircuitHost, type CircuitStage, type StationAt } from './puzzles/circuit/puzzle';
import type { Lamp } from './puzzles/circuit/logic';
import type { Puzzle } from './puzzles/types';
import { storyHolds, type StoryCondition, type StoryIsland } from './story';

/**
 * An island's `circuit` puzzles in the session, the part every island shares: where each station
 * stands (its spot on the walk, its lamp, the camera over the player's shoulder while it's open), the
 * puzzles' hosting, the cue that frames a circuit and says what it is, what the save shows, and the
 * Seal's bookkeeping. An island's own `<island>-circuits.ts` gives the rest as a `CircuitSet`: what its
 * world does at each station, any shot of its own, and the Seal's moment. The stage reads only the
 * game's places and kinds, never a course id.
 */

/** What the scaffold drives of an island's world. */
export interface CircuitWorld<S extends string> {
  circuit: IslandCircuitWorld;
  show(what: S, on: boolean, unroll?: boolean): void;
  showing(what: S): boolean;
}

/** A station's moment in the world, with where it is (the lap's end has no place: where you stand). */
export interface StationMoment<W, K extends string> {
  world: W;
  kind: K;
  at: StationAt;
  event: 'open' | 'pass' | 'fail' | 'done';
  /** A demo's length (an `open`). */
  seconds?: number;
  /** Where its sound is. */
  where: { x: number; y: number; z: number };
}

/** What a Seal's moment and a station's handler may use. */
export interface CircuitTools {
  host: IslandContentHost;
  reduced(): boolean;
  wait(ms: number): Promise<unknown>;
  /** Cuts to `shot` through a short fade (nothing with reduced motion: the camera stays). */
  cutTo(shot: CameraShot, ms?: number): Promise<void>;
  /** Every station's lamp lit. */
  sealLamps(): void;
  /** The Seal's end: back to the talk's camera through a fade. */
  backToTalk(): Promise<void>;
}

/** An island's circuits: its own part of the stage. */
export interface CircuitSet<
  I extends StoryIsland,
  W extends CircuitWorld<S>,
  K extends string,
  S extends string,
> {
  island: I;
  /** The puzzles' names in the pack with the game's kind for each (`IslandEntry.puzzles`), in order. */
  puzzles: readonly (readonly [string, K])[];
  /** Every station's spot, by kind and place. */
  spots: Readonly<Record<K, Readonly<Record<string, StationSpot>>>>;
  /** The wide camera over each circuit (its cue's shot). */
  cams: Readonly<Record<K, CameraAnchor>>;
  toWorld(u: number, v: number): { x: number; z: number };
  /** The island's script by name (a lap's close). */
  script: CircuitHost['script'];
  /** The sound of a station's `tap` (a lever, unless the island's desks are quills). */
  tap?: 'lever' | 'quill';
  /** How far behind, beside and above the player a station's camera stands (m), by kind. */
  shoulder?(kind: K): readonly [back: number, side: number, up: number];
  /** A station watched from a shot of its own instead of over the shoulder. */
  shot?(kind: K, place: string): CameraShot | null;
  /** What the world does at a station's moment. */
  station(m: StationMoment<W, K>, tools: CircuitTools): void;
  /** A `dial` station's control reads position `index`: the world turns what it turns. */
  dial?(world: W, kind: K, at: StationAt, index: number, tools: CircuitTools): void;
  /** What the save shows: each story condition with the piece the world shows once it holds. */
  shows: readonly (readonly [StoryCondition<I>, S])[];
  /** The condition that the island is sealed, and the Seal's dress. */
  sealed: readonly [StoryCondition<I>, S];
  /** More of the world to lay out from the save (`holds` reads a story condition). */
  settle?(world: W, holds: (name: StoryCondition<I>) => boolean): void;
  /** The island's light once sealed (the Seal's moment lights it itself). */
  light?(world: W): void;
  /** The Seal's moment. */
  playSeal(world: W, tools: CircuitTools): Promise<void>;
  update?(world: W, dt: number): void;
  /** Forgets what's in flight (the world is gone). */
  reset?(): void;
}

export interface IslandCircuits<W, K extends string, S extends string> {
  /** Makes the circuits' puzzles on a streamed world (none if the course has them off). */
  create(world: W): Puzzle[];
  /** Lays the world out as the save says. */
  settle(): void;
  update(dt: number): void;
  /** The circuit's cue: frames it and says what it is. */
  cue(kind: K): Promise<void>;
  /** The Seal's moment. */
  seal(): Promise<void>;
  teardown(): void;
  /** The streamed world (null until it's there). */
  world(): W | null;
  readonly debug: {
    lamp(key: string): string | null;
    showing(what: S): boolean;
    /** Whether the Seal's moment is playing (tests catch it for a shot). */
    sealing(): boolean;
    /** Every station's spot (tests walk to each). */
    spots(): { id: string; x: number; y: number; z: number }[];
  };
}

/** A camera anchor as a shot. */
export function camShot(c: CameraAnchor): CameraShot {
  return { x: c.x, y: c.y, z: c.z, tx: c.target.x, ty: c.target.y, tz: c.target.z };
}

const SHOULDER = [4, 2.2, 3.4] as const;
const SFX = { ring: 'gondola_bell', seal: 'chime_solve', lamp: 'lever', wrong: 'hatch_clank' } as const;

export function createIslandCircuits<
  I extends StoryIsland,
  W extends CircuitWorld<S>,
  K extends string,
  S extends string,
>(
  host: IslandContentHost,
  o: { ask(a: ChoiceAsk): Promise<string>; card: CircuitHost['card'] },
  set: CircuitSet<I, W, K, S>,
): IslandCircuits<W, K, S> {
  let world: W | null = null;
  let sealing = false;
  const kinds = set.puzzles.map((p) => p[1]);
  const reduced = () => host.reducedMotion();
  const quests = () => host.puzzleHost.quests();

  /** A camera behind you and to your right, looking at the station's piece. */
  function shoulderShot(kind: K, sp: StationSpot, y: number): CameraShot {
    const [back, side, up] = set.shoulder?.(kind) ?? SHOULDER;
    const du = sp.u - sp.look.u;
    const dv = sp.v - sp.look.v;
    const d = Math.hypot(du, dv) || 1;
    const e = set.toWorld(sp.u + (du / d) * back - (dv / d) * side, sp.v + (dv / d) * back + (du / d) * side);
    const t = set.toWorld(sp.look.u, sp.look.v);
    return { x: e.x, y: y + up, z: e.z, tx: t.x, ty: sp.look.y, tz: t.z };
  }

  type Spot = ReturnType<CircuitStage['spot']>;
  const spotCache = new Map<string, Spot>();
  function spot(kind: K, place: string): Spot {
    const key = `${kind}:${place}`;
    let s = spotCache.get(key);
    if (s) return s;
    const sp = set.spots[kind][place]!;
    const p = set.toWorld(sp.u, sp.v);
    const y = host.world.groundAt(p.x, p.z, sp.y + 1.5);
    s = { x: p.x, y, z: p.z, lamp: sp.lamp, shot: set.shot?.(kind, place) ?? shoulderShot(kind, sp, y) };
    spotCache.set(key, s);
    return s;
  }
  const look = (l: Lamp | 'blink'): LampLook => (l === 'blink' ? 'running' : l);

  function sealLamps(): void {
    for (const kind of kinds)
      for (const place of Object.keys(set.spots[kind])) world?.circuit.lamp(`${kind}:${place}`, 'ready');
  }

  const tools: CircuitTools = {
    host,
    reduced,
    wait: (ms) => new Promise((r) => setTimeout(r, ms)),
    async cutTo(shot, ms = 260) {
      if (reduced()) return;
      await host.fade(true, ms);
      host.cut(shot);
      await host.fade(false, ms);
    },
    sealLamps,
    async backToTalk() {
      const r = reduced();
      if (!r) await host.fade(true, 260);
      host.backToTalk();
      if (!r) await host.fade(false, 260);
    },
  };

  function settle(): void {
    if (!world) return;
    const q = quests();
    const holds = (name: StoryCondition<I>) => storyHolds(set.island, name, q);
    set.settle?.(world, holds);
    // What the save shows. Only ever on (a lap's close shows its piece before its quest is through).
    for (const [name, what] of set.shows) if (holds(name) && !world.showing(what)) world.show(what, true);
    const [sealedWhen, dress] = set.sealed;
    if (holds(sealedWhen)) {
      if (!world.showing(dress) && !sealing) world.show(dress, true);
      set.light?.(world);
      sealLamps();
    }
  }

  function stage(kind: K): CircuitStage {
    return {
      spot: (place) => spot(kind, place),
      lamp: (key, l) => world?.circuit.lamp(key, look(l)),
      station(at, event, seconds) {
        if (!world) return;
        const where = set.spots[kind][at.place] ? spot(kind, at.place) : host.player;
        set.station({ world, kind, at, event, seconds, where }, tools);
      },
      dial(at, index) {
        if (world) set.dial?.(world, kind, at, index, tools);
      },
      settle,
    };
  }

  return {
    create(w) {
      world = w;
      spotCache.clear();
      const out: Puzzle[] = [];
      for (const [name, kind] of set.puzzles) {
        if (!puzzleOn(name)) continue;
        const ch: CircuitHost = {
          ...host.puzzleHost,
          ask: o.ask,
          card: o.card,
          say: host.say,
          frame: host.frame,
          reducedMotion: host.reducedMotion,
          sfx(k, at) {
            host.audio?.sfx.oneShot(k === 'tap' ? (set.tap ?? 'lever') : SFX[k], at, 0.7);
          },
          script: set.script,
          image(image, caption) {
            if (image) host.learn?.showImage(image, caption ?? null);
            else host.learn?.hideImage();
          },
          stage: stage(kind),
        };
        out.push(createCircuit(ch, name));
      }
      settle();
      return out;
    },
    settle,
    update(dt) {
      if (world) set.update?.(world, dt);
    },
    async cue(kind) {
      const name = set.puzzles.find((p) => p[1] === kind)![0];
      const file = puzzleMaybe(name);
      if (!file || !world) return;
      host.frame(camShot(set.cams[kind]));
      await host.text(textOf(file, 'title'), textOf(file, 'intro'));
      host.backToTalk();
    },
    async seal() {
      if (!world) return;
      sealing = true;
      try {
        await set.playSeal(world, tools);
      } finally {
        sealing = false;
      }
    },
    world: () => world,
    debug: {
      sealing: () => sealing,
      showing: (what) => world?.showing(what) ?? false,
      lamp: (key) => world?.circuit.look(key) ?? null,
      spots: () =>
        kinds.flatMap((kind) =>
          Object.keys(set.spots[kind]).map((place) => {
            const s = spot(kind, place);
            return { id: `${kind}:${place}`, x: s.x, y: s.y, z: s.z };
          }),
        ),
    },
    teardown() {
      world = null;
      set.reset?.();
      spotCache.clear();
    },
  };
}

import { puzzleMaybe, puzzleOn, textOf } from '../course/puzzles';
import { SUNSPIRE_ANCHORS } from '../world/islands/sunspire/anchors';
import { BEAM_ENDS, CIRCUIT_SPOTS, MIRROR } from '../world/islands/sunspire/circuit';
import type { SunspireWorld } from '../world/islands/sunspire/index';
import { SPIRE, TERRACE, toWorld } from '../world/islands/sunspire/layout';
import type { LampLook } from '../world/village/lamp-set';
import type { ChoiceAsk } from './choice-card';
import type { CameraShot } from './follow-camera';
import type { IslandContentHost } from './island-code';
import { createCircuit, type CircuitHost, type CircuitStage } from './puzzles/circuit/puzzle';
import type { Lamp } from './puzzles/circuit/logic';
import type { Puzzle } from './puzzles/types';
import { storyHolds } from './story';
import { SUNSPIRE_QUESTS } from './sunspire-quests';

/**
 * Sunspire's two circuits in the session (docs/specs/ISLAND-05-sunspire-sands.md §5): Mirror Beams in
 * the Mirror Court (`signal`) and the Sealed Crate in the Crate Yard (`crate`) as `circuit` puzzles,
 * and their stage in the world: where each station stands, its lamp, the camera while it's open, the
 * court's mirror and its beam (the `dial` station turns the mirror; the beam follows), and the Seal:
 * every mirror answers and the Sunspire lights. The stage reads only the game's places and kinds,
 * never a course id.
 */

type Kind = 'signal' | 'crate';

/** The puzzles' names in the pack (the game's: `IslandEntry.puzzles`). */
const PUZZLES: readonly (readonly [string, Kind])[] = [
  ['mirror-beams', 'signal'],
  ['sealed-crate', 'crate'],
];

/** The mirror's bearing that lands on the Sunspire. */
const SPIRE_BEARING = BEAM_ENDS.findIndex((e) => e.id === 'spire');

export interface SunspireCircuits {
  /** Makes the circuits' puzzles on a streamed world (none if the course has them off). */
  create(world: SunspireWorld): Puzzle[];
  /** Lays the world out as the save says (the standing beam, the opened crate, the Seal). */
  settle(): void;
  update(dt: number): void;
  /** The circuit's cue: frames it and says what it is (`ss-signal`, `ss-crate`). */
  cue(kind: Kind): Promise<void>;
  /** The Seal: the Sunspire lights, every mirror answers and the pennants unroll. */
  seal(): Promise<void>;
  teardown(): void;
  readonly debug: {
    lamp(key: string): string | null;
    showing(what: 'beam' | 'crate' | 'sealed'): boolean;
    /** Whether the Seal's moment is playing (tests catch it for a shot). */
    sealing(): boolean;
    /** The mirror's bearing and whether its beam lands on the Sunspire. */
    mirror(): { bearing: number; landed: boolean };
    /** Every station's spot (tests walk to each). */
    spots(): { id: string; x: number; y: number; z: number }[];
  };
}

export function createSunspireCircuits(
  host: IslandContentHost,
  o: {
    ask(a: ChoiceAsk): Promise<string>;
    card: CircuitHost['card'];
  },
): SunspireCircuits {
  let world: SunspireWorld | null = null;
  const reduced = () => host.reducedMotion();
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  let sealing = false;
  /** The message's flashes still to play (the beam blinks), and the time to the next one. */
  let flashes = 0;
  let flashIn = 0;

  /** The court's wide shot: over the west wall at the mirror, the beam and the Sunspire. */
  const wide = (): CameraShot => {
    const c = SUNSPIRE_ANCHORS.signalCam;
    return { x: c.x, y: c.y, z: c.z, tx: c.target.x, ty: c.target.y, tz: c.target.z };
  };

  /**
   * The mirror's own shot: over the court from the beam's right, along it toward where it ends. It
   * turns with the dial, so every landmark the beam can land on is seen, clear of the card on the
   * screen's right.
   */
  const beamShot = (index: number): CameraShot => {
    const e = BEAM_ENDS[Math.max(0, Math.min(BEAM_ENDS.length - 1, index))]!;
    const du = e.u - MIRROR.u;
    const dv = e.v - MIRROR.v;
    const d = Math.hypot(du, dv) || 1;
    const fu = du / d;
    const fv = dv / d;
    // Behind the mirror and well out to the beam's right (the frame's +v is to the left of +u, so its
    // right is (fv, -fu)): from the side the beam crosses half the frame, from the mirror at the left
    // to its end right of the middle. Lower when the beam climbs, so its foot and its end both show.
    const eye = toWorld(MIRROR.u - fu * 16 + fv * 16, MIRROR.v - fv * 16 - fu * 16);
    const rise = e.y - MIRROR.head;
    const k = Math.min(1, 70 / d);
    const t = toWorld(MIRROR.u + du * k, MIRROR.v + dv * k);
    return {
      x: eye.x,
      y: MIRROR.head + 9 - Math.min(6, Math.max(0, rise / 8)),
      z: eye.z,
      tx: t.x,
      ty: MIRROR.head + rise * k * 0.5,
      tz: t.z,
    };
  };

  /** A camera behind you and to your right, looking at the station's piece. */
  function shotAt(u: number, v: number, y: number, look: { u: number; y: number; v: number }): CameraShot {
    const du = u - look.u;
    const dv = v - look.v;
    const d = Math.hypot(du, dv) || 1;
    const e = toWorld(u + (du / d) * 4 - (dv / d) * 2.2, v + (dv / d) * 4 + (du / d) * 2.2);
    const t = toWorld(look.u, look.v);
    return { x: e.x, y: y + 3.4, z: e.z, tx: t.x, ty: look.y, tz: t.z };
  }

  type Spot = ReturnType<CircuitStage['spot']>;
  const spotCache = new Map<string, Spot>();
  function spot(kind: Kind, place: string): Spot {
    const key = `${kind}:${place}`;
    let s = spotCache.get(key);
    if (s) return s;
    const sp = CIRCUIT_SPOTS[kind][place]!;
    const p = toWorld(sp.u, sp.v);
    const y = host.world.groundAt(p.x, p.z, sp.y + 1.5);
    // The shutter and the mirror are watched down the beam (where it points first: the cliff).
    const shot =
      kind === 'signal' && (place === 'shutter' || place === 'mirror')
        ? beamShot(0)
        : shotAt(sp.u, sp.v, y, sp.look);
    s = { x: p.x, y, z: p.z, lamp: sp.lamp, shot };
    spotCache.set(key, s);
    return s;
  }
  const look = (l: Lamp | 'blink'): LampLook => (l === 'blink' ? 'running' : l);

  function stage(kind: Kind): CircuitStage {
    return {
      spot: (place) => spot(kind, place),
      lamp: (key, l) => world?.circuit.lamp(key, look(l)),
      station(at, event) {
        // The lap's end (`done`) has no place: its sound is where you stand.
        const s = CIRCUIT_SPOTS[kind][at.place] ? spot(kind, at.place) : host.player;
        if (kind === 'signal') {
          // The shutter opens: a beam leaves the mirror where it points now (the cliff).
          if (at.place === 'shutter' && event === 'open') {
            world?.aim(0, true);
            world?.beam(true);
            world?.hush(40);
            host.audio?.sfx.oneShot('lever', s, 0.8);
          }
          // The mirror's set on the Sunspire: the beam runs on to Library Rock.
          if (at.place === 'mirror' && event === 'pass') host.audio?.sfx.oneShot('chime_solve', s, 0.8);
          // The message goes: the beam blinks its dots and dashes.
          if (at.place === 'key' && at.kind === 'choose' && event === 'pass' && !reduced()) {
            flashes = 6;
            flashIn = 0;
          }
          if (event === 'done') world?.show('beam', true);
        } else {
          if (at.place === 'scale' && event === 'open') host.audio?.sfx.oneShot('hatch_clank', s, 0.7);
          if (at.place === 'bell' && event === 'pass') host.audio?.sfx.oneShot('gondola_bell', s, 0.8);
          if (event === 'done') world?.show('crate', true, !reduced());
        }
      },
      dial(at, index) {
        if (kind !== 'signal' || at.place !== 'mirror') return;
        world?.aim(index, reduced());
        world?.beam(true);
        // The Sunspire stays dark while you turn the mirror: its flash is the answer.
        world?.hush(40);
        host.frame(beamShot(index));
      },
      settle: () => settle(),
    };
  }

  function settle(): void {
    if (!world) return;
    const q = host.puzzleHost.quests();
    // What the save shows: the beam standing on the Sunspire, the crate open on Samir's bench, the
    // Seal's pennants and lit mirrors. Only ever on (a lap's close shows its piece before its quest is
    // through).
    if (storyHolds('sunspire', 'beamLanded', q)) {
      if (world.aimed() !== SPIRE_BEARING || !world.landed()) {
        world.aim(SPIRE_BEARING, true);
        world.beam(true);
      }
      if (!world.showing('beam')) world.show('beam', true);
    }
    if (storyHolds('sunspire', 'crateOpened', q) && !world.showing('crate')) world.show('crate', true);
    if (storyHolds('sunspire', 'sealed', q)) {
      if (!world.showing('sealed') && !sealing) world.show('sealed', true);
      world.setSealLit(true);
      sealLamps();
    }
  }

  /** Every station's lamp lit (the Seal's, or after a reload once sealed). */
  function sealLamps(): void {
    for (const kind of ['signal', 'crate'] as const)
      for (const place of Object.keys(CIRCUIT_SPOTS[kind])) world?.circuit.lamp(`${kind}:${place}`, 'ready');
  }

  /** The Seal's moment: the Sunspire lights, the beam crosses to it and on, and the pennants unroll. */
  async function playSeal(w: SunspireWorld): Promise<void> {
    const r = reduced();
    // From the terrace's west edge, up at the great mirror.
    const e = toWorld(TERRACE.u - 16, TERRACE.v - 10);
    const t = toWorld(SPIRE.u, SPIRE.v);
    const up: CameraShot = { x: e.x, y: TERRACE.y + 4, z: e.z, tx: t.x, ty: SPIRE.mirror - 6, tz: t.z };
    if (!r) {
      await host.fade(true, 260);
      host.cut(up);
      await host.fade(false, 260);
    }
    host.audio?.sfx.oneShot('chime_solve', { x: t.x, y: SPIRE.mirror, z: t.z }, 1);
    w.setSealLit(true);
    w.raptors?.burst(4);
    await wait(r ? 1000 : 2400);
    // Out over the court: the beam crosses to the Sunspire and runs on to Library Rock.
    w.aim(SPIRE_BEARING, true);
    w.beam(true);
    sealLamps();
    if (!r) w.show('sealed', false);
    w.show('sealed', true, !r);
    if (!r) {
      await host.fade(true, 220);
      host.cut(wide());
      await host.fade(false, 220);
    }
    host.audio?.sfx.oneShot('stinger_triumph', host.player, 0.7);
    await wait(r ? 1200 : 2800);
    if (!r) await host.fade(true, 260);
    host.backToTalk();
    if (!r) await host.fade(false, 260);
  }

  return {
    create(w) {
      world = w;
      spotCache.clear();
      const out: Puzzle[] = [];
      for (const [name, kind] of PUZZLES) {
        if (!puzzleOn(name)) continue;
        const ch: CircuitHost = {
          ...host.puzzleHost,
          ask: o.ask,
          card: o.card,
          say: host.say,
          frame: host.frame,
          reducedMotion: host.reducedMotion,
          sfx(k, at) {
            const id = (
              {
                tap: 'lever',
                ring: 'gondola_bell',
                seal: 'chime_solve',
                lamp: 'lever',
                wrong: 'hatch_clank',
              } as const
            )[k];
            host.audio?.sfx.oneShot(id, at, 0.7);
          },
          script: SUNSPIRE_QUESTS.script,
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
      // The message's flashes: the beam off for a beat, six times.
      if (flashes > 0 && world) {
        flashIn -= dt;
        if (flashIn <= 0) {
          flashes--;
          world.beam(flashes % 2 === 0);
          flashIn = flashes % 2 ? 0.14 : 0.24;
        }
      }
    },
    async cue(kind) {
      const name = PUZZLES.find((p) => p[1] === kind)![0];
      const file = puzzleMaybe(name);
      if (!file || !world) return;
      const cam = kind === 'signal' ? SUNSPIRE_ANCHORS.signalCam : SUNSPIRE_ANCHORS.crateCam;
      host.frame({ x: cam.x, y: cam.y, z: cam.z, tx: cam.target.x, ty: cam.target.y, tz: cam.target.z });
      await host.text(textOf(file, 'title'), textOf(file, 'intro'));
      host.backToTalk();
    },
    async seal() {
      if (!world) return;
      sealing = true;
      try {
        await playSeal(world);
      } finally {
        sealing = false;
      }
    },
    debug: {
      sealing: () => sealing,
      showing: (what) => world?.showing(what) ?? false,
      lamp: (key) => world?.circuit.look(key) ?? null,
      mirror: () => ({ bearing: world?.aimed() ?? -1, landed: world?.landed() ?? false }),
      spots: () => {
        const out: { id: string; x: number; y: number; z: number }[] = [];
        for (const kind of ['signal', 'crate'] as const)
          for (const place of Object.keys(CIRCUIT_SPOTS[kind])) {
            const s = spot(kind, place);
            out.push({ id: `${kind}:${place}`, x: s.x, y: s.y, z: s.z });
          }
        return out;
      },
    },
    teardown() {
      world = null;
      flashes = 0;
      spotCache.clear();
    },
  };
}

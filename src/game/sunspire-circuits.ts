import { SUNSPIRE_ANCHORS } from '../world/islands/sunspire/anchors';
import type { SsShow } from '../world/islands/sunspire/build';
import { BEAM_ENDS, CIRCUIT_SPOTS, MIRROR } from '../world/islands/sunspire/circuit';
import type { SunspireWorld } from '../world/islands/sunspire/index';
import { SPIRE, TERRACE, toWorld } from '../world/islands/sunspire/layout';
import type { ChoiceAsk } from './choice-card';
import type { CameraShot } from './follow-camera';
import type { IslandContentHost } from './island-code';
import { camShot, createIslandCircuits, type IslandCircuits } from './island-circuits';
import type { CircuitHost } from './puzzles/circuit/puzzle';
import { SUNSPIRE_QUESTS } from './sunspire-quests';

/**
 * Sunspire's two circuits in the session (docs/specs/ISLAND-05-sunspire-sands.md §5): Mirror Beams in
 * the Mirror Court (`signal`) and the Sealed Crate in the Crate Yard (`crate`), on the shared stage
 * (island-circuits.ts). Its own part: the court's mirror and its beam (the `dial` station turns the
 * mirror; the beam follows), the crate's lid, and the Seal: every mirror answers and the Sunspire
 * lights.
 */

type Kind = 'signal' | 'crate';

/** The mirror's bearing that lands on the Sunspire. */
const SPIRE_BEARING = BEAM_ENDS.findIndex((e) => e.id === 'spire');

export type SunspireCircuits = IslandCircuits<SunspireWorld, Kind, SsShow> & {
  readonly debug: {
    /** The mirror's bearing and whether its beam lands on the Sunspire. */
    mirror(): { bearing: number; landed: boolean };
  };
};

/**
 * The mirror's own shot: over the court from the beam's right, along it toward where it ends. It
 * turns with the dial, so every landmark the beam can land on is seen, clear of the card on the
 * screen's right.
 */
function beamShot(index: number): CameraShot {
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
}

export function createSunspireCircuits(
  host: IslandContentHost,
  o: { ask(a: ChoiceAsk): Promise<string>; card: CircuitHost['card'] },
): SunspireCircuits {
  /** The message's flashes still to play (the beam blinks), and the time to the next one. */
  let flashes = 0;
  let flashIn = 0;

  const circuits = createIslandCircuits<'sunspire', SunspireWorld, Kind, SsShow>(host, o, {
    island: 'sunspire',
    puzzles: [
      ['mirror-beams', 'signal'],
      ['sealed-crate', 'crate'],
    ],
    spots: CIRCUIT_SPOTS,
    cams: { signal: SUNSPIRE_ANCHORS.signalCam, crate: SUNSPIRE_ANCHORS.crateCam },
    toWorld,
    script: SUNSPIRE_QUESTS.script,
    // The shutter and the mirror are watched down the beam (where it points first: the cliff).
    shot: (kind, place) =>
      kind === 'signal' && (place === 'shutter' || place === 'mirror') ? beamShot(0) : null,
    station({ world, kind, at, event, where }, { reduced }) {
      if (kind === 'signal') {
        // The shutter opens: a beam leaves the mirror where it points now (the cliff).
        if (at.place === 'shutter' && event === 'open') {
          world.aim(0, true);
          world.beam(true);
          world.hush(40);
          host.audio?.sfx.oneShot('lever', where, 0.8);
        }
        // The mirror's set on the Sunspire: the beam runs on to Library Rock.
        if (at.place === 'mirror' && event === 'pass') host.audio?.sfx.oneShot('chime_solve', where, 0.8);
        // The message goes: the beam blinks its dots and dashes.
        if (at.place === 'key' && at.kind === 'choose' && event === 'pass' && !reduced()) {
          flashes = 6;
          flashIn = 0;
        }
        if (event === 'done') world.show('beam', true);
      } else {
        if (at.place === 'scale' && event === 'open') host.audio?.sfx.oneShot('hatch_clank', where, 0.7);
        if (at.place === 'bell' && event === 'pass') host.audio?.sfx.oneShot('gondola_bell', where, 0.8);
        if (event === 'done') world.show('crate', true, !reduced());
      }
    },
    dial(world, kind, at, index, { reduced }) {
      if (kind !== 'signal' || at.place !== 'mirror') return;
      world.aim(index, reduced());
      world.beam(true);
      // The Sunspire stays dark while you turn the mirror: its flash is the answer.
      world.hush(40);
      host.frame(beamShot(index));
    },
    // The beam standing on the Sunspire, the crate open on Samir's bench, the Seal's pennants and lit
    // mirrors.
    shows: [
      ['beamLanded', 'beam'],
      ['crateOpened', 'crate'],
    ],
    sealed: ['sealed', 'sealed'],
    settle(world, holds) {
      if (holds('beamLanded') && (world.aimed() !== SPIRE_BEARING || !world.landed())) {
        world.aim(SPIRE_BEARING, true);
        world.beam(true);
      }
    },
    light: (world) => world.setSealLit(true),
    /** The Seal's moment: the Sunspire lights, the beam crosses to it and on, and the pennants unroll. */
    async playSeal(w, { reduced, wait, cutTo, sealLamps, backToTalk }) {
      const r = reduced();
      // From the terrace's west edge, up at the great mirror.
      const e = toWorld(TERRACE.u - 16, TERRACE.v - 10);
      const t = toWorld(SPIRE.u, SPIRE.v);
      await cutTo({ x: e.x, y: TERRACE.y + 4, z: e.z, tx: t.x, ty: SPIRE.mirror - 6, tz: t.z });
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
      // The court's wide shot: over the west wall at the mirror, the beam and the Sunspire.
      await cutTo(camShot(SUNSPIRE_ANCHORS.signalCam), 220);
      host.audio?.sfx.oneShot('stinger_triumph', host.player, 0.7);
      await wait(r ? 1200 : 2800);
      await backToTalk();
    },
    update(world, dt) {
      // The message's flashes: the beam off for a beat, six times.
      if (flashes <= 0) return;
      flashIn -= dt;
      if (flashIn <= 0) {
        flashes--;
        world.beam(flashes % 2 === 0);
        flashIn = flashes % 2 ? 0.14 : 0.24;
      }
    },
    reset() {
      flashes = 0;
    },
  });

  return {
    ...circuits,
    debug: {
      ...circuits.debug,
      mirror: () => ({
        bearing: circuits.world()?.aimed() ?? -1,
        landed: circuits.world()?.landed() ?? false,
      }),
    },
  };
}

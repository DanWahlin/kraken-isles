import { TIDEWHEEL_ANCHORS } from '../world/islands/tidewheel/anchors';
import type { TwShow } from '../world/islands/tidewheel/build';
import { CIRCUIT_SPOTS, RING_HOURS, RING_START, type TwCircuit } from '../world/islands/tidewheel/circuit';
import type { TidewheelWorld } from '../world/islands/tidewheel/index';
import { COURT, LIGHTHOUSE, TERRACE, toWorld } from '../world/islands/tidewheel/layout';
import type { ChoiceAsk } from './choice-card';
import type { CameraShot } from './follow-camera';
import type { IslandContentHost } from './island-code';
import { createIslandCircuits, type IslandCircuits } from './island-circuits';
import type { CircuitHost } from './puzzles/circuit/puzzle';
import { TIDEWHEEL_QUESTS } from './tidewheel-quests';

/**
 * Tidewheel's two circuits in the session (docs/specs/ISLAND-07-tidewheel-caldera.md §5): the Lever in
 * the Wheel Works (`lever`) and Gears & Bells in the Clock Court (`clock`), on the shared stage
 * (island-circuits.ts). Its own part: the drum's pins, the great lever and the Works' run, the
 * Lighthouse's hour ring (the `dial` station turns it, on the tower itself), the nine peg, the day
 * gear, the striking figures, the tide gauge, and the Seal: the last lever lights the lamp.
 */

type Kind = TwCircuit;

/** The ring's position for eight o'clock. */
const EIGHT = RING_HOURS.indexOf(8);

export type TidewheelCircuits = IslandCircuits<TidewheelWorld, Kind, TwShow> & {
  readonly debug: {
    /** The clock ring's hour and whether it has come to rest; the drum's pins; whether the Works run. */
    machine(): { hour: number; settled: boolean; pinned: boolean; running: boolean };
  };
};

/**
 * The ring's own shot: from the court's north side over the crank, up at the Lighthouse's north
 * clock face, so the ring on the tower turns in the shot as the crank does.
 */
function ringShot(): CameraShot {
  const e = toWorld(COURT.u - 6, COURT.v + 4);
  const t = toWorld(LIGHTHOUSE.u, LIGHTHOUSE.v + 2);
  return { x: e.x, y: COURT.y + 3.2, z: e.z, tx: t.x, ty: LIGHTHOUSE.clock - 5, tz: t.z };
}

export function createTidewheelCircuits(
  host: IslandContentHost,
  o: { ask(a: ChoiceAsk): Promise<string>; card: CircuitHost['card'] },
): TidewheelCircuits {
  /** Morning comes to the gauge this many seconds from now (Gears & Bells' watch at the log). */
  let morning = -1;

  const circuits = createIslandCircuits<'tidewheel', TidewheelWorld, Kind, TwShow>(host, o, {
    island: 'tidewheel',
    puzzles: [
      ['the-lever', 'lever'],
      ['gears-and-bells', 'clock'],
    ],
    spots: CIRCUIT_SPOTS,
    cams: { lever: TIDEWHEEL_ANCHORS.leverCam, clock: TIDEWHEEL_ANCHORS.clockCam },
    toWorld,
    script: TIDEWHEEL_QUESTS.script,
    // The ring is watched on the Lighthouse's clock.
    shot: (kind, place) => (kind === 'clock' && place === 'ring' ? ringShot() : null),
    station({ world, kind, at, event, seconds, where }, { reduced }) {
      const sfx = host.audio?.sfx;
      if (kind === 'lever') {
        // The pattern is pinned on the drum.
        if (at.place === 'drum' && event === 'pass') {
          world.pin(true);
          sfx?.oneShot('lever', where, 0.6);
        }
        if (at.place === 'gear' && event === 'pass') sfx?.oneShot('hatch_clank', where, 0.6);
        if (at.place === 'switch' && event === 'pass') sfx?.oneShot('lever', where, 0.7);
        // The great lever: the Works run and the drum plays for as long as the run is watched.
        if (at.place === 'lever' && event === 'open') {
          world.pull(Math.max(3, seconds ?? 6));
          sfx?.oneShot('lever', where, 0.9);
        }
        if (at.place === 'lever' && event === 'pass') {
          if (!world.running()) world.pull(reduced() ? 1 : 2.5);
          sfx?.oneShot('chime_solve', where, 0.7);
        }
        if (at.place === 'log' && event === 'pass') sfx?.oneShot('book_close', where, 0.7);
        if (event === 'done') world.show('ran', true);
        return;
      }
      if (at.place === 'gear' && event === 'pass') {
        world.dayGear(true);
        sfx?.oneShot('hatch_clank', where, 0.6);
      }
      // The ring is set: its marker stands on eight.
      if (at.place === 'ring' && event === 'pass') {
        world.ring(EIGHT, reduced());
        sfx?.oneShot('chime_solve', where, 0.6);
      }
      if (at.place === 'pegs' && event === 'pass') {
        world.clearNine(true);
        sfx?.oneShot('lever', where, 0.6);
      }
      // Saved: the figures strike once.
      if (at.place === 'bell' && event === 'pass' && at.kind !== 'watch') {
        world.strike();
        sfx?.oneShot('gondola_bell', where, 0.9);
      }
      // The tide's out while you learn why the run needs it; in again once you have it.
      if (at.place === 'tide' && event === 'open') world.tide(0.1);
      if (at.place === 'tide' && event === 'pass') world.tide(0.8);
      // The next morning at the log: the tide comes in, the figures strike, and a run you did not start is there.
      if (at.place === 'log' && at.kind === 'watch' && event === 'open') {
        world.tide(0.15, true);
        world.tide(0.9);
        morning = Math.max(1.2, (seconds ?? 5) * 0.55);
      }
      if (at.place === 'log' && at.kind === 'watch' && event === 'pass') {
        morning = -1;
        world.tide(0.9, reduced());
        sfx?.oneShot('book_close', where, 0.7);
      }
      if (event === 'done') world.show('scheduled', true, !reduced());
    },
    dial(world, kind, at, index, { reduced }) {
      if (kind !== 'clock' || at.place !== 'ring') return;
      world.ring(index, reduced());
      host.frame(ringShot());
    },
    // The pinned drum and the Works in gear, the ring at eight with the nine peg cleared, the Seal's
    // banners and the lit lamp.
    shows: [
      ['reportRan', 'ran'],
      ['reportScheduled', 'scheduled'],
    ],
    sealed: ['sealed', 'sealed'],
    light: (world) => world.setSealLit(true),
    /**
     * The Seal's moment: you pull the last lever; the Works run, the figures strike, the lamp turns on
     * and its beam goes out through the breach.
     */
    async playSeal(w, { reduced, wait, cutTo, sealLamps, backToTalk }) {
      const r = reduced();
      // On the terrace, behind the last lever, up at the tower.
      const e = toWorld(TERRACE.u - 7, TERRACE.v + 5);
      const t = toWorld(LIGHTHOUSE.u, LIGHTHOUSE.v);
      await cutTo({ x: e.x, y: TERRACE.y + 2.2, z: e.z, tx: t.x, ty: LIGHTHOUSE.clock - 2, tz: t.z });
      const lever = TIDEWHEEL_ANCHORS.seal;
      host.audio?.sfx.oneShot('lever', lever, 1);
      w.lastLever(true, r);
      w.pull(r ? 2 : 6);
      await wait(r ? 600 : 1400);
      w.strike();
      host.audio?.sfx.oneShot('gondola_bell', { x: t.x, y: LIGHTHOUSE.gears, z: t.z }, 1);
      await wait(r ? 500 : 1100);
      host.audio?.sfx.oneShot('chime_solve', { x: t.x, y: LIGHTHOUSE.lamp, z: t.z }, 1);
      w.setSealLit(true);
      sealLamps();
      if (!r) w.show('sealed', false);
      w.show('sealed', true, !r);
      await wait(r ? 1200 : 2600);
      // From over the bay: the whole tower, its beam sweeping out through the breach.
      const far = toWorld(-250, -70);
      await cutTo({ x: far.x, y: 26, z: far.z, tx: t.x, ty: LIGHTHOUSE.lamp - 4, tz: t.z }, 220);
      host.audio?.sfx.oneShot('stinger_triumph', host.player, 0.7);
      await wait(r ? 1400 : 3400);
      await backToTalk();
    },
    update(world, dt) {
      if (morning <= 0) return;
      morning -= dt;
      if (morning <= 0) {
        world.strike();
        host.audio?.sfx.oneShot('gondola_bell', TIDEWHEEL_ANCHORS.light, 0.5);
      }
    },
    reset() {
      morning = -1;
    },
  });

  return {
    ...circuits,
    debug: {
      ...circuits.debug,
      machine: () => {
        const w = circuits.world();
        return {
          hour: RING_HOURS[w?.ringAt() ?? RING_START]!,
          settled: w?.ringSettled() ?? true,
          pinned: w?.pinned() ?? false,
          running: w?.running() ?? false,
        };
      },
    },
  };
}

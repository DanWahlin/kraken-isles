import type { Camera } from 'three/webgpu';
import type { Input } from '../../engine/input';
import { world as worldUniforms } from '../../engine/uniforms';
import { CHART_LABELS } from '../../learn/content/labels';
import type { LearnStore } from '../../learn/store';
import type { Character } from '../../world/characters';
import { arrivalKeys, type IslandArrival } from '../arrivals';
import type { CollisionWorld } from '../collision';
import type { Dialogue } from '../dialogue';
import { FlyoverPath } from '../flyover';
import type { CameraShot, FollowCamera } from '../follow-camera';
import type { Hud } from '../hud';
import type { PlayerController } from '../player-controller';
import type { ArrivalPhase, SessionStatus } from './types';
import type { Welcome } from './welcome';
import type { Wingman } from './wingman';

/** With reduced motion there's no flight: the title card holds over the captain this long. */
const ARRIVAL_CARD_ONLY = 3.4;
/** …or the chart label, which has more to read (docs/specs/LOWER-THIRDS.md). */
const ARRIVAL_LABEL_ONLY = 7;
const cardOnlySeconds = (plan: IslandArrival) => (plan.label ? ARRIVAL_LABEL_ONLY : ARRIVAL_CARD_ONLY);
/** Seconds into a flyover before a key press can skip it (so a held key from the menu doesn't). */
const ARRIVAL_SKIP_AFTER = 0.6;
/** Seconds of flight between the views warmed up while loading. */
const ARRIVAL_WARM_STEP = 0.5;

export interface ArrivalHost {
  status: SessionStatus;
  hud: Hud;
  learn: LearnStore | null;
  input: Input;
  hero: Character;
  cam: FollowCamera;
  camera: Camera;
  world: CollisionWorld;
  player: PlayerController;
  dialogue: Dialogue;
  wing: Wingman;
  welcome: Welcome;
}

/**
 * First landfall on an island: a flyover in from the sea, over the ship and the island, down to
 * behind the captain, with the island's title card; then Wingman's welcome. Once per island. With
 * reduced motion there's no flight, only the card.
 */
export type Arrival = ReturnType<typeof createArrival>;

export function createArrival(host: ArrivalHost) {
  const { status, hud, learn, input, hero, cam, camera, world, player, dialogue, welcome } = host;
  const flyShot: CameraShot = { x: 0, y: 0, z: 0, tx: 0, ty: 0, tz: 0 };
  const restShot: CameraShot = { x: 0, y: 0, z: 0, tx: 0, ty: 0, tz: 0 };
  /** Tests: holds the flyover at a moment (seconds in) for screenshots. */
  let arrivalHold: number | null = null;
  let arrival: {
    plan: IslandArrival;
    path: FlyoverPath | null;
    phase: ArrivalPhase;
    time: number;
    card: boolean;
  } | null = null;
  function startArrival(plan: IslandArrival, waitForBegin: boolean): void {
    // Wingman's welcome follows the flight: its lines load meanwhile.
    dialogue.preload(welcome.lines());
    const reduced = worldUniforms.reducedMotion.value > 0.5;
    let path: FlyoverPath | null = null;
    if (!reduced) {
      cam.restPose(player, player.heading, restShot);
      path = new FlyoverPath(
        arrivalKeys(plan, { x: player.x, y: player.y, z: player.z, heading: player.heading }, restShot),
        plan.seconds,
      );
      path.sample(0, flyShot);
      cam.cut(flyShot);
    }
    arrival = {
      plan,
      path,
      phase: waitForBegin ? 'waiting' : path ? 'flying' : 'card',
      time: 0,
      card: false,
    };
    welcome.hold();
    dialogue.cancel();
    host.wing.flight?.landNow();
    input.enabled = false;
    hero.setSpeed(0);
    hud.setCinematic(true);
    learn?.setCinematic(true);
  }
  /** Ends the arrival: marks the island seen and hands over to Wingman (unless travel cut it short). */
  async function endArrival(how: 'landed' | 'skipped' | 'cut'): Promise<void> {
    const a = arrival;
    if (!a || a.phase === 'done') return;
    a.phase = 'done';
    learn?.progress.add('arrivals', a.plan.id);
    if (how === 'skipped' && a.path) {
      await hud.fade(true, 240);
      if (status.disposed) return;
      cam.release();
    }
    hud.setCinematic(false);
    learn?.setCinematic(false);
    input.enabled = !status.paused;
    if (how === 'cut') {
      cam.release();
      welcome.soon(0.8);
      return;
    }
    if (how === 'skipped' && a.path) void hud.fade(false, 460);
    cam.frame(null);
    if (welcome.lines().length) void welcome.run();
  }
  function updateArrival(
    dt: number,
    t: number,
    s: { interact: boolean; stirring: boolean; jump: boolean; map: boolean },
  ): void {
    const a = arrival;
    if (!a || a.phase === 'done' || a.phase === 'waiting') return;
    a.time = arrivalHold ?? a.time + dt;
    const plan = a.plan;
    const cardAt = a.path ? plan.cardAt : 0.5;
    const cardEnd = a.path ? plan.cardAt + plan.cardFor : cardOnlySeconds(plan) - 0.4;
    const showCard = a.time >= cardAt && a.time < cardEnd;
    if (showCard !== a.card) {
      a.card = showCard;
      hud.showCard(showCard ? plan.card : null, plan.label ? CHART_LABELS[plan.label] : null);
    }
    if (a.time > ARRIVAL_SKIP_AFTER && (s.interact || s.stirring || s.jump || s.map)) {
      void endArrival('skipped');
      return;
    }
    if (!a.path) {
      if (a.time >= cardOnlySeconds(plan)) void endArrival('landed');
      return;
    }
    const landed = a.path.sample(a.time, flyShot);
    // Never through the ground or the sea, whatever the keys say.
    const floor = Math.max(
      world.groundAt(flyShot.x, flyShot.z) + 2.2,
      world.waterAt(flyShot.x, flyShot.z, t) + 1.8,
    );
    if (!landed && flyShot.y < floor) flyShot.y = floor;
    cam.frame(flyShot);
    if (landed) void endArrival('landed');
  }

  return {
    /** Starts a flight (or the card alone); `waitForBegin`: it holds at its first view until `begin`. */
    start: startArrival,
    end: endArrival,
    update: updateArrival,
    /** A flight or its card is on (waiting, flying or showing): it owns the keys. */
    get active(): boolean {
      return !!arrival && arrival.phase !== 'done';
    },
    /** Seconds until the flyover reaches the captain (0 when there's none, or it's done). */
    left(): number {
      const a = arrival;
      if (!a || a.phase === 'done') return 0;
      if (!a.path) return Math.max(0, cardOnlySeconds(a.plan) - a.time);
      return Math.max(0, a.plan.seconds - a.time);
    },
    /** The game's on screen (the loading card has gone): a waiting flight takes off. */
    begin(): void {
      if (arrival?.phase === 'waiting') arrival.phase = arrival.path ? 'flying' : 'card';
    },
    /**
     * Loading: steps the camera along a waiting flight, calling `step` at each view (render a frame,
     * compile), so everything it'll see is built behind the loading card rather than mid-flight.
     */
    async warm(step: () => Promise<void>): Promise<void> {
      const a = arrival;
      if (!a?.path || a.phase !== 'waiting') return;
      // The camera's placed here too, so the world streams for this view on the very next frame.
      const view = (t: number) => {
        a.path!.sample(t, flyShot);
        cam.cut(flyShot);
        camera.position.set(flyShot.x, flyShot.y, flyShot.z);
        camera.lookAt(flyShot.tx, flyShot.ty, flyShot.tz);
        camera.updateMatrixWorld();
      };
      for (let t = 0; t <= a.plan.seconds + 0.01; t += ARRIVAL_WARM_STEP) {
        view(t);
        await step();
        if (status.disposed || a.phase !== 'waiting') return;
      }
      // Then a look all round the landing spot from the follow camera's height, so the village and
      // crew near the captain are drawn even if the flight never passed over them.
      for (let i = 0; i < 8; i++) {
        const yaw = (i / 8) * Math.PI * 2;
        flyShot.x = player.x - Math.sin(yaw) * 6;
        flyShot.y = player.y + 3;
        flyShot.z = player.z - Math.cos(yaw) * 6;
        flyShot.tx = player.x + Math.sin(yaw) * 20;
        flyShot.ty = player.y + 1;
        flyShot.tz = player.z + Math.cos(yaw) * 20;
        cam.cut(flyShot);
        camera.position.set(flyShot.x, flyShot.y, flyShot.z);
        camera.lookAt(flyShot.tx, flyShot.ty, flyShot.tz);
        camera.updateMatrixWorld();
        await step();
        if (status.disposed || a.phase !== 'waiting') return;
      }
      view(0);
      await step();
    },
    /** Tests: holds the flyover at `time` seconds in (null lets it fly on). */
    hold(time: number | null): void {
      arrivalHold = time;
    },
    /** The flight's phase and seconds in, and how far the camera is from the captain (tests). */
    debug() {
      return arrival
        ? {
            island: arrival.plan.id,
            phase: arrival.phase,
            time: +arrival.time.toFixed(2),
            eye: Math.hypot(
              camera.position.x - player.x,
              camera.position.y - player.y,
              camera.position.z - player.z,
            ),
          }
        : null;
    },
  };
}

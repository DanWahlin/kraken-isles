import type { Input, InputState } from '../../engine/input';
import type { Brigantine } from '../../world/ship';
import type { Dialogue } from '../dialogue';
import type { FollowCamera } from '../follow-camera';
import type { Helm } from '../helm';
import type { Hud } from '../hud';
import type { Interactions } from '../interaction';
import type { IslandBerth } from '../islands';
import type { PlayerController } from '../player-controller';
import type { Wayfinder } from '../wayfinding/compass-route';
import type { WalkRoute } from '../wayfinding/walk-graph';
import type { SessionCompass } from './compass';
import type { SessionMode, SessionStatus } from './types';

export interface UnstuckHost {
  status: SessionStatus;
  hud: Hud;
  input: Input;
  interactions: Interactions;
  player: PlayerController;
  dialogue: Dialogue;
  wayfinder: Wayfinder;
  dyn: Brigantine['dynamics'];
  helm: Helm;
  cam: FollowCamera;
  compass: SessionCompass;
  /** The hop is a transition (a fade out and in). */
  setMode(mode: SessionMode): void;
  /** Puts the walker at a spot (the hero and the camera with it); `y` picks the level where walks stack. */
  place(x: number, z: number, heading: number, y?: number): void;
  /** A ride (the lift) has the walker. */
  riding(): boolean;
  /** A sea battle's on. */
  battling(): boolean;
  berthInRange(): IslandBerth | null;
  sailTarget(): IslandBerth;
}

/**
 * Unstuck (PLAN §9's "never trapped"): pushing against something for a few seconds without getting
 * anywhere, on foot or at the helm, offers a hop back onto the island's routes (E, or the pause
 * menu's Unstuck at any time).
 */
export type Unstuck = ReturnType<typeof createUnstuck>;

const STUCK_AFTER = 4;
const STUCK_RADIUS = 1.2;
const SHIP_STUCK_AFTER = 12;

export function createUnstuck(host: UnstuckHost) {
  const { status, hud, input, interactions, player, dialogue, wayfinder, dyn, helm, cam, compass } = host;
  let pushFor = 0;
  const pushFrom = { x: 0, z: 0 };
  let stuckOffer = false;
  const stuckSpot = { x: 0, y: 0, z: 0 };
  const unstuckRoute: WalkRoute = { x: 0, y: 0, z: 0, length: 0, node: -1 };
  const offerUnstuck = (afloat: boolean) => {
    stuckOffer = true;
    hud.toast(
      afloat
        ? 'Stuck fast? Press E and the crew will warp her off into open water.'
        : 'Stuck? Press E to hop back onto the path. Unstuck’s in the pause menu too.',
      6,
    );
  };
  interactions.add({
    id: 'unstuck',
    label: () => 'Unstuck: back onto the path',
    get x() {
      return player.x;
    },
    get y() {
      return player.y;
    },
    get z() {
      return player.z;
    },
    radius: 1,
    // It takes the E from whatever you're pressed up against.
    bias: -50,
    enabled: () => stuckOffer && status.mode === 'walk' && !dialogue.active && !status.scripting,
    onInteract: () => void unstuck(),
  });
  /** Watches for a walker or a ship that's trying to move and can't (called each frame). */
  function watchStuck(dt: number, s: InputState): void {
    if (status.mode === 'walk') {
      // Held at the swim's soft edge isn't stuck: that's as far as you go (its own tip says so).
      const atSwimEdge = player.mode === 'swim' && player.swimRoom < player.tune.swimSoft;
      const pushing =
        Math.hypot(s.moveX, s.moveY) > 0.5 &&
        !dialogue.active &&
        !status.scripting &&
        !host.riding() &&
        !atSwimEdge;
      const moved = Math.hypot(player.x - pushFrom.x, player.z - pushFrom.z);
      if (!pushing || moved > STUCK_RADIUS) {
        pushFrom.x = player.x;
        pushFrom.z = player.z;
        pushFor = 0;
        if (stuckOffer && Math.hypot(player.x - stuckSpot.x, player.z - stuckSpot.z) > 4) stuckOffer = false;
      } else if ((pushFor += dt) > STUCK_AFTER && !stuckOffer) {
        stuckSpot.x = player.x;
        stuckSpot.z = player.z;
        offerUnstuck(false);
      }
    } else if (status.mode === 'sail' && !status.crewAtHelm && !host.battling()) {
      const trying = helm.trim > 0.3 || Math.abs(s.moveX) > 0.5 || Math.abs(s.moveY) > 0.5;
      const speed = Math.abs(dyn.forwardSpeed);
      if (speed > 1.5 || !trying || host.berthInRange()) {
        pushFor = 0;
        if (speed > 1.5) stuckOffer = false;
      } else if (speed < 0.6 && (pushFor += dt) > SHIP_STUCK_AFTER && !stuckOffer) offerUnstuck(true);
    } else {
      pushFor = 0;
      stuckOffer = false;
    }
  }
  async function unstuck(): Promise<boolean> {
    if (status.mode === 'walk' && !host.riding() && !status.scripting) {
      const g = wayfinder.walk(status.island);
      const i = g ? g.nearest(player.x, player.y, player.z) : -1;
      if (!g || i < 0) return false;
      host.setMode('transition');
      input.enabled = false;
      hud.setPrompt(null);
      await hud.fade(true, 260);
      g.point(i, stuckSpot);
      // Face along the route toward whatever the compass is on.
      let heading = player.heading;
      const aim = compass.aim;
      if (aim) {
        g.route(stuckSpot.x, stuckSpot.y, stuckSpot.z, aim.x, aim.y, aim.z, unstuckRoute);
        if (Math.hypot(unstuckRoute.x - stuckSpot.x, unstuckRoute.z - stuckSpot.z) > 0.5)
          heading = Math.atan2(unstuckRoute.x - stuckSpot.x, unstuckRoute.z - stuckSpot.z);
      }
      host.place(stuckSpot.x, stuckSpot.z, heading, stuckSpot.y + 0.5);
      stuckOffer = false;
      pushFor = 0;
      compass.reset();
      host.setMode('walk');
      input.enabled = !status.paused;
      await hud.fade(false, 260);
      hud.toast('Back on the path. Follow the compass from here.', 3.5);
      return true;
    }
    if (status.mode === 'sail' && !status.crewAtHelm && !host.battling()) {
      const chart = wayfinder.sea;
      const i = chart.nearest(dyn.pose.x, dyn.pose.z);
      if (i < 0) return false;
      host.setMode('transition');
      input.enabled = false;
      hud.setPrompt(null);
      await hud.fade(true, 300);
      const p = chart.point(i);
      const goal = host.sailTarget();
      const next = chart.path(p.x, p.z, goal.mooring.x, goal.mooring.z)[0]!;
      const heading = Math.atan2(next.x - p.x, next.z - p.z);
      dyn.reset(p.x, p.z, heading);
      cam.snapBehind(heading);
      stuckOffer = false;
      pushFor = 0;
      compass.reset(false);
      host.setMode('sail');
      input.enabled = !status.paused;
      await hud.fade(false, 300);
      hud.toast('The crew warped her off into open water. Follow the compass from here.', 4);
      return true;
    }
    return false;
  }

  return {
    /** The hop's on offer (E takes it, and Wingman's hint says so). */
    get offered(): boolean {
      return stuckOffer;
    },
    watch: watchStuck,
    /** The hop itself. False when there's nothing to do (a script, a ride, the crew at the helm). */
    run: unstuck,
  };
}

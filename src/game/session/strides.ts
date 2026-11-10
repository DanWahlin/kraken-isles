import type { Camera } from 'three/webgpu';
import type { IslesAudio } from '../../audio';
import type { FootstepSurface } from '../../audio/soundscape/soundscape';
import type { Character } from '../../world/characters';
import { travelDirection } from '../../world/characters/parrot-flight';
import type { SurfaceKind } from '../collision';
import type { Dialogue } from '../dialogue';
import type { FootstepPuffs } from '../footstep-puffs';
import type { Hud } from '../hud';
import type { PlayerController } from '../player-controller';
import type { SwimBounds } from '../swim-bounds';
import type { SessionStatus } from './types';
import type { Wingman } from './wingman';

const STEP_WALK = 0.78;
const STEP_RUN = 1.15;
/** Where a hand goes into the water swimming the crawl, from the feet's spot (m out, m ahead). */
const ENTRY_OUT = 0.42;
const ENTRY_AHEAD = 0.32;
/** Treading water, a ripple about this often (s). */
const TREAD_RIPPLE = 1.4;

export interface StridesHost {
  status: SessionStatus;
  player: PlayerController;
  hero: Character;
  audio: IslesAudio | null;
  hud: Hud;
  dialogue: Dialogue;
  puffs: FootstepPuffs;
  swimBounds: SwimBounds;
  wing: Wingman;
  camera: Camera;
  /** Wingman's welcome is on (he doesn't leave it for a swim). */
  welcoming(): boolean;
}

/**
 * The walker's sounds and marks: footsteps and their puffs ashore, strokes and ripples afloat, the
 * splash or thud of a landing, and Wingman off the shoulder for a swim (he'd be in the water).
 */
export type Strides = ReturnType<typeof createStrides>;

export function createStrides(host: StridesHost) {
  const { status, player, hero, audio, hud, dialogue, swimBounds, wing } = host;
  const footstepPuffs = host.puffs;
  const wingman = wing.flight;
  const flightView = wing.view;
  /** The swimming captain's travel, for Wingman's escort (`flightView.travel` while he swims). */
  const swimTravel = { x: 0, z: 1 };
  let stride = 0;
  const footstep = (kind: SurfaceKind): FootstepSurface => {
    if (kind === 'stone') return 'rock';
    if (kind === 'sand') return player.waterY - player.y > -0.18 ? 'wetsand' : 'sand';
    return kind;
  };
  let stepSide = 1;
  const puffFootstep = (intensity = 1) => {
    stepSide *= -1;
    const side = stepSide * 0.17;
    const forward = player.speed > 2.8 ? 0.18 : 0.08;
    const s = Math.sin(player.heading);
    const c = Math.cos(player.heading);
    const surface = player.mode === 'wade' ? 'water' : player.surface;
    footstepPuffs.spawn(
      player.x + c * side + s * forward,
      surface === 'water' ? Math.max(player.y, player.waterY) : player.y,
      player.z - s * side + c * forward,
      surface,
      player.heading,
      intensity,
    );
  };

  /** Ripples where a hand (side 1 the left) pulls through the surface, beside the head. */
  const puffHand = (side: number, intensity: number, out = 0.32, ahead = 0.25 + 0.25 * player.stroke) => {
    const s = Math.sin(player.heading);
    const c = Math.cos(player.heading);
    footstepPuffs.spawn(
      player.x + c * side * out + s * ahead,
      player.waterY,
      player.z - s * side * out + c * ahead,
      'water',
      player.heading,
      intensity,
    );
  };
  const puffStroke = (intensity = 1) => {
    puffHand(-1, intensity);
    puffHand(1, intensity);
  };
  /** The next ripple treading water, and the edge's tip shown. */
  let treadIn = TREAD_RIPPLE;
  let swimEdgeTold = false;
  /**
   * Afloat: a soft splash and a ripple as each hand goes in (the crawl's own timing), a ripple now and
   * then treading water, and Wingman off the shoulder (he'd be in the water) until you're standing again.
   */
  const updateSwim = (dt: number) => {
    // Asked every frame, so a hand that went in while wading doesn't splash later.
    const entries = hero.strokeEntries();
    if (player.mode === 'swim') {
      const pace = player.animSpeed;
      if (pace > 0.25 && player.stroke > 0.3) {
        const intensity = 0.55 + 0.35 * Math.min(1, pace / player.tune.swimRunSpeed);
        if (entries) audio?.sfx.footstep('water', player);
        if (entries & 1) puffHand(1, intensity, ENTRY_OUT, ENTRY_AHEAD);
        if (entries & 2) puffHand(-1, intensity, ENTRY_OUT, ENTRY_AHEAD);
        treadIn = TREAD_RIPPLE;
      } else if ((treadIn -= dt) <= 0) {
        treadIn = TREAD_RIPPLE;
        puffStroke(0.35);
      }
      if (
        !swimEdgeTold &&
        player.swimRoom < player.tune.swimSoft * 0.5 &&
        swimBounds.limit === 'shore' &&
        !dialogue.active
      ) {
        swimEdgeTold = true;
        hud.toast('That’s as far out as you can swim. The shore’s behind you.', 4);
      }
    }
    if (!wingman) return;
    const afloat = player.mode === 'swim' && player.afloat > 0.6;
    // Off the shoulder for a swim he escorts you, facing the way you're going (parrot-flight.ts).
    flightView.travel =
      afloat || wingmanSwimming ? travelDirection(player.vx, player.vz, player.heading, swimTravel) : null;
    if (afloat && !wingmanSwimming && wingman.phase === 'perched' && !host.welcoming() && !status.scripting) {
      wing.takeOff();
      wingmanSwimming = true;
    } else if (wingmanSwimming && player.afloat < 0.3) {
      wingmanSwimming = false;
      flightView.travel = null;
      wingman.land();
    }
  };
  /** Wingman's off the shoulder because you're swimming (he lands once you stand). */
  let wingmanSwimming = false;

  /** This frame's strokes, footsteps and landing (after the walker has stepped). */
  function update(dt: number): void {
    const sp = player.speed;
    updateSwim(dt);
    if (player.mode === 'swim') {
      // Strokes, not footsteps (updateSwim).
    } else if (player.mode !== 'air' && sp > 0.3) {
      stride += sp * dt;
      const len = sp > 3 ? STEP_RUN : STEP_WALK;
      if (stride > len) {
        stride -= len;
        audio?.sfx.footstep(footstep(player.surface), player);
        puffFootstep(sp > 3 ? 1.25 : 0.9);
      }
    }
    if (player.landed && player.mode === 'swim') {
      audio?.sfx.oneShot('splash', player, 0.5);
      puffStroke(1.6);
    } else if (player.landed) {
      audio?.sfx.footstep(footstep(player.surface), player);
      puffFootstep(1.35);
    }
  }

  return {
    update,
    /** The footstep sound for a walk surface (wet sand by the water's edge). */
    surface: footstep,
  };
}

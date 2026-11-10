import type { Camera } from 'three/webgpu';
import type { IslesAudio } from '../../audio';
import type { FootstepSurface } from '../../audio/soundscape/soundscape';
import type { Input } from '../../engine/input';
import { world as worldUniforms } from '../../engine/uniforms';
import type { Character } from '../../world/characters';
import type { CollisionWorld, SurfaceKind } from '../collision';
import type { CameraShot, FollowCamera } from '../follow-camera';
import type { Hud } from '../hud';
import type { Interactions } from '../interaction';
import {
  GALLERY_CAMERA_COLUMN,
  LIGHTHOUSE_GROUND_DOOR,
  LIGHTHOUSE_STAIR_HEAD,
  lighthouseArrival,
  lighthouseFade,
  lighthouseTransitAt,
  onLighthouseGallery,
  type LighthouseDirection,
} from '../lighthouse-transit';
import type { PlayerController } from '../player-controller';
import type { SessionStatus } from './types';

export interface LighthouseHost {
  status: SessionStatus;
  hud: Hud;
  input: Input;
  audio: IslesAudio | null;
  interactions: Interactions;
  hero: Character;
  cam: FollowCamera;
  camera: Camera;
  world: CollisionWorld;
  player: PlayerController;
  /** The footstep sound for a walk surface. */
  footstep(kind: SurfaceKind): FootstepSurface;
}

/**
 * Anchorage's lighthouse stair (Dan: the spiral climb and its camera were too hard): walk in through
 * the ground door, or in from the watch-room door to the stairwell (or press E at either), and a
 * short fade fast-forwards you to the other end, standing in the doorway facing out with the follow
 * camera behind you. On the gallery the camera keeps out of the tower, so it stays behind you and W
 * walks you on round.
 */
export type LighthouseStair = ReturnType<typeof createLighthouseStair>;

export function createLighthouseStair(host: LighthouseHost) {
  const { status, hud, input, audio, interactions, hero, cam, camera, world, player } = host;
  let lighthouseTransit: LighthouseDirection | null = null;
  const lighthouseHold: CameraShot = { x: 0, y: 0, z: 0, tx: 0, ty: 0, tz: 0 };
  async function runLighthouse(dir: LighthouseDirection): Promise<void> {
    if (lighthouseTransit || status.mode !== 'walk') return;
    lighthouseTransit = dir;
    const fade = lighthouseFade(worldUniforms.reducedMotion.value > 0.5);
    input.enabled = false;
    hud.setPrompt(null);
    hero.setSpeed(0);
    // The camera holds where it is while the screen darkens, so it doesn't close in on your head as
    // you step on into the doorway (the fast-forward puts it behind you at the other end).
    lighthouseHold.x = camera.position.x;
    lighthouseHold.y = camera.position.y;
    lighthouseHold.z = camera.position.z;
    lighthouseHold.tx = player.x;
    lighthouseHold.ty = player.y + cam.rig.pivotY;
    lighthouseHold.tz = player.z;
    cam.cut(lighthouseHold);
    await hud.fade(true, fade.out);
    if (status.disposed) return;
    const a = lighthouseArrival(dir);
    player.teleport(world, a.x, a.z, a.heading, a.y);
    hero.group.position.set(player.x, player.y, player.z);
    hero.group.rotation.y = player.heading;
    cam.release();
    cam.keepOutside(dir === 'up' ? GALLERY_CAMERA_COLUMN : null);
    cam.snapBehind(a.cameraYaw);
    if (a.cameraPitch !== null) cam.pitch = a.cameraPitch;
    // A quick patter of steps while it's dark: the run up (or down) the stair.
    for (let i = 0; i < fade.steps; i++)
      window.setTimeout(
        () => audio?.sfx.footstep(host.footstep('stone'), player),
        (i * fade.hold) / Math.max(1, fade.steps),
      );
    await new Promise((resolve) => window.setTimeout(resolve, fade.hold));
    if (status.disposed) return;
    lighthouseTransit = null;
    input.enabled = !status.paused;
    await hud.fade(false, fade.in);
  }
  const updateLighthouse = (): void => {
    cam.keepOutside(onLighthouseGallery(player.x, player.y, player.z) ? GALLERY_CAMERA_COLUMN : null);
    if (lighthouseTransit || status.scripting || cam.framing) return;
    const dir = lighthouseTransitAt(player.x, player.y, player.z, player.mode !== 'air');
    if (dir) void runLighthouse(dir);
  };
  interactions.add({
    id: 'lighthouse:up',
    label: () => 'Climb to the top',
    ...LIGHTHOUSE_GROUND_DOOR,
    enabled: () => status.mode === 'walk' && !lighthouseTransit && status.island === 'anchorage',
    onInteract: () => void runLighthouse('up'),
  });
  interactions.add({
    id: 'lighthouse:down',
    label: () => 'Go back down',
    ...LIGHTHOUSE_STAIR_HEAD,
    enabled: () => status.mode === 'walk' && !lighthouseTransit && status.island === 'anchorage',
    onInteract: () => void runLighthouse('down'),
  });

  return {
    update: updateLighthouse,
    /** The fast-forward under way ('up', 'down') or null. */
    get transit(): LighthouseDirection | null {
      return lighthouseTransit;
    },
  };
}

import { Vector3 } from 'three/webgpu';
import type { IslesAudio } from '../../audio';
import { HOME_ISLAND } from '../../islands/registry';
import type { LearnStore } from '../../learn/store';
import type { CoveScene } from '../../world/cove-scene';
import { starfishCount } from '../../world/starfish/spots';
import type { CollisionWorld } from '../collision';
import type { Dialogue } from '../dialogue';
import type { FollowCamera } from '../follow-camera';
import type { Hud } from '../hud';
import { ISLANDS, islandAt } from '../islands';
import type { PlayerController } from '../player-controller';
import type { SessionStatus } from './types';

export interface StarfishHost {
  status: SessionStatus;
  cove: Pick<CoveScene, 'starfish' | 'islands'>;
  learn: LearnStore | null;
  world: CollisionWorld;
  player: PlayerController;
  audio: IslesAudio | null;
  hud: Hud;
  dialogue: Dialogue;
  cam: FollowCamera;
}

/**
 * Starfish to collect (Dan: "like Mario's stars"): walk into one to pick it up. Each pays five
 * doubloons, and an island's last pays twenty more; the purse counts the island you're on.
 * Returns the frame's update.
 */
export function createStarfishHunt(host: StarfishHost): (dt: number) => void {
  const { status, cove, learn, world, player, audio, hud, dialogue, cam } = host;
  const starfish = cove.starfish;
  const starfishAt = new Vector3();
  const starfishCamera: ({ x: number; z: number; r: number; y0: number; y1: number } | undefined)[] = [];
  let starfishTold = '';
  let starfishWalk = 0;
  starfish.setFound(learn?.progress.data.starfish ?? []);
  const updateStarfish = (dt: number): void => {
    // The island under your feet (a chart jump or a teleport can land you on either).
    const here = islandAt(player.x, player.z);
    const name = ISLANDS[here].name;
    learn?.setStarfishIsland(status.mode === 'walk' ? { id: here, name } : null);
    if (status.mode !== 'walk' || !learn) return;
    const ready = here === HOME_ISLAND || !!cove.islands[here]?.world;
    for (let i = 0; i < starfish.spots.length; i += 1) {
      const sp = starfish.spots[i]!;
      if (sp.island !== here) continue;
      if (!starfish.grounded(i)) {
        if (!ready) continue;
        starfish.setGround(i, world.groundAt(sp.x, sp.z, sp.y));
        // Keeps the follow camera out of the floating star (a pickup in a tight spot, like the
        // boathouse's, drew the camera through it); found stars drop theirs below.
        if (!learn.progress.data.starfish.includes(sp.id)) {
          starfish.centre(i, starfishAt);
          const c = {
            x: starfishAt.x,
            z: starfishAt.z,
            r: 0.5,
            y0: starfishAt.y - 0.5,
            y1: starfishAt.y + 0.5,
          };
          starfishCamera[i] = c;
          world.addCameraCircle(c);
        }
        continue;
      }
      starfish.centre(i, starfishAt);
      if (Math.hypot(player.x - starfishAt.x, player.z - starfishAt.z) > 1.1) continue;
      if (Math.abs(player.y + 0.6 - starfishAt.y) > 1.3) continue;
      const got = learn.collectStarfish(sp.id, sp.island);
      if (!got) continue;
      starfish.setFound(learn.progress.data.starfish);
      const blocker = starfishCamera[i];
      if (blocker) blocker.y0 = blocker.y1 = Number.NEGATIVE_INFINITY;
      audio?.sfx.oneShot('chime_solve', starfishAt, 0.7);
      hud.toast(
        got.complete
          ? `You found all ${got.total} starfish on ${name}! +${got.earned} doubloons`
          : `Starfish! ${got.found} of ${got.total} on ${name}. +${got.earned} doubloons`,
        4,
      );
    }
    // Tells you once a visit, after a little walking, how many hide here (until you've found one).
    if (starfishTold === here || dialogue.active || status.scripting || cam.framing) return;
    if ((starfishWalk += dt) < 20) return;
    starfishTold = here;
    starfishWalk = 0;
    const { found, total } = starfishCount(here, learn.progress.data.starfish);
    if (found === 0)
      hud.toast(`${total} starfish hide on ${name}. Can you find them all? Your count's by the purse.`, 6);
  };
  return updateStarfish;
}

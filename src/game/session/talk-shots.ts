import type { CollisionWorld } from '../collision';
import type { CameraShot } from '../follow-camera';
import type { Npc } from '../npcs';

// Metres: keep the captain's head clear of the lens and the shoulder at the frame edge.
const TALK_CAMERA_PULLBACK_M = 2.55;
const TALK_CAMERA_SIDE_M = 1.4;
const TALK_CAMERA_SHORT_PULLBACK_M = 2.15;
const TALK_CAMERA_EYE_LIFT_M = 2.4;
const TALK_CAMERA_SEATED_EYE_LIFT_M = 2.1;
const TALK_CAMERA_HEAD_CLEARANCE_M = 1.2;

type Point = { x: number; y: number; z: number };

/** A point in an islander's own space (x to their right, z ahead of them), in the world. */
export function localNpcPoint(n: Npc, local: readonly [x: number, z: number]): { x: number; z: number } {
  const rightX = Math.cos(n.heading);
  const rightZ = -Math.sin(n.heading);
  const forwardX = Math.sin(n.heading);
  const forwardZ = Math.cos(n.heading);
  return {
    x: n.x + rightX * local[0] + forwardX * local[1],
    z: n.z + rightZ * local[0] + forwardZ * local[1],
  };
}

/** A shot given in an islander's own space (a stage, a counter: `NpcSpec.talkShot`). */
export function localNpcShot(
  n: Npc,
  shotLocal: readonly [number, number, number],
  targetLocal: readonly [number, number, number],
): CameraShot {
  const shot = localNpcPoint(n, [shotLocal[0], shotLocal[2]]);
  const target = localNpcPoint(n, [targetLocal[0], targetLocal[2]]);
  return {
    x: shot.x,
    y: n.y + shotLocal[1],
    z: shot.z,
    tx: target.x,
    ty: n.y + targetLocal[1],
    tz: target.z,
  };
}

/** The camera's shots of a conversation: over your shoulder at an islander, or a two-shot of a pair. */
export interface TalkShots {
  /** The shot of you talking with `n`: the first clear one of several round you both. */
  npcShot(n: Npc): CameraShot;
  /**
   * A two-shot of two islanders side by side: square on to the pair from your side, pulled back to fit
   * them both, and never with you standing in the way of either face. Null when there's no clear one.
   */
  pairShot(a: Npc, b: Npc): CameraShot | null;
}

/** `player` is read live (where the captain stands when a conversation starts). */
export function createTalkShots(
  world: Pick<CollisionWorld, 'waterAt' | 'groundAt' | 'sightBlockedAt'>,
  player: Readonly<Point>,
): TalkShots {
  const talkShotAt = (x: number, z: number, y: number, target: Point): CameraShot => ({
    x,
    y: Math.max(y, world.waterAt(x, z, 0) + 0.7, world.groundAt(x, z) + 0.45),
    z,
    tx: target.x,
    ty: target.y,
    tz: target.z,
  });

  function npcShot(n: Npc): CameraShot {
    if (n.spec.talkShot) return localNpcShot(n, n.spec.talkShot.shotLocal, n.spec.talkShot.targetLocal);
    const dx = player.x - n.x;
    const dz = player.z - n.z;
    const len = Math.hypot(dx, dz) || 1;
    const fx = dx / len;
    const fz = dz / len;
    const rightX = fz;
    const rightZ = -fx;
    const seated = n.spec.clip === 'sit';
    const targetY = n.y + (seated ? 0.98 : 1.52);
    const eyeLift = n.spec.talkEyeLift ?? (seated ? TALK_CAMERA_SEATED_EYE_LIFT_M : TALK_CAMERA_EYE_LIFT_M);
    const target = { x: n.x, y: targetY, z: n.z };
    const candidates: CameraShot[] = [
      talkShotAt(
        player.x + fx * TALK_CAMERA_PULLBACK_M + rightX * TALK_CAMERA_SIDE_M,
        player.z + fz * TALK_CAMERA_PULLBACK_M + rightZ * TALK_CAMERA_SIDE_M,
        Math.max(player.y + eyeLift, targetY + 0.18),
        target,
      ),
      talkShotAt(
        player.x + fx * TALK_CAMERA_PULLBACK_M - rightX * TALK_CAMERA_SIDE_M,
        player.z + fz * TALK_CAMERA_PULLBACK_M - rightZ * TALK_CAMERA_SIDE_M,
        Math.max(player.y + eyeLift, targetY + 0.18),
        target,
      ),
      talkShotAt(
        player.x + fx * TALK_CAMERA_SHORT_PULLBACK_M + rightX * TALK_CAMERA_SIDE_M,
        player.z + fz * TALK_CAMERA_SHORT_PULLBACK_M + rightZ * TALK_CAMERA_SIDE_M,
        Math.max(player.y + eyeLift, targetY + 0.18),
        target,
      ),
      talkShotAt(
        player.x + fx * TALK_CAMERA_SHORT_PULLBACK_M - rightX * TALK_CAMERA_SIDE_M,
        player.z + fz * TALK_CAMERA_SHORT_PULLBACK_M - rightZ * TALK_CAMERA_SIDE_M,
        Math.max(player.y + eyeLift, targetY + 0.18),
        target,
      ),
      talkShotAt(
        n.x + fx * 2.75 + rightX * 1.35,
        n.z + fz * 2.75 + rightZ * 1.35,
        Math.max(n.y + eyeLift, targetY + 0.28),
        target,
      ),
      talkShotAt(
        n.x + fx * 2.75 - rightX * 1.35,
        n.z + fz * 2.75 - rightZ * 1.35,
        Math.max(n.y + eyeLift, targetY + 0.28),
        target,
      ),
    ];
    const first = candidates.find(
      (candidate) => validTalkShot(candidate, target) && !blocksView(candidate, n),
    );
    if (first) return first;
    // Boxed in (a stage, a fountain, a wall behind you): look for a clear two-shot all round them.
    const toPlayer = Math.atan2(fx, fz);
    for (const dist of [3.2, 4.4, 2.4])
      for (const turn of [0.6, -0.6, 1.2, -1.2, 0, 1.9, -1.9, Math.PI]) {
        const a = toPlayer + turn;
        const x = n.x + Math.sin(a) * dist,
          z = n.z + Math.cos(a) * dist;
        const shot = talkShotAt(
          x,
          z,
          Math.max(n.y + eyeLift + 0.3, world.groundAt(x, z) + 1.4, world.waterAt(x, z, 0) + 0.8),
          target,
        );
        if (validTalkShot(shot, target) && !blocksView(shot, n)) return shot;
      }
    return candidates[0]!;
  }

  function pairShot(a: Npc, b: Npc): CameraShot | null {
    const sep = Math.hypot(a.x - b.x, a.z - b.z);
    if (sep > 6 || sep < 0.3) return null;
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + 1.12, z: (a.z + b.z) / 2 };
    // The pair's normal, on your side of them.
    let nx = -(b.z - a.z) / sep;
    let nz = (b.x - a.x) / sep;
    if (nx * (player.x - mid.x) + nz * (player.z - mid.z) < 0) [nx, nz] = [-nx, -nz];
    const playerLen = Math.hypot(player.x - mid.x, player.z - mid.z) || 1;
    const fx = (player.x - mid.x) / playerLen;
    const fz = (player.z - mid.z) / playerLen;
    const rightX = fz;
    const rightZ = -fx;
    const eyeLift =
      a.spec.clip === 'sit' && b.spec.clip === 'sit' ? TALK_CAMERA_SEATED_EYE_LIFT_M : TALK_CAMERA_EYE_LIFT_M;
    const eyeY = Math.max(player.y + eyeLift, mid.y + eyeLift - 1.12);
    for (const [back, side] of [
      [TALK_CAMERA_PULLBACK_M, TALK_CAMERA_SIDE_M],
      [TALK_CAMERA_PULLBACK_M, -TALK_CAMERA_SIDE_M],
      [TALK_CAMERA_SHORT_PULLBACK_M, TALK_CAMERA_SIDE_M],
      [TALK_CAMERA_SHORT_PULLBACK_M, -TALK_CAMERA_SIDE_M],
    ]) {
      const shot = talkShotAt(
        player.x + fx * back + rightX * side,
        player.z + fz * back + rightZ * side,
        eyeY,
        mid,
      );
      if (!validTalkShot(shot, mid) || blocksView(shot, a) || blocksView(shot, b)) continue;
      return shot;
    }
    const base = Math.atan2(nx, nz);
    const back = 2.3 + sep * 0.6;
    for (const turn of [0, 0.3, -0.3, 0.55, -0.55]) {
      const ang = base + turn;
      const x = mid.x + Math.sin(ang) * back;
      const z = mid.z + Math.cos(ang) * back;
      const shot = talkShotAt(
        x,
        z,
        Math.max(eyeY, world.groundAt(x, z) + 1.3, world.waterAt(x, z, 0) + 0.8),
        mid,
      );
      if (!validTalkShot(shot, mid)) continue;
      if (blocksView(shot, a) || blocksView(shot, b)) continue;
      return shot;
    }
    return null;
  }

  /** Whether you stand between the camera and an islander's face. */
  function blocksView(shot: CameraShot, n: Npc): boolean {
    const fx = n.x - shot.x;
    const fz = n.z - shot.z;
    const len2 = fx * fx + fz * fz;
    const t = ((player.x - shot.x) * fx + (player.z - shot.z) * fz) / Math.max(1e-6, len2);
    if (t <= 0 || t >= 1) return false;
    const px = shot.x + fx * t - player.x;
    const pz = shot.z + fz * t - player.z;
    return px * px + pz * pz < 0.55 * 0.55;
  }

  function validTalkShot(shot: CameraShot, target: Point): boolean {
    if (
      Math.hypot(shot.x - player.x, shot.y - (player.y + 1.5), shot.z - player.z) <
      TALK_CAMERA_HEAD_CLEARANCE_M
    )
      return false;
    // The camera itself: not inside a wall, a tower, or the hillside.
    if (world.sightBlockedAt(shot.x, shot.y, shot.z, 0.3) || shot.y < world.groundAt(shot.x, shot.z) + 0.4)
      return false;
    for (let i = 1; i < 8; i += 1) {
      const t = i / 8;
      const x = shot.x + (target.x - shot.x) * t;
      const y = shot.y + (target.y - shot.y) * t;
      const z = shot.z + (target.z - shot.z) * t;
      if (world.sightBlockedAt(x, y, z, 0.08)) return false;
    }
    return true;
  }

  return { npcShot, pairShot };
}

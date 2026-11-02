import { toWorld } from './layout';

/** A flyover key in the island frame: the camera at (u, y, v), looking at (tu, ty, tv). */
function key(u: number, y: number, v: number, tu: number, ty: number, tv: number, pace: number) {
  const p = toWorld(u, v);
  const t = toWorld(tu, tv);
  return { x: p.x, y, z: p.z, tx: t.x, ty, tz: t.z, pace };
}

/**
 * Guildcrest's arrival flyover keys (spec §10.5, as built): in low toward the loch's mouth with the
 * town, the tower, the mills and the ben ahead (the card holds here), into the loch past the ship, over
 * the quay to the square and the linn, up the brae over the cloister, along the ridge past the mills,
 * round the bell tower, and down to the captain on the quay. Plain data: the registry entry's
 * `GUILDCREST_ARRIVAL` (stage 3) takes these with its card, `seconds: 30`, `cardAt: 0.6`, `cardFor: 6.4`.
 */
export const GUILDCREST_ARRIVAL_KEYS = [
  key(-760, 24, -40, 40, 60, 80, 0.45),
  key(-430, 16, -30, -196, 6, 8, 1.1),
  key(-220, 26, 0, -96, 12, 46, 0.8),
  key(-90, 48, 40, 22, 40, 130, 0.75),
  key(10, 72, 100, 150, 56, 200, 0.8),
  key(100, 76, 110, 56, 70, 114, 0.8),
  key(-170, 12, 20, -190, 3, 16, 0.75),
] as const;

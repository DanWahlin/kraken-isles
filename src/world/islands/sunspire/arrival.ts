import { toWorld } from './layout';

/** A flyover key in the island frame: the camera at (u, y, v), looking at (tu, ty, tv). */
function key(u: number, y: number, v: number, tu: number, ty: number, tv: number, pace: number) {
  const p = toWorld(u, v);
  const t = toWorld(tu, tv);
  return { x: p.x, y, z: p.z, tx: t.x, ty, tz: t.z, pace };
}

/**
 * Sunspire's arrival flyover keys (spec §2.1, H1): in low toward the cove's mouth with the town, both
 * tables, the Sunspire and Red Butte ahead (the card holds here), into the cove past the ship, over the
 * quay to the bazaar, across to the oasis and the Weeping Wall, up over the Mirror Court, round the
 * Sunspire, and down to the captain on the quay. Plain data: the registry entry's `SUNSPIRE_ARRIVAL`
 * takes these with its card.
 */
export const SUNSPIRE_ARRIVAL_KEYS = [
  key(-760, 24, -40, 60, 50, 60, 0.45),
  key(-430, 16, -30, -196, 6, 8, 1.1),
  key(-230, 24, -6, -110, 12, 50, 0.8),
  key(-110, 40, 10, 10, 16, -28, 0.75),
  key(-20, 58, 60, 90, 30, 60, 0.8),
  key(110, 100, 36, 198, 98, 96, 0.8),
  key(-170, 12, 20, -190, 3, 16, 0.75),
] as const;

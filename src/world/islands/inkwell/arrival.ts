import { toWorld } from './layout';

/** A flyover key in the island frame: the camera at (u, y, v), looking at (tu, ty, tv). */
function key(u: number, y: number, v: number, tu: number, ty: number, tv: number, pace: number) {
  const p = toWorld(u, v);
  const t = toWorld(tu, tv);
  return { x: p.x, y, z: p.z, tx: t.x, ty, tz: t.z, pace };
}

/**
 * Inkwell's arrival flyover keys (spec §2.1, H1): in low toward the cove's mouth with the white town,
 * the cliff and the Dome ahead (the card holds here), into the cove past the ship, up over the
 * terraces and the Gossip Stair to the Plaza, along the Kite Walk over the cliff's edge, round the
 * Great Chart and the Dome, and down to the captain on the quay. Plain data: the registry entry's
 * `INKWELL_ARRIVAL` takes these with its card.
 */
export const INKWELL_ARRIVAL_KEYS = [
  key(-760, 24, -40, 40, 30, 110, 0.45),
  key(-430, 16, -30, -196, 6, 8, 1.1),
  key(-236, 22, -4, -110, 14, 62, 0.8),
  key(-128, 40, 52, -46, 28, 124, 0.75),
  key(-30, 52, 196, 70, 36, 148, 0.8),
  key(96, 74, 168, 226, 80, 94, 0.8),
  key(-170, 12, 20, -190, 3, 16, 0.75),
] as const;

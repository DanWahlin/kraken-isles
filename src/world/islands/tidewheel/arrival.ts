import { toWorld } from './layout';

/** A flyover key in the island frame: the camera at (u, y, v), looking at (tu, ty, tv). */
function key(u: number, y: number, v: number, tu: number, ty: number, tv: number, pace: number) {
  const p = toWorld(u, v);
  const t = toWorld(tu, tv);
  return { x: p.x, y, z: p.z, tx: t.x, ty, tz: t.z, pace };
}

/**
 * Tidewheel's arrival flyover keys (spec T3, T5): in low toward the breach with the ring's wall
 * across the view and the Lighthouse in the gap (the card holds here), through the breach under the
 * Tide Wheel, across the bay to the quay, up over the lamp-lit terraces to the Wheel Works, along the
 * Clock Walk to the court, round the Lighthouse's clock, and down to the captain on the quay. Plain
 * data: the registry entry's `TIDEWHEEL_ARRIVAL` takes these with its card.
 */
export const TIDEWHEEL_ARRIVAL_KEYS = [
  key(-790, 20, -44, -34, 56, -31, 0.45),
  key(-548, 14, -34, -300, 22, -24, 1.0),
  key(-430, 18, -6, -150, 12, 44, 0.9),
  key(-212, 20, -8, -122, 20, 96, 0.8),
  key(-150, 44, 86, -90, 34, 96, 0.75),
  key(-98, 56, 84, -34, 62, -31, 0.8),
  key(-96, 70, -52, -34, 64, -31, 0.8),
  key(-170, 12, 20, -190, 3, 16, 0.75),
] as const;

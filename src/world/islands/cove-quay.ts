import { rod, type Buckets } from '../village/pieces';
import { lineDeck, uvDeck } from '../village/walk-decks';
import { COVE_QUAY } from './cove-harbour';
import type { FrameBuilder, IslandOut } from './frame-build';

/** The colours a cove quay reads from an island's palette. */
export interface QuayPaint {
  /** The wall's stone over the water line, and under it. */
  wall: number;
  wetStone: number;
  paving: number;
  /** The fenders and the rubbing timber down the face. */
  fender: number;
  iron: number;
}

/**
 * The cove harbour's quay (`COVE_QUAY`), the same on every frame island: a stone wall along the cove
 * from its bed to the deck (2.2 m), its face on the quay's `v`, paving on top, timber fenders down
 * the face every 6 m, bollards, a rail with a gap for the gangway, a lamp at its west end, and a
 * stone ramp down into the water at its east end. The ship's obstacles run along the face. The paving
 * runs 3 m back from the face, or to `paveTo` (frame v) where a town's apron continues it.
 */
export function buildCoveQuay<S extends string>(
  {
    at,
    ground,
    ubox,
    uvSpan,
    lampPost,
    YAW_U,
  }: Pick<FrameBuilder<S>, 'at' | 'ground' | 'ubox' | 'uvSpan' | 'lampPost' | 'YAW_U'>,
  b: Buckets,
  out: IslandOut<S>,
  paints: QuayPaint,
  paveTo?: number,
): void {
  const q = COVE_QUAY;
  const back = q.v + 3;
  for (let u = q.u0; u < q.u1; u += 6) {
    const u1 = Math.min(q.u1, u + 6);
    const mid = (u + u1) / 2;
    const bed = Math.min(ground(mid, q.v - 1), ground(mid, q.v + 0.5)) - 0.8;
    uvSpan(b, 'stone', u, u1, q.v - 0.2, back, bed, 0.4, paints.wetStone);
    uvSpan(b, 'stone', u, u1, q.v - 0.2, back, 0.4, q.top - 0.18, paints.wall);
  }
  // The coping and the paving behind it (3 cm over the deck's ground: the terrain's pad is at 2.2).
  const paved = paveTo ?? back + 0.1;
  uvSpan(b, 'paving', q.u0 - 0.1, q.u1 + 0.1, q.v - 0.3, paved, q.top - 0.16, q.top + 0.03, paints.paving);
  out.decks.push(uvDeck(q.u0 - 0.1, q.u1 + 0.1, q.v - 0.3, paved, q.top + 0.03, false));
  // Fenders and a rubbing timber down the face.
  ubox(b, 'wood', (q.u0 + q.u1) / 2, q.top - 0.5, q.v - 0.36, q.u1 - q.u0 - 2, 0.3, 0.3, paints.fender);
  for (let u = q.u0 + 3; u <= q.u1 - 3; u += 6)
    ubox(b, 'wood', u, q.top - 1.5, q.v - 0.42, 0.3, 2.6, 0.24, paints.fender);
  for (let u = q.u0 + 6; u <= q.u1 - 6; u += 12) {
    const p = at(u, q.top, q.v + 0.9);
    rod(b, 'metal', p, { x: p.x, y: q.top + 0.6, z: p.z }, 0.18, 8, paints.iron, 0.22);
    out.circles.push({ x: p.x, z: p.z, r: 0.3, y0: q.top - 0.5, y1: q.top + 0.7, height: 0.7 });
  }
  // Ship obstacles along the face (clear of a berthed hull) and round the quay's west end.
  for (let u = q.u0 + 1; u <= q.u1 - 1; u += 3) {
    const p = at(u, 0, q.v + 1.4);
    out.shipObstacles.push({ x: p.x, z: p.z, r: 1.2 });
  }
  const west = at(q.u0 - 1, 0, q.v + 2);
  out.shipObstacles.push({ x: west.x, z: west.z, r: 3 });
  // A rail along the face, but for the gangway's gap at the berth (u −204…−184).
  for (const [u0, u1] of [
    [q.u0 + 0.5, -205],
    [-183, q.u1 - 9],
  ] as const) {
    const y = q.top + 0.03;
    const p0 = at(u0, y + 0.95, q.v + 0.25);
    const p1 = at(u1, y + 0.95, q.v + 0.25);
    rod(b, 'metal', p0, p1, 0.03, 5, paints.iron);
    for (let u = u0; u <= u1 + 0.01; u += (u1 - u0) / Math.max(1, Math.round((u1 - u0) / 2.5))) {
      const pp = at(u, y, q.v + 0.25);
      rod(b, 'metal', pp, { x: pp.x, y: y + 0.95, z: pp.z }, 0.03, 4, paints.iron);
    }
    const mid = at((u0 + u1) / 2, 0, q.v + 0.25);
    out.colliders.push({
      x: mid.x,
      z: mid.z,
      hx: (u1 - u0) / 2,
      hz: 0.15,
      rot: YAW_U,
      y0: q.top - 0.4,
      y1: q.top + 1.6,
      height: 1,
      eyeTop: q.top + 1,
    });
  }
  lampPost(b, out, q.u0 + 2, q.v + 2.2, YAW_U + Math.PI / 2);
  // The water steps at its east end: a stone ramp down into the cove.
  const s0 = q.u1 - 8;
  const s1 = q.u1 - 2;
  const top = q.top + 0.03;
  const foot = -0.6;
  const vEnd = q.v - 8;
  for (let k = 0; k < 8; k++) {
    const va = q.v - (k * 8) / 8;
    const vb = q.v - ((k + 1) * 8) / 8;
    const ya = top + ((foot - top) * k) / 8;
    const yb = top + ((foot - top) * (k + 1)) / 8;
    const bed = Math.min(ground((s0 + s1) / 2, vb), yb) - 0.6;
    uvSpan(b, 'stone', s0, s1, vb, va + 0.01, bed, (ya + yb) / 2, paints.wetStone);
  }
  out.decks.push(lineDeck([(s0 + s1) / 2, q.v, top], [(s0 + s1) / 2, vEnd, foot], (s1 - s0) / 2, false));
}

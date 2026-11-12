import type { Buckets } from '../village/pieces';
import { uvDeck } from '../village/walk-decks';
import type { FrameBuilder, IslandOut } from './frame-build';
import type { Uvy } from './frame';

/**
 * A town on terraces above a cove's quay (Inkwell's, Tidewheel's): the terraces' paved floors, and
 * the railed flights of any stair along a path. Each island's builders add its houses and what
 * stands on the terraces.
 */

/** A terrace: a level strip along the cove, from `v0` to `v1` at height `y`. */
export interface Terrace {
  readonly v0: number;
  readonly v1: number;
  readonly y: number;
}

/**
 * Where a flight comes up through a terrace's floor (its frame u range, and how far back from the
 * terrace's front wall): the paving is left open there, over the flight's cutting.
 */
export type StairWell = { readonly u0: number; readonly u1: number; readonly v1: number } | null;

/**
 * The terraces' floors: each terrace paved from its front wall to the foot of the wall behind it, a
 * slab 3 cm over its level ground with a walk deck on it, open where a flight comes up through it
 * (`wells`, one for each terrace). The first terrace's paving starts behind the lane's ramp up from
 * the quay.
 */
export function paveTerraces<S extends string>(
  { uvSpan }: Pick<FrameBuilder<S>, 'uvSpan'>,
  b: Buckets,
  out: IslandOut<S>,
  o: { terraces: readonly Terrace[]; u0: number; u1: number; wells: readonly StairWell[]; paving: number },
): void {
  for (const [k, t] of o.terraces.entries()) {
    const v0 = k === 0 ? t.v0 + 2.4 : t.v0 - 0.2;
    // Back to where the next terrace's wall begins (the last one runs to the foot of the rock behind it).
    const v1 = (o.terraces[k + 1]?.v0 ?? t.v1 + 4.6) - 3.6;
    const well = o.wells[k];
    const slabs: readonly (readonly [number, number, number, number])[] = well
      ? [
          [o.u0, well.u0, v0, v1],
          [well.u1, o.u1, v0, v1],
          [well.u0, well.u1, well.v1, v1],
        ]
      : [[o.u0, o.u1, v0, v1]];
    for (const [a0, a1, c0, c1] of slabs) {
      uvSpan(b, 'paving', a0, a1, c0, c1, t.y - 1.6, t.y + 0.03, o.paving);
      out.decks.push(uvDeck(a0, a1, c0, c1, t.y + 0.03, false));
    }
  }
}

/**
 * The flights of a stair along `pts`: stone steps with rails on each stretch that climbs (a level
 * stretch is a landing), over the middle `span` (fractions) of the stretch, so each flight meets its
 * landings. `each` is called for every flight with a point `t` of the way up it (frame u, v and the
 * walk's y).
 */
export function stairFlights<S extends string>(
  { flight }: Pick<FrameBuilder<S>, 'flight'>,
  b: Buckets,
  out: IslandOut<S>,
  pts: readonly Uvy[],
  width: number,
  span: readonly [number, number] = [0.08, 0.92],
  each?: (p: (t: number) => readonly [number, number, number], a: Uvy, e: Uvy) => void,
): void {
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i]!;
    const e = pts[i + 1]!;
    if (Math.abs(e.y - a.y) < 0.5) continue;
    const p = (t: number) =>
      [a.u + (e.u - a.u) * t, a.v + (e.v - a.v) * t, a.y + (e.y - a.y) * t + 0.03] as const;
    flight(b, out, p(span[0]), p(span[1]), width);
    each?.(p, a, e);
  }
}

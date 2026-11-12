import {
  addMarketBooth,
  BOOTH_EXTENT,
  BOOTH_TOP,
  type BoothColliders,
  type BoothStyle,
} from '../market-stall/booth';
import type { StallPlace } from '../market-stall/layout';
import { box, type Buckets } from '../village/pieces';
import { COVE_LANDING, COVE_QUAY } from './cove-harbour';
import type { IslandFrameKit, Uv } from './frame';
import type { IslandOut } from './frame-build';

/**
 * A Model Market booth on a cove harbour's quay (docs/specs/MODEL-MARKET.md §2): where it stands,
 * and its build into an island's buckets with its colliders and camera boxes. Each island's
 * `market.ts` holds only what's its own: the booth's spot, its colours and its roof.
 */

/** A booth's place in the world, with the height of the paving it stands on. */
export type QuayBooth = StallPlace & { y: number };

/** The booth at frame `at` on the quay's paving, its front to the landing. */
export function quayBooth(frame: IslandFrameKit, at: Uv): QuayBooth {
  const p = frame.toWorld(at.u, at.v);
  return { x: p.x, z: p.z, y: COVE_QUAY.top + 0.03, heading: frame.headingBetween(at, COVE_LANDING) };
}

/** An island's own roof over the booth, built in the booth's frame. */
export type BoothRoof = Parameters<typeof addMarketBooth>[6]['roof'];

/** A flat reed roof over the booth, overhanging its frame by half a metre all round. */
export function reedRoof(tint: number): BoothRoof {
  return (l) => {
    const e = BOOTH_EXTENT;
    box(
      l as unknown as Buckets,
      'thatch',
      (e.x0 + e.x1) / 2,
      BOOTH_TOP + 0.06,
      (e.z0 + e.z1) / 2,
      e.x1 - e.x0 + 1,
      0.16,
      e.z1 - e.z0 + 1,
      0,
      tint,
    );
  };
}

/** Builds the booth into the island's buckets (world space), and hands gameplay its colliders. */
export function addQuayBooth(
  buckets: Buckets,
  out: Pick<IslandOut, 'colliders' | 'cameraBoxes'>,
  place: QuayBooth,
  style: BoothStyle,
  lite: boolean,
  roof: BoothRoof,
): void {
  const c: BoothColliders = { boxes: [], camera: [] };
  addMarketBooth(buckets, c, place, place.y, style, lite, { roof });
  for (const b of c.boxes)
    out.colliders.push({
      x: b.x,
      z: b.z,
      hx: b.hx,
      hz: b.hz,
      rot: b.rot ?? 0,
      y0: place.y - 0.5,
      y1: place.y + (b.height ?? 2),
      height: b.height,
    });
  for (const b of c.camera)
    out.cameraBoxes.push({
      x: b.x,
      z: b.z,
      hx: b.hx,
      hz: b.hz,
      rot: b.rot ?? 0,
      y0: b.y0 ?? place.y,
      y1: b.y1 ?? place.y + 4,
    });
}

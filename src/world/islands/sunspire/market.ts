import {
  addMarketBooth,
  BOOTH_EXTENT,
  BOOTH_TOP,
  type BoothColliders,
  type BoothStyle,
} from '../../market-stall/booth';
import type { StallPlace } from '../../market-stall/layout';
import { box, type Buckets } from '../../village/pieces';
import { SS_PAINT, type SsOut } from './build';
import { headingBetween, LANDING, QUAY, toWorld } from './layout';
import { BOOTH_UV } from './town';

/**
 * Sunspire's Model Market (docs/specs/MODEL-MARKET.md §2): Yusuf's booth on the quay, west of the
 * landing, its front to the landing. The town's adobe and red stone, a saffron-and-cream awning, a
 * flat reed roof, spice and cloth in its shelf tints.
 */
const booth = toWorld(BOOTH_UV.u, BOOTH_UV.v);
export const SUNSPIRE_BOOTH: StallPlace & { y: number } = {
  x: booth.x,
  z: booth.z,
  y: QUAY.top + 0.03,
  heading: headingBetween(BOOTH_UV, LANDING),
};

const STYLE: BoothStyle = {
  frame: 0x6b4a30,
  boards: [0xd9b48a, 0xe6d2b0],
  wood: 0x6b4a30,
  woodLight: 0xa07a50,
  darkWood: SS_PAINT.darkTimber,
  plank: [0x8a6444, 0x7a583a],
  brass: 0xd8b04a,
  iron: SS_PAINT.iron,
  awning: [SS_PAINT.saffron, SS_PAINT.canvas],
  counterCloth: [SS_PAINT.indigo, SS_PAINT.canvas],
  curtain: 0x7a3a34,
  cork: 0xa07a50,
  boardFace: [0xe6d2b0, 0xd9b48a, 0x34507e],
  boardFrame: [SS_PAINT.darkTimber, SS_PAINT.darkTimber, 0xd8b04a],
  shelfTints: [0xe0a030, 0xb8443a, 0x34507e, 0xf0e6d0, 0x6a8a4a, 0xd49a52],
};

/** Builds Yusuf's booth into the town's buckets (world space), with its colliders and camera boxes. */
export function addSunspireMarket(buckets: Buckets, out: SsOut, lite: boolean): void {
  const PLACE = SUNSPIRE_BOOTH;
  const c: BoothColliders = { boxes: [], camera: [] };
  addMarketBooth(buckets, c, PLACE, PLACE.y, STYLE, lite, {
    roof(l) {
      // A flat reed roof over the booth, in its own frame.
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
        SS_PAINT.reed,
      );
    },
  });
  for (const b of c.boxes)
    out.colliders.push({
      x: b.x,
      z: b.z,
      hx: b.hx,
      hz: b.hz,
      rot: b.rot ?? 0,
      y0: PLACE.y - 0.5,
      y1: PLACE.y + (b.height ?? 2),
      height: b.height,
    });
  out.cameraBoxes.push(
    ...c.camera.map((b) => ({
      x: b.x,
      z: b.z,
      hx: b.hx,
      hz: b.hz,
      rot: b.rot ?? 0,
      y0: b.y0 ?? PLACE.y,
      y1: b.y1 ?? PLACE.y + 4,
    })),
  );
}

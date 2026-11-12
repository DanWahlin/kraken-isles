import type { BoothStyle } from '../../market-stall/booth';
import type { Buckets } from '../../village/pieces';
import { addQuayBooth, quayBooth, reedRoof, type QuayBooth } from '../quay-booth';
import { SS_PAINT, type SsOut } from './build';
import { FRAME_KIT } from './layout';
import { BOOTH_UV } from './town';

/**
 * Sunspire's Model Market (docs/specs/MODEL-MARKET.md §2): Yusuf's booth on the quay, west of the
 * landing, its front to the landing. The town's adobe and red stone, a saffron-and-cream awning, a
 * flat reed roof, spice and cloth in its shelf tints.
 */
export const SUNSPIRE_BOOTH: QuayBooth = quayBooth(FRAME_KIT, BOOTH_UV);

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
  addQuayBooth(buckets, out, SUNSPIRE_BOOTH, STYLE, lite, reedRoof(SS_PAINT.reed));
}

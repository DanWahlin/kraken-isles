import type { BoothStyle } from '../../market-stall/booth';
import type { Buckets } from '../../village/pieces';
import { addQuayBooth, quayBooth, reedRoof, type QuayBooth } from '../quay-booth';
import { TW_PAINT, type TwOut } from './build';
import { FRAME_KIT } from './layout';
import { BOOTH_UV } from './town';

/**
 * Tidewheel's Model Market (docs/specs/MODEL-MARKET.md §2): Dot's booth on the quay, west of the
 * landing, its front to the landing. Dark boards and brass, an ochre-and-cream awning, a flat reed
 * roof, lamp oil, gear blanks and copper in its shelf tints.
 */
export const TIDEWHEEL_BOOTH: QuayBooth = quayBooth(FRAME_KIT, BOOTH_UV);

const STYLE: BoothStyle = {
  frame: 0x5e4432,
  boards: [0x6a655f, 0x858078],
  wood: 0x6b4a30,
  woodLight: 0x9a744e,
  darkWood: TW_PAINT.darkTimber,
  plank: [0x7a5a3e, 0x6e5036],
  brass: 0xd8b04a,
  iron: TW_PAINT.iron,
  awning: [TW_PAINT.ochre, TW_PAINT.canvas],
  counterCloth: [TW_PAINT.rust, TW_PAINT.canvas],
  curtain: 0x5e4432,
  cork: 0xa07a50,
  boardFace: [0xe2d4b0, 0xc8b890, 0x4f9a86],
  boardFrame: [TW_PAINT.darkTimber, TW_PAINT.darkTimber, 0xd8b04a],
  shelfTints: [0xe0b040, 0x4f9a86, 0xb5532c, 0xe9ddc6, 0x56524e, 0xd89a3a],
};

/** Builds Dot's booth into the town's buckets (world space), with its colliders and camera boxes. */
export function addTidewheelMarket(buckets: Buckets, out: TwOut, lite: boolean): void {
  addQuayBooth(buckets, out, TIDEWHEEL_BOOTH, STYLE, lite, reedRoof(TW_PAINT.reed));
}

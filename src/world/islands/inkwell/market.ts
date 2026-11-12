import type { BoothStyle } from '../../market-stall/booth';
import type { Buckets } from '../../village/pieces';
import { addQuayBooth, quayBooth, reedRoof, type QuayBooth } from '../quay-booth';
import { IW_PAINT, type IwOut } from './build';
import { FRAME_KIT } from './layout';
import { BOOTH_UV } from './town';

/**
 * Inkwell's Model Market (docs/specs/MODEL-MARKET.md §2): Kosta's booth on the quay, west of the
 * landing, its front to the landing. Whitewashed boards and blue timber, a blue-and-white awning, a
 * flat reed roof, ink, paper and brass in its shelf tints.
 */
export const INKWELL_BOOTH: QuayBooth = quayBooth(FRAME_KIT, BOOTH_UV);

const STYLE: BoothStyle = {
  frame: 0x2c5c9a,
  boards: [0xf6ecd8, 0xfffaf0],
  wood: 0x86664a,
  woodLight: 0xc8a878,
  darkWood: IW_PAINT.darkTimber,
  plank: [0xa88a64, 0x967a58],
  brass: 0xd8b04a,
  iron: IW_PAINT.iron,
  awning: [IW_PAINT.cobalt, IW_PAINT.canvas],
  counterCloth: [IW_PAINT.sky, IW_PAINT.canvas],
  curtain: 0x2c5c9a,
  cork: 0xb09468,
  boardFace: [0xf6ecd8, 0xe9ddbf, 0x2c5c9a],
  boardFrame: [IW_PAINT.darkTimber, IW_PAINT.darkTimber, 0xd8b04a],
  shelfTints: [0x2c5c9a, 0xe9ddbf, 0xc2337a, 0xf6ecd8, 0x5e8a44, 0xe6b84a],
};

/** Builds Kosta's booth into the town's buckets (world space), with its colliders and camera boxes. */
export function addInkwellMarket(buckets: Buckets, out: IwOut, lite: boolean): void {
  addQuayBooth(buckets, out, INKWELL_BOOTH, STYLE, lite, reedRoof(IW_PAINT.reed));
}

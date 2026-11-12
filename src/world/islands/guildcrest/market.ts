import { BOOTH_EXTENT, BOOTH_TOP, type BoothStyle } from '../../market-stall/booth';
import { cone, type Buckets } from '../../village/pieces';
import { addQuayBooth, quayBooth, type BoothRoof, type QuayBooth } from '../quay-booth';
import { GC_PAINT, type GcOut } from './build';
import { FRAME_KIT } from './layout';
import { BOOTH_UV } from './town';

/**
 * Guildcrest's Model Market (docs/specs/MODEL-MARKET.md §2): Moira's booth on the quay, west of the
 * landing, its front to the landing (spec §3.5). The town's stone and slate, a blue-and-cream awning,
 * wool bales and a peat stack in its shelf tints.
 */
export const GUILDCREST_BOOTH: QuayBooth = quayBooth(FRAME_KIT, BOOTH_UV);

const STYLE: BoothStyle = {
  frame: 0x5a4636,
  boards: [0x8e8a82, 0xa39b8c],
  wood: 0x6b5038,
  woodLight: 0x9a7a58,
  darkWood: GC_PAINT.tar,
  plank: [0x7a5a3e, 0x6e5036],
  brass: 0xd8b04a,
  iron: GC_PAINT.iron,
  awning: [0x2f5d8a, 0xe9e3d3],
  counterCloth: [0x3a5a4a, 0xe9e3d3],
  curtain: 0x4a2f3a,
  cork: 0xa07a50,
  boardFace: [0x9cb8c8, 0xc8b8a0, 0x7a4a7e],
  boardFrame: [GC_PAINT.tar, GC_PAINT.tar, 0xd8b04a],
  shelfTints: [0xe9e3d3, 0x8a6a4a, 0x7a4a7e, 0x9cb8c8, 0x5a4636, 0xd8b97a],
};

/** A low hipped slate roof over the booth, in its own frame. */
const SLATE_ROOF: BoothRoof = (l) => {
  const e = BOOTH_EXTENT;
  cone(
    l as unknown as Buckets,
    'paving',
    (e.x0 + e.x1) / 2,
    BOOTH_TOP - 0.05,
    (e.z0 + e.z1) / 2,
    5.4,
    1.5,
    4,
    GC_PAINT.slate,
    0,
    (g) => {
      g.rotateY(Math.PI / 4);
      g.scale(1, 1, (e.z1 - e.z0 + 1.2) / (e.x1 - e.x0 + 1.2));
    },
  );
};

/** Builds Moira's booth into the town's buckets (world space), with its colliders and camera boxes. */
export function addGuildcrestMarket(buckets: Buckets, out: GcOut, lite: boolean): void {
  addQuayBooth(buckets, out, GUILDCREST_BOOTH, STYLE, lite, SLATE_ROOF);
}

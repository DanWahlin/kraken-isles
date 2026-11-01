import type { VillageAnchor } from '../../village/kit';
import { headingBetween, toWorld, type Uv } from './layout';

/**
 * Guildcrest's anchors (docs/specs/ISLAND-04-guildcrest.md §3.9, the contract of §10.3; as built in
 * §15): where each of the cast and the islanders stand, the circuits' stations and their cameras, and
 * the set pieces the content looks at. Each stands on a walk surface with a 3 m clear radius. Plain
 * data (no three.js): this file is the source of truth after the build.
 */

/** An anchor at frame (u, v) and height y, facing frame point `look` (or heading 0 with none). */
function anchor(u: number, v: number, y: number, look?: Uv): VillageAnchor {
  const p = toWorld(u, v);
  return { x: p.x, y, z: p.z, heading: look ? headingBetween({ u, v }, look) : 0 };
}

/** A camera: where it stands (x, y, z, its heading toward the target) and what it looks at. */
export interface CameraAnchor extends VillageAnchor {
  readonly target: { readonly x: number; readonly y: number; readonly z: number };
}

function camera(u: number, v: number, y: number, tu: number, tv: number, ty: number): CameraAnchor {
  const t = toWorld(tu, tv);
  return { ...anchor(u, v, y, { u: tu, v: tv }), target: { x: t.x, y: ty, z: t.z } };
}

/** The look targets the route uses (frame). */
const LOOK = {
  landing: { u: -190, v: 16 },
  lyra: { u: -166, v: 36 },
  charterStone: { u: -96, v: 46 },
  braeTurn: { u: -48, v: 80 },
  aidan: { u: -18, v: 106 },
  brigid: { u: 4, v: 112 },
  ridge: { u: 66, v: 150 },
  fergus: { u: 90, v: 154 },
  towerStair: { u: 82, v: 128 },
  garth: { u: 22, v: 130 },
  hall: { u: 94, v: 156 },
} as const;

export const GUILDCREST_ANCHORS = {
  // The captain, and the stops in the course's order (spec §4.1).
  landing: anchor(-190, 16, 2.2, LOOK.lyra),
  moira: anchor(-212, 24, 2.4, LOOK.landing),
  lyra: anchor(-166, 36, 3.0, LOOK.landing),
  chartStand: anchor(-162, 40, 3.0, LOOK.landing),
  elspeth: anchor(-102, 40, 10, LOOK.charterStone),
  charterStone: anchor(-96, 46, 10),
  aidan: anchor(-18, 106, 34, LOOK.braeTurn),
  brigid: anchor(4, 112, 36, LOOK.aidan),
  ewan: anchor(22, 141, 36, LOOK.brigid),
  chainRack: anchor(26, 146, 36, LOOK.garth),
  fergus: anchor(90, 154, 42, LOOK.ridge),
  rory: anchor(96, 160, 42, LOOK.fergus),
  seren: anchor(66, 116, 40, LOOK.towerStair),
  bellRope: anchor(62, 114, 40),
  // The Pattern Book's stations on the cloister walk (P4.1), facing the garth.
  'book.shelf': anchor(8, 118, 36, LOOK.garth),
  'book.spine': anchor(8, 132, 36, LOOK.garth),
  'book.desk': anchor(18, 136, 36, LOOK.garth),
  'book.proof': anchor(32, 136, 36, LOOK.garth),
  'book.bell': anchor(32, 120, 36, LOOK.garth),
  'book.lectern': anchor(20, 116, 36, LOOK.garth),
  // The Journeyman's Toolbelt's stations in the guildhall yard (P4.2), facing the hall.
  'belt.indenture': anchor(86, 158, 42, LOOK.hall),
  'belt.rack': anchor(98, 166, 42, LOOK.hall),
  'belt.proof': anchor(108, 160, 42, LOOK.hall),
  'belt.door': anchor(104, 150, 42, LOOK.hall),
  'belt.roll': anchor(94, 146, 42, LOOK.hall),
  'belt.bench': anchor(84, 150, 42, LOOK.hall),
  'belt.testBench': anchor(78, 156, 42, LOOK.hall),
  // The circuits' cameras.
  bookCam: camera(-6, 124, 52, 22, 128, 36),
  beltCam: camera(70, 140, 54, 94, 156, 42),
  // The islanders.
  extraFiddler: anchor(-160, 34, 3.0, LOOK.landing),
  extraWhistler: anchor(-164, 42, 3.0, LOOK.landing),
  extraKids: anchor(-90, 52, 10, LOOK.charterStone),
  extraCopyist: anchor(12, 140, 36, LOOK.garth),
  extraMiller: anchor(126, 186, 52, LOOK.fergus),
  extraShepherd: anchor(40, 20, 40, LOOK.aidan),
} as const satisfies Record<string, VillageAnchor>;

/** Every anchor's name (the contract with the course content, spec §10.3). */
export type GcAnchorName = keyof typeof GUILDCREST_ANCHORS;

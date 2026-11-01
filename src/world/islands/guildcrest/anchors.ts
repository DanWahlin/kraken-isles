import type { VillageAnchor } from '../../village/kit';
import { SIT } from '../../characters/seat-fit';
import { guildcrestHeight } from './height';
import { CIRCUIT_SPOTS } from './circuit';
import { headingBetween, toWorld, type Uv } from './layout';

/**
 * Guildcrest's anchors (docs/specs/ISLAND-04-guildcrest.md §3.9, the contract of §10.3; as built in
 * §15): where each of the cast and the islanders stand, the circuits' stations and their cameras, and
 * the set pieces the content looks at. Each stands on a walk surface with a 3 m clear radius. Plain
 * data (no three.js): this file is the source of truth after the build.
 */

/**
 * An anchor at frame (u, v) on the ground there (`_planned` is the spec's height, kept to read the
 * table by), facing frame point `look` (or heading 0 with none).
 */
function anchor(u: number, v: number, _planned: number, look?: Uv): VillageAnchor {
  const p = toWorld(u, v);
  return {
    x: p.x,
    y: guildcrestHeight(p.x, p.z),
    z: p.z,
    heading: look ? headingBetween({ u, v }, look) : 0,
  };
}

/** A circuit's station as an anchor: where the player stands, facing what the station's camera looks at. */
function spotAnchor(kind: 'book' | 'belt', place: string): VillageAnchor {
  const s = CIRCUIT_SPOTS[kind][place]!;
  return anchor(s.u, s.v, s.y, { u: s.look.u, v: s.look.v });
}

/** An anchor raised to the top of a seat block on its ground (seat-fit.ts `SIT.height`). */
function seated(a: VillageAnchor): VillageAnchor {
  return { ...a, y: a.y + SIT.height };
}

/** A camera: where it stands (x, y, z, its heading toward the target) and what it looks at. */
export interface CameraAnchor extends VillageAnchor {
  readonly target: { readonly x: number; readonly y: number; readonly z: number };
}

function camera(u: number, v: number, y: number, tu: number, tv: number, ty: number): CameraAnchor {
  const p = toWorld(u, v);
  const t = toWorld(tu, tv);
  return {
    x: p.x,
    y,
    z: p.z,
    heading: headingBetween({ u, v }, { u: tu, v: tv }),
    target: { x: t.x, y: ty, z: t.z },
  };
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
  brigid: anchor(8, 121, 36, LOOK.aidan),
  ewan: anchor(24, 149, 36, LOOK.garth),
  chainRack: anchor(24.6, 152.6, 36, LOOK.garth),
  fergus: anchor(90, 154, 42, LOOK.ridge),
  rory: anchor(96, 160, 42, LOOK.fergus),
  seren: anchor(66, 116, 40, LOOK.towerStair),
  bellRope: anchor(62.6, 114, 40),
  // The Pattern Book's stations on the cloister walk (P4.1), facing the garth.
  'book.shelf': spotAnchor('book', 'shelf'),
  'book.spine': spotAnchor('book', 'spine'),
  'book.desk': spotAnchor('book', 'desk'),
  'book.proof': spotAnchor('book', 'proof'),
  'book.bell': spotAnchor('book', 'bell'),
  'book.lectern': spotAnchor('book', 'lectern'),
  // The Journeyman's Toolbelt's stations in the guildhall yard (P4.2), facing the hall.
  'belt.indenture': spotAnchor('belt', 'indenture'),
  'belt.rack': spotAnchor('belt', 'rack'),
  'belt.proof': spotAnchor('belt', 'proof'),
  'belt.door': spotAnchor('belt', 'door'),
  'belt.roll': spotAnchor('belt', 'roll'),
  'belt.bench': spotAnchor('belt', 'bench'),
  'belt.testBench': spotAnchor('belt', 'testBench'),
  // The circuits' cameras.
  bookCam: camera(-6, 124, 52, 22, 128, 36),
  beltCam: camera(70, 140, 54, 94, 156, 42),
  // The islanders.
  extraFiddler: anchor(-160, 34, 3.0, LOOK.landing),
  extraWhistler: anchor(-164, 42, 3.0, LOOK.landing),
  extraKids: anchor(-90, 52, 10, LOOK.charterStone),
  extraCopyist: anchor(13.6, 144.6, 36, { u: 16, v: 145.5 }),
  extraMiller: anchor(126, 186, 52, LOOK.fergus),
  // Kenna sits on a stone on the glen's south side (seat-fit.ts: the block's top is her anchor).
  extraShepherd: seated(anchor(40, 20, 40, LOOK.aidan)),
} as const satisfies Record<string, VillageAnchor>;

/** Every anchor's name (the contract with the course content, spec §10.3). */
export type GcAnchorName = keyof typeof GUILDCREST_ANCHORS;

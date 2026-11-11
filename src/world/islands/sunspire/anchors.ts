import type { VillageAnchor } from '../../village/kit';
import { SIT } from '../../characters/seat-fit';
import { BOOTH_LAYOUT } from '../../market-stall/booth';
import { stallToWorld } from '../../market-stall/layout';
import { CIRCUIT_SPOTS } from './circuit';
import { sunspireHeight } from './height';
import {
  CAMP,
  CARAVANSERAI,
  COURT,
  headingBetween,
  SIGNAL_HOUSE,
  SPIRE,
  SQUARE,
  TERRACE,
  toWorld,
  WELL,
  YARD,
  type Uv,
} from './layout';
import { SUNSPIRE_BOOTH } from './market';
import { SEAL_PLINTH } from './spire';
import { SERAI, SQUARE_PROPS } from './town';

/**
 * Sunspire's anchors (docs/specs/ISLAND-05-sunspire-sands.md §3, the contract between the world and
 * the content): where each of the cast and the islanders stand, the circuits' stations and their
 * cameras, and the set pieces the content looks at. Each stands on a walk surface with a 3 m clear
 * radius. Plain data (no three.js): this file is the source of truth after the build.
 */

/** An anchor at frame (u, v), `lift` m over the ground there (a paved deck's 3 cm), facing `look`. */
function anchor(u: number, v: number, look?: Uv, lift = 0): VillageAnchor {
  const p = toWorld(u, v);
  return {
    x: p.x,
    y: sunspireHeight(p.x, p.z) + lift,
    z: p.z,
    heading: look ? headingBetween({ u, v }, look) : 0,
  };
}

/** The paving's rise over its pad (the builders lay it 3 cm up). */
const PAVED = 0.03;

/** A circuit's station as an anchor: where the player stands, facing what the station's camera looks at. */
function spotAnchor(kind: 'signal' | 'crate', place: string): VillageAnchor {
  const s = CIRCUIT_SPOTS[kind][place]!;
  return anchor(s.u, s.v, { u: s.look.u, v: s.look.v }, PAVED);
}

/** An anchor raised to the top of a seat block on its floor (seat-fit.ts `SIT.height`). */
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
  gate: { u: CARAVANSERAI.u, v: CARAVANSERAI.v - CARAVANSERAI.halfV - 4 },
  court: { u: CARAVANSERAI.u, v: CARAVANSERAI.v - 2 },
  square: { u: SQUARE.u, v: SQUARE.v },
  squareWest: { u: SQUARE.u - SQUARE.halfU, v: SQUARE.v },
  camp: { u: CAMP.u, v: CAMP.v },
  campPath: { u: -48, v: 8 },
  stairHead: { u: 30, v: 92 },
  mirrorCourt: { u: COURT.u, v: COURT.v },
  yard: { u: YARD.u, v: YARD.v },
  terrace: { u: TERRACE.u, v: TERRACE.v },
  stairTop: { u: 165, v: 104 },
} as const;

/** Behind Yusuf's counter (the booth builds from `SUNSPIRE_BOOTH`). */
const vendor = stallToWorld(SUNSPIRE_BOOTH, BOOTH_LAYOUT.vendor.x, BOOTH_LAYOUT.vendor.z);

/** The arcade's rug in the caravanserai: its middle (frame v) and the court's floor. */
const rugV = CARAVANSERAI.v + CARAVANSERAI.halfV - 0.7 - SERAI.arcade.depth / 2 + 0.2;

export const SUNSPIRE_ANCHORS = {
  // The captain, and the stops in the course's order (spec §4).
  landing: anchor(-190, 16, LOOK.gate, PAVED),
  juno: anchor(-186.5, 18.6, LOOK.landing, PAVED),
  yusuf: anchor(-212, 24, LOOK.landing, PAVED),
  // The Model Market's keeper behind the counter (where Yusuf stands).
  marketKeeper: {
    x: vendor.x,
    y: SUNSPIRE_BOOTH.y + BOOTH_LAYOUT.vendor.y,
    z: vendor.z,
    heading: SUNSPIRE_BOOTH.heading,
  },
  // Lyra stands on the rug under the arcade; her two players sit either side of her.
  lyra: anchor(CARAVANSERAI.u, rugV, LOOK.court, PAVED),
  lyraPlayerA: seated(anchor(CARAVANSERAI.u - 2.4, rugV + 0.3, LOOK.court, PAVED)),
  lyraPlayerB: seated(anchor(CARAVANSERAI.u + 2.4, rugV + 0.3, LOOK.court, PAVED)),
  // Where the captain stands to hear her: inside the gate.
  gearSong: anchor(CARAVANSERAI.u, CARAVANSERAI.v - 3.5, { u: CARAVANSERAI.u, v: rugV }, PAVED),
  zahra: anchor(SQUARE_PROPS.scales.u - 2.2, SQUARE_PROPS.scales.v + 0.4, LOOK.squareWest, PAVED),
  scales: anchor(SQUARE_PROPS.scales.u, SQUARE_PROPS.scales.v),
  idris: anchor(CAMP.u - 3, CAMP.v + 1.5, LOOK.campPath),
  well: anchor(WELL.u, WELL.v),
  noor: anchor(SIGNAL_HOUSE.u - 1.5, SIGNAL_HOUSE.v - SIGNAL_HOUSE.halfV - 3, LOOK.stairHead),
  samir: anchor(YARD.u - 11, YARD.v + 2, LOOK.mirrorCourt, PAVED),
  paloma: anchor(TERRACE.u + 2.5, TERRACE.v - 3.5, LOOK.stairTop, PAVED),
  seal: anchor(SEAL_PLINTH.u, SEAL_PLINTH.v),
  spire: anchor(SPIRE.u, SPIRE.v),
  // Mirror Beams' stations (P5.1), and the Sealed Crate's (P5.2).
  'signal.roll': spotAnchor('signal', 'roll'),
  'signal.card': spotAnchor('signal', 'card'),
  'signal.shutter': spotAnchor('signal', 'shutter'),
  'signal.mirror': spotAnchor('signal', 'mirror'),
  'signal.key': spotAnchor('signal', 'key'),
  'signal.tent': spotAnchor('signal', 'tent'),
  'crate.row': spotAnchor('crate', 'row'),
  'crate.lading': spotAnchor('crate', 'lading'),
  'crate.scale': spotAnchor('crate', 'scale'),
  'crate.bell': spotAnchor('crate', 'bell'),
  'crate.bench': spotAnchor('crate', 'bench'),
  // The circuits' cameras: the court from its west wall looking at the Sunspire; the yard from above.
  signalCam: camera(COURT.u - 22, COURT.v - 4, COURT.y + 9, SPIRE.u, SPIRE.v, SPIRE.mirror - 10),
  crateCam: camera(YARD.u - 20, YARD.v + 14, YARD.y + 11, YARD.u + 4, YARD.v, YARD.y + 1),
  // The islanders.
  extraTrader: anchor(-104, 58.6, LOOK.square, PAVED),
  extraWeaver: anchor(-93, 41.4, LOOK.square, PAVED),
  extraCarrier: anchor(-60, 20, LOOK.camp),
  extraCamper: anchor(CAMP.u + 3.5, CAMP.v - 5, LOOK.camp),
  extraSignaller: anchor(COURT.u + 13, COURT.v + 9, LOOK.mirrorCourt, PAVED),
  extraPorter: anchor(YARD.u + 9, YARD.v + 3, LOOK.yard, PAVED),
  extraChild: anchor(-98, 46, LOOK.square, PAVED),
  extraFisher: anchor(-160, 15.2, { u: -160, v: 0 }, PAVED),
} as const satisfies Record<string, VillageAnchor>;

/** Every anchor's name (the contract with the course content). */
export type SsAnchorName = keyof typeof SUNSPIRE_ANCHORS;

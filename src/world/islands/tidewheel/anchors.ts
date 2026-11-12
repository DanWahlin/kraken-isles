import type { VillageAnchor } from '../../village/kit';
import { anchorKit, PAVED } from '../anchor-kit';
import { BOOTH_LAYOUT } from '../../market-stall/booth';
import { stallToWorld } from '../../market-stall/layout';
import { CIRCUIT_SPOTS, type TwCircuit } from './circuit';
import { tidewheelHeight } from './height';
import { BANDSTAND, BOUNTY, COURT, FRAME_KIT, LIGHTHOUSE, SPRINGS, SQUARE, TERRACE, WORKS } from './layout';
import { LAST_LEVER } from './lighthouse';
import { TIDEWHEEL_BOOTH } from './market';
import { BAND, SQUARE_PROPS } from './town';

/**
 * Tidewheel's anchors (docs/specs/ISLAND-07-tidewheel-caldera.md §3, the contract between the world
 * and the content): where each of the cast and the islanders stand, the circuits' stations and their
 * cameras, and the set pieces the content looks at. Each stands on a walk surface with a 3 m clear
 * radius. Plain data (no three.js): this file is the source of truth after the build.
 */

const { anchor, seated, camera, spotAnchor: at } = anchorKit(FRAME_KIT, tidewheelHeight);

/** A circuit's station as an anchor: where the player stands, facing what the station's camera looks at. */
const spotAnchor = (kind: TwCircuit, place: string) => at(CIRCUIT_SPOTS[kind][place]!);

/** The look targets the route uses (frame). */
const LOOK = {
  landing: { u: -190, v: 16 },
  lane: { u: -164, v: 30 },
  bandFront: { u: BAND.u, v: BANDSTAND.v - BANDSTAND.halfV - 4 },
  flightHead: { u: -120, v: 60 },
  stairHead: { u: -94, v: 82 },
  worksGate: { u: -126, v: WORKS.v - WORKS.halfV - 3 },
  works: { u: WORKS.u, v: WORKS.v },
  court: { u: COURT.u, v: COURT.v },
  arch: { u: COURT.u, v: COURT.v + COURT.halfV + 3 },
  walkHead: { u: -51, v: -14 },
  breach: { u: -500, v: -30 },
  bay: { u: -260, v: -40 },
} as const;

/** Behind Dot's counter (the booth builds from `TIDEWHEEL_BOOTH`). */
const vendor = stallToWorld(TIDEWHEEL_BOOTH, BOOTH_LAYOUT.vendor.x, BOOTH_LAYOUT.vendor.z);

const basin = SQUARE_PROPS.basin;
const pool = SPRINGS[2];

export const TIDEWHEEL_ANCHORS = {
  // The captain, and the stops in the course's order (spec §4).
  landing: anchor(-190, 16, LOOK.lane, PAVED),
  juno: anchor(-186.5, 18.6, LOOK.landing, PAVED),
  dot: anchor(-212, 24, LOOK.landing, PAVED),
  // The Model Market's keeper behind the counter (where Dot stands).
  marketKeeper: {
    x: vendor.x,
    y: TIDEWHEEL_BOOTH.y + BOOTH_LAYOUT.vendor.y,
    z: vendor.z,
    heading: TIDEWHEEL_BOOTH.heading,
  },
  // Lyra stands on the Bandstand's stage; her two players sit either side of her.
  lyra: anchor(BAND.u + 0.4, BAND.v + 1.4, LOOK.bandFront, 0.05),
  lyraPlayerA: seated(anchor(BAND.u - 1.2, BAND.v + 2.9, LOOK.bandFront, 0.05)),
  lyraPlayerB: seated(anchor(BAND.u + 2.8, BAND.v + 1.2, LOOK.bandFront, 0.05)),
  // Where the captain stands to hear her: before the stage.
  drumSong: anchor(BAND.u, BAND.v - BAND.r - 2.4, { u: BAND.u, v: BAND.v }, PAVED),
  // The Keeper by the gears' wall, clear of the first flight's head.
  // By the gears, 13 m from the first flight's head: you see her as you come up, and walk over.
  agnes: anchor(SQUARE.u + 3.6, SQUARE.v + 3.4, LOOK.flightHead, PAVED),
  gearWall: anchor(SQUARE.u - 1, SQUARE_PROPS.wall),
  tobin: anchor(BOUNTY.u - 3.2, BOUNTY.v + 3.6, LOOK.stairHead, PAVED),
  // Beside his lever in the yard's middle, 15 m in from the stair's head.
  ansel: anchor(WORKS.u + 5.5, WORKS.v - 1.5, LOOK.worksGate, PAVED),
  greta: anchor(COURT.u - 2.5, COURT.v + 2.6, LOOK.arch, PAVED),
  // By the spyglass at the court's north-west corner.
  nerys: anchor(COURT.u - COURT.halfU + 3.2, COURT.v + COURT.halfV - 3.4, LOOK.court, PAVED),
  silas: anchor(TERRACE.u + 3.4, TERRACE.v - 3.2, LOOK.walkHead, PAVED),
  seal: anchor(LAST_LEVER.u, LAST_LEVER.v),
  light: anchor(LIGHTHOUSE.u, LIGHTHOUSE.v),
  // The Lever's stations (P7.1) and Gears & Bells' (P7.2).
  'lever.drum': spotAnchor('lever', 'drum'),
  'lever.gear': spotAnchor('lever', 'gear'),
  'lever.switch': spotAnchor('lever', 'switch'),
  'lever.desk': spotAnchor('lever', 'desk'),
  'lever.lever': spotAnchor('lever', 'lever'),
  'lever.log': spotAnchor('lever', 'log'),
  'clock.desk': spotAnchor('clock', 'desk'),
  'clock.gear': spotAnchor('clock', 'gear'),
  'clock.ring': spotAnchor('clock', 'ring'),
  'clock.pegs': spotAnchor('clock', 'pegs'),
  'clock.bell': spotAnchor('clock', 'bell'),
  'clock.tide': spotAnchor('clock', 'tide'),
  'clock.log': spotAnchor('clock', 'log'),
  // The circuits' cameras: the Works from over its south-east rail; the court from over the bay's
  // side, the Lighthouse behind it.
  leverCam: camera(WORKS.u + 12, WORKS.v - 17, WORKS.y + 9, WORKS.u - 2, WORKS.v + 2, WORKS.y + 1.2),
  clockCam: camera(COURT.u - 16, COURT.v + 16, COURT.y + 9, COURT.u + 6, COURT.v - 10, COURT.y + 4),
  // The islanders.
  extraMender: anchor(-160, 15.2, { u: -160, v: 0 }, PAVED),
  extraLamplighter: anchor(-142, 28.4, LOOK.lane, PAVED),
  // East of the basin (out of the first flight's way).
  extraChild: anchor(basin.u + 2.9, basin.v - 0.4, { u: basin.u, v: basin.v }, PAVED),
  extraOiler: anchor(WORKS.u - 10, WORKS.v - 7.4, { u: WORKS.u - 10, v: WORKS.v - 10 }, PAVED),
  extraRinger: anchor(COURT.u + 5, COURT.v + 7.4, LOOK.arch, PAVED),
  extraKeeper: anchor(pool.u + pool.r + 2.6, pool.v + 1, { u: pool.u, v: pool.v }),
  extraStargazer: anchor(TERRACE.u - 6.4, TERRACE.v - 2.6, LOOK.breach, PAVED),
  extraFisher: anchor(-232, 16, LOOK.bay, PAVED),
} as const satisfies Record<string, VillageAnchor>;

export type { CameraAnchor } from '../anchor-kit';

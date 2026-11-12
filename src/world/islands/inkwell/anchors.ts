import type { VillageAnchor } from '../../village/kit';
import { anchorKit, PAVED } from '../anchor-kit';
import { BOOTH_LAYOUT } from '../../market-stall/booth';
import { stallToWorld } from '../../market-stall/layout';
import { CIRCUIT_SPOTS, type IwCircuit } from './circuit';
import { SEAL_PLINTH } from './dome';
import { inkwellHeight } from './height';
import {
  COURT,
  DOME,
  DRAUGHT,
  GREAT_CHART,
  FRAME_KIT,
  LOGGIA,
  PLAZA,
  SQUARE,
  TAVERNA,
  TERRACE,
} from './layout';
import { INKWELL_BOOTH } from './market';
import { KITE_POSTS } from './plaza';
import { SQUARE_PROPS, TAVERN } from './town';

/**
 * Inkwell's anchors (docs/specs/ISLAND-06-inkwell-bluffs.md §3, the contract between the world and
 * the content): where each of the cast and the islanders stand, the circuits' stations and their
 * cameras, and the set pieces the content looks at. Each stands on a walk surface with a 3 m clear
 * radius. Plain data (no three.js): this file is the source of truth after the build.
 */

const { anchor, seated, camera, spotAnchor: at } = anchorKit(FRAME_KIT, inkwellHeight);

/** A circuit's station as an anchor: where the player stands, facing what the station's camera looks at. */
const spotAnchor = (kind: IwCircuit, place: string) => at(CIRCUIT_SPOTS[kind][place]!);

/** The look targets the route uses (frame). */
const LOOK = {
  landing: { u: -190, v: 16 },
  lane: { u: -164, v: 30 },
  tavernaFront: { u: TAVERNA.u, v: TAVERNA.v - TAVERNA.halfV - 3 },
  terraceFloor: { u: TAVERNA.u, v: TAVERNA.v - 2 },
  square: { u: SQUARE.u, v: SQUARE.v },
  flightHead: { u: -120, v: 60 },
  stairHead: { u: -60, v: 108 },
  plaza: { u: PLAZA.u, v: PLAZA.v },
  loggiaMouth: { u: LOGGIA.u + LOGGIA.halfU + 4, v: LOGGIA.v },
  draught: { u: DRAUGHT.u, v: DRAUGHT.v },
  draughtWay: { u: DRAUGHT.u + 2, v: DRAUGHT.v - DRAUGHT.halfV - 3 },
  chart: { u: GREAT_CHART.u, v: GREAT_CHART.v },
  courtWay: { u: COURT.u - COURT.halfU - 3, v: COURT.v + 6 },
  terrace: { u: TERRACE.u, v: TERRACE.v },
  stairTop: { u: 200, v: 104 },
  sea: { u: 60, v: 260 },
} as const;

/** Behind Kosta's counter (the booth builds from `INKWELL_BOOTH`). */
const vendor = stallToWorld(INKWELL_BOOTH, BOOTH_LAYOUT.vendor.x, BOOTH_LAYOUT.vendor.z);

/** The pergola's rug at the taverna: its middle (frame v). */
const rugV = TAVERNA.v + TAVERNA.halfV - TAVERN.pergola.depth / 2 + 0.2;

export const INKWELL_ANCHORS = {
  // The captain, and the stops in the course's order (spec §4).
  landing: anchor(-190, 16, LOOK.lane, PAVED),
  juno: anchor(-186.5, 18.6, LOOK.landing, PAVED),
  kosta: anchor(-212, 24, LOOK.landing, PAVED),
  // The Model Market's keeper behind the counter (where Kosta stands).
  marketKeeper: {
    x: vendor.x,
    y: INKWELL_BOOTH.y + BOOTH_LAYOUT.vendor.y,
    z: vendor.z,
    heading: INKWELL_BOOTH.heading,
  },
  // Lyra stands on the rug under the pergola; her two players sit either side of her.
  lyra: anchor(TAVERNA.u, rugV, LOOK.terraceFloor, PAVED),
  lyraPlayerA: seated(anchor(TAVERNA.u - 2.4, rugV + 0.3, LOOK.terraceFloor, PAVED)),
  lyraPlayerB: seated(anchor(TAVERNA.u + 2.4, rugV + 0.3, LOOK.terraceFloor, PAVED)),
  // Where the captain stands to hear her: inside the terrace's low wall.
  boardSong: anchor(TAVERNA.u, TAVERNA.v - 3.2, { u: TAVERNA.u, v: rugV }, PAVED),
  thea: anchor(SQUARE_PROPS.post.u - 2.6, SQUARE_PROPS.post.v - 1.2, LOOK.flightHead, PAVED),
  stairBoard: anchor(SQUARE_PROPS.post.u, SQUARE_PROPS.post.v),
  nikos: anchor(PLAZA.u - 6, PLAZA.v - 7, LOOK.stairHead, PAVED),
  calla: anchor(LOGGIA.u + LOGGIA.halfU + 2.4, LOGGIA.v - 2.6, LOOK.plaza, PAVED),
  petra: anchor(DRAUGHT.u - 3.4, DRAUGHT.v - 3.4, LOOK.draughtWay, PAVED),
  // Off the chart, by its north-west corner (the rail's shot looks along the chart's north edge).
  doran: anchor(GREAT_CHART.u - 18.5, GREAT_CHART.v + 12.5, LOOK.courtWay, PAVED),
  iris: anchor(TERRACE.u + 2.5, TERRACE.v - 3.5, LOOK.stairTop, PAVED),
  seal: anchor(SEAL_PLINTH.u, SEAL_PLINTH.v),
  dome: anchor(DOME.u, DOME.v),
  // Where Juno stands on the Great Chart while the Shared Chart is open (the mate's hand).
  junoChart: anchor(GREAT_CHART.u + 5, GREAT_CHART.v + 2, LOOK.chart, 0.05),
  // The Borrowed Board's stations (P6.1), Two Hands' (P6.2) and the Shared Chart's (P6.3).
  'board.notice': spotAnchor('board', 'notice'),
  'board.roll': spotAnchor('board', 'roll'),
  'board.bell': spotAnchor('board', 'bell'),
  'board.frame': spotAnchor('board', 'frame'),
  'board.card': spotAnchor('board', 'card'),
  'slate.easel': spotAnchor('slate', 'easel'),
  'slate.order': spotAnchor('slate', 'order'),
  'slate.slate': spotAnchor('slate', 'slate'),
  'slate.mate': spotAnchor('slate', 'mate'),
  'slate.chest': spotAnchor('slate', 'chest'),
  'chart.quill': spotAnchor('chart', 'quill'),
  'chart.planDesk': spotAnchor('chart', 'planDesk'),
  'chart.rail': spotAnchor('chart', 'rail'),
  'chart.bells': spotAnchor('chart', 'bells'),
  'chart.rack': spotAnchor('chart', 'rack'),
  'chart.build': spotAnchor('chart', 'build'),
  'chart.soundings': spotAnchor('chart', 'soundings'),
  'chart.glass': spotAnchor('chart', 'glass'),
  // The circuits' cameras: the Loggia from its mouth; the terrace from the Plaza's side; the Great
  // Chart from above its south-west corner, the Dome behind it.
  boardCam: camera(
    LOGGIA.u + LOGGIA.halfU + 7,
    LOGGIA.v - 1,
    LOGGIA.y + 3.4,
    LOGGIA.u - LOGGIA.halfU,
    LOGGIA.v + 0.4,
    LOGGIA.y + 1.7,
  ),
  slateCam: camera(
    DRAUGHT.u - 3,
    DRAUGHT.v - DRAUGHT.halfV - 8,
    DRAUGHT.y + 6.5,
    DRAUGHT.u,
    DRAUGHT.v + 3,
    DRAUGHT.y + 1.2,
  ),
  chartCam: camera(
    GREAT_CHART.u - 18,
    GREAT_CHART.v - 15,
    COURT.y + 13,
    GREAT_CHART.u + 4,
    GREAT_CHART.v + 3,
    COURT.y,
  ),
  // The islanders.
  // East of the fountain (out of the first flight's way).
  extraWasher: anchor(
    SQUARE_PROPS.fountain.u + 2.7,
    SQUARE_PROPS.fountain.v - 0.4,
    { u: SQUARE_PROPS.fountain.u, v: SQUARE_PROPS.fountain.v },
    PAVED,
  ),
  extraFisher: anchor(-160, 15.2, { u: -160, v: 0 }, PAVED),
  extraPorter: anchor(-142, 28.4, LOOK.lane, PAVED),
  extraChild: anchor(PLAZA.u + 5, PLAZA.v + 3, LOOK.plaza, PAVED),
  extraPainter: anchor(PLAZA.u + 12, PLAZA.v - 12.2, { u: -190, v: 0 }, PAVED),
  // On the path's edge by their posts (out of the meadow's long grass).
  extraFlyerA: anchor(KITE_POSTS[0].u - 1.4, KITE_POSTS[0].v - 1.4, LOOK.sea),
  extraFlyerB: anchor(KITE_POSTS[1].u + 1.4, KITE_POSTS[1].v - 1.4, LOOK.sea),
  extraSurveyor: anchor(GREAT_CHART.u + 9, GREAT_CHART.v - 14, LOOK.chart, PAVED),
} as const satisfies Record<string, VillageAnchor>;

export type { CameraAnchor } from '../anchor-kit';

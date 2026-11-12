import { stationSpot, type StationSpot } from '../anchor-kit';
import { COURT, DRAUGHT, GREAT_CHART, LOGGIA } from './layout';

/**
 * The three circuits' stations in the world (docs/specs/ISLAND-06-inkwell-bluffs.md §5): where the
 * player stands to use each one, the lamp that answers for it (`board:<place>`, `slate:<place>`,
 * `chart:<place>` in the island's lamp set), and what the camera looks at while it's open. The
 * Borrowed Board (`board`) runs round the Loggia; Two Hands, One Chart (`slate`) round the Draughting
 * Terrace; the Shared Chart (`chart`) round the Great Chart. The words are the course pack's
 * (`puzzles/borrowed-board.json`, `two-hands.json`, `shared-chart.json`). Plain data (no three.js).
 */

export type IwCircuit = 'board' | 'slate' | 'chart';

/** A station at (u, v) on the floor `y` whose look is (lu, lv) at `dy` over it. */
const spot = (
  kind: IwCircuit,
  place: string,
  y: number,
  u: number,
  v: number,
  lu: number,
  lv: number,
  dy = 1.2,
) => stationSpot(kind, place, y, u, v, lu, lv, dy);

/** The Loggia's back wall (the board hangs on it), its side walls, and the colonnade's line (frame). */
export const LOGGIA_WALLS = {
  back: LOGGIA.u - LOGGIA.halfU + 0.5,
  north: LOGGIA.v + LOGGIA.halfV - 0.5,
  south: LOGGIA.v - LOGGIA.halfV + 0.5,
  front: LOGGIA.u + LOGGIA.halfU - 0.4,
} as const;

/** The visiting guild's board on the Loggia's back wall: its middle (frame v), its width and height. */
export const GUILD_BOARD = { v: LOGGIA.v + 0.4, w: 6.4, h: 2.3, y: 1.75 } as const;

/** The Great Chart's brass rail along its north edge: its line (frame v) and its five posts (frame u). */
export const RAIL = {
  v: GREAT_CHART.v + GREAT_CHART.halfV + 1.6,
  posts: [-12, -6, 0, 6, 12].map((d) => GREAT_CHART.u + d),
} as const;

/** How far west of the rail's first post the marker waits before it is set (m). */
export const RAIL_PARK = 1.5;

/** The bell pulls' frame on the court's east side, and the slate rack south of it (frame). */
export const BELLS = {
  u: COURT.u + COURT.halfU - 5.4,
  v: COURT.v + 8,
  pulls: [-2.1, -0.7, 0.7, 2.1],
} as const;
export const RACK = {
  u: COURT.u + COURT.halfU - 5.4,
  v: COURT.v - 12,
  slots: [-2.4, -1.2, 0, 1.2, 2.4],
} as const;

const L = LOGGIA.y;
const D = DRAUGHT.y;
const C = COURT.y;
const W = LOGGIA_WALLS;

export const CIRCUIT_SPOTS: Readonly<Record<IwCircuit, Readonly<Record<string, StationSpot>>>> = {
  // Round the Loggia: the guild's notice at its mouth, the roll on its north wall, the bell on its
  // south wall, and the board on its back wall (its empty frame's side, then its cards' side).
  board: {
    notice: spot('board', 'notice', L, LOGGIA.u + 5.2, LOGGIA.v + 2.6, LOGGIA.u + 7.3, LOGGIA.v + 4.4, 1.35),
    roll: spot('board', 'roll', L, LOGGIA.u + 2, W.north - 2.5, LOGGIA.u + 2, W.north, 1.5),
    bell: spot('board', 'bell', L, LOGGIA.u + 2, W.south + 2.5, LOGGIA.u + 2, W.south, 1.9),
    frame: spot('board', 'frame', L, W.back + 3.4, GUILD_BOARD.v + 1.6, W.back, GUILD_BOARD.v + 1.6, 1.75),
    card: spot('board', 'card', L, W.back + 3.4, GUILD_BOARD.v - 1.4, W.back, GUILD_BOARD.v - 1.4, 1.75),
  },
  // Round the Draughting Terrace: the easel on its west side, the order desk and the slate on its
  // north side (the sea behind them), the mate's stand on its east side, the sea chest by the way out.
  slate: {
    easel: spot('slate', 'easel', D, DRAUGHT.u - 6.6, DRAUGHT.v - 1.5, DRAUGHT.u - 9.2, DRAUGHT.v - 1.5, 1.5),
    order: spot('slate', 'order', D, DRAUGHT.u - 4.4, DRAUGHT.v + 3.4, DRAUGHT.u - 4.4, DRAUGHT.v + 5.8, 1.0),
    slate: spot('slate', 'slate', D, DRAUGHT.u + 1.6, DRAUGHT.v + 3.0, DRAUGHT.u + 1.6, DRAUGHT.v + 5.8, 1.5),
    mate: spot('slate', 'mate', D, DRAUGHT.u + 6.8, DRAUGHT.v + 1.6, DRAUGHT.u + 9.2, DRAUGHT.v + 2.6, 1.3),
    chest: spot('slate', 'chest', D, DRAUGHT.u + 6.6, DRAUGHT.v - 3.4, DRAUGHT.u + 8.8, DRAUGHT.v - 4.6, 0.6),
  },
  // Round the Great Chart: the quill desk and the Plan desk on its west side, the brass rail along its
  // north edge, the bell pulls (the first, then the second) and the slate rack (its first slate, then
  // the last soundings) on its east side, the glass on its south side.
  chart: {
    quill: spot(
      'chart',
      'quill',
      C,
      GREAT_CHART.u - 17,
      GREAT_CHART.v - 7,
      GREAT_CHART.u - 19.4,
      GREAT_CHART.v - 7,
      1.0,
    ),
    planDesk: spot(
      'chart',
      'planDesk',
      C,
      GREAT_CHART.u - 17,
      GREAT_CHART.v,
      GREAT_CHART.u - 19.4,
      GREAT_CHART.v,
      1.0,
    ),
    rail: spot('chart', 'rail', C, GREAT_CHART.u, RAIL.v - 3, GREAT_CHART.u, RAIL.v, 1.25),
    bells: spot('chart', 'bells', C, BELLS.u - 2.6, BELLS.v + 2.0, BELLS.u, BELLS.v + 2.0, 1.9),
    rack: spot('chart', 'rack', C, RACK.u - 2.6, RACK.v + 1.6, RACK.u, RACK.v + 1.6, 1.5),
    build: spot('chart', 'build', C, BELLS.u - 2.6, BELLS.v - 0.6, BELLS.u, BELLS.v - 0.6, 1.9),
    glass: spot(
      'chart',
      'glass',
      C,
      GREAT_CHART.u + 2,
      GREAT_CHART.v - 13.4,
      GREAT_CHART.u + 2,
      GREAT_CHART.v - 15.8,
      1.3,
    ),
    soundings: spot('chart', 'soundings', C, RACK.u - 2.6, RACK.v - 1.6, RACK.u, RACK.v - 1.6, 1.5),
  },
};

export type { StationSpot } from '../anchor-kit';

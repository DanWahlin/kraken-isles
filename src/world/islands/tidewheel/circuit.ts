import { stationSpot, type StationSpot } from '../anchor-kit';
import { COURT, WORKS } from './layout';

/**
 * The two circuits' stations in the world (docs/specs/ISLAND-07-tidewheel-caldera.md §5): where the
 * player stands to use each one, the lamp that answers for it (`lever:<place>`, `clock:<place>` in
 * the island's lamp set), and what the camera looks at while it's open. The Lever (`lever`) runs
 * round the Wheel Works; Gears & Bells (`clock`) round the Clock Court. The words are the course
 * pack's (`puzzles/the-lever.json`, `gears-and-bells.json`). Plain data (no three.js).
 */

export type TwCircuit = 'lever' | 'clock';

/** A station at (u, v) on the floor `y` whose look is (lu, lv) at `dy` over it. */
const spot = (
  kind: TwCircuit,
  place: string,
  y: number,
  u: number,
  v: number,
  lu: number,
  lv: number,
  dy = 1.2,
) => stationSpot(kind, place, y, u, v, lu, lv, dy);

/** The Wheel Works' walls (frame): its west and north walls carry the benches; the south and east are open rails. */
export const WORKS_WALLS = {
  west: WORKS.u - WORKS.halfU + 0.5,
  north: WORKS.v + WORKS.halfV - 0.5,
  south: WORKS.v - WORKS.halfV + 0.4,
  east: WORKS.u + WORKS.halfU - 0.4,
} as const;

/** The Works' furniture (frame): where each piece stands. */
export const WORKS_PIECES = {
  /** The drum bench against the west wall: the music-box drum on its cradle. */
  drum: { u: WORKS_WALLS.west + 1.1, v: WORKS.v - 4.6 },
  /** The tool rack on the west wall, north of the drum: three glasses on hooks, the hammers behind a grille. */
  tools: { u: WORKS_WALLS.west + 0.2, v: WORKS.v + 4.2 },
  /** The gear rack, the cloud switch and the chart desk along the north wall. */
  gear: { u: WORKS.u - 8, v: WORKS_WALLS.north - 0.9 },
  switch: { u: WORKS.u - 1, v: WORKS_WALLS.north - 0.9 },
  desk: { u: WORKS.u + 6, v: WORKS_WALLS.north - 1 },
  /** The great lever on its plinth in the yard's middle, and the gear train it throws into mesh behind it. */
  lever: { u: WORKS.u + 1.5, v: WORKS.v - 0.5 },
  /** The keeper's log on its lectern by the Clock Walk's gate. */
  log: { u: WORKS_WALLS.east - 1.2, v: WORKS.v - 5.4 },
} as const;

/** The Clock Court's edges (frame): the rock wall on its east, the balustrade over the bay on its west. */
export const COURT_WALLS = {
  east: COURT.u + COURT.halfU - 0.5,
  west: COURT.u - COURT.halfU + 0.4,
  north: COURT.v + COURT.halfV - 0.4,
  south: COURT.v - COURT.halfV + 0.4,
} as const;

/** The court's furniture (frame). */
export const COURT_PIECES = {
  /** The clock desk, the day gear and the peg board along the east wall. */
  desk: { u: COURT_WALLS.east - 1, v: COURT.v + 5.6 },
  gear: { u: COURT_WALLS.east - 0.6, v: COURT.v + 0.6 },
  pegs: { u: COURT_WALLS.east - 0.5, v: COURT.v - 4.6 },
  /** The ring's crank on its pedestal at the court's south end: you turn it facing the Lighthouse's clock. */
  ring: { u: COURT.u + 3, v: COURT_WALLS.south + 1.6 },
  /** The save bell and the tide gauge at the balustrade, the morning log between the gauge and the way out. */
  bell: { u: COURT_WALLS.west + 0.9, v: COURT.v + 4.6 },
  tide: { u: COURT_WALLS.west + 0.9, v: COURT.v - 1.4 },
  log: { u: COURT_WALLS.west + 1.4, v: COURT.v - 7 },
} as const;

/**
 * The hours on the clock ring that the dial can stop at, in the order the crank turns through them
 * (the pack's `gears-and-bells` puzzle gives its `ring` station the same five positions).
 */
export const RING_HOURS = [8, 9, 10, 11, 12] as const;
/** Where the ring stands before it is set: on the default nine. */
export const RING_START = RING_HOURS.indexOf(9);

const W = WORKS.y;
const C = COURT.y;
const P = WORKS_PIECES;
const Q = COURT_PIECES;

export const CIRCUIT_SPOTS: Readonly<Record<TwCircuit, Readonly<Record<string, StationSpot>>>> = {
  // Round the Wheel Works: the drum on the west wall, the gear rack, the switch and the desk along the
  // north wall, the great lever in the middle, the log by the gate.
  lever: {
    drum: spot('lever', 'drum', W, P.drum.u + 2.6, P.drum.v, P.drum.u, P.drum.v, 1.2),
    gear: spot('lever', 'gear', W, P.gear.u, P.gear.v - 2.5, P.gear.u, P.gear.v + 0.6, 1.5),
    switch: spot('lever', 'switch', W, P.switch.u, P.switch.v - 2.5, P.switch.u, P.switch.v + 0.6, 1.5),
    desk: spot('lever', 'desk', W, P.desk.u, P.desk.v - 2.4, P.desk.u, P.desk.v, 1.0),
    lever: spot('lever', 'lever', W, P.lever.u, P.lever.v - 2.8, P.lever.u, P.lever.v, 1.5),
    log: spot('lever', 'log', W, P.log.u - 2.4, P.log.v, P.log.u, P.log.v, 1.1),
  },
  // Round the Clock Court: the desk, the day gear and the pegs on the east wall, the ring's crank at the
  // south end, the save bell, the tide gauge and the morning log along the balustrade.
  clock: {
    desk: spot('clock', 'desk', C, Q.desk.u - 2.4, Q.desk.v, Q.desk.u, Q.desk.v, 1.0),
    gear: spot('clock', 'gear', C, Q.gear.u - 2.8, Q.gear.v, Q.gear.u + 0.4, Q.gear.v, 1.6),
    ring: spot('clock', 'ring', C, Q.ring.u - 1.4, Q.ring.v + 1.9, Q.ring.u, Q.ring.v, 1.0),
    pegs: spot('clock', 'pegs', C, Q.pegs.u - 2.7, Q.pegs.v, Q.pegs.u + 0.3, Q.pegs.v, 1.5),
    bell: spot('clock', 'bell', C, Q.bell.u + 2.5, Q.bell.v, Q.bell.u, Q.bell.v, 1.9),
    tide: spot('clock', 'tide', C, Q.tide.u + 2.5, Q.tide.v, Q.tide.u, Q.tide.v, 1.3),
    log: spot('clock', 'log', C, Q.log.u + 2.3, Q.log.v + 0.6, Q.log.u, Q.log.v, 1.1),
  },
};

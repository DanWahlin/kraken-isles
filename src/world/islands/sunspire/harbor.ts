import {
  BERTH,
  CARAVANSERAI,
  DEPARTURE,
  headingBetween,
  headingUv,
  LANDING,
  LANE,
  QUAY,
  toWorld,
} from './layout';

/**
 * Sunspire's harbour for the game (spec S2): the berth along the quay on the cove's north-east
 * shore, where you step ashore, the lane in from the open sea through the cove's mouth, and the
 * turning room. Plain data (no three.js): the registry, the tests and the tools import it.
 */

/** Out of the cove toward its mouth (bearing 323°): the bow's heading as you put out. */
const SEAWARD = headingUv(-1, 0);
/** Up the cove toward its head: the bow's heading at the berth (the gangway lies on the quay). */
const UP_COVE = headingUv(1, 0);

const berth = toWorld(BERTH.u, BERTH.v);
const departure = toWorld(DEPARTURE.u, DEPARTURE.v);
const landing = toWorld(LANDING.u, LANDING.v);

/** The lane in from the open sea (from Guildcrest), through the mouth and the turning room, to the berth. */
const LANE_UV = [
  { u: -760, v: -30 },
  { u: LANE.start.u, v: LANE.start.v },
  { u: LANE.mouth.u, v: LANE.mouth.v },
  { u: LANE.turning.u, v: LANE.turning.v },
  { u: BERTH.u, v: BERTH.v },
] as const;

const camAt = (u: number, y: number, v: number, tu: number, ty: number, tv: number) => {
  const p = toWorld(u, v);
  const t = toWorld(tu, tv);
  return { x: p.x, y, z: p.z, tx: t.x, ty, tz: t.z };
};

export const SUNSPIRE_HARBOR = {
  /** Your ship alongside the quay: her gangway's side to its face, bow up the cove. */
  berth: { x: berth.x, z: berth.z, heading: UP_COVE },
  /** Off the quay as you board, bow to the mouth, inside the turning room's reach. */
  departure: { x: departure.x, z: departure.z, heading: SEAWARD },
  /** Where you step ashore, facing the caravanserai's gate at the quay's head. */
  landing: { x: landing.x, z: landing.z, heading: headingBetween(LANDING, CARAVANSERAI) },
  /** The quay's deck height. */
  deck: QUAY.top,
  /**
   * The first look ashore: over the captain's shoulder up the quay lane to the caravanserai, the
   * town's awnings and the Sunspire on its mesa (the arrival holds here before the follow camera).
   */
  landingShot: camAt(LANDING.u - 9, 6.4, LANDING.v - 3, 60, 40, 70),
  lane: LANE_UV.map((p) => toWorld(p.u, p.v)),
  /** Half the lane's width (m), and no ground above `laneFloor` in it (to the turning room). */
  laneHalfWidth: LANE.halfWidth,
  laneFloor: LANE.floor,
  /** Room to swing round inside the cove, off the quay's west end. */
  turning: { ...toWorld(LANE.turning.u, LANE.turning.v), r: LANE.turning.r, depth: LANE.turning.depth },
} as const;

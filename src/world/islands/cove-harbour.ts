import type { IslandFrameKit, Uv } from './frame';

/**
 * The cove harbour that Sunspire Sands, Inkwell Bluffs and Tidewheel Caldera share (in each island's
 * own frame): a cove cut in along the frame's axis with a stone quay on its `v > 0` shore, a berth
 * alongside it, a lane in from the open sea and a turning room. With the frame's axis on bearing 143°
 * the ship comes in and puts out on a beam reach in the prevailing wind (issue 292). The numbers are
 * proven by each island's height tests (the lane's depth and width, the turning room, the berth, the
 * gangway). Plain data (no three.js).
 */

/** The quay: its face along `v`, from `u0` to `u1`, its deck at `top`. */
export const COVE_QUAY = { v: 12.5, u0: -235, u1: -150, top: 2.2 } as const;

/** The berth alongside the quay: port side to its face, bow toward the cove's head. */
export const COVE_BERTH = { u: -196, v: 8 } as const;
export const COVE_DEPARTURE = { u: -212, v: 2 } as const;
export const COVE_LANDING = { u: -190, v: 16 } as const;

/** The lane in from the open sea: lane start, the mouth, the turning room. */
export const COVE_LANE = {
  start: { u: -560, v: -30 },
  mouth: { u: -430, v: -30 },
  turning: { u: -300, v: -33, r: 40, depth: 4.5 },
  halfWidth: 30,
  floor: -6,
} as const;

/**
 * The cove: stations along u, each with its two shores (v) at the waterline and its floor in the
 * middle. Its `v < 0` shore is a wide crescent beach.
 */
export const COVE_STATIONS = [
  { u: -560, vMin: -170, vMax: 40, floor: -18 },
  { u: -460, vMin: -160, vMax: 26, floor: -14 },
  { u: -330, vMin: -150, vMax: 24, floor: -11 },
  { u: -255, vMin: -128, vMax: 15, floor: -9 },
  { u: -175, vMin: -92, vMax: 12.5, floor: -7.5 },
  { u: -140, vMin: -58, vMax: 10, floor: -4 },
  { u: -122, vMin: -30, vMax: 4, floor: -1.5 },
] as const;

/** A cove's stations (`COVE_STATIONS`' shape). */
export type CoveStations = readonly {
  readonly u: number;
  readonly vMin: number;
  readonly vMax: number;
  readonly floor: number;
}[];

/** A camera pose (world). */
export interface HarbourShot {
  x: number;
  y: number;
  z: number;
  tx: number;
  ty: number;
  tz: number;
}

/**
 * A cove harbour for the game, in the world: the berth along the quay, where you step ashore, the
 * lane in from the open sea through the cove's mouth, and the turning room. `landingLook` is what the
 * captain faces on stepping ashore (frame); `landingShot` the first look ashore: the eye (u, y, v) and
 * what it looks at (tu, ty, tv), which the arrival holds before the follow camera.
 */
export function coveHarbor(
  frame: IslandFrameKit,
  o: { landingLook: Uv; landingShot: readonly [number, number, number, number, number, number] },
) {
  const { toWorld, headingUv, headingBetween } = frame;
  const berth = toWorld(COVE_BERTH.u, COVE_BERTH.v);
  const departure = toWorld(COVE_DEPARTURE.u, COVE_DEPARTURE.v);
  const landing = toWorld(COVE_LANDING.u, COVE_LANDING.v);
  // The lane in from the open sea, through the mouth and the turning room, to the berth.
  const lane = [{ u: -760, v: -30 }, COVE_LANE.start, COVE_LANE.mouth, COVE_LANE.turning, COVE_BERTH].map(
    (p) => toWorld(p.u, p.v),
  );
  const [u, y, v, tu, ty, tv] = o.landingShot;
  const eye = toWorld(u, v);
  const target = toWorld(tu, tv);
  const landingShot: HarbourShot = { x: eye.x, y, z: eye.z, tx: target.x, ty, tz: target.z };
  return {
    /** Your ship alongside the quay: her gangway's side to its face, bow up the cove. */
    berth: { x: berth.x, z: berth.z, heading: headingUv(1, 0) },
    /** Off the quay as you board, bow to the mouth, inside the turning room's reach. */
    departure: { x: departure.x, z: departure.z, heading: headingUv(-1, 0) },
    /** Where you step ashore. */
    landing: { x: landing.x, z: landing.z, heading: headingBetween(COVE_LANDING, o.landingLook) },
    /** The quay's deck height. */
    deck: COVE_QUAY.top,
    landingShot,
    lane,
    /** Half the lane's width (m), and no ground above `laneFloor` in it (to the turning room). */
    laneHalfWidth: COVE_LANE.halfWidth,
    laneFloor: COVE_LANE.floor,
    /** Room to swing round inside the cove, off the quay's west end. */
    turning: {
      ...toWorld(COVE_LANE.turning.u, COVE_LANE.turning.v),
      r: COVE_LANE.turning.r,
      depth: COVE_LANE.turning.depth,
    },
  } as const;
}

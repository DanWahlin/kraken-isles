import { BUTTE, COURT, LOW_MESA, SIGNAL_HOUSE, SPIRE, YARD } from './layout';

/**
 * The two circuits' stations in the world (docs/specs/ISLAND-05-sunspire-sands.md §5): where the
 * player stands to use each one, the lamp that answers for it (`signal:<place>`, `crate:<place>` in
 * the island's lamp set), and what the camera looks at while it's open. Mirror Beams (`signal`) runs
 * from the Signal House's roll into the Mirror Court; the Sealed Crate (`crate`) runs round the Crate
 * Yard. The words are the course pack's (`puzzles/mirror-beams.json`, `sealed-crate.json`). Plain
 * data (no three.js).
 */

export interface StationSpot {
  /** Where the player stands to use it (island frame) and the walk's height there. */
  u: number;
  v: number;
  y: number;
  /** The lamp that answers for it, in the island's lamp set. */
  lamp: string;
  /** What the camera looks at while it's open (island frame, y). */
  look: { u: number; y: number; v: number };
}

const mesa = LOW_MESA.y;

/** A station at (u, v) whose look is (lu, lv) at `dy` over its walk. */
function spot(kind: 'signal' | 'crate', place: string, u: number, v: number, lu: number, lv: number, dy = 1) {
  return { u, v, y: mesa, lamp: `${kind}:${place}`, look: { u: lu, y: mesa + dy, v: lv } };
}

/** The court's great mirror stand (the dial turns its head): its foot and its head's height. */
export const MIRROR = { u: COURT.u + 14, v: COURT.v, y: mesa, head: mesa + 2.3 } as const;

/**
 * Where the court mirror's beam ends at each bearing, in the order the mirror turns (clockwise from
 * the cliff): frame (u, v) and height. The last is the Sunspire's great mirror.
 */
export const BEAM_ENDS = [
  { id: 'cliff', u: LOW_MESA.u1 + 1, v: COURT.v, y: mesa + 16 },
  { id: 'butte', u: BUTTE.u - 70, v: BUTTE.v + 40, y: 84 },
  { id: 'dunes', u: 40, v: -190, y: 10 },
  { id: 'sea', u: -420, v: -60, y: 0.6 },
  { id: 'town', u: -100, v: 50, y: 12 },
  { id: 'spire', u: SPIRE.u - SPIRE.side / 2 - 0.6, v: SPIRE.v, y: SPIRE.mirror },
] as const;

export const CIRCUIT_SPOTS: {
  signal: Readonly<Record<string, StationSpot>>;
  crate: Readonly<Record<string, StationSpot>>;
} = {
  // From the Signal House's south wall into the court: the roll of towers, the brass card at the
  // court's north entrance, the shutter's lever and the mirror on its east side, the key desk on its
  // south side, the chart tent in its south-west corner.
  signal: {
    roll: spot(
      'signal',
      'roll',
      SIGNAL_HOUSE.u + 2,
      SIGNAL_HOUSE.v - SIGNAL_HOUSE.halfV - 2.4,
      SIGNAL_HOUSE.u + 2,
      SIGNAL_HOUSE.v - SIGNAL_HOUSE.halfV,
      1.5,
    ),
    card: spot('signal', 'card', COURT.u - 12, COURT.v + 11, COURT.u - 12, COURT.v + 13.2, 1.1),
    shutter: spot('signal', 'shutter', MIRROR.u - 2.6, MIRROR.v + 4, MIRROR.u - 0.4, MIRROR.v + 2.4, 1.2),
    mirror: spot('signal', 'mirror', MIRROR.u - 2.8, MIRROR.v - 1.6, MIRROR.u, MIRROR.v, 2.2),
    key: spot('signal', 'key', COURT.u + 6, COURT.v - 9.6, COURT.u + 6, COURT.v - 12, 0.95),
    tent: spot('signal', 'tent', COURT.u - 12, COURT.v - 9, COURT.u - 14, COURT.v - 11, 0.9),
  },
  // Round the Crate Yard: the caravan row's board and the lading desk on its south side, the scale on
  // its east, the bell by the stair's corner, Samir's bench on its north side.
  crate: {
    row: spot('crate', 'row', YARD.u - 8, YARD.v - 8, YARD.u - 8, YARD.v - 11.4, 1.5),
    lading: spot('crate', 'lading', YARD.u + 4, YARD.v - 8, YARD.u + 4, YARD.v - 10.6, 0.95),
    scale: spot('crate', 'scale', YARD.u + 11, YARD.v - 2, YARD.u + 14, YARD.v - 2, 0.8),
    bell: spot('crate', 'bell', YARD.u + 10, YARD.v + 7, YARD.u + 12.5, YARD.v + 8.5, 2.3),
    bench: spot('crate', 'bench', YARD.u - 4, YARD.v + 8, YARD.u - 4, YARD.v + 10.6, 0.95),
  },
};

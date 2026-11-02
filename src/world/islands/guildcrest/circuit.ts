import { CLOISTER, YARD } from './layout';

/**
 * The two circuits' stations in the world (docs/specs/ISLAND-04-guildcrest.md §5, W.6; as built in
 * §15): where the player stands to use each one, the lamp that answers for it (`book:<place>`,
 * `belt:<place>` in the island's lamp set), and what the camera looks at while it's open. The Pattern
 * Book (`book`) runs clockwise round the cloister walk from the scriptorium's door; the Journeyman's
 * Toolbelt (`belt`) runs round the guildhall yard. The words are the course pack's
 * (`puzzles/pattern-book.json`, `toolbelt.json`). Plain data (no three.js).
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

const walk = CLOISTER.y;
const yard = YARD.y;

/** A station at (u, v) whose look is (lu, lv) at `dy` over its walk. */
function spot(
  kind: 'book' | 'belt',
  place: string,
  u: number,
  v: number,
  y: number,
  lu: number,
  lv: number,
  dy = 1,
) {
  return { u, v, y, lamp: `${kind}:${place}`, look: { u: lu, y: y + dy, v: lv } };
}

export const CIRCUIT_SPOTS: {
  book: Readonly<Record<string, StationSpot>>;
  belt: Readonly<Record<string, StationSpot>>;
} = {
  // Round the cloister's walks (the garth's lawn is ±12 m of its middle, the walks to ±16): up the
  // west walk by the scriptorium, along the north walk by the library, down the east walk.
  book: {
    shelf: spot('book', 'shelf', 8, 128, walk, 6.4, 128, 1.4),
    spine: spot('book', 'spine', 8, 138, walk, 6.5, 138, 1.4),
    desk: spot('book', 'desk', 16, 144, walk, 16, 145.5, 0.9),
    proof: spot('book', 'proof', 30, 144, walk, 30, 145.5, 0.9),
    bell: spot('book', 'bell', 36, 136, walk, 37.3, 136, 2.5),
    lectern: spot('book', 'lectern', 36, 122, walk, 37.1, 122, 1.1),
  },
  // Round the guildhall yard: the writing desk and the test bench on its north side, the peg rail on
  // its north wall, the proof table on its east, the hall's door and roll board on its south, the
  // reading bench by its west entrance.
  belt: {
    indenture: spot('belt', 'indenture', 87, 160.5, yard, 87, 163.5, 1),
    rack: spot('belt', 'rack', 98, 165, yard, 98, 167.8, 1.2),
    proof: spot('belt', 'proof', 103, 158, yard, 106, 158, 0.9),
    door: spot('belt', 'door', 104, 149, yard, 104, 144.2, 1.6),
    roll: spot('belt', 'roll', 94, 148, yard, 94, 144.2, 1.6),
    bench: spot('belt', 'bench', 85, 152, yard, 82.5, 149.5, 0.7),
    testBench: spot('belt', 'testBench', 80, 160, yard, 79, 163.5, 0.9),
  },
};

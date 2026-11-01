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
  book: {
    shelf: spot('book', 'shelf', 8, 118, walk, 2, 116, 1.4),
    spine: spot('book', 'spine', 8, 132, walk, 2, 134, 1.2),
    desk: spot('book', 'desk', 18, 136, walk, 18, 143, 0.9),
    proof: spot('book', 'proof', 32, 136, walk, 34, 142, 0.9),
    bell: spot('book', 'bell', 32, 120, walk, 40, 120, 2.6),
    lectern: spot('book', 'lectern', 20, 116, walk, 20, 112, 1.2),
  },
  belt: {
    indenture: spot('belt', 'indenture', 86, 158, yard, 86, 163, 1.2),
    rack: spot('belt', 'rack', 98, 166, yard, 100, 169, 1.2),
    proof: spot('belt', 'proof', 108, 160, yard, 111, 161, 0.9),
    door: spot('belt', 'door', 104, 150, yard, 104, 146, 1.8),
    roll: spot('belt', 'roll', 94, 146, yard, 94, 143, 1.6),
    bench: spot('belt', 'bench', 84, 150, yard, 82, 148, 0.8),
    testBench: spot('belt', 'testBench', 78, 156, yard, 75, 157, 0.8),
  },
};

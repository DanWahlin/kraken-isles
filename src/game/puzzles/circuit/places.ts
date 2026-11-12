/**
 * The circuit mechanic's places (docs/specs/ISLAND-03-keelhaven.md §5.6, Two Circuits): the stations
 * where a circuit's lamps stand, in the order the player walks them. A course binds its own place ids
 * to these with `"acts"` (`puzzles/<name>.json` → `places`), and the content check holds each one
 * bound once. The mechanic's rules, lamps and views come with the island (its wiring step); this is
 * the part the course pack and its check need first.
 */
export const CIRCUIT_PLACES = {
  /** The Drydock Ring (the inner loop): one lap round a drydock. */
  ring: ['post', 'stack', 'slate', 'caisson', 'lookout'],
  /** The Lock Flight (the outer loop): the canal's locks and gates down to the sea. */
  flight: [
    'ledger',
    'bell',
    'slate',
    'gate1',
    'petition',
    'lamps',
    'note',
    'redLamp',
    'barge',
    'gate2',
    'seaGate',
  ],
  /** A cloister's book round (the Pattern Book): a book found, read, changed, proofed, reloaded and used. */
  book: ['shelf', 'spine', 'desk', 'proof', 'bell', 'lectern'],
  /** A guildhall yard (the Journeyman's Toolbelt): a role written, fitted, proofed, loaded, called, used. */
  belt: ['indenture', 'rack', 'proof', 'door', 'roll', 'bench', 'testBench'],
  /** A mirror court (Mirror Beams): a far tower found, read, opened, aimed, signalled, and its answer compared at home. */
  signal: ['roll', 'card', 'shutter', 'mirror', 'key', 'tent'],
  /** A crate yard (the Sealed Crate): a crate found, its lading read, taken in, called for, and its work checked. */
  crate: ['row', 'lading', 'scale', 'bell', 'bench'],
  /** A loggia (the Borrowed Board): a visiting guild's board taken in, found, rung in, hung, and one card moved. */
  board: ['notice', 'roll', 'bell', 'frame', 'card'],
  /** A draughting terrace (Two Hands, One Chart): a slate called for, ordered, marked by both hands, and stowed. */
  slate: ['easel', 'order', 'slate', 'mate', 'chest'],
  /**
   * A chart court (the Shared Chart): a proposal, its approval, the rail's marker, the first bell pull,
   * its slate, the second pull, the glass, and the last soundings.
   */
  chart: ['quill', 'planDesk', 'rail', 'bells', 'rack', 'build', 'glass', 'soundings'],
  /**
   * The Lever (Tidewheel's Wheel Works): the music-box drum, the gear rack, the cloud switch, the
   * chart desk, the great lever and the keeper's log.
   */
  lever: ['drum', 'gear', 'switch', 'desk', 'lever', 'log'],
  /**
   * Gears & Bells (Tidewheel's Clock Court): the clock desk, the day gear, the clock ring's crank, the
   * peg board, the save bell, the tide gauge and the morning log.
   */
  clock: ['desk', 'gear', 'ring', 'pegs', 'bell', 'tide', 'log'],
} as const;

export type CircuitKind = keyof typeof CIRCUIT_PLACES;
export type RingPlace = (typeof CIRCUIT_PLACES.ring)[number];
export type FlightPlace = (typeof CIRCUIT_PLACES.flight)[number];
export type BookPlace = (typeof CIRCUIT_PLACES.book)[number];
export type BeltPlace = (typeof CIRCUIT_PLACES.belt)[number];

/**
 * What a station asks of the player: `choose` (one option; a wrong one goes back with its reason),
 * `watch` (a short demo, skippable), `sound` (tap each plank, then float the hull), `seal` (the
 * player's approval), `tiles` (claims that stick or don't), `gate` (a seal that waits for its lamps),
 * `dial` (a control the player turns a position at a time, watching what it does, then sets).
 */
export const STATION_KINDS = ['choose', 'watch', 'sound', 'seal', 'tiles', 'gate', 'dial'] as const;
export type StationKind = (typeof STATION_KINDS)[number];

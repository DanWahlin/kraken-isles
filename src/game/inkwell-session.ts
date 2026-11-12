import { INKWELL_ANCHORS } from '../world/islands/inkwell/anchors';
import type { InkwellWorld } from '../world/islands/inkwell/index';
import { COURT, DRAUGHT, FRAME_KIT, INKWELL, PLAZA, SQUARE, TAVERNA } from '../world/islands/inkwell/layout';
import { SQUARE_PROPS } from '../world/islands/inkwell/town';
import {
  chestIds,
  createFrameIslandContent,
  frameShot,
  playBandSong,
  type BottleSpot,
  type ChestSpot,
  type FrameIslandContent,
} from './frame-island-content';
import { createInkwellCircuits, type InkwellCircuits } from './inkwell-circuits';
import { INKWELL_NPCS, inkwellExtras } from './inkwell-npcs';
import { INKWELL_QUESTS } from './inkwell-quests';
import type { IslandContentHost } from './island-code';

/**
 * Inkwell's content in the play session (docs/specs/ISLAND-06-inkwell-bluffs.md §4-§6) on the shared
 * content (frame-island-content.ts): its cast, its chests and bottles, and its set pieces (the cues:
 * the board song, the stair's board, the four desks, the three circuits and the Seal). It has no
 * fresh water to wade.
 */
export type InkwellContent = FrameIslandContent<InkwellWorld>;

const shot = (u: number, y: number, v: number, tu: number, ty: number, tv: number) =>
  frameShot(FRAME_KIT, u, y, v, tu, ty, tv);

const SHOTS = {
  // Over the square from the first flight's head, at Thea's board and the notes on their lines.
  stair: shot(
    SQUARE_PROPS.post.u - 9,
    SQUARE.y + 4.4,
    SQUARE_PROPS.post.v - 8,
    SQUARE_PROPS.post.u + 2,
    SQUARE.y + 3,
    SQUARE_PROPS.post.v + 4,
  ),
  // The Plaza from above its south rim: the armillary and the four desks at its corners.
  desks: shot(PLAZA.u - 4, PLAZA.y + 15, PLAZA.v - 27, PLAZA.u, PLAZA.y, PLAZA.v + 2),
  // On the taverna's terrace: Lyra and her players under the pergola.
  song: shot(TAVERNA.u - 5, TAVERNA.y + 2.5, TAVERNA.v - 7.5, TAVERNA.u, TAVERNA.y + 1.3, TAVERNA.v + 3.6),
} as const;

/**
 * The chests the island places (spec §3): at the east end of the taverna's terrace, on the Draughting
 * Terrace, and in the Chart Court by its south rail.
 */
const CHESTS: readonly ChestSpot[] = [
  { id: 'C6.1', u: TAVERNA.u + 7.4, v: TAVERNA.v + 0.4, face: [-1, -0.2] },
  { id: 'C6.2', u: DRAUGHT.u - 8.6, v: DRAUGHT.v + 4.6, face: [1, -0.5] },
  { id: 'C6.3', u: COURT.u - 20.5, v: COURT.v - 14.5, face: [1, 0.6] },
];

/** The message bottles (the chapter's troubleshooting, B6.1-B6.4). */
const BOTTLES: readonly BottleSpot[] = [
  { id: 'B6.1', u: -140, v: -77.5 },
  { id: 'B6.2', u: SQUARE.u - 3, v: SQUARE.v + 5 },
  { id: 'B6.3', u: 64, v: 148.4 },
  { id: 'B6.4', u: -44, v: -24 },
];

/** Every chest and bottle id the island places (`IslandCode.chests`). */
export const INKWELL_CHEST_IDS = chestIds(CHESTS, BOTTLES);

export function createInkwellContent(host: IslandContentHost): InkwellContent {
  return createFrameIslandContent<InkwellWorld>(host, {
    id: 'inkwell',
    prefix: 'iw',
    frame: FRAME_KIT,
    center: INKWELL.center,
    cast: INKWELL_NPCS,
    extras: inkwellExtras,
    npcScript: INKWELL_QUESTS.npcScript,
    chests: CHESTS,
    bottles: BOTTLES,
    pieces(t) {
      // The board song (puzzles/board-song.json): the players argue the arrangement by shout and the
      // song falls apart; you pin the parts on one board that all three can see, and it holds.
      const lyra = INKWELL_ANCHORS.lyra;
      t.cue('song', () =>
        playBandSong(t, {
          puzzle: 'board-song',
          shot: SHOTS.song,
          at: { x: lyra.x, y: lyra.y + 1.2, z: lyra.z },
          first: ['talk', 'playTalk'],
          // Out of step: each player on a different count.
          async falter(strum) {
            for (const [volume, gap] of [
              [0.5, 300],
              [0.5, 300],
              [0.35, 760],
              [0.35, 760],
            ] as const)
              await strum(volume, gap);
          },
          wrong: 'lost',
          fix: ['pin', 'pin', 'lever'],
          again: ['board', 'playBoard'],
          right: 'together',
        }),
      );
      // The stair's board: the camera turns to it and the notes on their lines (M6.1, the next step).
      t.lookCue('stair', SHOTS.stair);
      // The four desks: the camera rises over the Plaza (the surfaces every session has).
      t.lookCue('desks', SHOTS.desks, 1600);
      // The three circuits (spec §5) and the Seal.
      return { circuits: createInkwellCircuits(host, t.circuitCard), kinds: ['board', 'slate', 'chart'] };
    },
    // The rail's marker (its post), the slates on the rack and where the guild's card is.
    debug: (circuits) => ({ chart: () => (circuits as InkwellCircuits).debug.chart() }),
  });
}

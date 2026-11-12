import { TIDEWHEEL_ANCHORS } from '../world/islands/tidewheel/anchors';
import type { TidewheelWorld } from '../world/islands/tidewheel/index';
import {
  BOUNTY,
  COURT,
  FRAME_KIT,
  SPRINGS,
  SQUARE,
  TIDEWHEEL,
  WORKS,
} from '../world/islands/tidewheel/layout';
import { BAND, BOUNTY_BOARD, SQUARE_PROPS } from '../world/islands/tidewheel/town';
import {
  chestIds,
  createFrameIslandContent,
  frameShot,
  playBandSong,
  type BottleSpot,
  type ChestSpot,
  type FrameIslandContent,
} from './frame-island-content';
import type { IslandContentHost } from './island-code';
import { createTidewheelCircuits, type TidewheelCircuits } from './tidewheel-circuits';
import { createLongLight, type LongLight } from './tidewheel-ending';
import { TIDEWHEEL_NPCS, tidewheelExtras } from './tidewheel-npcs';
import { TIDEWHEEL_QUESTS } from './tidewheel-quests';

/**
 * Tidewheel's content in the play session (docs/specs/ISLAND-07-tidewheel-caldera.md §4-§5) on the
 * shared content (frame-island-content.ts): its cast, its chests and bottles, and its set pieces (the
 * cues: the drum song, the four gears, the bounty board, the bells, the two circuits, the Seal and
 * the ending).
 * It has no fresh water to wade.
 */
export type TidewheelContent = FrameIslandContent<TidewheelWorld>;

const shot = (u: number, y: number, v: number, tu: number, ty: number, tv: number) =>
  frameShot(FRAME_KIT, u, y, v, tu, ty, tv);

const SHOTS = {
  // Before the Bandstand: Lyra, her players and the music-box drum on its stand.
  song: shot(BAND.u - 2, 6, BAND.v - 9.5, BAND.u - 0.6, 5, BAND.v + 1),
  // Square on to the gears' wall: the four gears turning, a plate under each.
  gears: shot(SQUARE.u - 1, SQUARE.y + 3, SQUARE.v - 5.6, SQUARE.u - 1, SQUARE.y + 2.4, SQUARE_PROPS.wall),
  // The bounty board and its three slips.
  bounty: shot(
    BOUNTY_BOARD.u - 2.2,
    BOUNTY.y + 2.6,
    BOUNTY_BOARD.v - 6,
    BOUNTY_BOARD.u,
    BOUNTY.y + 1.7,
    BOUNTY_BOARD.v,
  ),
  // Under the Bell Arch from the court: the twelve bells and their plates.
  bells: shot(COURT.u - 1, COURT.y + 2.2, COURT.v + 1.5, COURT.u, COURT.y + 3.9, COURT.v + COURT.halfV),
} as const;

/**
 * The chests the island places (spec §4): by the Bandstand, in the Wheel Works by its west wall, and
 * above the hot springs.
 */
const CHESTS: readonly ChestSpot[] = [
  { id: 'C7.1', u: BAND.u + 7.6, v: BAND.v + 2.6, face: [-1, -0.3] },
  { id: 'C7.2', u: WORKS.u - 11.6, v: WORKS.v + 8, face: [1, -0.4] },
  { id: 'C7.3', u: SPRINGS[2].u + 9.5, v: SPRINGS[2].v + 4.5, face: [-0.6, 1] },
];

/** The message bottles (the chapter's troubleshooting, B7.1-B7.5; B7.5 is the forged one). */
const BOTTLES: readonly BottleSpot[] = [
  { id: 'B7.1', u: -224, v: 18.6 },
  { id: 'B7.2', u: BOUNTY.u + 6.4, v: BOUNTY.v + 3.2 },
  { id: 'B7.3', u: -150, v: -110 },
  { id: 'B7.4', u: COURT.u + 8.6, v: COURT.v - 8 },
  { id: 'B7.5', u: COURT.u - 9.6, v: COURT.v + 2 },
];

/** Every chest and bottle id the island places (`IslandCode.chests`). */
export const TIDEWHEEL_CHEST_IDS = chestIds(CHESTS, BOTTLES);

export function createTidewheelContent(host: IslandContentHost): TidewheelContent {
  let ending: LongLight | null = null;
  return createFrameIslandContent<TidewheelWorld>(host, {
    id: 'tidewheel',
    prefix: 'tw',
    frame: FRAME_KIT,
    center: TIDEWHEEL.center,
    cast: TIDEWHEEL_NPCS,
    extras: tidewheelExtras,
    npcScript: TIDEWHEEL_QUESTS.npcScript,
    chests: CHESTS,
    bottles: BOTTLES,
    pieces(t) {
      // The drum song (puzzles/drum-song.json): the band plays the pattern by hand, night after night,
      // and it wanders; you pin it on the drum once, and the box plays it the same every time.
      const lyra = TIDEWHEEL_ANCHORS.lyra;
      t.cue('song', () =>
        playBandSong(t, {
          puzzle: 'drum-song',
          shot: SHOTS.song,
          at: { x: lyra.x, y: lyra.y + 1.2, z: lyra.z },
          first: ['hand', 'playHand'],
          // By hand: it starts well, then drags and thins.
          async falter(strum) {
            for (const [volume, gap] of [
              [0.8, 420],
              [0.7, 480],
              [0.5, 640],
              [0.35, 860],
            ] as const)
              await strum(volume, gap);
          },
          wrong: 'tired',
          fix: ['pin', 'pin', 'lever'],
          again: ['drum', 'playDrum'],
          right: 'steady',
        }),
      );
      // The four gears: the camera turns to the wall for its matching quiz (M7.1, the next step).
      t.lookCue('gears', SHOTS.gears);
      // The bounty board: the camera turns to its slips.
      t.lookCue('bounty', SHOTS.bounty);
      // The Bell Arch: the camera looks up at the twelve bells.
      t.lookCue('bells', SHOTS.bells, 1600);
      // The ending (spec §10): the Long Light, once, after the Seal.
      const longLight = createLongLight(host, {
        world: t.world,
        script: TIDEWHEEL_QUESTS.script,
        wait: t.wait,
      });
      ending = longLight;
      t.cue('ending', () => longLight.play());
      // The two circuits (spec §5) and the Seal.
      return {
        circuits: createTidewheelCircuits(host, t.circuitCard),
        kinds: ['lever', 'clock'],
        dispose: () => longLight.dispose(),
      };
    },
    // The clock ring's hour, the drum's pins and whether the Works run.
    debug: (circuits) => ({
      machine: () => (circuits as TidewheelCircuits).debug.machine(),
      /** Whether the ending is playing or has played, and how many of the chart's lights are lit. */
      ending: () => ending?.state() ?? null,
      /** Plays the ending now (it plays once a session). */
      playEnding: () => void ending?.play(),
    }),
  });
}

import { Vector3 } from 'three/webgpu';
import { puzzleOn } from '../../course/puzzles';
import { defaultShipName } from '../../learn/progress';
import type { LearnStore } from '../../learn/store';
import type { CoveScene } from '../../world/cove-scene';
import { COVE } from '../../world/layout';
import type { Brigantine } from '../../world/ship';
import type { FollowCamera } from '../follow-camera';
import type { NpcCrowd } from '../npcs';
import { createBard } from '../puzzles/bard';
import { createChristening } from '../puzzles/christening';
import { createCrane } from '../puzzles/crane';
import { createFirstWords } from '../puzzles/first-words';
import { createGearRack } from '../puzzles/gear-rack';
import { createPaintSails } from '../puzzles/paint-sails';
import { createSluice } from '../puzzles/sluice';
import type { Puzzle, PuzzleHost } from '../puzzles/types';

/** The christening's shot of the port bow name board, in ship-local space (+x is the pier side). */
const CHRISTEN_EYE = new Vector3(-7.2, 4.4, 4.6);
const CHRISTEN_AT = new Vector3(-1.6, 2.4, 10.6);

export interface HomePuzzlesHost {
  puzzleHost: PuzzleHost;
  ship: Brigantine;
  sites: CoveScene['sites'];
  /** Anchorage's cast: Nell christens the ship, and Lyra has the bard's hammock. */
  npcs: NpcCrowd;
  /** The scripts' cues: the christening and the gear rack's checks are two. */
  cues: Map<string, () => Promise<void>>;
  learn: LearnStore | null;
  cam: FollowCamera;
  /** The ship lies at Anchorage's berth with you on that island. */
  atHomeBerth(): boolean;
}

/**
 * Anchorage's puzzles (POC §4.5; the home island's content is the session's own): each registers its
 * own interactions and saves its own state. A course can turn one off (`"disabled": true` in its
 * puzzles/<name>.json): its site stays as scenery, and a cue that would start it does nothing.
 */
export function createHomePuzzles(host: HomePuzzlesHost): Puzzle[] {
  const { puzzleHost, ship, sites, npcs, cues, learn, cam } = host;
  const nell = npcs.list.find((n) => n.spec.id === 'nell');
  const bowXZ: number[] = [0, 0];
  const christening =
    nell && puzzleOn('christening')
      ? createChristening(puzzleHost, {
          ship,
          nell: {
            get x() {
              return nell.x;
            },
            get y() {
              return nell.y;
            },
            get z() {
              return nell.z;
            },
            face: (t) => (nell.faceTarget = t),
            moveTo: (spot) => npcs.moveTo(nell, spot),
          },
          spot: COVE.christening,
          bow: () => {
            ship.bowWorld(bowXZ);
            return { x: bowXZ[0]!, z: bowXZ[1]! };
          },
          shipName: () => learn?.progress.shipName ?? defaultShipName(null),
          frame: (shot) => cam.frame(shot),
          shot: () => {
            // Ship-local: over the pier, aft of the bow and up high, looking at the port bow name board.
            ship.group.updateMatrixWorld();
            const eye = ship.group.localToWorld(CHRISTEN_EYE.clone());
            const at = ship.group.localToWorld(CHRISTEN_AT.clone());
            return { x: eye.x, y: eye.y, z: eye.z, tx: at.x, ty: at.y, tz: at.z };
          },
        })
      : null;
  if (christening) cues.set('christen', christening.cue);
  else cues.set('christen', async () => {});
  const gearRack = puzzleOn('gear-rack') ? createGearRack(puzzleHost, sites.gear) : null;
  cues.set('gear-checks', async () => gearRack?.cue());
  const lyra = npcs.list.find((n) => n.spec.id === 'lyra');
  const puzzles: Puzzle[] = [
    ...(puzzleOn('palette') ? [createPaintSails(puzzleHost, sites.palette, ship)] : []),
    ...(puzzleOn('bard') ? [createBard(puzzleHost, sites.hammock, () => lyra?.talking ?? false)] : []),
    ...(puzzleOn('sluice') ? [createSluice(puzzleHost, sites.mill)] : []),
    ...(puzzleOn('crane') ? [createCrane(puzzleHost, sites.crane)] : []),
    ...(gearRack ? [gearRack] : []),
    ...(puzzleOn('first-words') ? [createFirstWords(puzzleHost, ship, host.atHomeBerth)] : []),
    ...(christening ? [christening] : []),
  ];
  return puzzles;
}

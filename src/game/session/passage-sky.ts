import type { Engine } from '../../engine/engine';
import { world as worldUniforms } from '../../engine/uniforms';
import type { IslandId } from '../arrivals';
import type { BattleRun } from '../battle-run';
import type { Hud } from '../hud';
import {
  ISLANDS,
  islandLight,
  nextMorningFrom,
  nightAtSea,
  nightAtSeaSeconds,
  NIGHT_AT_SEA,
  openIslands,
  otherLight,
  passageSky,
  type PassageHold,
} from '../islands';

/** How much further into the evening's light (0-1) you sail back before the morning's hold lets go. */
const TURN_BACK = 0.1;

export interface PassageSkyHost {
  clock: Engine['clock'];
  hud: Hud;
  /** The passage's sea battle, if one's on (the evening holds until it ends). */
  battle(): BattleRun | null;
}

/**
 * The light of a passage: it shifts from one island's time of day to the next's as you sail, and
 * out of an island's evening toward one whose light is the next morning, the night passes at sea
 * (spec ISLAND-03 O3).
 */
export type PassageSky = ReturnType<typeof createPassageSky>;

export function createPassageSky(host: PassageSkyHost) {
  const { clock, hud } = host;
  const sailSky = { hours: 0, azimuth: 0 };
  /**
   * A held passage sky (spec ISLAND-03 O3): out of an island's evening toward one whose light is the
   * next morning, the evening holds until the "next morning" cut, then the morning holds until you're
   * there. Null on every other passage.
   */
  let passageHold: PassageHold | null = null;
  let morningCut = false;
  /** The evening island's light where the morning came (a battle can end deep in it). */
  let eveningAt = 0;
  /** The night passing at sea (`nightAtSea`): seconds into it, and its two islands' light. */
  let nightPassing: { t: number; from: IslandId; to: IslandId } | null = null;
  /**
   * The "next morning": the night passes at sea under a dim dawn veil while the sun sets and rises
   * (no black frame); with reduced motion, a plain fade.
   */
  const nextMorning = async (): Promise<void> => {
    const hold = passageHold;
    if (!hold || morningCut || nextMorningFrom(hold.hold) !== hold.skip) return;
    morningCut = true;
    if (worldUniforms.reducedMotion.value <= 0.5) {
      nightPassing = { t: 0, from: hold.hold, to: hold.skip };
      return;
    }
    await hud.fade(true, 300);
    if (passageHold === hold) passageHold = { hold: hold.skip, skip: hold.hold };
    hud.toast('Next morning', 2.4);
    await hud.fade(false, 300);
    morningCut = false;
  };
  /** Ends the night at sea at once (you went ashore or travelled): the veil goes. */
  const endNightPassing = () => {
    if (!nightPassing) return;
    nightPassing = null;
    morningCut = false;
    hud.setDawn(0, '');
  };

  return {
    /** You've set sail from `island`: its evening holds if the next island's light is the next morning. */
    begin(island: IslandId): void {
      const morning = nextMorningFrom(island);
      passageHold = morning ? { hold: island, skip: morning } : null;
      eveningAt = 0;
    },
    /** You went ashore or travelled: no hold, and a night at sea ends at once. */
    end(): void {
      passageHold = null;
      endNightPassing();
    },
    /** Each frame under sail: the sky for where the ship is. */
    update(dt: number, pose: { x: number; z: number }): void {
      // The light shifts with the passage (the sky only refreshes once the sun has really moved).
      if (openIslands().length > 1) {
        if (passageHold && otherLight(passageHold, pose.x, pose.z)) passageHold = null;
        if (passageHold && !morningCut) {
          const ahead = islandLight(passageHold.skip, pose.x, pose.z);
          const here = islandLight(passageHold.hold, pose.x, pose.z);
          // The evening holds until the next island's light is the stronger; with a battle on the
          // passage, until the battle ends (its win card hands over to the night at sea). Then the
          // morning holds until you're there, or until you turn back into the evening's light past
          // where the morning came.
          const evening = nextMorningFrom(passageHold.hold) === passageHold.skip;
          const run = host.battle();
          if (evening && (run ? run.settled : ahead > 0 && ahead >= here)) {
            eveningAt = here;
            void nextMorning();
          } else if (!evening && (here >= 1 || (ahead > here && ahead > eveningAt + TURN_BACK)))
            passageHold = null;
        }
        passageSky(pose.x, pose.z, sailSky, passageHold);
        if (nightPassing) {
          const n = nightPassing;
          n.t += dt;
          const veil = nightAtSea(n.t, ISLANDS[n.from].sky, ISLANDS[n.to].sky, sailSky);
          hud.setDawn(veil, 'Next morning');
          // From daybreak on, the morning's light holds until you're there.
          if (n.t > NIGHT_AT_SEA.sink && passageHold?.hold === n.from)
            passageHold = { hold: n.to, skip: n.from };
          if (n.t >= nightAtSeaSeconds) {
            endNightPassing();
            // The morning exactly (the sky skips a change under a hundredth of an hour).
            clock.set(sailSky.hours, sailSky.azimuth);
          }
        }
        if (Math.abs(clock.hours - sailSky.hours) > 0.01 || Math.abs(clock.azimuth - sailSky.azimuth) > 0.3)
          clock.set(sailSky.hours, sailSky.azimuth);
      }
    },
  };
}

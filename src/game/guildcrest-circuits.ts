import { puzzleMaybe } from '../course/puzzles';
import { GUILDCREST_ANCHORS } from '../world/islands/guildcrest/anchors';
import type { GcShow } from '../world/islands/guildcrest/build';
import { CIRCUIT_SPOTS } from '../world/islands/guildcrest/circuit';
import type { GuildcrestWorld } from '../world/islands/guildcrest/index';
import { TOWER, toWorld } from '../world/islands/guildcrest/layout';
import type { ChoiceAsk } from './choice-card';
import type { IslandContentHost } from './island-code';
import { createIslandCircuits, type IslandCircuits } from './island-circuits';
import { guildcrestScript } from './guildcrest-quests';
import type { CircuitHost } from './puzzles/circuit/puzzle';

/**
 * Guildcrest's two circuits in the session (docs/specs/ISLAND-04-guildcrest.md §5): the Pattern Book
 * round the cloister (`book`) and the Journeyman's Toolbelt round the guildhall yard (`belt`), on the
 * shared stage (island-circuits.ts). Its own part (§5.4): the reading bell, the book's new page,
 * Rory's answer after the bench and his banner, and the Seal (§4.5): the abbey's bell rings, the
 * lamps answer and the mills' sails turn faster.
 */

type Kind = 'book' | 'belt';

export type GuildcrestCircuits = IslandCircuits<GuildcrestWorld, Kind, GcShow>;

export function createGuildcrestCircuits(
  host: IslandContentHost,
  o: { ask(a: ChoiceAsk): Promise<string>; card: CircuitHost['card'] },
): GuildcrestCircuits {
  /** Seconds the Seal's quick sails have left. */
  let fastSails = 0;

  return createIslandCircuits<'guildcrest', GuildcrestWorld, Kind, GcShow>(host, o, {
    island: 'guildcrest',
    puzzles: [
      ['pattern-book', 'book'],
      ['toolbelt', 'belt'],
    ],
    spots: CIRCUIT_SPOTS,
    cams: { book: GUILDCREST_ANCHORS.bookCam, belt: GUILDCREST_ANCHORS.beltCam },
    toWorld,
    script: guildcrestScript,
    tap: 'quill',
    // In the yard the camera's behind you and to your right (the yard is open); on the cloister's
    // walks it stands along the walk, under its roof, so the arcade's piers don't stand between it and
    // the wall the piece is on.
    shoulder: (kind) => (kind === 'book' ? [1.4, 4.6, 2.3] : [4.2, 2.2, 3.6]),
    station({ world, kind, at, event, where }, { reduced }) {
      if (kind === 'book') {
        if (at.place === 'bell' && event === 'pass') host.audio?.sfx.oneShot('gondola_bell', where, 0.8);
        if (at.place === 'desk' && event === 'open') host.audio?.sfx.oneShot('quill', where, 0.7);
        if (event === 'done') {
          host.audio?.sfx.oneShot('book_close', where, 0.9);
          // The copied book's new page lies open on its case.
          world.show('page', true);
        }
        return;
      }
      // The lap's close hires Rory: his banner unrolls on the roll board.
      if (event === 'done') world.show('rory', true, !reduced());
      // Rory's answer once he's read the code at the bench (the station's demo plays his question).
      if (at.place === 'bench' && event === 'pass') {
        const line = puzzleMaybe('toolbelt')?.lines?.benchAnswer;
        if (line) void host.say([line]);
      }
    },
    // What the save shows (spec W.2): the book's page, Rory's banner, the guilds' banners on the ridge.
    shows: [
      ['bookCopied', 'page'],
      ['journeymanHired', 'rory'],
    ],
    sealed: ['sealed', 'sealed'],
    /** The Seal's moment (§4.5): the bell rings, the lamps answer and the sails turn faster for 10 s. */
    async playSeal(w, { reduced, wait, cutTo, sealLamps, backToTalk }) {
      const r = reduced();
      // Off the terrace's east end, level with the belfry: the bell rings over the abbey.
      const t = toWorld(TOWER.u, TOWER.v);
      const e = toWorld(TOWER.u + 40, TOWER.v - 8);
      const belfry = (TOWER.belfry[0] + TOWER.belfry[1]) / 2;
      await cutTo({ x: e.x, y: belfry - 2, z: e.z, tx: t.x, ty: belfry - 6, tz: t.z });
      host.audio?.sfx.oneShot('abbey_bell', { x: t.x, y: TOWER.belfry[0], z: t.z }, 1);
      // The swifts burst from the belfry at the first stroke.
      w.swifts?.burst(5);
      await wait(r ? 1200 : 2600);
      sealLamps();
      w.setSailPace(r ? 0.25 : 3);
      // The guilds' banners unfurl by the mills (with reduced motion they're simply there).
      if (!r) w.show('sealed', false);
      w.show('sealed', true, !r);
      fastSails = 10;
      // Out over the ridge: the mills, the guildhall and the yard's lamps.
      const re = toWorld(60, 196);
      const rt = toWorld(130, 170);
      await cutTo({ x: re.x, y: 66, z: re.z, tx: rt.x, ty: 52, tz: rt.z }, 220);
      host.audio?.sfx.oneShot('stinger_triumph', host.player, 0.7);
      await wait(r ? 1200 : 2600);
      await backToTalk();
    },
    update(world, dt) {
      if (fastSails <= 0) return;
      fastSails -= dt;
      if (fastSails <= 0) world.setSailPace(host.reducedMotion() ? 0.25 : 1);
    },
    reset() {
      fastSails = 0;
    },
  });
}

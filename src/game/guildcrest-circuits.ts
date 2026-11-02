import { puzzleMaybe, puzzleOn, textOf } from '../course/puzzles';
import { GUILDCREST_ANCHORS } from '../world/islands/guildcrest/anchors';
import { CIRCUIT_SPOTS } from '../world/islands/guildcrest/circuit';
import type { GuildcrestWorld } from '../world/islands/guildcrest/index';
import { TOWER, toWorld } from '../world/islands/guildcrest/layout';
import type { LampLook } from '../world/village/lamp-set';
import type { ChoiceAsk } from './choice-card';
import type { CameraShot } from './follow-camera';
import type { IslandContentHost } from './island-code';
import { guildcrestScript } from './guildcrest-quests';
import { createCircuit, type CircuitHost, type CircuitStage } from './puzzles/circuit/puzzle';
import type { Lamp } from './puzzles/circuit/logic';
import type { Puzzle } from './puzzles/types';
import { storyHolds } from './story';

/**
 * Guildcrest's two circuits in the session (docs/specs/ISLAND-04-guildcrest.md §5): the Pattern Book
 * round the cloister (`book`) and the Journeyman's Toolbelt round the guildhall yard (`belt`) as
 * `circuit` puzzles, and their stage in the world (§5.4): where each station stands, its lamp, the
 * camera while it's open, the reading bell, Rory's answer after the bench, and the Seal (§4.5): the
 * abbey's bell rings, the lamps answer and the mills' sails turn faster. The stage reads only the
 * game's places and kinds, never a course id.
 */

type Kind = 'book' | 'belt';

/** The puzzles' names in the pack (the game's: `IslandEntry.puzzles`). */
const PUZZLES: readonly (readonly [string, Kind])[] = [
  ['pattern-book', 'book'],
  ['toolbelt', 'belt'],
];

export interface GuildcrestCircuits {
  /** Makes the circuits' puzzles on a streamed world (none if the course has them off). */
  create(world: GuildcrestWorld): Puzzle[];
  /** Lays the world out as the save says (the Seal's lamps). */
  settle(): void;
  update(dt: number): void;
  /** The circuit's cue: frames it and says what it is (`gc-book`, `gc-belt`). */
  cue(kind: Kind): Promise<void>;
  /** The Seal: the bell rings three times, the lamps answer and the sails turn faster. */
  seal(): Promise<void>;
  teardown(): void;
  readonly debug: {
    lamp(key: string): string | null;
    /** Whether the world shows the book's page, Rory's banner or the Seal's banners. */
    showing(what: 'page' | 'rory' | 'sealed'): boolean;
    /** Whether the Seal's moment is playing (tests catch it for a shot). */
    sealing(): boolean;
    /** Every station's spot (tests walk to each). */
    spots(): { id: string; x: number; y: number; z: number }[];
  };
}

export function createGuildcrestCircuits(
  host: IslandContentHost,
  o: {
    ask(a: ChoiceAsk): Promise<string>;
    card: CircuitHost['card'];
  },
): GuildcrestCircuits {
  let world: GuildcrestWorld | null = null;
  const reduced = () => host.reducedMotion();
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  /** Seconds the Seal's quick sails have left. */
  let fastSails = 0;
  let sealing = false;

  /**
   * A camera by where you stand, looking at the station's piece. In the yard it's behind you and to your
   * right (the yard is open); on the cloister's walks it stands along the walk, under its roof, so the
   * arcade's piers don't stand between it and the wall the piece is on.
   */
  function shotAt(
    kind: Kind,
    u: number,
    v: number,
    y: number,
    look: { u: number; y: number; v: number },
  ): CameraShot {
    const du = u - look.u;
    const dv = v - look.v;
    const d = Math.hypot(du, dv) || 1;
    const [back, side, up] = kind === 'book' ? [1.4, 4.6, 2.3] : [4.2, 2.2, 3.6];
    const e = toWorld(u + (du / d) * back - (dv / d) * side, v + (dv / d) * back + (du / d) * side);
    const t = toWorld(look.u, look.v);
    return { x: e.x, y: y + up, z: e.z, tx: t.x, ty: look.y, tz: t.z };
  }

  type Spot = ReturnType<CircuitStage['spot']>;
  const spotCache = new Map<string, Spot>();
  function spot(kind: Kind, place: string): Spot {
    const key = `${kind}:${place}`;
    let s = spotCache.get(key);
    if (s) return s;
    const sp = CIRCUIT_SPOTS[kind][place]!;
    const p = toWorld(sp.u, sp.v);
    const y = host.world.groundAt(p.x, p.z, sp.y + 1.5);
    s = { x: p.x, y, z: p.z, lamp: sp.lamp, shot: shotAt(kind, sp.u, sp.v, y, sp.look) };
    spotCache.set(key, s);
    return s;
  }
  const look = (l: Lamp | 'blink'): LampLook => (l === 'blink' ? 'running' : l);

  function stage(kind: Kind): CircuitStage {
    return {
      spot: (place) => spot(kind, place),
      lamp: (key, l) => world?.circuit.lamp(key, look(l)),
      station(at, event) {
        // The lap's end (`done`) has no place: its sound is where you stand.
        const s = CIRCUIT_SPOTS[kind][at.place] ? spot(kind, at.place) : host.player;
        if (kind === 'book' && at.place === 'bell' && event === 'pass')
          host.audio?.sfx.oneShot('gondola_bell', s, 0.8);
        if (kind === 'book' && at.place === 'desk' && event === 'open')
          host.audio?.sfx.oneShot('quill', s, 0.7);
        if (kind === 'book' && event === 'done') {
          host.audio?.sfx.oneShot('book_close', s, 0.9);
          // The copied book's new page lies open on its case.
          world?.show('page', true);
        }
        // The lap's close hires Rory: his banner unrolls on the roll board.
        if (kind === 'belt' && event === 'done') world?.show('rory', true, !reduced());
        // Rory's answer once he's read the code at the bench (the station's demo plays his question).
        if (kind === 'belt' && at.place === 'bench' && event === 'pass') {
          const line = puzzleMaybe('toolbelt')?.lines?.benchAnswer;
          if (line) void host.say([line]);
        }
      },
      settle: () => settle(),
    };
  }

  function settle(): void {
    if (!world) return;
    const q = host.puzzleHost.quests();
    // What the save shows (spec W.2): the book's page, Rory's banner, the guilds' banners on the ridge.
    // Only ever on (a lap's close shows its piece before its quest is through).
    if (storyHolds('guildcrest', 'bookCopied', q) && !world.showing('page')) world.show('page', true);
    if (storyHolds('guildcrest', 'journeymanHired', q) && !world.showing('rory')) world.show('rory', true);
    if (storyHolds('guildcrest', 'sealed', q)) {
      if (!world.showing('sealed') && !sealing) world.show('sealed', true);
      sealLamps();
    }
  }

  /** Every station's lamp lit (the Seal's, or after a reload once sealed). */
  function sealLamps(): void {
    for (const kind of ['book', 'belt'] as const)
      for (const place of Object.keys(CIRCUIT_SPOTS[kind])) world?.circuit.lamp(`${kind}:${place}`, 'ready');
  }

  /** The Seal's moment (§4.5): the bell rings, the lamps answer and the sails turn faster for 10 s. */
  async function playSeal(w: GuildcrestWorld): Promise<void> {
    const r = reduced();
    // Off the terrace's east end, level with the belfry: the bell rings over the abbey.
    const t = toWorld(TOWER.u, TOWER.v);
    const e = toWorld(TOWER.u + 40, TOWER.v - 8);
    const belfry = (TOWER.belfry[0] + TOWER.belfry[1]) / 2;
    const tower: CameraShot = { x: e.x, y: belfry - 2, z: e.z, tx: t.x, ty: belfry - 6, tz: t.z };
    // Out over the ridge: the mills, the guildhall and the yard's lamps.
    const re = toWorld(60, 196);
    const rt = toWorld(130, 170);
    const ridge: CameraShot = { x: re.x, y: 66, z: re.z, tx: rt.x, ty: 52, tz: rt.z };
    if (!r) {
      await host.fade(true, 260);
      host.cut(tower);
      await host.fade(false, 260);
    }
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
    if (!r) {
      await host.fade(true, 220);
      host.cut(ridge);
      await host.fade(false, 220);
    }
    host.audio?.sfx.oneShot('stinger_triumph', host.player, 0.7);
    await wait(r ? 1200 : 2600);
    if (!r) await host.fade(true, 260);
    host.backToTalk();
    if (!r) await host.fade(false, 260);
  }

  return {
    create(w) {
      world = w;
      spotCache.clear();
      const out: Puzzle[] = [];
      for (const [name, kind] of PUZZLES) {
        if (!puzzleOn(name)) continue;
        const ch: CircuitHost = {
          ...host.puzzleHost,
          ask: o.ask,
          card: o.card,
          say: host.say,
          frame: host.frame,
          reducedMotion: host.reducedMotion,
          sfx(k, at) {
            const id = (
              {
                tap: 'quill',
                ring: 'gondola_bell',
                seal: 'chime_solve',
                lamp: 'lever',
                wrong: 'hatch_clank',
              } as const
            )[k];
            host.audio?.sfx.oneShot(id, at, 0.7);
          },
          script: guildcrestScript,
          image(image, caption) {
            if (image) host.learn?.showImage(image, caption ?? null);
            else host.learn?.hideImage();
          },
          stage: stage(kind),
        };
        out.push(createCircuit(ch, name));
      }
      settle();
      return out;
    },
    settle,
    update(dt) {
      if (fastSails > 0) {
        fastSails -= dt;
        if (fastSails <= 0) world?.setSailPace(reduced() ? 0.25 : 1);
      }
    },
    async cue(kind) {
      const name = PUZZLES.find((p) => p[1] === kind)![0];
      const file = puzzleMaybe(name);
      if (!file || !world) return;
      const cam = kind === 'book' ? GUILDCREST_ANCHORS.bookCam : GUILDCREST_ANCHORS.beltCam;
      host.frame({ x: cam.x, y: cam.y, z: cam.z, tx: cam.target.x, ty: cam.target.y, tz: cam.target.z });
      await host.text(textOf(file, 'title'), textOf(file, 'intro'));
      host.backToTalk();
    },
    async seal() {
      if (!world) return;
      sealing = true;
      try {
        await playSeal(world);
      } finally {
        sealing = false;
      }
    },
    debug: {
      sealing: () => sealing,
      showing: (what) => world?.showing(what) ?? false,
      lamp: (key) => world?.circuit.look(key) ?? null,
      spots: () => {
        const out: { id: string; x: number; y: number; z: number }[] = [];
        for (const kind of ['book', 'belt'] as const)
          for (const place of Object.keys(CIRCUIT_SPOTS[kind])) {
            const s = spot(kind, place);
            out.push({ id: `${kind}:${place}`, x: s.x, y: s.y, z: s.z });
          }
        return out;
      },
    },
    teardown() {
      world = null;
      fastSails = 0;
      spotCache.clear();
    },
  };
}

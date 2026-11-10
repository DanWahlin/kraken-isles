import type { Camera, Vector3 } from 'three/webgpu';
import { COURSE, islandHooks, welcomeLines as courseWelcome } from '../../course/catalog';
import type { Input } from '../../engine/input';
import { HOME_ISLAND } from '../../islands/registry';
import type { LearnStore } from '../../learn/store';
import type { Character } from '../../world/characters';
import type { FlightView } from '../../world/characters/parrot-flight';
import type { Dialogue } from '../dialogue';
import type { CameraShot, FollowCamera } from '../follow-camera';
import type { Hud } from '../hud';
import { TIP_SPOTS } from '../island-tips';
import type { PlayerController } from '../player-controller';
import { storyHolds } from '../story';
import type { SessionStatus } from './types';
import type { Wingman } from './wingman';

/** How long Wingman's framed welcome holds before moving can cut it short. */
const INTRO_HOLD_MS = 1600;

export interface WelcomeHost {
  status: SessionStatus;
  hud: Hud;
  input: Input;
  learn: LearnStore | null;
  hero: Character;
  cam: FollowCamera;
  camera: Camera;
  player: PlayerController;
  dialogue: Dialogue;
  wing: Wingman;
  quests(): Record<string, string>;
  /** A sea battle's on (a learning pause waits). */
  battling(): boolean;
  /** No opening welcome (screenshots, tests, a Continue). */
  quiet: boolean;
  /** A Continue: the "where you left off" card and a recap are due at the first quiet moment. */
  resume: boolean;
}

/**
 * Wingman's welcome to an island (he flies up in front of the captain to talk, and points out the
 * task list, the compass and the starfish), and the learning systems' pauses at a natural break
 * ashore: the "where you left off" card on Continue, then his spaced recap (src/learn/recap.ts).
 */
export type Welcome = ReturnType<typeof createWelcome>;

export function createWelcome(host: WelcomeHost) {
  const { status, hud, input, learn, hero, cam, player, dialogue, wing, quests } = host;
  const wingman = wing.flight;
  const flightView = wing.view;
  /** Seconds until the welcome plays (-1: not waiting; an arrival flight holds it, then plays it itself). */
  let hintTimer = host.quiet ? -1 : 2.2;
  /** Ends Wingman's framed welcome early when the player moves (null when it isn't running). */
  let introCut: (() => void) | null = null;
  // A fresh voyage (Nell not met yet) gets Wingman's welcome and the first step; later sessions a
  // short welcome back.
  // Every island's first welcome points out the task list, the compass and its starfish.
  // The lines are the course's (`course.json` → `hooks.islands`): an island's landing lines (Juno's
  // first look at Thousand-Bough), then Wingman's welcome with the island's tips.
  const firstWelcome = (i: string) => [...(islandHooks(i).landing ?? []), ...courseWelcome(i)];
  const welcomeLines = (): string[] =>
    storyHolds(status.island, 'firstVisit', quests())
      ? firstWelcome(status.island)
      : status.island === HOME_ISLAND
        ? [...(islandHooks(status.island).welcomeBack ?? [])]
        : [];
  /** Wingman's welcome is on: the task list and compass stay up so he can point them out. */
  let welcoming = false;
  const spotlightTip = (id: string | null) => {
    const spots = (id && TIP_SPOTS[id]) || [];
    hud.setCompassSpot(spots.includes('compass'));
    learn?.setSpotlight(spots.includes('tracker'), spots.includes('starfish'));
  };
  /**
   * Wingman flies up in front of the captain to talk, and heads back to the shoulder on his last
   * line. The first time, the captain holds still and the camera frames him over their shoulder;
   * moving (after a moment to see who's talking) sends him back early while he keeps talking.
   */
  async function welcome(): Promise<void> {
    const lines = welcomeLines();
    if (!lines.length || welcomeRunning) return;
    welcomeRunning = true;
    try {
      await playWelcome(lines);
    } finally {
      welcomeRunning = false;
    }
  }
  /** The whole welcome is on (Juno's look at the tree, the pause while Wingman takes off, his lines). */
  let welcomeRunning = false;
  // The learning systems' pauses, at a natural break once you're ashore and nothing else is on: the
  // "where you left off" card on Continue, then Wingman's spaced recap (src/learn/recap.ts), which
  // also follows a landfall (from the other islands' chapters).
  let pendingResume = host.resume;
  /** A recap to offer: `null` none, `''` from every chapter, or a chapter to leave out (where you landed). */
  let pendingRecap: string | null = host.resume ? '' : null;
  let learningIdle = 0;
  let learningRunning = false;
  async function runLearningPause(): Promise<void> {
    if (!learn || learningRunning) return;
    learningRunning = true;
    try {
      if (pendingResume) {
        pendingResume = false;
        const summary = learn.resumeSummary();
        if (summary) await learn.showResume(summary);
        // The card's "Open the checklist" opens the Logbook: the recap waits until it's closed.
        await learn.logbookClosed();
      }
      if (pendingRecap !== null && !status.disposed) {
        const except = pendingRecap || null;
        pendingRecap = null;
        const ids = learn.recapDue(except);
        if (ids.length) await learn.runRecap(ids);
      }
    } finally {
      learningRunning = false;
      learningIdle = 0;
    }
  }
  const islandChapterOf = (id: string) => COURSE.islands.find((i) => i.island === id)?.chapter ?? '';
  async function playWelcome(lines: string[]): Promise<void> {
    // An island's landing lines (Juno's first look at Thousand-Bough's great tree) play over its
    // landmark, framed from over the captain's shoulder (the arrival's last hold), before Wingman flies up.
    const landing = islandHooks(status.island).landing ?? [];
    if (landing.length && lines[0] === landing[0] && status.mode === 'walk') {
      input.enabled = false;
      hero.setSpeed(0);
      cam.frame(status.berth.arrival.landingShot ?? null);
      await dialogue.play([lines[0]]);
      cam.frame(null);
      input.enabled = !status.paused;
      if (status.disposed) return;
      lines = lines.slice(1);
    }
    const framed = !!wingman && status.mode === 'walk' && lines.length > 1;
    if (wingman) {
      flightView.ahead = framed ? { x: Math.sin(player.heading), z: Math.cos(player.heading) } : null;
      wing.takeOff();
    }
    let held = framed;
    const release = () => {
      if (!held) return;
      held = false;
      introCut = null;
      cam.frame(null);
      input.enabled = !status.paused;
    };
    if (framed && wingman) {
      input.enabled = false;
      hero.setSpeed(0);
      cam.frame(wingmanShot(wingman.hoverAt(flightView as FlightView)));
      const from = performance.now();
      introCut = () => {
        if (performance.now() - from < INTRO_HOLD_MS) return;
        wingman?.land();
        release();
      };
    }
    welcoming = true;
    await new Promise((r) => setTimeout(r, wingman ? 350 : 0));
    if (status.disposed) return;
    const last = lines.length > 1 ? lines[lines.length - 1] : null;
    await dialogue.play(lines, (id) => {
      spotlightTip(id);
      if (id !== last) return;
      wingman?.land();
      release();
    });
    welcoming = false;
    spotlightTip(null);
    wingman?.land();
    release();
    flightView.ahead = null;
  }
  /** Over the captain's shoulder (the one away from the parrot), on Wingman hovering ahead. */
  function wingmanShot(hover: Vector3): CameraShot {
    const ax = Math.sin(player.heading);
    const az = Math.cos(player.heading);
    // Screen-right of the view ahead is (-az, ax); the camera sits across from the parrot.
    const side = Math.sign((hover.x - player.x) * -az + (hover.z - player.z) * ax) || 1;
    const headY = player.y + hero.capsule.height;
    // A three-quarter view from behind: the captain on one side of the frame, Wingman on the other.
    const chestY = headY - 0.35;
    return {
      x: player.x - ax * 4.3 + az * side * 1.2,
      y: headY + 0.5,
      z: player.z - az * 4.3 - ax * side * 1.2,
      tx: player.x + (hover.x - player.x) * 0.5,
      ty: chestY + (hover.y - chestY) * 0.45,
      tz: player.z + (hover.z - player.z) * 0.5,
    };
  }

  /** Each frame while you play: the opening welcome's wait, a learning pause's quiet moment, a cut. */
  function update(dt: number, stirring: boolean, arriving: boolean): void {
    if (hintTimer > 0 && (hintTimer -= dt) <= 0 && !dialogue.active) void welcome();
    // A learning pause waits for a quiet moment ashore (no talk, script, welcome or battle).
    if (
      (pendingResume || pendingRecap !== null) &&
      status.mode === 'walk' &&
      !arriving &&
      !dialogue.active &&
      !status.scripting &&
      !welcomeRunning &&
      !status.overlayModal &&
      !host.battling() &&
      hintTimer <= 0
    ) {
      learningIdle += dt;
      if (learningIdle > 1.2 && !learningRunning) void runLearningPause();
    } else learningIdle = 0;
    if (introCut && stirring) introCut();
  }

  return {
    /** The lines Wingman has for the island you're on now (none on a later visit away from home). */
    lines: welcomeLines,
    /** Plays the welcome (the flight and his lines). */
    run: welcome,
    /** The whole welcome is on (Juno's look at the tree, the pause while Wingman takes off, his lines). */
    get running(): boolean {
      return welcomeRunning;
    },
    /** His lines are playing: the task list and compass stay up so he can point them out. */
    get pointing(): boolean {
      return welcoming;
    },
    update,
    /** Something else has the screen first (an arrival flight): the opening welcome doesn't play on its own. */
    hold(): void {
      hintTimer = -1;
    },
    /** The welcome plays after this many seconds. */
    soon(seconds: number): void {
      hintTimer = seconds;
    },
    /** A landfall on the island `id`: a recap's due from the other islands' chapters. */
    landed(id: string): void {
      pendingRecap = islandChapterOf(id) || '';
    },
    /**
     * Queues a learning pause for the next quiet moment ashore: the "where you left off" card
     * (`resume`), Wingman's recap (`recap`, leaving out `except`'s chapter), or both.
     */
    queue(what: { resume?: boolean; recap?: boolean; except?: string }): void {
      if (what.resume) pendingResume = true;
      if (what.recap) pendingRecap = what.except ? islandChapterOf(what.except) : '';
    },
  };
}

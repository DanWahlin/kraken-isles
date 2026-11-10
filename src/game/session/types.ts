import type { IslesAudio } from '../../audio';
import type { Engine } from '../../engine/engine';
import type { Input } from '../../engine/input';
import type { LearnStore } from '../../learn/store';
import type { CharacterLibrary, PlayerBody } from '../../world/characters';
import type { CoveScene } from '../../world/cove-scene';
import type { IslandId } from '../arrivals';
import type { BattleRun } from '../battle-run';
import type { CollisionWorld } from '../collision';
import type { CameraShot, FollowCamera } from '../follow-camera';
import type { Hud } from '../hud';
import type { IslandSetup } from '../island-code';
import type { IslandBerth } from '../islands';
import type { LighthouseDirection } from '../lighthouse-transit';
import type { NpcCrowd } from '../npcs';
import type { PlayerController } from '../player-controller';
import type { Puzzle } from '../puzzles/types';

/** Who has the controls: the walker, the helm, the crew bringing her alongside, or a fade between. */
export type SessionMode = 'walk' | 'sail' | 'docking' | 'transition';
/** The islands that come and go from memory (the streamed ones, and Anchorage, which goes dormant). */
export type StreamedIsland = IslandId;
export type { IslandSetup };
/** A first landfall: waiting for the game to show, flying in (or, with reduced motion, just the title card), then done. */
export type ArrivalPhase = 'waiting' | 'flying' | 'card' | 'done';

/**
 * What the parts of a session (src/game/session/) may ask about the whole: who has the controls and
 * where you are. Read-only: the session itself changes these, and a part that must (Unstuck's hop is
 * a transition) is handed the one setter it needs.
 */
export interface SessionStatus {
  readonly mode: SessionMode;
  /** The island you're on, or whose berth the ship lies at while you sail. */
  readonly island: IslandId;
  readonly berth: IslandBerth;
  /** A menu is open: the player, helm and prompts are frozen (the world keeps living). */
  readonly paused: boolean;
  /** The session has ended: anything still waiting on a fade or a line stops there. */
  readonly disposed: boolean;
  /** A quest beat or a puzzle's script is playing. */
  readonly scripting: boolean;
  /** A puzzle overlay (the Gate Board, the Flag Hoist, a market counter) has the keys and the camera. */
  readonly overlayModal: boolean;
  /** The crew has the wheel (the Three Helms): your helm input and the dock key are ignored. */
  readonly crewAtHelm: boolean;
}

export interface SessionOptions {
  engine: Engine;
  cove: CoveScene;
  characters: CharacterLibrary;
  input: Input;
  hudParent: HTMLElement;
  audio: IslesAudio | null;
  body: PlayerBody;
  variant?: number;
  voiceManifest?: string;
  /** Skips the opening Wingman hint (screenshots, tests). */
  quiet?: boolean;
  /** A first landfall flies the short arrival that follows the opening's dive into the chart. */
  fromChart?: boolean;
  /** Where to start (Continue); defaults to the quay spawn. */
  start?: { x: number; z: number; heading: number };
  /** Esc / Start and M / Back while playing. */
  onMenu?: () => void;
  onChart?: () => void;
  /** Quizzes, spyglass, chests, and the Logbook (the session freezes while one is open). */
  learn?: LearnStore | null;
  /**
   * A Continue: once the player's ashore and nothing else is on, the "where you left off" card, then
   * Wingman's recap if one's due.
   */
  resume?: boolean;
  /** Sea battles already fought or skipped (from the save). */
  battles?: readonly string[];
  /** A sea battle was won or skipped (save it now). */
  onBattle?: (id: string, how: 'won' | 'skipped') => void;
}

export interface GameSession {
  readonly mode: SessionMode;
  readonly player: PlayerController;
  readonly hud: Hud;
  readonly world: CollisionWorld;
  readonly camera: FollowCamera;
  readonly npcs: NpcCrowd;
  /** The island you're on, or whose berth the ship lies at while you sail. */
  readonly island: IslandId;
  /** Freezes the player, helm, and HUD prompts while menus are open (the world keeps living). */
  setPaused(on: boolean): void;
  /**
   * Puts a wedged captain back on the nearest point of the island's routes, or warps the ship off
   * into open water (the pause menu's Unstuck). False when there's nothing to do (a battle, a ride).
   */
  unstuck(): boolean;
  /** The game's on screen (the loading card has gone): a first landfall's flyover takes off. */
  begin(): void;
  /** Seconds until the arrival flyover reaches the captain (0 when there's none, or it's done). */
  arrivalLeft(): number;
  /**
   * Loading: steps the camera along a pending flyover, calling `step` at each view (render a frame,
   * compile), so everything it'll see is built behind the loading card rather than mid-flight.
   */
  warmArrival(step: () => Promise<void>): Promise<void>;
  /**
   * A streamed island's cast, chests and sites (their groups), once its world has streamed in and
   * they've joined the scene: unwarmed and hidden, so nothing draws them before they're built.
   * Whoever warms them calls `reveal` after (the flow, with the island). Pending until the island
   * loads.
   */
  islandSetup(id: StreamedIsland): Promise<IslandSetup>;
  /**
   * Hears each time an island's cast, chests and sites join the scene: the first visit, and each
   * time it streams in again after it was freed. Hidden and unwarmed until the listener calls `reveal`.
   */
  onIslandSetup(fn: (id: StreamedIsland, setup: IslandSetup) => void): () => void;
  /** The islands whose content is in the scene now, and which setup (1, 2, …) it is. */
  islandSetups(): { id: StreamedIsland; setup: IslandSetup; gen: number }[];
  /** How many times an island's content has been set up this voyage (0: never). */
  islandSetupGen(id: StreamedIsland): number;
  /** Fast travel: docks the ship if you're sailing, then puts you at (x, z). */
  travel(x: number, z: number, heading: number): Promise<void>;
  /** An open island's quay by the berth (the chart's "Travel here"), or null if it isn't open. */
  islandQuay(id: string): { x: number; z: number; heading: number; label: string } | null;
  /** Player or ship position for the chart and saves, and the island's name. */
  where(): { x: number; z: number; heading: number; onShip: boolean; place: string };
  /** The passage's sea battle (docs/specs/BATTLES.md): whether one's on, Skip battle, and what's done. */
  readonly battle: {
    readonly active: boolean;
    skip(): void;
    done(): string[];
  };
  /** Dev/test hooks. */
  readonly debug: {
    /** The starfish to collect (tests). */
    starfish(): { id: string; island: string; x: number; z: number; y?: number }[];
    /** `y` picks the level where walk surfaces stack (the lighthouse stair). */
    teleport(x: number, z: number, heading?: number, y?: number): void;
    board(): Promise<void>;
    dock(): void;
    state(): Record<string, unknown>;
    /** Chest positions and facings (tests). */
    chests(): { id: string; x: number; z: number; h: number; opened: boolean }[];
    /** The message bottles and whether each has been read (tests). */
    bottles(): { id: string; x: number; z: number; read: boolean }[];
    /** A puzzle's test hooks (state, solve, …) by id, e.g. 'P0.1'. */
    puzzle(id: string): Puzzle['debug'] | null;
    /** The streamed islands' cast where they stand (tests), empty until an island's up. */
    cast(): { id: string; name: string; x: number; y: number; z: number; h: number; ground: number }[];
    /** The lift's two landings (tests), null until the town's up. */
    liftSpots(): {
      bottom: { x: number; z: number; h: number };
      top: { x: number; z: number; h: number };
    } | null;
    /** Starts a conversation with an NPC wherever you're standing (tests: carry on past an unreachable one). */
    talk(id: string): boolean;
    /** Where to stand to read each island's course notice board, facing it (tests). */
    courseBoards(): { island: IslandId; x: number; y: number; z: number; heading: number }[];
    /** Interactions within `r` metres of (x, z), their reach, and whether each is usable now (tests). */
    near(
      x: number,
      z: number,
      r: number,
    ): { id: string; x: number; y: number; z: number; d: number; radius: number; on: boolean }[];
    /** The lift's raw anchors (tests: tx/ty/tz are the car's ends). */
    liftAnchors(): { liftBottom: unknown; liftTop: unknown };
    /** The lift ride's camera spot and how many of its samples are blocked (tests). */
    liftCamera(): { x: number; y: number; z: number; blocked: number } | null;
    /** Whether Rhea's aboard for the Three Helms, and whether the lighthouse is lit (tests). */
    rheaAboard(): boolean;
    lighthouseLit(): boolean;
    /** Whether Anchorage's point lighthouse is lit (tests). */
    anchorageLighthouseLit(): boolean;
    /** The lighthouse fast-forward under way ('up', 'down') or null (tests). */
    lighthouseTransit(): LighthouseDirection | null;
    /** Moves the ship while you're sailing (tests: skip the passage between islands). */
    sailTo(x: number, z: number, heading: number): void;
    /** Sets a quest step, e.g. to lower the gangway without playing the island (tests). */
    quest(id: string, step: string): void;
    /** Holds the camera on a shot (tests' stills), or hands it back to the follow camera (null). */
    shot(shot: CameraShot | null): void;
    /** The live sea (Settings → Sea state), and whether a battle or course holds it fixed. */
    sea(): { chosen: string; fixed: boolean; settled: boolean; windSpeed: number; amp: number[] };
    /** Whether the gangway's down, and its world-space foot and top (tests). */
    gangway(): {
      down: boolean;
      foot: { x: number; y: number; z: number };
      top: { x: number; y: number; z: number };
    };
    /** A streamed island's content hooks (tests: Thousand-Bough's board, hoist and basket), by island id. */
    island(id: string): Record<string, (...args: never[]) => unknown> | null;
    /** Presses Wingman's hint key. */
    hint(): void;
    /** Plays Wingman's welcome (the flight and his lines). */
    welcome(): Promise<void>;
    /**
     * Queues a learning pause for the next quiet moment ashore: the "where you left off" card
     * (`resume`), Wingman's recap (`recap`, leaving out `except`'s chapter), or both.
     */
    learningPause(what: { resume?: boolean; recap?: boolean; except?: string }): void;
    /** Wingman's flight phase, position and the way his body faces (yaw, rad; tests). */
    wingman(): { phase: string; x: number; y: number; z: number; yaw: number } | null;
    /** The arrival flyover's phase and seconds in (tests). */
    arrival(): { island: string; phase: ArrivalPhase; time: number; eye: number } | null;
    /** Plays an island's arrival flyover again (tests, screenshots); `fromChart`: the short one. */
    flyover(island?: IslandId, fromChart?: boolean): void;
    /** Holds the flyover at `time` seconds in (null lets it fly on). */
    holdArrival(time: number | null): void;
    /** Skips the arrival flyover, as E would. */
    skipArrival(): void;
    /** The passage battle's run once it's built (tests: its Battle, HUD and camera director). */
    battleRun(): BattleRun | null;
    /** The kraken's distant sightings (null until they've loaded), and whether one may show now. */
    sightings(): { system: CoveScene['sightings']; allowed: boolean };
    /**
     * Which islands are in memory (tests, the memory gate): each streamed island's state, and
     * `settled` once every island you've left is freed and every one you need is in.
     */
    residency(): {
      resident: string[];
      states: Record<string, string>;
      settled: boolean;
    };
    /** Frees (or streams in) an island now, whatever the residency rules say (tests, screenshots). */
    unloadIsland(id: StreamedIsland): Promise<void>;
    /**
     * Keeps every island in memory that is (nothing's freed) while on, as if the world were busy
     * (tests: measure an island you've arrived at with the last one still resident).
     */
    keepResident(on: boolean): void;
    loadIsland(id: StreamedIsland): Promise<void>;
  };
  dispose(): void;
}

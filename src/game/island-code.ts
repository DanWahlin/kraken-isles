import type { Object3D, PerspectiveCamera } from 'three/webgpu';
import type { IslesAudio } from '../audio';
import type { QuestTarget } from '../course/pack';
import type { InputState } from '../engine/input';
import type { TierSettings } from '../engine/quality';
import type { ChartLabelId } from '../learn/content/labels';
import type { LearnStore } from '../learn/store';
import type { Character, CharacterLibrary } from '../world/characters';
import type { CoveScene } from '../world/cove-scene';
import type { CircleObstacle } from '../world/contracts';
import type { FarCull } from '../world/far-cull';
import type { IslandStream, IslandStreamFactory } from '../world/islands/island-stream';
import type { Brigantine } from '../world/ship';
import type { IslandWays } from '../world/islands/waypoints';
import type { VillageAnchor } from '../world/village/kit';
import type { MarketStallLayout } from '../world/market-stall/layout';
import type { CollisionWorld, InlandWater, WalkBox, WalkSurface } from './collision';
import type { CameraShot, FollowCamera } from './follow-camera';
import type { Interactions } from './interaction';
import type { Npc } from './npcs';
import type { HelmsHost } from './puzzles/three-helms';
import type { Puzzle, PuzzleHost } from './puzzles/types';
import type { QuestTracker } from './quest-list';
import type { ScriptStep } from './script';
import type { QuestState } from './story';

/**
 * An island's code (its package's index, `IslandEntry.code`), loaded with the voyage as a chunk of
 * its own: its stream (the world: terrain, town or village, plants), its quest line, how the walker
 * meets its world, and its content on the island (cast, chests, sites, puzzles and set pieces). The
 * world (src/world/cove-scene.ts) and the session (src/game/session.ts) run every island through
 * this, so neither names one. `W` is the island's own world (what its stream builds and its content
 * is set up on): an island's code names it once, and the shared systems read it as `unknown`.
 */
export interface IslandCode<W = unknown> {
  /** A streamed island's stream maker (the home island is built with the world instead). */
  stream?: IslandStreamFactory<W>;
  quests: IslandQuests;
  /** How the walker meets the island's world: its walk surfaces, standing colliders and wading water. */
  walk?(ctx: IslandWalkContext<W>): IslandWalk;
  /** The island's content in the session (a streamed island); the home island's is the session's own. */
  content?(host: IslandContentHost<W>): IslandContent<W>;
  /** Its routes for the compass, the crew and Unstuck: its walking graph ashore and its waters. */
  ways: IslandWays;
  /** The chests and message bottles the island places (their ids; what's in them is the course's). */
  chests: readonly string[];
  /**
   * Every NPC that can appear on the island (its cast and every extra, on stand-in `anchors`): the
   * ids a course pack can give barks and beats to (tools/content/check.ts).
   */
  cast(anchors: Readonly<Record<string, { x: number; z: number }>>): readonly { id: string }[];
}

/** An island's quest line as the session reads it (its `quests/<island>.json`, through the course pack). */
export interface IslandQuests {
  /** The Logbook's quest log rows. */
  log(q: QuestState): { id: string; title: string; detail: string; done: boolean }[];
  /** The on-screen task list while you're on the island. */
  tracker(q: QuestState): QuestTracker;
  /** Where the compass's gold marker points ashore, or null. */
  target(q: QuestState): QuestTarget | null;
  /** The main quest you're on, or null once the island's main quests are done (then: your ship). */
  current(q: QuestState): unknown;
  /** Where the dimmer markers point (optional quests you've started). */
  optionalTargets(q: QuestState): readonly QuestTarget[];
  /** The task Wingman's hint key talks about when no puzzle is engaged. */
  hintTask(q: QuestState): { detail?: string } | undefined;
  /**
   * Whether the compass sends you here from the island before once you're aboard (that island's
   * part is done). Without it, only while you're on this island.
   */
  sailHere?(q: QuestState): boolean;
}

/** What an island's `walk` gets: its stream, the tier, and its content once it's made. */
export interface IslandWalkContext<W = unknown> {
  stream: IslandStream<W> | null;
  tier: TierSettings;
  content(): IslandContent<W> | null;
}

/** The island's part of the session's collision world (src/game/collision.ts). */
export interface IslandWalk {
  surfaces: WalkSurface[];
  /**
   * Where its surfaces and water can be (its bake): the collision world skips them outside it (each
   * surface without a `box` of its own takes this one), so an island far off costs the queries nothing.
   */
  box?: WalkBox;
  /** Colliders that stand from the start (they're data, not the streamed world). */
  circles?: readonly CircleObstacle[];
  /** Its pools and streams as they're drawn on this tier: wade the shallows, the deep middle stops you. */
  inland?(x: number, z: number, ground: number, out: InlandWater): boolean;
}

/** An island's cast, chests and sites, hidden until whoever warms them calls `reveal`. */
export interface IslandSetup {
  roots: Object3D[];
  reveal(): void;
}

/**
 * What every island's content may use of the session: the walker, the camera, talk and its shots,
 * the HUD's fades, chests, puzzles and cues. A content that needs no more than this (and its tests'
 * stand-in host) takes this; `IslandContentHost` adds the island's stream, the ship and rides.
 */
export interface IslandSessionHost {
  characters: CharacterLibrary;
  tier: TierSettings;
  camera: PerspectiveCamera;
  scene: { add(o: Object3D): void };
  world: CollisionWorld;
  detail: FarCull;
  learn: LearnStore | null;
  audio: IslesAudio | null;
  interactions: Interactions;
  puzzleHost: PuzzleHost;
  /** The player's feet (walk mode). */
  player: { readonly x: number; readonly y: number; readonly z: number };
  walking(): boolean;
  say(ids: readonly string[]): Promise<void>;
  /** An unvoiced line (a keeper's reasons, Wingman's hints). */
  text(speaker: string, line: string): Promise<void>;
  frame(shot: CameraShot | null): void;
  cut(shot: CameraShot): void;
  fade(on: boolean, ms?: number): Promise<void>;
  /** Back to the open conversation's shot (after a cutaway). */
  backToTalk(): void;
  /** Puts the walker somewhere, facing `heading`, with the camera behind. */
  place(x: number, z: number, heading: number, y?: number): void;
  /** A board or a hoist owns the keys and camera. */
  setModal(on: boolean): void;
  reducedMotion(): boolean;
  /** A puzzle's chart label (docs/specs/LOWER-THIRDS.md): shows the first time in a save. */
  label(id: ChartLabelId): void;
  addNpcTalk(n: Npc): void;
  /** A treasure chest at a spot (the session's chests, saved and opened like the others). */
  placeChest(id: string, x: number, y: number, z: number, heading: number, detail: FarCull): Object3D | null;
  /** Takes chests away again (the island is being freed; whether each is open is in the save). */
  removeChests(ids: readonly string[]): void;
  openChest(id: string): Promise<void>;
  cues: Map<string, () => Promise<void>>;
  puzzles: Puzzle[];
  /**
   * The sky's clock, for a set piece that moves the day (the ending's nightfall): the hour now, a
   * jump to another, and `home`, which puts the island's own hour back.
   */
  sky: { hours(): number; set(hours: number): void; home(): void };
  /** Where a set piece's own overlay goes: over the world and the HUD, under the fade. */
  overlay: HTMLElement;
}

/**
 * The session's side of an island's content: what the content may use and do (the walker, the
 * camera, the HUD's fades, chests, puzzles, cues). The content keeps what it adds (colliders,
 * interactions, puzzles, chests) and takes it out again in `teardown`.
 */
export interface IslandContentHost<W = unknown> extends IslandSessionHost {
  /** The island's own stream (its world, once streamed). */
  stream: IslandStream<W>;
  /** The walker (where the captain stands and faces). */
  player: { readonly x: number; readonly y: number; readonly z: number; readonly heading: number };
  cove: CoveScene;
  ship: Brigantine;
  /** The follow camera (a ride's camera) and the captain's figure. */
  cam: FollowCamera;
  hero: Character;
  /** True once the session has ended. */
  disposed(): boolean;
  /** A quest script (a scripted beat) is running. */
  scripting(): boolean;
  /** Puts the walker somewhere without moving the camera. */
  placePlayer(x: number, z: number, heading: number): void;
  /** A treasure chest beside an NPC (metres to their right, `back` behind). */
  placeChestBy(c: { id: string; side: number; back: number }, n: Npc, detail: FarCull): Object3D;
  /** A ride (a lift) takes the walker: no walking, no prompt. `endRide` gives the walk back. */
  beginRide(): void;
  endRide(): void;
  /** A Seal's lamp lighting: cut to `shot`, `light` it to a stinger, then cut back to the talk. */
  showLighting(shot: CameraShot, light: () => void): Promise<void>;
  /** The open conversation's camera shot, if one is open. */
  talkShot(): CameraShot | null;
  /** The ship for a puzzle at sea (the Three Helms): the crew's helm, the lanes, and docking home. */
  sea: Omit<HelmsHost, keyof PuzzleHost | 'frame' | 'say'>;
}

/** An island's content in the session (Port Meridian's town life, Thousand-Bough's tree village). */
export interface IslandContent<W = unknown> {
  readonly npcs: readonly Npc[];
  /** Whether an NPC is one of the island's cast (its scripts are the island's). */
  owns(npc: string): boolean;
  /** The scripted beat the island's NPC offers now, or null. */
  script(npc: string): { steps: readonly ScriptStep[] } | null;
  /**
   * Builds the cast, chests and sites on the island's streamed world (hidden until `reveal`), or
   * null when there's nothing to add (the world went again, or the session ended).
   */
  setup(world: W): Promise<IslandSetup | null>;
  /** The island's Model Market stall (its lettering goes on this anchor), if it has one. */
  market?(world: W): { at: VillageAnchor; layout: MarketStallLayout } | null;
  /**
   * Takes everything `setup` added out again before the island's world is freed. Whatever the
   * player has done there lives in the save; the next setup reads it back.
   */
  teardown(): void;
  /** Something on the island needs the world to stay as it is (a ride under way). */
  busy?(): boolean;
  /** The cast's idle life while the camera's near the island (`at` is who they turn to). */
  updateNpcs(dt: number, at: { x: number; y: number; z: number }, eye: { x: number; z: number }): void;
  update(dt: number, t: number): void;
  /** Each frame while a ride of the island's has the walker (`look` is the frame's input). */
  ride?(dt: number, look: InputState, t: number): void;
  /** You took the helm while moored here. */
  onBoard?(): void;
  /** You stepped ashore (on any island). */
  onLand?(): void;
  /** The ship lies tied up at this island's berth (its mooring lines run to her) or not. */
  moored?(on: boolean): void;
  /** A character of the island's who speaks somewhere else (aboard), if `speaker` is one now. */
  speaker?(name: string): Character | null;
  bottles?(): { id: string; x: number; z: number; read: boolean }[];
  /** Test hooks (session.debug reads them by name). */
  readonly debug: Record<string, (...args: never[]) => unknown>;
  dispose(): void;
}

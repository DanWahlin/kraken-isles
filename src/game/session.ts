import { onPierDeck } from '../world/islands/anchorage/village';
import { spyglassSpeakerPan } from '../learn/spyglass-layout';
import { chartLabel, firstShowing } from '../learn/content/labels';
import { courseVoiceBase } from '../course/catalog';
import { Vector3 } from 'three/webgpu';
import { buildSlice } from '../engine/build-slice';
import { releaseRemovedObjects } from '../util/dispose-three';
import type { InputState } from '../engine/input';
import type { Character } from '../world/characters';
import type { CharacterGrounding } from '../world/characters/types';
import { clearCharacterLodView, setCharacterLodView } from '../world/characters/character-lod';
import { COVE } from '../world/layout';
import { windOnBow } from '../world/ship/dynamics';
import { seaState } from '../world/ocean/sea-state';
import { windAt } from '../world/wind';
import { CollisionWorld, outsideBox, type SurfaceKind, type WalkSurface } from './collision';
import { ShipCameraBlockers } from './ship-camera';
import { FootstepPuffs } from './footstep-puffs';
import { FollowCamera, SAIL_RIG, WALK_RIG, type CameraShot } from './follow-camera';
import { arrivalFlight, type IslandId } from './arrivals';
import { ISLANDS, islandAt, openIslands, type IslandBerth } from './islands';
import { PassageBattles } from './passage-battles';

export { ISLANDS, islandAt } from './islands';
import { HOME_ISLAND, ISLAND_LIST, STREAMED_ISLANDS, isIslandId } from '../islands/registry';
import { noteIslandStory } from '../islands/open';
import type { IslandContent, IslandContentHost, IslandCode, IslandWalk } from './island-code';
import { terrainRockCameraBlockersSliced } from '../world/terrain/terrain-rocks';
import { world as worldUniforms } from '../engine/uniforms';
import { Helm } from './helm';
import { Hud } from './hud';
import { Interactions } from './interaction';
import { COVE_NPCS, NpcCrowd } from './npcs';
import { PlayerController } from './player-controller';
import { SWIM_BAND, SwimBounds, placeShipKeepOut, type SwimKeepOut } from './swim-bounds';
import { COVE_CHESTS, currentQuest } from './cove-quests';
import { compassGoals } from './compass-goals';
import { Wayfinder } from './wayfinding/compass-route';
import { puzzleOn } from '../course/puzzles';
import type { MarketHost } from './puzzles/model-market';
import { MARKET_PUZZLE, marketStall } from './market/stalls';
import { plankProgress, plankSurface, type PlankSpan } from './gangway';
import { islandChapter } from '../learn/course-board';
import { COURSE_BOARDS } from '../world/islands/course-boards';
import { courseBoardSpot } from '../world/sites/course-board';
import { SLUICE_ID } from './puzzles/sluice';
import { migrateQuests, storyEvent, storyHolds } from './story';
import type { HintTier, Puzzle, PuzzleHost, PuzzleTerminal, SailAction } from './puzzles/types';
import { createArrival } from './session/arrival';
import { createSessionCompass } from './session/compass';
import { createHomePuzzles } from './session/home-puzzles';
import { createIslandSetups } from './session/island-setups';
import { createLighthouseStair } from './session/lighthouse';
import { createMarkets } from './session/markets';
import { createPassageSky } from './session/passage-sky';
import { createSightingGate, HARBOUR_REACH } from './session/sightings';
import { createStarfishHunt } from './session/starfish';
import { createStrides } from './session/strides';
import { createTalk } from './session/talk';
import { createTreasure } from './session/treasure';
import type { GameSession, SessionMode, SessionOptions, SessionStatus } from './session/types';
import { createUnstuck } from './session/unstuck';
import { createWelcome } from './session/welcome';
import { createWingman } from './session/wingman';

export type { GameSession, IslandSetup, SessionOptions, StreamedIsland } from './session/types';

const WALK_HELP =
  '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move · <kbd>Shift</kbd> run · <kbd>Space</kbd> hop<br>' +
  'drag <kbd>mouse</kbd> look · wheel zoom · <kbd>E</kbd> interact';
const SAIL_HELP =
  '<kbd>W</kbd>/<kbd>S</kbd> raise / lower sails · <kbd>A</kbd>/<kbd>D</kbd> helm<br>' +
  'drag <kbd>mouse</kbd> look · wheel zoom · <kbd>E</kbd> dock when you’re near a berth';

/** How often (s) the session looks for a puzzle that's ready for its chart label. */
const LABEL_CHECK_EVERY = 0.25;

/** Wingman's tacking tip, the first time in a voyage you're in irons near a harbour (any course). */
const TACK_TIP_ID = 'tip:tacking';
const TACK_TIP =
  'We can’t sail straight into the wind, Captain. Tack instead: steer about 45° off it with A or D till ' +
  'the sails fill, then turn through the wind and zig-zag up to where you’re going.';

const DOCK_RANGE = 38;
/** Seconds of visible assisted approach before the fade tidies the ship into the berth. */
const DOCK_ASSIST_MAX = 6;

/**
 * The play session: the walker and follow camera on collision built from the terrain, village and
 * pier; the cast and their conversations; boarding the brigantine to sail with the helm, and docking
 * at an island's berth. This is where its parts (src/game/session/) are put together and where the
 * frame runs: each part owns its own state and is handed what it needs of the rest.
 */
export async function createSession(o: SessionOptions): Promise<GameSession> {
  const { engine, cove, input, audio } = o;
  const { camera, tier } = engine;
  const { village, ship, terrain, ocean } = cove;
  const ground = cove.heightField ?? terrain.heightField;
  const learn = o.learn ?? null;
  // Every island's play (src/islands/registry.ts): its quests, walks and content. The flow fetches
  // their chunks with the world's, so they're in by now.
  const codes = await Promise.all(ISLAND_LIST.map((e) => e.code()));
  const games = new Map<IslandId, IslandCode>(ISLAND_LIST.map((e, i) => [e.id, codes[i]!]));
  const gameOf = (id: IslandId) => games.get(id)!;
  /** The streamed islands' content (cast, chests, sites, puzzles), made below; each sets up with its world. */
  const contents = new Map<IslandId, IslandContent>();
  const contentList: IslandContent[] = [];
  /** Each content's island (`contentList[i]` is `contentIds[i]`'s). */
  const contentIds: IslandId[] = [];

  const pierKind = (x: number, z: number): SurfaceKind => (onPierDeck(x, z) ? 'wood' : 'stone');
  const villageSurface: WalkSurface = { heightAt: village.walkable, kind: pierKind };
  const sites = cove.sites;
  const sitesSurface: WalkSurface = { heightAt: sites.heightAt, kind: 'stone' };
  // Which island you start on (a save can be on any), and so where the ship lies.
  const start = o.start ?? COVE.spawn;
  let island: IslandId = islandAt(start.x, start.z);
  let berth: IslandBerth = ISLANDS[island];
  // The gangplank: its foot rests on the quay where the calm-moored ship's plank would land, and its
  // top rides the rail each frame. Walkable only while it's down.
  const footLocal = ship.anchors.gangway;
  const plank: PlankSpan = {
    top: { x: 0, y: 0, z: 0 },
    foot: { x: 0, y: footLocal.y, z: 0 },
    halfWidth: 0.3,
    tread: 0.06,
  };
  /** Ship-local (x, z) at a berth, in world space. Port (+x) faces the quay. */
  const atBerth = (m: IslandBerth['mooring'], lx: number, lz: number) => ({
    x: m.x + Math.cos(m.heading) * lx + Math.sin(m.heading) * lz,
    z: m.z - Math.sin(m.heading) * lx + Math.cos(m.heading) * lz,
  });
  const placePlank = () => {
    const f = atBerth(berth.mooring, footLocal.x, footLocal.z);
    plank.foot.x = f.x;
    plank.foot.z = f.z;
  };
  placePlank();
  // Each island's walks (its town, quays and decks) and its water, live once its world has streamed in.
  const walks: IslandWalk[] = [];
  for (const e of ISLAND_LIST) {
    const walk = gameOf(e.id).walk?.({
      stream: cove.islands[e.id] ?? null,
      tier,
      content: () => contents.get(e.id) ?? null,
    });
    if (walk) walks.push(walk);
  }
  // An island's surfaces are skipped outside its box (one far off costs the camera's queries nothing).
  for (const w of walks) if (w.box) for (const s of w.surfaces) s.box ??= w.box;
  const wading = walks.filter((w) => w.inland);
  /** The Gate Board, the Flag Hoist, Pell's letters or a market counter has the keys and the camera. */
  let overlayModal = false;
  let gangwayDown = false;
  const world = new CollisionWorld({
    ground,
    waves: ocean.field,
    surfaces: [
      villageSurface,
      sitesSurface,
      ...walks.flatMap((w) => w.surfaces),
      plankSurface(plank, () => gangwayDown),
    ],
    circles: [
      ...village.colliders.circles,
      ...sites.colliders.circles,
      ...walks.flatMap((w) => w.circles ?? []),
      // Anchorage's trunks and big plants (a streamed island's come and go with it: `islandPlants`).
      ...(cove.vegetation?.homeColliders() ?? []),
    ],
    boxes: [...village.colliders.boxes, ...sites.colliders.boxes],
    // The islands' pools and streams, as they're drawn over this tier's ground: wade the shallows and
    // the streams, and the deep middle stops you.
    inland: (x, z, g, out) => {
      for (let i = 0; i < wading.length; i++) {
        const w = wading[i]!;
        if (!outsideBox(w.box, x, z) && w.inland!(x, z, g, out)) return true;
      }
      return false;
    },
  });
  // Boulders and the headland cliff's overhang: only the follow camera keeps out of them.
  // In slices: all at once, the headland's blockers held a frame for ~120 ms behind the cabin.
  const rockBlockers = terrainRockCameraBlockersSliced(terrain.heightField, tier.tier);
  for (let r = rockBlockers.next(); ; r = rockBlockers.next()) {
    if (r.done) {
      for (const b of r.value) world.addCameraBox(b);
      break;
    }
    await buildSlice();
  }
  for (const b of village.cameraBlockers) world.addCameraBox(b);
  for (const b of cove.wreck.cameraBlockers) world.addCameraBox(b);
  for (const b of sites.colliders.camera) world.addCameraBox(b);
  // The moored ship: the follow camera keeps out of her hull and rig while you're ashore.
  const shipCams = new ShipCameraBlockers(world);

  const hud = new Hud(o.hudParent);
  await hud.loadSubtitles(o.voiceManifest ?? `${courseVoiceBase()}manifest.json`);
  hud.setHelp(WALK_HELP);

  // Player: stepUp 0.66, over the 0.55 default. It was first for the quay-to-pier lip, which the pier
  // ramp removed (#22), but a scan and walks at 0.55 (2026-10-22) still stop on Port Meridian's
  // terrace stairs (x ≈ 610 and 732, z −840 to −891), whose steps rise 0.57–0.6 m. Elsewhere 0.55
  // only loses side climbs (onto a door stair's flank, a deck's edge). Lower it only with those
  // stairs rebuilt.
  const player = new PlayerController({ stepUp: 0.66 });
  const hero: Character = o.characters.create({ body: o.body, variant: o.variant ?? 0, tier });
  /** Teleports the player and snaps the hero model with it, so no frame shows the old spot. */
  const placePlayer = (x: number, z: number, heading: number) => {
    player.teleport(world, x, z, heading);
    hero.group.position.set(player.x, player.y, player.z);
    hero.group.rotation.y = player.heading;
  };
  // Swimming: a band off the shore of the island you're on, clear of decks and the moored ship.
  const shipKeepOut: SwimKeepOut = { x0: 0, z0: 0, x1: 0, z1: 0, r: 0 };
  const swimBounds = new SwimBounds(world, {
    band: () => ISLANDS[island].swimBand ?? SWIM_BAND,
    inWaters: (x, z) => ISLANDS[island].contains(x, z),
    wadeMax: player.tune.wadeMax,
    deck: (x, z) => world.surfaceHeightAt(x, z) !== null,
  });
  swimBounds.keepOuts.push(shipKeepOut);
  player.swimLimit = swimBounds;
  placePlayer(start.x, start.z, start.heading);
  engine.scene.add(hero.group);
  // Character levels of detail go by this camera, and keep full detail near the player.
  setCharacterLodView({ camera, focus: hero.group, tier: tier.tier });

  // Wingman leaves the shoulder to introduce himself, so it's clear who's talking.
  const wing = createWingman(hero, engine.scene, camera);
  const wingman = wing.flight;

  const footstepPuffs = new FootstepPuffs();
  footstepPuffs.addTo(engine.scene);

  // A character a slice (the whole cast at once held a frame for ~30 ms behind the cabin).
  await buildSlice();
  // Anchorage's market keeper keeps a stall only for a course with the market (else it's scenery).
  const anchorageKeeper = marketStall('anchorage').keeper.npc;
  const npcs = await NpcCrowd.createAsync(
    o.characters,
    COVE_NPCS.filter((n) => n.id !== anchorageKeeper || puzzleOn(MARKET_PUZZLE)),
    { ...village.anchors, ...sites.anchors, juno: COVE.firstMate, lyra: sites.hammock.seat },
    world,
    tier,
    camera,
    {
      x: COVE.spawn.x,
      y: COVE.quay.height,
      z: COVE.spawn.z + 3,
      heading: 0,
    },
    buildSlice,
    () => true,
  );
  await buildSlice();
  for (const n of npcs.list) {
    engine.scene.add(n.character.group);
    cove.detail.anchorage.add(n.character.group);
  }

  const cam = new FollowCamera();
  cam.snapBehind(player.heading);
  const helm = new Helm();
  const dyn = ship.dynamics;
  if (island !== 'anchorage') dyn.reset(berth.mooring.x, berth.mooring.z, berth.mooring.heading);
  dyn.dockAssist(berth.mooring);

  let mode: SessionMode = 'walk';
  /** The crew has the wheel (the Three Helms): your helm input and the dock key are ignored. */
  let crewAtHelm = false;
  /** Resolves a scripted docking (Autopilot's) once you're on the quay. */
  let afterDisembark: (() => void) | null = null;
  let dockTime = 0;
  const interactions = new Interactions();
  let paused = false;
  let disposed = false;
  /** What the session's parts may ask about the whole (src/game/session/types.ts). */
  const status: SessionStatus = {
    get mode() {
      return mode;
    },
    get island() {
      return island;
    },
    get berth() {
      return berth;
    },
    get paused() {
      return paused;
    },
    get disposed() {
      return disposed;
    },
    get scripting() {
      return talk.scripting;
    },
    get overlayModal() {
      return overlayModal;
    },
    get crewAtHelm() {
      return crewAtHelm;
    },
  };
  /** Puts the walker at a spot, the hero and the camera with it (`y` picks the level where walks stack). */
  const placeAt = (x: number, z: number, heading: number, y?: number) => {
    player.teleport(world, x, z, heading, y);
    hero.group.position.set(player.x, player.y, player.z);
    hero.group.rotation.y = player.heading;
    cam.snapBehind(heading);
  };
  // Routes for the compass, the crew and Unstuck: each island's walks and the sea lanes between them.
  const wayfinder = new Wayfinder(Object.fromEntries(ISLAND_LIST.map((e) => [e.id, gameOf(e.id).ways])));
  const compass = createSessionCompass({
    status,
    hud,
    camera,
    interactions,
    wayfinder,
    player,
    dyn,
    dockRange: DOCK_RANGE,
    // In a sea battle the battle's own HUD has the top of the screen.
    hidden: () =>
      (dialogue.active && !welcome.pointing) ||
      talk.scripting ||
      talk.anyTalking() ||
      battles.active ||
      overlayModal,
    goals: () => compassGoals(gameOf(island).quests, quests()),
    sailMark: () => {
      for (let i = 0; i < puzzles.length; i++) {
        const mark = puzzles[i]!.sailTarget?.() ?? null;
        if (mark) return mark;
      }
      return null;
    },
    sailTarget,
  });

  // The plank's foot sits on the quay deck, its axis half the plank's thickness up.
  const seatPlank = () => (plank.foot.y = world.groundAt(plank.foot.x, plank.foot.z) + 0.035);
  seatPlank();
  /** Moves the session to an island's berth: the plank, its task list, and its time of day. */
  const setIsland = (id: IslandId) => {
    island = id;
    berth = ISLANDS[id];
    placePlank();
    seatPlank();
    publishQuests();
    applySky(berth.sky);
  };
  const applySky = (sky: { hours: number; azimuth: number }) => {
    if (
      Math.abs(engine.clock.hours - sky.hours) < 0.002 &&
      Math.abs(engine.clock.azimuth - sky.azimuth) < 0.05
    )
      return;
    engine.clock.set(sky.hours, sky.azimuth);
    o.cove.sky.invalidate();
  };
  // A save away from Anchorage wakes to that island's sky (Anchorage keeps the page's own time).
  if (island !== 'anchorage') applySky(berth.sky);
  // The light of a passage, and the night that passes at sea.
  const sky = createPassageSky({ clock: engine.clock, hud, battle: () => battles.current });

  /** Anchorage's gangway stays up until the christening; elsewhere you can always board. */
  const canBoard = () => (island === 'anchorage' ? storyHolds('anchorage', 'gangwayDown', quests()) : true);
  const plankTop = new Vector3();
  const tmp = new Vector3();

  // Quests (POC §4.4 slice): NPC scripts depend on quest state, saved with learning progress.
  const quests = (): Record<string, string> => learn?.progress.data.quests ?? localQuests;
  const localQuests: Record<string, string> = {};
  const setQuest = (id: string, step: string) => {
    if (learn) learn.progress.setQuest(id, step);
    else localQuests[id] = step;
    // Anchorage's Seal lights the point lighthouse (the cue shows it; this covers skips and tests).
    if (storyHolds('anchorage', 'sealed', quests())) village.setLighthouseLit(true);
    noteOpenings();
    publishQuests();
  };
  /** Tells the islands' gates which of the story conditions that open islands hold now (src/islands/open.ts). */
  const noteOpenings = () => noteIslandStory((id, condition) => storyHolds(id, condition, quests()));
  const publishQuests = () => {
    compass.stale();
    learn?.setQuests(
      ISLAND_LIST.flatMap((e) => gameOf(e.id).quests.log(quests())),
      trackerHere(),
    );
  };
  /** The task list for the island you're on (Anchorage's points on to Meridian once it's open). */
  const trackerHere = () => gameOf(island).quests.tracker(quests());
  noteOpenings();
  storyEvent('anchorage', 'landed', quests(), setQuest);
  // Suri's gate lever (the mill race) is the crane job's Actions step; without a save there's nothing
  // to check, so an old save's rules that ask for it don't fire.
  migrateQuests(quests(), setQuest, {
    workflowsOn: learn ? !!learn.progress.data.puzzles[SLUICE_ID]?.flags?.includes('gate') : undefined,
  });
  publishQuests();
  /** Chart labels already shown without a save (dev pages with `?nolearn`). */
  const labelsShown = new Set<string>();
  /**
   * A puzzle's or a battle's chart label (docs/specs/LOWER-THIRDS.md), the first time it starts in
   * this save. Ids without a label in the course pack's labels.json show nothing.
   */
  function puzzleLabel(id: string): void {
    const text = chartLabel(id);
    if (text && firstShowing(learn?.progress ?? null, labelsShown, id)) hud.label.show(text, 'puzzle');
  }
  // Conversations: the dialogue, who's on camera for it, and the scripted beats of quests and puzzles.
  const talk = createTalk({
    status,
    hud,
    audio,
    input,
    learn,
    interactions,
    player,
    cam,
    world,
    npcs,
    contents: contentList,
    placePlayer,
    quests,
    setQuest,
    welcoming: () => welcome.running,
  });
  const { dialogue, cues } = talk;

  // The passages' sea battles: built and warmed when you board with one waiting.
  const battles = new PassageBattles({
    engine,
    cove,
    audio,
    hudParent: o.hudParent,
    islands: ISLANDS,
    done: o.battles ?? [],
    quests,
    open: (id) => openIslands().some((b) => b.id === id),
    onDone: (id, how) => o.onBattle?.(id, how),
    toast: (text, seconds) => hud.toast(text, seconds),
    onStart: (id) => puzzleLabel(`battle:${id}`),
    say: (ids) => dialogue.play(ids),
    voiced: (id) => !hud.line(id)?.pending,
  });
  battles.prefetch(island);
  for (const n of npcs.list) talk.addNpcTalk(n);

  const shipDocked = () => Math.hypot(dyn.pose.x - berth.mooring.x, dyn.pose.z - berth.mooring.z) < 1.5;
  interactions.add({
    id: 'ship:board',
    label: () => 'Board your ship',
    // Wherever she's moored now (after a voyage, a chart jump or a reload), not where she started.
    get x() {
      return plank.foot.x;
    },
    get y() {
      return plank.foot.y;
    },
    get z() {
      return plank.foot.z;
    },
    radius: 2.4,
    enabled: () => mode === 'walk' && shipDocked(),
    onInteract: () => {
      if (canBoard()) return void board();
      // Everything before the christening happens ashore, so say what's next instead.
      const next = currentQuest(quests());
      hud.toast(
        next
          ? `The gangway’s up until Anchorage is done. Next: ${next.task}.`
          : 'The gangway’s up until your ship has her name.',
        4.5,
      );
    },
  });

  /**
   * An island's course notice board (docs/specs/COURSE-BOARDS.md): walk up and read its chapter's
   * topics, each a link into the course. Anchorage's is there from the start; a streamed island's
   * comes and goes with its content. Returns the interaction's id.
   */
  const addCourseBoard = (id: IslandId): string => {
    const iid = `course-board:${id}`;
    const pose = COURSE_BOARDS[id];
    const chapter = islandChapter(id);
    interactions.remove(iid);
    if (!chapter) return iid;
    interactions.add({
      id: iid,
      label: () => 'Read the notices',
      x: pose.x + Math.sin(pose.rot) * 0.9,
      y: pose.y,
      z: pose.z + Math.cos(pose.rot) * 0.9,
      radius: 2.7,
      enabled: () => mode === 'walk' && !talk.scripting && !dialogue.active,
      onInteract: () => learn?.openCourseBoard(chapter),
    });
    return iid;
  };
  addCourseBoard('anchorage');

  // Treasure chests beside their NPCs, and the message bottles on the beaches.
  const treasure = createTreasure({
    status,
    scene: engine.scene,
    lite: tier.tier === 'lite',
    world,
    interactions,
    learn,
    audio,
    input,
    cues,
    home: { npcs: npcs.list, detail: cove.detail.anchorage },
    bottles: sites.bottles,
  });

  // Puzzles (POC §4.5): each registers its own interactions and saves its own state.
  const puzzleHost: PuzzleHost = {
    learn,
    hud,
    dialogue,
    audio,
    interactions,
    player: {
      get x() {
        return player.x;
      },
      get y() {
        return player.y;
      },
      get z() {
        return player.z;
      },
      get heading() {
        return player.heading;
      },
    },
    quests,
    setQuest,
    canAct: () => mode === 'walk' && !paused && !talk.scripting && !dialogue.active && !learn?.busy,
    beat: talk.beat,
  };
  /** A puzzle overlay (the Gate Board, the Flag Hoist, Pell's letters) has the keys, the pad and Esc. */
  function setOverlayModal(on: boolean): void {
    overlayModal = on;
    input.enabled = !on && !paused && !talk.scripting;
    if (on) {
      hero.setSpeed(0);
      hud.setPrompt(null);
    }
  }
  // The Model Market: an overlay at Gilda's counter on the plaza, with the camera on her stall.
  const marketHost: MarketHost = {
    ...puzzleHost,
    frame: (shot) => cam.frame(shot),
    cut: (shot) => cam.cut(shot),
    setModal: setOverlayModal,
    reducedMotion: () => worldUniforms.reducedMotion.value > 0.5,
    place: placePlayer,
    filePage: (id) => {
      if (learn?.filePage(id)) hud.toast('New Logbook page: The Model Market. Press J to read it.', 3.5);
    },
    spotlight: (id, on) => {
      const n = talk.everyone().find((v) => v.spec.id === id);
      n?.character.setSpotlight(on);
    },
  };
  // Anchorage's own puzzles (a streamed island's come with its content, below).
  const puzzles: Puzzle[] = createHomePuzzles({
    puzzleHost,
    ship,
    sites,
    npcs,
    cues,
    learn,
    cam,
    atHomeBerth: () => island === 'anchorage' && shipDocked(),
  });
  const hintPresses = new Map<string, { key: string; n: number }>();
  // The Model Market's stalls: Anchorage's on the quay, and each streamed island's with its world.
  const markets = createMarkets({
    scene: engine.scene,
    detail: cove.detail,
    anchor: village.anchors.modelMarket,
    market: marketHost,
    puzzles,
  });

  const FAR = { x: 1e6, y: 0, z: 1e6 };
  // A Seal's won: everyone nearby waves to you, the crowd cheers, and Wingman takes a lap and comes
  // back to your shoulder.
  cues.set('celebrate', async () => {
    audio?.sfx.oneShot('chime_solve', player, 0.9);
    for (const n of talk.everyone())
      if (!n.talking && Math.hypot(n.x - player.x, n.z - player.z) < 45) n.character.greet();
    audio?.sfx.oneShot('stinger_triumph', player, 0.8);
    if (wingman && wingman.phase === 'perched') {
      wing.takeOff();
      await new Promise((r) => setTimeout(r, 2400));
      wingman.land();
    } else await new Promise((r) => setTimeout(r, 1200));
  });
  // Anchorage's Seal (PLAN §4, Island 00 beat 11): the point lighthouse lights across the harbour.
  cues.set('anchorage-lighthouse', async () => {
    const L = COVE.lighthouse;
    // Out on the harbour north-east of the point, looking back at the whole tower with the west
    // beach behind it. Only water lies between, so the shot's always clear.
    const x = L.x + 34,
      z = L.z - 30;
    const shot: CameraShot = {
      x,
      y: Math.max(L.top + 6, world.waterAt(x, z, 0) + 3),
      z,
      tx: L.x,
      ty: L.top + 11,
      tz: L.z,
    };
    await talk.showLighting(shot, () => village.setLighthouseLit(true));
  });
  if (storyHolds('anchorage', 'sealed', quests())) village.setLighthouseLit(true);

  /** Puzzles whose label has had its chance (shown now, shown in an earlier visit, or none). */
  const labelDone = new Set<string>();
  let labelCheckIn = 0;
  /**
   * A puzzle's label shows when you first stand at it ready to play (the puzzle's `engaged`), with no
   * conversation, quest beat, quiz, menu or flyover in the way, and no other label up.
   */
  function checkPuzzleLabels(): void {
    if (paused || talk.scripting || dialogue.active || learn?.busy || hud.label.mode) return;
    if ((mode !== 'walk' && mode !== 'sail') || arrival.active) return;
    for (const p of puzzles) {
      const label = p.label ?? p.id;
      if (labelDone.has(label) || !p.engaged()) continue;
      labelDone.add(label);
      puzzleLabel(`puzzle:${label}`);
      return;
    }
  }

  // ---- The streamed islands' content: cast, chests, sites and puzzles arrive with each world ----
  /** The ship for a puzzle at sea (the Three Helms): the crew takes the wheel, and docks you home. */
  const seaHost: IslandContentHost['sea'] = {
    sailing: () => mode === 'sail' && !paused && !talk.scripting && !dialogue.active && !learn?.busy,
    afloat: () => mode === 'sail' || mode === 'docking',
    ship: dyn,
    crewHelm: (on) => {
      crewAtHelm = on;
      helm.reset();
      dyn.setInput({ trim: 0, rudder: 0 });
      if (!on) dyn.clearAutopilot();
    },
    seaPath: (fx, fz, tx, tz) => wayfinder.sea.path(fx, fz, tx, tz),
    dockHome: () =>
      new Promise<void>((resolve) => {
        afterDisembark = resolve;
        dockTo = ISLANDS[island];
        mode = 'docking';
        dockTime = 0;
        dyn.dockAssist(dockTo.mooring);
      }),
  };
  for (const e of STREAMED_ISLANDS) {
    const make = gameOf(e.id).content;
    const stream = cove.islands[e.id];
    if (!make || !stream) continue;
    const content = make({
      characters: o.characters,
      tier,
      camera,
      scene: engine.scene,
      world,
      detail: cove.detail[e.id],
      learn,
      audio,
      interactions,
      puzzleHost,
      player,
      walking: () => mode === 'walk',
      say: (ids) => dialogue.play([...ids]),
      text: (speaker, line) => dialogue.say(speaker, line),
      frame: (shot) => cam.frame(shot),
      cut: (shot) => cam.cut(shot),
      fade: (on, ms) => hud.fade(on, ms),
      backToTalk: talk.backToTalk,
      place: placeAt,
      setModal: setOverlayModal,
      reducedMotion: () => worldUniforms.reducedMotion.value > 0.5,
      label: puzzleLabel,
      addNpcTalk: talk.addNpcTalk,
      placeChest: treasure.placeChestAt,
      removeChests: treasure.removeChests,
      openChest: treasure.open,
      cues,
      puzzles,
      sky: {
        hours: () => engine.clock.hours,
        set(hours) {
          engine.clock.set(hours, engine.clock.azimuth);
          o.cove.sky.invalidate();
        },
        home: () => applySky(berth.sky),
      },
      overlay: hud.root,
      stream,
      cove,
      ship,
      cam,
      hero,
      disposed: () => disposed,
      scripting: () => talk.scripting,
      placePlayer,
      placeChestBy: treasure.placeChest,
      beginRide: () => {
        mode = 'transition';
        input.enabled = false;
        hero.setSpeed(0);
        hud.setPrompt(null);
      },
      endRide: () => {
        mode = 'walk';
        input.enabled = !paused;
      },
      showLighting: talk.showLighting,
      talkShot: () => talk.shot,
      sea: seaHost,
    });
    contents.set(e.id, content);
    contentList.push(content);
    contentIds.push(e.id);
  }
  /** A ride of an island's (the lift) has the walker. */
  const riding = () => contentList.some((c) => c.busy?.() ?? false);

  // ---- Islands that stream in and out (PLAN §13.3) ----
  const streams = cove.residents;
  const reachable = (id: IslandId) => openIslands().some((b) => b.id === id);
  const aboard = () => mode === 'sail' || mode === 'docking';
  const setups = createIslandSetups({
    status,
    engine,
    cove,
    world,
    interactions,
    contents,
    markets,
    anchorageContent: () => [
      ...npcs.list.map((n) => n.character.group),
      ...(markets.anchorage ? [markets.anchorage] : []),
      ...treasure.chests.filter((c) => COVE_CHESTS.some((k) => k.id === c.id)).map((c) => c.chest.group),
    ],
    addCourseBoard,
    busy: () =>
      battles.active ||
      talk.scripting ||
      dialogue.active ||
      talk.anyTalking() ||
      arrival.active ||
      mode === 'transition' ||
      mode === 'docking' ||
      riding() ||
      overlayModal ||
      cam.framing ||
      !!learn?.busy ||
      puzzles.some((p) => p.engaged()),
    focus: () => (aboard() ? dyn.pose : player),
    target: () => (aboard() ? sailTarget().id : null),
    reachable,
  });

  /** What E does at sea right now, from whichever puzzle has something (taking a helm, the next leg). */
  function sailAction(): SailAction | null {
    for (const p of puzzles) {
      const act = p.sailAction?.() ?? null;
      if (act) return act;
    }
    return null;
  }

  /** Wingman's hint key: the puzzle you're at, else a nudge toward the current quest. */
  function hint(): void {
    const p = puzzles.find((z) => z.engaged());
    if (p) {
      const key = p.hintKey();
      const last = hintPresses.get(p.id);
      const n = last?.key === key ? Math.min(3, last.n + 1) : 1;
      const line = p.hint(n as HintTier);
      // Tier 3 does a step, which changes the key, so the next press starts over at a nudge.
      const after = p.hintKey();
      hintPresses.set(p.id, { key: after, n: after === key ? n : 0 });
      if (line) void dialogue.say('Wingman', line);
      return;
    }
    const open = gameOf(island).quests.hintTask(quests());
    void dialogue.say(
      'Wingman',
      (open?.detail ? `Logbook says: ${open.detail}` : 'Nothing pressing, Captain. Enjoy the view.') +
        wayfindingNudge(),
    );
  }

  /** Wingman's word on getting there: Unstuck when you're wedged, the Chart's Travel here when it's far. */
  function wayfindingNudge(): string {
    if (unstuck.offered)
      return ' Wedged? Press E, or pick Unstuck in the pause menu, and I’ll put you back on the path.';
    if (mode !== 'walk' || !compass.aim) return '';
    if (compass.mainLength > 120 && island === 'anchorage')
      return ' It’s a fair walk: follow the compass, or open the Chart (M), pick a landmark and Travel here.';
    if (compass.mainLength > 120) return ' It’s a fair walk, so follow the compass. It keeps to the paths.';
    return '';
  }
  /** The compass's island streams in at low priority while you sail (nothing waits on it yet). */
  const prefetchSailTarget = () => {
    const to = sailTarget().id;
    if (to !== island) void streams[to].load('low');
  };

  async function board(): Promise<void> {
    if (mode !== 'walk') return;
    prefetchSailTarget();
    // The compass's island is the likely next theme: it buffers while you sail.
    audio?.music.prefetch(sailTarget().music);
    mode = 'transition';
    input.enabled = false;
    hud.setPrompt(null);
    // A battle waiting on this passage builds behind the fade and warms while you sail out.
    void battles.prepare(island);
    await hud.fade(true);
    wingman?.landNow();
    // Where the way out is close to the wind (or the quay holds her), the crew warps her off first.
    const dep = berth.departure;
    if (dep && Math.hypot(dyn.pose.x - berth.mooring.x, dyn.pose.z - berth.mooring.z) < 25)
      dyn.reset(dep.x, dep.z, dep.heading);
    const a = ship.anchors.helm;
    ship.group.add(hero.group);
    hero.group.position.set(a.x, a.y, a.z);
    hero.group.rotation.set(0, a.heading, 0);
    hero.setSpeed(0);
    hero.play('helm');
    hero.setGrip(a.grip);
    dyn.clearDockAssist();
    helm.reset();
    cam.setRig(SAIL_RIG, true);
    cam.snapBehind(dyn.pose.heading);
    hud.setSailing(true);
    hud.setHelp(SAIL_HELP);
    mode = 'sail';
    input.enabled = true;
    await hud.fade(false);
    ironsFor = 0;
    ironsNudged = false;
    hud.toast('Raise the sails with W. Steer with A and D.', 4);
    sky.begin(island);
    storyEvent('anchorage', 'setSail', quests(), setQuest);
    contents.get(island)?.onBoard?.();
    audio?.music.setIsland('harbour');
  }

  /** The island whose waters the ship was last in (its theme's been prefetched). */
  let musicWaters: IslandId | null = null;
  /** The open island whose berth is within docking range of the ship, if any. */
  function berthInRange(): IslandBerth | null {
    let best: IslandBerth | null = null;
    let bestD = DOCK_RANGE;
    for (const b of openIslands()) {
      const d = Math.hypot(dyn.pose.x - b.mooring.x, dyn.pose.z - b.mooring.z);
      if (d <= bestD) {
        best = b;
        bestD = d;
      }
    }
    return best;
  }
  /**
   * Where the compass sends you while sailing: the farthest open island along the voyage that you're
   * on or whose island before is done (its `sailHere`: Meridian once Anchorage's quests are done,
   * Thousand-Bough once Meridian's Seal is won), else home.
   */
  function sailTarget(): IslandBerth {
    for (let i = STREAMED_ISLANDS.length - 1; i >= 0; i--) {
      const e = STREAMED_ISLANDS[i]!;
      if (!reachable(e.id)) continue;
      if (island === e.id || gameOf(e.id).quests.sailHere?.(quests())) return ISLANDS[e.id];
    }
    return ISLANDS[HOME_ISLAND];
  }
  // The kraken's distant sightings keep out of harbours, conversations and framed shots.
  const sightings = createSightingGate({ status, gates: cove.sightingGates, ground, dyn, player });
  const nearHarbour = () =>
    openIslands().some((b) => Math.hypot(dyn.pose.x - b.mooring.x, dyn.pose.z - b.mooring.z) < HARBOUR_REACH);

  function dock(): void {
    if (mode !== 'sail' || crewAtHelm) return;
    const to = berthInRange();
    if (!to) {
      hud.toast(`Sail to ${sailTarget().berthLabel} to go ashore.`, 3);
      return;
    }
    if (battles.blocksDock(to.id)) {
      hud.toast('Raiders are still out there! Finish the fight, or skip the battle from the pause menu.', 4);
      return;
    }
    mode = 'docking';
    dockTime = 0;
    helm.reset();
    dockTo = to;
    dyn.dockAssist(to.mooring);
    hud.toast('Bringing her alongside…', 3);
  }
  let dockTo: IslandBerth = berth;

  /**
   * Moors the ship bow-out at the berth (only while the screen is black) and puts the hero on the
   * quay beside the gangway. A first landfall there plays the island's arrival flyover.
   */
  async function disembark(to: IslandBerth = dockTo): Promise<void> {
    mode = 'transition';
    sky.end();
    input.enabled = false;
    await hud.fade(true);
    battles.leftShip(cam);
    if (to.id !== island) setIsland(to.id);
    moorShip();
    engine.scene.add(hero.group);
    hero.group.rotation.set(0, 0, 0);
    hero.setGrip(null);
    hero.play('idle');
    stepAshore();
    cam.setRig(WALK_RIG, true);
    hud.setSailing(false);
    hud.setHelp(WALK_HELP);
    mode = 'walk';
    welcome.landed(to.id);
    const landfall = firstLandfall();
    input.enabled = !landfall;
    if (landfall) arrival.start(berth.arrival, false);
    audio?.music.setIsland(berth.music);
    crewAtHelm = false;
    for (const c of contentList) c.onLand?.();
    await hud.fade(false);
    const done = afterDisembark;
    afterDisembark = null;
    done?.();
  }
  const moorShip = () => {
    const m = berth.mooring;
    dyn.reset(m.x, m.z, m.heading);
    dyn.dockAssist(m);
  };
  /** On the quay beside the gangway (level with the boarding point), facing the town. */
  const stepAshore = () => {
    const b = ship.anchors.boarding;
    const at = atBerth(berth.mooring, footLocal.x + 0.7, b.z);
    placePlayer(at.x, at.z, berth.landingHeading);
    cam.snapBehind(berth.landingHeading);
  };
  /** The first time ashore on this island. */
  const firstLandfall = () => !!learn && !learn.progress.has('arrivals', berth.id);

  // Unstuck (PLAN §9's "never trapped"): a hop back onto the island's routes, or the ship off into open water.
  const unstuck = createUnstuck({
    status,
    hud,
    input,
    interactions,
    player,
    dialogue,
    wayfinder,
    dyn,
    helm,
    cam,
    compass,
    setMode: (to) => (mode = to),
    place: placeAt,
    riding,
    battling: () => battles.active,
    berthInRange,
    sailTarget,
  });

  // Ship sounds.
  let slapIn = 2;
  const windHere = new Float32Array(2);
  /** Seconds stalled head to wind with the sails up; one nudge per boarding. */
  let ironsFor = 0;
  let ironsNudged = false;
  // The walker's footsteps, strokes and ripples.
  const strides = createStrides({
    status,
    player,
    hero,
    audio,
    hud,
    dialogue,
    puffs: footstepPuffs,
    swimBounds,
    wing,
    camera,
    welcoming: () => welcome.running,
  });

  /** Seconds the HUD stays calm after the last busy frame. */
  const CALM_HOLD = 0.6;
  let calmFor = 0;
  let calmShown = false;
  let anim: 'move' | 'wade' = 'move';
  let cooldown = 0;
  let resumedAt = 0;
  // Wingman's welcome to an island, and the learning systems' pauses at a quiet moment ashore.
  const welcome = createWelcome({
    status,
    hud,
    input,
    learn,
    hero,
    cam,
    camera,
    player,
    dialogue,
    wing,
    quests,
    battling: () => battles.active,
    quiet: !!o.quiet,
    resume: !!o.resume,
  });
  // A first landfall's flyover in from the sea, then the welcome.
  const arrival = createArrival({
    status,
    hud,
    learn,
    input,
    hero,
    cam,
    camera,
    world,
    player,
    dialogue,
    wing,
    welcome,
  });
  // A fresh voyage flies in; a Continue (quiet) is already ashore, so this island counts as seen.
  if (o.quiet) learn?.progress.add('arrivals', berth.id);
  else if (firstLandfall()) arrival.start(arrivalFlight(berth.arrival, !!o.fromChart), true);

  // Anchorage's lighthouse stair: a short fade takes you up or down it.
  const lighthouse = createLighthouseStair({
    status,
    hud,
    input,
    audio,
    interactions,
    hero,
    cam,
    camera,
    world,
    player,
    footstep: strides.surface,
  });
  const updateStarfish = createStarfishHunt({
    status,
    cove,
    learn,
    world,
    player,
    audio,
    hud,
    dialogue,
    cam,
  });

  // Reused each frame by the walk step (hot loops don't allocate).
  const stepInput = {} as InputState;
  const grounding: CharacterGrounding = {
    mode: player.mode,
    verticalSpeed: 0,
    landed: false,
    groundAt: (x, z) => world.groundAt(x, z),
  };
  const listenerPos = { x: 0, y: 0, z: 0 };
  const listenerFwd = { x: 0, y: 0, z: -1 };

  /** A content test hook by name, from whichever island has it (Meridian's lift and lighthouse). */
  const contentHook = (name: string): ((...args: never[]) => unknown) | null => {
    for (const c of contentList) if (c.debug[name]) return c.debug[name]!;
    return null;
  };

  const remove = engine.add(
    {
      frame(dt, t) {
        const s = input.poll();
        // A course picture on screen: the talk shot moves its speaker clear of it.
        const spy = learn?.getState().spyglass;
        if (spy && !spy.full) {
          const pan = spyglassSpeakerPan(innerWidth, innerHeight);
          cam.setScreenPan(pan.x, pan.y);
        } else cam.setScreenPan(0, 0);
        if (paused) {
          hud.setPrompt(null);
          hero.update(dt);
          wing.update(dt);
          if (cove.anchorage.shown) npcs.update(dt, mode === 'walk' ? player : FAR);
          for (const c of contentList) c.updateNpcs(dt, mode === 'walk' ? player : FAR, camera.position);
          audio?.update(dt);
          return;
        }
        // A quiz, page, or Logbook owns input: freeze the walker (the world keeps living).
        if (learn?.busy) {
          hud.setPrompt(null);
          hud.setCompass(null);
          if (mode === 'walk')
            player.step(dt, { ...s, moveX: 0, moveY: 0, jump: false, run: false }, cam.yaw, world, t);
          hero.setSpeed(0);
          hero.update(dt);
          wing.update(dt);
          if (cove.anchorage.shown) npcs.update(dt, mode === 'walk' ? player : FAR);
          for (const c of contentList) c.updateNpcs(dt, mode === 'walk' ? player : FAR, camera.position);
          treasure.update(dt, t);
          audio?.update(dt);
          resumedAt = performance.now();
          return;
        }
        // An arrival flyover owns the keys (any of them skips it) until it lands.
        const arriving = arrival.active;
        if (arriving) arrival.update(dt, t, s);
        // Menu keys: ignore the edge from the same key press that closed the menu.
        if (performance.now() - resumedAt > 200) {
          // The Gate Board and the Flag Hoist keep Esc and the pad for themselves.
          if (s.menu && o.onMenu && !overlayModal) return o.onMenu();
          if (s.map && o.onChart && !arriving) return o.onChart();
        }
        // A short cooldown after a conversation ends so mashing E to skip doesn't restart it.
        if (dialogue.active) cooldown = 0.45;
        else cooldown = Math.max(0, cooldown - dt);
        // The E that closed a quiz or page mustn't also skip the next line or re-open a chat.
        if (s.interact && !arriving && performance.now() - resumedAt > 250) {
          if (dialogue.active) dialogue.next();
          else if (cooldown <= 0 && mode === 'sail' && !battles.ownsKeys) {
            const act = sailAction();
            if (act) act.fire();
            else if (unstuck.offered && !berthInRange()) void unstuck.run();
            else dock();
          } else if (cooldown <= 0 && mode === 'walk' && !overlayModal) interactions.fire(s.run);
        }

        welcome.update(dt, s.stirring, arriving);
        if (
          s.hint &&
          (mode === 'walk' || mode === 'sail') &&
          !dialogue.active &&
          !talk.scripting &&
          !overlayModal
        )
          hint();

        gangwayDown = mode === 'walk' && shipDocked() && canBoard();
        // An island's mooring lines only run to the hull while she's tied up at its berth.
        const moored = mode !== 'sail' && mode !== 'docking' && shipDocked();
        if (moored) shipCams.place(dyn.pose.x, ship.group.position.y, dyn.pose.z, dyn.pose.heading);
        else shipCams.park();
        placeShipKeepOut(shipKeepOut, mode === 'walk' ? dyn.pose : null);
        for (let i = 0; i < contentList.length; i++)
          contentList[i]!.moored?.(moored && island === contentIds[i]);
        ship.setGangway(gangwayDown ? plank.foot : null);
        if (gangwayDown) {
          ship.gangwayTopWorld(plankTop);
          plank.top.x = plankTop.x;
          plank.top.y = plankTop.y;
          plank.top.z = plankTop.z;
        }

        if (mode === 'walk') {
          const n = Math.max(1, Math.ceil(dt / (1 / 60)));
          const h = dt / n;
          // One input copy a frame, reused (a jump only on the first sub-step).
          Object.assign(stepInput, s);
          for (let i = 0; i < n; i++) {
            stepInput.jump = s.jump && i === 0;
            player.step(h, stepInput, cam.yaw, world, t);
          }
          hero.group.position.set(player.x, player.y, player.z);
          hero.group.rotation.y = player.heading;
          const sp = player.speed;
          grounding.mode = player.mode;
          grounding.verticalSpeed = player.vy;
          grounding.landed = player.landed;
          grounding.afloat = player.afloat;
          grounding.stroke = player.stroke;
          hero.setGrounding(grounding);
          const wading = player.mode === 'wade' && sp > 0.15;
          if (wading && anim !== 'wade') hero.play('wade');
          else if (!wading && anim === 'wade') hero.play('idle');
          anim = wading ? 'wade' : 'move';
          hero.setSpeed(player.animSpeed);
          strides.update(dt);

          const focus = interactions.update(player.x, player.y, player.z, player.heading);
          hud.setPrompt(
            dialogue.active || talk.anyTalking() || overlayModal ? null : (focus?.label() ?? null),
          );
          lighthouse.update();
          updateStarfish(dt);
          cam.update(dt, camera, s, player, player.heading, sp > 0.3, world, t);
          // Up the plank to the rail, and she's yours: over the side to the helm.
          if (gangwayDown && !dialogue.active && !talk.scripting) {
            const along = plankProgress(plank, player.x, player.z);
            if (along !== null && along > 0.8) void board();
          }
        } else if (mode === 'sail' || mode === 'docking') {
          // A sea battle runs here (it may take the helm: your helmsman, or a question waiting).
          const battleHelm = mode === 'sail' && battles.frame(dt, s, helm, dyn, cam, camera);
          if (mode === 'sail' && !crewAtHelm) {
            if (!battleHelm) helm.update(dt, s.moveX, s.moveY, dyn);
          } else if (mode === 'docking' && (dyn.dockComplete || (dockTime += dt) > DOCK_ASSIST_MAX))
            void disembark();
          const pose = dyn.pose;
          // Into an island's waters: its theme starts buffering before you dock.
          const waters = islandAt(pose.x, pose.z);
          if (waters !== musicWaters) {
            musicWaters = waters;
            audio?.music.prefetch(ISLANDS[waters].music);
          }
          const near = mode === 'sail' && !crewAtHelm ? berthInRange() : null;
          const act = mode === 'sail' && !dialogue.active ? sailAction() : null;
          hud.setPrompt(
            act?.label ??
              near?.dockLabel ??
              (unstuck.offered && mode === 'sail' ? 'Unstuck: warp her off' : null),
          );
          windAt(pose.x, pose.z, t, windHere);
          const bow = windOnBow(pose.heading, windHere[0], windHere[1]);
          hud.updateSail(helm.trim, helm.rudder, Math.abs(dyn.forwardSpeed), bow);
          const stalled =
            mode === 'sail' && bow.point === 'in-irons' && helm.trim > 0.4 && Math.abs(dyn.forwardSpeed) < 1;
          ironsFor = stalled ? ironsFor + dt : 0;
          if (ironsFor > 5 && !ironsNudged && !dialogue.active) {
            ironsNudged = true;
            // Near a harbour, the first time in a voyage: Wingman says how to tack (E skips him).
            if (nearHarbour() && firstShowing(learn?.progress ?? null, labelsShown, TACK_TIP_ID))
              void dialogue.say('Wingman', TACK_TIP);
            else
              hud.toast(
                'We’re head to wind, so the sails can’t fill. Steer with A or D until the arrow’s off the bow.',
                6,
              );
          }
          tmp.set(pose.x, ship.group.position.y, pose.z);
          cam.update(dt, camera, s, tmp, pose.heading, Math.abs(dyn.forwardSpeed) > 0.5, world, t);
          // The light shifts with the passage (the sky only refreshes once the sun has really moved).
          sky.update(dt, pose);
          if (Math.abs(dyn.forwardSpeed) > 0.8 && (slapIn -= dt) <= 0) {
            slapIn = 1.4 + Math.random() * 2.2;
            audio?.sfx.oneShot('hull_slap', tmp, Math.min(1, 0.35 + Math.abs(dyn.forwardSpeed) / 9));
          }
        }

        unstuck.watch(dt, s);
        for (const c of contentList) c.ride?.(dt, s, t);
        setups.update(dt, t);
        for (const c of contentList) c.update(dt, t);
        compass.update();
        // The task list and controls help step aside while a conversation or framed shot has the
        // screen, and come back a moment after (so they don't flicker between lines).
        // (Not during Wingman's welcome: he points them out, so they're up as he flies in.)
        const busy =
          !welcome.pointing &&
          (mode === 'transition' ||
            mode === 'docking' ||
            crewAtHelm ||
            riding() ||
            dialogue.active ||
            talk.scripting ||
            talk.anyTalking() ||
            cam.framing ||
            overlayModal);
        calmFor = busy ? CALM_HOLD : Math.max(0, calmFor - dt);
        // The kraken's distant sightings: under sail, or ashore low by the sea; never in a harbour, a
        // conversation, a script or a framed shot (battles and puzzle courses quiet the sea themselves).
        sightings.update(busy || welcome.pointing);
        const calm = calmFor > 0;
        if (calm !== calmShown) {
          calmShown = calm;
          hud.setCalm(calm);
          learn?.setCalm(calm);
        }
        hero.update(dt);
        wing.update(dt);
        if (cove.anchorage.shown) npcs.update(dt, mode === 'walk' ? player : FAR);
        for (const c of contentList) c.updateNpcs(dt, mode === 'walk' ? player : FAR, camera.position);
        footstepPuffs.update(dt);
        treasure.update(dt, t);
        for (const p of puzzles) p.update(dt, t);
        if ((labelCheckIn -= dt) <= 0) {
          labelCheckIn = LABEL_CHECK_EVERY;
          checkPuzzleLabels();
        }
        let term: PuzzleTerminal | null = null;
        for (const p of puzzles) if ((term = p.terminal?.() ?? null)) break;
        hud.setTerminal(term?.lines ?? null, term?.title);

        if (audio) {
          listenerPos.x = camera.position.x;
          listenerPos.y = camera.position.y;
          listenerPos.z = camera.position.z;
          camera.getWorldDirection(tmp);
          listenerFwd.x = tmp.x;
          listenerFwd.y = tmp.y;
          listenerFwd.z = tmp.z;
          audio.sfx.setListener(listenerPos, listenerFwd);
          audio.update(dt);
        }
      },
    },
    true,
  );

  /** Fast travel: to another island, your ship comes too (moored at its berth). */
  async function travel(x: number, z: number, heading: number): Promise<void> {
    if (mode === 'transition') return;
    sky.end();
    if (arrival.active) await arrival.end('cut');
    dialogue.cancel();
    wingman?.landNow();
    const to = ISLANDS[islandAt(x, z)];
    // Its theme buffers while the island streams in, so it starts at once on arrival.
    audio?.music.prefetch(to.music);
    // Fast travel to a battle's destination skips it (and it counts as done).
    battles.travel(island, to.id, cam);
    await streams[to.id].load('auto', true);
    if (disposed) return;
    if (mode === 'sail' || mode === 'docking') await disembark(to);
    if (to.id !== island) {
      setIsland(to.id);
      moorShip();
      audio?.music.setIsland(berth.music);
    }
    placePlayer(x, z, heading);
    cam.snapBehind(heading);
    if (mode === 'walk' && firstLandfall()) arrival.start(berth.arrival, false);
  }

  return {
    get mode() {
      return mode;
    },
    get island() {
      return island;
    },
    unstuck() {
      if (battles.active || (mode !== 'walk' && mode !== 'sail')) return false;
      void unstuck.run();
      return true;
    },
    setPaused(on) {
      paused = on;
      hud.setMenuOpen(on);
      input.enabled = !on && !dialogue.active && !arrival.active;
      if (!on) resumedAt = performance.now();
      if (on) hero.setSpeed(0);
    },
    arrivalLeft: () => arrival.left(),
    begin: () => arrival.begin(),
    warmArrival: (step) => arrival.warm(step),
    islandSetup: setups.next,
    onIslandSetup: setups.onSetup,
    islandSetups: setups.list,
    islandSetupGen: setups.gen,
    travel,
    battle: {
      get active() {
        return battles.active;
      },
      skip: () => battles.skip(),
      done: () => [...battles.done],
    },
    islandQuay(id) {
      const b = openIslands().find((i) => i.id === id);
      return b ? { ...b.quay, label: b.name } : null;
    },
    where: () =>
      mode === 'walk' || mode === 'transition'
        ? { x: player.x, z: player.z, heading: player.heading, onShip: false, place: berth.name }
        : { x: dyn.pose.x, z: dyn.pose.z, heading: dyn.pose.heading, onShip: true, place: berth.name },
    player,
    hud,
    world,
    camera: cam,
    npcs,
    debug: {
      starfish: () => cove.starfish.spots.map((sp) => ({ ...sp })),
      teleport(x, z, heading = player.heading, y) {
        player.teleport(world, x, z, heading, y);
        cam.snapBehind(heading);
      },
      board,
      dock,
      chests: () =>
        treasure.chests.map((c) => ({
          id: c.id,
          x: c.x,
          z: c.z,
          h: c.chest.group.rotation.y,
          opened: c.chest.opened,
        })),
      bottles: () => [
        ...Object.entries(treasure.bottleSpots).map(([id, p]) => ({
          id,
          x: p.x,
          z: p.z,
          read: !!learn?.isChestOpen(id),
        })),
        ...contentList.flatMap((c) => c.bottles?.() ?? []),
      ],
      island: (id) => (isIslandId(id) ? (contents.get(id)?.debug ?? null) : null),
      courseBoards: () =>
        (Object.keys(COURSE_BOARDS) as IslandId[]).map((id) => ({
          island: id,
          ...courseBoardSpot(COURSE_BOARDS[id]),
        })),
      puzzle: (id: string) => puzzles.find((p) => p.id === id)?.debug ?? null,
      liftSpots: () =>
        (contentHook('liftSpots')?.() ?? null) as ReturnType<GameSession['debug']['liftSpots']>,
      near: (x, z, r) => interactions.within(x, z, r),
      talk: (id) => {
        const n = talk.everyone().find((v) => v.spec.id === id);
        if (!n || mode !== 'walk') return false;
        void talk.talkTo(n);
        return true;
      },
      liftAnchors: () =>
        (contentHook('liftAnchors')?.() ?? { liftBottom: null, liftTop: null }) as ReturnType<
          GameSession['debug']['liftAnchors']
        >,
      liftCamera: () =>
        (contentHook('liftCamera')?.() ?? null) as ReturnType<GameSession['debug']['liftCamera']>,
      rheaAboard: () => !!contentHook('rheaAboard')?.(),
      lighthouseLit: () => !!contentHook('lighthouseLit')?.(),
      anchorageLighthouseLit: () => village.lighthouseLit(),
      lighthouseTransit: () => lighthouse.transit,
      cast: () =>
        contentList
          .flatMap((c) => c.npcs)
          .map((n) => ({
            id: n.spec.id,
            name: n.spec.name,
            x: n.x,
            y: n.y,
            z: n.z,
            h: n.heading,
            clip: n.spec.clip,
            ground: world.groundAt(n.x, n.z),
          })),
      quest: (id: string, step: string) => setQuest(id, step),
      /** Holds the camera on a shot (tests' stills), or hands it back to the follow camera (null). */
      shot: (shot) => (shot ? cam.cut(shot) : cam.release()),
      /** The live sea (Settings → Sea state), and whether a battle or course holds it fixed. */
      sea: () => ({
        chosen: seaState.chosen,
        fixed: seaState.fixed,
        settled: seaState.settled,
        windSpeed: seaState.live.windSpeed,
        amp: seaState.live.amp.slice(),
      }),
      sailTo(x, z, heading) {
        prefetchSailTarget();
        if (mode === 'sail') dyn.reset(x, z, heading);
      },
      gangway: () => ({ down: gangwayDown, foot: { ...plank.foot }, top: { ...plank.top } }),
      hint,
      welcome: welcome.run,
      learningPause: welcome.queue,
      wingman: () =>
        wingman
          ? {
              phase: wingman.phase,
              x: +wingman.root.position.x.toFixed(2),
              y: +wingman.root.position.y.toFixed(2),
              z: +wingman.root.position.z.toFixed(2),
              yaw: +Math.atan2(
                2 *
                  (wingman.root.quaternion.x * wingman.root.quaternion.z +
                    wingman.root.quaternion.w * wingman.root.quaternion.y),
                1 - 2 * (wingman.root.quaternion.x ** 2 + wingman.root.quaternion.y ** 2),
              ).toFixed(3),
            }
          : null,
      arrival: () => arrival.debug(),
      flyover(id: IslandId = island, fromChart = false) {
        if (mode !== 'walk') return;
        arrival.start(arrivalFlight(ISLANDS[id].arrival, fromChart), false);
      },
      holdArrival: (time) => arrival.hold(time),
      skipArrival() {
        if (arrival.active) void arrival.end('skipped');
      },
      battleRun: () => battles.current,
      sightings: () => ({ system: cove.sightings, allowed: sightings.allowed }),
      unloadIsland: setups.unload,
      keepResident: setups.keepResident,
      loadIsland: async (id) => void (await streams[id].load()),
      residency: setups.report,
      state: () => ({
        mode,
        x: +player.x.toFixed(2),
        y: +player.y.toFixed(2),
        z: +player.z.toFixed(2),
        heading: +player.heading.toFixed(3),
        speed: +player.speed.toFixed(2),
        surface: player.surface,
        depth: +player.depth.toFixed(2),
        focus: interactions.current?.id ?? null,
        dialogue: dialogue.active,
        welcome: welcome.running,
        ship: {
          x: +dyn.pose.x.toFixed(2),
          z: +dyn.pose.z.toFixed(2),
          heading: +dyn.pose.heading.toFixed(3),
          speed: +dyn.forwardSpeed.toFixed(2),
          docked: dyn.dockComplete,
        },
        trim: helm.trim,
      }),
    },
    dispose() {
      disposed = true;
      // Anchorage's cast and chests while it's dormant are out of the scene (the voyage's end doesn't
      // see them): told they're disposed once they're freed below.
      const parkedContent = setups.dispose();
      battles.dispose(cam);
      learn?.reset();
      for (const p of puzzles) p.dispose();
      treasure.dispose();
      remove();
      dialogue.cancel();
      npcs.dispose();
      for (const c of contentList) c.dispose();
      markets.dispose();
      wingman?.dispose();
      hero.group.removeFromParent();
      hero.dispose();
      clearCharacterLodView(hero.group);
      footstepPuffs.dispose();
      hud.dispose();
      releaseRemovedObjects(parkedContent, engine.scene);
    },
  };
}

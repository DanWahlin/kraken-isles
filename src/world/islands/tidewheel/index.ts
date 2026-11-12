import {
  BoxGeometry,
  BufferAttribute,
  Group,
  Mesh,
  PlaneGeometry,
  Vector3,
  type BufferGeometry,
  type Camera,
  type Material,
} from 'three/webgpu';
import { seatBlock } from '../../characters/seat-fit';
import type { CircleObstacle, HeightField } from '../../contracts';
import type { TierSettings } from '../../../engine/quality';
import {
  createLighthouseHaloMaterial,
  createLighthouseLitMaterial,
  lampBurning,
} from '../../lighthouse-lamp';
import type { CreateBirdsOptions } from '../../life/birds';
import type { PlantInstance } from '../../vegetation/types';
import type { VillageKit } from '../../village/kit';
import { makeBuckets } from '../../village/pieces';
import { moveBright, raiseIslandWorks, repaint, runSliced, type IslandCircuitWorld } from '../island-works';
import { TIDEWHEEL_ANCHORS } from './anchors';
import { at, makeOut, TW_PAINT, YAW_U, type TwOut, type TwShow } from './build';
import { COURT_PIECES, COURT_WALLS, RING_HOURS, RING_START, WORKS_PIECES } from './circuit';
import {
  COURT,
  LIGHTHOUSE,
  RING,
  ROCK_LIGHT,
  SQUARE,
  TERRACE,
  TERRACES,
  toWorld,
  WHEEL,
  WORKS,
} from './layout';
import { buildLighthouse, CLOCK_FACES, LAST_LEVER, LIGHT_SHAPE, STRIKE_BELL } from './lighthouse';
import {
  crankGeometry,
  drumGeometry,
  floatGeometry,
  hammerGeometry,
  handGeometry,
  leverGeometry,
  paintedGear,
  pegGeometry,
  ringGeometry,
  wheelGeometry,
} from './machines';
import { addTidewheelMarket } from './market';
import { createTidewheelMist } from './mist';
import { buildSights } from './sights';
import { BAND, SQUARE_PROPS } from './town';
import { buildTown } from './town-build';
import { tidewheelPlantsSliced } from './vegetation';
import { buildWorks } from './works';

/**
 * Tidewheel's world (spec §8; no gameplay here): the world its stream builds (`IslandStream.world`):
 * the port and its lamp-lit terraces, the Bandstand, Gear Square, the Wheel Works, the Clock Court and
 * the Bell Arch, the Clockwork Lighthouse, the Tide Wheel in the breach, the rock light, the hot
 * springs and their steam, and its plants. Its machines move: the wheel and the gears turn, the clock
 * runs, the levers swing, the figures strike, and (once sealed, or after dark) the lamp turns its beam.
 */
export interface TidewheelWorld {
  group: Group;
  /** Colliders, camera boxes, ship obstacles, walk decks and perches (for the wiring). */
  works: TwOut;
  /** Where the cast, the islanders and the stations stand. */
  anchors: typeof TIDEWHEEL_ANCHORS;
  /** The circuits' lamps (`lever:<place>`, `clock:<place>`). */
  circuit: IslandCircuitWorld;
  /** The quay's circles, for the ship. */
  shipObstacles(): CircleObstacle[];
  /** Picks the levels of detail for the camera, and turns the lights' halos to it (no allocation). */
  frame(camera: Camera): void;
  /** Gulls over the bay and petrels round the ring's top, for `addIslandBirds` (each flock's `kind`). */
  birds: {
    center: Vector3;
    radius: number;
    seed: number;
    perches: Vector3[];
    kind?: Pick<CreateBirdsOptions, 'scale' | 'altitude' | 'speed' | 'count' | 'lightness'>;
  }[];
  /** Pins the Works' drum with the pattern (or shows it blank). */
  pin(on: boolean): void;
  pinned(): boolean;
  /** Pulls the Works' great lever: it comes down, the Works run and the drum plays for `seconds`, then it returns. */
  pull(seconds: number): void;
  /** Whether the Works are running from a pull. */
  running(): boolean;
  /** Turns the Lighthouse's hour ring to `RING_HOURS[index]` (it eases there; `snap` at once). */
  ring(index: number, snap?: boolean): void;
  ringAt(): number;
  ringSettled(): boolean;
  /** Clears the nine peg from the peg board (or puts it back). */
  clearNine(on: boolean): void;
  /** Meshes the day gear with the clock train (it turns from then). */
  dayGear(on: boolean): void;
  /** The striking figures ring the bell once. */
  strike(): void;
  /** The tide gauge's float: 0 (out: the bay sleeps) to 1 (in). */
  tide(level: number, snap?: boolean): void;
  /** The last lever on the Lighthouse's terrace. */
  lastLever(down: boolean, snap?: boolean): void;
  /** The island's light: the Seal has lit the Lighthouse (it burns after dark without it: `lampBurning`). */
  setSealLit(on: boolean): void;
  sealLit(): boolean;
  /**
   * Shows or hides what the story shows: the pinned drum and the running Works (`ran`), the ring at
   * eight with the nine peg cleared and the day gear in mesh (`scheduled`), the Seal's banners.
   */
  show(what: TwShow, on: boolean, unroll?: boolean): void;
  showing(what: TwShow): boolean;
  /** Turns the machines and the lamp, unrolls cloth (within `detail`, by the stream's `shown`). */
  update(dt: number, t: number): void;
  /** The island's plants, built a slice at a time, for `vegetation.addPlants`. */
  plants(breathe: () => Promise<void>): Promise<PlantInstance[]>;
  dispose(): void;
}

export interface TidewheelWorldOptions {
  tier: TierSettings;
  /** The island's own baked ground. */
  heightField: HeightField;
  kit: VillageKit;
}

/** Petrels (spec T16): small, dark and fast, round the ring's top. */
const PETRELS = { scale: 0.7, altitude: [70, 120] as const, speed: 1.5, lightness: 0.14 };
const PETREL_COUNT: Record<TierSettings['tier'], number> = { lite: 0, low: 4, medium: 6, high: 9, ultra: 9 };

/** The Tide Wheel's turn (rad/s): the tide never stops. */
const WHEEL_SPIN = 0.22;
/** How fast a lever swings (rad/s), the ring turns (rad/s) and the float rises (1/s). */
const LEVER_SWING = 2.4;
const RING_TURN = 1.6;
const FLOAT_RISE = 0.5;
/** The lamp's beam: its length and thickness (m), its turn (rad/s) and its warm white. */
const BEAM = { length: 420, width: 0.9, spin: 0.5, paint: [1.5, 1.3, 0.9] as const };
/**
 * The paint gains (linear RGB) that turn the kit's tan plaster and brown paving toward the dark, cool
 * stone a piece is painted (`repaint`): the plaster's is one over its texture's mean colour, eased
 * (the walls keep a little warmth); the paving's and the stone's lift their blue.
 */
const PLASTER_GAIN = [1 / 0.5, 1 / 0.42, 1 / 0.3] as const;
const PAVING_GAIN = [1.25, 1.35, 1.6] as const;
const STONE_GAIN = [1.15, 1.22, 1.42] as const;

/** A hand's angle about its face's normal for `hour` of 12 (clockwise from the top as seen from outside). */
const hourAngle = (hour: number) => -((hour % 12) / 12) * Math.PI * 2;

/** Builds Tidewheel's world a few milliseconds a frame (`breathe` between parts). */
export async function createTidewheelWorldAsync(
  o: TidewheelWorldOptions,
  breathe: () => Promise<void>,
): Promise<TidewheelWorld> {
  const lite = o.tier.tier === 'lite';
  const group = new Group();
  group.name = 'tidewheel';
  const out = makeOut();
  const buckets = makeBuckets();
  for (const steps of [
    buildTown(buckets, out, lite),
    buildWorks(buckets, out, lite),
    buildLighthouse(buckets, out, lite),
    buildSights(buckets, out),
  ])
    await runSliced(steps, breathe);
  // Brass, bronze and green copper are painted metal here: the kit's metal reads brown at last light.
  moveBright(buckets.metal, buckets.cloth, 0.15);
  repaint(buckets.plaster, PLASTER_GAIN, 3);
  repaint(buckets.paving, PAVING_GAIN, 3);
  repaint(buckets.stone, STONE_GAIN, 3);
  addTidewheelMarket(buckets, out, lite || o.tier.tier === 'low');
  // Lyra's two players sit on blocks on the Bandstand (seat-fit.ts: the block's top is the anchor).
  for (const a of [TIDEWHEEL_ANCHORS.lyraPlayerA, TIDEWHEEL_ANCHORS.lyraPlayerB])
    seatBlock(buckets, a.x, a.z, a.heading, a.y - 0.2, a.y);
  // Many small plates: each is painted at 300 px a metre, so the atlas stays inside one texture.
  for (const s of out.signs) s.pixels ??= Math.round(Math.max(256, Math.min(640, s.w * 300)));
  const works = await raiseIslandWorks(
    { id: 'tidewheel', chunks: 'tw-town', tier: o.tier, kit: o.kit, group, buckets, out },
    breathe,
  );
  // The lamps that change: the stations' lamps, the Lighthouse's lamp and the rock light's.
  const { lamps } = works;
  lamps.set('light:lamp', 'banked');
  // The rock light burns whatever the bay does.
  lamps.set('rock:lamp', 'kindled');
  const mist = createTidewheelMist(o.tier, out.chimneys);
  if (mist) group.add(mist.sprite);

  const geos: BufferGeometry[] = [];
  /** A mesh of the world's own (it moves or the story shows it), in one of the kit's materials. */
  const piece = (
    name: string,
    g: BufferGeometry,
    key: 'metal' | 'cloth' | 'wood' = 'cloth',
    hidden = false,
  ) => {
    if (!geos.includes(g)) geos.push(g);
    const m = new Mesh(g, o.kit.materials[key] as Material);
    m.name = name;
    m.castShadow = true;
    if (hidden) {
      m.visible = false;
      // Shown for the island's warm-up, so its first real showing builds no shader mid-play.
      m.userData.prewarm = true;
    }
    group.add(m);
    return m;
  };
  /** The yaw that lays a mesh's local z along frame direction (du, dv), and its local x. */
  const origin = toWorld(0, 0);
  const yawZ = (du: number, dv: number) => {
    const p = toWorld(du, dv);
    return Math.atan2(p.x - origin.x, p.z - origin.z);
  };
  const yawX = (du: number, dv: number) => {
    const p = toWorld(du, dv);
    return Math.atan2(-(p.z - origin.z), p.x - origin.x);
  };

  // ---- The Tide Wheel in the breach ----
  const wheel = piece('tidewheel-wheel', wheelGeometry(), 'wood');
  const wp = at(WHEEL.u, WHEEL.y, WHEEL.v);
  wheel.position.set(wp.x, wp.y, wp.z);
  wheel.rotation.order = 'YXZ';
  wheel.rotation.y = yawZ(0, 1);
  await breathe();

  // ---- Gear Square's four gears: each turns against its neighbour ----
  const squareY = SQUARE.y + 0.03;
  const squareGears = SQUARE_PROPS.gears.map((g, i) => {
    const m = piece(
      `tidewheel-square-gear-${i}`,
      paintedGear(
        g.r,
        0.16,
        Math.round(g.r * 9),
        [TW_PAINT.brass, TW_PAINT.bronze, TW_PAINT.copper, TW_PAINT.brass][i]!,
      ),
    );
    const p = at(g.u, squareY + g.y, SQUARE_PROPS.wall - 0.55 - (i % 2) * 0.2);
    m.position.set(p.x, p.y, p.z);
    m.rotation.order = 'YXZ';
    m.rotation.y = yawZ(0, 1);
    return { m, rate: (i % 2 ? -1 : 1) * (0.5 / g.r) };
  });

  // ---- The Bandstand's drum and the Works' drum (blank, then pinned) ----
  const bandY = TERRACES[0].y + 0.03;
  const bd = BAND.drum;
  const bandDrum = piece('tidewheel-band-drum', drumGeometry(bd.r, bd.len, true));
  const bp = at(bd.u, bandY + bd.y, bd.v);
  bandDrum.position.set(bp.x, bp.y, bp.z);
  bandDrum.rotation.order = 'YXZ';
  bandDrum.rotation.y = yawX(1, 0);
  const worksY = WORKS.y + 0.03;
  const dp = at(WORKS_PIECES.drum.u, worksY + 1.15, WORKS_PIECES.drum.v);
  const drums = [false, true].map((pins) => {
    const m = piece(
      `tidewheel-works-drum-${pins ? 'pinned' : 'blank'}`,
      drumGeometry(0.42, 1.5, pins),
      'cloth',
      pins,
    );
    m.position.set(dp.x, dp.y, dp.z);
    m.rotation.order = 'YXZ';
    m.rotation.y = yawX(0, 1);
    return m;
  });

  // ---- The Works' great lever and its gear train ----
  const lever = piece('tidewheel-lever', leverGeometry(1.5));
  const lp = at(WORKS_PIECES.lever.u, worksY + 0.75, WORKS_PIECES.lever.v);
  lever.position.set(lp.x, lp.y, lp.z);
  lever.rotation.order = 'YXZ';
  lever.rotation.y = yawX(1, 0);
  const trainV = WORKS_PIECES.lever.v + 3.4;
  const train = (
    [
      [-1.25, 2.55, 1.05],
      [0.62, 2.6, 0.82],
      [1.82, 2.75, 0.5],
    ] as const
  ).map(([du, dy, r], i) => {
    const m = piece(
      `tidewheel-train-${i}`,
      paintedGear(r, 0.14, Math.round(r * 11), [TW_PAINT.brass, TW_PAINT.copper, TW_PAINT.bronze][i]!),
    );
    const p = at(WORKS_PIECES.lever.u + du, worksY + dy, trainV);
    m.position.set(p.x, p.y, p.z);
    m.rotation.order = 'YXZ';
    m.rotation.y = yawZ(0, 1);
    return { m, rate: (i % 2 ? -1 : 1) / r };
  });
  await breathe();

  // ---- The Clock Court's day gear, the ring's crank, the pegs and the gauge's float ----
  const courtY = COURT.y + 0.03;
  const dayGear = piece('tidewheel-day-gear', paintedGear(1.25, 0.16, 14, TW_PAINT.bronze));
  const dg = at(COURT_WALLS.east - 0.6, courtY + 1.9, COURT_PIECES.gear.v);
  dayGear.position.set(dg.x, dg.y, dg.z);
  dayGear.rotation.order = 'YXZ';
  dayGear.rotation.y = yawZ(1, 0);
  const crank = piece('tidewheel-crank', crankGeometry());
  const cp = at(COURT_PIECES.ring.u, courtY + 1.02, COURT_PIECES.ring.v);
  crank.position.set(cp.x, cp.y, cp.z);
  const pegGeo = pegGeometry();
  const pegAt = (k: number) => {
    const an = Math.PI * (0.08 + (0.84 * k) / 11);
    return at(
      COURT_WALLS.east - 0.09,
      courtY + 1.15 + Math.sin(an) * 0.95,
      COURT_PIECES.pegs.v + Math.cos(an) * 1.05,
    );
  };
  const pegs = [8, 7].map((hole, i) => {
    const m = piece(`tidewheel-peg-${i ? 'eight' : 'nine'}`, pegGeo, 'cloth', i === 1);
    const p = pegAt(hole);
    m.position.set(p.x, p.y, p.z);
    m.rotation.y = YAW_U;
    return m;
  });
  const float = piece('tidewheel-float', floatGeometry());
  let tideLevel = 0.75;
  let tideGoal = 0.75;
  const placeFloat = () => {
    const p = at(COURT_PIECES.tide.u, courtY + 0.55 + tideLevel * 1.55, COURT_PIECES.tide.v);
    float.position.set(p.x, p.y, p.z);
  };
  placeFloat();

  // ---- The Lighthouse: its cage's gears, the clock's hands and hour rings, the figures' hammers ----
  const L = LIGHTHOUSE;
  const cage = (
    [
      [-1.0, 59.75, 1.35, 0],
      [1.25, 59.55, 1.0, 0],
      [0.2, 61.05, 2.3, 1],
    ] as const
  ).map(([dv, y, r, flat], i) => {
    const g = paintedGear(r, 0.2, Math.round(r * 10), [TW_PAINT.brass, TW_PAINT.copper, TW_PAINT.bronze][i]!);
    if (flat) g.rotateX(Math.PI / 2);
    const m = piece(`tidewheel-cage-gear-${i}`, g);
    const p = flat ? at(L.u, y, L.v) : at(L.u - 1.2, y, L.v + dv);
    m.position.set(p.x, p.y, p.z);
    m.rotation.order = 'YXZ';
    if (!flat) m.rotation.y = yawZ(1, 0);
    return { m, flat: !!flat, rate: (i === 1 ? -1 : 1) * (0.6 / r) };
  });
  const handGeo = handGeometry(LIGHT_SHAPE.face - 0.6, 0.16, TW_PAINT.ink);
  const ringGeo = ringGeometry(LIGHT_SHAPE.face - 0.95);
  const faces = CLOCK_FACES.map((f, i) => {
    const off = LIGHT_SHAPE.drum + 0.27;
    const p = at(L.u + f.fu * off, L.clock, L.v + f.fv * off);
    const yaw = yawZ(f.fu, f.fv);
    const hand = piece(`tidewheel-clock-hand-${i}`, handGeo);
    const hourRing = piece(`tidewheel-clock-ring-${i}`, ringGeo);
    for (const m of [hand, hourRing]) {
      m.position.set(p.x, p.y, p.z);
      m.rotation.order = 'YXZ';
      m.rotation.y = yaw;
    }
    return { hand, hourRing };
  });
  const hammerGeo = hammerGeometry();
  const hammers = [-1, 1].map((s) => {
    const m = piece(`tidewheel-hammer-${s < 0 ? 'a' : 'b'}`, hammerGeo);
    const p = at(STRIKE_BELL.u + 0.1, LIGHT_SHAPE.baseTop + 0.25 + 1.22, STRIKE_BELL.v + s * 1.2);
    m.position.set(p.x, p.y, p.z);
    m.rotation.order = 'YXZ';
    // Its arm reaches in toward the bell between the figures.
    m.rotation.y = yawX(0, -s);
    return m;
  });
  const vane = piece('tidewheel-vane', paintedGear(0.9, 0.08, 10, TW_PAINT.brass));
  const vp = at(L.u, L.top - 1.1, L.v);
  vane.position.set(vp.x, vp.y, vp.z);
  vane.rotation.order = 'YXZ';
  vane.rotation.y = yawZ(1, 0);
  const lastLever = piece('tidewheel-last-lever', lever.geometry);
  const ll = at(LAST_LEVER.u, TERRACE.y + 0.03 + 0.75, LAST_LEVER.v);
  lastLever.position.set(ll.x, ll.y, ll.z);
  lastLever.rotation.order = 'YXZ';
  lastLever.rotation.y = yawX(1, 0);
  await breathe();

  // ---- The lamp's beam and the halos (the same two programs as every island's lit lamp) ----
  const lit = createLighthouseLitMaterial('tidewheel-beam');
  const beamGeo = new BoxGeometry(BEAM.length, BEAM.width, BEAM.width);
  const beamPaint = new Float32Array(beamGeo.getAttribute('position').count * 3);
  for (let i = 0; i < beamPaint.length; i += 3) beamPaint.set(BEAM.paint, i);
  beamGeo.setAttribute('color', new BufferAttribute(beamPaint, 3));
  const beam = new Mesh(beamGeo, lit);
  beam.name = 'tidewheel-beam';
  const lampP = at(L.u, (LIGHT_SHAPE.gallery + LIGHT_SHAPE.lampTop) / 2, L.v);
  beam.position.set(lampP.x, lampP.y, lampP.z);
  beam.visible = false;
  beam.userData.prewarm = true;
  beam.frustumCulled = false;
  beam.castShadow = false;
  beam.receiveShadow = false;
  group.add(beam);
  const haloMat = createLighthouseHaloMaterial('tidewheel-halo', true);
  const haloGeo = new PlaneGeometry(1, 1);
  const makeHalo = (name: string, p: { x: number; y: number; z: number }, size: number, on: boolean) => {
    const m = new Mesh(haloGeo, haloMat);
    m.name = name;
    m.position.set(p.x, p.y, p.z);
    m.scale.setScalar(size);
    m.visible = on;
    m.userData.prewarm = !on;
    m.castShadow = false;
    m.receiveShadow = false;
    group.add(m);
    return m;
  };
  const lampHalo = makeHalo('tidewheel-lamp-halo', lampP, 18, false);
  const rock = at(ROCK_LIGHT.u, 0, ROCK_LIGHT.v);
  const rockHalo = makeHalo(
    'tidewheel-rock-halo',
    { x: rock.x, y: o.heightField.heightAt(rock.x, rock.z) + 6.6, z: rock.z },
    5,
    true,
  );
  const halos = [lampHalo, rockHalo];

  // ---- What the story and the circuits set ----
  const shown: Record<TwShow, boolean> = { ran: false, scheduled: false, sealed: false };
  let sealed = false;
  let lampOn = false;
  let pinnedNow = false;
  let runFor = 0;
  let leverAngle = 0;
  let lastAngle = 0;
  let lastDown = false;
  let ringIndex = RING_START;
  let ringAngle = hourAngle(RING_HOURS[RING_START]);
  let dayGearOn = false;
  let striking = -1;
  /** A lever's rest (up, leaning back) and its pulled angle (rad about its local x). */
  const LEVER_UP = -0.55;
  const LEVER_DOWN = 0.6;
  leverAngle = LEVER_UP;
  lastAngle = LEVER_UP;
  const placeMachines = () => {
    lever.rotation.x = leverAngle;
    lastLever.rotation.x = lastAngle;
    for (const f of faces) f.hourRing.rotation.z = ringAngle;
  };
  placeMachines();
  const setPinned = (on: boolean) => {
    pinnedNow = on;
    drums[0]!.visible = !on;
    drums[1]!.visible = on;
  };
  const setRing = (index: number, snap = false) => {
    ringIndex = Math.max(0, Math.min(RING_HOURS.length - 1, index));
    if (snap) {
      ringAngle = hourAngle(RING_HOURS[ringIndex]!);
      placeMachines();
    }
  };
  const setNine = (cleared: boolean) => {
    pegs[0]!.visible = !cleared;
    pegs[1]!.visible = cleared;
  };
  const setLastLever = (down: boolean, snap = false) => {
    lastDown = down;
    if (snap) {
      lastAngle = down ? LEVER_DOWN : LEVER_UP;
      placeMachines();
    }
  };
  const paintLamp = () => {
    const on = lampBurning(sealed);
    if (on === lampOn) return;
    lampOn = on;
    lamps.set('light:lamp', on ? 'kindled' : 'banked');
    beam.visible = on;
    lampHalo.visible = on;
  };
  paintLamp();
  /** The hammers' rest (raised) and their swing through a strike (0-1). */
  const placeHammers = (k: number) => {
    // Up, then down onto the bell at a third of the way, then back.
    const hit = k < 0 ? 0 : k < 0.3 ? k / 0.3 : Math.max(0, 1 - (k - 0.3) / 0.7);
    for (const m of hammers) m.rotation.z = 0.75 - hit * 1.0;
  };
  placeHammers(-1);

  const bay = toWorld(-290, -60);
  const ring = toWorld(RING.u, RING.v);
  return {
    group,
    works: out,
    anchors: TIDEWHEEL_ANCHORS,
    circuit: works.circuit,
    shipObstacles: () => out.shipObstacles,
    birds: [
      { center: new Vector3(bay.x, 0, bay.z), radius: 150, seed: 0x7d0b1, perches: [] },
      {
        center: new Vector3(ring.x, 60, ring.z),
        radius: 250,
        seed: 0x7d0b2,
        perches: out.perches.slice(-6).map((p) => new Vector3(p.x, p.y, p.z)),
        kind: { ...PETRELS, count: PETREL_COUNT[o.tier.tier] },
      },
    ],
    pin: setPinned,
    pinned: () => pinnedNow,
    pull(seconds) {
      runFor = Math.max(runFor, seconds);
    },
    running: () => runFor > 0,
    ring: setRing,
    ringAt: () => ringIndex,
    ringSettled: () => Math.abs(ringAngle - hourAngle(RING_HOURS[ringIndex]!)) < 0.01,
    clearNine: setNine,
    dayGear(on) {
      dayGearOn = on;
    },
    strike() {
      striking = 0;
    },
    tide(level, snap = false) {
      tideGoal = Math.max(0, Math.min(1, level));
      if (snap) {
        tideLevel = tideGoal;
        placeFloat();
      }
    },
    lastLever: setLastLever,
    setSealLit(on) {
      sealed = on;
      paintLamp();
    },
    sealLit: () => sealed,
    show(what, on, unroll = false) {
      shown[what] = on;
      works.show(what, on, unroll);
      if (what === 'ran') setPinned(on);
      if (what === 'scheduled') {
        setRing(on ? RING_HOURS.indexOf(8) : RING_START, !unroll);
        setNine(on);
        dayGearOn = on;
      }
      if (what === 'sealed') setLastLever(on, !unroll);
    },
    showing: (what) => shown[what],
    update(dt, t) {
      const step = Math.max(dt, 0);
      wheel.rotation.z -= WHEEL_SPIN * step;
      for (const g of squareGears) g.m.rotation.z += g.rate * step;
      // The clock train never stops: the cage's gears, the minute hands, the vane.
      for (const g of cage) {
        if (g.flat) g.m.rotation.y += g.rate * step;
        else g.m.rotation.z += g.rate * step;
      }
      for (const f of faces) f.hand.rotation.z -= 0.105 * step;
      vane.rotation.z += 0.35 * step;
      bandDrum.rotation.x += 0.5 * step;
      // The Works: in gear once the report has run by hand; fast while a pull runs.
      const live = runFor > 0 ? 3.2 : shown.ran ? 0.5 : 0;
      if (live > 0) {
        for (const g of train) g.m.rotation.z += g.rate * live * step;
        for (const d of drums) d.rotation.x += 0.4 * live * step;
      }
      if (runFor > 0) runFor = Math.max(0, runFor - step);
      const leverGoal = runFor > 0 ? LEVER_DOWN : LEVER_UP;
      if (leverAngle !== leverGoal) {
        const d = leverGoal - leverAngle;
        leverAngle += Math.abs(d) <= LEVER_SWING * step ? d : Math.sign(d) * LEVER_SWING * step;
        lever.rotation.x = leverAngle;
      }
      const lastGoal = lastDown ? LEVER_DOWN : LEVER_UP;
      if (lastAngle !== lastGoal) {
        const d = lastGoal - lastAngle;
        lastAngle += Math.abs(d) <= LEVER_SWING * step ? d : Math.sign(d) * LEVER_SWING * step;
        lastLever.rotation.x = lastAngle;
      }
      if (dayGearOn) dayGear.rotation.z += 0.45 * step;
      const ringGoal = hourAngle(RING_HOURS[ringIndex]!);
      if (ringAngle !== ringGoal) {
        const d = ringGoal - ringAngle;
        ringAngle += Math.abs(d) <= RING_TURN * step ? d : Math.sign(d) * RING_TURN * step;
        for (const f of faces) f.hourRing.rotation.z = ringAngle;
        crank.rotation.y = ringAngle * 3;
      }
      if (tideLevel !== tideGoal) {
        const d = tideGoal - tideLevel;
        tideLevel += Math.abs(d) <= FLOAT_RISE * step ? d : Math.sign(d) * FLOAT_RISE * step;
        placeFloat();
      }
      if (striking >= 0) {
        striking += step / 0.9;
        if (striking >= 1) striking = -1;
        placeHammers(striking);
      }
      paintLamp();
      if (lampOn) beam.rotation.y = t * BEAM.spin;
      works.update(dt);
    },
    frame(camera) {
      works.frame(camera);
      for (const h of halos) if (h.visible) h.quaternion.copy(camera.quaternion);
    },
    plants: (breatheNow) => runSliced(tidewheelPlantsSliced(o.tier.tier, o.heightField), breatheNow),
    dispose() {
      works.dispose();
      mist?.dispose();
      for (const geo of geos) geo.dispose();
      beamGeo.dispose();
      haloGeo.dispose();
      lit.dispose();
      haloMat.dispose();
    },
  };
}

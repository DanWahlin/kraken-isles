import {
  BoxGeometry,
  BufferAttribute,
  CylinderGeometry,
  Group,
  Mesh,
  PlaneGeometry,
  Vector3,
  type Camera,
} from 'three/webgpu';
import { seatBlock } from '../../characters/seat-fit';
import type { CircleObstacle, HeightField } from '../../contracts';
import type { TierSettings } from '../../../engine/quality';
import {
  createLighthouseHaloMaterial,
  createLighthouseLitMaterial,
  lampBurning,
} from '../../lighthouse-lamp';
import type { BirdsSystem, CreateBirdsOptions } from '../../life/birds';
import type { PlantInstance } from '../../vegetation/types';
import type { VillageKit } from '../../village/kit';
import { makeBuckets } from '../../village/pieces';
import { flatPaint, raiseIslandWorks, runSliced, type IslandCircuitWorld } from '../island-works';
import { SUNSPIRE_ANCHORS } from './anchors';
import { at, makeOut, YAW_U, type SsOut, type SsShow } from './build';
import { BEAM_ENDS, MIRROR } from './circuit';
import { LIBRARY_ROCK, NEEDLE, SPIRE, toWorld } from './layout';
import { addSunspireMarket } from './market';
import { BENCH_CRATE, buildMesa, mirrorHeadGeometry } from './mesa';
import { buildSpire } from './spire';
import { buildTown } from './town-build';
import { sunspirePlantsSliced } from './vegetation';
import { createSunspireWaterMesh } from './water-mesh';

/**
 * Sunspire's world (spec §8; no gameplay here): the world its stream builds (`IslandStream.world`):
 * its fresh water and the Weeping Wall, the port, the caravanserai and the bazaar, the oasis camp, the
 * Low Mesa's Signal House, Mirror Court and Crate Yard, the Sunspire on the High Mesa, the Needle's
 * relay and Library Rock's light, and its plants. The court's great mirror turns (`aim`) and throws a
 * beam; the Sunspire's mirror flashes.
 */
export interface SunspireWorld {
  group: Group;
  /** Colliders, camera boxes, ship obstacles, walk decks and perches (for the wiring). */
  works: SsOut;
  /** Where the cast, the islanders and the stations stand. */
  anchors: typeof SUNSPIRE_ANCHORS;
  /** The circuits' lamps (`signal:<place>`, `crate:<place>`). */
  circuit: IslandCircuitWorld;
  /** The quay's circles, for the ship. */
  shipObstacles(): CircleObstacle[];
  /** Picks the levels of detail for the camera, and turns the lights' halos to it (no allocation). */
  frame(camera: Camera): void;
  /** Gulls over the cove and raptors over the tables, for `addIslandBirds` (each flock's `kind`). */
  birds: {
    center: Vector3;
    radius: number;
    seed: number;
    perches: Vector3[];
    kind?: Pick<CreateBirdsOptions, 'scale' | 'altitude' | 'speed' | 'count' | 'lightness'>;
  }[];
  /** The raptors over the tables (the stream sets them; null on Lite or without birds). */
  raptors: BirdsSystem | null;
  /**
   * Turns the court's great mirror to bearing `index` of `BEAM_ENDS` (it eases there; `snap` at once).
   * Its beam, when on, follows it.
   */
  aim(index: number, snap?: boolean): void;
  /** The bearing the mirror is set to. */
  aimed(): number;
  /** The court's beam: off, or on (it runs on from the Sunspire to Library Rock when it lands there). */
  beam(on: boolean): void;
  /** Whether the beam is on and lands on the Sunspire. */
  landed(): boolean;
  /** The island's light: the Seal has lit the Sunspire (it burns after dark without it: `lampBurning`). */
  setSealLit(on: boolean): void;
  sealLit(): boolean;
  /**
   * Holds the Sunspire's own flash off for `seconds` (the mirror's dial is open: the tower must stay
   * dark until the beam lands on it, so its answer reads).
   */
  hush(seconds: number): void;
  /**
   * Shows or hides what the story shows: the tower's flag (the beam has landed), the opened crate (its
   * lid off and its tag out), the Seal's banners.
   */
  show(what: SsShow, on: boolean, unroll?: boolean): void;
  showing(what: SsShow): boolean;
  /** Turns the mirror, flashes the Sunspire, unrolls cloth (within `detail`, by the stream's `shown`). */
  update(dt: number, t: number): void;
  /** The island's plants, built a slice at a time, for `vegetation.addPlants`. */
  plants(breathe: () => Promise<void>): Promise<PlantInstance[]>;
  dispose(): void;
}

export interface SunspireWorldOptions {
  tier: TierSettings;
  /** The island's own baked ground (the drawn ground: the water's depth reads over it). */
  heightField: HeightField;
  kit: VillageKit;
}

/** Raptors (spec S14): big, slow and dark, high over the tables. */
const RAPTORS = { scale: 1.5, altitude: [60, 140] as const, speed: 0.6, lightness: 0.14 };
const RAPTOR_COUNT: Record<TierSettings['tier'], number> = { lite: 0, low: 3, medium: 4, high: 6, ultra: 6 };

/** How fast the mirror turns to a new bearing (rad/s). */
const MIRROR_TURN = 2.2;
/** The beam's thickness (m) and its warm white (over 1: the lit material adds it to the scene). */
const BEAM_WIDTH = 0.22;
const BEAM_PAINT = [1.5, 1.36, 1.0] as const;
/** The amber sheath round the court's beam: this many times the beam's thickness, and its colour. */
const SHEATH = 2.4;
const SHEATH_PAINT = [1.9, 0.62, 0.05] as const;
/** The Sunspire's flash: its mirror kindles for `on` s of every `every` s. */
const FLASH = { every: 3.4, on: 0.5 } as const;

/** Builds Sunspire's world a few milliseconds a frame (`breathe` between parts). */
export async function createSunspireWorldAsync(
  o: SunspireWorldOptions,
  breathe: () => Promise<void>,
): Promise<SunspireWorld> {
  const lite = o.tier.tier === 'lite';
  const group = new Group();
  group.name = 'sunspire';
  const water = createSunspireWaterMesh((x, z) => o.heightField.heightAt(x, z));
  group.add(water.mesh);
  await breathe();
  const out = makeOut();
  const buckets = makeBuckets();
  for (const steps of [
    buildTown(buckets, out, lite),
    buildMesa(buckets, out, lite),
    buildSpire(buckets, out, lite),
  ])
    await runSliced(steps, breathe);
  addSunspireMarket(buckets, out, lite || o.tier.tier === 'low');
  // Lyra's two players sit on blocks under the arcade (seat-fit.ts: the block's top is the anchor).
  for (const a of [SUNSPIRE_ANCHORS.lyraPlayerA, SUNSPIRE_ANCHORS.lyraPlayerB])
    seatBlock(buckets, a.x, a.z, a.heading, a.y - 0.2, a.y);
  const works = await raiseIslandWorks(
    { id: 'sunspire', chunks: 'ss-town', tier: o.tier, kit: o.kit, group, buckets, out },
    breathe,
  );
  // The lamps that change: the stations' lamps and the three mirrors' faces.
  const { lamps } = works;
  for (const key of ['spire:mirror', 'needle:mirror', 'library:lamp']) lamps.set(key, 'banked');

  // The court's great mirror: its head turns about the stand's post.
  const headGeo = mirrorHeadGeometry();
  const head = new Mesh(headGeo, o.kit.materials.metal);
  head.name = 'sunspire-mirror-head';
  const mp = at(MIRROR.u, MIRROR.head, MIRROR.v);
  head.position.set(mp.x, mp.y, mp.z);
  head.rotation.order = 'YZX';
  head.castShadow = true;
  group.add(head);
  /** Each bearing's end in the world, and the head's yaw and tilt toward it. */
  const ends = BEAM_ENDS.map((e) => {
    const p = at(e.u, e.y, e.v);
    const dx = p.x - mp.x;
    const dy = p.y - mp.y;
    const dz = p.z - mp.z;
    const flat = Math.hypot(dx, dz);
    return { ...p, len: Math.hypot(flat, dy), yaw: Math.atan2(-dz, dx), tilt: Math.atan2(dy, flat) };
  });
  const spireIndex = BEAM_ENDS.findIndex((e) => e.id === 'spire');

  // The beams: the court's (it follows the mirror) and the two hops on from the Sunspire, all in the
  // lit-lamp material (additive: the same program as every island's lit lamp).
  const lit = createLighthouseLitMaterial('sunspire-beam');
  const beamGeo = new BoxGeometry(1, BEAM_WIDTH, BEAM_WIDTH);
  beamGeo.translate(0.5, 0, 0);
  const paint = new Float32Array(beamGeo.getAttribute('position').count * 3);
  for (let i = 0; i < paint.length; i += 3) paint.set(BEAM_PAINT, i);
  beamGeo.setAttribute('color', new BufferAttribute(paint, 3));
  const makeBeam = (name: string) => {
    const m = new Mesh(beamGeo, lit);
    m.name = name;
    m.rotation.order = 'YZX';
    m.visible = false;
    // Shown for the island's warm-up, so its first real showing builds no shader mid-play.
    m.userData.prewarm = true;
    m.frustumCulled = false;
    m.castShadow = false;
    m.receiveShadow = false;
    group.add(m);
    return m;
  };
  const beam = makeBeam('sunspire-beam');
  beam.position.copy(head.position);
  // The court beam's sheath: a wider ribbon of strong amber in the same lit material, so the beam
  // reads over sunlit sand (a warm white on pale sand is lost) as well as against the sky.
  const sheathGeo = beamGeo.clone();
  const amber = new Float32Array(sheathGeo.getAttribute('position').count * 3);
  for (let i = 0; i < amber.length; i += 3) amber.set(SHEATH_PAINT, i);
  sheathGeo.setAttribute('color', new BufferAttribute(amber, 3));
  const sheath = new Mesh(sheathGeo, lit);
  sheath.name = 'sunspire-beam-sheath';
  sheath.rotation.order = 'YZX';
  sheath.visible = false;
  sheath.userData.prewarm = true;
  sheath.frustumCulled = false;
  sheath.castShadow = false;
  sheath.receiveShadow = false;
  sheath.position.copy(head.position);
  group.add(sheath);
  /** Lays a beam from `a` to `b`. */
  const lay = (m: Mesh, a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    const flat = Math.hypot(dx, dz);
    m.position.set(a.x, a.y, a.z);
    m.rotation.set(0, Math.atan2(-dz, dx), Math.atan2(dy, flat));
    m.scale.set(Math.hypot(flat, dy), 1, 1);
  };
  const spireMirror = at(SPIRE.u - 4, SPIRE.mirror, SPIRE.v);
  const needleTop = toWorld(NEEDLE.u, NEEDLE.v);
  const needleMirror = {
    x: needleTop.x,
    y: o.heightField.heightAt(needleTop.x, needleTop.z) + 5.2,
    z: needleTop.z,
  };
  const rock = toWorld(LIBRARY_ROCK.u, LIBRARY_ROCK.v);
  const rockLamp = { x: rock.x, y: o.heightField.heightAt(rock.x, rock.z) + 9.2, z: rock.z };
  const hopA = makeBeam('sunspire-beam-needle');
  lay(hopA, spireMirror, needleMirror);
  const hopB = makeBeam('sunspire-beam-library');
  lay(hopB, needleMirror, rockLamp);

  // The halos: a soft glint at the Sunspire's mirror (the weenie's flash, seen from the sea), one at
  // the beam's end, one at Library Rock's lamp. Billboards, turned to the camera in `frame`.
  const haloMat = createLighthouseHaloMaterial('sunspire-halo', true);
  const haloGeo = new PlaneGeometry(1, 1);
  const makeHalo = (name: string, p: { x: number; y: number; z: number }, size: number) => {
    const m = new Mesh(haloGeo, haloMat);
    m.name = name;
    m.position.set(p.x, p.y, p.z);
    m.scale.setScalar(size);
    m.visible = false;
    m.userData.prewarm = true;
    m.castShadow = false;
    m.receiveShadow = false;
    group.add(m);
    return m;
  };
  const spireHalo = makeHalo('sunspire-spire-halo', at(SPIRE.u - 4.4, SPIRE.mirror, SPIRE.v), 16);
  const endHalo = makeHalo('sunspire-beam-end', mp, 5.5);
  const rockHalo = makeHalo('sunspire-library-halo', rockLamp, 9);
  const halos = [spireHalo, endHalo, rockHalo];
  await breathe();

  // The sealed crate's lid on Samir's bench: on the crate until the story opens it, then stood on the
  // bench leaning on the crate's side, with the guide's scroll standing in the crate.
  const lidGeo = flatPaint(new BoxGeometry(BENCH_CRATE.w + 0.06, 0.07, BENCH_CRATE.d + 0.06), 0x9a7850);
  const lid = new Mesh(lidGeo, o.kit.materials.wood);
  lid.name = 'sunspire-crate-lid';
  lid.castShadow = true;
  const lidOn = at(BENCH_CRATE.u, BENCH_CRATE.top + 0.035, BENCH_CRATE.v);
  // Off: on its end on the bench top, its upper end against the crate's east side.
  const LEAN = 1.2;
  const half = (BENCH_CRATE.w + 0.06) / 2;
  const lidOff = at(
    BENCH_CRATE.u + BENCH_CRATE.w / 2 + half * Math.cos(LEAN) + 0.05,
    BENCH_CRATE.top - 0.54 + half * Math.sin(LEAN) + 0.03,
    BENCH_CRATE.v,
  );
  group.add(lid);
  const scrollGeo = flatPaint(new CylinderGeometry(0.07, 0.07, 0.62, 10), 0xf0e6d0);
  const scroll = new Mesh(scrollGeo, o.kit.materials.cloth);
  scroll.name = 'sunspire-crate-scroll';
  const sp = at(BENCH_CRATE.u + 0.12, BENCH_CRATE.top + 0.12, BENCH_CRATE.v + 0.05);
  scroll.position.set(sp.x, sp.y, sp.z);
  scroll.rotation.set(0.32, YAW_U, 0.22);
  scroll.castShadow = true;
  scroll.userData.prewarm = true;
  group.add(scroll);
  let crateOpen = false;
  const placeCrate = () => {
    const p = crateOpen ? lidOff : lidOn;
    lid.position.set(p.x, p.y, p.z);
    lid.rotation.set(0, YAW_U, crateOpen ? -LEAN : 0, 'YZX');
    scroll.visible = crateOpen;
  };
  placeCrate();

  let aimIndex = 0;
  let hushed = 0;
  let yaw = ends[0]!.yaw;
  let tilt = ends[0]!.tilt;
  let beamOn = false;
  let sealed = false;
  let clock = 0;
  let flashing = false;
  const placeHead = () => {
    head.rotation.set(0, yaw, tilt);
    beam.rotation.set(0, yaw, tilt);
    sheath.rotation.set(0, yaw, tilt);
  };
  placeHead();
  /** Whether the head has come round to its bearing. */
  const settled = () => {
    const e = ends[aimIndex]!;
    return Math.abs(angleTo(yaw, e.yaw)) < 0.01 && Math.abs(tilt - e.tilt) < 0.01;
  };
  /** Shows the beam as it is now: the court's, its end's glint, and the hops when it lands. */
  const paintBeam = () => {
    const e = ends[aimIndex]!;
    const through = beamOn && aimIndex === spireIndex && settled();
    beam.visible = beamOn;
    beam.scale.set(e.len, 1, 1);
    sheath.visible = beamOn;
    sheath.scale.set(e.len, SHEATH, SHEATH);
    endHalo.visible = beamOn && settled() && !through;
    endHalo.position.set(e.x, e.y, e.z);
    hopA.visible = through;
    hopB.visible = through;
    rockHalo.visible = through || sealed;
    lamps.set('needle:mirror', through || sealed ? 'kindled' : 'banked');
    lamps.set('library:lamp', through || sealed || lampBurning(false) ? 'kindled' : 'banked');
  };
  paintBeam();

  const cove = toWorld(-260, -50);
  const tables = toWorld(170, 40);
  return {
    group,
    works: out,
    anchors: SUNSPIRE_ANCHORS,
    circuit: works.circuit,
    shipObstacles: () => out.shipObstacles,
    birds: [
      { center: new Vector3(cove.x, 0, cove.z), radius: 170, seed: 0x5a0b1, perches: [] },
      {
        center: new Vector3(tables.x, 40, tables.z),
        radius: 190,
        seed: 0x5a0b2,
        perches: out.perches.slice(-6).map((p) => new Vector3(p.x, p.y, p.z)),
        kind: { ...RAPTORS, count: RAPTOR_COUNT[o.tier.tier] },
      },
    ],
    raptors: null,
    aim(index, snap = false) {
      aimIndex = Math.max(0, Math.min(ends.length - 1, index));
      if (snap) {
        yaw = ends[aimIndex]!.yaw;
        tilt = ends[aimIndex]!.tilt;
        placeHead();
      }
      paintBeam();
    },
    aimed: () => aimIndex,
    beam(on) {
      beamOn = on;
      paintBeam();
    },
    landed: () => beamOn && aimIndex === spireIndex,
    setSealLit(on) {
      sealed = on;
      paintBeam();
    },
    sealLit: () => sealed,
    hush(seconds) {
      hushed = Math.max(hushed, seconds);
    },
    show(what, on, unroll = false) {
      works.show(what, on, unroll);
      if (what === 'crate') {
        crateOpen = on;
        placeCrate();
      }
    },
    showing: (what) => (what === 'crate' ? crateOpen : works.showing(what)),
    update(dt) {
      if (!settled()) {
        const e = ends[aimIndex]!;
        const step = MIRROR_TURN * Math.max(dt, 0);
        const d = angleTo(yaw, e.yaw);
        yaw += Math.abs(d) <= step ? d : Math.sign(d) * step;
        const dt2 = e.tilt - tilt;
        tilt += Math.abs(dt2) <= step ? dt2 : Math.sign(dt2) * step;
        placeHead();
        // The beam's end runs out to where the mirror points now: its full length once it's there.
        paintBeam();
      }
      // The Sunspire's mirror: a flash every few seconds; steady once the Seal has lit it or after dark.
      clock += Math.max(dt, 0);
      hushed = Math.max(0, hushed - Math.max(dt, 0));
      const steady = lampBurning(sealed);
      const answering = beamOn && aimIndex === spireIndex && settled();
      const on = steady || answering || (hushed <= 0 && clock % FLASH.every < FLASH.on);
      if (on !== flashing) {
        flashing = on;
        lamps.set('spire:mirror', on ? 'kindled' : 'banked');
        spireHalo.visible = on;
        if (lampBurning(false)) paintBeam();
      }
      works.update(dt);
    },
    frame(camera) {
      works.frame(camera);
      for (const h of halos) if (h.visible) h.quaternion.copy(camera.quaternion);
    },
    plants: (breatheNow) => runSliced(sunspirePlantsSliced(o.tier.tier, o.heightField), breatheNow),
    dispose() {
      water.dispose();
      works.dispose();
      headGeo.dispose();
      lidGeo.dispose();
      sheathGeo.dispose();
      scrollGeo.dispose();
      beamGeo.dispose();
      haloGeo.dispose();
      lit.dispose();
      haloMat.dispose();
    },
  };
}

/** The shortest turn (rad) from angle `a` to angle `b`. */
function angleTo(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  PlaneGeometry,
  Vector3,
  type Camera,
  type Material,
} from 'three/webgpu';
import { seatBlock } from '../../characters/seat-fit';
import type { CircleObstacle, HeightField } from '../../contracts';
import type { TierSettings } from '../../../engine/quality';
import { createLighthouseHaloMaterial, lampBurning } from '../../lighthouse-lamp';
import type { CreateBirdsOptions } from '../../life/birds';
import type { PlantInstance } from '../../vegetation/types';
import type { VillageKit } from '../../village/kit';
import { makeBuckets } from '../../village/pieces';
import { flatPaint, raiseIslandWorks, repaint, runSliced, type IslandCircuitWorld } from '../island-works';
import { plateGeometry } from '../plate-geometry';
import { INKWELL_ANCHORS } from './anchors';
import { at, IW_PAINT, makeOut, YAW_U, type IwOut, type IwShow } from './build';
import { CIRCUIT_SPOTS, GUILD_BOARD, LOGGIA_WALLS, RACK, RAIL, RAIL_PARK } from './circuit';
import { buildDome } from './dome';
import { COURT, DOME, GREAT_CHART, LOGGIA, STACKS, toWorld } from './layout';
import { addInkwellMarket } from './market';
import { buildPlaza, chartPoint, KITE_POSTS, RAIL_STAGES } from './plaza';
import { buildTown } from './town-build';
import { inkwellPlantsSliced } from './vegetation';

/**
 * Inkwell's world (spec §8; no gameplay here): the world its stream builds (`IslandStream.world`):
 * the port and its three terraces, the Gossip Stair, the Plaza, the Loggia, the Draughting Terrace,
 * the Kite Walk, the Chart Court with the Great Chart, the Dome, and its plants. The Dome's quill
 * turns with the wind, kites fly over the Kite Walk, the Great Chart's brass marker slides along its
 * rail (`marker`), slates hang on the rack, and ink washes off the chart.
 */
export interface InkwellWorld {
  group: Group;
  /** Colliders, camera boxes, ship obstacles, walk decks and perches (for the wiring). */
  works: IwOut;
  /** Where the cast, the islanders and the stations stand. */
  anchors: typeof INKWELL_ANCHORS;
  /** The circuits' lamps (`board:<place>`, `slate:<place>`, `chart:<place>`, `rail:<stage>`). */
  circuit: IslandCircuitWorld;
  /** The quay's circles and the stacks, for the ship. */
  shipObstacles(): CircleObstacle[];
  /** Picks the levels of detail for the camera, and turns the light's halo to it (no allocation). */
  frame(camera: Camera): void;
  /** Gulls over the cove and along the cliff, for `addIslandBirds`. */
  birds: {
    center: Vector3;
    radius: number;
    seed: number;
    perches: Vector3[];
    kind?: Pick<CreateBirdsOptions, 'scale' | 'altitude' | 'speed' | 'count' | 'lightness'>;
  }[];
  /**
   * Slides the Great Chart's brass marker to post `index` of the rail (it eases there; `snap` at
   * once). −1 parks it before the first post.
   */
  marker(index: number, snap?: boolean): void;
  /** The post the marker is set to. */
  markerAt(): number;
  /** Whether the marker has come to rest. */
  markerSettled(): boolean;
  /** A wash of ink spreads over the chart from the marker's post and fades (a mark with no slate). */
  wash(): void;
  /** How many of the rack's five slates hang (the stages with recorded evidence), 0-5. */
  slates(count: number): void;
  slateCount(): number;
  /** The guild's card on the Loggia's board: in the first column, on Plan, or on Ready. */
  card(where: 'backlog' | 'plan' | 'ready', snap?: boolean): void;
  cardAt(): 'backlog' | 'plan' | 'ready';
  /** How many of the draughting slate's three boxes are ticked (0-3), and whether the mate's note is on it. */
  ticks(count: number, note?: boolean): void;
  /** The island's light: the Seal has lit the Dome (it burns after dark without it: `lampBurning`). */
  setSealLit(on: boolean): void;
  sealLit(): boolean;
  /**
   * Shows or hides what the story shows: the guild's pennant and the card on Ready (`borrowed`), the
   * slate's marks (`shared`), the rail's green posts and the rack's slates (`inked`), the Seal's
   * banners and the high kites (`sealed`).
   */
  show(what: IwShow, on: boolean, unroll?: boolean): void;
  showing(what: IwShow): boolean;
  /** Turns the quill, flies the kites, slides the marker and the card, unrolls cloth. */
  update(dt: number, t: number): void;
  /** The island's plants, built a slice at a time, for `vegetation.addPlants`. */
  plants(breathe: () => Promise<void>): Promise<PlantInstance[]>;
  dispose(): void;
}

export interface InkwellWorldOptions {
  tier: TierSettings;
  /** The island's own baked ground. */
  heightField: HeightField;
  kit: VillageKit;
}

/** How fast the marker slides along the rail and the card along the board (m/s). */
const SLIDE = 4.5;
/** How long a wash of ink takes to spread and fade (s). */
const WASH = 2.4;
/** The kites: how high each flies over its post (m), how far downwind, and its cloth. */
const KITES = [
  { post: 0, up: 15, out: 13, paint: IW_PAINT.madder },
  { post: 1, up: 19, out: 16, paint: IW_PAINT.saffron },
  // The Seal's kites, from the Dome's terrace (up only once the island is sealed).
  { post: -1, up: 24, out: 15, paint: IW_PAINT.cobalt },
  { post: -1, up: 30, out: 22, paint: IW_PAINT.magenta },
] as const;
/** The wind's heading (it blows from bearing 233°): the way a kite and the quill's feather lie. */
const DOWNWIND = { x: Math.sin((53 * Math.PI) / 180), z: -Math.cos((53 * Math.PI) / 180) } as const;

/**
 * The paint gains (linear RGB) that turn the kit's textures toward the colour a piece is painted: the
 * plaster's is one over its texture's mean colour (`tintFor` in veranda-house.ts); the paving's and the
 * stone's lift their brown toward pale limestone.
 */
const PLASTER_GAIN = [1 / 0.427, 1 / 0.344, 1 / 0.212] as const;
const PAVING_GAIN = [1.9, 2.05, 2.4] as const;
const STONE_GAIN = [1.5, 1.6, 1.85] as const;

/** Builds Inkwell's world a few milliseconds a frame (`breathe` between parts). */
export async function createInkwellWorldAsync(
  o: InkwellWorldOptions,
  breathe: () => Promise<void>,
): Promise<InkwellWorld> {
  const lite = o.tier.tier === 'lite';
  const group = new Group();
  group.name = 'inkwell';
  const out = makeOut();
  const buckets = makeBuckets();
  for (const steps of [
    buildTown(buckets, out, lite),
    buildPlaza(buckets, out, lite),
    buildDome(buckets, out, lite),
  ])
    await runSliced(steps, breathe);
  // The kit's plaster is tan and its paving brown: lift each piece's paint so whitewash reads white
  // and the floors read as pale limestone (the booth below keeps the kit's own look).
  repaint(buckets.plaster, PLASTER_GAIN, 4);
  repaint(buckets.paving, PAVING_GAIN, 3);
  repaint(buckets.stone, STONE_GAIN, 3);
  addInkwellMarket(buckets, out, lite || o.tier.tier === 'low');
  // Lyra's two players sit on blocks under the pergola (seat-fit.ts: the block's top is the anchor).
  for (const a of [INKWELL_ANCHORS.lyraPlayerA, INKWELL_ANCHORS.lyraPlayerB])
    seatBlock(buckets, a.x, a.z, a.heading, a.y - 0.2, a.y);
  // The stacks stand in the ship's way.
  for (const k of STACKS) {
    const p = toWorld(k.u, k.v);
    out.shipObstacles.push({ x: p.x, z: p.z, r: k.r + 6 });
  }
  // Inkwell has many lettered boards (desks, posts, plates): each is painted at 300 px a metre (a
  // metre of board covers about that on screen at the follow camera's distance), so the atlas stays
  // inside one texture.
  for (const s of out.signs) s.pixels ??= Math.round(Math.max(288, Math.min(640, s.w * 300)));
  const works = await raiseIslandWorks(
    { id: 'inkwell', chunks: 'iw-town', tier: o.tier, kit: o.kit, group, buckets, out },
    breathe,
  );
  // The lamps that change: the stations' lamps, the rail's five posts and the Dome's lamp.
  const { lamps } = works;
  lamps.set('dome:lamp', 'banked');
  for (const stage of RAIL_STAGES) lamps.set(`rail:${stage}`, 'dark');

  const geos: BufferGeometry[] = [];
  /** Paints a geometry one colour and keeps it for disposal. */
  const paintGeo = <G extends BufferGeometry>(g: G, hex: number): G => {
    geos.push(g);
    return flatPaint(g, hex);
  };
  /** A mesh of the world's own (it moves or the story shows it), in one of the kit's materials. */
  const piece = (
    name: string,
    g: BufferGeometry,
    key: 'metal' | 'cloth' | 'wood' | 'plaster',
    hidden = false,
  ) => {
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

  // The Dome's quill: a brass feather on the mast, its nib into the wind.
  // A feather cut from brass plate: the shaft along x (its nib at −x), the vane rising to +x.
  const quillGeo = plateGeometry(
    [
      [-3.6, 0],
      [-1.2, 0.5],
      [0.8, 1.25],
      [3.0, 1.1],
      [3.5, 0.1],
      [3.0, -0.5],
      [0.6, -0.55],
      [-1.4, -0.25],
    ],
    0.1,
  );
  // (In the cloth material: the kit's metal is dark iron, and the quill must read gold against the sky.)
  const quill = piece('inkwell-quill', paintGeo(quillGeo.scale(1.5, 1.5, 1.5), 0xffc83c), 'cloth');
  const dc = at(DOME.u, DOME.quill - 2.2, DOME.v);
  quill.position.set(dc.x, dc.y, dc.z);
  const windYaw = Math.atan2(-DOWNWIND.z, DOWNWIND.x);
  quill.rotation.set(0, windYaw, 0);

  // The kites: a diamond of cloth each, and a line down to its post (a thin box, scaled to reach).
  const kiteGeo = plateGeometry(
    [
      [0, 1.1],
      [0.8, 0.1],
      [0, -1.3],
      [-0.8, 0.1],
    ],
    0.02,
  );
  geos.push(kiteGeo);
  const lineGeo = paintGeo(new BoxGeometry(1, 0.02, 0.02).translate(0.5, 0, 0), 0xf4f0e4);
  const terraceP = INKWELL_ANCHORS.seal;
  const kites = lite
    ? []
    : KITES.map((k, i) => {
        const post = k.post >= 0 ? (KITE_POSTS as readonly { u: number; v: number }[])[k.post]! : null;
        const foot = post
          ? at(post.u, 0, post.v)
          : { x: terraceP.x + (i - 2) * 3, y: 0, z: terraceP.z + (i - 2) * 2 };
        const y0 = (post ? o.heightField.heightAt(foot.x, foot.z) : terraceP.y) + 1.4;
        const g = paintGeo(kiteGeo.clone(), k.paint);
        const mesh = piece(`inkwell-kite-${i}`, g, 'cloth', !post);
        const line = piece(`inkwell-kite-line-${i}`, lineGeo, 'cloth', !post);
        line.rotation.order = 'YZX';
        line.castShadow = false;
        return { ...k, mesh, line, x: foot.x, y: y0, z: foot.z, seed: i * 1.7 };
      });
  const flyKites = (t: number) => {
    for (const k of kites) {
      if (!k.mesh.visible) continue;
      // It rides the wind: a slow figure of eight downwind of its post.
      const sway = Math.sin(t * 0.5 + k.seed) * 2.2;
      const bob = Math.sin(t * 0.83 + k.seed * 2) * 1.2;
      const kx = k.x + DOWNWIND.x * k.out - DOWNWIND.z * sway;
      const kz = k.z + DOWNWIND.z * k.out + DOWNWIND.x * sway;
      const ky = k.y + k.up + bob;
      k.mesh.position.set(kx, ky, kz);
      k.mesh.rotation.set(-0.5, windYaw + Math.PI / 2 + Math.sin(t * 0.7 + k.seed) * 0.2, 0, 'YXZ');
      const dx = kx - k.x;
      const dy = ky - k.y;
      const dz = kz - k.z;
      const flat = Math.hypot(dx, dz);
      k.line.position.set(k.x, k.y, k.z);
      k.line.rotation.set(0, Math.atan2(-dz, dx), Math.atan2(dy, flat));
      k.line.scale.set(Math.hypot(flat, dy), 1, 1);
    }
  };
  flyKites(0);

  // The Great Chart's brass marker: a ring that rides the rail's bar from post to post.
  const railY = COURT.y + 0.03 + 1.2;
  const markerGeo = paintGeo(new CylinderGeometry(0.26, 0.26, 0.2, 16).rotateZ(Math.PI / 2), 0xffd45a);
  const markerMesh = piece('inkwell-rail-marker', markerGeo, 'cloth');
  markerMesh.rotation.y = YAW_U;
  const parkU = RAIL.posts[0]! - RAIL_PARK;
  let markerIndex = -1;
  let markerU = parkU;
  const markerTarget = () => (markerIndex < 0 ? parkU : RAIL.posts[markerIndex]! - 0.5);
  const placeMarker = () => {
    const p = at(markerU, railY, RAIL.v);
    markerMesh.position.set(p.x, p.y, p.z);
  };
  placeMarker();

  // The wash of ink: a flat disc on the chart that spreads from under the marker and fades by sinking.
  const washGeo = paintGeo(new CylinderGeometry(1, 1, 0.012, 20), IW_PAINT.ink);
  const washMesh = piece('inkwell-ink-wash', washGeo, 'plaster', true);
  washMesh.castShadow = false;
  let washT = -1;
  const chartY = COURT.y + 0.03 + 0.05;

  // The rack's five slates: dark boards with a pale label strip, hung peg by peg.
  const slateGeo = paintGeo(new BoxGeometry(0.05, 0.9, 0.8), IW_PAINT.slate);
  const labelGeo = paintGeo(new BoxGeometry(0.02, 0.2, 0.6), IW_PAINT.parchment);
  const slateMeshes = RACK.slots.map((dv, i) => {
    const m = piece(`inkwell-slate-${i}`, slateGeo, 'wood', true);
    const p = at(RACK.u - 0.14, COURT.y + 0.03 + 1.5, RACK.v + dv);
    m.position.set(p.x, p.y, p.z);
    m.rotation.y = YAW_U;
    const l = piece(`inkwell-slate-label-${i}`, labelGeo, 'cloth', true);
    const q = at(RACK.u - 0.18, COURT.y + 0.03 + 1.72, RACK.v + dv);
    l.position.set(q.x, q.y, q.z);
    l.rotation.y = YAW_U;
    return [m, l] as const;
  });
  let slateCount = 0;

  // Juno's pieces on the Great Chart: a brass sounding pin by each of five isles, set as a stage goes green.
  const pinGeo = paintGeo(new CylinderGeometry(0.02, 0.09, 0.7, 8).translate(0, 0.35, 0), IW_PAINT.brass);
  const pins = [
    [290, 300],
    [490, 165],
    [720, 150],
    [870, 330],
    [810, 520],
  ].map(([x, y], i) => {
    const c = chartPoint(x!, y!);
    const m = piece(`inkwell-chart-pin-${i}`, pinGeo, 'metal', true);
    const p = at(c.u - 1.5, chartY, c.v + 1.2);
    m.position.set(p.x, p.y, p.z);
    return m;
  });

  // The guild's card on the Loggia's board: it slides between the first column, Plan and Ready.
  const g = GUILD_BOARD;
  const cardGeo = paintGeo(new BoxGeometry(0.03, 0.34, 1.3), IW_PAINT.saffron);
  const cardMesh = piece('inkwell-board-card', cardGeo, 'cloth');
  cardMesh.rotation.y = YAW_U;
  const cardV = { backlog: g.v - g.w / 3, plan: g.v, ready: g.v + g.w / 3 } as const;
  const cardY = {
    backlog: LOGGIA.y + 0.03 + g.y - 0.82,
    plan: LOGGIA.y + 0.03 + g.y + 0.36,
    ready: LOGGIA.y + 0.03 + g.y + 0.36,
  } as const;
  let cardWhere: 'backlog' | 'plan' | 'ready' = 'backlog';
  let cardPos: number = cardV.backlog;
  let cardH: number = cardY.backlog;
  const placeCard = () => {
    const p = at(LOGGIA_WALLS.back + 0.16, cardH, cardPos);
    cardMesh.position.set(p.x, p.y, p.z);
  };
  placeCard();

  // The draughting slate's ticks (brass bars in its three boxes) and the mate's note (a pinned sheet).
  const slateSpot = CIRCUIT_SPOTS.slate.slate!;
  const tickGeo = paintGeo(new BoxGeometry(0.16, 0.16, 0.02), IW_PAINT.leaf);
  const tickMeshes = [0, 1, 2].map((k) => {
    const m = piece(`inkwell-slate-tick-${k}`, tickGeo, 'cloth', true);
    const p = at(slateSpot.look.u - 0.95, slateSpot.y + 0.03 + 1.75 - k * 0.33, slateSpot.look.v - 0.06);
    m.position.set(p.x, p.y, p.z);
    m.rotation.y = YAW_U;
    return m;
  });
  const noteGeo = paintGeo(new BoxGeometry(0.7, 0.5, 0.012), IW_PAINT.cream);
  const noteMesh = piece('inkwell-slate-note', noteGeo, 'cloth', true);
  {
    const p = at(slateSpot.look.u + 0.7, slateSpot.y + 0.03 + 0.52, slateSpot.look.v - 0.05);
    noteMesh.position.set(p.x, p.y, p.z);
    noteMesh.rotation.set(0, YAW_U, 0.05);
  }

  // The Dome's halo: a soft glint at its lamp (the weenie's light, seen from the sea).
  const haloMat = createLighthouseHaloMaterial('inkwell-halo', true);
  const haloGeo = new PlaneGeometry(1, 1);
  const halo = new Mesh(haloGeo, haloMat);
  halo.name = 'inkwell-dome-halo';
  const hp = at(DOME.u, DOME.gallery + 3.4, DOME.v);
  halo.position.set(hp.x, hp.y, hp.z);
  halo.scale.setScalar(18);
  halo.visible = false;
  halo.userData.prewarm = true;
  halo.castShadow = false;
  halo.receiveShadow = false;
  group.add(halo);
  await breathe();

  let sealed = false;
  let lit = false;
  const shown: Record<IwShow, boolean> = { borrowed: false, shared: false, inked: false, sealed: false };
  const paintSlates = () => {
    slateMeshes.forEach(([m, l], i) => {
      m.visible = i < slateCount;
      l.visible = i < slateCount;
    });
    pins.forEach((m, i) => (m.visible = i < slateCount));
  };
  const paintLamp = () => {
    const on = lampBurning(sealed);
    if (on === lit) return;
    lit = on;
    lamps.set('dome:lamp', on ? 'kindled' : 'banked');
    halo.visible = on;
  };
  paintLamp();

  const setMarker = (index: number, snap = false) => {
    markerIndex = Math.max(-1, Math.min(RAIL.posts.length - 1, index));
    if (snap) {
      markerU = markerTarget();
      placeMarker();
    }
  };
  const setSlates = (count: number) => {
    slateCount = Math.max(0, Math.min(RACK.slots.length, count));
    paintSlates();
  };
  const setCard = (where: 'backlog' | 'plan' | 'ready', snap = false) => {
    cardWhere = where;
    if (snap) {
      cardPos = cardV[where];
      cardH = cardY[where];
      placeCard();
    }
  };
  const setTicks = (count: number, note = false) => {
    tickMeshes.forEach((m, i) => (m.visible = i < count));
    noteMesh.visible = note;
  };
  const cove = toWorld(-260, -50);
  const cliff = toWorld(70, 190);
  return {
    group,
    works: out,
    anchors: INKWELL_ANCHORS,
    circuit: works.circuit,
    shipObstacles: () => out.shipObstacles,
    birds: [
      { center: new Vector3(cove.x, 0, cove.z), radius: 170, seed: 0x1b0b1, perches: [] },
      {
        center: new Vector3(cliff.x, 30, cliff.z),
        radius: 160,
        seed: 0x1b0b2,
        perches: out.perches.slice(-6).map((p) => new Vector3(p.x, p.y, p.z)),
      },
    ],
    marker: setMarker,
    markerAt: () => markerIndex,
    markerSettled: () => Math.abs(markerU - markerTarget()) < 0.01,
    wash() {
      washT = 0;
      const p = at(
        markerIndex < 0 ? GREAT_CHART.u : RAIL.posts[markerIndex]!,
        chartY + 0.07,
        GREAT_CHART.v + GREAT_CHART.halfV - 3,
      );
      washMesh.position.set(p.x, p.y, p.z);
      washMesh.scale.set(0.3, 1, 0.3);
      washMesh.visible = true;
    },
    slates: setSlates,
    slateCount: () => slateCount,
    card: setCard,
    cardAt: () => cardWhere,
    ticks: setTicks,
    setSealLit(on) {
      sealed = on;
      paintLamp();
    },
    sealLit: () => sealed,
    show(what, on, unroll = false) {
      shown[what] = on;
      works.show(what, on, unroll);
      if (what === 'borrowed') setCard(on ? 'ready' : 'backlog', !unroll);
      if (what === 'shared') setTicks(on ? 1 : 0, on);
      if (what === 'inked') {
        setSlates(on ? RACK.slots.length : 0);
        for (const stage of RAIL_STAGES) lamps.set(`rail:${stage}`, on ? 'ready' : 'dark');
        setMarker(on ? RAIL.posts.length - 1 : -1, !unroll);
      }
      if (what === 'sealed')
        for (const k of kites)
          if (k.post < 0) {
            k.mesh.visible = on;
            k.line.visible = on;
          }
    },
    showing: (what) => shown[what],
    update(dt, t) {
      const step = Math.max(dt, 0);
      // The quill swings a little about the wind's line.
      quill.rotation.y = windYaw + Math.sin(t * 0.31) * 0.22 + Math.sin(t * 1.3) * 0.04;
      flyKites(t);
      const mt = markerTarget();
      if (markerU !== mt) {
        const d = mt - markerU;
        markerU += Math.abs(d) <= SLIDE * step ? d : Math.sign(d) * SLIDE * step;
        placeMarker();
      }
      const cv = cardV[cardWhere];
      const ch = cardY[cardWhere];
      if (cardPos !== cv || cardH !== ch) {
        const d = cv - cardPos;
        cardPos += Math.abs(d) <= SLIDE * 0.5 * step ? d : Math.sign(d) * SLIDE * 0.5 * step;
        const e = ch - cardH;
        cardH += Math.abs(e) <= SLIDE * 0.5 * step ? e : Math.sign(e) * SLIDE * 0.5 * step;
        placeCard();
      }
      if (washT >= 0) {
        washT += step;
        const k = washT / WASH;
        if (k >= 1) {
          washT = -1;
          washMesh.visible = false;
        } else {
          // It spreads fast, holds, then thins away (the disc sinks into the chart).
          const r = 0.3 + 4.2 * Math.min(1, k * 2.5);
          washMesh.scale.set(r, 1, r * 0.7);
          washMesh.position.y = chartY + 0.07 - 0.09 * Math.max(0, (k - 0.5) * 2);
        }
      }
      paintLamp();
      works.update(dt);
    },
    frame(camera) {
      works.frame(camera);
      if (halo.visible) halo.quaternion.copy(camera.quaternion);
    },
    plants: (breatheNow) => runSliced(inkwellPlantsSliced(o.tier.tier, o.heightField), breatheNow),
    dispose() {
      works.dispose();
      for (const geo of geos) geo.dispose();
      haloGeo.dispose();
      haloMat.dispose();
    },
  };
}

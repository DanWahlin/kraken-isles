import { BufferGeometry } from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { box, cone, makeBuckets, rod, type Buckets } from '../../village/pieces';
import {
  at,
  door,
  GC_PAINT,
  ground,
  hangLantern,
  lowWall,
  rail,
  SIGN_CREAM,
  signAt,
  solid,
  stoneHall,
  ubox,
  windowPane,
  yawAlong,
  type GcOut,
} from './build';
import { CIRCUIT_SPOTS } from './circuit';
import { GUILDCREST_ANCHORS } from './anchors';
import { SIT, seatBlock } from '../../characters/seat-fit';
import { paint } from '../../village/kit';
import { MILL, MILL_TRACK, MILLS, RIDGE_PATH, YARD } from './layout';
import { JOURNEYMEN_HALL } from './town';

/**
 * Builds the Guild Crest (spec §3.7, G15, as built §15): the Guildhall of Journeymen on the yard's
 * south side (crow-stepped gables, its arched door and roll board on the yard), the yard's low walls,
 * its furniture (the writing desk, the peg rail of toolbelts, the proof table, the reading bench, the
 * test bench under its cloth), the station lamps, rails on the ridge path's steep side, and the three
 * stone tower mills. Each mill's sails are a separate piece (`MillSails`) that turns.
 */

/** Where the wind comes from (spec G2: 233°): the mills' sails face it. */
const WIND_TO = { x: 0.8, z: -0.6 };

/** A mill's sails: their geometry about the hub (axis +z), and where the hub is and how it faces. */
export interface MillSails {
  geometry: BufferGeometry;
  hub: { x: number; y: number; z: number };
  /** The sails' yaw (a heading: their axis, local +z, points downwind). */
  yaw: number;
}

export function* buildRidge(b: Buckets, out: GcOut, lite: boolean): Generator<void, MillSails[], void> {
  hall(b, out);
  yield;
  yard(b, out, lite);
  yield;
  ridgeRails(b, out);
  shepherdSeat(b, out);
  yield;
  const sails: MillSails[] = [];
  for (const m of MILLS) {
    const s = mill(b, out, m.u, m.v, m.y, lite);
    if (s) sails.push(s);
    yield;
  }
  return sails;
}

/** The Guildhall of Journeymen: a long stone hall, crow-stepped gables, its door and roll board on the yard. */
function hall(b: Buckets, out: GcOut): void {
  const h = JOURNEYMEN_HALL;
  const u = (h.u0 + h.u1) / 2;
  const v = (h.v0 + h.v1) / 2;
  const floor = YARD.y + 0.05;
  const { eaves } = stoneHall(
    b,
    out,
    u,
    v,
    'u',
    h.u1 - h.u0,
    h.v1 - h.v0,
    floor,
    6.5,
    4,
    GC_PAINT.stone,
    true,
  );
  door(b, h.door.u, h.v1 + 0.01, floor, 0, 1, 2.6, 3.4, GC_PAINT.door);
  // The arch over the door.
  ubox(b, 'stone', h.door.u, floor + 3.75, h.v1 + 0.08, 3.4, 0.5, 0.18, GC_PAINT.rubble);
  for (const du of [-9, -5, 4, 8]) {
    windowPane(b, h.door.u + du, h.v1 + 0.01, floor + 2.0, 0, 1, 1.0, 1.5);
    windowPane(b, h.door.u + du, h.v1 + 0.01, floor + 5.0, 0, 1, 0.8, 1.1);
  }
  // The roll board by the door (its words are the pack's; Rory's banner hangs on it once he's hired).
  ubox(
    b,
    'wood',
    CIRCUIT_SPOTS.belt.roll!.look.u,
    floor + 1.75,
    h.v1 + 0.06,
    2.4,
    1.6,
    0.08,
    GC_PAINT.timber,
  );
  ubox(b, 'wood', CIRCUIT_SPOTS.belt.roll!.look.u, floor + 2.62, h.v1 + 0.1, 2.6, 0.14, 0.14, GC_PAINT.tar);
  // Its heading across the top; Rory's banner, once he's hired, unrolls below it from the top rail.
  const ru = CIRCUIT_SPOTS.belt.roll!.look.u;
  out.signs.push(
    signAt(ru, floor + 2.3, h.v1 + 0.1, 0, 1, { lines: ['rollBoard'], w: 2.2, h: 0.34 }, 0.006),
    signAt(
      ru,
      floor + 2.1,
      h.v1 + 0.1,
      0,
      1,
      {
        lines: ['roryBanner'],
        w: 1.1,
        h: 1.0,
        look: 'cloth',
        show: 'rory',
        hang: true,
        pixels: 448,
      },
      0.016,
    ),
  );
  // Lanterns on brackets either side of the door (the door's and the roll board's station lamps).
  wallLamp(b, out, CIRCUIT_SPOTS.belt.door!.u + 2.2, h.v1, floor + 3.3, 0, 1, 'belt:door');
  wallLamp(b, out, CIRCUIT_SPOTS.belt.roll!.u - 1.8, h.v1, floor + 3.3, 0, 1, 'belt:roll');
  // A chimney on the east gable.
  const c = at(h.u1 - 2, 0, v);
  rod(
    b,
    'stone',
    { x: c.x, y: eaves + 2, z: c.z },
    { x: c.x, y: eaves + 5.4, z: c.z },
    0.5,
    6,
    GC_PAINT.rubble,
  );
  out.chimneys.push({ x: c.x, y: eaves + 5.9, z: c.z });
  out.perches.push(at(u, eaves + 4, v));
}

/** A station's lamp on an iron bracket out of a wall facing (fu, fv), its support `y`. */
export function wallLamp(
  b: Buckets,
  out: GcOut,
  u: number,
  v: number,
  y: number,
  fu: number,
  fv: number,
  lamp: string,
): void {
  const root = at(u, y, v);
  const tip = at(u + fu * 0.7, y, v + fv * 0.7);
  rod(b, 'metal', root, tip, 0.03, 4, GC_PAINT.iron);
  hangLantern(b, out, tip.x, y, tip.z, yawAlong(fu, fv), { lamp, look: 'dark' });
}

/** A station's lamp on a short post standing on a low wall's top (the yard's north and east walls). */
export function postLamp(
  b: Buckets,
  out: GcOut,
  u: number,
  v: number,
  armDu: number,
  armDv: number,
  lamp: string,
): void {
  const g = ground(u, v) + 1.1;
  const p = at(u, g, v);
  rod(b, 'metal', p, { x: p.x, y: g + 2.3, z: p.z }, 0.05, 5, GC_PAINT.iron);
  const tip = at(u + armDu * 0.6, g + 2.25, v + armDv * 0.6);
  // The arm from 2 cm into the post.
  const root = at(u + armDu * 0.03, g + 2.25, v + armDv * 0.03);
  rod(b, 'metal', root, tip, 0.03, 4, GC_PAINT.iron);
  hangLantern(b, out, tip.x, g + 2.25, tip.z, yawAlong(armDu, armDv), { lamp, look: 'dark' });
}

/** The yard: its low walls, its furniture and the station lamps. */
function yard(b: Buckets, out: GcOut, lite: boolean): void {
  const S = CIRCUIT_SPOTS.belt;
  const u0 = YARD.u - YARD.halfU;
  const u1 = YARD.u + YARD.halfU;
  const v1 = YARD.v + YARD.halfV;
  const y = YARD.y;
  // The north wall (a gap at its east end for the mill track) and the east wall.
  lowWall(b, out, [u0, v1 + 0.6], [101.5, v1 + 0.6]);
  lowWall(b, out, [u1 + 0.6, JOURNEYMEN_HALL.v1 + 0.4], [u1 + 0.6, v1 + 1.0]);
  // The writing desk with the indenture (north side), and its lamp on the wall behind it.
  ubox(b, 'wood', S.indenture!.look.u, y + 0.8, S.indenture!.look.v, 1.6, 0.08, 0.8, GC_PAINT.timber);
  for (const du of [-0.7, 0.7])
    ubox(b, 'wood', S.indenture!.look.u + du, y + 0.4, S.indenture!.look.v, 0.08, 0.8, 0.7, GC_PAINT.timber);
  ubox(b, 'wood', S.indenture!.look.u, y + 0.85, S.indenture!.look.v, 0.5, 0.012, 0.36, 0xefe6d0);
  solid(out, S.indenture!.look.u, S.indenture!.look.v, 1.7, 0.9, y, y + 0.9, false);
  postLamp(b, out, S.indenture!.u + 2.2, v1 + 0.6, 0, -1, 'belt:indenture');
  // The peg rail of toolbelts on the north wall's inner face.
  ubox(b, 'wood', S.rack!.look.u, y + 1.35, v1 + 0.22, 3.2, 0.14, 0.1, GC_PAINT.timber);
  const belts = lite ? 3 : 6;
  for (let k = 0; k < belts; k++) {
    const pu = S.rack!.look.u - 1.3 + (k * 2.6) / (belts - 1);
    ubox(b, 'wood', pu, y + 1.35, v1 + 0.1, 0.05, 0.05, 0.16, GC_PAINT.tar);
    ubox(b, 'cloth', pu, y + 1.05, v1 + 0.08, 0.12, 0.6, 0.04, 0x6b4a30);
  }
  // The first two belts' tags on the rail: the tools a reader's belt carries (the pack's words).
  for (const [k, name] of [
    [0, 'beltRead'],
    [1, 'beltSearch'],
  ] as const) {
    const pu = S.rack!.look.u - 1.3 + (k * 2.6) / (belts - 1);
    ubox(b, 'wood', pu, y + 1.5, v1 + 0.2, 0.46, 0.16, 0.03, GC_PAINT.timber);
    out.signs.push(signAt(pu, y + 1.5, v1 + 0.2, 0, -1, { lines: [name], w: 0.42, h: 0.13 }, 0.021));
  }
  postLamp(b, out, S.rack!.u + 2.4, v1 + 0.6, 0, -1, 'belt:rack');
  // The proof table against the east wall.
  ubox(b, 'wood', S.proof!.look.u, y + 0.8, S.proof!.look.v, 0.8, 0.08, 1.4, GC_PAINT.timber);
  for (const dv of [-0.6, 0.6])
    ubox(b, 'wood', S.proof!.look.u, y + 0.4, S.proof!.look.v + dv, 0.7, 0.8, 0.08, GC_PAINT.timber);
  ubox(b, 'wood', S.proof!.look.u, y + 0.85, S.proof!.look.v, 0.36, 0.012, 0.5, 0xefe6d0);
  solid(out, S.proof!.look.u, S.proof!.look.v, 0.9, 1.5, y, y + 0.9, false);
  postLamp(b, out, u1 + 0.6, S.proof!.v + 2.4, -1, 0, 'belt:proof');
  // The reading bench and its little table by the west entrance.
  const rb = S.bench!.look;
  ubox(b, 'wood', rb.u, y + 0.45, rb.v, 2.0, 0.08, 0.5, GC_PAINT.timber);
  for (const du of [-0.8, 0.8]) ubox(b, 'wood', rb.u + du, y + 0.22, rb.v, 0.1, 0.44, 0.44, GC_PAINT.timber);
  ubox(b, 'wood', rb.u, y + 0.75, rb.v - 1.0, 0.9, 0.06, 0.6, GC_PAINT.timber);
  for (const du of [-0.35, 0.35])
    ubox(b, 'wood', rb.u + du, y + 0.37, rb.v - 1.0, 0.06, 0.74, 0.5, GC_PAINT.timber);
  solid(out, rb.u, rb.v - 0.5, 2.1, 1.7, y, y + 0.8, false);
  wallLamp(b, out, rb.u - 1.6, JOURNEYMEN_HALL.v1, YARD.y + 3.3, 0, 1, 'belt:bench');
  // The test bench under its cloth (the sounding hammer beneath it).
  const tb = S.testBench!.look;
  ubox(b, 'wood', tb.u, y + 0.85, tb.v, 2.2, 0.1, 0.9, GC_PAINT.timber);
  for (const [du, dv] of [
    [-1, -0.38],
    [1, -0.38],
    [-1, 0.38],
    [1, 0.38],
  ] as const)
    ubox(b, 'wood', tb.u + du, y + 0.42, tb.v + dv, 0.1, 0.84, 0.1, GC_PAINT.timber);
  ubox(b, 'cloth', tb.u, y + 0.98, tb.v, 2.3, 0.16, 1.0, 0xd8d0b8);
  ubox(b, 'cloth', tb.u, y + 0.7, tb.v - 0.52, 2.3, 0.46, 0.04, 0xd8d0b8);
  solid(out, tb.u, tb.v, 2.3, 1.0, y, y + 1.1, false);
  postLamp(b, out, S.testBench!.u - 1.8, v1 + 0.6, 0, -1, 'belt:testBench');
  // A trough and a barrel by the hall's west end (the yard's at work).
  ubox(b, 'wood', u0 + 4, y + 0.4, JOURNEYMEN_HALL.v1 + 1.6, 0.8, 0.8, 0.8, 0x6b5038);
  solid(out, u0 + 4, JOURNEYMEN_HALL.v1 + 1.6, 0.9, 0.9, y, y + 0.8, false);
}

/**
 * Kenna's seat on the glen (a flat granite block, seat-fit.ts's size: her anchor is its top, her shins
 * down its front edge).
 */
function shepherdSeat(b: Buckets, out: GcOut): void {
  const a = GUILDCREST_ANCHORS.extraShepherd;
  const floor = a.y - SIT.height;
  const g = seatBlock(b, a.x, a.z, a.heading, floor - 0.3, a.y);
  // Granite, not a crate: the block's geometry moves from the wood bucket to the stone one.
  b.wood.splice(b.wood.indexOf(g), 1);
  paint(g, GC_PAINT.granite);
  b.stone.push(g);
  out.circles.push({ x: a.x, z: a.z, r: 0.45, y0: floor - 0.5, y1: a.y, height: SIT.height + 0.3 });
}

/** Rails along the ridge path where its downhill side falls steeply (over ~30°). */
function ridgeRails(b: Buckets, out: GcOut): void {
  for (let i = 0; i + 1 < RIDGE_PATH.length; i++) {
    const a = RIDGE_PATH[i]!;
    const e = RIDGE_PATH[i + 1]!;
    const len = Math.hypot(e.u - a.u, e.v - a.v);
    const nu = -(e.v - a.v) / len;
    const nv = (e.u - a.u) / len;
    for (const side of [-1, 1]) {
      const mu = (a.u + e.u) / 2 + nu * side * 2.4;
      const mv = (a.v + e.v) / 2 + nv * side * 2.4;
      const far = ground(mu + nu * side * 3, mv + nv * side * 3);
      if (ground(mu, mv) - far < 1.7) continue;
      const o = 2.3 * side;
      rail(b, out, [a.u + nu * o, a.v + nv * o, a.y], [e.u + nu * o, e.v + nv * o, e.y], GC_PAINT.timber);
    }
  }
  // The mill track's stones (a worn line of flags is the terrain's; here only its marker posts).
  for (const p of MILL_TRACK.slice(1)) {
    const q = at(p.u + 1.8, 0, p.v);
    const g = ground(p.u + 1.8, p.v);
    rod(b, 'wood', { x: q.x, y: g - 0.2, z: q.z }, { x: q.x, y: g + 0.9, z: q.z }, 0.07, 5, GC_PAINT.timber);
  }
}

/** The three guilds' banners on the ridge (one by each mill), in the order of `MILLS`. */
const SEAL_BANNERS = [
  { sign: 'guildMasons', fill: GC_PAINT.masons },
  { sign: 'guildWeavers', fill: GC_PAINT.weavers },
  { sign: 'guildMillwrights', fill: GC_PAINT.millwrights },
] as const;
/** The banner pole's height and its cloth (m). */
const SEAL_POLE = 6.4;
const SEAL_CLOTH = { w: 1.2, h: 2.4 } as const;

/**
 * A guild's banner pole by a mill's door, its cloth facing (fu, fv): the pole and its crossbar always
 * stand; the cloth (the pack's guild name, both sides) unfurls at the Seal and stays once sealed.
 */
function sealBanner(b: Buckets, out: GcOut, u: number, v: number, fu: number, fv: number, i: number): void {
  const g = ground(u, v);
  const p = at(u, 0, v);
  const top = g + SEAL_POLE;
  rod(b, 'wood', { x: p.x, y: g - 0.3, z: p.z }, { x: p.x, y: top, z: p.z }, 0.07, 6, GC_PAINT.timber);
  const half = SEAL_CLOTH.w / 2 + 0.1;
  rod(
    b,
    'wood',
    at(u + fv * half, top - 0.25, v - fu * half),
    at(u - fv * half, top - 0.25, v + fu * half),
    0.035,
    4,
    GC_PAINT.timber,
  );
  out.circles.push({ x: p.x, z: p.z, r: 0.15, y0: g - 0.5, y1: top, height: SEAL_POLE });
  const look = SEAL_BANNERS[i] ?? SEAL_BANNERS[0];
  // Hung just in front of the pole, from the crossbar.
  out.signs.push(
    signAt(
      u,
      top - 0.3,
      v,
      fu,
      fv,
      {
        lines: [look.sign],
        w: SEAL_CLOTH.w,
        h: SEAL_CLOTH.h,
        twoSided: true,
        look: 'cloth',
        fill: `#${look.fill.toString(16).padStart(6, '0')}`,
        colors: SIGN_CREAM,
        show: 'sealed',
        hang: true,
        wrap: true,
        size: 0.2,
        pixels: 320,
      },
      0.1,
    ),
  );
}

/** A stone tower mill on its pad: tapered tower, a door, a timber cap; its sails (`MillSails`). */
function mill(b: Buckets, out: GcOut, u: number, v: number, y: number, lite: boolean): MillSails | null {
  const p = at(u, y, v);
  const top = y + MILL.tower;
  rod(b, 'stone', { x: p.x, y: y - 1.5, z: p.z }, { x: p.x, y: top, z: p.z }, 3.1, 12, 0xe4ddcf, 2.35);
  rod(
    b,
    'stone',
    { x: p.x, y: y - 1.5, z: p.z },
    { x: p.x, y: y + 0.6, z: p.z },
    3.3,
    12,
    GC_PAINT.rubble,
    3.25,
  );
  // The door facing the track (toward the yard), and two small windows.
  const toYard = { du: YARD.u - u, dv: YARD.v - v };
  const l = Math.hypot(toYard.du, toYard.dv);
  const fu = toYard.du / l;
  const fv = toYard.dv / l;
  door(b, u + fu * 3.05, v + fv * 3.05, y + 0.1, fu, fv, 1.2, 2.2, GC_PAINT.door);
  sealBanner(
    b,
    out,
    u + fu * 4.6 + fv * 3.2,
    v + fv * 4.6 - fu * 3.2,
    fu,
    fv,
    MILLS.findIndex((m) => m.u === u),
  );
  windowPane(b, u + fu * 2.75, v + fv * 2.75, y + 6.5, fu, fv, 0.5, 0.8);
  windowPane(b, u - fu * 2.55, v - fv * 2.55, y + 9.5, -fu, -fv, 0.5, 0.8);
  // The cap: a timber dome turned into the wind, its windshaft out to the sails' hub.
  cone(b, 'wood', p.x, top - 0.1, p.z, 2.6, MILL.cap, 10, GC_PAINT.timber, 0.3);
  const hub = { x: p.x - WIND_TO.x * 2.7, y: top + 1.0, z: p.z - WIND_TO.z * 2.7 };
  rod(b, 'wood', { x: p.x, y: hub.y, z: p.z }, hub, 0.18, 6, GC_PAINT.tar);
  out.circles.push({ x: p.x, z: p.z, r: 3.3, y0: y - 1, y1: top + MILL.cap, height: top + MILL.cap - y });
  // The sails' sweep: the camera keeps out of their disc.
  const yaw = Math.atan2(WIND_TO.x, WIND_TO.z);
  out.cameraBoxes.push({
    x: hub.x,
    z: hub.z,
    hx: MILL.sail,
    hz: 0.8,
    rot: yaw - Math.PI / 2,
    y0: hub.y - MILL.sail,
    y1: hub.y + MILL.sail,
  });
  out.perches.push({ x: p.x, y: top + MILL.cap, z: p.z });
  const geometry = sailGeometry();
  if (lite) {
    // Lite: the sails stand still in the cloth bucket (no draw of their own).
    geometry.rotateZ(0.4 + u * 0.01);
    geometry.rotateY(yaw);
    geometry.translate(hub.x, hub.y, hub.z);
    b.cloth.push(geometry);
    return null;
  }
  return { geometry, hub, yaw };
}

/** Four sails about the hub (axis +z): timber whips and white canvas on their lattice, one geometry. */
export function sailGeometry(): BufferGeometry {
  const s = makeBuckets();
  // The hub's boss.
  rod(s, 'cloth', { x: 0, y: 0, z: -0.3 }, { x: 0, y: 0, z: 0.25 }, 0.45, 8, GC_PAINT.tar);
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2;
    const c = Math.cos(a);
    const sn = Math.sin(a);
    // The whip (a stock out to the tip).
    box(
      s,
      'cloth',
      c * (MILL.sail / 2),
      sn * (MILL.sail / 2),
      0.1,
      MILL.sail,
      0.22,
      0.18,
      0,
      GC_PAINT.timber,
      0,
      a,
    );
    // The canvas on its frame, to the trailing side of the whip.
    const off = 0.95;
    const r0 = 1.6;
    const r1 = MILL.sail - 0.3;
    const mid = (r0 + r1) / 2;
    const ox = c * mid - sn * off;
    const oy = sn * mid + c * off;
    box(s, 'cloth', ox, oy, 0.2, r1 - r0, 1.7, 0.04, 0, GC_PAINT.canvas, 0, a);
    // The frame's bars across the canvas.
    for (let t = r0; t <= r1; t += 1.4) {
      const bx = c * t - sn * off;
      const by = sn * t + c * off;
      box(s, 'cloth', bx, by, 0.24, 0.07, 1.8, 0.06, 0, GC_PAINT.timber, 0, a);
    }
  }
  // `box`'s roll turns about its own z after its yaw: the pieces lie in the hub's xy plane.
  const g = mergeGeometries(s.cloth, false)!;
  for (const piece of s.cloth) piece.dispose();
  return g;
}

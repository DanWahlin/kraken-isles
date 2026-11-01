import type { BufferGeometry } from 'three/webgpu';
import type { BoxCollider } from '../../../game/collision';
import type { CircleObstacle } from '../../contracts';
import type { CameraBlockerBox } from '../../terrain/camera-blockers';
import type { MaterialKey } from '../../village/kit';
import { lampHanger } from '../../village/lamp-hanger';
import { lampHead, LAMP_LOOKS, type LampLook, type LampPiece } from '../../village/lamp-set';
import {
  box,
  crowStepGable,
  lanternPaint,
  makeBuckets,
  pitchedRoof,
  rod,
  stoneUv,
  type Buckets,
} from '../../village/pieces';
import { lineDeck, type WalkDeck } from '../../village/walk-decks';
import { guildcrestHeight } from './height';
import { FRAME, headingUv, toWorld } from './layout';

/**
 * Guildcrest's building helpers (the town, the abbey and the ridge share them): boxes and points in
 * the island frame, the stone and slate palette (spec §2.3), railed stairs, low walls, lamp posts,
 * stone halls with crow-stepped gables, and what the builders hand the game (`GcOut`). Every piece goes
 * into the village kit's material buckets (no new shader).
 */

/** What the builders hand gameplay: colliders, camera boxes, ship obstacles, walk decks and lamps. */
export interface GcOut {
  colliders: BoxCollider[];
  circles: CircleObstacle[];
  cameraBoxes: CameraBlockerBox[];
  shipObstacles: CircleObstacle[];
  /** Walk surfaces over the ground (the quay's deck, stairs' treads, the terrace). */
  decks: WalkDeck[];
  /** The glass of the lamps that change (`LampSet`), by key. */
  lamps: LampPiece[];
  /** Where the swifts and gulls may perch (world). */
  perches: { x: number; y: number; z: number }[];
  /** The chimneys' tops, for the smoke (world). */
  chimneys: { x: number; y: number; z: number }[];
  /** Lettering with the pack's words (`quests/guildcrest.json` → `signs`), painted by the world's sign set. */
  signs: GcSign[];
}

/** What the story shows: the book's new page, Rory's banner, the Seal's banners on the ridge. */
export type GcShow = 'page' | 'rory' | 'sealed';

/**
 * A board or banner with the pack's words: `lines` are sign names (each line one sign's words), at
 * world (x, y, z), facing heading `heading` (`roll` turns it in its own plane, `tilt` leans its top
 * back). A sign with `show` stays hidden until the story shows it; a `hang` sign hangs from its
 * origin (it unrolls from there).
 */
export interface GcSign {
  lines: readonly string[];
  x: number;
  y: number;
  z: number;
  heading: number;
  w: number;
  h: number;
  roll?: number;
  tilt?: number;
  twoSided?: boolean;
  look?: 'board' | 'cloth';
  fill?: string;
  colors?: readonly string[];
  show?: GcShow;
  hang?: boolean;
  /** Its words a line each (a banner's name down the cloth). */
  wrap?: boolean;
  /** Letter height as a fraction of its width (`SignStyle.size`; it shrinks to fit). */
  size?: number;
  /** Its painted width in atlas pixels (a big cloth seen from afar; `SignOptions.pixels`). */
  pixels?: number;
}

/** Cream lettering (on a painted board, a banner's colour or bronze). */
export const SIGN_CREAM = ['#f6e7c8'] as const;

/** A sign on the frame's face (du, dv) at frame (u, y, v), pushed out `off` m along the face. */
export function signAt(
  u: number,
  y: number,
  v: number,
  du: number,
  dv: number,
  o: Omit<GcSign, 'x' | 'y' | 'z' | 'heading'>,
  off = 0,
): GcSign {
  const p = toWorld(u + du * off, v + dv * off);
  return { ...o, x: p.x, y, z: p.z, heading: headingUv(du, dv) };
}

export function makeOut(): GcOut {
  return {
    colliders: [],
    circles: [],
    cameraBoxes: [],
    shipObstacles: [],
    decks: [],
    lamps: [],
    perches: [],
    chimneys: [],
    signs: [],
  };
}

/** Guildcrest's colours (spec §2.3), as vertex paint over the kit's materials. */
export const GC_PAINT = {
  stone: 0xe8e2d6,
  rubble: 0xc4bcae,
  granite: 0xcfcbc2,
  wetStone: 0x5f5a52,
  paving: 0xd2cabc,
  slate: 0x6c7484,
  harl: 0xe9e3d3,
  ochre: 0xd8b97a,
  pink: 0xd9b8ae,
  timber: 0x6b5038,
  tar: 0x2e2620,
  iron: 0x3c3b3a,
  bronze: 0xb07a3a,
  masons: 0x2f5d8a,
  weavers: 0x9c3a4a,
  millwrights: 0xc08a2a,
  canvas: 0xf2ece0,
  door: 0x2f4a3a,
  doorRed: 0x8a3030,
} as const;

/** The frame's axes as a yaw: a box's local x along u, its local z along v. */
export const YAW_U = Math.atan2(-FRAME.axis.z, FRAME.axis.x);

/** A frame direction (du, dv) as a box's yaw (its local x along it). */
export function yawAlong(du: number, dv: number): number {
  const x = du * FRAME.axis.x + dv * FRAME.across.x;
  const z = du * FRAME.axis.z + dv * FRAME.across.z;
  return Math.atan2(-z, x);
}

type P3 = { x: number; y: number; z: number };

/** A point in the frame (u, v) at height y, in world space. */
export function at(u: number, y: number, v: number): P3 {
  const p = toWorld(u, v);
  return { x: p.x, y, z: p.z };
}

/** The ground at frame (u, v). */
export const ground = (u: number, v: number): number => {
  const p = toWorld(u, v);
  return guildcrestHeight(p.x, p.z);
};

/** The lowest and highest ground under a frame box (corners and middle). */
export function groundSpan(u: number, v: number, hu: number, hv: number): { lo: number; hi: number } {
  let lo = Infinity;
  let hi = -Infinity;
  for (const du of [-hu, 0, hu])
    for (const dv of [-hv, 0, hv]) {
      const g = ground(u + du, v + dv);
      lo = Math.min(lo, g);
      hi = Math.max(hi, g);
    }
  return { lo, hi };
}

/** A box in the frame: centred at (u, y, v), `su` along u, `sv` along v, turned `yaw` more. */
export function ubox(
  b: Buckets,
  key: MaterialKey,
  u: number,
  y: number,
  v: number,
  su: number,
  sy: number,
  sv: number,
  colour: number,
  yaw = 0,
  pitch = 0,
  roll = 0,
): BufferGeometry {
  const p = toWorld(u, v);
  const g = box(b, key, p.x, y, p.z, su, sy, sv, YAW_U + yaw, colour, pitch, roll);
  if (key === 'stone' || key === 'paving') stoneUv(g, key === 'paving' ? 2.2 : 1.6);
  return g;
}

/** A box from frame (u0, v0) to (u1, v1), from y0 to y1. */
export function uvSpan(
  b: Buckets,
  key: MaterialKey,
  u0: number,
  u1: number,
  v0: number,
  v1: number,
  y0: number,
  y1: number,
  colour: number,
): BufferGeometry {
  return ubox(b, key, (u0 + u1) / 2, (y0 + y1) / 2, (v0 + v1) / 2, u1 - u0, y1 - y0, v1 - v0, colour);
}

/** A box collider over a frame box from y0 to y1 (and the camera keeps out of it too, `camera`). */
export function solid(
  out: GcOut,
  u: number,
  v: number,
  su: number,
  sv: number,
  y0: number,
  y1: number,
  camera = true,
  yaw = 0,
): void {
  const p = toWorld(u, v);
  const rot = YAW_U + yaw;
  out.colliders.push({ x: p.x, z: p.z, hx: su / 2, hz: sv / 2, rot, y0: y0 - 0.5, y1, height: y1 - y0 });
  if (camera) out.cameraBoxes.push({ x: p.x, z: p.z, hx: su / 2, hz: sv / 2, rot, y0, y1 });
}

/**
 * A run of rail (a hand rail on posts) from a to b (frame u, v and the walk's y at each end), with a
 * collider all along it (the walker can't step through; the camera may pass over it).
 */
export function rail(
  b: Buckets,
  out: GcOut,
  a: readonly [number, number, number],
  e: readonly [number, number, number],
  colour: number = GC_PAINT.iron,
  height = 1.05,
): void {
  const len = Math.hypot(e[0] - a[0], e[1] - a[1]);
  const n = Math.max(1, Math.ceil(len / 2));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = a[0] + (e[0] - a[0]) * t;
    const v = a[1] + (e[1] - a[1]) * t;
    const y = a[2] + (e[2] - a[2]) * t;
    const p = at(u, y, v);
    rod(b, 'metal', { x: p.x, y: y - 0.25, z: p.z }, { x: p.x, y: y + height, z: p.z }, 0.035, 5, colour);
  }
  const pa = at(a[0], a[2] + height, a[1]);
  const pe = at(e[0], e[2] + height, e[1]);
  rod(b, 'metal', pa, pe, 0.03, 5, colour);
  const ma = at(a[0], a[2] + height * 0.5, a[1]);
  const me = at(e[0], e[2] + height * 0.5, e[1]);
  rod(b, 'metal', ma, me, 0.02, 4, colour);
  const mid = at((a[0] + e[0]) / 2, 0, (a[1] + e[1]) / 2);
  const y0 = Math.min(a[2], e[2]);
  const y1 = Math.max(a[2], e[2]) + height;
  out.colliders.push({
    x: mid.x,
    z: mid.z,
    hx: len / 2 + 0.05,
    hz: 0.12,
    rot: yawAlong(e[0] - a[0], e[1] - a[1]),
    y0: y0 - 0.6,
    y1: y1 + 0.6,
    height: y1 - y0,
    eyeTop: y1,
  });
}

/** A low stone wall from a to b along the ground (frame), `h` high, `w` thick, with a collider. */
export function lowWall(
  b: Buckets,
  out: GcOut,
  a: readonly [number, number],
  e: readonly [number, number],
  h = 1.1,
  w = 0.6,
  colour: number = GC_PAINT.rubble,
): void {
  const len = Math.hypot(e[0] - a[0], e[1] - a[1]);
  const n = Math.max(1, Math.ceil(len / 4));
  const yaw = yawAlong(e[0] - a[0], e[1] - a[1]) - YAW_U;
  let top = -Infinity;
  let bottom = Infinity;
  for (let i = 0; i < n; i++) {
    const t0 = i / n;
    const t1 = (i + 1) / n;
    const u = a[0] + (e[0] - a[0]) * ((t0 + t1) / 2);
    const v = a[1] + (e[1] - a[1]) * ((t0 + t1) / 2);
    const lo = Math.min(
      ground(a[0] + (e[0] - a[0]) * t0, a[1] + (e[1] - a[1]) * t0),
      ground(a[0] + (e[0] - a[0]) * t1, a[1] + (e[1] - a[1]) * t1),
      ground(u, v),
    );
    const hi = Math.max(ground(u, v), lo);
    const y0 = lo - 0.5;
    const y1 = hi + h;
    ubox(b, 'stone', u, (y0 + y1) / 2, v, len / n + 0.04, y1 - y0, w, colour, yaw);
    top = Math.max(top, y1);
    bottom = Math.min(bottom, y0);
  }
  const mid = at((a[0] + e[0]) / 2, 0, (a[1] + e[1]) / 2);
  out.colliders.push({
    x: mid.x,
    z: mid.z,
    hx: len / 2,
    hz: w / 2 + 0.05,
    rot: YAW_U + yaw,
    y0: bottom,
    y1: top + 0.6,
    height: top - bottom,
    eyeTop: top,
  });
}

/**
 * A flight of stone steps up a ramp from a to b (frame, with the walk's y at each end), `width` wide,
 * railed on both sides (Keelhaven P04): treads of about `rise` m, each sunk into the ramp so its front
 * edge stands on it. The walker walks the ramp (a deck along it); the treads are what you see.
 */
export function flight(
  b: Buckets,
  out: GcOut,
  a: readonly [number, number, number],
  e: readonly [number, number, number],
  width: number,
  rise = 0.18,
): void {
  const len = Math.hypot(e[0] - a[0], e[1] - a[1]);
  const du = (e[0] - a[0]) / len;
  const dv = (e[1] - a[1]) / len;
  const n = Math.max(1, Math.round(Math.abs(e[2] - a[2]) / rise));
  const run = len / n;
  const yaw = yawAlong(du, dv) - YAW_U;
  for (let k = 0; k < n; k++) {
    const t = (k + 0.5) / n;
    const u = a[0] + du * len * t;
    const v = a[1] + dv * len * t;
    const top = a[2] + ((e[2] - a[2]) * (k + 1)) / n - Math.sign(e[2] - a[2]) * 0.01;
    const lo = Math.min(a[2], e[2]) + ((e[2] - a[2]) * k) / n - 0.5;
    ubox(
      b,
      'stone',
      u,
      (top + Math.min(lo, top - 0.3)) / 2,
      v,
      run + 0.02,
      top - Math.min(lo, top - 0.3),
      width,
      GC_PAINT.stone,
      yaw,
    );
  }
  out.decks.push(lineDeck(a, e, width / 2, false));
  // Rails both sides, a hand's width in from the treads' ends.
  const nu = -dv;
  const nv = du;
  for (const side of [-1, 1]) {
    const o = side * (width / 2 - 0.08);
    rail(b, out, [a[0] + nu * o, a[1] + nv * o, a[2] + 0.02], [e[0] + nu * o, e[1] + nv * o, e[2] + 0.02]);
  }
}

/** A lamp post with a lantern hung from its arm by the shared hanger (`armYaw` the arm's world yaw). */
export function lampPost(
  b: Buckets,
  out: GcOut,
  u: number,
  v: number,
  armYaw: number,
  key?: { lamp: string; look: LampLook },
): void {
  const g = ground(u, v);
  const p = at(u, g, v);
  rod(b, 'metal', { x: p.x, y: g - 0.3, z: p.z }, { x: p.x, y: g + 3.4, z: p.z }, 0.07, 6, GC_PAINT.iron);
  const arm = { x: p.x + Math.cos(armYaw) * 0.7, y: g + 3.3, z: p.z - Math.sin(armYaw) * 0.7 };
  const root = { x: p.x + Math.cos(armYaw) * 0.05, y: g + 3.3, z: p.z - Math.sin(armYaw) * 0.05 };
  rod(b, 'metal', root, arm, 0.03, 4, GC_PAINT.iron);
  hangLantern(b, out, arm.x, arm.y, arm.z, armYaw, key);
  out.circles.push({ x: p.x, z: p.z, r: 0.18, y0: g - 0.5, y1: g + 3.4, height: 3.4 });
  const mid = { x: (p.x + arm.x) / 2, z: (p.z + arm.z) / 2 };
  out.cameraBoxes.push({ ...mid, hx: 0.5, hz: 0.2, rot: armYaw, y0: arm.y - 0.8, y1: arm.y + 0.15 });
}

/**
 * A lantern hung by the shared hanger under a support whose underside is at `under` (an arm, a
 * bracket, an arcade's beam) at world (x, z). With `key`, its glass is one of the island's lamps
 * that change (`LampSet`); else it's a plain lantern in the glow bucket.
 */
export function hangLantern(
  b: Buckets,
  out: GcOut,
  x: number,
  under: number,
  z: number,
  yaw: number,
  key?: { lamp: string; look: LampLook },
): void {
  const y = under - 0.45;
  const scratch = key ? makeBuckets() : b;
  const head = lampHead(b, scratch, {
    x,
    y,
    z,
    w: 0.22,
    h: 0.3,
    yaw,
    capR: 0.2,
    capH: 0.16,
    capColour: GC_PAINT.iron,
  });
  if (key) {
    const c = head.glass.getAttribute('color');
    const paint = LAMP_LOOKS[key.look];
    for (let i = 0; i < c.count; i++) c.setXYZ(i, paint[0], paint[1], paint[2]);
    out.lamps.push({ key: key.lamp, geo: head.glass });
  } else lanternPaint(head.glass, 4.6);
  // The hanger from the cap's tip up into the support.
  lampHanger(b.metal, x, z, y + 0.15 + 0.008 + 0.16, under - 0.03, GC_PAINT.iron, 1, yaw);
}

/**
 * A stone hall: walls from its foundation (the lowest ground under it, less half a metre) to its eaves
 * `wall` m over `floor`, a slate roof with `rise`, and crow-stepped gables at both ends (`crow`). Its
 * ridge runs along the frame direction `along` ('u' or 'v'). Colliders and camera boxes over it.
 */
export function stoneHall(
  b: Buckets,
  out: GcOut,
  u: number,
  v: number,
  along: 'u' | 'v',
  length: number,
  depth: number,
  floor: number,
  wall: number,
  rise: number,
  colour: number,
  crow: boolean,
): { eaves: number; ridge: number } {
  const su = along === 'u' ? length : depth;
  const sv = along === 'u' ? depth : length;
  const { lo } = groundSpan(u, v, su / 2, sv / 2);
  const y0 = Math.min(lo, floor) - 0.5;
  const eaves = floor + wall;
  ubox(b, 'stone', u, (y0 + eaves) / 2, v, su, eaves - y0, sv, colour);
  // A plinth course a little proud of the wall at its foot.
  ubox(
    b,
    'stone',
    u,
    (y0 - 0.05 + floor + 0.6) / 2,
    v,
    su + 0.24,
    floor + 0.65 - y0,
    sv + 0.24,
    GC_PAINT.rubble,
  );
  const p = toWorld(u, v);
  const yaw = along === 'u' ? YAW_U : YAW_U + Math.PI / 2;
  const roofLen = crow ? length - 0.5 : length + 0.6;
  pitchedRoof(b, 'paving', p.x, eaves, p.z, yaw, roofLen, depth, rise, GC_PAINT.slate, 0.45);
  if (crow) {
    for (const side of [-1, 1]) {
      const end = side * (length / 2 - 0.2);
      const gu = along === 'u' ? u + end : u;
      const gv = along === 'u' ? v : v + end;
      const g = toWorld(gu, gv);
      crowStepGable(b, 'stone', g.x, eaves, g.z, yaw + Math.PI / 2, depth + 0.3, rise + 0.3, 0.55, 3, colour);
    }
  } else {
    // Plain gables: a stack of courses under the roof's line (hidden by the roof's ends).
    for (const side of [-1, 1]) {
      const end = side * (length / 2 - 0.25);
      const gu = along === 'u' ? u + end : u;
      const gv = along === 'u' ? v : v + end;
      const g = toWorld(gu, gv);
      crowStepGable(
        b,
        'stone',
        g.x,
        eaves,
        g.z,
        yaw + Math.PI / 2,
        depth - 0.2,
        rise * 0.92,
        0.45,
        5,
        colour,
      );
    }
  }
  solid(out, u, v, su + 0.3, sv + 0.3, y0, eaves + rise);
  return { eaves, ridge: eaves + rise };
}

/** A chimney stack on a roof at frame (u, v), its top at `top`; recorded for the smoke. */
export function chimney(b: Buckets, out: GcOut, u: number, v: number, base: number, top: number): void {
  ubox(b, 'stone', u, (base + top) / 2, v, 0.9, top - base, 0.7, GC_PAINT.rubble);
  ubox(b, 'stone', u, top + 0.06, v, 1.05, 0.12, 0.85, GC_PAINT.stone);
  for (const o of [-0.2, 0.2]) {
    const p = at(u + o, top + 0.12, v);
    rod(b, 'stone', p, { x: p.x, y: top + 0.42, z: p.z }, 0.11, 6, 0x9a6a4a);
  }
  out.chimneys.push(at(u, top + 0.5, v));
}

/** A door (a dark recess and its frame) in a wall facing frame direction (fu, fv), its foot at `y`. */
export function door(
  b: Buckets,
  u: number,
  v: number,
  y: number,
  fu: number,
  fv: number,
  w = 1.2,
  h = 2.3,
  colour: number = GC_PAINT.door,
): void {
  const yaw = yawAlong(-fv, fu) - YAW_U;
  ubox(b, 'wood', u + fu * 0.03, y + h / 2, v + fv * 0.03, w, h, 0.12, colour, yaw);
  ubox(b, 'stone', u + fu * 0.06, y + h + 0.15, v + fv * 0.06, w + 0.5, 0.3, 0.16, GC_PAINT.stone, yaw);
}

/** A window (dark glass, lit at night, with a stone sill) in a wall facing frame direction (fu, fv). */
export function windowPane(
  b: Buckets,
  u: number,
  v: number,
  y: number,
  fu: number,
  fv: number,
  w = 0.8,
  h = 1.1,
): void {
  const yaw = yawAlong(-fv, fu) - YAW_U;
  // Glass: dark by day (the glow material shows a fifth of its paint), warm at night.
  const g = ubox(b, 'glow', u + fu * 0.02, y, v + fv * 0.02, w, h, 0.08, 0xffffff, yaw);
  lanternPaint(g, 0.55);
  ubox(b, 'stone', u + fu * 0.08, y - h / 2 - 0.06, v + fv * 0.08, w + 0.2, 0.12, 0.2, GC_PAINT.stone, yaw);
}

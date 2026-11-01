import { box, crowStepGable, pitchedRoof, rod, rope, type Buckets } from '../../village/pieces';
import { uvDeck, lineDeck } from '../../village/walk-decks';
import {
  at,
  chimney,
  door,
  flight,
  GC_PAINT,
  ground,
  groundSpan,
  hangLantern,
  lampPost,
  SIGN_CREAM,
  signAt,
  solid,
  stoneHall,
  ubox,
  uvSpan,
  windowPane,
  yawAlong,
  YAW_U,
  type GcOut,
} from './build';
import { BRAE, CHARTER_STONE, QUAY, SQUARE, toWorld } from './layout';
import { GUILDHALLS, HOUSES, INN_HOUSE, SQUARE_PROPS, type Guildhall, type TownHouse } from './town';

/**
 * Builds Guildcrest's harbour town (spec §3.5): the stone quay along the loch with its fenders,
 * bollards, lamps and slipway; the harled houses with slate roofs on stone plinths down the slope; the
 * inn with its porch and sign; Guild Square with the Charter Stone, the market cross, benches, the
 * trough; the three guildhalls with crow-stepped gables and their banners; a well and washing lines.
 * Into the kit's buckets, a part a step.
 */
export function* buildTown(b: Buckets, out: GcOut, lite: boolean): Generator<void, void, void> {
  quay(b, out);
  yield;
  for (const h of HOUSES) {
    if (lite && !h.lite) continue;
    house(b, out, h, false);
    yield;
  }
  house(b, out, INN_HOUSE, true);
  innPorch(b, out);
  yield;
  for (const g of GUILDHALLS) {
    guildhall(b, out, g);
    yield;
  }
  square(b, out, lite);
  brae(b, out);
  yield;
  if (!lite) washing(b);
  // The lane's lamps: up from the quay to the square, and at the square's corners.
  for (const [u, v, du, dv] of [
    [-174, 34, 1, -0.4],
    [-146, 43, 0, -1],
    [-122, 46, 0, -1],
    [-112, 32, 1, 1],
    [-80, 60, -1, -1],
  ] as const) {
    const w = toWorld(du, dv);
    const o = toWorld(0, 0);
    lampPost(b, out, u, v, Math.atan2(-(w.z - o.z), w.x - o.x));
  }
}

/**
 * A harled house (spec §2.2, as built §15: built here, not from the kit's half-timbered houses): lime-
 * washed walls on a stone plinth that takes up the slope, a slate roof with its ridge along the front,
 * gables at the sides (crow-stepped on some), a chimney on each gable, a door and windows with pale
 * stone margins. The inn is a bigger one with a porch.
 */
function house(b: Buckets, out: GcOut, h: TownHouse, inn: boolean): void {
  const along = h.fu === 0 ? 'u' : 'v';
  const su = along === 'u' ? h.w : h.d;
  const sv = along === 'u' ? h.d : h.w;
  const { lo, hi } = groundSpan(h.u, h.v, su / 2 + 0.3, sv / 2 + 0.3);
  const base = hi + 0.15;
  uvSpan(
    b,
    'stone',
    h.u - su / 2 - 0.12,
    h.u + su / 2 + 0.12,
    h.v - sv / 2 - 0.12,
    h.v + sv / 2 + 0.12,
    lo - 0.5,
    base,
    GC_PAINT.rubble,
  );
  const wall = h.storeys === 2 ? 5.6 : 3.1;
  const eaves = base + wall;
  uvSpan(b, 'plaster', h.u - su / 2, h.u + su / 2, h.v - sv / 2, h.v + sv / 2, base - 0.02, eaves, h.tint);
  const rise = h.d * 0.42;
  const p = toWorld(h.u, h.v);
  const yaw = along === 'u' ? YAW_U : YAW_U + Math.PI / 2;
  const crow = inn || Math.abs(Math.round(h.u * 3 + h.v)) % 3 === 0;
  pitchedRoof(
    b,
    'paving',
    p.x,
    eaves,
    p.z,
    yaw,
    crow ? h.w - 0.4 : h.w + 0.5,
    h.d,
    rise,
    GC_PAINT.slate,
    0.35,
  );
  for (const side of [-1, 1]) {
    const end = side * (h.w / 2 - 0.2);
    const gu = along === 'u' ? h.u + end : h.u;
    const gv = along === 'u' ? h.v : h.v + end;
    const g = toWorld(gu, gv);
    if (crow)
      crowStepGable(
        b,
        'plaster',
        g.x,
        eaves,
        g.z,
        yaw + Math.PI / 2,
        h.d + 0.25,
        rise + 0.25,
        0.45,
        3,
        h.tint,
      );
    else
      crowStepGable(b, 'plaster', g.x, eaves, g.z, yaw + Math.PI / 2, h.d - 0.3, rise * 0.9, 0.38, 6, h.tint);
    // A chimney stack on the gable's top.
    const cu = along === 'u' ? h.u + side * (h.w / 2 - 0.45) : h.u;
    const cv = along === 'u' ? h.v : h.v + side * (h.w / 2 - 0.45);
    if (side > 0 || h.w >= 6) chimney(b, out, cu, cv, eaves + rise * 0.6, eaves + rise + 1.1);
  }
  // The front: a door in the middle (the inn's a little off it) and windows either side, up and down.
  const fu = h.fu;
  const fv = h.fv;
  const fd = (along === 'u' ? sv : su) / 2 + 0.01;
  const across = (t: number) =>
    (along === 'u' ? [h.u + t, h.v + fv * fd] : [h.u + fu * fd, h.v + t]) as [number, number];
  const [du, dv] = across(inn ? -1 : 0);
  door(b, du, dv, base, fu, fv, 1.1, 2.2, inn ? GC_PAINT.doorRed : GC_PAINT.door);
  for (const t of h.w >= 6 ? [-h.w * 0.3, h.w * 0.3] : [h.w * 0.3]) {
    const [wu, wv] = across(t);
    windowPane(b, wu, wv, base + 1.5, fu, fv, 0.8, 1.1);
    if (h.storeys === 2) windowPane(b, wu, wv, base + 4.1, fu, fv, 0.8, 1.0);
  }
  if (h.storeys === 2) {
    const [wu, wv] = across(inn ? 1.4 : 0);
    windowPane(b, wu, wv, base + 4.1, fu, fv, 0.8, 1.0);
  }
  solid(out, h.u, h.v, su + 0.3, sv + 0.3, lo - 0.5, eaves + rise);
  out.perches.push(at(h.u, eaves + rise + 0.1, h.v));
}

/** The inn's porch: a slate canopy on two posts across its front, and its sign on an iron bracket. */
function innPorch(b: Buckets, out: GcOut): void {
  const h = INN_HOUSE;
  const front = h.v - h.d / 2;
  const y = ground(h.u, front - 1.6);
  const top = Math.max(y, ground(h.u - 4, front - 2.6)) + 2.7;
  for (const du of [-4.8, 4.8]) {
    const p = at(h.u + du, 0, front - 2.6);
    const g = ground(h.u + du, front - 2.6);
    ubox(b, 'stone', h.u + du, g + 0.15, front - 2.6, 0.5, 0.3, 0.5, GC_PAINT.stone);
    rod(b, 'wood', { x: p.x, y: g + 0.3, z: p.z }, { x: p.x, y: top, z: p.z }, 0.1, 6, GC_PAINT.timber);
    out.circles.push({ x: p.x, z: p.z, r: 0.2, y0: g - 0.5, y1: top, height: top - g });
  }
  ubox(b, 'wood', h.u, top + 0.08, front - 2.6, 10, 0.16, 0.18, GC_PAINT.timber);
  ubox(b, 'paving', h.u, top + 0.45, front - 1.35, 10.4, 0.14, 2.9, GC_PAINT.slate, 0, -0.22);
  // A lantern under the porch, by the door.
  const l = at(h.u - 1.6, 0, front - 2.6);
  hangLantern(b, out, l.x, top, l.z, YAW_U);
  // The sign: a board hanging from an iron bracket at the west corner (its words are the pack's).
  const corner = at(h.u - h.w / 2 - 0.05, 0, front + 1.0);
  const s = INN_SIGN;
  const bracket = at(s.u, 0, s.v);
  rod(
    b,
    'metal',
    { x: corner.x, y: s.y + 0.55, z: corner.z },
    { x: bracket.x, y: s.y + 0.55, z: bracket.z },
    0.03,
    4,
    GC_PAINT.iron,
  );
  for (const o of [-0.45, 0.45]) {
    const q = at(s.u, 0, s.v + o);
    rod(
      b,
      'metal',
      { x: q.x, y: s.y + 0.4, z: q.z },
      { x: q.x, y: s.y + 0.57, z: q.z },
      0.012,
      3,
      GC_PAINT.iron,
    );
  }
  ubox(b, 'wood', s.u, s.y, s.v, 0.06, 0.8, 1.2, 0x2f3d4a);
  // Its name on both faces, 6 mm off the board.
  for (const du of [-1, 1])
    out.signs.push(
      signAt(
        s.u,
        s.y,
        s.v,
        du,
        0,
        { lines: ['innSign'], w: 1.12, h: 0.7, size: 0.16, wrap: true, fill: '#2f3d4a', colors: SIGN_CREAM },
        0.036,
      ),
    );
  out.cameraBoxes.push({ ...at(s.u, 0, s.v), hx: 0.2, hz: 0.7, rot: YAW_U, y0: s.y - 0.45, y1: s.y + 0.6 });
}

/** The inn's sign board: hung out from the west corner, its faces to the lane either side. */
export const INN_SIGN = {
  u: INN_HOUSE.u - INN_HOUSE.w / 2 - 1.1,
  v: INN_HOUSE.v - INN_HOUSE.d / 2 + 1.0,
  y: 0,
} as {
  u: number;
  v: number;
  y: number;
};
INN_SIGN.y = ground(INN_SIGN.u, INN_SIGN.v) + 3.7;

/** Each guildhall's banner's sign name (the pack's words). */
const GUILD_SIGN: Readonly<Record<Guildhall['id'], string>> = {
  masons: 'guildMasons',
  weavers: 'guildWeavers',
  millwrights: 'guildMillwrights',
};

/** A guildhall: a stone hall with crow-stepped gables, a door and windows to the square, a banner. */
function guildhall(b: Buckets, out: GcOut, g: Guildhall): void {
  const floor = SQUARE.y + 0.1;
  const { eaves } = stoneHall(
    b,
    out,
    g.u,
    g.v,
    g.along,
    g.length,
    g.depth,
    floor,
    6.4,
    3.6,
    GC_PAINT.stone,
    true,
  );
  const half = g.depth / 2;
  const fu = g.fu;
  const fv = g.fv;
  const du = g.u + fu * (half + 0.02);
  const dv = g.v + fv * (half + 0.02);
  door(b, du, dv, floor, fu, fv, 1.8, 2.9, GC_PAINT.door);
  // Two windows either side, two up.
  const across = (s: number) => [g.u + (fu === 0 ? s : 0), g.v + (fv === 0 ? s : 0)] as const;
  for (const s of [-4, -2.2, 2.2, 4]) {
    const [wu, wv] = across(s);
    if (Math.abs(s) > 3)
      windowPane(b, wu + fu * (half + 0.01), wv + fv * (half + 0.01), floor + 1.7, fu, fv, 0.8, 1.2);
    windowPane(b, wu + fu * (half + 0.01), wv + fv * (half + 0.01), floor + 4.6, fu, fv, 0.7, 1.0);
  }
  // The banner: a pole out over the door, its cloth in the guild's colour (its device is the pack's).
  const pole = at(du + fu * 0.05, eaves - 0.8, dv + fv * 0.05);
  const tip = at(du + fu * 1.9, eaves - 0.5, dv + fv * 1.9);
  rod(b, 'wood', pole, tip, 0.05, 5, GC_PAINT.timber);
  const bx = at(du + fu * 1.6, 0, dv + fv * 1.6);
  const yaw = yawAlong(fu, fv);
  box(b, 'cloth', bx.x, eaves - 1.55, bx.z, 0.04, 2.0, 1.0, yaw, g.banner);
  box(b, 'cloth', bx.x, eaves - 2.65, bx.z, 0.04, 0.3, 0.6, yaw, g.banner);
  // The guild's name on the cloth's face to the square.
  out.signs.push(
    signAt(
      du + fu * 1.6,
      eaves - 1.55,
      dv + fv * 1.6,
      fu,
      fv,
      {
        lines: [GUILD_SIGN[g.id]],
        w: 0.9,
        h: 1.8,
        wrap: true,
        size: 0.2,
        pixels: 320,
        look: 'cloth',
        fill: `#${g.banner.toString(16).padStart(6, '0')}`,
        colors: SIGN_CREAM,
      },
      0.026,
    ),
  );
  out.cameraBoxes.push({ x: bx.x, z: bx.z, hx: 0.2, hz: 0.6, rot: yaw, y0: eaves - 2.9, y1: eaves - 0.4 });
}

/** Guild Square: paving, the Charter Stone, the market cross, benches, the trough, and a well uphill. */
function square(b: Buckets, out: GcOut, lite: boolean): void {
  // Setts over the square (one slab 3 cm over the pad: no z-fight with the ground).
  ubox(
    b,
    'paving',
    SQUARE.u,
    SQUARE.y - 0.07,
    SQUARE.v,
    SQUARE.halfU * 2,
    0.2,
    SQUARE.halfV * 2,
    GC_PAINT.paving,
  );
  // The Charter Stone: a tall granite slab on a plinth, a paler carved panel on its west face, a
  // bronze plate at its foot (the pack's words on both).
  const cs = CHARTER_STONE;
  const y = SQUARE.y + 0.03;
  ubox(b, 'stone', cs.u, y + 0.14, cs.v, 2.2, 0.32, 1.6, GC_PAINT.rubble);
  ubox(b, 'stone', cs.u, y + 0.3 + 1.1, cs.v, 0.55, 2.2, 1.1, GC_PAINT.granite);
  ubox(b, 'stone', cs.u, y + 0.3 + 2.2 + 0.35, cs.v, 0.48, 0.7, 0.9, GC_PAINT.granite, 0, 0.08);
  ubox(b, 'stone', cs.u - 0.295, y + 1.75, cs.v, 0.04, 1.6, 0.8, 0xb8b2a6);
  // The bronze plate stands on the plinth's west end, leaning back a little.
  ubox(b, 'metal', cs.u - 0.82, y + 0.46, cs.v, 0.04, 0.3, 1.3, GC_PAINT.bronze, 0, 0, -0.2);
  out.signs.push(
    signAt(
      cs.u - 0.82,
      y + 0.46,
      cs.v,
      -1,
      0,
      {
        lines: ['charterFoot'],
        w: 1.22,
        h: 0.24,
        tilt: 0.2,
        fill: '#8a5a2a',
        colors: SIGN_CREAM,
      },
      0.027,
    ),
  );
  const c = at(cs.u, 0, cs.v);
  out.circles.push({ x: c.x, z: c.z, r: 1.1, y0: y - 0.5, y1: y + 3.4, height: 3.4 });
  // The market cross: three square steps, a shaft and a small head.
  const mc = SQUARE_PROPS.cross;
  for (let k = 0; k < 3; k++)
    ubox(b, 'stone', mc.u, y + 0.15 + k * 0.3, mc.v, 3 - k * 0.8, 0.3, 3 - k * 0.8, GC_PAINT.stone);
  const m = at(mc.u, 0, mc.v);
  rod(
    b,
    'stone',
    { x: m.x, y: y + 0.9, z: m.z },
    { x: m.x, y: y + 4.2, z: m.z },
    0.2,
    8,
    GC_PAINT.stone,
    0.15,
  );
  ubox(b, 'stone', mc.u, y + 4.4, mc.v, 0.7, 0.18, 0.18, GC_PAINT.stone);
  ubox(b, 'stone', mc.u, y + 4.5, mc.v, 0.18, 0.6, 0.18, GC_PAINT.stone);
  out.circles.push({ x: m.x, z: m.z, r: 1.6, y0: y - 0.5, y1: y + 4.6, height: 4.6 });
  // Benches facing the stone.
  for (const bn of SQUARE_PROPS.benches) {
    const yaw = yawAlong(-bn.fv, bn.fu) - YAW_U;
    ubox(b, 'wood', bn.u, y + 0.45, bn.v, 2.0, 0.08, 0.45, GC_PAINT.timber, yaw);
    for (const s of [-0.8, 0.8]) {
      const pu = bn.u + (bn.fu === 0 ? s : 0);
      const pv = bn.v + (bn.fv === 0 ? s : 0);
      ubox(b, 'stone', pu, y + 0.21, pv, 0.2, 0.42, 0.4, GC_PAINT.stone, yaw);
    }
    solid(out, bn.u, bn.v, bn.fu === 0 ? 2.1 : 0.6, bn.fu === 0 ? 0.6 : 2.1, y, y + 0.55, false);
  }
  // The horse trough (stone, water in it).
  const t = SQUARE_PROPS.trough;
  ubox(b, 'stone', t.u, y + 0.35, t.v, 2.4, 0.7, 0.9, GC_PAINT.stone);
  ubox(b, 'glow', t.u, y + 0.62, t.v, 2.1, 0.04, 0.6, 0x2f4f5f);
  solid(out, t.u, t.v, 2.5, 1.0, y, y + 0.75, false);
  // The well up the town, by the lane: a round stone kerb, two posts, a little slate roof.
  const w = SQUARE_PROPS.well;
  const wg = ground(w.u, w.v);
  const wp = at(w.u, wg, w.v);
  rod(
    b,
    'stone',
    { x: wp.x, y: wg - 0.3, z: wp.z },
    { x: wp.x, y: wg + 0.8, z: wp.z },
    0.95,
    10,
    GC_PAINT.stone,
    0.95,
    true,
  );
  if (!lite) {
    for (const s of [-1, 1]) {
      const q = at(w.u + s * 0.9, wg, w.v);
      rod(b, 'wood', { x: q.x, y: wg, z: q.z }, { x: q.x, y: wg + 2.2, z: q.z }, 0.07, 5, GC_PAINT.timber);
    }
    ubox(b, 'paving', w.u, wg + 2.35, w.v, 2.4, 0.12, 1.6, GC_PAINT.slate);
  }
  out.circles.push({ x: wp.x, z: wp.z, r: 1.2, y0: wg - 0.5, y1: wg + 2.4, height: 2.4 });
}

/**
 * The Kirk Brae's two stair flights (spec §3.5): the steep middle of each stretch of the lane, stone
 * steps railed on both sides (Keelhaven P04), the lane's ramp under them (the walker's surface).
 */
function brae(b: Buckets, out: GcOut): void {
  for (let i = 0; i + 1 < BRAE.length; i++) {
    const a = BRAE[i]!;
    const e = BRAE[i + 1]!;
    const at = (t: number) =>
      [a.u + (e.u - a.u) * t, a.v + (e.v - a.v) * t, a.y + (e.y - a.y) * t + 0.03] as const;
    flight(b, out, at(0.3), at(0.7), 2.4);
  }
}

/** Washing lines between the houses up the town (kinetic in the wind's colours, still here). */
function washing(b: Buckets): void {
  const lines = [
    [-185, 59, -180, 61.5],
    [-150, 79, -144, 80],
  ] as const;
  const colours = [0xf2ece0, 0x8aa0b8, 0xd8b97a, 0xf2ece0, 0x9c3a4a];
  for (const [u0, v0, u1, v1] of lines) {
    const y0 = ground(u0, v0) + 2.4;
    const y1 = ground(u1, v1) + 2.4;
    for (const [u, v, y] of [
      [u0, v0, y0],
      [u1, v1, y1],
    ] as const) {
      const p = at(u, 0, v);
      rod(
        b,
        'wood',
        { x: p.x, y: y - 2.6, z: p.z },
        { x: p.x, y: y + 0.1, z: p.z },
        0.05,
        5,
        GC_PAINT.timber,
      );
    }
    rope(b, at(u0, y0, v0), at(u1, y1, v1), 0.25, 0.012);
    const yaw = yawAlong(u1 - u0, v1 - v0);
    for (let k = 1; k <= 4; k++) {
      const t = k / 5;
      const p = at(u0 + (u1 - u0) * t, 0, v0 + (v1 - v0) * t);
      const y = y0 + (y1 - y0) * t - 0.25 * 4 * t * (1 - t);
      box(b, 'cloth', p.x, y - 0.35, p.z, 0.7, 0.62, 0.02, yaw, colours[k % colours.length]!);
    }
  }
}

/**
 * The quay: a stone wall along the loch from its bed to the deck (2.2 m), its face on `QUAY.v`,
 * paving on top, timber fenders down the face every 6 m, bollards, a lamp at its west end, and a
 * slipway down into the loch at its east end. The ship's obstacles run along the face.
 */
function quay(b: Buckets, out: GcOut): void {
  const q = QUAY;
  const back = q.v + 3;
  for (let u = q.u0; u < q.u1; u += 6) {
    const u1 = Math.min(q.u1, u + 6);
    const mid = (u + u1) / 2;
    const bed = Math.min(ground(mid, q.v - 1), ground(mid, q.v + 0.5)) - 0.8;
    uvSpan(b, 'stone', u, u1, q.v - 0.2, back, bed, 0.4, GC_PAINT.wetStone);
    uvSpan(b, 'stone', u, u1, q.v - 0.2, back, 0.4, q.top - 0.18, GC_PAINT.stone);
  }
  // The coping and the paving behind it (3 cm over the deck's ground: the terrain's pad is at 2.2).
  uvSpan(
    b,
    'paving',
    q.u0 - 0.1,
    q.u1 + 0.1,
    q.v - 0.3,
    back + 0.1,
    q.top - 0.16,
    q.top + 0.03,
    GC_PAINT.paving,
  );
  out.decks.push(uvDeck(q.u0 - 0.1, q.u1 + 0.1, q.v - 0.3, back + 0.1, q.top + 0.03, false));
  // Fenders and a rubbing timber down the face.
  ubox(b, 'wood', (q.u0 + q.u1) / 2, q.top - 0.5, q.v - 0.36, q.u1 - q.u0 - 2, 0.3, 0.3, GC_PAINT.tar);
  for (let u = q.u0 + 3; u <= q.u1 - 3; u += 6)
    ubox(b, 'wood', u, q.top - 1.5, q.v - 0.42, 0.3, 2.6, 0.24, GC_PAINT.tar);
  for (let u = q.u0 + 6; u <= q.u1 - 6; u += 12) {
    const p = at(u, q.top, q.v + 0.9);
    rod(b, 'metal', p, { x: p.x, y: q.top + 0.6, z: p.z }, 0.18, 8, GC_PAINT.iron, 0.22);
    out.circles.push({ x: p.x, z: p.z, r: 0.3, y0: q.top - 0.5, y1: q.top + 0.7, height: 0.7 });
  }
  // Ship obstacles along the face (clear of a berthed hull) and round the quay's west end.
  for (let u = q.u0 + 1; u <= q.u1 - 1; u += 3) {
    const p = at(u, 0, q.v + 1.4);
    out.shipObstacles.push({ x: p.x, z: p.z, r: 1.2 });
  }
  const west = at(q.u0 - 1, 0, q.v + 2);
  out.shipObstacles.push({ x: west.x, z: west.z, r: 3 });
  // A rail along the face, but for the gangway's gap at the berth (u −204…−184).
  for (const [u0, u1] of [
    [q.u0 + 0.5, -205],
    [-183, q.u1 - 9],
  ] as const) {
    const y = q.top + 0.03;
    const p0 = at(u0, y + 0.95, q.v + 0.25);
    const p1 = at(u1, y + 0.95, q.v + 0.25);
    rod(b, 'metal', p0, p1, 0.03, 5, GC_PAINT.iron);
    for (let u = u0; u <= u1 + 0.01; u += (u1 - u0) / Math.max(1, Math.round((u1 - u0) / 2.5))) {
      const pp = at(u, y, q.v + 0.25);
      rod(b, 'metal', pp, { x: pp.x, y: y + 0.95, z: pp.z }, 0.03, 4, GC_PAINT.iron);
    }
    const mid = at((u0 + u1) / 2, 0, q.v + 0.25);
    out.colliders.push({
      x: mid.x,
      z: mid.z,
      hx: (u1 - u0) / 2,
      hz: 0.15,
      rot: YAW_U,
      y0: q.top - 0.4,
      y1: q.top + 1.6,
      height: 1,
      eyeTop: q.top + 1,
    });
  }
  // A lamp at the quay's west end.
  lampPost(b, out, q.u0 + 2, q.v + 2.2, YAW_U + Math.PI / 2);
  // The slipway at its east end: a stone ramp down into the loch.
  const s0 = q.u1 - 8;
  const s1 = q.u1 - 2;
  const top = q.top + 0.03;
  const foot = -0.6;
  const vEnd = q.v - 8;
  for (let k = 0; k < 8; k++) {
    const va = q.v - (k * 8) / 8;
    const vb = q.v - ((k + 1) * 8) / 8;
    const ya = top + ((foot - top) * k) / 8;
    const yb = top + ((foot - top) * (k + 1)) / 8;
    const bed = Math.min(ground((s0 + s1) / 2, vb), yb) - 0.6;
    uvSpan(b, 'stone', s0, s1, vb, va + 0.01, bed, (ya + yb) / 2, GC_PAINT.wetStone);
  }
  out.decks.push(lineDeck([(s0 + s1) / 2, q.v, top], [(s0 + s1) / 2, vEnd, foot], (s1 - s0) / 2, false));
}

import { dressTown } from './dressing';
import { box, rod, rope, type Buckets } from '../../village/pieces';
import { lineDeck, uvDeck } from '../../village/walk-decks';
import {
  adobeHouse,
  at,
  awning,
  CLOTHS,
  door,
  ground,
  hangLantern,
  lampPost,
  pennants,
  SIGN_CREAM,
  signAt,
  solid,
  SS_PAINT,
  tent,
  ubox,
  uvSpan,
  yawAlong,
  YAW_U,
  type SsOut,
} from './build';
import { CAMP, CARAVANSERAI as C, QUAY, SQUARE, toWorld, WELL } from './layout';
import { HOUSES, SERAI, SQUARE_PROPS, STALLS, TENTS } from './town';

/**
 * Builds Sunspire's port (spec §3): the stone quay along the cove with its fenders, bollards and
 * steps down to the water; the adobe houses up the slope; the caravanserai (a walled court with a
 * gate, an arcade and the players' rug); the bazaar square with its paving, stalls, the weighing
 * table and a fountain; pennant lines over the lane; and the oasis camp's tents and well. Into the
 * kit's buckets, a part a step.
 */
export function* buildTown(b: Buckets, out: SsOut, lite: boolean): Generator<void, void, void> {
  quay(b, out);
  yield;
  for (const h of HOUSES) {
    if (lite && !h.lite) continue;
    adobeHouse(b, out, h);
    yield;
  }
  caravanserai(b, out);
  yield;
  square(b, out, lite);
  yield;
  camp(b, out, lite);
  if (!lite) {
    // Pennants over the lane, house to house.
    pennants(b, [-176, 36, ground(-176, 36) + 4.6], [-166, 41.5, C.y + SERAI.wall + 0.3]);
    pennants(b, [-136.5, 48.4, ground(-136, 48) + 4.4], [-120.5, 44, SQUARE.y + 4.2]);
    pennants(b, [-110, 67, SQUARE.y + 4.6], [-104, 32, SQUARE.y + 4.4], 0.9);
    washing(b);
    dressTown(b, out);
    yield;
  }
  // Lanterns on posts up the lane and at the square's corners.
  const o = toWorld(0, 0);
  for (const [u, v, du, dv] of [
    [-178, 26, 0.6, 1],
    [-148, 39, 0, -1],
    [-124, 40, 1, 0.4],
    [-80, 66, -1, -1],
    [-80, 37, -1, 1],
  ] as const) {
    const w = toWorld(du, dv);
    lampPost(b, out, u, v, Math.atan2(-(w.z - o.z), w.x - o.x));
  }
}

/**
 * The quay: a stone wall along the cove from its bed to the deck (2.2 m), its face on `QUAY.v`,
 * paving on top, timber fenders down the face, bollards, a lamp at its west end, and broad steps
 * down into the water at its east end. The ship's obstacles run along the face.
 */
function quay(b: Buckets, out: SsOut): void {
  const q = QUAY;
  const back = q.v + 3;
  for (let u = q.u0; u < q.u1; u += 6) {
    const u1 = Math.min(q.u1, u + 6);
    const mid = (u + u1) / 2;
    const bed = Math.min(ground(mid, q.v - 1), ground(mid, q.v + 0.5)) - 0.8;
    uvSpan(b, 'stone', u, u1, q.v - 0.2, back, bed, 0.4, SS_PAINT.wetStone);
    uvSpan(b, 'stone', u, u1, q.v - 0.2, back, 0.4, q.top - 0.18, SS_PAINT.redStone);
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
    SS_PAINT.paving,
  );
  out.decks.push(uvDeck(q.u0 - 0.1, q.u1 + 0.1, q.v - 0.3, back + 0.1, q.top + 0.03, false));
  // Fenders and a rubbing timber down the face.
  ubox(b, 'wood', (q.u0 + q.u1) / 2, q.top - 0.5, q.v - 0.36, q.u1 - q.u0 - 2, 0.3, 0.3, SS_PAINT.darkTimber);
  for (let u = q.u0 + 3; u <= q.u1 - 3; u += 6)
    ubox(b, 'wood', u, q.top - 1.5, q.v - 0.42, 0.3, 2.6, 0.24, SS_PAINT.darkTimber);
  for (let u = q.u0 + 6; u <= q.u1 - 6; u += 12) {
    const p = at(u, q.top, q.v + 0.9);
    rod(b, 'metal', p, { x: p.x, y: q.top + 0.6, z: p.z }, 0.18, 8, SS_PAINT.iron, 0.22);
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
    rod(b, 'metal', p0, p1, 0.03, 5, SS_PAINT.iron);
    for (let u = u0; u <= u1 + 0.01; u += (u1 - u0) / Math.max(1, Math.round((u1 - u0) / 2.5))) {
      const pp = at(u, y, q.v + 0.25);
      rod(b, 'metal', pp, { x: pp.x, y: y + 0.95, z: pp.z }, 0.03, 4, SS_PAINT.iron);
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
  lampPost(b, out, q.u0 + 2, q.v + 2.2, YAW_U + Math.PI / 2);
  // The water steps at its east end: a stone ramp down into the cove.
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
    uvSpan(b, 'stone', s0, s1, vb, va + 0.01, bed, (ya + yb) / 2, SS_PAINT.wetStone);
  }
  out.decks.push(lineDeck([(s0 + s1) / 2, q.v, top], [(s0 + s1) / 2, vEnd, foot], (s1 - s0) / 2, false));
}

/**
 * The caravanserai: four adobe walls round a paved court, a gate with a timber lintel in the south
 * wall (toward the quay lane), an arcade of timber posts along the north wall with a reed roof and
 * the players' rug under it, lanterns under the arcade, and its sign over the gate.
 */
function caravanserai(b: Buckets, out: SsOut): void {
  const y = C.y;
  const top = y + SERAI.wall;
  const t = 0.7;
  const u0 = C.u - C.halfU;
  const u1 = C.u + C.halfU;
  const v0 = C.v - C.halfV;
  const v1 = C.v + C.halfV;
  const foot = Math.min(ground(u0, v0), ground(u1, v0), ground(u0, v1), ground(u1, v1)) - 0.6;
  // The paved court (3 cm over the pad).
  uvSpan(b, 'paving', u0 + t, u1 - t, v0 + t, v1 - t, y - 0.2, y + 0.03, SS_PAINT.paving);
  out.decks.push(uvDeck(u0 + t, u1 - t, v0 + t, v1 - t, y + 0.03, false));
  // North, west and east walls, whole.
  const wall = (a0: number, a1: number, c0: number, c1: number) => {
    uvSpan(b, 'plaster', a0, a1, c0, c1, foot, top, SS_PAINT.adobe);
    solid(out, (a0 + a1) / 2, (c0 + c1) / 2, a1 - a0, c1 - c0, foot, top);
  };
  wall(u0, u1, v1 - t, v1);
  wall(u0, u0 + t, v0, v1 - t);
  wall(u1 - t, u1, v0, v1 - t);
  // The south wall either side of the gate, and its head over the gate's lintel.
  const g = SERAI.gate;
  wall(u0 + t, C.u - g.halfWidth, v0, v0 + t);
  wall(C.u + g.halfWidth, u1 - t, v0, v0 + t);
  uvSpan(
    b,
    'plaster',
    C.u - g.halfWidth,
    C.u + g.halfWidth,
    v0,
    v0 + t,
    y + g.height,
    top + 0.5,
    SS_PAINT.adobe,
  );
  ubox(
    b,
    'wood',
    C.u,
    y + g.height - 0.12,
    v0 + t / 2,
    g.halfWidth * 2 + 0.6,
    0.26,
    t + 0.16,
    SS_PAINT.darkTimber,
  );
  out.cameraBoxes.push({
    ...at(C.u, 0, v0 + t / 2),
    hx: g.halfWidth,
    hz: t / 2,
    rot: YAW_U,
    y0: y + g.height - 0.3,
    y1: top + 0.5,
  });
  // Soft crowns at the wall's corners and by the gate.
  for (const [cu, cv] of [
    [u0 + 0.35, v0 + 0.35],
    [u1 - 0.35, v0 + 0.35],
    [u0 + 0.35, v1 - 0.35],
    [u1 - 0.35, v1 - 0.35],
    [C.u - g.halfWidth - 0.4, v0 + 0.35],
    [C.u + g.halfWidth + 0.4, v0 + 0.35],
  ] as const)
    ubox(b, 'plaster', cu, top + 0.25, cv, 0.8, 0.5, 0.8, SS_PAINT.adobe);
  // Its name over the gate, on the lane's side.
  out.signs.push(
    signAt(
      C.u,
      y + g.height + 0.75,
      v0,
      0,
      -1,
      { lines: ['seraiSign'], w: 3.2, h: 0.6, fill: '#2c5c9a', colors: SIGN_CREAM },
      0.02,
    ),
  );
  ubox(b, 'wood', C.u, y + g.height + 0.75, v0 - 0.01, 3.4, 0.76, 0.05, SS_PAINT.cobalt);
  // The arcade along the north wall: posts, a beam, a reed roof.
  const a = SERAI.arcade;
  const front = v1 - t - a.depth;
  // Two posts at each end and a wide middle bay: nothing stands between the players and the court.
  for (const u of [u0 + t + 1.2, C.u - 4.2, C.u + 4.2, u1 - t - 1.2]) {
    const p = at(u, y, front);
    ubox(b, 'stone', u, y + 0.14, front, 0.5, 0.3, 0.5, SS_PAINT.redStone);
    rod(
      b,
      'wood',
      { x: p.x, y: y + 0.28, z: p.z },
      { x: p.x, y: y + a.height, z: p.z },
      0.1,
      6,
      SS_PAINT.timber,
    );
    out.circles.push({ x: p.x, z: p.z, r: 0.2, y0: y - 0.3, y1: y + a.height, height: a.height });
  }
  ubox(b, 'wood', C.u, y + a.height + 0.1, front, u1 - u0 - 2 * t, 0.2, 0.22, SS_PAINT.darkTimber);
  ubox(
    b,
    'thatch',
    C.u,
    y + a.height + 0.3,
    front + a.depth / 2,
    u1 - u0 - 2 * t,
    0.16,
    a.depth + 0.4,
    SS_PAINT.reed,
    0,
    0.05,
  );
  out.cameraBoxes.push({
    ...at(C.u, 0, front + a.depth / 2),
    hx: C.halfU - t,
    hz: a.depth / 2 + 0.2,
    rot: YAW_U,
    y0: y + a.height,
    y1: y + a.height + 0.5,
  });
  for (const du of [-5, 5]) {
    const l = at(C.u + du, 0, front + 0.6);
    hangLantern(b, out, l.x, y + a.height, l.z, YAW_U);
  }
  // The players' rug under the arcade, and cushions (their seats: seat-fit's height).
  ubox(b, 'cloth', C.u, y + 0.045, front + a.depth / 2 + 0.2, 6.4, 0.03, 2.6, SS_PAINT.madder);
  ubox(b, 'cloth', C.u, y + 0.052, front + a.depth / 2 + 0.2, 5.6, 0.03, 1.8, SS_PAINT.indigo);
  // A trough and a palm tub in the court.
  ubox(b, 'stone', u0 + 3.2, y + 0.33, v0 + 2.2, 2.4, 0.6, 0.9, SS_PAINT.paleStone);
  ubox(b, 'glow', u0 + 3.2, y + 0.58, v0 + 2.2, 2.1, 0.04, 0.6, 0x2f5f6f);
  solid(out, u0 + 3.2, v0 + 2.2, 2.5, 1, y, y + 0.7, false);
  // A door in the west wall's inside (the keeper's room), for depth.
  door(b, u0 + t + 0.01, C.v + 1, y + 0.03, 1, 0, 1.1, 2.1, SS_PAINT.cobalt);
}

/** The bazaar square: paving, stalls under awnings, the weighing table, a tiled fountain, benches. */
function square(b: Buckets, out: SsOut, lite: boolean): void {
  // Paving over the square (one slab 3 cm over the pad: no z-fight with the ground).
  ubox(
    b,
    'paving',
    SQUARE.u,
    SQUARE.y - 0.07,
    SQUARE.v,
    SQUARE.halfU * 2,
    0.2,
    SQUARE.halfV * 2,
    SS_PAINT.paving,
  );
  const y = SQUARE.y + 0.03;
  let k = 0;
  for (const s of STALLS) {
    if (lite && k++ % 2) continue;
    stall(b, out, s, y);
  }
  // The weighing table: a stone bench with a brass balance (its beam, two pans).
  const sc = SQUARE_PROPS.scales;
  ubox(b, 'stone', sc.u, y + 0.42, sc.v, 2.2, 0.84, 1.0, SS_PAINT.paleStone);
  ubox(b, 'wood', sc.u, y + 0.87, sc.v, 2.3, 0.06, 1.1, SS_PAINT.timber);
  const sp = at(sc.u, 0, sc.v);
  rod(
    b,
    'metal',
    { x: sp.x, y: y + 0.9, z: sp.z },
    { x: sp.x, y: y + 1.75, z: sp.z },
    0.03,
    6,
    SS_PAINT.brass,
  );
  ubox(b, 'metal', sc.u, y + 1.72, sc.v, 1.3, 0.035, 0.035, SS_PAINT.brass);
  for (const side of [-1, 1]) {
    const pan = at(sc.u + side * 0.62, 0, sc.v);
    rod(
      b,
      'metal',
      { x: pan.x, y: y + 1.72, z: pan.z },
      { x: pan.x, y: y + 1.32, z: pan.z },
      0.006,
      3,
      SS_PAINT.brass,
    );
    rod(
      b,
      'metal',
      { x: pan.x, y: y + 1.29, z: pan.z },
      { x: pan.x, y: y + 1.32, z: pan.z },
      0.2,
      10,
      SS_PAINT.brass,
    );
  }
  solid(out, sc.u, sc.v, 2.4, 1.2, y, y + 0.95, false);
  // The fountain: an octagon basin with blue tiles, a spout in its middle.
  const f = SQUARE_PROPS.fountain;
  const fp = at(f.u, 0, f.v);
  rod(
    b,
    'stone',
    { x: fp.x, y: y - 0.1, z: fp.z },
    { x: fp.x, y: y + 0.62, z: fp.z },
    1.7,
    8,
    SS_PAINT.paleStone,
    1.7,
  );
  rod(
    b,
    'plaster',
    { x: fp.x, y: y + 0.6, z: fp.z },
    { x: fp.x, y: y + 0.66, z: fp.z },
    1.45,
    8,
    SS_PAINT.cobalt,
    1.45,
  );
  rod(
    b,
    'glow',
    { x: fp.x, y: y + 0.645, z: fp.z },
    { x: fp.x, y: y + 0.675, z: fp.z },
    1.3,
    8,
    0x2f6f7f,
    1.3,
  );
  rod(
    b,
    'stone',
    { x: fp.x, y: y + 0.6, z: fp.z },
    { x: fp.x, y: y + 1.5, z: fp.z },
    0.2,
    8,
    SS_PAINT.paleStone,
    0.14,
  );
  rod(
    b,
    'stone',
    { x: fp.x, y: y + 1.48, z: fp.z },
    { x: fp.x, y: y + 1.6, z: fp.z },
    0.5,
    8,
    SS_PAINT.paleStone,
    0.56,
  );
  out.circles.push({ x: fp.x, z: fp.z, r: 1.8, y0: y - 0.5, y1: y + 1.6, height: 1.6 });
  for (const bn of SQUARE_PROPS.benches) {
    const yaw = yawAlong(-bn.fv, bn.fu) - YAW_U;
    ubox(b, 'wood', bn.u, y + 0.45, bn.v, 2.0, 0.08, 0.45, SS_PAINT.timber, yaw);
    for (const s of [-0.8, 0.8]) {
      const pu = bn.u + (bn.fu === 0 ? s : 0);
      const pv = bn.v + (bn.fv === 0 ? s : 0);
      ubox(b, 'stone', pu, y + 0.21, pv, 0.2, 0.42, 0.4, SS_PAINT.paleStone, yaw);
    }
    solid(out, bn.u, bn.v, bn.fu === 0 ? 2.1 : 0.6, bn.fu === 0 ? 0.6 : 2.1, y, y + 0.55, false);
  }
}

/** A bazaar stall: a timber counter with goods on it, under an awning on four poles. */
function stall(
  b: Buckets,
  out: SsOut,
  s: { u: number; v: number; fu: number; fv: number; cloth: number; goods: number },
  y: number,
): void {
  const yaw = yawAlong(-s.fv, s.fu) - YAW_U;
  ubox(b, 'wood', s.u, y + 0.45, s.v, 3.0, 0.9, 1.0, SS_PAINT.timber, yaw);
  ubox(b, 'cloth', s.u, y + 0.915, s.v, 3.1, 0.03, 1.1, SS_PAINT.canvas, yaw);
  // Goods: three baskets and a bolt of cloth.
  for (const [o, r, h] of [
    [-1.0, 0.3, 0.26],
    [-0.3, 0.26, 0.32],
    [0.4, 0.3, 0.22],
  ] as const) {
    const p = at(s.u - s.fv * o, 0, s.v + s.fu * o);
    rod(
      b,
      'thatch',
      { x: p.x, y: y + 0.93, z: p.z },
      { x: p.x, y: y + 0.93 + h, z: p.z },
      r * 0.8,
      8,
      SS_PAINT.reed,
      r,
    );
    rod(
      b,
      'cloth',
      { x: p.x, y: y + 0.93 + h - 0.03, z: p.z },
      { x: p.x, y: y + 0.93 + h + 0.05, z: p.z },
      r * 0.86,
      8,
      s.goods,
      r * 0.5,
    );
  }
  ubox(b, 'cloth', s.u - s.fv * 1.1, y + 1.02, s.v + s.fu * 1.1, 0.5, 0.18, 0.8, s.cloth, yaw);
  // The awning stands free over the counter: its high edge at the back.
  awning(b, s.u - s.fu * 0.2, s.v - s.fv * 0.2, y + 2.9, s.fu, s.fv, 3.4, 2.4, s.cloth);
  for (const side of [-1, 1]) {
    const pu = s.u - s.fv * side * 1.6 - s.fu * 1.3;
    const pv = s.v + s.fu * side * 1.6 - s.fv * 1.3;
    const p = at(pu, y, pv);
    rod(b, 'wood', { x: p.x, y: y - 0.2, z: p.z }, { x: p.x, y: y + 2.92, z: p.z }, 0.05, 5, SS_PAINT.timber);
  }
  solid(out, s.u, s.v, s.fu === 0 ? 3.1 : 1.1, s.fu === 0 ? 1.1 : 3.1, y, y + 1.0, false);
}

/** The oasis camp: three tents, a fire ring, and the well with its wheel's frame (the wheel turns). */
function camp(b: Buckets, out: SsOut, lite: boolean): void {
  let k = 0;
  for (const t of TENTS) {
    if (lite && k++ === 2) continue;
    tent(b, out, t.u, t.v, t.du, t.dv, 4.2, 3.4, t.cloth);
  }
  const y = CAMP.y;
  const fire = at(CAMP.u + 1, y, CAMP.v - 4);
  for (let i = 0; i < 8; i++) {
    const an = (i / 8) * Math.PI * 2;
    box(
      b,
      'stone',
      fire.x + Math.cos(an) * 0.7,
      y + 0.1,
      fire.z + Math.sin(an) * 0.7,
      0.3,
      0.22,
      0.26,
      an,
      SS_PAINT.redStone,
    );
  }
  out.circles.push({ x: fire.x, z: fire.z, r: 0.9, y0: y - 0.3, y1: y + 0.4, height: 0.4 });
  // The well: a round stone kerb, two posts and a cross beam for the wheel (the wheel is the world's).
  const wg = ground(WELL.u, WELL.v);
  const wp = at(WELL.u, wg, WELL.v);
  rod(
    b,
    'stone',
    { x: wp.x, y: wg - 0.3, z: wp.z },
    { x: wp.x, y: wg + 0.85, z: wp.z },
    1.05,
    12,
    SS_PAINT.paleStone,
    1.05,
    true,
  );
  rod(
    b,
    'glow',
    { x: wp.x, y: wg + 0.2, z: wp.z },
    { x: wp.x, y: wg + 0.24, z: wp.z },
    0.95,
    12,
    0x24505c,
    0.95,
  );
  for (const s of [-1, 1]) {
    const q = at(WELL.u + s * 1.2, wg, WELL.v);
    rod(
      b,
      'wood',
      { x: q.x, y: wg - 0.2, z: q.z },
      { x: q.x, y: wg + 2.5, z: q.z },
      0.08,
      6,
      SS_PAINT.timber,
    );
  }
  const a = at(WELL.u - 1.3, wg + 2.4, WELL.v);
  const e = at(WELL.u + 1.3, wg + 2.4, WELL.v);
  rod(b, 'wood', a, e, 0.06, 6, SS_PAINT.darkTimber);
  rope(b, { x: wp.x, y: wg + 2.38, z: wp.z }, { x: wp.x, y: wg + 0.5, z: wp.z }, 0, 0.015);
  out.circles.push({ x: wp.x, z: wp.z, r: 1.25, y0: wg - 0.5, y1: wg + 2.5, height: 2.5 });
}

/** Washing lines on the upper terrace's roofs. */
function washing(b: Buckets): void {
  const lines = [
    [-188, 74.5, -177, 78],
    [-150, 80.5, -139, 86],
  ] as const;
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
        SS_PAINT.timber,
      );
    }
    rope(b, at(u0, y0, v0), at(u1, y1, v1), 0.25, 0.012);
    const yaw = yawAlong(u1 - u0, v1 - v0);
    for (let k = 1; k <= 5; k++) {
      const t = k / 6;
      const p = at(u0 + (u1 - u0) * t, 0, v0 + (v1 - v0) * t);
      const y = y0 + (y1 - y0) * t - 0.25 * 4 * t * (1 - t);
      box(b, 'cloth', p.x, y - 0.35, p.z, 0.7, 0.62, 0.02, yaw, CLOTHS[k % CLOTHS.length]!);
    }
  }
}

import { CylinderGeometry, type BufferGeometry } from 'three/webgpu';
import { box, rod, type Buckets } from '../../village/pieces';
import { uvDeck } from '../../village/walk-decks';
import {
  adobeHouse,
  at,
  flight,
  lampPost,
  lowWall,
  pennants,
  rail,
  SIGN_CREAM,
  signAt,
  solid,
  SS_PAINT,
  ubox,
  uvSpan,
  yawAlong,
  YAW_U,
  type SsOut,
} from './build';
import { CIRCUIT_SPOTS, MIRROR } from './circuit';
import { COURT, HIGH_MESA, LOW_MESA, SIGNAL_HOUSE, SIGNAL_STAIR, SUN_STAIR, YARD, type Uvy } from './layout';

/**
 * Builds the Low Mesa (spec §3, §5): the Signal Stair's steps and rails, the Signal House with the
 * roll of towers on its wall, the Mirror Court (the brass card, the mirror stands, the shutter's
 * lever, the key desk, the chart tent), the Crate Yard (the caravan row's arch and board, the lading
 * desk, the scale, the bell, Samir's bench and his crates), and the Sun Stair up the High Mesa's wall.
 * Each station has its lamp (`signal:<place>`, `crate:<place>`). Into the kit's buckets, a part a step.
 */
export function* buildMesa(b: Buckets, out: SsOut, lite: boolean): Generator<void, void, void> {
  stair(b, out, SIGNAL_STAIR, [0.25, 0.75]);
  // Rails along the mesa's west rim either side of the stair's head.
  const y = LOW_MESA.y + 0.02;
  rail(b, out, [LOW_MESA.u0 + 1.2, 74, y], [LOW_MESA.u0 + 1.2, 88.6, y]);
  rail(b, out, [LOW_MESA.u0 + 1.2, 95.4, y], [LOW_MESA.u0 + 1.2, 106, y]);
  yield;
  signalHouse(b, out);
  yield;
  court(b, out, lite);
  yield;
  yard(b, out, lite);
  yield;
  stair(b, out, SUN_STAIR.slice(0, 5), [0, 1]);
  // Rails along the High Mesa's west rim either side of the stair's head.
  const hy = HIGH_MESA.y + 0.02;
  rail(b, out, [HIGH_MESA.u0 + 1.4, 96, hy], [HIGH_MESA.u0 + 1.4, 106.6, hy]);
  rail(b, out, [HIGH_MESA.u0 + 1.4, 113.4, hy], [HIGH_MESA.u0 + 1.4, 124, hy]);
  // The stations' lamps: a post at each, its arm toward the place the station looks at.
  for (const [kind, spots] of Object.entries(CIRCUIT_SPOTS))
    for (const [place, s] of Object.entries(spots)) {
      // A step to the station's left, clear of where the player stands and of what it looks at.
      const du = s.look.u - s.u;
      const dv = s.look.v - s.v;
      const len = Math.hypot(du, dv) || 1;
      const lu = s.u + (du / len) * 1.2 - (dv / len) * 1.7;
      const lv = s.v + (dv / len) * 1.2 + (du / len) * 1.7;
      lampPost(b, out, lu, lv, yawAlong(dv / len, -du / len), { lamp: `${kind}:${place}`, look: 'dark' });
    }
}

/** Stone steps with rails on the middle `span` (fractions) of each sloping leg of a path. */
function stair(b: Buckets, out: SsOut, pts: readonly Uvy[], span: readonly [number, number]): void {
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i]!;
    const e = pts[i + 1]!;
    if (Math.abs(e.y - a.y) < 0.5) continue;
    const p = (t: number) =>
      [a.u + (e.u - a.u) * t, a.v + (e.v - a.v) * t, a.y + (e.y - a.y) * t + 0.03] as const;
    flight(b, out, p(span[0]), p(span[1]), 2.4);
  }
}

/** The Signal House: a whitewashed two-storey adobe hall, a signal mast on its roof, the roll on its wall. */
function signalHouse(b: Buckets, out: SsOut): void {
  const s = SIGNAL_HOUSE;
  const { roof, base } = adobeHouse(b, out, {
    u: s.u,
    v: s.v,
    fu: 0,
    fv: -1,
    w: 12,
    d: s.halfV * 2,
    storeys: 2,
    tint: SS_PAINT.whitewash,
    awning: SS_PAINT.indigo,
    lite: true,
  });
  // A small heliograph on the roof terrace: a brass post and a tilted mirror.
  const m = at(s.u + 3.6, 0, s.v - 3.2);
  rod(b, 'metal', { x: m.x, y: roof, z: m.z }, { x: m.x, y: roof + 2.2, z: m.z }, 0.05, 6, SS_PAINT.brass);
  box(b, 'metal', m.x, roof + 2.4, m.z, 0.06, 0.8, 0.8, YAW_U + 0.5, SS_PAINT.mirror, 0, 0.3);
  // The roll of towers: a dark board on the front wall with brass tags, its heading the pack's words.
  const front = s.v - s.halfV;
  const roll = CIRCUIT_SPOTS.signal.roll!;
  ubox(b, 'wood', roll.look.u, base + 1.55, front - 0.05, 2.2, 1.5, 0.08, SS_PAINT.darkTimber);
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 4; c++)
      ubox(
        b,
        'metal',
        roll.look.u - 0.75 + c * 0.5,
        base + 1.25 + r * 0.32,
        front - 0.1,
        0.36,
        0.2,
        0.02,
        SS_PAINT.brass,
      );
  out.signs.push(
    signAt(
      roll.look.u,
      base + 2.12,
      front,
      0,
      -1,
      { lines: ['rollHead'], w: 2.0, h: 0.3, fill: '#3a2a20', colors: SIGN_CREAM },
      0.1,
    ),
  );
}

/**
 * The Mirror Court: a paved court behind a low wall, the brass card on its plinth, the great mirror's
 * stand (its head is the world's: it turns) between two fixed mirrors, the shutter's lever, the key
 * desk, and the chart tent with its table.
 */
function court(b: Buckets, out: SsOut, lite: boolean): void {
  const c = COURT;
  const y = c.y + 0.03;
  ubox(b, 'paving', c.u, c.y - 0.07, c.v, c.halfU * 2, 0.2, c.halfV * 2, SS_PAINT.paving);
  out.decks.push(uvDeck(c.u - c.halfU, c.u + c.halfU, c.v - c.halfV, c.v + c.halfV, y, false));
  // A low wall round it, open on the north (from the Signal House) and on the east side's south end
  // (the way on to the yard).
  const u0 = c.u - c.halfU;
  const u1 = c.u + c.halfU;
  const v0 = c.v - c.halfV;
  const v1 = c.v + c.halfV;
  lowWall(b, out, [u0, v0], [u1, v0], 0.9, 0.5, SS_PAINT.adobe);
  lowWall(b, out, [u0, v0], [u0, v1], 0.9, 0.5, SS_PAINT.adobe);
  lowWall(b, out, [u0, v1], [c.u - 16, v1], 0.9, 0.5, SS_PAINT.adobe);
  lowWall(b, out, [c.u - 8, v1], [u1, v1], 0.9, 0.5, SS_PAINT.adobe);
  lowWall(b, out, [u1, v1], [u1, c.v - 3], 0.9, 0.5, SS_PAINT.adobe);
  if (!lite) {
    pennants(b, [u0 + 0.3, v1 - 0.3, y + 3.4], [u1 - 0.3, v1 - 0.3, y + 3.4], 0.8);
    for (const [pu, pv] of [
      [u0 + 0.3, v1 - 0.3],
      [u1 - 0.3, v1 - 0.3],
    ] as const) {
      const p = at(pu, y, pv);
      rod(b, 'wood', p, { x: p.x, y: y + 3.45, z: p.z }, 0.05, 5, SS_PAINT.timber);
    }
  }
  // The brass card: a stone plinth with a tilted brass plate (the pack's words: name, kind, bearing).
  const card = CIRCUIT_SPOTS.signal.card!;
  ubox(b, 'stone', card.look.u, y + 0.5, card.look.v, 1.5, 1.0, 0.7, SS_PAINT.paleStone);
  ubox(b, 'metal', card.look.u, y + 1.16, card.look.v - 0.06, 1.3, 0.04, 0.8, SS_PAINT.brass, 0, 0, 0);
  box(
    b,
    'metal',
    at(card.look.u, 0, card.look.v).x,
    y + 1.3,
    at(card.look.u, 0, card.look.v).z,
    1.3,
    0.7,
    0.04,
    YAW_U,
    SS_PAINT.brass,
    -0.5,
  );
  out.signs.push(
    signAt(
      card.look.u,
      y + 1.3,
      card.look.v,
      0,
      -1,
      {
        lines: ['cardName', 'cardKind', 'cardBearing'],
        w: 1.2,
        h: 0.62,
        tilt: 0.5,
        fill: '#8a6a2a',
        colors: SIGN_CREAM,
      },
      0.04,
    ),
  );
  solid(out, card.look.u, card.look.v, 1.6, 0.9, y, y + 1.5, false);
  // The mirrors: the great one's stand in the middle of the east side, a fixed one either side of it.
  mirrorStand(b, out, MIRROR.u, MIRROR.v, MIRROR.head, 0.9);
  for (const dv of [-8, 8]) {
    mirrorStand(b, out, MIRROR.u + 1, MIRROR.v + dv, MIRROR.y + 1.7, 0.6);
    const p = at(MIRROR.u + 1, 0, MIRROR.v + dv);
    box(
      b,
      'metal',
      p.x,
      MIRROR.y + 1.7,
      p.z,
      0.05,
      0.9,
      0.9,
      YAW_U + (dv > 0 ? 0.7 : -0.6),
      SS_PAINT.mirror,
      0,
      0.25,
    );
  }
  // The shutter's lever: a brass handle on a short post beside the great mirror.
  const sh = CIRCUIT_SPOTS.signal.shutter!;
  const lv = at(sh.look.u, 0, sh.look.v);
  rod(
    b,
    'wood',
    { x: lv.x, y: y - 0.1, z: lv.z },
    { x: lv.x, y: y + 1.0, z: lv.z },
    0.07,
    6,
    SS_PAINT.darkTimber,
  );
  rod(
    b,
    'metal',
    { x: lv.x, y: y + 0.9, z: lv.z },
    { x: lv.x + 0.25, y: y + 1.45, z: lv.z + 0.1 },
    0.025,
    5,
    SS_PAINT.brass,
  );
  out.circles.push({ x: lv.x, z: lv.z, r: 0.2, y0: y - 0.3, y1: y + 1.5, height: 1.5 });
  // The key desk: a slanted desk with message tiles on it, against the south wall.
  const key = CIRCUIT_SPOTS.signal.key!;
  ubox(b, 'wood', key.look.u, y + 0.45, key.look.v, 2.2, 0.9, 0.8, SS_PAINT.timber);
  const kd = at(key.look.u, 0, key.look.v);
  box(b, 'wood', kd.x, y + 1.02, kd.z, 2.2, 0.06, 0.9, YAW_U, SS_PAINT.darkTimber, 0.32);
  for (const o of [-0.7, 0, 0.7]) {
    const t = at(key.look.u + o, 0, key.look.v);
    box(b, 'cloth', t.x, y + 1.07, t.z, 0.5, 0.02, 0.6, YAW_U, SS_PAINT.canvas, 0.32);
  }
  solid(out, key.look.u, key.look.v, 2.3, 0.9, y, y + 1.1, false);
  // The chart tent: a canopy on four poles, a table with the ship's own chart on it.
  const tn = CIRCUIT_SPOTS.signal.tent!;
  const tu = tn.look.u - 0.4;
  const tv = tn.look.v - 0.4;
  for (const [du, dv] of [
    [-1.9, -1.9],
    [1.9, -1.9],
    [-1.9, 1.9],
    [1.9, 1.9],
  ] as const) {
    const p = at(tu + du, y, tv + dv);
    rod(b, 'wood', p, { x: p.x, y: y + 2.6, z: p.z }, 0.05, 5, SS_PAINT.timber);
    out.circles.push({ x: p.x, z: p.z, r: 0.12, y0: y - 0.3, y1: y + 2.6, height: 2.6 });
  }
  ubox(b, 'cloth', tu, y + 2.72, tv, 4.3, 0.04, 4.3, SS_PAINT.canvas);
  ubox(b, 'cloth', tu, y + 2.66, tv - 2.1, 4.3, 0.3, 0.03, SS_PAINT.indigo);
  ubox(b, 'cloth', tu - 2.1, y + 2.66, tv, 0.03, 0.3, 4.3, SS_PAINT.indigo);
  ubox(b, 'wood', tu, y + 0.42, tv, 1.9, 0.84, 1.2, SS_PAINT.timber);
  ubox(b, 'cloth', tu, y + 0.86, tv, 1.6, 0.02, 1.0, SS_PAINT.canvas);
  solid(out, tu, tv, 2.0, 1.3, y, y + 0.9, false);
  out.cameraBoxes.push({ ...at(tu, 0, tv), hx: 2.2, hz: 2.2, rot: YAW_U, y0: y + 2.5, y1: y + 2.9 });
}

/** A mirror stand: a stone drum and a brass post to `head`, with a yoke; the collider round it. */
function mirrorStand(b: Buckets, out: SsOut, u: number, v: number, head: number, r: number): void {
  const p = at(u, 0, v);
  const y = COURT.y;
  rod(
    b,
    'stone',
    { x: p.x, y: y - 0.2, z: p.z },
    { x: p.x, y: y + 0.5, z: p.z },
    r,
    10,
    SS_PAINT.paleStone,
    r * 0.85,
  );
  rod(b, 'metal', { x: p.x, y: y + 0.5, z: p.z }, { x: p.x, y: head - 0.1, z: p.z }, 0.07, 8, SS_PAINT.brass);
  out.circles.push({ x: p.x, z: p.z, r: r + 0.1, y0: y - 0.3, y1: head + 1.2, height: head + 1.2 - y });
}

/**
 * The great mirror's head (the world turns it about +y at `MIRROR`): a brass yoke and a round mirror
 * facing local +x, its middle at the origin. Paint as the buckets' pieces carry it.
 */
export function mirrorHeadGeometry(): BufferGeometry {
  const g = new CylinderGeometry(1.05, 1.05, 0.08, 20);
  g.rotateZ(Math.PI / 2);
  return g;
}

/**
 * The Crate Yard: paving, the caravan row's arch with its board, the lading desk, the scale, the bell
 * on its post, Samir's bench with the crate on it, and stacks of crates.
 */
function yard(b: Buckets, out: SsOut, lite: boolean): void {
  const c = YARD;
  const y = c.y + 0.03;
  ubox(b, 'paving', c.u, c.y - 0.07, c.v, c.halfU * 2, 0.2, c.halfV * 2, SS_PAINT.paving);
  out.decks.push(uvDeck(c.u - c.halfU, c.u + c.halfU, c.v - c.halfV, c.v + c.halfV, y, false));
  // The caravan row's arch on the south side: two adobe piers, a timber lintel, its name on a board.
  const row = CIRCUIT_SPOTS.crate.row!;
  const av = c.v - c.halfV;
  for (const s of [-1, 1]) {
    uvSpan(
      b,
      'plaster',
      row.look.u + s * 2.6 - 0.6,
      row.look.u + s * 2.6 + 0.6,
      av - 0.6,
      av + 0.6,
      c.y - 0.6,
      y + 3.6,
      SS_PAINT.adobe,
    );
    solid(out, row.look.u + s * 2.6, av, 1.3, 1.3, c.y - 0.5, y + 3.6);
    ubox(b, 'plaster', row.look.u + s * 2.6, y + 3.8, av, 1.5, 0.4, 1.5, SS_PAINT.adobe);
  }
  ubox(b, 'wood', row.look.u, y + 3.35, av, 6.6, 0.3, 0.5, SS_PAINT.darkTimber);
  ubox(b, 'wood', row.look.u, y + 2.75, av + 0.05, 3.6, 0.7, 0.06, SS_PAINT.cobalt);
  out.signs.push(
    signAt(
      row.look.u,
      y + 2.75,
      av + 0.05,
      0,
      1,
      { lines: ['caravanRow'], w: 3.4, h: 0.56, fill: '#2c5c9a', colors: SIGN_CREAM },
      0.04,
    ),
  );
  out.cameraBoxes.push({ ...at(row.look.u, 0, av), hx: 3.4, hz: 0.4, rot: YAW_U, y0: y + 2.3, y1: y + 3.6 });
  // The row's board: a catalogue of crates on a stand under the arch's east pier.
  ubox(b, 'wood', row.look.u, y + 1.4, row.look.v, 1.7, 1.3, 0.07, SS_PAINT.darkTimber);
  for (let r = 0; r < 4; r++)
    ubox(b, 'cloth', row.look.u, y + 0.95 + r * 0.3, row.look.v + 0.045, 1.45, 0.2, 0.01, SS_PAINT.canvas);
  for (const s of [-0.75, 0.75]) {
    const p = at(row.look.u + s, y, row.look.v);
    rod(b, 'wood', p, { x: p.x, y: y + 2.1, z: p.z }, 0.05, 5, SS_PAINT.timber);
  }
  solid(out, row.look.u, row.look.v, 1.8, 0.4, y, y + 2.1, false);
  // The lading desk: a standing desk with a scroll and an ink pot.
  const la = CIRCUIT_SPOTS.crate.lading!;
  ubox(b, 'wood', la.look.u, y + 0.5, la.look.v, 1.6, 1.0, 0.7, SS_PAINT.timber);
  const ld = at(la.look.u, 0, la.look.v);
  box(b, 'wood', ld.x, y + 1.08, ld.z, 1.6, 0.05, 0.8, YAW_U, SS_PAINT.darkTimber, -0.28);
  box(b, 'cloth', ld.x, y + 1.115, ld.z, 1.0, 0.015, 0.6, YAW_U, SS_PAINT.canvas, -0.28);
  solid(out, la.look.u, la.look.v, 1.7, 0.8, y, y + 1.15, false);
  // The scale: a timber platform, an iron post and a brass beam with a weight.
  const sc = CIRCUIT_SPOTS.crate.scale!;
  ubox(b, 'wood', sc.look.u, y + 0.08, sc.look.v, 2.2, 0.16, 2.2, SS_PAINT.timber);
  const sp = at(sc.look.u + 1.3, 0, sc.look.v);
  rod(b, 'metal', { x: sp.x, y, z: sp.z }, { x: sp.x, y: y + 2.4, z: sp.z }, 0.07, 6, SS_PAINT.iron);
  const sb = at(sc.look.u + 0.3, 0, sc.look.v);
  rod(
    b,
    'metal',
    { x: sp.x, y: y + 2.3, z: sp.z },
    { x: sb.x, y: y + 2.3, z: sb.z },
    0.03,
    5,
    SS_PAINT.brass,
  );
  rod(b, 'metal', { x: sb.x, y: y + 2.3, z: sb.z }, { x: sb.x, y: y + 1.9, z: sb.z }, 0.01, 4, SS_PAINT.iron);
  rod(
    b,
    'metal',
    { x: sb.x, y: y + 1.7, z: sb.z },
    { x: sb.x, y: y + 1.9, z: sb.z },
    0.12,
    8,
    SS_PAINT.brass,
    0.08,
  );
  out.circles.push({ x: sp.x, z: sp.z, r: 0.2, y0: y - 0.3, y1: y + 2.4, height: 2.4 });
  // The bell: a post with an arm, a brass bell and its plate (the pack's words).
  const be = CIRCUIT_SPOTS.crate.bell!;
  const bp = at(be.look.u, 0, be.look.v);
  rod(
    b,
    'wood',
    { x: bp.x, y: y - 0.2, z: bp.z },
    { x: bp.x, y: y + 2.9, z: bp.z },
    0.08,
    6,
    SS_PAINT.darkTimber,
  );
  const arm = at(be.look.u - 0.7, 0, be.look.v);
  rod(
    b,
    'wood',
    { x: bp.x, y: y + 2.75, z: bp.z },
    { x: arm.x, y: y + 2.75, z: arm.z },
    0.05,
    5,
    SS_PAINT.darkTimber,
  );
  rod(
    b,
    'metal',
    { x: arm.x, y: y + 2.2, z: arm.z },
    { x: arm.x, y: y + 2.65, z: arm.z },
    0.26,
    10,
    SS_PAINT.brass,
    0.1,
  );
  ubox(b, 'metal', be.look.u, y + 1.5, be.look.v - 0.1, 0.9, 0.3, 0.03, SS_PAINT.brass);
  out.signs.push(
    signAt(
      be.look.u,
      y + 1.5,
      be.look.v - 0.1,
      0,
      -1,
      { lines: ['bellPlate'], w: 0.84, h: 0.24, fill: '#8a6a2a', colors: SIGN_CREAM },
      0.02,
    ),
  );
  out.circles.push({ x: bp.x, z: bp.z, r: 0.22, y0: y - 0.3, y1: y + 2.9, height: 2.9 });
  // Samir's bench: a work bench against the north side with the sealed crate on it.
  const bn = CIRCUIT_SPOTS.crate.bench!;
  ubox(b, 'wood', bn.look.u, y + 0.45, bn.look.v, 2.6, 0.9, 0.9, SS_PAINT.timber);
  ubox(b, 'wood', bn.look.u - 0.4, y + 1.2, bn.look.v, 0.9, 0.6, 0.7, 0x8a6a48);
  for (const s of [-0.25, 0.25])
    ubox(b, 'metal', bn.look.u - 0.4 + s, y + 1.2, bn.look.v - 0.355, 0.05, 0.62, 0.012, SS_PAINT.iron);
  out.signs.push(
    signAt(
      bn.look.u - 0.4,
      y + 1.2,
      bn.look.v - 0.35,
      0,
      -1,
      { lines: ['crateStencil'], w: 0.8, h: 0.3, fill: '#8a6a48', colors: ['#2a2018'] },
      0.012,
    ),
  );
  solid(out, bn.look.u, bn.look.v, 2.7, 1.0, y, y + 1.0, false);
  // Stacks of crates along the east wall and by the arch.
  if (!lite)
    for (const [u, v, n] of [
      [c.u + 13.5, c.v + 4, 3],
      [c.u + 13.5, c.v - 8, 2],
      [c.u - 13, c.v - 9, 2],
      [c.u - 13.5, c.v + 6, 3],
    ] as const) {
      for (let k = 0; k < n; k++) {
        const w = 1.0 - k * 0.12;
        ubox(b, 'wood', u, y + 0.5 + k * 0.92, v, w, 0.9, w, k % 2 ? 0x8a6a48 : 0x7a5a3c, k * 0.3);
      }
      solid(out, u, v, 1.2, 1.2, y, y + n * 0.92, false);
    }
}

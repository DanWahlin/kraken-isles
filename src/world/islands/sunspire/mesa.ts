import { CylinderGeometry, type BufferGeometry } from 'three/webgpu';
import { box, rod, rope, type Buckets } from '../../village/pieces';
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

/** The stations whose lamp stands on their left (the rest have it on their right). */
const LAMP_ON_LEFT = new Set(['shutter', 'mirror', 'scale', 'bell']);

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
      // Well to one side of the station and a little past it: clear of where the player stands and of
      // what it looks at. The camera's behind you to your right, so a lamp on the right sits at the
      // shot's edge (under the card); the stations in the court's middle keep theirs on the left,
      // where the right would stand in the next station.
      const du = s.look.u - s.u;
      const dv = s.look.v - s.v;
      const len = Math.hypot(du, dv) || 1;
      const side = LAMP_ON_LEFT.has(place) ? 2.5 : -2.5;
      const lu = s.u + (du / len) * 1.9 - (dv / len) * side;
      const lv = s.v + (dv / len) * 1.9 + (du / len) * side;
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
    // The tower's flag beside the roll: it unrolls once the beam has landed (the story's `beam`).
    signAt(
      roll.look.u - 1.75,
      base + 2.1,
      front,
      0,
      -1,
      {
        lines: ['beamFlag'],
        w: 1.05,
        h: 0.9,
        look: 'cloth',
        fill: '#2c5c9a',
        colors: SIGN_CREAM,
        show: 'beam',
        hang: true,
        pixels: 448,
      },
      0.14,
    ),
  );
  ubox(b, 'wood', roll.look.u - 1.75, base + 2.13, front - 0.12, 1.25, 0.05, 0.05, SS_PAINT.darkTimber);
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
  // The key itself: a brass lever on a block at the desk's right end, and a stool tucked beside it.
  ubox(b, 'metal', key.look.u + 0.82, y + 0.97, key.look.v + 0.12, 0.34, 0.07, 0.22, SS_PAINT.brass);
  rod(
    b,
    'metal',
    at(key.look.u + 0.7, y + 1.02, key.look.v + 0.12),
    at(key.look.u + 1.0, y + 1.14, key.look.v + 0.12),
    0.022,
    6,
    SS_PAINT.brass,
  );
  rod(
    b,
    'wood',
    at(key.look.u + 1.0, y + 1.12, key.look.v + 0.12),
    at(key.look.u + 1.0, y + 1.19, key.look.v + 0.12),
    0.05,
    8,
    SS_PAINT.darkTimber,
  );
  const st = at(key.look.u - 1.7, 0, key.look.v + 0.5);
  rod(b, 'wood', { x: st.x, y, z: st.z }, { x: st.x, y: y + 0.46, z: st.z }, 0.2, 8, SS_PAINT.timber, 0.17);
  rod(
    b,
    'cloth',
    { x: st.x, y: y + 0.46, z: st.z },
    { x: st.x, y: y + 0.52, z: st.z },
    0.2,
    8,
    SS_PAINT.madder,
  );
  out.circles.push({ x: st.x, z: st.z, r: 0.24, y0: y - 0.3, y1: y + 0.52, height: 0.52 });
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
 * The yard's scale: a balance on a stone plinth. A timber gallows over a planked deck, a brass beam
 * hung from it across the view, a pan of brass weights on one end and a crate in a rope sling on the
 * other (the crate being weighed in), a brass dial on the post.
 */
function scale(b: Buckets, out: SsOut, u: number, v: number, y: number): void {
  ubox(b, 'stone', u, y + 0.1, v, 2.6, 0.26, 2.6, SS_PAINT.paleStone);
  ubox(b, 'wood', u, y + 0.27, v, 2.2, 0.08, 2.2, SS_PAINT.timber);
  // The gallows: a post behind the deck and an arm out over its middle, with a brace.
  const post = at(u + 1.0, 0, v);
  ubox(b, 'wood', u + 1.0, y + 1.6, v, 0.18, 2.7, 0.18, SS_PAINT.darkTimber);
  ubox(b, 'wood', u + 0.4, y + 2.86, v, 1.5, 0.16, 0.16, SS_PAINT.darkTimber);
  rod(b, 'wood', at(u + 0.92, y + 2.2, v), at(u + 0.3, y + 2.8, v), 0.05, 5, SS_PAINT.darkTimber);
  // The beam hangs from the arm's end on a link, and tips a little to the crate.
  const top = at(u - 0.2, y + 2.78, v);
  const pivot = at(u - 0.2, y + 2.45, v);
  rod(b, 'metal', top, pivot, 0.025, 5, SS_PAINT.iron);
  const tip = 0.09;
  const crateEnd = at(u - 0.2, y + 2.45 - tip, v - 0.85);
  const panEnd = at(u - 0.2, y + 2.45 + tip, v + 0.85);
  rod(b, 'metal', crateEnd, panEnd, 0.045, 7, SS_PAINT.brass);
  rod(b, 'metal', at(u - 0.2, y + 2.38, v), at(u - 0.2, y + 2.56, v), 0.09, 8, SS_PAINT.brass, 0.05);
  // The pan: three chains down to a brass dish with a stack of weights.
  const pan = at(u - 0.2, y + 1.25, v + 0.85);
  for (const [du, dv] of [
    [0.34, 0],
    [-0.17, 0.3],
    [-0.17, -0.3],
  ] as const)
    rod(b, 'metal', panEnd, at(u - 0.2 + du, y + 1.27, v + 0.85 + dv), 0.012, 4, SS_PAINT.iron);
  rod(b, 'metal', pan, { x: pan.x, y: pan.y + 0.05, z: pan.z }, 0.3, 12, SS_PAINT.brass, 0.42);
  for (const [k, r] of [0.17, 0.14, 0.1].entries())
    rod(
      b,
      'metal',
      { x: pan.x, y: pan.y + 0.05 + k * 0.13, z: pan.z },
      { x: pan.x, y: pan.y + 0.17 + k * 0.13, z: pan.z },
      r,
      9,
      SS_PAINT.brass,
      r * 0.88,
    );
  // The crate in its sling: four ropes from the beam's end to its corners, a hand's width off the deck.
  const cu = u - 0.2;
  const cv = v - 0.85;
  const cy = y + 0.44;
  ubox(b, 'wood', cu, cy + 0.36, cv, 0.72, 0.72, 0.72, 0xb08a5a);
  ubox(b, 'wood', cu, cy + 0.73, cv, 0.78, 0.07, 0.78, SS_PAINT.timber);
  for (const o of [-0.2, 0.2])
    ubox(b, 'metal', cu - 0.365, cy + 0.36, cv + o, 0.012, 0.74, 0.05, SS_PAINT.iron);
  for (const du of [-0.34, 0.34])
    for (const dv of [-0.34, 0.34]) rope(b, crateEnd, at(cu + du, cy + 0.76, cv + dv), 0, 0.012);
  // The dial on the post: a brass face toward the yard with a dark hand.
  const dial = at(u + 0.9, y + 1.75, v);
  rod(b, 'metal', dial, at(u + 0.84, y + 1.75, v), 0.26, 14, SS_PAINT.brass);
  rod(b, 'metal', at(u + 0.84, y + 1.75, v), at(u + 0.82, y + 1.75, v), 0.21, 14, SS_PAINT.canvas);
  ubox(b, 'metal', u + 0.81, y + 1.82, v + 0.04, 0.012, 0.2, 0.025, SS_PAINT.iron, 0, 0, 0.4);
  out.circles.push({ x: post.x, z: post.z, r: 0.22, y0: y - 0.3, y1: y + 2.9, height: 2.9 });
  solid(out, u - 0.2, v, 1.2, 2.3, y, y + 1.6, false);
}

/** The sealed crate on Samir's bench (frame): its middle, its top and its size (the world's lid sits on it). */
export const BENCH_CRATE = {
  u: CIRCUIT_SPOTS.crate.bench!.look.u - 0.4,
  v: CIRCUIT_SPOTS.crate.bench!.look.v,
  top: YARD.y + 0.03 + 1.44,
  w: 0.9,
  d: 0.7,
} as const;

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
  scale(b, out, sc.look.u, sc.look.v, y);
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
  // The crate's box (its lid is the world's: it comes off when the story opens it).
  ubox(b, 'wood', bn.look.u - 0.4, y + 1.17, bn.look.v, 0.9, 0.54, 0.7, 0x8a6a48);
  for (const s of [-0.25, 0.25])
    ubox(b, 'metal', bn.look.u - 0.4 + s, y + 1.17, bn.look.v - 0.355, 0.05, 0.56, 0.012, SS_PAINT.iron);
  // Its tag on a rail over the bench: it unrolls once the crate's open (the story's `crate`).
  ubox(b, 'wood', bn.look.u + 0.85, y + 2.33, bn.look.v + 0.3, 1.2, 0.05, 0.05, SS_PAINT.darkTimber);
  for (const s of [-0.55, 0.55])
    ubox(b, 'wood', bn.look.u + 0.85 + s, y + 1.63, bn.look.v + 0.3, 0.06, 1.45, 0.06, SS_PAINT.darkTimber);
  out.signs.push(
    signAt(
      bn.look.u + 0.85,
      y + 2.3,
      bn.look.v + 0.3,
      0,
      -1,
      {
        lines: ['crateTag'],
        w: 1.0,
        h: 0.8,
        look: 'cloth',
        fill: '#b0492e',
        colors: SIGN_CREAM,
        show: 'crate',
        hang: true,
        pixels: 448,
      },
      0.05,
    ),
  );
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

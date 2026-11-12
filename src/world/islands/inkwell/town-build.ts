import { buildCoveQuay } from '../cove-quay';
import { box, rod, rope, type Buckets } from '../../village/pieces';
import {
  B,
  at,
  bougainvillea,
  chartLine,
  CLOTHS,
  cubeHouse,
  door,
  flowerTub,
  ground,
  hangLantern,
  IW_PAINT,
  lampPost,
  pergola,
  SIGN_CREAM,
  signAt,
  solid,
  ubox,
  uvSpan,
  yawAlong,
  YAW_U,
  type IwOut,
} from './build';
import { paveTerraces, stairFlights, type StairWell } from '../terrace-town';
import { chapel, dressTown } from './dressing';
import { GOSSIP_STAIR, QUAY, SQUARE, TAVERNA as T, TERRACES, toWorld, TOWN } from './layout';
import { HOUSES, SQUARE_PROPS, TAVERN } from './town';

/**
 * Builds Inkwell's port (spec §3): the stone quay along the cove with its fenders, bollards and steps
 * down to the water; the whitewashed houses on their three terraces; the taverna (a paved terrace, a
 * pergola under a vine, the players' rug); the Washing Square with its fountain and Thea's notice
 * post; the Gossip Stair's three flights with lines of notes over them; and washing on the roofs.
 * Into the kit's buckets, a part a step.
 */
export function* buildTown(b: Buckets, out: IwOut, lite: boolean): Generator<void, void, void> {
  // The paving runs back over the quay's apron to the first terrace's foot.
  buildCoveQuay(
    B,
    b,
    out,
    {
      wall: IW_PAINT.chalk,
      wetStone: IW_PAINT.wetStone,
      paving: IW_PAINT.paving,
      fender: IW_PAINT.darkTimber,
      iron: IW_PAINT.iron,
    },
    QUAY.v + 12,
  );
  paveTerraces(B, b, out, {
    terraces: TERRACES,
    u0: TOWN.u0 + 10,
    u1: TOWN.u1 - 10,
    wells: STAIR_WELLS,
    paving: IW_PAINT.paving,
  });
  yield;
  for (const h of HOUSES) {
    if (lite && !h.lite) continue;
    cubeHouse(b, out, h);
    // Bougainvillea down the corner of every third front.
    if (!lite && HOUSES.indexOf(h) % 3 === 0) {
      const base = ground(h.u, h.v - h.d / 2 - 0.2);
      bougainvillea(b, h.u + h.w / 2 - 0.5, h.v - h.d / 2, base + 3.5, 0, -1, 1.6, 2.4);
    }
    yield;
  }
  taverna(b, out, lite);
  yield;
  square(b, out);
  yield;
  gossipStair(b, out, lite);
  yield;
  if (!lite) {
    washing(b);
    dressTown(b, out);
    yield;
  }
  chapel(b, out);
  // Lanterns on posts along the lane and at the flights' feet.
  const o = toWorld(0, 0);
  for (const [u, v, du, dv] of [
    [-180, 24.5, 0.6, 1],
    [-141, 26.6, 0, 1],
    [-135.6, 39, 1, 0.2],
    [-99.5, 58, -1, 0.3],
    [-72.5, 78.5, -1, 0.4],
  ] as const) {
    const w = toWorld(du, dv);
    lampPost(b, out, u, v, Math.atan2(-(w.z - o.z), w.x - o.x));
  }
}

/**
 * Where a flight of the Gossip Stair comes up through a terrace's floor: the paving is left open
 * there, over the flight's cutting.
 */
const STAIR_WELLS: readonly StairWell[] = [
  null,
  { u0: -129, u1: -116.5, v1: 61.5 },
  { u0: -99.5, u1: -88.5, v1: 81.5 },
];

/**
 * The taverna: a paved terrace with a low white wall on its quay side, the taverna's house behind it
 * (a long white room with a blue door), a pergola under a flowering vine along the house's front with
 * the players' rug under it, two tables with stools, flower tubs at the steps, and its sign.
 */
function taverna(b: Buckets, out: IwOut, lite: boolean): void {
  const y = T.y;
  const u0 = T.u - T.halfU;
  const u1 = T.u + T.halfU;
  const v0 = T.v - T.halfV;
  const v1 = T.v + T.halfV;
  // (The first terrace's paving is its floor.)
  const floor = y + 0.03;
  // The house behind: its front is the terrace's north edge.
  const hd = TAVERN.house.depth;
  const foot = Math.min(ground(u0, v1 + hd), ground(u1, v1 + hd), ground(T.u, v1)) - 0.6;
  const roof = floor + 3.6;
  uvSpan(b, 'plaster', u0, u1, v1, v1 + hd, foot, roof, IW_PAINT.whitewash);
  uvSpan(
    b,
    'plaster',
    u0 - 0.05,
    u1 + 0.05,
    v1 - 0.05,
    v1 + hd + 0.05,
    roof - 0.02,
    roof + 0.28,
    IW_PAINT.whitewash,
  );
  solid(out, T.u, v1 + hd / 2, T.halfU * 2, hd, foot, roof + 0.3);
  door(b, T.u + 5.6, v1 - 0.01, floor, 0, -1, 1.2, 2.2, IW_PAINT.cobalt);
  for (const du of [-6, -2, 2]) {
    const g = ubox(b, 'glow', T.u + du, floor + 1.7, v1 - 0.02, 0.8, 1.0, 0.08, 0xffffff);
    void g;
    ubox(b, 'wood', T.u + du - 0.62, floor + 1.7, v1 - 0.05, 0.38, 1.04, 0.05, IW_PAINT.cobalt);
    ubox(b, 'wood', T.u + du + 0.62, floor + 1.7, v1 - 0.05, 0.38, 1.04, 0.05, IW_PAINT.cobalt);
  }
  out.perches.push(at(T.u, roof + 0.35, v1 + hd / 2));
  // Its name on the house's front, over the pergola.
  out.signs.push(
    signAt(
      T.u,
      roof - 0.25,
      v1,
      0,
      -1,
      { lines: ['tavernaSign'], w: 3.6, h: 0.56, fill: '#2c5c9a', colors: SIGN_CREAM },
      0.03,
    ),
  );
  ubox(b, 'wood', T.u, roof - 0.25, v1 - 0.02, 3.8, 0.7, 0.04, IW_PAINT.cobalt);
  // The pergola along the house's front: a wide middle bay, so nothing stands before the players.
  const pg = TAVERN.pergola;
  const front = v1 - pg.depth;
  pergola(b, out, u0 + 0.6, u1 - 0.6, front, v1 - 0.25, floor, floor + pg.height, [
    u0 + 0.6,
    T.u - 4.4,
    T.u + 4.4,
    u1 - 0.6,
  ]);
  out.cameraBoxes.push({
    ...at(T.u, 0, front + pg.depth / 2),
    hx: T.halfU - 0.6,
    hz: pg.depth / 2,
    rot: YAW_U,
    y0: floor + pg.height,
    y1: floor + pg.height + 0.7,
  });
  for (const du of [-5.6, 5.6]) {
    const l = at(T.u + du, 0, front + 0.5);
    hangLantern(b, out, l.x, floor + pg.height, l.z, YAW_U);
  }
  // The players' rug under the pergola (their seats: seat-fit's height).
  const rugV = front + pg.depth / 2 + 0.2;
  ubox(b, 'cloth', T.u, floor + 0.015, rugV, 6.4, 0.03, 2.6, IW_PAINT.cobalt);
  ubox(b, 'cloth', T.u, floor + 0.03, rugV, 5.6, 0.06, 1.8, IW_PAINT.cream);
  // A low white wall on the quay side, open in the middle (the way in from the lane), with tubs.
  for (const [a0, a1] of [
    [u0, T.u - 2.2],
    [T.u + 2.2, u1],
  ] as const) {
    uvSpan(b, 'plaster', a0, a1, v0 - 0.35, v0, floor - 0.6, floor + 0.75, IW_PAINT.whitewash);
    solid(out, (a0 + a1) / 2, v0 - 0.18, a1 - a0, 0.4, floor - 0.6, floor + 0.75, false);
  }
  for (const s of [-1, 1]) flowerTub(b, out, T.u + s * 2.75, v0 + 0.5, floor);
  if (!lite) {
    flowerTub(b, out, u0 + 0.7, v0 + 0.6, floor, IW_PAINT.saffron);
    flowerTub(b, out, u1 - 0.7, v0 + 0.6, floor, IW_PAINT.madder);
  }
  // Two round tables, each with a blue cloth and two stools.
  for (const t of TAVERN.tables) {
    const p = at(t.u, 0, t.v);
    rod(
      b,
      'wood',
      { x: p.x, y: floor, z: p.z },
      { x: p.x, y: floor + 0.72, z: p.z },
      0.06,
      6,
      IW_PAINT.timber,
    );
    rod(
      b,
      'wood',
      { x: p.x, y: floor + 0.72, z: p.z },
      { x: p.x, y: floor + 0.77, z: p.z },
      0.55,
      12,
      IW_PAINT.timber,
      0.55,
    );
    rod(
      b,
      'cloth',
      { x: p.x, y: floor + 0.77, z: p.z },
      { x: p.x, y: floor + 0.79, z: p.z },
      0.4,
      12,
      IW_PAINT.sky,
      0.4,
    );
    out.circles.push({ x: p.x, z: p.z, r: 0.6, y0: floor - 0.3, y1: floor + 0.8, height: 0.8 });
    for (const s of [-1, 1]) {
      const q = at(t.u + s * 0.95, 0, t.v + 0.2 * s);
      rod(
        b,
        'wood',
        { x: q.x, y: floor, z: q.z },
        { x: q.x, y: floor + 0.45, z: q.z },
        0.18,
        8,
        IW_PAINT.darkTimber,
        0.2,
      );
      out.circles.push({ x: q.x, z: q.z, r: 0.22, y0: floor - 0.3, y1: floor + 0.45, height: 0.45 });
    }
  }
}

/**
 * The Washing Square (the Gossip Stair's first landing): paving, a tiled fountain, two benches, and
 * Thea's notice post with a board that holds the stair's one tidy list.
 */
function square(b: Buckets, out: IwOut): void {
  // (The second terrace's paving is its floor.)
  const y = SQUARE.y + 0.03;
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
    IW_PAINT.paleStone,
    1.7,
  );
  rod(
    b,
    'plaster',
    { x: fp.x, y: y + 0.6, z: fp.z },
    { x: fp.x, y: y + 0.66, z: fp.z },
    1.45,
    8,
    IW_PAINT.cobalt,
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
    IW_PAINT.paleStone,
    0.14,
  );
  rod(
    b,
    'stone',
    { x: fp.x, y: y + 1.48, z: fp.z },
    { x: fp.x, y: y + 1.6, z: fp.z },
    0.5,
    8,
    IW_PAINT.paleStone,
    0.56,
  );
  out.circles.push({ x: fp.x, z: fp.z, r: 1.8, y0: y - 0.5, y1: y + 1.6, height: 1.6 });
  for (const bn of SQUARE_PROPS.benches) {
    const yaw = yawAlong(-bn.fv, bn.fu) - YAW_U;
    ubox(b, 'wood', bn.u, y + 0.45, bn.v, 2.0, 0.08, 0.45, IW_PAINT.cobalt, yaw);
    for (const s of [-0.8, 0.8])
      ubox(b, 'stone', bn.u + s, y + 0.21, bn.v, 0.2, 0.42, 0.4, IW_PAINT.paleStone, yaw);
    solid(out, bn.u, bn.v, 2.1, 0.6, y, y + 0.55, false);
  }
  // Thea's notice post: a board on two posts, its face to the square's middle.
  const n = SQUARE_PROPS.post;
  for (const s of [-1, 1]) {
    const p = at(n.u + s * 1.0, 0, n.v);
    rod(b, 'wood', { x: p.x, y: y - 0.2, z: p.z }, { x: p.x, y: y + 2.3, z: p.z }, 0.07, 6, IW_PAINT.timber);
  }
  ubox(b, 'wood', n.u, y + 1.55, n.v, 2.1, 1.2, 0.06, IW_PAINT.cobalt);
  out.signs.push(
    signAt(
      n.u,
      y + 1.55,
      n.v,
      0,
      -1,
      { lines: ['stairBoard'], w: 1.9, h: 1.0, fill: '#2c5c9a', colors: SIGN_CREAM, wrap: true, size: 0.16 },
      0.04,
    ),
  );
  solid(out, n.u, n.v, 2.2, 0.3, y, y + 2.3, false);
}

/**
 * The Gossip Stair: stone steps with rails on each of its three flights, and lines of notes strung
 * across it from house to house (the long chat thread: sheet after sheet, most of them buried).
 */
function gossipStair(b: Buckets, out: IwOut, lite: boolean): void {
  stairFlights(B, b, out, GOSSIP_STAIR, 2.6, undefined, (p, a, e) => {
    if (lite) return;
    // Lines of notes over the flight, on posts either side of it.
    const len = Math.hypot(e.u - a.u, e.v - a.v);
    const nu = -(e.v - a.v) / len;
    const nv = (e.u - a.u) / len;
    for (const t of [0.25, 0.5, 0.75]) {
      const [cu, cv, cy] = p(t);
      const ends = [-1, 1].map((s) => [cu + nu * s * 3.1, cv + nv * s * 3.1] as const);
      for (const [pu, pv] of ends) {
        const q = at(pu, 0, pv);
        const g = ground(pu, pv);
        rod(
          b,
          'wood',
          { x: q.x, y: g - 0.3, z: q.z },
          { x: q.x, y: cy + 3.5, z: q.z },
          0.06,
          5,
          IW_PAINT.timber,
        );
        out.circles.push({ x: q.x, z: q.z, r: 0.14, y0: g - 0.4, y1: cy + 3.5, height: cy + 3.5 - g });
      }
      chartLine(b, [ends[0]![0], ends[0]![1], cy + 3.4], [ends[1]![0], ends[1]![1], cy + 3.4], 0.3);
    }
  });
}

/** Washing lines between the houses' fronts. */
function washing(b: Buckets): void {
  const lines = [
    [-205, 60, -194.5, 61.5],
    [-167, 84.5, -155.5, 84],
    [-80, 60.5, -68.5, 61],
  ] as const;
  for (const [u0, v0, u1, v1] of lines) {
    const y0 = ground(u0, v0) + 2.7;
    const y1 = ground(u1, v1) + 2.7;
    for (const [u, v, y] of [
      [u0, v0, y0],
      [u1, v1, y1],
    ] as const) {
      const p = at(u, 0, v);
      rod(
        b,
        'wood',
        { x: p.x, y: y - 2.9, z: p.z },
        { x: p.x, y: y + 0.1, z: p.z },
        0.05,
        5,
        IW_PAINT.timber,
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

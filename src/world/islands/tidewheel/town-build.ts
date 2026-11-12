import { cone, rod, type Buckets } from '../../village/pieces';
import { buildCoveQuay } from '../cove-quay';
import { paveTerraces, stairFlights, type StairWell } from '../terrace-town';
import {
  B,
  at,
  barrel,
  basket,
  cart,
  crate,
  forgeHouse,
  gear,
  ground,
  hangLantern,
  lampPost,
  pennants,
  SIGN_CREAM,
  signAt,
  solid,
  TW_PAINT,
  ubox,
  uvSpan,
  yawAlong,
  YAW_U,
  type TwOut,
} from './build';
import { BOUNTY, LAMP_STAIR, QUAY, SQUARE, TERRACES, toWorld, TOWN, WORKS_STAIR } from './layout';
import { BAND, BOUNTY_BOARD, HOUSES, SQUARE_PROPS } from './town';

/**
 * Builds Tidewheel's port (spec §3): the stone quay along the bay; the forge houses on their three
 * terraces, each with a lit door; the Bandstand with its copper canopy and the music-box drum's
 * stand; Gear Square with the four gears' wall, the hot-spring basin and the benches; the Lamp
 * Stair's flights with a lantern at every head; Bounty Corner's board; and the Works Stair. Into the
 * kit's buckets, a part a step.
 */
export function* buildTown(b: Buckets, out: TwOut, lite: boolean): Generator<void, void, void> {
  // The paving runs back over the quay's apron to the first terrace's foot.
  buildCoveQuay(
    B,
    b,
    out,
    {
      wall: TW_PAINT.basalt,
      wetStone: TW_PAINT.wetStone,
      paving: TW_PAINT.paving,
      fender: TW_PAINT.darkTimber,
      iron: TW_PAINT.iron,
    },
    QUAY.v + 12,
  );
  paveTerraces(B, b, out, {
    terraces: TERRACES,
    u0: TOWN.u0 + 10,
    u1: TOWN.u1 + 2,
    wells: STAIR_WELLS,
    paving: TW_PAINT.paving,
  });
  yield;
  for (const h of HOUSES) {
    if (lite && !h.lite) continue;
    forgeHouse(b, out, h);
    yield;
  }
  bandstand(b, out);
  yield;
  square(b, out);
  yield;
  stairs(b, out, lite);
  bountyCorner(b, out);
  yield;
  if (!lite) dressQuay(b, out);
  // Lanterns on posts along the lane, the terraces and at the flights' feet.
  const o = toWorld(0, 0);
  for (const [u, v, du, dv] of [
    [-180, 24.5, 0.6, 1],
    [-141, 26.6, 0, 1],
    [-135.6, 39, 1, 0.2],
    [-99.5, 58, -1, 0.3],
    [-170, 53.6, 0, 1],
    [-200, 53.6, 0, 1],
    [-150, 75.6, 0, 1],
    [-185, 75.6, 0, 1],
    [-96.4, 86.6, -1, -0.4],
  ] as const) {
    const w = toWorld(du, dv);
    lampPost(b, out, u, v, Math.atan2(-(w.z - o.z), w.x - o.x));
  }
}

/**
 * Where a flight of the Lamp Stair comes up through a terrace's floor: the paving is left open
 * there, over the flight's cutting.
 */
const STAIR_WELLS: readonly StairWell[] = [
  null,
  { u0: -129, u1: -116.5, v1: 61.5 },
  { u0: -99.5, u1: -88.5, v1: 81.5 },
];

/**
 * The Bandstand: a ring of dark setts in the terrace's paving, six iron posts under a round copper
 * canopy with a brass finial, a lantern on every other post, and the music-box drum's stand (the
 * drum itself turns: the world's own mesh).
 */
function bandstand(b: Buckets, out: TwOut): void {
  const y = TERRACES[0].y + 0.03;
  const c = at(BAND.u, 0, BAND.v);
  // The stage: two rings of setts a finger over the paving.
  rod(
    b,
    'paving',
    { x: c.x, y: y - 0.1, z: c.z },
    { x: c.x, y: y + 0.03, z: c.z },
    BAND.r,
    24,
    TW_PAINT.basalt,
    BAND.r,
  );
  rod(
    b,
    'paving',
    { x: c.x, y: y - 0.1, z: c.z },
    { x: c.x, y: y + 0.045, z: c.z },
    BAND.r - 0.5,
    24,
    TW_PAINT.ash,
    BAND.r - 0.5,
  );
  const eave = y + BAND.canopy;
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
    const px = c.x + Math.cos(a) * (BAND.r - 0.25);
    const pz = c.z + Math.sin(a) * (BAND.r - 0.25);
    rod(b, 'metal', { x: px, y: y - 0.2, z: pz }, { x: px, y: eave, z: pz }, 0.07, 6, TW_PAINT.iron);
    rod(b, 'metal', { x: px, y: y, z: pz }, { x: px, y: y + 0.3, z: pz }, 0.13, 6, TW_PAINT.brass, 0.09);
    out.circles.push({ x: px, z: pz, r: 0.16, y0: y - 0.4, y1: eave, height: BAND.canopy });
    if (k % 2 === 0) hangLantern(b, out, px - Math.cos(a) * 0.5, eave - 0.1, pz - Math.sin(a) * 0.5, a);
  }
  // The canopy: a low copper cone on a brass ring, with a finial.
  rod(
    b,
    'metal',
    { x: c.x, y: eave - 0.05, z: c.z },
    { x: c.x, y: eave + 0.1, z: c.z },
    BAND.r + 0.3,
    24,
    TW_PAINT.brass,
    BAND.r + 0.3,
    true,
  );
  cone(b, 'metal', c.x, eave + 0.08, c.z, BAND.r + 0.45, 2.3, 12, TW_PAINT.copper);
  rod(
    b,
    'metal',
    { x: c.x, y: eave + 2.3, z: c.z },
    { x: c.x, y: eave + 3.0, z: c.z },
    0.06,
    5,
    TW_PAINT.brass,
    0.02,
  );
  out.perches.push({ x: c.x, y: eave + 3.05, z: c.z });
  out.cameraBoxes.push({
    x: c.x,
    z: c.z,
    hx: BAND.r + 0.4,
    hz: BAND.r + 0.4,
    rot: YAW_U,
    y0: eave - 0.1,
    y1: eave + 2.5,
  });
  // Its name on a board between the two front posts.
  ubox(b, 'wood', BAND.u, eave - 0.36, BAND.v - BAND.r + 0.2, 3.4, 0.5, 0.05, TW_PAINT.darkTimber);
  out.signs.push(
    signAt(
      BAND.u,
      eave - 0.36,
      BAND.v - BAND.r + 0.2,
      0,
      -1,
      { lines: ['bandstandSign'], w: 3.2, h: 0.4, fill: '#5e4432', colors: SIGN_CREAM },
      0.04,
    ),
  );
  // The music-box drum's stand: two brass cheeks on a timber bench, the comb before the drum.
  const d = BAND.drum;
  ubox(b, 'wood', d.u, y + 0.38, d.v, d.len + 0.5, 0.76, 0.7, TW_PAINT.darkTimber);
  for (const s of [-1, 1]) {
    ubox(b, 'metal', d.u + s * (d.len / 2 + 0.08), y + d.y - 0.04, d.v, 0.06, 0.86, 0.5, TW_PAINT.brass);
  }
  ubox(b, 'metal', d.u, y + d.y - 0.1, d.v - d.r - 0.12, d.len, 0.03, 0.2, TW_PAINT.brass);
  solid(out, d.u, d.v, d.len + 0.6, 0.9, y, y + 1.6, false);
}

/**
 * Gear Square (the Lamp Stair's first landing): the gears' wall across its back (four axles with a
 * plate under each: the gears turn, the world's own meshes), the hot-spring basin with its steam, and
 * two benches.
 */
function square(b: Buckets, out: TwOut): void {
  const y = SQUARE.y + 0.03;
  const P = SQUARE_PROPS;
  // The wall: dressed stone 4.6 m high across the square's back, with a copper coping.
  const u0 = SQUARE.u - SQUARE.halfU + 0.4;
  const u1 = SQUARE.u + SQUARE.halfU - 2.2;
  uvSpan(b, 'stone', u0, u1, P.wall, P.wall + 0.7, y - 0.6, y + 4.6, TW_PAINT.soot);
  uvSpan(b, 'metal', u0 - 0.1, u1 + 0.1, P.wall - 0.1, P.wall + 0.8, y + 4.6, y + 4.7, TW_PAINT.copper);
  solid(out, (u0 + u1) / 2, P.wall + 0.35, u1 - u0, 0.7, y - 0.6, y + 4.7);
  const names = ['gearTrigger', 'gearPrompt', 'gearTools', 'gearReview'] as const;
  for (const [k, g] of P.gears.entries()) {
    // Its axle's boss on the wall, and its plate below.
    const p = at(g.u, y + g.y, P.wall - 0.06);
    const q = at(g.u, y + g.y, P.wall - 0.5);
    rod(b, 'metal', p, q, 0.16, 8, TW_PAINT.iron);
    ubox(b, 'metal', g.u, y + 0.5, P.wall - 0.06, 1.7, 0.42, 0.04, TW_PAINT.brass);
    out.signs.push(
      signAt(
        g.u,
        y + 0.5,
        P.wall - 0.06,
        0,
        -1,
        { lines: [names[k]!], w: 1.6, h: 0.34, fill: '#e0b040', colors: ['#2a2623'] },
        0.03,
      ),
    );
  }
  // The basin: an octagon of dark stone with pale-blue water, a brass spout, steam over it.
  const f = P.basin;
  const fp = at(f.u, 0, f.v);
  rod(
    b,
    'stone',
    { x: fp.x, y: y - 0.1, z: fp.z },
    { x: fp.x, y: y + 0.6, z: fp.z },
    f.r + 0.2,
    8,
    TW_PAINT.soot,
    f.r + 0.2,
  );
  rod(
    b,
    'cloth',
    { x: fp.x, y: y + 0.58, z: fp.z },
    { x: fp.x, y: y + 0.63, z: fp.z },
    f.r - 0.05,
    8,
    TW_PAINT.water,
    f.r - 0.05,
  );
  rod(
    b,
    'metal',
    { x: fp.x, y: y + 0.58, z: fp.z },
    { x: fp.x, y: y + 1.3, z: fp.z },
    0.1,
    6,
    TW_PAINT.brass,
    0.06,
  );
  out.circles.push({ x: fp.x, z: fp.z, r: f.r + 0.3, y0: y - 0.5, y1: y + 1.3, height: 1.3 });
  for (const bn of P.benches) {
    const yaw = yawAlong(-bn.fv, bn.fu) - YAW_U;
    ubox(b, 'wood', bn.u, y + 0.45, bn.v, 2.0, 0.08, 0.45, TW_PAINT.timber, yaw);
    for (const s of [-0.8, 0.8])
      ubox(b, 'stone', bn.u + s, y + 0.21, bn.v, 0.2, 0.42, 0.4, TW_PAINT.paleStone, yaw);
    solid(out, bn.u, bn.v, 2.1, 0.6, y, y + 0.55, false);
  }
}

/**
 * The Lamp Stair and the Works Stair: stone steps with rails on each flight, a lantern on a post at
 * every flight's head, and a line of pennants across each of the Lamp Stair's flights.
 */
function stairs(b: Buckets, out: TwOut, lite: boolean): void {
  stairFlights(B, b, out, LAMP_STAIR, 2.6, undefined, (p, a, e) => {
    if (lite) return;
    const len = Math.hypot(e.u - a.u, e.v - a.v);
    const nu = -(e.v - a.v) / len;
    const nv = (e.u - a.u) / len;
    const [cu, cv, cy] = p(0.5);
    const ends = [-1, 1].map((s) => [cu + nu * s * 3.1, cv + nv * s * 3.1] as const);
    for (const [pu, pv] of ends) {
      const q = at(pu, 0, pv);
      const g = ground(pu, pv);
      rod(
        b,
        'metal',
        { x: q.x, y: g - 0.3, z: q.z },
        { x: q.x, y: cy + 3.6, z: q.z },
        0.05,
        5,
        TW_PAINT.iron,
      );
      out.circles.push({ x: q.x, z: q.z, r: 0.14, y0: g - 0.4, y1: cy + 3.6, height: cy + 3.6 - g });
    }
    pennants(b, [ends[0]![0], ends[0]![1], cy + 3.5], [ends[1]![0], ends[1]![1], cy + 3.5], 0.35);
  });
  stairFlights(B, b, out, WORKS_STAIR, 2.4);
}

/**
 * Bounty Corner: the bounty board against the rock behind the third terrace (a long board under a
 * small copper roof, three slips pinned to it), and a lantern.
 */
function bountyCorner(b: Buckets, out: TwOut): void {
  const y = BOUNTY.y + 0.03;
  const n = BOUNTY_BOARD;
  for (const s of [-1, 1]) {
    const p = at(n.u + s * (n.w / 2 + 0.1), 0, n.v);
    rod(
      b,
      'wood',
      { x: p.x, y: y - 0.2, z: p.z },
      { x: p.x, y: y + 2.7, z: p.z },
      0.08,
      6,
      TW_PAINT.darkTimber,
    );
  }
  ubox(b, 'wood', n.u, y + 1.6, n.v, n.w, 1.5, 0.06, TW_PAINT.timber);
  ubox(b, 'metal', n.u, y + 2.74, n.v - 0.2, n.w + 0.6, 0.06, 0.9, TW_PAINT.copper, 0, 0.18);
  out.signs.push(
    signAt(
      n.u,
      y + 2.1,
      n.v,
      0,
      -1,
      { lines: ['bountyBoard'], w: n.w - 0.3, h: 0.36, fill: '#9a744e', colors: ['#2a2623'] },
      0.04,
    ),
  );
  // Three slips: the open work, each on its pin.
  for (const [k, du] of [-1, 0, 1].entries()) {
    ubox(
      b,
      'cloth',
      n.u + du * 0.95,
      y + 1.42 - (k % 2) * 0.06,
      n.v - 0.04,
      0.7,
      0.86,
      0.02,
      TW_PAINT.parchment,
    );
    ubox(b, 'metal', n.u + du * 0.95, y + 1.8 - (k % 2) * 0.06, n.v - 0.06, 0.06, 0.06, 0.03, TW_PAINT.brass);
  }
  solid(out, n.u, n.v, n.w + 0.4, 0.3, y, y + 2.8, false);
  const l = at(n.u + n.w / 2 + 0.9, 0, n.v - 0.3);
  rod(b, 'metal', { x: l.x, y: y - 0.2, z: l.z }, { x: l.x, y: y + 3, z: l.z }, 0.05, 5, TW_PAINT.iron);
  hangLantern(b, out, l.x - 0.4, y + 3, l.z, 0);
  rod(b, 'metal', { x: l.x, y: y + 3, z: l.z }, { x: l.x - 0.4, y: y + 3, z: l.z }, 0.025, 4, TW_PAINT.iron);
}

/** The quay's cargo: barrels of lamp oil, crates of gear blanks, baskets and a hand cart. */
function dressQuay(b: Buckets, out: TwOut): void {
  for (const [u, v] of [
    [-226, 23.6],
    [-224.6, 24.5],
    [-168.6, 23.2],
  ] as const)
    barrel(b, out, u, v);
  for (const [u, v, s, turn, lift] of [
    [-176, 23.4, 0.8, 0.2, 0],
    [-175, 24.3, 0.7, -0.3, 0],
    [-175.6, 23.8, 0.6, 0.5, 0.75],
    [-232, 20.5, 0.8, 0.1, 0],
  ] as const)
    crate(b, out, u, v, s, turn, lift);
  basket(b, out, -178, 22.2, 0.36, TW_PAINT.brass);
  basket(b, out, -170.6, 24.6, 0.32, TW_PAINT.ochre);
  cart(b, out, -158, 23.4, 1, 0.2);
  // A spare gear leaning on the crates.
  const p = at(-173.6, 0, 23.2);
  gear(b, p.x, ground(-173.6, 23.2) + 0.62, p.z, 0.62, 0.1, 12, YAW_U + 0.5, TW_PAINT.bronze, 0.25);
}

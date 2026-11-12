import { stairFlights } from '../terrace-town';
import type { BufferGeometry } from 'three/webgpu';
import { box, cone, rod, rope, type Buckets } from '../../village/pieces';
import {
  at,
  bougainvillea,
  dome,
  flowerTub,
  ground,
  hoop,
  IW_PAINT,
  lowWall,
  rail,
  SIGN_CREAM,
  signAt,
  solid,
  ubox,
  uvSpan,
  yawAlong,
  YAW_U,
  type IwOut,
  B,
  pave,
  stationLamps,
  lampPost,
} from './build';
import { BELLS, CIRCUIT_SPOTS, GUILD_BOARD, LOGGIA_WALLS, RACK, RAIL, RAIL_PARK } from './circuit';
import {
  COURT,
  DOME_HEAD,
  DOME_STAIR,
  DRAUGHT,
  GREAT_CHART,
  KITE_WALK,
  LOGGIA,
  PLAZA,
  type Uvy,
} from './layout';

/** The stations whose lamp stands on their left (the rest have it on their right). */
const LAMP_ON_LEFT = new Set(['roll', 'card', 'order', 'chest', 'quill', 'rack', 'rail', 'bells']);

/** The rail's five stages, in order: each post's lamp is `rail:<stage>` and its sign `rail<Stage>`. */
export const RAIL_STAGES = ['propose', 'plan', 'baseline', 'implement', 'validate'] as const;

/** The four instrument desks at the Plaza's corners (frame), each facing the Plaza's middle. */
export const DESKS = [
  { id: 'Plan', u: PLAZA.u - PLAZA.halfU + 3.4, v: PLAZA.v - PLAZA.halfV + 3.2, fv: 1 },
  { id: 'Terminal', u: PLAZA.u + PLAZA.halfU - 3.4, v: PLAZA.v - PLAZA.halfV + 3.2, fv: 1 },
  { id: 'Browser', u: PLAZA.u + PLAZA.halfU - 3.4, v: PLAZA.v + PLAZA.halfV - 3.2, fv: -1 },
  { id: 'Changes', u: PLAZA.u - PLAZA.halfU + 3.4, v: PLAZA.v + PLAZA.halfV - 3.2, fv: -1 },
] as const;

/** Where the kite flyers' posts stand on the Kite Walk, between the path and its wall (frame): a kite flies over each. */
export const KITE_POSTS = [
  { u: 34, v: 144.3 },
  { u: 84, v: 145.8 },
] as const;

/**
 * The isles on the Great Chart, in voyage order: each island's place on the archipelago chart
 * (src/ui/chart/archipelago.ts, 0-1 across and down), its size and its paint.
 */
const CHART_ISLES = [
  { x: 150, y: 505, r: 0.9, paint: IW_PAINT.leaf },
  { x: 290, y: 300, r: 1.2, paint: 0xc8a070 },
  { x: 490, y: 165, r: 1.1, paint: 0x3f7a44 },
  { x: 720, y: 150, r: 1.3, paint: 0x6e9a4e },
  { x: 870, y: 330, r: 1.2, paint: 0x5a8448 },
  { x: 810, y: 520, r: 1.2, paint: 0xc87a4a },
  { x: 590, y: 555, r: 1.1, paint: IW_PAINT.whitewash },
  { x: 370, y: 500, r: 1.0, paint: 0x4a4a52 },
] as const;

/** The archipelago chart's drawing size (src/ui/chart/archipelago.ts `ARCH_W`, `ARCH_H`). */
const ARCH_W = 1000;
const ARCH_H = 700;

/** An archipelago-chart point as a place on the Great Chart (frame u, v). */
export function chartPoint(x: number, y: number): { u: number; v: number } {
  const g = GREAT_CHART;
  return {
    u: g.u + (x / ARCH_W - 0.5) * (g.halfU * 2 - 4),
    v: g.v - (y / ARCH_H - 0.5) * (g.halfV * 2 - 4),
  };
}

/**
 * Builds the bluff's set pieces (spec §3, §5): the Plaza (its paving, compass rose, balustrade and the
 * four instrument desks), the Loggia with the visiting guild's board, the Draughting Terrace (the
 * easel, the order desk, the slate, the mate's stand, the sea chest), the Kite Walk's wall, benches and
 * kite posts, the Chart Court (the Great Chart in its floor, the brass rail, the bell pulls, the slate
 * rack, the desks and the glass), and the Dome Stair. Each station has its lamp (`board:<place>`,
 * `slate:<place>`, `chart:<place>`). Into the kit's buckets, a part a step.
 */
export function* buildPlaza(b: Buckets, out: IwOut, lite: boolean): Generator<void, void, void> {
  plaza(b, out, lite);
  yield;
  loggia(b, out);
  yield;
  terrace(b, out, lite);
  yield;
  kiteWalk(b, out, lite);
  yield;
  chartCourt(b, out, lite);
  yield;
  stairFlights(B, b, out, DOME_STAIR, 2.4, [0.06, 0.94]);
  // Rails along the head's west rim either side of the stair's head.
  const hy = DOME_HEAD.y + 0.02;
  const top = DOME_STAIR[DOME_STAIR.length - 1]!;
  rail(b, out, [top.u - 1.5, top.v + 3.4, hy], [top.u + 1.5, top.v + 10, hy], IW_PAINT.brass);
  rail(b, out, [top.u - 3.4, top.v - 3.6, hy], [top.u + 1.5, top.v - 10, hy], IW_PAINT.brass);
  stationLamps(b, out, CIRCUIT_SPOTS, LAMP_ON_LEFT);
}

/** A white balustrade from a to e (frame u, v) on the floor `y`: a low plastered wall with a stone cap. */
function balustrade(
  b: Buckets,
  out: IwOut,
  a: readonly [number, number],
  e: readonly [number, number],
  y: number,
) {
  const len = Math.hypot(e[0] - a[0], e[1] - a[1]);
  const yaw = yawAlong(e[0] - a[0], e[1] - a[1]) - YAW_U;
  const cu = (a[0] + e[0]) / 2;
  const cv = (a[1] + e[1]) / 2;
  ubox(b, 'plaster', cu, y + 0.2, cv, len, 1.4, 0.36, IW_PAINT.whitewash, yaw);
  ubox(b, 'stone', cu, y + 0.94, cv, len + 0.1, 0.1, 0.5, IW_PAINT.paleStone, yaw);
  solid(out, cu, cv, len, 0.4, y - 0.4, y + 1.0, false, yaw);
}

/**
 * An instrument desk at frame (u, v) on the floor `y`, facing frame direction (0, fv): a chalk plinth
 * with a timber top, its name on a blue board behind it, and its instrument on top.
 */
function desk(b: Buckets, out: IwOut, d: (typeof DESKS)[number], y: number): void {
  const { u, v, fv } = d;
  ubox(b, 'stone', u, y + 0.42, v, 2.0, 0.84, 0.9, IW_PAINT.chalk);
  ubox(b, 'wood', u, y + 0.87, v, 2.15, 0.06, 1.0, IW_PAINT.timber);
  solid(out, u, v, 2.2, 1.05, y, y + 0.95, false);
  // Its name on a board behind it, on two posts.
  const bv = v - fv * 0.75;
  for (const s of [-1, 1]) {
    const p = at(u + s * 0.95, 0, bv);
    rod(b, 'wood', { x: p.x, y: y - 0.1, z: p.z }, { x: p.x, y: y + 2.45, z: p.z }, 0.06, 6, IW_PAINT.timber);
  }
  ubox(b, 'wood', u, y + 2.05, bv, 2.1, 0.62, 0.06, IW_PAINT.cobalt);
  out.signs.push(
    signAt(
      u,
      y + 2.05,
      bv,
      0,
      fv,
      { lines: [`desk${d.id}`], w: 1.9, h: 0.5, fill: '#2c5c9a', colors: SIGN_CREAM },
      0.04,
    ),
  );
  const top = y + 0.9;
  const p = at(u, top, v);
  if (d.id === 'Plan') {
    // A rolled chart and a pair of dividers.
    const a = at(u - 0.7, top + 0.07, v + 0.1);
    const e = at(u + 0.5, top + 0.07, v - 0.1);
    rod(b, 'cloth', a, e, 0.07, 8, IW_PAINT.parchment);
    for (const s of [-1, 1])
      rod(
        b,
        'metal',
        at(u + 0.7, top + 0.32, v),
        at(u + 0.7 + s * 0.1, top + 0.01, v + 0.1),
        0.012,
        4,
        IW_PAINT.brass,
      );
  } else if (d.id === 'Terminal') {
    // A brass key on a block, and a spool of paper tape.
    ubox(b, 'wood', u - 0.3, top + 0.06, v, 0.5, 0.12, 0.3, IW_PAINT.darkTimber);
    ubox(b, 'metal', u - 0.3, top + 0.16, v, 0.4, 0.03, 0.06, IW_PAINT.brass, 0, 0, 0.12);
    rod(
      b,
      'cloth',
      at(u + 0.5, top + 0.18, v - 0.06),
      at(u + 0.5, top + 0.18, v + 0.06),
      0.18,
      10,
      IW_PAINT.parchment,
    );
    ubox(b, 'cloth', u + 0.1, top + 0.012, v, 0.7, 0.012, 0.1, IW_PAINT.parchment);
  } else if (d.id === 'Browser') {
    // A spyglass on a short tripod, looking out over the Plaza.
    for (const an of [0, 2.1, 4.2])
      rod(
        b,
        'wood',
        { x: p.x + Math.cos(an) * 0.22, y: top, z: p.z + Math.sin(an) * 0.22 },
        { x: p.x, y: top + 0.42, z: p.z },
        0.02,
        4,
        IW_PAINT.darkTimber,
      );
    rod(
      b,
      'metal',
      at(u, top + 0.46, v - fv * 0.4),
      at(u, top + 0.56, v + fv * 0.42),
      0.05,
      8,
      IW_PAINT.brass,
      0.075,
    );
  } else {
    // Two stacks of sheets: what was, and what is now.
    for (const [s, edge] of [
      [-1, IW_PAINT.madder],
      [1, IW_PAINT.leaf],
    ] as const) {
      ubox(b, 'cloth', u + s * 0.45, top + 0.07, v, 0.5, 0.14, 0.66, IW_PAINT.parchment);
      ubox(b, 'cloth', u + s * 0.45, top + 0.146, v - 0.27, 0.5, 0.012, 0.1, edge);
    }
  }
}

/**
 * The Plaza: pale paving with a brass compass rose, a white balustrade on its rim over the town (open
 * where the Gossip Stair comes up), the four instrument desks at its corners, cypress tubs and flowers.
 */
function plaza(b: Buckets, out: IwOut, lite: boolean): void {
  const y = pave(b, out, PLAZA);
  const u0 = PLAZA.u - PLAZA.halfU;
  const u1 = PLAZA.u + PLAZA.halfU;
  const v0 = PLAZA.v - PLAZA.halfV;
  const v1 = PLAZA.v + PLAZA.halfV;
  // The rim over the town: open for the stair's head (it comes up at PLAZA.u − 14, heading north-east).
  balustrade(b, out, [u0, v0 - 0.2], [PLAZA.u - 17.6, v0 - 0.2], y);
  balustrade(b, out, [PLAZA.u - 9.4, v0 - 0.2], [u1, v0 - 0.2], y);
  // The east side south of the Kite Walk's way out, and the north side either side of the terrace's.
  balustrade(b, out, [u1 + 0.2, v0], [u1 + 0.2, PLAZA.v + 1], y);
  balustrade(b, out, [u0, v1 + 0.2], [PLAZA.u + 1, v1 + 0.2], y);
  balustrade(b, out, [PLAZA.u + 7, v1 + 0.2], [u1, v1 + 0.2], y);
  // The compass rose: eight brass rays round the surveyors' armillary (a chalk pedestal, three brass
  // hoops and a pointer through them).
  const c = at(PLAZA.u, 0, PLAZA.v);
  for (let k = 0; k < 8; k++) {
    const an = (k / 8) * Math.PI * 2;
    const long = k % 2 === 0;
    const r0 = 1.5;
    const r1 = long ? 6.4 : 4;
    box(
      b,
      'metal',
      c.x + Math.cos(an) * ((r0 + r1) / 2),
      y + 0.005,
      c.z - Math.sin(an) * ((r0 + r1) / 2),
      r1 - r0,
      0.05,
      long ? 0.18 : 0.11,
      an,
      IW_PAINT.brass,
    );
  }
  rod(
    b,
    'stone',
    { x: c.x, y: y - 0.05, z: c.z },
    { x: c.x, y: y + 0.22, z: c.z },
    1.4,
    16,
    IW_PAINT.chalk,
    1.3,
  );
  rod(
    b,
    'stone',
    { x: c.x, y: y + 0.22, z: c.z },
    { x: c.x, y: y + 1.15, z: c.z },
    0.5,
    12,
    IW_PAINT.chalk,
    0.4,
  );
  rod(
    b,
    'stone',
    { x: c.x, y: y + 1.15, z: c.z },
    { x: c.x, y: y + 1.3, z: c.z },
    0.4,
    12,
    IW_PAINT.paleStone,
    0.62,
  );
  const ay = y + 2.75;
  hoop(b, c.x, ay, c.z, 1.4, 0.045, 0, 0, IW_PAINT.brass);
  hoop(b, c.x, ay, c.z, 1.4, 0.045, Math.PI / 2, 0, IW_PAINT.brass);
  hoop(b, c.x, ay, c.z, 1.25, 0.04, Math.PI / 2, 0.41, IW_PAINT.brass);
  hoop(b, c.x, ay, c.z, 1.1, 0.035, 1.16, 0, IW_PAINT.brass);
  rod(
    b,
    'metal',
    { x: c.x - 0.55, y: ay - 1.45, z: c.z },
    { x: c.x + 0.55, y: ay + 1.45, z: c.z },
    0.03,
    6,
    IW_PAINT.brass,
  );
  dome(b, 'metal', c.x, ay - 0.2, c.z, 0.2, IW_PAINT.cobalt, 1, 8);
  out.circles.push({ x: c.x, z: c.z, r: 1.5, y0: y - 0.4, y1: y + 4.2, height: 4.2 });
  // Four benches round it, facing in.
  for (const [du, dv] of [
    [7.5, 0],
    [-7.5, 0],
    [0, 6.5],
    [0, -6.5],
  ] as const) {
    const yaw = du === 0 ? 0 : Math.PI / 2;
    ubox(b, 'wood', PLAZA.u + du, y + 0.45, PLAZA.v + dv, 2.0, 0.08, 0.45, IW_PAINT.cobalt, yaw);
    for (const s of [-0.8, 0.8])
      ubox(
        b,
        'stone',
        PLAZA.u + du + (du === 0 ? s : 0),
        y + 0.2,
        PLAZA.v + dv + (du === 0 ? 0 : s),
        0.2,
        0.44,
        0.4,
        IW_PAINT.paleStone,
        yaw,
      );
    solid(out, PLAZA.u + du, PLAZA.v + dv, du === 0 ? 2.1 : 0.6, du === 0 ? 0.6 : 2.1, y, y + 0.55, false);
  }
  for (const d of DESKS) desk(b, out, d, y);
  if (!lite) {
    flowerTub(b, out, PLAZA.u - 18.6, v0 + 0.8, y);
    flowerTub(b, out, PLAZA.u - 8.4, v0 + 0.8, y, IW_PAINT.saffron);
    flowerTub(b, out, u1 - 0.9, PLAZA.v + 1.8, y, IW_PAINT.madder);
    flowerTub(b, out, u1 - 0.9, PLAZA.v + 6.4, y);
  }
}

/**
 * The Loggia: a white hall open to the Plaza through four columns, with the visiting guild's board on
 * its back wall (a dark frame, its name over it, two lettered columns and the guild's cards), the
 * roll of installed plugins on its north wall, the bell on its south wall, the guild's notice at its
 * mouth and the crate the board came in.
 */
function loggia(b: Buckets, out: IwOut): void {
  const y = pave(b, out, LOGGIA);
  // Its apron: the paving runs on from its mouth to the Plaza's edge.
  pave(b, out, {
    u: (LOGGIA.u + LOGGIA.halfU + PLAZA.u - PLAZA.halfU) / 2,
    v: LOGGIA.v,
    halfU: (PLAZA.u - PLAZA.halfU - LOGGIA.u - LOGGIA.halfU) / 2,
    halfV: LOGGIA.halfV,
    y: LOGGIA.y,
  });
  const W = LOGGIA_WALLS;
  const u0 = LOGGIA.u - LOGGIA.halfU;
  const u1 = LOGGIA.u + LOGGIA.halfU;
  const v0 = LOGGIA.v - LOGGIA.halfV;
  const v1 = LOGGIA.v + LOGGIA.halfV;
  const top = y + 4.1;
  const foot = y - 0.8;
  const wall = (a0: number, a1: number, c0: number, c1: number) => {
    uvSpan(b, 'plaster', a0, a1, c0, c1, foot, top, IW_PAINT.whitewash);
    solid(out, (a0 + a1) / 2, (c0 + c1) / 2, a1 - a0, c1 - c0, foot, top);
  };
  wall(u0, W.back, v0, v1);
  wall(W.back, u1, W.north, v1);
  wall(W.back, u1, v0, W.south);
  // The roof: a slab on the walls and the columns, with a thin parapet.
  uvSpan(b, 'plaster', u0 - 0.2, u1 + 0.3, v0 - 0.2, v1 + 0.2, top, top + 0.4, IW_PAINT.whitewash);
  uvSpan(b, 'stone', u0 - 0.3, u1 + 0.4, v0 - 0.3, v1 + 0.3, top + 0.4, top + 0.5, IW_PAINT.paleStone);
  out.cameraBoxes.push({
    ...at(LOGGIA.u, 0, LOGGIA.v),
    hx: LOGGIA.halfU + 0.3,
    hz: LOGGIA.halfV + 0.3,
    rot: YAW_U,
    y0: top - 0.1,
    y1: top + 0.6,
  });
  out.perches.push(at(LOGGIA.u, top + 0.55, LOGGIA.v));
  // Two columns between the side walls (three bays), each a round white shaft on a chalk foot.
  for (const v of [W.south + 3.5, W.north - 3.5]) {
    const p = at(W.front, 0, v);
    rod(
      b,
      'stone',
      { x: p.x, y: y - 0.1, z: p.z },
      { x: p.x, y: y + 0.3, z: p.z },
      0.42,
      10,
      IW_PAINT.paleStone,
      0.36,
    );
    rod(
      b,
      'plaster',
      { x: p.x, y: y + 0.3, z: p.z },
      { x: p.x, y: top - 0.3, z: p.z },
      0.3,
      12,
      IW_PAINT.whitewash,
      0.26,
    );
    rod(
      b,
      'stone',
      { x: p.x, y: top - 0.3, z: p.z },
      { x: p.x, y: top, z: p.z },
      0.3,
      10,
      IW_PAINT.paleStone,
      0.44,
    );
    out.circles.push({ x: p.x, z: p.z, r: 0.4, y0: y - 0.4, y1: top, height: 4.1 });
  }
  bougainvillea(b, u1 + 0.1, v1 - 1.4, top + 0.3, 1, 0, 2.4, 2.8);
  // The board on the back wall: a dark frame, its name over it, the two lettered columns.
  const g = GUILD_BOARD;
  const face = W.back + 0.05;
  ubox(b, 'wood', face, y + g.y, g.v, 0.08, g.h, g.w, IW_PAINT.darkTimber);
  ubox(b, 'cloth', face + 0.05, y + g.y - 0.12, g.v, 0.02, g.h - 0.5, g.w - 0.3, IW_PAINT.parchment);
  for (const dv of [-g.w / 6, g.w / 6])
    ubox(b, 'wood', face + 0.065, y + g.y - 0.12, g.v + dv, 0.02, g.h - 0.5, 0.05, IW_PAINT.darkTimber);
  out.signs.push(
    signAt(
      face,
      y + g.y + g.h / 2 + 0.34,
      g.v,
      1,
      0,
      { lines: ['boardName'], w: 4.6, h: 0.44, fill: '#2c5c9a', colors: SIGN_CREAM },
      0.06,
    ),
    signAt(
      face,
      y + g.y + g.h / 2 - 0.2,
      g.v,
      1,
      0,
      { lines: ['colPlan'], w: 1.5, h: 0.3, fill: '#86664a', colors: SIGN_CREAM },
      0.1,
    ),
    signAt(
      face,
      y + g.y + g.h / 2 - 0.2,
      g.v + g.w / 3,
      1,
      0,
      { lines: ['colReady'], w: 1.5, h: 0.3, fill: '#86664a', colors: SIGN_CREAM },
      0.1,
    ),
    // The guild's pennant beside the board: it unrolls once a card has come back on Ready.
    signAt(
      face,
      y + g.y + g.h / 2 + 0.5,
      g.v + g.w / 2 + 1.0,
      1,
      0,
      {
        lines: ['borrowedFlag'],
        w: 1.0,
        h: 1.5,
        look: 'cloth',
        fill: '#c2337a',
        colors: SIGN_CREAM,
        show: 'borrowed',
        hang: true,
        wrap: true,
        pixels: 320,
      },
      0.14,
    ),
  );
  ubox(
    b,
    'wood',
    face + 0.1,
    y + g.y + g.h / 2 + 0.52,
    g.v + g.w / 2 + 1.0,
    0.05,
    0.05,
    1.2,
    IW_PAINT.darkTimber,
  );
  ubox(b, 'wood', face + 0.02, y + g.y + g.h / 2 + 0.34, g.v, 0.04, 0.56, 4.8, IW_PAINT.cobalt);
  // The guild's cards waiting in the first column (the story's own card is the world's mesh).
  for (let k = 0; k < 4; k++)
    ubox(
      b,
      'cloth',
      face + 0.085,
      y + g.y + 0.5 - k * 0.44,
      g.v - g.w / 3 + (k % 2 ? 0.08 : -0.06),
      0.02,
      0.34,
      1.3,
      k % 2 ? IW_PAINT.cream : IW_PAINT.whitewash,
    );
  // The roll on the north wall: a board of brass tags under its heading.
  const roll = CIRCUIT_SPOTS.board.roll!;
  ubox(b, 'wood', roll.look.u, y + 1.5, W.north - 0.05, 2.2, 1.5, 0.08, IW_PAINT.darkTimber);
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++)
      ubox(
        b,
        'metal',
        roll.look.u - 0.6 + c * 0.6,
        y + 1.15 + r * 0.32,
        W.north - 0.1,
        0.44,
        0.2,
        0.02,
        IW_PAINT.brass,
      );
  out.signs.push(
    signAt(
      roll.look.u,
      y + 2.08,
      W.north,
      0,
      -1,
      { lines: ['rollHead'], w: 2.0, h: 0.3, fill: '#3a2a20', colors: SIGN_CREAM },
      0.1,
    ),
  );
  // The bell on the south wall: a bracket, a brass bell, its rope and its plate.
  const bell = CIRCUIT_SPOTS.board.bell!;
  ubox(b, 'wood', bell.look.u, y + 2.7, W.south + 0.35, 0.1, 0.1, 0.7, IW_PAINT.darkTimber);
  const bp = at(bell.look.u, 0, W.south + 0.6);
  cone(b, 'metal', bp.x, y + 2.2, bp.z, 0.3, 0.42, 10, IW_PAINT.brass, 0.1);
  rope(b, { x: bp.x, y: y + 2.2, z: bp.z }, { x: bp.x, y: y + 1.3, z: bp.z }, 0, 0.015);
  ubox(b, 'wood', bell.look.u, y + 1.2, W.south + 0.04, 2.3, 0.4, 0.05, IW_PAINT.cobalt);
  out.signs.push(
    signAt(
      bell.look.u,
      y + 1.2,
      W.south,
      0,
      1,
      { lines: ['bellPlate'], w: 2.2, h: 0.32, fill: '#2c5c9a', colors: SIGN_CREAM },
      0.08,
    ),
  );
  // The guild's notice at the Loggia's mouth (a board on a post), and the crate the board came in.
  const n = CIRCUIT_SPOTS.board.notice!;
  const np = at(n.look.u, 0, n.look.v);
  rod(
    b,
    'wood',
    { x: np.x, y: y - 0.2, z: np.z },
    { x: np.x, y: y + 2.0, z: np.z },
    0.07,
    6,
    IW_PAINT.timber,
  );
  const face2 = Math.hypot(n.u - n.look.u, n.v - n.look.v);
  const fu = (n.u - n.look.u) / face2;
  const fv = (n.v - n.look.v) / face2;
  const nyaw = yawAlong(-fv, fu) - YAW_U;
  ubox(
    b,
    'wood',
    n.look.u + fu * 0.08,
    y + 1.5,
    n.look.v + fv * 0.08,
    1.7,
    0.9,
    0.05,
    IW_PAINT.magenta,
    nyaw,
  );
  out.signs.push(
    signAt(
      n.look.u,
      y + 1.5,
      n.look.v,
      fu,
      fv,
      { lines: ['guildNotice'], w: 1.6, h: 0.8, fill: '#c2337a', colors: SIGN_CREAM, wrap: true, size: 0.2 },
      0.12,
    ),
  );
  out.circles.push({ x: np.x, z: np.z, r: 0.5, y0: y - 0.4, y1: y + 2, height: 2 });
  const cu = n.look.u + 1.6;
  const cv = n.look.v - 1.9;
  ubox(b, 'wood', cu, y + 0.4, cv, 1.1, 0.8, 0.9, IW_PAINT.timber);
  ubox(b, 'wood', cu, y + 0.82, cv, 1.16, 0.06, 0.96, IW_PAINT.darkTimber);
  out.signs.push(
    signAt(
      cu - 0.55,
      y + 0.42,
      cv,
      -1,
      0,
      { lines: ['crateStencil'], w: 0.86, h: 0.2, fill: '#c8a878', colors: ['#3a2a20'] },
      0.02,
    ),
  );
  solid(out, cu, cv, 1.2, 1.0, y, y + 0.9, false);
}

/**
 * The Draughting Terrace: paving and a balustrade toward the sea, the easel with its plate, the order
 * desk, the session slate on its stand (its three lettered rows), the mate's stand, and a sea chest.
 */
function terrace(b: Buckets, out: IwOut, lite: boolean): void {
  const y = pave(b, out, DRAUGHT);
  const u0 = DRAUGHT.u - DRAUGHT.halfU;
  const u1 = DRAUGHT.u + DRAUGHT.halfU;
  const v0 = DRAUGHT.v - DRAUGHT.halfV;
  const v1 = DRAUGHT.v + DRAUGHT.halfV;
  balustrade(b, out, [u0, v1 + 0.2], [u1, v1 + 0.2], y);
  balustrade(b, out, [u0 - 0.2, v0 + 2], [u0 - 0.2, v1], y);
  balustrade(b, out, [u1 + 0.2, v0], [u1 + 0.2, v1], y);
  const S = CIRCUIT_SPOTS.slate;
  // The easel: an A-frame with a blank board, and the command on a plate under it.
  const e = S.easel!;
  for (const s of [-1, 1])
    rod(
      b,
      'wood',
      at(e.look.u + 0.2, y, e.look.v + s * 0.8),
      at(e.look.u - 0.1, y + 2.5, e.look.v + s * 0.3),
      0.045,
      5,
      IW_PAINT.timber,
    );
  rod(
    b,
    'wood',
    at(e.look.u - 0.9, y, e.look.v),
    at(e.look.u - 0.1, y + 2.4, e.look.v),
    0.04,
    5,
    IW_PAINT.timber,
  );
  ubox(b, 'wood', e.look.u + 0.14, y + 1.55, e.look.v, 0.05, 1.2, 1.7, IW_PAINT.slate, 0, 0, 0.1);
  ubox(b, 'wood', e.look.u + 0.24, y + 0.84, e.look.v, 0.12, 0.05, 1.8, IW_PAINT.timber);
  ubox(b, 'wood', e.look.u + 0.3, y + 0.6, e.look.v, 0.04, 0.3, 1.5, IW_PAINT.cobalt);
  out.signs.push(
    signAt(
      e.look.u + 0.3,
      y + 0.6,
      e.look.v,
      1,
      0,
      { lines: ['easelPlate'], w: 1.4, h: 0.26, fill: '#2c5c9a', colors: SIGN_CREAM },
      0.03,
    ),
  );
  solid(out, e.look.u - 0.3, e.look.v, 1.4, 1.9, y, y + 2.4, false);
  // The order desk: a slanted writing desk with a sheet and an inkwell.
  const o = S.order!;
  ubox(b, 'wood', o.look.u, y + 0.45, o.look.v, 1.5, 0.9, 0.7, IW_PAINT.timber);
  ubox(b, 'wood', o.look.u, y + 0.96, o.look.v, 1.6, 0.05, 0.8, IW_PAINT.darkTimber, 0, -0.16);
  ubox(b, 'cloth', o.look.u - 0.1, y + 1.0, o.look.v - 0.02, 0.9, 0.012, 0.56, IW_PAINT.parchment, 0, -0.16);
  const ink = at(o.look.u + 0.6, y + 1.0, o.look.v + 0.2);
  rod(b, 'metal', ink, { x: ink.x, y: ink.y + 0.1, z: ink.z }, 0.05, 8, IW_PAINT.ink, 0.04);
  solid(out, o.look.u, o.look.v, 1.7, 0.9, y, y + 1.05, false);
  // The slate: a big dark board on two posts, its head and its three rows lettered.
  const s = S.slate!;
  for (const side of [-1, 1]) {
    const p = at(s.look.u + side * 1.35, 0, s.look.v);
    rod(b, 'wood', { x: p.x, y: y - 0.2, z: p.z }, { x: p.x, y: y + 2.6, z: p.z }, 0.07, 6, IW_PAINT.timber);
  }
  ubox(b, 'wood', s.look.u, y + 1.5, s.look.v, 2.6, 1.8, 0.07, IW_PAINT.slate);
  ubox(b, 'wood', s.look.u, y + 2.46, s.look.v, 2.8, 0.1, 0.12, IW_PAINT.darkTimber);
  out.signs.push(
    signAt(
      s.look.u,
      y + 2.15,
      s.look.v,
      0,
      -1,
      { lines: ['slateHead'], w: 2.0, h: 0.3, fill: '#3a4048', colors: SIGN_CREAM },
      0.05,
    ),
    signAt(
      s.look.u + 0.25,
      y + 1.42,
      s.look.v,
      0,
      -1,
      {
        lines: ['slatePlan', 'slateImplement', 'slateValidate'],
        w: 1.7,
        h: 1.0,
        fill: '#3a4048',
        colors: SIGN_CREAM,
      },
      0.05,
    ),
    signAt(
      s.look.u,
      y + 0.82,
      s.look.v,
      0,
      -1,
      { lines: ['slateNotes'], w: 2.2, h: 0.24, fill: '#3a4048', colors: ['#e6b84a'] },
      0.05,
    ),
  );
  // Its three check boxes (the world's ticks go in them).
  for (let k = 0; k < 3; k++)
    ubox(
      b,
      'cloth',
      s.look.u - 0.95,
      y + 1.75 - k * 0.33,
      s.look.v - 0.045,
      0.2,
      0.2,
      0.012,
      IW_PAINT.parchment,
    );
  solid(out, s.look.u, s.look.v, 2.9, 0.3, y, y + 2.5, false);
  // The mate's stand: a tall stool and a brass speaking trumpet on a post.
  const m = S.mate!;
  const mp = at(m.look.u, 0, m.look.v);
  rod(b, 'wood', { x: mp.x, y, z: mp.z }, { x: mp.x, y: y + 1.5, z: mp.z }, 0.05, 6, IW_PAINT.timber);
  rod(
    b,
    'metal',
    at(m.look.u, y + 1.5, m.look.v),
    at(m.look.u - 0.5, y + 1.72, m.look.v - 0.2),
    0.03,
    8,
    IW_PAINT.brass,
    0.16,
  );
  out.circles.push({ x: mp.x, z: mp.z, r: 0.3, y0: y - 0.3, y1: y + 1.7, height: 1.7 });
  // The sea chest: banded timber with a brass plate.
  const c = S.chest!;
  const cyaw = yawAlong(c.look.v - c.v, -(c.look.u - c.u)) - YAW_U;
  ubox(b, 'wood', c.look.u, y + 0.3, c.look.v, 1.2, 0.6, 0.7, IW_PAINT.darkTimber, cyaw);
  ubox(b, 'wood', c.look.u, y + 0.64, c.look.v, 1.24, 0.1, 0.74, IW_PAINT.timber, cyaw);
  const cl = Math.hypot(c.u - c.look.u, c.v - c.look.v);
  // Two brass bands across it.
  for (const dx of [-0.42, 0.42])
    ubox(
      b,
      'metal',
      c.look.u - ((c.v - c.look.v) / cl) * dx,
      y + 0.34,
      c.look.v + ((c.u - c.look.u) / cl) * dx,
      0.06,
      0.72,
      0.76,
      IW_PAINT.brass,
      cyaw,
    );
  out.signs.push(
    signAt(
      c.look.u,
      y + 0.36,
      c.look.v,
      (c.u - c.look.u) / cl,
      (c.v - c.look.v) / cl,
      { lines: ['chestPlate'], w: 0.8, h: 0.2, fill: '#b8923e', colors: ['#3a2a20'] },
      0.37,
    ),
  );
  solid(out, c.look.u, c.look.v, 1.3, 0.8, y, y + 0.7, false, cyaw);
  if (!lite) {
    flowerTub(b, out, u0 + 0.8, v1 - 0.7, y);
    flowerTub(b, out, u1 - 0.8, v1 - 0.7, y, IW_PAINT.saffron);
  }
}

/**
 * The Kite Walk: a low white wall on the cliff's side of the path, two benches that face the sea, the
 * kite flyers' posts (a kite flies over each) and lanterns.
 */
function kiteWalk(b: Buckets, out: IwOut, lite: boolean): void {
  const pts: readonly Uvy[] = KITE_WALK;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i]!;
    const e = pts[i + 1]!;
    const len = Math.hypot(e.u - a.u, e.v - a.v);
    const nu = -(e.v - a.v) / len;
    const nv = (e.u - a.u) / len;
    // The wall, 3.4 m to the path's left (the cliff's side); it stops short of the courts at each end.
    const t0 = i === 0 ? 0.16 : 0;
    const t1 = i === pts.length - 2 ? 0.86 : 1;
    lowWall(
      b,
      out,
      [a.u + (e.u - a.u) * t0 + nu * 3.4, a.v + (e.v - a.v) * t0 + nv * 3.4],
      [a.u + (e.u - a.u) * t1 + nu * 3.4, a.v + (e.v - a.v) * t1 + nv * 3.4],
      0.9,
      0.5,
      IW_PAINT.whitewash,
    );
    // A bench at each leg's middle, its back to the path, and a lantern past it.
    const mu = (a.u + e.u) / 2 + nu * 2.5;
    const mv = (a.v + e.v) / 2 + nv * 2.5;
    const y = ground(mu, mv);
    const yaw = yawAlong(e.u - a.u, e.v - a.v) - YAW_U;
    if (i > 0) {
      ubox(b, 'wood', mu, y + 0.45, mv, 2.0, 0.08, 0.45, IW_PAINT.cobalt, yaw);
      for (const s of [-0.8, 0.8])
        ubox(
          b,
          'stone',
          mu + ((e.u - a.u) / len) * s,
          y + 0.2,
          mv + ((e.v - a.v) / len) * s,
          0.2,
          0.44,
          0.4,
          IW_PAINT.paleStone,
          yaw,
        );
      solid(out, mu, mv, 2.1, 0.6, y - 0.2, y + 0.55, false, yaw);
    }
    lampPost(
      b,
      out,
      a.u + (e.u - a.u) * 0.3 - nu * 2.9,
      a.v + (e.v - a.v) * 0.3 - nv * 2.9,
      yawAlong(nu, nv),
    );
  }
  if (lite) return;
  // The kite flyers' posts: a timber post with a reel, by the wall.
  for (const k of KITE_POSTS) {
    const y = ground(k.u, k.v);
    const p = at(k.u, 0, k.v);
    rod(b, 'wood', { x: p.x, y: y - 0.3, z: p.z }, { x: p.x, y: y + 1.5, z: p.z }, 0.07, 6, IW_PAINT.timber);
    rod(b, 'wood', at(k.u - 0.16, y + 1.3, k.v), at(k.u + 0.16, y + 1.3, k.v), 0.12, 8, IW_PAINT.darkTimber);
    out.circles.push({ x: p.x, z: p.z, r: 0.25, y0: y - 0.4, y1: y + 1.5, height: 1.5 });
  }
}

/**
 * The Chart Court: pale paving, the Great Chart laid in its floor (a parchment sea in a blue border,
 * the eight isles in low relief, the voyage's course in brass studs, a compass rose), the brass rail
 * of five lettered posts along its north edge, the bell pulls and the slate rack on its east side, the
 * quill desk and the Plan desk on its west side, and the glass on its south side.
 */
function chartCourt(b: Buckets, out: IwOut, lite: boolean): void {
  const y = pave(b, out, COURT);
  const g = GREAT_CHART;
  const cu0 = COURT.u - COURT.halfU;
  const cu1 = COURT.u + COURT.halfU;
  const cv0 = COURT.v - COURT.halfV;
  const cv1 = COURT.v + COURT.halfV;
  // A balustrade on the cliff's side (north) and the west side north of the Kite Walk's way in.
  balustrade(b, out, [cu0, cv1 + 0.2], [cu1, cv1 + 0.2], y);
  balustrade(b, out, [cu0 - 0.2, COURT.v + 9], [cu0 - 0.2, cv1], y);
  balustrade(b, out, [cu0 - 0.2, cv0], [cu0 - 0.2, COURT.v + 3], y);
  balustrade(b, out, [cu0, cv0 - 0.2], [cu1, cv0 - 0.2], y);
  // The chart: a parchment slab 5 cm proud of the paving inside a cobalt border of the same height
  // (side by side, not one on the other). Everything laid on it stands 3 cm or more over it, so no
  // two faces lie within a hair of each other.
  const cy = y + 0.05;
  const t = 0.5;
  ubox(b, 'plaster', g.u, cy - 0.06, g.v, g.halfU * 2 - t * 2, 0.12, g.halfV * 2 - t * 2, 0xb49a68);
  for (const [u, v, su, sv] of [
    [g.u, g.v - g.halfV + t / 2, g.halfU * 2, t],
    [g.u, g.v + g.halfV - t / 2, g.halfU * 2, t],
    [g.u - g.halfU + t / 2, g.v, t, g.halfV * 2 - t * 2],
    [g.u + g.halfU - t / 2, g.v, t, g.halfV * 2 - t * 2],
  ] as const)
    ubox(b, 'plaster', u, cy - 0.06, v, su, 0.12, sv, IW_PAINT.cobalt);
  // The isles: each a low mound on a paler shore; Inkwell's has a brass pin.
  const isles = CHART_ISLES.map((i) => ({ ...i, ...chartPoint(i.x, i.y) }));
  for (const i of isles) {
    const p = at(i.u, 0, i.v);
    rod(
      b,
      'plaster',
      { x: p.x, y: cy - 0.02, z: p.z },
      { x: p.x, y: cy + 0.045, z: p.z },
      i.r * 1.25,
      14,
      0xcfe0e4,
      i.r * 1.25,
    );
    dome(b, 'plaster', p.x, cy + 0.045, p.z, i.r, i.paint, 0.2, 12);
    dome(b, 'plaster', p.x + i.r * 0.5, cy + 0.045, p.z - i.r * 0.3, i.r * 0.6, i.paint, 0.24, 10);
  }
  const here = isles[6]!;
  const hp = at(here.u, 0, here.v);
  rod(b, 'metal', { x: hp.x, y: cy, z: hp.z }, { x: hp.x, y: cy + 0.7, z: hp.z }, 0.03, 6, IW_PAINT.brass);
  dome(b, 'metal', hp.x, cy + 0.7, hp.z, 0.1, IW_PAINT.brass, 1, 8);
  // The voyage's course: brass studs from isle to isle.
  if (!lite)
    for (let k = 0; k + 1 < isles.length; k++) {
      const a = isles[k]!;
      const e = isles[k + 1]!;
      const len = Math.hypot(e.u - a.u, e.v - a.v);
      for (let s = a.r * 1.25 + 0.5; s < len - e.r * 1.25 - 0.3; s += 0.8) {
        const p = at(a.u + ((e.u - a.u) * s) / len, 0, a.v + ((e.v - a.v) * s) / len);
        rod(
          b,
          'metal',
          { x: p.x, y: cy - 0.02, z: p.z },
          { x: p.x, y: cy + 0.05, z: p.z },
          0.07,
          6,
          IW_PAINT.brass,
          0.07,
        );
      }
    }
  // A compass rose in the chart's south-east corner.
  const rose = at(g.u + g.halfU - 3.4, 0, g.v - g.halfV + 3.2);
  for (let k = 0; k < 8; k++) {
    const an = (k / 8) * Math.PI * 2;
    const r1 = k % 2 === 0 ? 2.0 : 1.2;
    box(
      b,
      'metal',
      rose.x + Math.cos(an) * (0.35 + r1) * 0.5,
      cy + 0.005,
      rose.z - Math.sin(an) * (0.35 + r1) * 0.5,
      r1 - 0.35,
      0.05,
      0.09,
      an,
      IW_PAINT.brass,
    );
  }
  rod(
    b,
    'metal',
    { x: rose.x, y: cy - 0.02, z: rose.z },
    { x: rose.x, y: cy + 0.05, z: rose.z },
    0.3,
    10,
    IW_PAINT.brass,
    0.3,
  );
  // Rhumb lines from the rose across the sheet (ink, each its own bearing: none crosses another, and
  // where one runs under an isle it is inside the isle's shore).
  if (!lite)
    for (const [an, len] of [
      [1.72, 17],
      [2.05, 21],
      [2.4, 26],
      [2.72, 27],
      [3.0, 24],
    ] as const)
      box(
        b,
        'plaster',
        rose.x + Math.cos(an) * (2.4 + len / 2),
        cy + 0.005,
        rose.z - Math.sin(an) * (2.4 + len / 2),
        len,
        0.05,
        0.05,
        an,
        IW_PAINT.ink,
      );
  // The brass rail: five posts with a lamp on each and its stage's name below, a bar between them.
  const R = RAIL;
  for (const [k, u] of R.posts.entries()) {
    const p = at(u, 0, R.v);
    ubox(b, 'stone', u, y + 0.15, R.v, 0.6, 0.3, 0.6, IW_PAINT.chalk);
    rod(b, 'metal', { x: p.x, y: y + 0.3, z: p.z }, { x: p.x, y: y + 1.5, z: p.z }, 0.05, 8, IW_PAINT.brass);
    const lamp = dome(b, 'metal', p.x, y + 1.5, p.z, 0.19, 0xffffff, 1, 10) as BufferGeometry;
    b.metal.splice(b.metal.indexOf(lamp), 1);
    out.lamps.push({ key: `rail:${RAIL_STAGES[k]}`, geo: lamp });
    const name = RAIL_STAGES[k]!;
    ubox(b, 'wood', u, y + 0.82, R.v - 0.08, 1.7, 0.36, 0.04, IW_PAINT.cobalt);
    out.signs.push(
      signAt(
        u,
        y + 0.82,
        R.v - 0.08,
        0,
        -1,
        {
          lines: [`rail${name[0]!.toUpperCase()}${name.slice(1)}`],
          w: 1.6,
          h: 0.3,
          fill: '#2c5c9a',
          colors: SIGN_CREAM,
        },
        0.03,
      ),
    );
    out.circles.push({ x: p.x, z: p.z, r: 0.34, y0: y - 0.3, y1: y + 1.6, height: 1.6 });
  }
  // The bar runs on west of the first post to a stop, where the marker waits.
  const r0 = at(R.posts[0]! - RAIL_PARK - 0.5, y + 1.2, R.v);
  const r1 = at(R.posts[R.posts.length - 1]!, y + 1.2, R.v);
  rod(b, 'metal', r0, r1, 0.03, 6, IW_PAINT.brass);
  const stop = at(R.posts[0]! - RAIL_PARK - 0.5, 0, R.v);
  rod(
    b,
    'metal',
    { x: stop.x, y: y, z: stop.z },
    { x: stop.x, y: y + 1.32, z: stop.z },
    0.04,
    6,
    IW_PAINT.brass,
  );
  dome(b, 'metal', stop.x, y + 1.32, stop.z, 0.07, IW_PAINT.brass, 1, 8);
  // The bell pulls: a timber frame, four brass bells with their ropes, a plate under each.
  const B = BELLS;
  const span = 6.2;
  for (const s of [-1, 1]) {
    const p = at(B.u, 0, B.v + (s * span) / 2);
    rod(b, 'wood', { x: p.x, y: y - 0.2, z: p.z }, { x: p.x, y: y + 3.3, z: p.z }, 0.1, 6, IW_PAINT.timber);
    out.circles.push({ x: p.x, z: p.z, r: 0.2, y0: y - 0.3, y1: y + 3.3, height: 3.3 });
  }
  ubox(b, 'wood', B.u, y + 3.25, B.v, 0.16, 0.18, span + 0.5, IW_PAINT.darkTimber);
  // In the order you read them from the chart's side (left to right, which is north to south).
  const plates = ['bellFinal', 'bellBrowser', 'bellImplement', 'bellBaseline'] as const;
  for (const [k, dv] of B.pulls.entries()) {
    const p = at(B.u, 0, B.v + dv);
    cone(b, 'metal', p.x, y + 2.55, p.z, 0.26, 0.4, 10, IW_PAINT.brass, 0.09);
    rope(b, { x: p.x, y: y + 3.16, z: p.z }, { x: p.x, y: y + 2.95, z: p.z }, 0, 0.012);
    rope(b, { x: p.x, y: y + 2.55, z: p.z }, { x: p.x, y: y + 1.5, z: p.z }, 0, 0.014, CLOTH_ROPE[k % 2]);
    ubox(b, 'wood', B.u - 0.02, y + 1.2, B.v + dv, 0.04, 0.3, 1.3, IW_PAINT.cobalt);
    out.signs.push(
      signAt(
        B.u - 0.02,
        y + 1.2,
        B.v + dv,
        -1,
        0,
        { lines: [plates[k]!], w: 1.25, h: 0.24, fill: '#2c5c9a', colors: SIGN_CREAM },
        0.03,
      ),
    );
  }
  ubox(b, 'wood', B.u, y + 1.2, B.v, 0.06, 0.06, span, IW_PAINT.darkTimber);
  solid(out, B.u, B.v, 0.3, span, y, y + 1.4, false);
  // The slate rack: a timber rack of five pegs under its heading (the world hangs the slates).
  const K = RACK;
  for (const s of [-1, 1]) {
    const p = at(K.u, 0, K.v + s * 3.3);
    rod(b, 'wood', { x: p.x, y: y - 0.2, z: p.z }, { x: p.x, y: y + 2.5, z: p.z }, 0.08, 6, IW_PAINT.timber);
  }
  ubox(b, 'wood', K.u, y + 1.45, K.v, 0.06, 1.7, 6.5, IW_PAINT.timber);
  ubox(b, 'wood', K.u - 0.02, y + 2.42, K.v, 0.06, 0.4, 2.6, IW_PAINT.cobalt);
  out.signs.push(
    signAt(
      K.u - 0.02,
      y + 2.42,
      K.v,
      -1,
      0,
      { lines: ['rackHead'], w: 2.4, h: 0.32, fill: '#2c5c9a', colors: SIGN_CREAM },
      0.04,
    ),
  );
  for (const dv of K.slots) {
    const p = at(K.u - 0.08, y + 2.0, K.v + dv);
    rod(b, 'metal', p, at(K.u - 0.2, y + 2.02, K.v + dv), 0.015, 4, IW_PAINT.brass);
  }
  solid(out, K.u, K.v, 0.4, 6.8, y, y + 2.5, false);
  // The quill desk and the Plan desk on the west side: each a chalk desk with its plate.
  const S = CIRCUIT_SPOTS.chart;
  for (const [spot, plate, extra] of [
    [S.quill!, 'quillPlate', 'quillButton'],
    [S.planDesk!, 'planPlate', null],
  ] as const) {
    ubox(b, 'stone', spot.look.u, y + 0.42, spot.look.v, 0.9, 0.84, 2.0, IW_PAINT.chalk);
    ubox(b, 'wood', spot.look.u, y + 0.87, spot.look.v, 1.0, 0.06, 2.15, IW_PAINT.timber);
    ubox(b, 'cloth', spot.look.u + 0.05, y + 0.91, spot.look.v, 0.6, 0.012, 1.0, IW_PAINT.parchment);
    ubox(b, 'wood', spot.look.u + 0.47, y + 0.5, spot.look.v, 0.04, 0.34, 1.7, IW_PAINT.cobalt);
    out.signs.push(
      signAt(
        spot.look.u + 0.47,
        y + 0.5,
        spot.look.v,
        1,
        0,
        { lines: [plate], w: 1.6, h: 0.26, fill: '#2c5c9a', colors: SIGN_CREAM },
        0.03,
      ),
    );
    if (extra) {
      // The great quill in its stand, and the one button's brass plate.
      rod(
        b,
        'cloth',
        at(spot.look.u - 0.1, y + 0.92, spot.look.v + 0.7),
        at(spot.look.u - 0.3, y + 1.9, spot.look.v + 0.95),
        0.012,
        4,
        IW_PAINT.whitewash,
        0.09,
      );
      ubox(b, 'metal', spot.look.u + 0.2, y + 0.915, spot.look.v - 0.72, 0.3, 0.02, 0.56, IW_PAINT.brass);
      out.signs.push(
        signAt(
          spot.look.u + 0.2,
          y + 0.93,
          spot.look.v - 0.72,
          1,
          0,
          { lines: [extra], w: 0.54, h: 0.2, fill: '#b8923e', colors: ['#3a2a20'], tilt: Math.PI / 2 - 0.01 },
          0,
        ),
      );
    }
    solid(out, spot.look.u, spot.look.v, 1.1, 2.2, y, y + 0.95, false);
  }
  // The glass on the south side: a brass spyglass on a tripod, looking out over the valley.
  const gl = S.glass!;
  const gp = at(gl.look.u, 0, gl.look.v);
  for (const an of [0.5, 2.6, 4.7])
    rod(
      b,
      'wood',
      { x: gp.x + Math.cos(an) * 0.45, y, z: gp.z + Math.sin(an) * 0.45 },
      { x: gp.x, y: y + 1.35, z: gp.z },
      0.03,
      5,
      IW_PAINT.darkTimber,
    );
  rod(
    b,
    'metal',
    at(gl.look.u, y + 1.4, gl.look.v + 0.5),
    at(gl.look.u, y + 1.56, gl.look.v - 0.7),
    0.07,
    8,
    IW_PAINT.brass,
    0.1,
  );
  ubox(b, 'wood', gl.look.u + 1.3, y + 0.9, gl.look.v + 0.5, 1.2, 0.3, 0.04, IW_PAINT.cobalt);
  out.signs.push(
    signAt(
      gl.look.u + 1.3,
      y + 0.9,
      gl.look.v + 0.5,
      0,
      1,
      { lines: ['glassPlate'], w: 1.1, h: 0.24, fill: '#2c5c9a', colors: SIGN_CREAM },
      0.03,
    ),
  );
  const sp = at(gl.look.u + 1.3, 0, gl.look.v + 0.5);
  rod(b, 'wood', { x: sp.x, y, z: sp.z }, { x: sp.x, y: y + 1.05, z: sp.z }, 0.05, 5, IW_PAINT.timber);
  out.circles.push({ x: gp.x, z: gp.z, r: 0.6, y0: y - 0.3, y1: y + 1.6, height: 1.6 });
  if (!lite) {
    flowerTub(b, out, cu0 + 0.9, cv0 + 0.9, y);
    flowerTub(b, out, cu1 - 0.9, cv1 - 0.9, y, IW_PAINT.saffron);
    flowerTub(b, out, cu0 + 0.9, cv1 - 0.9, y, IW_PAINT.madder);
  }
}

/** The bell ropes' colours, by turn. */
const CLOTH_ROPE = [IW_PAINT.madder, IW_PAINT.cobalt] as const;

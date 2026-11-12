import { rod, type Buckets } from '../../village/pieces';
import { stairFlights } from '../terrace-town';
import {
  B,
  at,
  bell,
  gear,
  hangLantern,
  lampPost,
  pave,
  pennants,
  rail,
  SIGN_CREAM,
  signAt,
  solid,
  stationLamps,
  TW_PAINT,
  ubox,
  uvSpan,
  yawAlong,
  type TwOut,
} from './build';
import { CIRCUIT_SPOTS, COURT_PIECES as Q, COURT_WALLS, WORKS_PIECES as P, WORKS_WALLS } from './circuit';
import { BELL_ARCH, CLOCK_WALK, COURT, LIGHT_WALK, RING, WORKS, type Uvy } from './layout';

/** The stations whose lamp stands on their left (the rest have it on their right). */
const LAMP_ON_LEFT = new Set(['gear', 'desk', 'log', 'pegs', 'bell']);

/** The twelve bells of the Bell Arch, in the Trigger menu's order (each one's sign name). */
export const BELLS = [
  'bellIssue',
  'bellFailed',
  'bellCompleted',
  'bellCodeScan',
  'bellDependabot',
  'bellDiscussionComment',
  'bellDiscussionOpened',
  'bellDiscussionUpdated',
  'bellPullRequest',
  'bellSecretScan',
  'bellSubIssue',
  'bellWorkflow',
] as const;

/**
 * Builds the ledges' set pieces (spec §3, §5): the Wheel Works (its walls, the drum's bench, the tool
 * rack, the gear rack, the cloud switch, the chart desk, the great lever's plinth and gear train, the
 * keeper's log), the Clock Walk and the Light Walk (a wall on the rock side, a brass rail over the
 * bay, lamps and pennants), the Clock Court (the clock desk, the day gear, the ring's crank, the peg
 * board, the save bell, the tide gauge, the morning log) and the Bell Arch. Each station has its lamp
 * (`lever:<place>`, `clock:<place>`). Into the kit's buckets, a part a step.
 */
export function* buildWorks(b: Buckets, out: TwOut, lite: boolean): Generator<void, void, void> {
  wheelWorks(b, out, lite);
  yield;
  walk(b, out, CLOCK_WALK, lite);
  walk(b, out, LIGHT_WALK, lite);
  yield;
  clockCourt(b, out);
  yield;
  bellArch(b, out);
  stationLamps(b, out, CIRCUIT_SPOTS, LAMP_ON_LEFT);
}

/** A plate with the pack's words on a wall or a desk facing frame direction (fu, fv). */
function plate(
  out: TwOut,
  b: Buckets,
  name: string,
  u: number,
  y: number,
  v: number,
  fu: number,
  fv: number,
  w: number,
  h = 0.34,
): void {
  const yaw = yawAlong(-fv, fu) - B.YAW_U;
  ubox(b, 'metal', u, y, v, w + 0.12, h + 0.1, 0.04, TW_PAINT.brass, yaw);
  out.signs.push(
    signAt(u, y, v, fu, fv, { lines: [name], w, h, fill: '#e0b040', colors: ['#2a2623'] }, 0.03),
  );
}

/** A lectern at frame (u, v) on floor `y`, its open book facing frame direction (fu, fv). */
function lectern(b: Buckets, out: TwOut, u: number, v: number, y: number, fu: number, fv: number): void {
  const yaw = yawAlong(-fv, fu) - B.YAW_U;
  const p = at(u, 0, v);
  rod(
    b,
    'wood',
    { x: p.x, y: y - 0.1, z: p.z },
    { x: p.x, y: y + 1.0, z: p.z },
    0.09,
    6,
    TW_PAINT.darkTimber,
    0.07,
  );
  ubox(b, 'wood', u, y + 1.06, v, 0.9, 0.06, 0.6, TW_PAINT.timber, yaw, 0.32);
  ubox(b, 'cloth', u + fu * 0.03, y + 1.11, v + fv * 0.03, 0.76, 0.03, 0.5, TW_PAINT.parchment, yaw, 0.32);
  out.circles.push({ x: p.x, z: p.z, r: 0.42, y0: y - 0.4, y1: y + 1.3, height: 1.3 });
}

/**
 * The Wheel Works: a paved yard walled on its west and north (the rock is behind them), open to the
 * bay on its south and east behind a brass rail, with the Works Stair's head at its south-east and
 * the Clock Walk's gate in its east side.
 */
function wheelWorks(b: Buckets, out: TwOut, lite: boolean): void {
  const y = pave(b, out, WORKS);
  const W = WORKS_WALLS;
  const u0 = WORKS.u - WORKS.halfU;
  const u1 = WORKS.u + WORKS.halfU;
  const v0 = WORKS.v - WORKS.halfV;
  const v1 = WORKS.v + WORKS.halfV;
  // The west and north walls: dressed stone 3.4 m high with a copper coping, limewashed over a dark
  // plinth (the yard is in the crater wall's shade from noon: the wash is how the oilers see their work,
  // and the brass and the plates read against it).
  const PLINTH = 0.7;
  for (const [a0, a1, c0, c1] of [
    [u0 - 0.2, u0 + 0.5, v0, v1 + 0.5],
    [u0, u1, v1 - 0.2, v1 + 0.5],
  ] as const) {
    uvSpan(b, 'stone', a0, a1, c0, c1, y - 0.8, y + PLINTH, TW_PAINT.soot);
    uvSpan(b, 'plaster', a0 + 0.04, a1 - 0.04, c0 + 0.04, c1 - 0.04, y + PLINTH, y + 3.4, TW_PAINT.limewash);
  }
  uvSpan(b, 'metal', u0 - 0.3, u0 + 0.6, v0 - 0.1, v1 + 0.6, y + 3.4, y + 3.5, TW_PAINT.copper);
  uvSpan(b, 'metal', u0, u1 + 0.1, v1 - 0.3, v1 + 0.6, y + 3.4, y + 3.5, TW_PAINT.copper);
  solid(out, u0 + 0.15, WORKS.v + 0.25, 0.7, WORKS.halfV * 2 + 0.5, y - 0.8, y + 3.5);
  solid(out, WORKS.u, v1 + 0.15, WORKS.halfU * 2, 0.7, y - 0.8, y + 3.5);
  // The rails over the town: the south side but for the stair's head, the east side but for the gate.
  rail(b, out, [u0 + 0.6, v0 + 0.25, y], [-128.6, v0 + 0.25, y], TW_PAINT.brass);
  rail(b, out, [-123.4, v0 + 0.25, y], [u1 - 0.3, v0 + 0.25, y], TW_PAINT.brass);
  rail(b, out, [u1 - 0.25, v0 + 0.3, y], [u1 - 0.25, WORKS.v - 1, y], TW_PAINT.brass);
  rail(b, out, [u1 - 0.25, WORKS.v + 3.2, y], [u1 - 0.25, v1 - 0.4, y], TW_PAINT.brass);
  // Its name over the stair's head.
  for (const du of [-2.6, 2.6]) {
    const p = at(-126 + du, 0, v0 + 0.25);
    rod(b, 'metal', { x: p.x, y: y, z: p.z }, { x: p.x, y: y + 3.3, z: p.z }, 0.06, 6, TW_PAINT.iron);
  }
  ubox(b, 'wood', -126, y + 3.1, v0 + 0.25, 5.2, 0.6, 0.06, TW_PAINT.darkTimber);
  out.signs.push(
    signAt(
      -126,
      y + 3.1,
      v0 + 0.25,
      0,
      -1,
      { lines: ['worksSign'], w: 4.8, h: 0.44, fill: '#5e4432', colors: SIGN_CREAM, twoSided: true },
      0.04,
    ),
  );

  // The drum's bench against the west wall: a timber cradle with brass cheeks (the drum turns: the
  // world's own mesh), the comb before it, and the pattern's plate on the wall.
  ubox(b, 'wood', P.drum.u, y + 0.4, P.drum.v, 0.9, 0.8, 2.2, TW_PAINT.darkTimber);
  for (const s of [-1, 1])
    ubox(b, 'metal', P.drum.u, y + 1.15, P.drum.v + s * 0.86, 0.5, 0.86, 0.06, TW_PAINT.brass);
  ubox(b, 'metal', P.drum.u + 0.52, y + 1.0, P.drum.v, 0.2, 0.03, 1.5, TW_PAINT.brass);
  solid(out, P.drum.u, P.drum.v, 1.0, 2.3, y, y + 1.7, false);
  plate(out, b, 'drumPlate', W.west + 0.03, y + 2.4, P.drum.v, 1, 0, 1.9);

  // The tool rack on the west wall: three reading glasses on hooks, the hammers behind an iron grille.
  ubox(b, 'wood', W.west + 0.04, y + 1.7, P.tools.v, 0.06, 1.3, 3.2, TW_PAINT.timber);
  for (const dv of [-1.1, -0.6, -0.1]) {
    const g = at(W.west + 0.12, y + 1.9, P.tools.v + dv);
    rod(b, 'metal', { x: g.x, y: g.y, z: g.z }, { x: g.x, y: g.y - 0.5, z: g.z }, 0.018, 4, TW_PAINT.brass);
    gear(b, g.x, g.y + 0.16, g.z, 0.16, 0.03, 16, B.YAW_U + Math.PI / 2, TW_PAINT.brass);
  }
  for (const dv of [0.6, 0.95, 1.3]) {
    ubox(b, 'wood', W.west + 0.12, y + 1.65, P.tools.v + dv, 0.05, 0.7, 0.07, TW_PAINT.darkTimber);
    ubox(b, 'metal', W.west + 0.12, y + 2.05, P.tools.v + dv, 0.12, 0.14, 0.26, TW_PAINT.iron);
  }
  for (const dv of [0.42, 0.78, 1.13, 1.48])
    ubox(b, 'metal', W.west + 0.2, y + 1.7, P.tools.v + dv, 0.03, 1.2, 0.03, TW_PAINT.iron);
  plate(out, b, 'toolsPlate', W.west + 0.08, y + 2.6, P.tools.v, 1, 0, 2.4);

  // The gear rack on the north wall: three trigger gears on pegs (the hand gear, the day gear, the
  // bell gear), each with its tag.
  ubox(b, 'wood', P.gear.u, y + 1.6, W.north - 0.04, 3.6, 1.7, 0.06, TW_PAINT.timber);
  for (const [k, du] of [-1.15, 0, 1.15].entries()) {
    const g = at(P.gear.u + du, y + 1.75, W.north - 0.16);
    gear(b, g.x, g.y, g.z, 0.42, 0.08, 12, B.YAW_U, [TW_PAINT.brass, TW_PAINT.bronze, TW_PAINT.copper][k]!);
    rod(b, 'metal', at(P.gear.u + du, y + 1.75, W.north - 0.04), g, 0.04, 5, TW_PAINT.iron);
  }
  plate(out, b, 'gearPlate', P.gear.u, y + 2.75, W.north - 0.03, 0, -1, 3.2);

  // The cloud switch: a brass lever in a slotted plate, with a shutter's chain running up the wall
  // (toward the rock light, out past the breach).
  ubox(b, 'metal', P.switch.u, y + 1.5, W.north - 0.05, 0.7, 1.1, 0.05, TW_PAINT.iron);
  rod(
    b,
    'metal',
    at(P.switch.u, y + 1.2, W.north - 0.1),
    at(P.switch.u, y + 1.75, W.north - 0.42),
    0.03,
    5,
    TW_PAINT.brass,
  );
  rod(
    b,
    'rope',
    at(P.switch.u + 0.5, y + 1.6, W.north - 0.08),
    at(P.switch.u + 0.5, y + 3.3, W.north - 0.08),
    0.015,
    4,
    TW_PAINT.iron,
  );
  plate(out, b, 'switchPlate', P.switch.u, y + 2.5, W.north - 0.03, 0, -1, 2.2);

  // The chart desk: a slanted desk with the bay's chart (which waters, which berth), two brass plates.
  ubox(b, 'wood', P.desk.u, y + 0.5, P.desk.v + 0.2, 2.4, 1.0, 0.9, TW_PAINT.darkTimber);
  ubox(b, 'wood', P.desk.u, y + 1.06, P.desk.v + 0.15, 2.5, 0.06, 1.0, TW_PAINT.timber, 0, -0.2);
  ubox(b, 'cloth', P.desk.u, y + 1.1, P.desk.v + 0.15, 2.1, 0.02, 0.8, TW_PAINT.parchment, 0, -0.2);
  solid(out, P.desk.u, P.desk.v + 0.2, 2.5, 1.0, y, y + 1.2, false);
  plate(out, b, 'deskPlate', P.desk.u, y + 2.2, W.north - 0.03, 0, -1, 2.6);

  // The great lever: a stone plinth in the yard's middle with a slotted brass quadrant (the lever
  // itself moves: the world's own mesh), and behind it the Works' gear train on an iron frame.
  const lp = at(P.lever.u, 0, P.lever.v);
  uvSpan(
    b,
    'stone',
    P.lever.u - 0.8,
    P.lever.u + 0.8,
    P.lever.v - 0.5,
    P.lever.v + 0.5,
    y - 0.1,
    y + 0.5,
    TW_PAINT.soot,
  );
  ubox(b, 'metal', P.lever.u, y + 0.75, P.lever.v, 0.1, 0.5, 0.8, TW_PAINT.brass);
  out.circles.push({ x: lp.x, z: lp.z, r: 0.95, y0: y - 0.4, y1: y + 2.2, height: 2.2 });
  const tv = P.lever.v + 3.4;
  for (const du of [-2.6, 2.6]) {
    const f = at(P.lever.u + du, 0, tv);
    rod(b, 'metal', { x: f.x, y: y - 0.1, z: f.z }, { x: f.x, y: y + 3.6, z: f.z }, 0.08, 6, TW_PAINT.iron);
    out.circles.push({ x: f.x, z: f.z, r: 0.2, y0: y - 0.4, y1: y + 3.6, height: 3.6 });
  }
  ubox(b, 'metal', P.lever.u, y + 3.6, tv, 5.4, 0.12, 0.12, TW_PAINT.iron);
  ubox(b, 'metal', P.lever.u, y + 1.6, tv, 5.4, 0.1, 0.1, TW_PAINT.iron);
  plate(out, b, 'leverPlate', P.lever.u, y + 0.3, P.lever.v - 0.52, 0, -1, 1.4, 0.28);

  // The keeper's log on its lectern, and its board on a post behind.
  lectern(b, out, P.log.u, P.log.v, y, -1, 0);
  const bp = at(P.log.u + 0.9, 0, P.log.v);
  rod(
    b,
    'wood',
    { x: bp.x, y: y - 0.1, z: bp.z },
    { x: bp.x, y: y + 2.5, z: bp.z },
    0.06,
    6,
    TW_PAINT.darkTimber,
  );
  plate(out, b, 'logPlate', P.log.u + 0.84, y + 2.1, P.log.v, -1, 0, 1.9);

  if (!lite) {
    // Oil cans and a work bench by the south rail.
    ubox(b, 'wood', u0 + 5, y + 0.45, v0 + 1.2, 2.2, 0.08, 0.8, TW_PAINT.timber);
    for (const s of [-0.9, 0.9])
      ubox(b, 'wood', u0 + 5 + s, y + 0.2, v0 + 1.2, 0.1, 0.42, 0.7, TW_PAINT.darkTimber);
    for (const [du, r] of [
      [-0.5, 0.1],
      [0.1, 0.13],
      [0.6, 0.09],
    ] as const) {
      const c = at(u0 + 5 + du, 0, v0 + 1.2);
      rod(
        b,
        'metal',
        { x: c.x, y: y + 0.49, z: c.z },
        { x: c.x, y: y + 0.75, z: c.z },
        r,
        8,
        TW_PAINT.copper,
        r * 0.5,
      );
    }
    solid(out, u0 + 5, v0 + 1.2, 2.3, 0.9, y, y + 0.8, false);
  }
  // Lanterns on the walls.
  for (const dv of [-6, 0.6, 7]) {
    const l = at(W.west + 0.6, 0, WORKS.v + dv);
    rod(
      b,
      'metal',
      at(W.west + 0.05, y + 3.1, WORKS.v + dv),
      { x: l.x, y: y + 3.1, z: l.z },
      0.025,
      4,
      TW_PAINT.iron,
    );
    hangLantern(b, out, l.x, y + 3.1, l.z, B.YAW_U);
  }
}

/**
 * A walk along the inner wall: each stretch is a ramp with a brass rail on its bay side, or (where it
 * climbs more steeply than a ramp should) a railed flight of steps; a lamp at every bend, and (but on
 * Lite) a line of pennants over each ramp.
 */
function walk(b: Buckets, out: TwOut, pts: readonly Uvy[], lite: boolean): void {
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i]!;
    const e = pts[i + 1]!;
    const len = Math.hypot(e.u - a.u, e.v - a.v);
    if (len < 6) continue;
    // The bay's side of the stretch: its normal toward the ring's middle.
    let nu = (e.v - a.v) / len;
    let nv = -(e.u - a.u) / len;
    if (nu * (RING.u - a.u) + nv * (RING.v - a.v) < 0) {
      nu = -nu;
      nv = -nv;
    }
    const p = (t: number, off: number) =>
      [
        a.u + (e.u - a.u) * t + nu * off,
        a.v + (e.v - a.v) * t + nv * off,
        a.y + (e.y - a.y) * t + 0.02,
      ] as const;
    if (Math.abs(e.y - a.y) / len > 0.18) stairFlights(B, b, out, [a, e], 2.4, [0.1, 0.9]);
    else {
      rail(b, out, p(0.04, 2), p(0.96, 2), TW_PAINT.brass);
      if (!lite) {
        const posts = [2.1, -2.1].map((off) => {
          const [u, v, y0] = p(0.5, off);
          const q = at(u, 0, v);
          rod(
            b,
            'metal',
            { x: q.x, y: y0 - 0.2, z: q.z },
            { x: q.x, y: y0 + 3.5, z: q.z },
            0.05,
            5,
            TW_PAINT.iron,
          );
          out.circles.push({ x: q.x, z: q.z, r: 0.14, y0: y0 - 0.4, y1: y0 + 3.5, height: 3.5 });
          return [u, v, y0 + 3.4] as const;
        });
        pennants(b, posts[0]!, posts[1]!, 0.3);
      }
    }
    // A lamp on the rock side at the stretch's end, its arm over the walk.
    lampPost(b, out, e.u - nu * 2.1, e.v - nv * 2.1, yawAlong(nu, nv));
  }
}

/**
 * The Clock Court: paved, the rock wall on its east with the clock desk, the day gear and the peg
 * board, a balustrade over the bay on its west with the save bell and the tide gauge, the ring's
 * crank at its south end (you turn it facing the Lighthouse's clock), and the morning log.
 */
function clockCourt(b: Buckets, out: TwOut): void {
  const y = pave(b, out, COURT);
  const W = COURT_WALLS;
  const u0 = COURT.u - COURT.halfU;
  const u1 = COURT.u + COURT.halfU;
  const v0 = COURT.v - COURT.halfV;
  const v1 = COURT.v + COURT.halfV;
  // The east wall: dressed stone against the rock.
  uvSpan(b, 'stone', u1 - 0.5, u1 + 0.3, v0, v1, y - 0.8, y + 3.6, TW_PAINT.soot);
  uvSpan(b, 'metal', u1 - 0.6, u1 + 0.4, v0 - 0.1, v1 + 0.1, y + 3.6, y + 3.7, TW_PAINT.copper);
  solid(out, u1 - 0.1, COURT.v, 0.8, COURT.halfV * 2, y - 0.8, y + 3.7);
  // The balustrade over the bay (west), and the south side but for the Light Walk's way out.
  rail(b, out, [u0 + 0.25, v0 + 0.3, y], [u0 + 0.25, v1 - 0.3, y], TW_PAINT.brass);
  rail(b, out, [u0 + 0.3, v0 + 0.25, y], [COURT.u - 2.6, v0 + 0.25, y], TW_PAINT.brass);
  rail(b, out, [COURT.u + 2.6, v0 + 0.25, y], [u1 - 0.6, v0 + 0.25, y], TW_PAINT.brass);

  // The clock desk: the automation's ledger, open, with a quill.
  ubox(b, 'wood', Q.desk.u + 0.1, y + 0.5, Q.desk.v, 0.9, 1.0, 2.2, TW_PAINT.darkTimber);
  ubox(b, 'cloth', Q.desk.u, y + 1.03, Q.desk.v, 0.6, 0.04, 1.0, TW_PAINT.parchment);
  solid(out, Q.desk.u + 0.1, Q.desk.v, 1.0, 2.3, y, y + 1.1, false);
  plate(out, b, 'clockDeskPlate', W.east - 0.03, y + 2.3, Q.desk.v, -1, 0, 2.4);

  // The day gear: a great gear's boss on the wall (the gear turns: the world's own mesh).
  rod(
    b,
    'metal',
    at(W.east - 0.02, y + 1.9, Q.gear.v),
    at(W.east - 0.5, y + 1.9, Q.gear.v),
    0.14,
    8,
    TW_PAINT.iron,
  );
  plate(out, b, 'dayGearPlate', W.east - 0.03, y + 3.25, Q.gear.v, -1, 0, 2.2, 0.3);

  // The peg board: a brass arc of twelve holes on the wall, pegs in the hours that are set (the nine
  // peg comes out: the world's own mesh).
  ubox(b, 'wood', W.east - 0.04, y + 1.6, Q.pegs.v, 0.06, 1.5, 2.6, TW_PAINT.timber);
  for (let k = 0; k < 12; k++) {
    const an = Math.PI * (0.08 + (0.84 * k) / 11);
    const h = at(W.east - 0.09, y + 1.15 + Math.sin(an) * 0.95, Q.pegs.v + Math.cos(an) * 1.05);
    rod(b, 'metal', h, { x: h.x - 0.02, y: h.y, z: h.z }, 0.05, 6, TW_PAINT.iron);
  }
  plate(out, b, 'pegsPlate', W.east - 0.03, y + 2.75, Q.pegs.v, -1, 0, 2.4);

  // The ring's crank: a pedestal with a brass wheel (it turns with the dial: the world's own mesh).
  const rp = at(Q.ring.u, 0, Q.ring.v);
  rod(
    b,
    'stone',
    { x: rp.x, y: y - 0.1, z: rp.z },
    { x: rp.x, y: y + 0.95, z: rp.z },
    0.34,
    8,
    TW_PAINT.soot,
    0.26,
  );
  out.circles.push({ x: rp.x, z: rp.z, r: 0.55, y0: y - 0.4, y1: y + 1.4, height: 1.4 });
  plate(out, b, 'ringPlate', Q.ring.u, y + 0.5, Q.ring.v + 0.36, 0, 1, 0.9, 0.24);

  // The save bell: a bell on a bracket post at the balustrade.
  const sb = at(Q.bell.u, 0, Q.bell.v);
  rod(b, 'metal', { x: sb.x, y: y - 0.1, z: sb.z }, { x: sb.x, y: y + 2.7, z: sb.z }, 0.06, 6, TW_PAINT.iron);
  const arm = at(Q.bell.u + 0.6, y + 2.6, Q.bell.v);
  rod(b, 'metal', { x: sb.x, y: y + 2.6, z: sb.z }, arm, 0.035, 5, TW_PAINT.iron);
  bell(b, arm.x, arm.y - 0.05, arm.z, 0.3, TW_PAINT.brass);
  out.circles.push({ x: sb.x, z: sb.z, r: 0.18, y0: y - 0.4, y1: y + 2.7, height: 2.7 });
  plate(out, b, 'saveBellPlate', Q.bell.u + 0.08, y + 1.3, Q.bell.v, 1, 0, 1.5, 0.28);

  // The tide gauge: a tall glass tube in a brass frame with marks (its float moves: the world's own
  // mesh), the bay behind it.
  const tg = at(Q.tide.u, 0, Q.tide.v);
  ubox(b, 'metal', Q.tide.u, y + 0.2, Q.tide.v, 0.5, 0.4, 0.5, TW_PAINT.brass);
  for (const s of [-1, 1])
    ubox(b, 'metal', Q.tide.u, y + 1.3, Q.tide.v + s * 0.2, 0.06, 2.0, 0.05, TW_PAINT.brass);
  ubox(b, 'metal', Q.tide.u, y + 2.33, Q.tide.v, 0.4, 0.08, 0.5, TW_PAINT.brass);
  for (let k = 0; k < 6; k++)
    ubox(b, 'metal', Q.tide.u + 0.06, y + 0.6 + k * 0.3, Q.tide.v + 0.2, 0.02, 0.02, 0.14, TW_PAINT.iron);
  out.circles.push({ x: tg.x, z: tg.z, r: 0.4, y0: y - 0.4, y1: y + 2.4, height: 2.4 });
  plate(out, b, 'tidePlate', Q.tide.u + 0.3, y + 0.2, Q.tide.v, 1, 0, 1.0, 0.22);

  // The morning log.
  lectern(b, out, Q.log.u, Q.log.v, y, 1, 0.3);
  plate(out, b, 'morningLogPlate', Q.log.u + 0.12, y + 0.5, Q.log.v, 1, 0.3, 1.1, 0.22);
  // Lanterns on the east wall.
  for (const dv of [-8, -2, 3.4, 9]) {
    const l = at(W.east - 0.6, 0, COURT.v + dv);
    rod(
      b,
      'metal',
      at(W.east - 0.05, y + 3.3, COURT.v + dv),
      { x: l.x, y: y + 3.3, z: l.z },
      0.025,
      4,
      TW_PAINT.iron,
    );
    hangLantern(b, out, l.x, y + 3.3, l.z, B.YAW_U);
  }
}

/**
 * The Bell Arch: a stone arch across the court's north end (the Clock Walk comes in under it), twelve
 * small bells hung under its lintel in two rows, a plate for each on its piers, and a spyglass on the
 * balustrade's corner, set on the rock light.
 */
function bellArch(b: Buckets, out: TwOut): void {
  const y = COURT.y + 0.03;
  const A = BELL_ARCH;
  const half = A.span / 2;
  for (const s of [-1, 1]) {
    uvSpan(
      b,
      'stone',
      A.u + s * half - 0.6,
      A.u + s * half + 0.6,
      A.v - 0.5,
      A.v + 0.5,
      y - 0.6,
      y + 4.2,
      TW_PAINT.soot,
    );
    solid(out, A.u + s * half, A.v, 1.2, 1.0, y - 0.6, y + 4.2);
  }
  uvSpan(
    b,
    'stone',
    A.u - half - 0.8,
    A.u + half + 0.8,
    A.v - 0.6,
    A.v + 0.6,
    y + 4.2,
    y + 5.0,
    TW_PAINT.soot,
  );
  uvSpan(
    b,
    'metal',
    A.u - half - 0.9,
    A.u + half + 0.9,
    A.v - 0.7,
    A.v + 0.7,
    y + 5.0,
    y + 5.1,
    TW_PAINT.copper,
  );
  out.cameraBoxes.push({
    ...at(A.u, 0, A.v),
    hx: half + 0.9,
    hz: 0.8,
    rot: B.YAW_U,
    y0: y + 3.2,
    y1: y + 5.2,
  });
  out.perches.push(at(A.u, y + 5.15, A.v));
  for (const [k, name] of BELLS.entries()) {
    const row = k % 2;
    const t = (Math.floor(k / 2) + 0.5) / 6;
    const p = at(A.u - half + 0.9 + t * (A.span - 1.8), y + 4.15 - row * 0.5, A.v + (row ? 0.28 : -0.28));
    bell(b, p.x, p.y, p.z, 0.19 + (k % 3) * 0.03, k % 4 === 3 ? TW_PAINT.bronze : TW_PAINT.brass);
    // Its plate: six down each pier's court face.
    const pier = k < 6 ? -1 : 1;
    plate(out, b, name, A.u + pier * half, y + 3.2 - (k % 6) * 0.42, A.v - 0.52, 0, -1, 1.02, 0.3);
  }
  plate(out, b, 'bellArchSign', A.u, y + 4.6, A.v - 0.62, 0, -1, 4.4, 0.4);
  // The spyglass on a post at the court's north-west corner, set on the rock light out past the breach.
  const su = COURT.u - COURT.halfU + 1.1;
  const sv = COURT.v + COURT.halfV - 1.4;
  const sp = at(su, 0, sv);
  rod(
    b,
    'metal',
    { x: sp.x, y: y - 0.1, z: sp.z },
    { x: sp.x, y: y + 1.35, z: sp.z },
    0.05,
    6,
    TW_PAINT.iron,
  );
  rod(
    b,
    'metal',
    at(su + 0.35, y + 1.42, sv + 0.02),
    at(su - 0.45, y + 1.5, sv - 0.03),
    0.05,
    8,
    TW_PAINT.brass,
    0.075,
  );
  out.circles.push({ x: sp.x, z: sp.z, r: 0.3, y0: y - 0.4, y1: y + 1.6, height: 1.6 });
  plate(out, b, 'rockLightPlate', su + 0.1, y + 0.6, sv, 1, 0, 1.3, 0.24);
}

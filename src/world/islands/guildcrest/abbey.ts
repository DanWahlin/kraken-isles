import { cone, pitchedRoof, rod, rope, type Buckets } from '../../village/pieces';
import { seatBlock } from '../../characters/seat-fit';
import { lineDeck, uvDeck } from '../../village/walk-decks';
import {
  at,
  door,
  flight,
  GC_PAINT,
  ground,
  hangLantern,
  lowWall,
  signAt,
  solid,
  ubox,
  uvSpan,
  windowPane,
  yawAlong,
  YAW_U,
  type GcOut,
} from './build';
import { CIRCUIT_SPOTS } from './circuit';
import { CLOISTER, KNOLL, TERRACE, toWorld, TOWER } from './layout';
import { ABBEY } from './town';

/**
 * Builds the Scriptorium abbey on the Abbey Knoll (spec §3.6, G17, as built §15): the gatehouse at the
 * brae's top, the cloister (a lawn garth with a well, arcaded walks under lean-to slate roofs) with the
 * scriptorium in its west range (the slype through it from the gatehouse), the chained library's open
 * bay in its north range, the chapter house and the east gate in its east range, the church on its
 * south side, the bell tower at the church's east end, and the tower's terrace on its plinth with the
 * railed stair down from the guildhall yard. The Pattern Book's station pieces stand on the walks.
 */

const C = CLOISTER;
const FLOOR = KNOLL.y;
/** The walks' paving top (3 cm over the knoll's ground). */
const WALK = FLOOR + 0.03;
const RANGE_EAVES = FLOOR + 7.5;
const CHURCH_EAVES = FLOOR + 10.5;

export function* buildAbbey(b: Buckets, out: GcOut, lite: boolean): Generator<void, void, void> {
  gatehouse(b, out);
  yield;
  ranges(b, out, lite);
  yield;
  walks(b, out, lite);
  yield;
  garth(b, out);
  stations(b, out, lite);
  yield;
  library(b, out, lite);
  yield;
  tower(b, out, lite);
  yield;
  terrace(b, out);
}

/** The gatehouse: a stone block with an arched passage along u, a slate roof, a lantern at its door. */
function gatehouse(b: Buckets, out: GcOut): void {
  const g = ABBEY.gatehouse;
  const s = ABBEY.slype;
  const y0 = Math.min(ground(g.u0, g.v0), ground(g.u0, g.v1), ground(g.u1, g.v0), ground(g.u1, g.v1)) - 0.6;
  const top = FLOOR + 6.4;
  uvSpan(b, 'stone', g.u0, g.u1, g.v0, s.v0, y0, top, GC_PAINT.stone);
  uvSpan(b, 'stone', g.u0, g.u1, s.v1, g.v1, y0, top, GC_PAINT.stone);
  uvSpan(b, 'stone', g.u0, g.u1, s.v0, s.v1, FLOOR + 4.6, top, GC_PAINT.stone);
  // The arch's voussoirs over the passage at each end (a band a little proud of the wall).
  for (const u of [g.u0 - 0.06, g.u1 + 0.06])
    ubox(b, 'stone', u, FLOOR + 4.75, (s.v0 + s.v1) / 2, 0.14, 0.4, s.v1 - s.v0 + 0.8, GC_PAINT.rubble);
  const p = toWorld((g.u0 + g.u1) / 2, (g.v0 + g.v1) / 2);
  pitchedRoof(
    b,
    'paving',
    p.x,
    top,
    p.z,
    YAW_U + Math.PI / 2,
    g.v1 - g.v0 + 0.6,
    g.u1 - g.u0,
    2.6,
    GC_PAINT.slate,
  );
  solid(out, (g.u0 + g.u1) / 2, (g.v0 + s.v0) / 2, g.u1 - g.u0, s.v0 - g.v0, y0, top + 2.6);
  solid(out, (g.u0 + g.u1) / 2, (s.v1 + g.v1) / 2, g.u1 - g.u0, g.v1 - s.v1, y0, top + 2.6);
  out.cameraBoxes.push({
    ...at((g.u0 + g.u1) / 2, 0, (s.v0 + s.v1) / 2),
    hx: (g.u1 - g.u0) / 2,
    hz: 2,
    rot: YAW_U,
    y0: FLOOR + 4.5,
    y1: top + 2.6,
  });
  // The passage's floor: flags.
  uvSpan(b, 'paving', g.u0 - 0.5, g.u1 + 0.5, s.v0, s.v1, FLOOR - 0.2, WALK, GC_PAINT.paving);
  // Brother Aidan's desk and his rack of keys by the west door.
  const desk = { u: g.u0 - 6.6, v: s.v0 - 5.4 };
  ubox(b, 'wood', desk.u, ground(desk.u, desk.v) + 0.78, desk.v, 1.4, 0.08, 0.7, GC_PAINT.timber);
  for (const [du, dv] of [
    [-0.6, -0.28],
    [0.6, -0.28],
    [-0.6, 0.28],
    [0.6, 0.28],
  ] as const)
    ubox(
      b,
      'wood',
      desk.u + du,
      ground(desk.u, desk.v) + 0.38,
      desk.v + dv,
      0.07,
      0.76,
      0.07,
      GC_PAINT.timber,
    );
  solid(out, desk.u, desk.v, 1.5, 0.8, ground(desk.u, desk.v), ground(desk.u, desk.v) + 0.85, false);
  ubox(b, 'wood', g.u0 - 0.06, FLOOR + 1.9, s.v0 - 1.6, 0.06, 0.6, 1.0, GC_PAINT.timber);
  for (let k = 0; k < 4; k++)
    ubox(b, 'metal', g.u0 - 0.1, FLOOR + 1.8, s.v0 - 1.95 + k * 0.24, 0.04, 0.16, 0.05, GC_PAINT.bronze);
  const l = at(g.u0 - 0.6, 0, s.v1 + 0.8);
  rod(
    b,
    'metal',
    at(g.u0, FLOOR + 3.35, s.v1 + 0.8),
    at(g.u0 - 0.6, FLOOR + 3.35, s.v1 + 0.8),
    0.025,
    4,
    GC_PAINT.iron,
  );
  hangLantern(b, out, l.x, FLOOR + 3.35, l.z, YAW_U);
}

/** A range's wall box (from its foundation) and its roof along `along`. */
function rangeBlock(
  b: Buckets,
  out: GcOut,
  u0: number,
  u1: number,
  v0: number,
  v1: number,
  eaves: number,
  outset = 0.1,
): void {
  const y0 = FLOOR - 1.2;
  uvSpan(b, 'stone', u0, u1, v0, v1, y0, eaves, GC_PAINT.stone);
  ubox(
    b,
    'stone',
    (u0 + u1) / 2,
    (y0 - 0.05 + FLOOR + 0.5) / 2,
    (v0 + v1) / 2,
    u1 - u0 + 2 * outset,
    FLOOR + 0.55 - y0,
    v1 - v0 + 2 * outset,
    GC_PAINT.rubble,
  );
  solid(out, (u0 + u1) / 2, (v0 + v1) / 2, u1 - u0 + 0.2, v1 - v0 + 0.2, y0, eaves + 3);
}

/** The four ranges round the walks, with the slype, the library's bay and the east gate cut through. */
function ranges(b: Buckets, out: GcOut, lite: boolean): void {
  const w = C.u - ABBEY.outer;
  const e = C.u + ABBEY.outer;
  const s = C.v - ABBEY.outer;
  const n = C.v + ABBEY.outer;
  const wi = C.u - ABBEY.walk;
  const ei = C.u + ABBEY.walk;
  const si = C.v - ABBEY.walk;
  const ni = C.v + ABBEY.walk;
  const sl = ABBEY.slype;
  const eg = ABBEY.eastGate;
  const bay = ABBEY.libraryBay;
  // West range (the scriptorium), the slype through it.
  rangeBlock(b, out, w, wi, s, sl.v0, RANGE_EAVES);
  rangeBlock(b, out, w, wi, sl.v1, n, RANGE_EAVES);
  uvSpan(b, 'stone', w, wi, sl.v0, sl.v1, FLOOR + 4.6, RANGE_EAVES, GC_PAINT.stone);
  uvSpan(b, 'paving', w - 0.5, wi, sl.v0, sl.v1, FLOOR - 0.2, WALK, GC_PAINT.paving);
  // North range (the chained library), its open bay on the walk.
  rangeBlock(b, out, wi, bay.u0, ni, n, RANGE_EAVES, 0.12);
  rangeBlock(b, out, bay.u1, ei, ni, n, RANGE_EAVES, 0.12);
  uvSpan(b, 'stone', bay.u0, bay.u1, n - 0.8, n, FLOOR - 1.2, RANGE_EAVES, GC_PAINT.stone);
  uvSpan(b, 'stone', bay.u0, bay.u1, ni, n - 0.8, FLOOR + 5.2, RANGE_EAVES, GC_PAINT.stone);
  solid(out, (bay.u0 + bay.u1) / 2, n - 0.4, bay.u1 - bay.u0, 0.8, FLOOR - 1, RANGE_EAVES + 3);
  // East range (the chapter house), the east gate through it.
  rangeBlock(b, out, ei, e, si, eg.v0, RANGE_EAVES, 0.14);
  rangeBlock(b, out, ei, e, eg.v1, ni, RANGE_EAVES, 0.14);
  uvSpan(b, 'stone', ei, e, eg.v0, eg.v1, FLOOR + 4.6, RANGE_EAVES, GC_PAINT.stone);
  uvSpan(b, 'paving', ei, e + 0.5, eg.v0, eg.v1, FLOOR - 0.2, WALK, GC_PAINT.paving);
  // South range (the church), on east to the tower, taller.
  rangeBlock(b, out, wi, ABBEY.churchEast, s, si, CHURCH_EAVES, 0.16);
  // Roofs: the west and east ranges' ridges along v, the north range's and the church's along u.
  const roof = (
    u: number,
    v: number,
    along: 'u' | 'v',
    len: number,
    span: number,
    eaves: number,
    rise: number,
  ) => {
    const p = toWorld(u, v);
    pitchedRoof(
      b,
      'paving',
      p.x,
      eaves,
      p.z,
      along === 'u' ? YAW_U : YAW_U + Math.PI / 2,
      len,
      span,
      rise,
      GC_PAINT.slate,
    );
  };
  roof((w + wi) / 2, (s + n) / 2, 'v', n - s + 0.8, wi - w, RANGE_EAVES, 3.6);
  roof((wi + ei) / 2, (ni + n) / 2, 'u', ei - wi + 0.2, n - ni, RANGE_EAVES, 3.6);
  roof((ei + e) / 2, (si + ni) / 2, 'v', ni - si + 0.2, e - ei, RANGE_EAVES, 3.6);
  roof(
    (wi + ABBEY.churchEast) / 2,
    (s + si) / 2,
    'u',
    ABBEY.churchEast - wi + 0.6,
    si - s,
    CHURCH_EAVES,
    4.4,
  );
  // Windows: the scriptorium's three wide openings onto the west walk (desks inside), the church's tall
  // lancets onto the south walk, the outer faces' small windows (lit at night).
  for (const v of [124, 132, 140]) windowPane(b, wi + 0.01, v, FLOOR + 2.1, 1, 0, 2.2, 1.6);
  for (const u of [14, 22, 30]) windowPane(b, u, si + 0.01, FLOOR + 5.2, 0, 1, 1.0, 4.2);
  if (!lite) {
    for (const v of [110, 126, 140, 150]) windowPane(b, w - 0.01, v, FLOOR + 4.4, -1, 0, 0.7, 1.2);
    for (const u of [12, 22, 34, 44]) windowPane(b, u, s - 0.01, FLOOR + 6.4, 0, -1, 1.0, 4.4);
    for (const v of [122, 130, 144]) windowPane(b, e + 0.01, v, FLOOR + 4.4, 1, 0, 0.7, 1.2);
  }
  // The scriptorium's door (the shelf station stands by it) and the church's door off the south walk.
  door(b, wi + 0.01, 129.4, WALK, 1, 0, 1.3, 2.5);
  door(b, C.u, si + 0.01, WALK, 0, 1, 1.8, 3.2, GC_PAINT.doorRed);
}

/** The walks: paving, the arcade's piers and lintels on the lawn's edge, lean-to slate roofs. */
function walks(b: Buckets, out: GcOut, lite: boolean): void {
  const gi = ABBEY.garth;
  const wk = ABBEY.walk;
  const pierTop = FLOOR + 4.4;
  // Paving: four strips, no overlaps (west and east span the corners).
  const strips = [
    [C.u - wk, C.u - gi, C.v - wk, C.v + wk],
    [C.u + gi, C.u + wk, C.v - wk, C.v + wk],
    [C.u - gi, C.u + gi, C.v - wk, C.v - gi],
    [C.u - gi, C.u + gi, C.v + gi, C.v + wk],
  ] as const;
  for (const [u0, u1, v0, v1] of strips) {
    uvSpan(b, 'paving', u0, u1, v0, v1, FLOOR - 0.2, WALK, GC_PAINT.paving);
    out.decks.push(uvDeck(u0, u1, v0, v1, WALK, false));
  }
  // The arcade: piers every 3 m round the lawn, a lintel along their tops, and the roofs.
  const step = 3;
  for (const side of ['w', 'e', 's', 'n'] as const) {
    for (let t = -gi; t <= gi + 0.01; t += step) {
      const u = side === 'w' ? C.u - gi : side === 'e' ? C.u + gi : C.u + t;
      const v = side === 's' ? C.v - gi : side === 'n' ? C.v + gi : C.v + t;
      // Gaps into the lawn in the middle of each side.
      if (Math.abs(t) < 1.6) continue;
      if (lite) ubox(b, 'stone', u, (FLOOR + pierTop) / 2, v, 0.5, pierTop - FLOOR, 0.5, GC_PAINT.stone);
      else {
        const p = at(u, 0, v);
        rod(
          b,
          'stone',
          { x: p.x, y: FLOOR, z: p.z },
          { x: p.x, y: pierTop - 0.3, z: p.z },
          0.22,
          8,
          GC_PAINT.stone,
        );
        ubox(b, 'stone', u, pierTop - 0.15, v, 0.6, 0.3, 0.6, GC_PAINT.stone);
        ubox(b, 'stone', u, FLOOR + 0.12, v, 0.6, 0.24, 0.6, GC_PAINT.rubble);
      }
      const p = at(u, 0, v);
      out.circles.push({ x: p.x, z: p.z, r: 0.32, y0: FLOOR - 0.5, y1: pierTop, height: pierTop - FLOOR });
    }
  }
  // Lintels along each side (over the piers), and the lean-to roofs from the ranges' walls.
  const lo = pierTop + 0.25;
  const hi = FLOOR + 5.6;
  const roofs = [
    { u: C.u - (gi + wk) / 2, v: C.v, su: wk - gi, sv: 2 * wk, dir: 'u' as const, sign: -1 },
    { u: C.u + (gi + wk) / 2, v: C.v, su: wk - gi, sv: 2 * wk, dir: 'u' as const, sign: 1 },
    { u: C.u, v: C.v - (gi + wk) / 2, su: 2 * gi, sv: wk - gi, dir: 'v' as const, sign: -1 },
    { u: C.u, v: C.v + (gi + wk) / 2, su: 2 * gi, sv: wk - gi, dir: 'v' as const, sign: 1 },
  ];
  for (const r of roofs) {
    const lintelU = r.dir === 'u' ? C.u + r.sign * gi : r.u;
    const lintelV = r.dir === 'v' ? C.v + r.sign * gi : r.v;
    ubox(
      b,
      'stone',
      lintelU,
      pierTop + 0.12,
      lintelV,
      r.dir === 'u' ? 0.6 : r.su + 0.6,
      0.24,
      r.dir === 'v' ? 0.6 : r.sv + 0.6,
      GC_PAINT.stone,
    );
    const width = r.dir === 'u' ? r.su : r.sv;
    const slope = Math.atan2(hi - lo, width);
    const len = Math.hypot(width, hi - lo) + 0.5;
    const pitch = r.dir === 'v' ? r.sign * slope : 0;
    const roll = r.dir === 'u' ? -r.sign * slope : 0;
    ubox(
      b,
      'paving',
      r.u,
      (lo + hi) / 2 + 0.1,
      r.v,
      r.dir === 'u' ? len : r.su + 0.4,
      0.16,
      r.dir === 'v' ? len : r.sv + 0.4,
      GC_PAINT.slate,
      0,
      pitch,
      roll,
    );
    out.cameraBoxes.push({
      ...at(r.u, 0, r.v),
      hx: (r.dir === 'u' ? width : r.su) / 2,
      hz: (r.dir === 'v' ? width : r.sv) / 2,
      rot: YAW_U,
      y0: lo - 0.1,
      y1: hi + 0.4,
    });
  }
}

/** The garth: a well in the middle of the lawn (its kerb a starfish's spot), and four paths. */
function garth(b: Buckets, out: GcOut): void {
  const p = at(C.u, 0, C.v);
  rod(
    b,
    'stone',
    { x: p.x, y: FLOOR - 0.3, z: p.z },
    { x: p.x, y: FLOOR + 0.7, z: p.z },
    1.0,
    12,
    GC_PAINT.stone,
    1.0,
    true,
  );
  ubox(b, 'stone', C.u, FLOOR + 0.72, C.v, 2.3, 0.08, 0.3, GC_PAINT.stone);
  for (const s of [-1, 1]) {
    const q = at(C.u + s * 1.05, 0, C.v);
    rod(
      b,
      'wood',
      { x: q.x, y: FLOOR + 0.6, z: q.z },
      { x: q.x, y: FLOOR + 2.2, z: q.z },
      0.06,
      5,
      GC_PAINT.timber,
    );
  }
  rod(b, 'wood', at(C.u - 1.1, FLOOR + 2.1, C.v), at(C.u + 1.1, FLOOR + 2.1, C.v), 0.06, 6, GC_PAINT.timber);
  out.circles.push({ x: p.x, z: p.z, r: 1.15, y0: FLOOR - 0.5, y1: FLOOR + 2.2, height: 2.2 });
  // Flagstone paths from the arcade's gaps to the well (just over the lawn).
  const gi = ABBEY.garth;
  for (const [du, dv] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const) {
    const u = C.u + (du * (gi + 1.4)) / 2;
    const v = C.v + (dv * (gi + 1.4)) / 2;
    ubox(b, 'paving', u, FLOOR + 0.0, v, du ? gi - 1.4 : 1.4, 0.06, dv ? gi - 1.4 : 1.4, GC_PAINT.paving);
  }
}

/** The Pattern Book's station pieces on the walks, each with its lamp on a bracket (`book:<place>`). */
function stations(b: Buckets, out: GcOut, lite: boolean): void {
  const S = CIRCUIT_SPOTS.book;
  for (const [place, spot] of Object.entries(S)) {
    // The lamp on a bracket on the nearest arcade lintel, over the station's garth side.
    const toGarthU = C.u - spot.u;
    const toGarthV = C.v - spot.v;
    const horizontal = Math.abs(toGarthU) > Math.abs(toGarthV);
    const lu = horizontal ? C.u - Math.sign(toGarthU) * ABBEY.garth : spot.u;
    const lv = horizontal ? spot.v : C.v - Math.sign(toGarthV) * ABBEY.garth;
    const p = at(lu, 0, lv);
    // Hung by the shared hanger from the lintel's underside (the piers' tops).
    hangLantern(b, out, p.x, FLOOR + 4.4, p.z, YAW_U, { lamp: spot.lamp, look: 'dark' });
    void place;
  }
  // The shelf: a tall press of pattern books against the scriptorium's wall (its label is the pack's).
  const wi = C.u - ABBEY.walk;
  bookPress(b, out, wi + 0.25, S.shelf!.v, 'v', 2.2, lite);
  // Its label on a board over the press, to the walk.
  ubox(b, 'wood', wi + 0.4, WALK + 2.38, S.shelf!.v, 0.06, 0.3, 1.7, GC_PAINT.timber);
  out.signs.push(
    signAt(wi + 0.4, WALK + 2.38, S.shelf!.v, 1, 0, { lines: ['shelfLabel'], w: 1.6, h: 0.26 }, 0.036),
  );
  // The pattern book's own case, its spine to the walk.
  ubox(b, 'wood', wi + 0.35, WALK + 0.55, S.spine!.v, 0.6, 1.1, 1.0, GC_PAINT.timber);
  ubox(b, 'wood', wi + 0.35, WALK + 1.42, S.spine!.v, 0.5, 0.64, 0.12, 0x5a2e2a);
  // The book's name up its spine, its file's on the case's front.
  out.signs.push(
    signAt(
      wi + 0.6,
      WALK + 1.42,
      S.spine!.v,
      1,
      0,
      {
        lines: ['bookSpine'],
        w: 0.6,
        h: 0.1,
        roll: Math.PI / 2,
        fill: '#5a2e2a',
        colors: ['#e8c87a'],
      },
      0.006,
    ),
    signAt(wi + 0.65, WALK + 0.86, S.spine!.v, 1, 0, { lines: ['bookFile'], w: 0.5, h: 0.16 }, 0.006),
  );
  // Its cover lies on the case beside it; once the book's copied, the new page lies open on it.
  ubox(b, 'wood', wi + 0.35, WALK + 1.115, S.spine!.v + 0.27, 0.4, 0.03, 0.4, 0x5a2e2a);
  out.signs.push(
    signAt(wi + 0.35, WALK + 1.14, S.spine!.v + 0.27, 1, 0, {
      lines: ['bookSpine', 'bookFile'],
      w: 0.36,
      h: 0.34,
      tilt: Math.PI / 2,
      look: 'cloth',
      show: 'page',
    }),
  );
  solid(out, wi + 0.35, S.spine!.v, 0.7, 1.1, WALK, WALK + 1.8, false);
  // The copy desk against the library's wall: a sloped top, the open book, ink and a quill.
  const ni = C.v + ABBEY.walk;
  desk(b, out, S.desk!.u, ni - 0.45, 0, -1);
  // The proof table: a flat table with the proof sheet.
  ubox(b, 'wood', S.proof!.u, WALK + 0.8, ni - 0.5, 1.6, 0.08, 0.8, GC_PAINT.timber);
  for (const du of [-0.7, 0.7])
    ubox(b, 'wood', S.proof!.u + du, WALK + 0.4, ni - 0.5, 0.08, 0.8, 0.7, GC_PAINT.timber);
  ubox(b, 'wood', S.proof!.u, WALK + 0.85, ni - 0.5, 0.6, 0.012, 0.42, 0xefe6d0);
  solid(out, S.proof!.u, ni - 0.5, 1.7, 0.9, WALK, WALK + 0.9, false);
  // The reading bell on a bracket from the east range's wall.
  const ei = C.u + ABBEY.walk;
  const bell = at(ei - 0.7, 0, S.bell!.v);
  rod(
    b,
    'metal',
    at(ei, WALK + 2.95, S.bell!.v),
    at(ei - 0.75, WALK + 2.95, S.bell!.v),
    0.03,
    4,
    GC_PAINT.iron,
  );
  cone(b, 'metal', bell.x, WALK + 2.45, bell.z, 0.22, 0.42, 10, GC_PAINT.bronze, 0.09);
  out.cameraBoxes.push({
    x: bell.x,
    z: bell.z,
    hx: 0.4,
    hz: 0.4,
    rot: YAW_U,
    y0: WALK + 2.3,
    y1: WALK + 3.05,
  });
  // The lectern by the east range's wall, its book open (the margin note lights at its lamp).
  const lec = at(ei - 0.9, 0, S.lectern!.v);
  rod(
    b,
    'wood',
    { x: lec.x, y: WALK, z: lec.z },
    { x: lec.x, y: WALK + 1.05, z: lec.z },
    0.07,
    6,
    GC_PAINT.timber,
  );
  ubox(b, 'wood', ei - 0.9, WALK + 1.12, S.lectern!.v, 0.5, 0.06, 0.6, GC_PAINT.timber, 0, 0, -0.45);
  ubox(b, 'wood', ei - 0.9, WALK + 1.16, S.lectern!.v, 0.42, 0.02, 0.56, 0xefe6d0, 0, 0, -0.45);
  out.circles.push({ x: lec.x, z: lec.z, r: 0.35, y0: WALK - 0.5, y1: WALK + 1.3, height: 1.3 });
}

/** A press of books against a wall (its back to the wall, its shelves along `along`). */
function bookPress(
  b: Buckets,
  out: GcOut,
  u: number,
  v: number,
  along: 'u' | 'v',
  width: number,
  lite: boolean,
): void {
  const su = along === 'u' ? width : 0.42;
  const sv = along === 'u' ? 0.42 : width;
  ubox(b, 'wood', u, WALK + 1.1, v, su, 2.2, sv, GC_PAINT.timber);
  if (!lite) {
    const colours = [0x6b2e2a, 0x2f4a3a, 0x3a4a6b, 0x7a5a2a, 0x5a3a5a];
    for (let shelf = 0; shelf < 4; shelf++)
      for (let k = 0; k < 6; k++) {
        const t = (k + 0.5) / 6 - 0.5;
        const bu = along === 'u' ? u + t * (width - 0.2) : u + 0.16;
        const bv = along === 'u' ? v + 0.16 : v + t * (width - 0.2);
        ubox(
          b,
          'cloth',
          bu,
          WALK + 0.42 + shelf * 0.5,
          bv,
          along === 'u' ? 0.26 : 0.16,
          0.36,
          along === 'u' ? 0.16 : 0.26,
          colours[(shelf * 3 + k) % colours.length]!,
        );
      }
  }
  solid(out, u, v, su + 0.1, sv + 0.1, WALK, WALK + 2.3, false);
}

/** A copy desk: a sloped top on four legs, facing (fu, fv), with the open book, an inkwell and a quill. */
function desk(b: Buckets, out: GcOut, u: number, v: number, fu: number, fv: number): void {
  const yaw = yawAlong(-fv, fu) - YAW_U;
  ubox(
    b,
    'wood',
    u,
    WALK + 0.92,
    v,
    1.3,
    0.06,
    0.7,
    GC_PAINT.timber,
    yaw,
    fv ? -fv * 0.3 : 0,
    fu ? fu * 0.3 : 0,
  );
  for (const [a, c] of [
    [-0.55, -0.28],
    [0.55, -0.28],
    [-0.55, 0.28],
    [0.55, 0.28],
  ] as const) {
    const pu = u + (fu === 0 ? a : c);
    const pv = v + (fv === 0 ? a : c);
    ubox(b, 'wood', pu, WALK + 0.44, pv, 0.07, 0.88, 0.07, GC_PAINT.timber);
  }
  ubox(b, 'wood', u, WALK + 0.98, v, 0.8, 0.015, 0.5, 0xefe6d0, yaw, fv ? -fv * 0.3 : 0, fu ? fu * 0.3 : 0);
  const ink = at(u + (fu === 0 ? 0.52 : 0), 0, v + (fv === 0 ? 0.52 : 0));
  rod(
    b,
    'metal',
    { x: ink.x, y: WALK + 0.95, z: ink.z },
    { x: ink.x, y: WALK + 1.03, z: ink.z },
    0.04,
    6,
    0x1a1a22,
  );
  rod(
    b,
    'cloth',
    { x: ink.x, y: WALK + 1.0, z: ink.z },
    { x: ink.x + 0.05, y: WALK + 1.32, z: ink.z + 0.04 },
    0.012,
    4,
    0xf2ece0,
    0.002,
  );
  solid(out, u, v, fu === 0 ? 1.4 : 0.8, fu === 0 ? 0.8 : 1.4, WALK, WALK + 1.1, false);
}

/** The chained library's bay: book presses along its back and sides, and the tools on chains. */
function library(b: Buckets, out: GcOut, lite: boolean): void {
  const bay = ABBEY.libraryBay;
  const n = C.v + ABBEY.outer;
  const ni = C.v + ABBEY.walk;
  // The bay's floor: flags 3 cm over the ground, a deck.
  uvSpan(b, 'paving', bay.u0, bay.u1, ni, n - 0.8, FLOOR - 0.2, WALK, GC_PAINT.paving);
  out.decks.push(uvDeck(bay.u0, bay.u1, ni, n - 0.8, WALK, false));
  bookPress(b, out, bay.u0 + 0.25, ni + 4.2, 'v', 4.2, lite);
  bookPress(b, out, bay.u1 - 0.25, ni + 4.2, 'v', 4.2, lite);
  bookPress(b, out, bay.u0 + 2.2, n - 1.05, 'u', 2.6, lite);
  // The tool rack on the back wall: a board, the copyists' tools on it, each on its own chain.
  const rack = { u: 24.6, v: n - 0.95 };
  ubox(b, 'wood', rack.u, WALK + 1.5, rack.v, 3.0, 1.6, 0.08, GC_PAINT.timber);
  const tools = [0xa0a0a8, 0x8a6a48, 0xa0a0a8, 0x8a6a48, 0xb0b0b8];
  for (let k = 0; k < 5; k++) {
    const tu = rack.u - 1.1 + k * 0.55;
    const top = at(tu, WALK + 2.05, rack.v - 0.08);
    const end = at(tu, WALK + 1.05, rack.v - 0.1);
    rod(b, 'metal', top, end, k % 2 ? 0.035 : 0.022, 4, tools[k]!);
    // Its chain down to a staple in the rack's foot.
    const staple = at(tu + 0.12, WALK + 0.75, rack.v - 0.08);
    rope(b, { x: end.x, y: end.y, z: end.z }, staple, 0.02, 0.012, GC_PAINT.iron, 4);
  }
  solid(out, rack.u, rack.v, 3.1, 0.4, WALK, WALK + 2.4, false);
  // A lantern hung in the bay.
  const l = at((bay.u0 + bay.u1) / 2, 0, ni + 3);
  hangLantern(b, out, l.x, FLOOR + 5.2, l.z, YAW_U);
  out.cameraBoxes.push({
    ...at((bay.u0 + bay.u1) / 2, 0, (ni + n) / 2),
    hx: (bay.u1 - bay.u0) / 2,
    hz: (n - ni) / 2,
    rot: YAW_U,
    y0: FLOOR + 5.2,
    y1: RANGE_EAVES + 3,
  });
}

/** The bell tower: a square stone shaft, string courses, an open belfry with its bell, a slate cap. */
function tower(b: Buckets, out: GcOut, lite: boolean): void {
  const t = TOWER;
  const half = t.side / 2;
  const y0 = FLOOR - 1.5;
  const [b0, b1] = t.belfry;
  ubox(b, 'stone', t.u, (y0 + b0) / 2, t.v, t.side, b0 - y0, t.side, GC_PAINT.stone);
  // Buttresses at the corners, up to the second string course.
  for (const [du, dv] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const)
    ubox(
      b,
      'stone',
      t.u + du * (half + 0.2),
      (y0 + 52) / 2,
      t.v + dv * (half + 0.2),
      1.0,
      52 - y0,
      1.0,
      GC_PAINT.rubble,
    );
  for (const y of [48, 56, b0])
    ubox(b, 'stone', t.u, y, t.v, t.side + 0.4, 0.3, t.side + 0.4, GC_PAINT.rubble);
  // The belfry: four corner piers, a floor and a cornice; the bell inside.
  ubox(b, 'stone', t.u, b0 + 0.21, t.v, t.side - 0.02, 0.4, t.side - 0.02, GC_PAINT.stone);
  for (const [du, dv] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const)
    ubox(
      b,
      'stone',
      t.u + du * (half - 1),
      (b0 + b1) / 2 + 0.2,
      t.v + dv * (half - 1),
      2,
      b1 - b0 - 0.4,
      2,
      GC_PAINT.stone,
    );
  // Mid-piers (two lancets each side) on all but Lite.
  if (!lite)
    for (const [du, dv] of [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ] as const)
      ubox(
        b,
        'stone',
        t.u + du * (half - 0.35),
        (b0 + b1) / 2 + 0.2,
        t.v + dv * (half - 0.35),
        du ? 0.7 : 0.6,
        b1 - b0 - 0.4,
        dv ? 0.7 : 0.6,
        GC_PAINT.stone,
      );
  ubox(b, 'stone', t.u, b1 + 0.3, t.v, t.side + 0.6, 0.6, t.side + 0.6, GC_PAINT.rubble);
  const c = at(t.u, 0, t.v);
  cone(b, 'metal', c.x, b0 + 2.2, c.z, 1.1, 1.6, 12, GC_PAINT.bronze, 0.45);
  rod(b, 'wood', at(t.u - 2, b0 + 3.9, t.v), at(t.u + 2, b0 + 3.9, t.v), 0.12, 6, GC_PAINT.timber);
  // The belfry's lamp (lit at night), hung from the cornice in a corner, clear of the bell.
  const lamp = at(t.u + half - 1.4, 0, t.v + half - 1.4);
  hangLantern(b, out, lamp.x, b1, lamp.z, YAW_U);
  // The cap: a slate pyramid.
  cone(
    b,
    'paving',
    c.x,
    b1 + 0.6,
    c.z,
    half * Math.SQRT2 + 0.35,
    t.top - b1 - 0.6,
    4,
    GC_PAINT.slate,
    0,
    (g) => g.rotateY(Math.PI / 4 + YAW_U),
  );
  rod(
    b,
    'metal',
    { x: c.x, y: t.top - 0.2, z: c.z },
    { x: c.x, y: t.top + 1.6, z: c.z },
    0.05,
    4,
    GC_PAINT.iron,
  );
  // Slit windows down the shaft (dark glass, lit at night).
  for (const y of [44, 52, 60])
    for (const [du, dv] of [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ] as const)
      windowPane(b, t.u + du * (half + 0.01), t.v + dv * (half + 0.01), y, du, dv, 0.35, 1.6);
  solid(out, t.u, t.v, t.side + 1.4, t.side + 1.4, y0, t.top);
  // Swifts' perches on the belfry's ledges.
  for (const [du, dv] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ] as const)
    out.perches.push(at(t.u + du * (half + 0.15), b0 + 0.45, t.v + dv * (half + 0.15)));
  // The bell's rope down the east face through a slot to its sally on the terrace.
  const r0 = at(t.u + half + 0.12, TERRACE.y + 6, t.v);
  const r1 = at(t.u + half + 0.25, TERRACE.y + 1.1, t.v);
  ubox(b, 'stone', t.u + half + 0.06, TERRACE.y + 6.1, t.v, 0.14, 0.5, 0.5, GC_PAINT.rubble);
  rod(b, 'rope', r0, r1, 0.025, 5, 0xc8b48a);
  rod(b, 'cloth', r1, { x: r1.x, y: r1.y + 0.5, z: r1.z }, 0.06, 6, 0x9c3a4a);
}

/** The terrace east of the tower: paving on its plinth, a bench, parapets where it stands proud. */
function terrace(b: Buckets, out: GcOut): void {
  const u0 = TERRACE.u - 4;
  const u1 = TERRACE.u + 12;
  const v0 = TERRACE.v - 4;
  const v1 = TERRACE.v + 12;
  const y = TERRACE.y + 0.03;
  uvSpan(b, 'paving', u0, u1, v0, v1, TERRACE.y - 0.3, y, GC_PAINT.paving);
  out.decks.push(uvDeck(u0, u1, v0, v1, y, false));
  // A stone bench by the tower, looking east over the ridge.
  const bench = at(TERRACE.u - 1, 0, TERRACE.v - 3);
  seatBlock(b, bench.x, bench.z, yawAlong(1, 0), y, y + 0.45);
  // Parapets on the edges where the ground falls away (none where the stair comes in, at the north).
  const drop = (u: number, v: number) => y - ground(u, v) > 0.9;
  for (const [a, e, outU, outV] of [
    [[u0, v0], [u1, v0], 0, -2],
    [[u1, v0], [u1, v1 - 4], 2, 0],
  ] as const) {
    const mu = (a[0] + e[0]) / 2 + outU;
    const mv = (a[1] + e[1]) / 2 + outV;
    if (drop(mu, mv)) lowWall(b, out, a, e, 1.05, 0.5, GC_PAINT.stone);
  }
  // The stair from the guildhall yard down to the terrace: two short railed flights.
  flight(b, out, [80, 134, 42.03], [79, 131, 41.03], 2.4);
  flight(b, out, [78.6, 129, 41.03], [77.6, 126, 40.03], 2.4);
  out.decks.push(lineDeck([79, 131, 41.03], [78.6, 129, 41.03], 1.2, false));
}

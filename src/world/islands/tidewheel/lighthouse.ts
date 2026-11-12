import { Matrix4, Vector3 } from 'three/webgpu';
import { cone, rod, type Buckets } from '../../village/pieces';
import { uvDeck } from '../../village/walk-decks';
import {
  at,
  B,
  bell,
  hangLantern,
  rail,
  SIGN_CREAM,
  signAt,
  solid,
  TW_PAINT,
  ubox,
  yawAlong,
  type TwOut,
} from './build';
import { LIGHTHOUSE as L, TERRACE } from './layout';

/**
 * The Clockwork Lighthouse's shape (m over its base): the stone base's top, the open gear cage, the
 * clock drum, the gallery under the lamp room, and the radii of each.
 */
export const LIGHT_SHAPE = {
  foot: L.r,
  neck: 4.5,
  cage: 4.1,
  drum: 4.3,
  face: 3.3,
  lamp: 2.9,
  /** Heights (world y). */
  baseTop: 58,
  cageTop: 61.6,
  drumTop: 66.8,
  gallery: 68,
  lampTop: 73.2,
} as const;

/**
 * The two clock faces: on the tower's bay side (toward the breach and the quay) and on its north
 * side (toward the Clock Court and the town). Each one's outward frame direction.
 */
export const CLOCK_FACES = [
  { fu: -1, fv: 0 },
  { fu: 0, fv: 1 },
] as const;

/** The last lever's plinth on the terrace (frame), and the striking bell's place under the bay face. */
export const LAST_LEVER = { u: TERRACE.u + 2.4, v: TERRACE.v + 5.2 } as const;
export const STRIKE_BELL = { u: L.u - LIGHT_SHAPE.cage - 0.9, v: L.v, y: LIGHT_SHAPE.cageTop - 0.5 } as const;

/**
 * Builds the spur's set pieces (spec T5): the terrace (paving, a brass rail over the bay, the last
 * lever's plinth, the Seal's banners) and the Clockwork Lighthouse: a tapered stone base with a door,
 * an open brass cage for its gears (the gears turn: the world's own meshes), the clock drum with a
 * face to the bay and one to the town (their hands and rings are the world's), the striking bell and
 * its two bronze figures, the gallery, the lamp room (its lamp is `light:lamp`), a copper cap and a
 * gear for a vane. Into the kit's buckets.
 */
export function* buildLighthouse(b: Buckets, out: TwOut, lite: boolean): Generator<void, void, void> {
  terrace(b, out, lite);
  yield;
  tower(b, out);
}

function terrace(b: Buckets, out: TwOut, lite: boolean): void {
  const y = TERRACE.y + 0.03;
  const c = at(TERRACE.u, 0, TERRACE.v);
  // Round paving with a brass ring let into it.
  rod(
    b,
    'paving',
    { x: c.x, y: y - 0.2, z: c.z },
    { x: c.x, y, z: c.z },
    TERRACE.r,
    28,
    TW_PAINT.paving,
    TERRACE.r,
  );
  rod(
    b,
    'metal',
    { x: c.x, y: y - 0.02, z: c.z },
    { x: c.x, y: y + 0.012, z: c.z },
    5.2,
    28,
    TW_PAINT.brass,
    5.2,
    true,
  );
  // (A square deck inside the round paving: the walk's height on the terrace.)
  out.decks.push(
    uvDeck(
      TERRACE.u - TERRACE.r * 0.72,
      TERRACE.u + TERRACE.r * 0.72,
      TERRACE.v - TERRACE.r * 0.72,
      TERRACE.v + TERRACE.r * 0.72,
      y,
      false,
    ),
  );
  // The rail round its bay side (the west and south), open to the walk on the north.
  const pts: [number, number][] = [];
  for (let k = 0; k <= 9; k++) {
    const a = Math.PI * (0.62 + (1.02 * k) / 9);
    pts.push([TERRACE.u + Math.cos(a) * (TERRACE.r - 0.3), TERRACE.v + Math.sin(a) * (TERRACE.r - 0.3)]);
  }
  for (let k = 0; k + 1 < pts.length; k++)
    rail(b, out, [pts[k]![0], pts[k]![1], y], [pts[k + 1]![0], pts[k + 1]![1], y], TW_PAINT.brass);
  // The last lever's plinth: stone, with a brass quadrant (the lever is the world's own mesh).
  const lp = at(LAST_LEVER.u, 0, LAST_LEVER.v);
  ubox(b, 'stone', LAST_LEVER.u, y + 0.25, LAST_LEVER.v, 1.4, 0.5, 0.9, TW_PAINT.soot);
  ubox(b, 'metal', LAST_LEVER.u, y + 0.75, LAST_LEVER.v, 0.1, 0.5, 0.7, TW_PAINT.brass);
  out.circles.push({ x: lp.x, z: lp.z, r: 0.85, y0: y - 0.4, y1: y + 2.2, height: 2.2 });
  ubox(b, 'metal', LAST_LEVER.u, y + 0.28, LAST_LEVER.v - 0.47, 1.2, 0.34, 0.04, TW_PAINT.brass);
  out.signs.push(
    signAt(
      LAST_LEVER.u,
      y + 0.28,
      LAST_LEVER.v - 0.47,
      0,
      -1,
      { lines: ['lastLeverPlate'], w: 1.1, h: 0.26, fill: '#e0b040', colors: ['#2a2623'] },
      0.03,
    ),
  );
  if (!lite) {
    // Two lanterns on posts at the walk's head.
    for (const s of [-1, 1]) {
      const p = at(TERRACE.u + s * 3, 0, TERRACE.v + TERRACE.r - 0.8);
      rod(b, 'metal', { x: p.x, y: y - 0.1, z: p.z }, { x: p.x, y: y + 3, z: p.z }, 0.05, 5, TW_PAINT.iron);
      hangLantern(b, out, p.x, y + 3, p.z + 0.3, 0);
      out.circles.push({ x: p.x, z: p.z, r: 0.16, y0: y - 0.4, y1: y + 3, height: 3 });
    }
  }
}

function tower(b: Buckets, out: TwOut): void {
  const S = LIGHT_SHAPE;
  const c = at(L.u, 0, L.v);
  const ring = (
    key: 'stone' | 'plaster' | 'metal',
    y0: number,
    y1: number,
    r0: number,
    r1: number,
    colour: number,
    seg = 20,
  ) => rod(b, key, { x: c.x, y: y0, z: c.z }, { x: c.x, y: y1, z: c.z }, r0, seg, colour, r1);
  // The base: dark stone, tapering, on a wider foot, with two pale bands.
  ring('stone', L.base - 1.5, L.base + 0.9, S.foot + 0.7, S.foot + 0.5, TW_PAINT.rubble);
  ring('stone', L.base + 0.9, S.baseTop, S.foot, S.neck, TW_PAINT.basalt);
  ring('stone', L.base + 4.4, L.base + 4.9, S.foot - 0.28, S.foot - 0.32, TW_PAINT.ash);
  ring('stone', S.baseTop - 0.9, S.baseTop, S.neck + 0.25, S.neck + 0.25, TW_PAINT.ash);
  solid(out, L.u, L.v, S.foot * 2 + 1, S.foot * 2 + 1, L.base - 1.5, L.top);
  // Its door, toward the terrace, with a lantern over it.
  ubox(b, 'wood', L.u - S.foot + 0.02, L.base + 1.2, L.v, 0.14, 2.3, 1.2, TW_PAINT.ochre);
  ubox(b, 'stone', L.u - S.foot - 0.02, L.base + 2.5, L.v, 0.2, 0.3, 1.7, TW_PAINT.ash);
  const dl = at(L.u - S.foot - 0.6, L.base + 3.3, L.v);
  rod(b, 'metal', at(L.u - S.foot + 0.1, L.base + 3.3, L.v), dl, 0.025, 4, TW_PAINT.iron);
  hangLantern(b, out, dl.x, dl.y, dl.z, B.YAW_U + Math.PI);
  // Three small lit windows up the bay side.
  for (const [k, dy] of [3.4, 6.2, 9].entries()) {
    const r = S.foot - ((S.foot - S.neck) * (dy - 0.9)) / (S.baseTop - L.base - 0.9);
    const a = k * 0.9 - 0.9;
    const w = at(L.u - Math.cos(a) * (r + 0.02), L.base + dy, L.v + Math.sin(a) * (r + 0.02));
    const g = rod(b, 'glow', w, { x: w.x, y: w.y + 0.9, z: w.z }, 0.26, 6, 0xffffff, 0.26);
    const col = g.getAttribute('color');
    for (let i = 0; i < col.count; i++) col.setXYZ(i, 1.5, 1.0, 0.4);
  }
  // The gear cage: eight brass posts between two rings, open to the weather.
  ring('metal', S.baseTop, S.baseTop + 0.25, S.cage + 0.5, S.cage + 0.5, TW_PAINT.brass);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
    const x = c.x + Math.cos(a) * S.cage;
    const z = c.z + Math.sin(a) * S.cage;
    rod(b, 'metal', { x, y: S.baseTop + 0.2, z }, { x, y: S.cageTop, z }, 0.11, 6, TW_PAINT.brass);
  }
  // The cage's axle: an iron shaft up its middle.
  ring('metal', S.baseTop, S.cageTop, 0.22, 0.22, TW_PAINT.iron, 8);
  // The clock drum: enamel white with brass bands, and the two faces.
  ring('metal', S.cageTop, S.cageTop + 0.3, S.drum + 0.35, S.drum + 0.35, TW_PAINT.brass);
  ring('plaster', S.cageTop + 0.3, S.drumTop, S.drum, S.drum, TW_PAINT.basalt);
  ring('metal', S.drumTop, S.drumTop + 0.25, S.drum + 0.35, S.drum + 0.35, TW_PAINT.brass);
  const faceY = L.clock;
  for (const f of CLOCK_FACES) {
    const yaw = yawAlong(f.fu, f.fv);
    const fc = at(L.u + f.fu * (S.drum - 0.12), faceY, L.v + f.fv * (S.drum - 0.12));
    const out1 = at(L.u + f.fu * (S.drum + 0.14), faceY, L.v + f.fv * (S.drum + 0.14));
    // The dial: a brass rim and an enamel face (a short cylinder on its side, its axis along the face's normal).
    rod(b, 'metal', fc, out1, S.face + 0.22, 28, TW_PAINT.brass, S.face + 0.22);
    const proud = at(L.u + f.fu * (S.drum + 0.19), faceY, L.v + f.fv * (S.drum + 0.19));
    rod(b, 'plaster', out1, proud, S.face, 28, TW_PAINT.enamel, S.face);
    // Twelve hour marks.
    for (let h = 0; h < 12; h++) {
      const an = (h / 12) * Math.PI * 2;
      const rr = S.face - 0.42;
      // Across the face: the frame direction at right angles to its normal, and up.
      const mu = L.u + f.fu * (S.drum + 0.22) - f.fv * Math.sin(an) * rr;
      const mv = L.v + f.fv * (S.drum + 0.22) + f.fu * Math.sin(an) * rr;
      const m = at(mu, faceY + Math.cos(an) * rr, mv);
      const long = h % 3 === 0;
      const g = ubox(
        b,
        'metal',
        mu,
        m.y,
        mv,
        0.05,
        long ? 0.62 : 0.36,
        long ? 0.16 : 0.1,
        TW_PAINT.ink,
        yaw - B.YAW_U,
      );
      g.translate(-m.x, -m.y, -m.z);
      // Turn each mark to point at the middle (about the face's normal).
      const n = at(f.fu, 0, f.fv);
      const o = at(0, 0, 0);
      const ax = { x: n.x - o.x, z: n.z - o.z };
      const len = Math.hypot(ax.x, ax.z) || 1;
      g.applyMatrix4(rotationAbout(ax.x / len, 0, ax.z / len, -an));
      g.translate(m.x, m.y, m.z);
    }
  }
  // The striking bell under the bay face, and its two bronze figures on the cage's ledge.
  const sb = at(STRIKE_BELL.u, STRIKE_BELL.y, STRIKE_BELL.v);
  rod(
    b,
    'metal',
    at(L.u - S.cage, STRIKE_BELL.y + 0.1, L.v),
    { x: sb.x, y: sb.y + 0.1, z: sb.z },
    0.05,
    5,
    TW_PAINT.iron,
  );
  bell(b, sb.x, sb.y, sb.z, 0.55, TW_PAINT.brass);
  for (const s of [-1, 1]) {
    const fp = at(STRIKE_BELL.u + 0.1, S.baseTop + 0.25, STRIKE_BELL.v + s * 1.35);
    // A figure: a robe, shoulders and a head (its hammer arm is the world's own mesh).
    rod(b, 'metal', fp, { x: fp.x, y: fp.y + 1.1, z: fp.z }, 0.26, 8, TW_PAINT.bronze, 0.16);
    rod(
      b,
      'metal',
      { x: fp.x, y: fp.y + 1.1, z: fp.z },
      { x: fp.x, y: fp.y + 1.32, z: fp.z },
      0.2,
      8,
      TW_PAINT.bronze,
      0.12,
    );
    rod(
      b,
      'metal',
      { x: fp.x, y: fp.y + 1.32, z: fp.z },
      { x: fp.x, y: fp.y + 1.62, z: fp.z },
      0.13,
      8,
      TW_PAINT.bronze,
      0.1,
    );
  }
  ubox(b, 'metal', STRIKE_BELL.u + 0.1, S.baseTop + 0.16, STRIKE_BELL.v, 1.1, 0.14, 3.6, TW_PAINT.brass);
  // The gallery: a deck round the lamp room with a brass rail.
  ring('stone', S.drumTop + 0.25, S.gallery, S.drum + 0.3, S.drum + 1.2, TW_PAINT.basalt);
  ring('metal', S.gallery, S.gallery + 0.12, S.drum + 1.25, S.drum + 1.25, TW_PAINT.brass);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const x = c.x + Math.cos(a) * (S.drum + 1.1);
    const z = c.z + Math.sin(a) * (S.drum + 1.1);
    rod(b, 'metal', { x, y: S.gallery + 0.1, z }, { x, y: S.gallery + 1.1, z }, 0.035, 5, TW_PAINT.brass);
  }
  rod(
    b,
    'metal',
    { x: c.x, y: S.gallery + 1.08, z: c.z },
    { x: c.x, y: S.gallery + 1.14, z: c.z },
    S.drum + 1.1,
    24,
    TW_PAINT.brass,
    S.drum + 1.1,
    true,
  );
  // The lamp room: brass mullions round the lamp's glass.
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const x = c.x + Math.cos(a) * (S.lamp + 0.1);
    const z = c.z + Math.sin(a) * (S.lamp + 0.1);
    rod(b, 'metal', { x, y: S.gallery, z }, { x, y: S.lampTop, z }, 0.07, 5, TW_PAINT.brass);
  }
  const lamp = ring('metal', S.gallery + 0.4, S.lampTop - 0.3, S.lamp, S.lamp, 0xffffff, 12);
  b.metal.splice(b.metal.indexOf(lamp), 1);
  out.lamps.push({ key: 'light:lamp', geo: lamp });
  ring('metal', S.lampTop - 0.1, S.lampTop + 0.3, S.lamp + 0.5, S.lamp + 0.5, TW_PAINT.brass);
  // The cap: green copper, a brass ball, and the vane's mast (its gear is the world's: it turns).
  cone(b, 'metal', c.x, S.lampTop + 0.3, c.z, S.lamp + 0.9, L.cap - S.lampTop + 1.6, 12, TW_PAINT.copper);
  ring('metal', L.cap + 1.7, L.top - 1.6, 0.06, 0.04, TW_PAINT.brass, 6);
  out.perches.push({ x: c.x, y: L.cap + 1.9, z: c.z });
  // The Seal's banners: two cloths from the gallery's rail, either side of the bay face.
  for (const s of [-1, 1]) {
    const bu = L.u - (S.drum + 1.25) * Math.cos(s * 0.7);
    const bv = L.v + (S.drum + 1.25) * Math.sin(s * 0.7);
    out.signs.push(
      signAt(
        bu,
        S.gallery - 0.1,
        bv,
        -Math.cos(s * 0.7),
        Math.sin(s * 0.7),
        {
          lines: ['sealBanner'],
          w: 1.6,
          h: 5.6,
          look: 'cloth',
          fill: s < 0 ? '#b5532c' : '#d89a3a',
          colors: SIGN_CREAM,
          show: 'sealed',
          hang: true,
          wrap: true,
          size: 0.2,
          pixels: 320,
        },
        0.25,
      ),
    );
  }
}

/** A rotation by `angle` about the unit axis (x, y, z), as a matrix for `applyMatrix4`. */
function rotationAbout(x: number, y: number, z: number, angle: number): Matrix4 {
  return new Matrix4().makeRotationAxis(new Vector3(x, y, z), angle);
}

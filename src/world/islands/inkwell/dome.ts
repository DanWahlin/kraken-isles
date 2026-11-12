import { cone, rod, stoneUv, type Buckets } from '../../village/pieces';
import { uvDeck } from '../../village/walk-decks';
import {
  at,
  dome,
  door,
  flowerTub,
  ground,
  IW_PAINT,
  SIGN_CREAM,
  signAt,
  solid,
  ubox,
  windowPane,
  type IwOut,
} from './build';
import { DOME, TERRACE } from './layout';

/**
 * Builds the Dome head's set pieces (spec I5): the terrace (paving and the Seal's plinth) and the Surveyor's Dome: a round white tower on a chalk foot,
 * banded in blue, with a lamp gallery (its lamp is `dome:lamp`), a cobalt dome and the mast for the
 * brass quill (the quill is the world's mesh: it turns with the wind). Into the kit's buckets.
 */
export function* buildDome(b: Buckets, out: IwOut, lite: boolean): Generator<void, void, void> {
  terrace(b, out, lite);
  yield;
  tower(b, out);
}

/** Where the Seal's plinth stands on the terrace (frame). */
export const SEAL_PLINTH = { u: TERRACE.u + 4.5, v: TERRACE.v + 3.5 } as const;

/** The tower's shaft radius at its foot and under the gallery, and the gallery's and the lamp room's. */
export const DOME_SHAPE = {
  foot: DOME.r,
  neck: DOME.r - 1.3,
  gallery: DOME.r + 0.3,
  lamp: DOME.r - 2.6,
} as const;

function terrace(b: Buckets, out: IwOut, lite: boolean): void {
  const t = TERRACE;
  const y = t.y + 0.03;
  const c = at(t.u, 0, t.v);
  // (Its cobbles at the paving's own scale: a cylinder's own UVs stretch one tile over the whole top.)
  stoneUv(
    rod(b, 'paving', { x: c.x, y: t.y - 0.25, z: c.z }, { x: c.x, y, z: c.z }, t.r, 24, IW_PAINT.paving, t.r),
    2.2,
  );
  out.decks.push(uvDeck(t.u - t.r * 0.7, t.u + t.r * 0.7, t.v - t.r * 0.7, t.v + t.r * 0.7, y, false));
  // The Seal's plinth: a chalk block with a brass top.
  const s = SEAL_PLINTH;
  ubox(b, 'stone', s.u, y + 0.5, s.v, 0.9, 1.0, 0.9, IW_PAINT.chalk);
  ubox(b, 'metal', s.u, y + 1.03, s.v, 0.7, 0.06, 0.7, IW_PAINT.brass);
  solid(out, s.u, s.v, 1.0, 1.0, y, y + 1.1, false);
  if (!lite) {
    flowerTub(b, out, t.u - 3, t.v + 7.4, y);
    flowerTub(b, out, t.u + 1.5, t.v - 8, y, IW_PAINT.saffron);
  }
}

function tower(b: Buckets, out: IwOut): void {
  const d = DOME;
  const S = DOME_SHAPE;
  const y = d.base;
  const c = at(d.u, 0, d.v);
  const foot = ground(d.u, d.v) - 0.8;
  const ring = (
    key: 'stone' | 'plaster' | 'metal',
    y0: number,
    y1: number,
    r0: number,
    r1: number,
    colour: number,
    seg = 24,
  ) => rod(b, key, { x: c.x, y: y0, z: c.z }, { x: c.x, y: y1, z: c.z }, r0, seg, colour, r1);
  // A chalk foot, the white shaft (it tapers), and three blue bands.
  ring('stone', foot, y + 1.4, S.foot + 0.5, S.foot + 0.3, IW_PAINT.chalk);
  const neckY = d.gallery - 0.6;
  ring('plaster', y + 1.4, neckY, S.foot, S.neck, IW_PAINT.whitewash);
  for (const t of [0.3, 0.6, 0.9]) {
    const by = y + 1.4 + (neckY - y - 1.4) * t;
    const r = S.foot + (S.neck - S.foot) * t + 0.06;
    ring('plaster', by - 0.25, by + 0.25, r + 0.015, r, IW_PAINT.cobalt);
  }
  // The gallery: a stone floor wider than the shaft, a brass rail on posts.
  ring('stone', neckY, d.gallery, S.neck + 0.2, S.gallery, IW_PAINT.paleStone);
  ring('stone', d.gallery, d.gallery + 0.2, S.gallery, S.gallery, IW_PAINT.paleStone);
  const posts = 12;
  for (let k = 0; k < posts; k++) {
    const an = (k / posts) * Math.PI * 2;
    const p = { x: c.x + Math.cos(an) * (S.gallery - 0.2), z: c.z + Math.sin(an) * (S.gallery - 0.2) };
    rod(
      b,
      'metal',
      { x: p.x, y: d.gallery + 0.2, z: p.z },
      { x: p.x, y: d.gallery + 1.3, z: p.z },
      0.04,
      5,
      IW_PAINT.brass,
    );
    const an2 = ((k + 1) / posts) * Math.PI * 2;
    const q = { x: c.x + Math.cos(an2) * (S.gallery - 0.2), z: c.z + Math.sin(an2) * (S.gallery - 0.2) };
    rod(
      b,
      'metal',
      { x: p.x, y: d.gallery + 1.28, z: p.z },
      { x: q.x, y: d.gallery + 1.28, z: q.z },
      0.025,
      4,
      IW_PAINT.brass,
    );
    if (k % 3 === 0) out.perches.push({ x: p.x, y: d.gallery + 1.36, z: p.z });
  }
  // The lamp room: eight white piers round the lamp, a blue ring over them.
  const ly = d.gallery + 0.2;
  const lampTop = d.top - S.neck * 0.92;
  for (let k = 0; k < 8; k++) {
    const an = (k / 8) * Math.PI * 2 + Math.PI / 8;
    const p = { x: c.x + Math.cos(an) * (S.neck - 0.25), z: c.z + Math.sin(an) * (S.neck - 0.25) };
    rod(b, 'plaster', { x: p.x, y: ly, z: p.z }, { x: p.x, y: lampTop, z: p.z }, 0.3, 6, IW_PAINT.whitewash);
  }
  const lamp = rod(
    b,
    'glow',
    { x: c.x, y: ly + 0.5, z: c.z },
    { x: c.x, y: lampTop - 0.4, z: c.z },
    S.lamp,
    12,
    0xffffff,
    S.lamp,
  );
  b.glow.splice(b.glow.indexOf(lamp), 1);
  out.lamps.push({ key: 'dome:lamp', geo: lamp });
  ring('stone', lampTop, lampTop + 0.5, S.neck + 0.25, S.neck + 0.25, IW_PAINT.paleStone);
  // The dome, a brass finial, and the quill's mast.
  dome(
    b,
    'plaster',
    c.x,
    lampTop + 0.5,
    c.z,
    S.neck + 0.1,
    IW_PAINT.cobalt,
    (d.top - lampTop - 0.5) / (S.neck + 0.1),
    24,
  );
  cone(b, 'metal', c.x, d.top - 0.2, c.z, 0.5, 1.0, 10, IW_PAINT.brass, 0.12);
  rod(
    b,
    'metal',
    { x: c.x, y: d.top + 0.6, z: c.z },
    { x: c.x, y: d.quill - 4.2, z: c.z },
    0.07,
    6,
    IW_PAINT.brass,
  );
  out.perches.push({ x: c.x, y: d.top + 0.1, z: c.z });
  // A blue door at its foot on the terrace's side (toward −u), with a chalk step and its name over it.
  const du = TERRACE.u - d.u;
  const dv = TERRACE.v - d.v;
  const dl = Math.hypot(du, dv);
  const fu = Math.round(du / dl);
  const fv = Math.abs(fu) === 1 ? 0 : Math.sign(dv);
  door(
    b,
    d.u + fu * (S.foot - 0.12),
    d.v + fv * (S.foot - 0.12),
    y + 0.05,
    fu,
    fv,
    1.5,
    2.6,
    IW_PAINT.cobalt,
  );
  ubox(
    b,
    'stone',
    d.u + fu * (S.foot + 0.7),
    y - 0.1,
    d.v + fv * (S.foot + 0.7),
    fu ? 1.6 : 3,
    0.3,
    fu ? 3 : 1.6,
    IW_PAINT.paleStone,
  );
  out.signs.push(
    signAt(
      d.u + fu * (S.foot - 0.3),
      y + 3.6,
      d.v + fv * (S.foot - 0.3),
      fu,
      fv,
      { lines: ['domeSign'], w: 3.2, h: 0.5, fill: '#2c5c9a', colors: SIGN_CREAM },
      0.42,
    ),
  );
  // The Seal's banners either side of the door: they unroll when the Trial is passed (`sealed`).
  for (const [side, fill] of [
    [-1, '#c2337a'],
    [1, '#2c5c9a'],
  ] as const) {
    const bu = d.u + fu * (S.foot - 0.5) - fv * side * 3.4;
    const bv = d.v + fv * (S.foot - 0.5) + fu * side * 3.4;
    out.signs.push(
      signAt(
        bu,
        y + 9.2,
        bv,
        fu,
        fv,
        {
          lines: ['sealBanner'],
          w: 1.6,
          h: 5.6,
          look: 'cloth',
          fill,
          colors: SIGN_CREAM,
          show: 'sealed',
          hang: true,
          wrap: true,
          size: 0.2,
          pixels: 320,
        },
        0.9,
      ),
    );
    const rp = at(bu + fu * 0.9, y + 9.25, bv + fv * 0.9);
    rod(
      b,
      'wood',
      at(bu + fu * 0.9 - fv * 0.95, y + 9.25, bv + fv * 0.9 + fu * 0.95),
      at(bu + fu * 0.9 + fv * 0.95, y + 9.25, bv + fv * 0.9 - fu * 0.95),
      0.04,
      5,
      IW_PAINT.darkTimber,
    );
    rod(b, 'metal', at(bu, y + 9.25, bv), rp, 0.02, 4, IW_PAINT.iron);
  }
  // Windows up the shaft, on the terrace's side and round it.
  for (const [k, wy] of [8, 13.5].entries()) {
    const r = S.foot + (S.neck - S.foot) * ((wy - 1.4) / (neckY - y - 1.4)) + 0.02;
    for (const [wu, wv] of k === 0
      ? [
          [fu, fv],
          [-fv, fu],
        ]
      : [
          [fu, fv],
          [fv, -fu],
        ])
      windowPane(b, d.u + wu * r, d.v + wv * r, y + wy, wu, wv, 0.7, 1.4);
  }
  solid(out, d.u, d.v, S.foot * 2 + 0.6, S.foot * 2 + 0.6, foot, d.top);
}

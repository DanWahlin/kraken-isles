import { cone, rod, type Buckets } from '../../village/pieces';
import { uvDeck } from '../../village/walk-decks';
import { at, door, ground, pennants, solid, SS_PAINT, ubox, uvSpan, windowPane, type SsOut } from './build';
import { LIBRARY_ROCK, NEEDLE, SPIRE, TERRACE } from './layout';

/**
 * Builds the High Mesa's set pieces (spec S4): the Sundial Terrace (paving, the gnomon and its hour
 * stones, the Seal's plinth), the Sunspire (a tapering adobe tower on a red stone plinth, banded,
 * with a gallery, a lantern room and a pyramid cap; its great mirror on the west face is the lamp
 * `spire:mirror`), the Needle's relay mirror (`needle:mirror`) and Library Rock's white light
 * (`library:lamp`). Into the kit's buckets, a part a step.
 */
export function* buildSpire(b: Buckets, out: SsOut, lite: boolean): Generator<void, void, void> {
  terrace(b, out);
  yield;
  tower(b, out, lite);
  yield;
  relay(b, out);
  libraryLight(b, out);
}

/** Where the Seal's plinth stands on the terrace (frame). */
export const SEAL_PLINTH = { u: TERRACE.u + 4.5, v: TERRACE.v + 3.5 } as const;

function terrace(b: Buckets, out: SsOut): void {
  const t = TERRACE;
  const y = t.y + 0.03;
  const c = at(t.u, 0, t.v);
  rod(b, 'paving', { x: c.x, y: t.y - 0.25, z: c.z }, { x: c.x, y, z: c.z }, t.r, 20, SS_PAINT.paving, t.r);
  out.decks.push(uvDeck(t.u - t.r * 0.7, t.u + t.r * 0.7, t.v - t.r * 0.7, t.v + t.r * 0.7, y, false));
  // The sundial: a stone gnomon leaning north in the terrace's middle, twelve hour stones round it.
  ubox(b, 'stone', t.u, y + 0.75, t.v, 0.16, 1.5, 1.9, SS_PAINT.redStone, 0.6, 0, 0);
  ubox(b, 'stone', t.u, y + 0.12, t.v, 1.2, 0.24, 2.2, SS_PAINT.paleStone, 0.6);
  out.circles.push({ x: c.x, z: c.z, r: 1.2, y0: t.y - 0.3, y1: y + 1.6, height: 1.6 });
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const p = at(t.u + Math.cos(a) * (t.r - 2.2), 0, t.v + Math.sin(a) * (t.r - 2.2));
    rod(
      b,
      'stone',
      { x: p.x, y: y - 0.05, z: p.z },
      { x: p.x, y: y + 0.07, z: p.z },
      0.34,
      8,
      k % 3 ? SS_PAINT.paleStone : SS_PAINT.redStone,
      0.34,
    );
  }
  // The Seal's plinth: a red stone block with a brass top.
  const s = SEAL_PLINTH;
  ubox(b, 'stone', s.u, y + 0.5, s.v, 0.9, 1.0, 0.9, SS_PAINT.redStone);
  ubox(b, 'metal', s.u, y + 1.03, s.v, 0.7, 0.06, 0.7, SS_PAINT.brass);
  solid(out, s.u, s.v, 1.0, 1.0, y, y + 1.1, false);
}

/** The tiers of the Sunspire's shaft: each its foot, its top and its side (it tapers). */
const TIERS = [
  { y0: 0, y1: 3, side: 11.2, stone: true },
  { y0: 3, y1: 13, side: 10 },
  { y0: 13, y1: 23, side: 8.8 },
  { y0: 23, y1: 31.5, side: 7.6 },
  { y0: 31.5, y1: 38, side: 6.6 },
] as const;

function tower(b: Buckets, out: SsOut, lite: boolean): void {
  const s = SPIRE;
  const y = s.base;
  const foot = ground(s.u, s.v) - 0.8;
  for (const t of TIERS) {
    const y0 = t.y0 === 0 ? foot : y + t.y0;
    const key = 'stone' in t ? 'stone' : 'plaster';
    const colour = 'stone' in t ? SS_PAINT.redStone : SS_PAINT.adobe;
    uvSpan(
      b,
      key,
      s.u - t.side / 2,
      s.u + t.side / 2,
      s.v - t.side / 2,
      s.v + t.side / 2,
      y0,
      y + t.y1,
      colour,
    );
    // A red stone band at each tier's top, a hand proud of the wall.
    if (!('stone' in t))
      uvSpan(
        b,
        'stone',
        s.u - t.side / 2 - 0.12,
        s.u + t.side / 2 + 0.12,
        s.v - t.side / 2 - 0.12,
        s.v + t.side / 2 + 0.12,
        y + t.y1 - 0.5,
        y + t.y1,
        SS_PAINT.redStone,
      );
  }
  // The gallery: a stone floor a metre wider than the shaft's top, with a rail of brass posts.
  const gy = y + 38;
  const g = 8.8;
  uvSpan(b, 'stone', s.u - g / 2, s.u + g / 2, s.v - g / 2, s.v + g / 2, gy, gy + 0.3, SS_PAINT.paleStone);
  for (const [du, dv] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ] as const) {
    const p = at(s.u + (du * (g - 0.3)) / 2, 0, s.v + (dv * (g - 0.3)) / 2);
    rod(
      b,
      'metal',
      { x: p.x, y: gy + 0.3, z: p.z },
      { x: p.x, y: gy + 1.4, z: p.z },
      0.05,
      5,
      SS_PAINT.brass,
    );
    out.perches.push({ x: p.x, y: gy + 1.45, z: p.z });
  }
  for (const [a, e] of [
    [
      [-1, -1],
      [1, -1],
    ],
    [
      [1, -1],
      [1, 1],
    ],
    [
      [1, 1],
      [-1, 1],
    ],
    [
      [-1, 1],
      [-1, -1],
    ],
  ] as const) {
    const pa = at(s.u + (a[0] * (g - 0.3)) / 2, gy + 1.35, s.v + (a[1] * (g - 0.3)) / 2);
    const pe = at(s.u + (e[0] * (g - 0.3)) / 2, gy + 1.35, s.v + (e[1] * (g - 0.3)) / 2);
    rod(b, 'metal', pa, pe, 0.03, 4, SS_PAINT.brass);
  }
  // The lantern room: four corner piers and a red pyramid cap.
  const ly = gy + 0.3;
  const l = 5;
  for (const du of [-1, 1])
    for (const dv of [-1, 1])
      ubox(
        b,
        'plaster',
        s.u + (du * (l - 0.8)) / 2,
        ly + 2.6,
        s.v + (dv * (l - 0.8)) / 2,
        0.8,
        5.2,
        0.8,
        SS_PAINT.whitewash,
      );
  uvSpan(
    b,
    'stone',
    s.u - l / 2 - 0.3,
    s.u + l / 2 + 0.3,
    s.v - l / 2 - 0.3,
    s.v + l / 2 + 0.3,
    ly + 5.2,
    ly + 5.7,
    SS_PAINT.redStone,
  );
  const c = at(s.u, 0, s.v);
  cone(b, 'roofTile', c.x, ly + 5.7, c.z, 4.3, s.top - (ly + 5.7), 4, SS_PAINT.madder, 0, (geo) => {
    geo.rotateY(Math.PI / 4 + Math.atan2(-(at(1, 0, 0).z - at(0, 0, 0).z), at(1, 0, 0).x - at(0, 0, 0).x));
  });
  out.perches.push({ x: c.x, y: s.top + 0.05, z: c.z });
  // The great mirror on the west face (toward the court): a brass rim and the mirror's face (a lamp).
  const mu = s.u - TIERS[4].side / 2;
  const rim0 = at(mu - 0.18, s.mirror, s.v);
  const rim1 = at(mu - 0.02, s.mirror, s.v);
  rod(b, 'metal', rim1, rim0, 2.75, 20, SS_PAINT.brass, 2.75);
  const face0 = at(mu - 0.26, s.mirror, s.v);
  const face = rod(b, 'glow', rim0, face0, 2.5, 20, 0xffffff, 2.5);
  // The mirror's face is one of the lamps that change: take it out of the glow bucket.
  b.glow.splice(b.glow.indexOf(face), 1);
  out.lamps.push({ key: 'spire:mirror', geo: face });
  // A door at its foot on the terrace's side, windows up the shaft, and pennants from the gallery.
  door(b, s.u - TIERS[1].side / 2 - 0.62, s.v, y + 0.05, -1, 0, 1.5, 2.6, SS_PAINT.cobalt);
  ubox(b, 'stone', s.u - TIERS[0].side / 2 - 0.8, y - 0.1, s.v, 1.6, 0.3, 3, SS_PAINT.paleStone);
  for (const [t, wy] of [
    [1, 8],
    [2, 18],
    [3, 27.5],
  ] as const) {
    const half = TIERS[t].side / 2 + 0.01;
    for (const [fu, fv] of [
      [-1, 0],
      [0, -1],
      [0, 1],
    ] as const)
      windowPane(b, s.u + fu * half, s.v + fv * half, y + wy, fu, fv, 0.7, 1.4);
  }
  if (!lite) {
    pennants(b, [s.u - g / 2, s.v - g / 2, gy + 1.3], [TERRACE.u + 2, TERRACE.v - 7, y + 3.2], 2.2);
    pennants(b, [s.u - g / 2, s.v + g / 2, gy + 1.3], [TERRACE.u + 3, TERRACE.v + 8, y + 3.2], 2.2);
    for (const [pu, pv] of [
      [TERRACE.u + 2, TERRACE.v - 7],
      [TERRACE.u + 3, TERRACE.v + 8],
    ] as const) {
      const p = at(pu, y, pv);
      rod(b, 'wood', p, { x: p.x, y: y + 3.25, z: p.z }, 0.06, 5, SS_PAINT.timber);
      out.circles.push({ x: p.x, z: p.z, r: 0.15, y0: y - 0.3, y1: y + 3.3, height: 3.3 });
    }
  }
  solid(out, s.u, s.v, TIERS[0].side + 0.2, TIERS[0].side + 0.2, foot, s.top);
}

/** The Needle's relay: a short mast on the butte's top with a mirror that lights when the beam passes. */
function relay(b: Buckets, out: SsOut): void {
  const n = NEEDLE;
  const y = ground(n.u, n.v);
  const p = at(n.u, 0, n.v);
  rod(
    b,
    'stone',
    { x: p.x, y: y - 0.3, z: p.z },
    { x: p.x, y: y + 0.6, z: p.z },
    1.1,
    8,
    SS_PAINT.redStone,
    0.9,
  );
  rod(b, 'wood', { x: p.x, y: y + 0.6, z: p.z }, { x: p.x, y: y + 4.6, z: p.z }, 0.1, 6, SS_PAINT.darkTimber);
  const a = at(n.u, y + 5.2, n.v - 0.06);
  const e = at(n.u, y + 5.2, n.v + 0.06);
  const face = rod(b, 'glow', a, e, 0.9, 14, 0xffffff, 0.9);
  b.glow.splice(b.glow.indexOf(face), 1);
  out.lamps.push({ key: 'needle:mirror', geo: face });
  rod(b, 'metal', at(n.u, y + 5.2, n.v - 0.09), at(n.u, y + 5.2, n.v - 0.06), 1.0, 14, SS_PAINT.brass, 1.0);
  out.perches.push({ x: p.x, y: y + 6.2, z: p.z });
}

/** Library Rock's light: a white round tower with a cobalt dome and a lamp under it. */
function libraryLight(b: Buckets, out: SsOut): void {
  const r = LIBRARY_ROCK;
  const y = ground(r.u, r.v);
  const p = at(r.u, 0, r.v);
  rod(
    b,
    'plaster',
    { x: p.x, y: y - 0.5, z: p.z },
    { x: p.x, y: y + 8, z: p.z },
    2.4,
    14,
    SS_PAINT.whitewash,
    1.9,
  );
  rod(
    b,
    'stone',
    { x: p.x, y: y + 8, z: p.z },
    { x: p.x, y: y + 8.3, z: p.z },
    2.5,
    14,
    SS_PAINT.paleStone,
    2.5,
  );
  const lamp = rod(
    b,
    'glow',
    { x: p.x, y: y + 8.3, z: p.z },
    { x: p.x, y: y + 10, z: p.z },
    1.3,
    10,
    0xffffff,
    1.3,
  );
  b.glow.splice(b.glow.indexOf(lamp), 1);
  out.lamps.push({ key: 'library:lamp', geo: lamp });
  cone(b, 'plaster', p.x, y + 10, p.z, 1.9, 1.7, 14, SS_PAINT.cobalt);
  out.perches.push({ x: p.x, y: y + 11.8, z: p.z });
}

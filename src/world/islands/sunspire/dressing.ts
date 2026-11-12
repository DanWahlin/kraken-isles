import { box, rod, type Buckets } from '../../village/pieces';
import {
  at,
  ground,
  groundSpan,
  SS_PAINT,
  yawAlong,
  type SsOut,
  barrel,
  basket,
  cart,
  crate,
  jar,
} from './build';
import { HOUSES } from './town';

/**
 * The town's dressing (spec S12): what makes the adobe blocks a lived-in port. At every house a pair
 * of clay jars by its door, a string of red peppers on its wall, and at some a plastered bench or a
 * carpet hung to air; on the quay sacks, barrels, crates and a hand cart; in the lanes shade cloths on
 * poles, a beehive oven and baskets. Every piece stands on the ground where it is, clear of the doors
 * and the lanes, and the big ones have colliders. Off on Lite. Into the kit's buckets.
 */

const TERRACOTTA = 0xb86a44;
const GLAZES = [TERRACOTTA, 0xc98352, SS_PAINT.cobalt, SS_PAINT.whitewash, 0x8a5a3a] as const;
const SACK = 0xcdb894;

/** A pile of sacks at frame (u, v), `n` of them, their long side along `yaw`. */
function sacks(b: Buckets, out: SsOut, u: number, v: number, n: number, yaw: number): void {
  const p = at(u, 0, v);
  const y = ground(u, v);
  for (let k = 0; k < n; k++) {
    const row = k < 2 ? 0 : 1;
    const side = row === 0 ? (k === 0 ? -0.36 : 0.36) : 0;
    box(
      b,
      'cloth',
      p.x + Math.cos(yaw) * side,
      y + 0.14 + row * 0.27,
      p.z - Math.sin(yaw) * side,
      0.68,
      0.28,
      0.46,
      yaw + (k % 2 ? 0.12 : -0.08),
      k % 2 ? SACK : 0xbfa67c,
    );
  }
  out.circles.push({ x: p.x, z: p.z, r: 0.62, y0: y - 0.3, y1: y + 0.6, height: 0.6 });
}

/** A beehive oven (horno) at frame (u, v), its mouth toward (du, dv), on a low adobe step. */
function oven(b: Buckets, out: SsOut, u: number, v: number, du: number, dv: number): void {
  const p = at(u, 0, v);
  const y = ground(u, v) - 0.05;
  const up = (y0: number, y1: number, r0: number, r1: number, colour: number) =>
    rod(b, 'plaster', { x: p.x, y: y + y0, z: p.z }, { x: p.x, y: y + y1, z: p.z }, r0, 12, colour, r1);
  up(0, 0.3, 1.05, 1.05, SS_PAINT.redStone);
  up(0.3, 0.75, 0.9, 0.84, SS_PAINT.adobe);
  up(0.75, 1.15, 0.84, 0.58, SS_PAINT.adobe);
  up(1.15, 1.4, 0.58, 0.18, SS_PAINT.adobe);
  const yaw = yawAlong(du, dv);
  const m = at(u + du * 0.84, 0, v + dv * 0.84);
  box(b, 'wood', m.x, y + 0.62, m.z, 0.14, 0.44, 0.46, yaw, 0x1c1410);
  out.circles.push({ x: p.x, z: p.z, r: 1.1, y0: y - 0.3, y1: y + 1.4, height: 1.4 });
}

/**
 * A shade cloth over a lane from (u0, v0) to (u1, v1), `w` wide, on a pole at each corner: two
 * strips of cloth side by side in the row's colours, each sagging a little to its middle.
 */
function shade(
  b: Buckets,
  out: SsOut,
  u0: number,
  v0: number,
  u1: number,
  v1: number,
  w: number,
  colours: readonly [number, number],
): void {
  const len = Math.hypot(u1 - u0, v1 - v0);
  const nu = -(v1 - v0) / len;
  const nv = (u1 - u0) / len;
  const top = Math.max(ground(u0, v0), ground(u1, v1)) + 3.5;
  const yaw = yawAlong(u1 - u0, v1 - v0);
  for (const [k, colour] of colours.entries()) {
    const off = (k - 0.5) * (w / 2);
    for (const half of [0, 1]) {
      const t = 0.25 + half * 0.5;
      const m = at(u0 + (u1 - u0) * t + nu * off, 0, v0 + (v1 - v0) * t + nv * off);
      // Each half tilts down to the middle (a sag of 0.3 m).
      box(
        b,
        'cloth',
        m.x,
        top - 0.15 - k * 0.02,
        m.z,
        len / 2 - 0.03,
        0.03,
        w / 2 - 0.06,
        yaw,
        colour,
        0,
        (half ? 1 : -1) * Math.atan2(0.3, len / 2),
      );
    }
  }
  for (const [u, v] of [
    [u0 + nu * (w / 2), v0 + nv * (w / 2)],
    [u0 - nu * (w / 2), v0 - nv * (w / 2)],
    [u1 + nu * (w / 2), v1 + nv * (w / 2)],
    [u1 - nu * (w / 2), v1 - nv * (w / 2)],
  ] as const) {
    const p = at(u, 0, v);
    const g = ground(u, v);
    rod(
      b,
      'wood',
      { x: p.x, y: g - 0.3, z: p.z },
      { x: p.x, y: top + 0.08, z: p.z },
      0.06,
      6,
      SS_PAINT.timber,
    );
    out.circles.push({ x: p.x, z: p.z, r: 0.14, y0: g - 0.4, y1: top, height: top - g });
  }
  const mid = at((u0 + u1) / 2, 0, (v0 + v1) / 2);
  out.cameraBoxes.push({
    x: mid.x,
    z: mid.z,
    hx: len / 2,
    hz: w / 2,
    rot: yaw,
    y0: top - 0.6,
    y1: top + 0.2,
  });
}

/** The quay's cargo, the lanes' shade and oven, the square's baskets (frame). */
const SACKS: readonly (readonly [number, number, number, number])[] = [
  [-176, 20.6, 3, 0.4],
  [-224, 21.4, 3, -0.3],
  [-166, 21.2, 2, 1.2],
];
const BARRELS: readonly (readonly [number, number])[] = [
  [-178.2, 21.2],
  [-179, 20.4],
  [-222, 22.6],
  [-158.4, 19.8],
  [-147.4, 41.2],
];
const CRATES: readonly (readonly [number, number, number, number, number?])[] = [
  [-170.6, 20.8, 0.8, 0.2],
  [-169.7, 21.5, 0.7, -0.4],
  [-170.3, 21, 0.6, 0.5, 0.8],
  [-226.4, 22.4, 0.8, 0.1],
  [-133.4, 46.6, 0.7, 0.3],
];
const BASKETS: readonly (readonly [number, number, number, number])[] = [
  [-112.4, 58.6, 0.3, 0xb8443a],
  [-111.6, 59.3, 0.26, 0xe0a030],
  [-91.6, 59.2, 0.3, 0x6a8a4a],
  [-116.6, 41.2, 0.28, 0xd9b48a],
  [-94.4, 40.8, 0.3, 0x34507e],
  [-95.2, 41.5, 0.24, 0xe0a030],
  [-183, 20.4, 0.3, 0x6a8a4a],
];

export function dressTown(b: Buckets, out: SsOut): void {
  for (const [i, h] of HOUSES.entries()) {
    if (!h.lite && i % 5 === 4) continue;
    // A point `t` m along its front (as `adobeHouse` counts it) and `off` m out from the wall.
    const alongU = h.fu === 0;
    const front = (t: number, off: number): [number, number] =>
      alongU ? [h.u + t, h.v + h.fv * (h.d / 2 + off)] : [h.u + h.fu * (h.d / 2 + off), h.v + t];
    const yaw = alongU ? yawAlong(1, 0) : yawAlong(0, 1);
    const su = alongU ? h.w : h.d;
    const sv = alongU ? h.d : h.w;
    const floor = groundSpan(h.u, h.v, su / 2 + 0.3, sv / 2 + 0.3).hi + 0.12;
    const wide = h.w >= 7;
    const side = i % 2 ? 1 : -1;
    // Two jars at the front's far end from the door (a wide house's door is left of its middle).
    const end = wide ? -h.w / 2 + 0.55 : side * (h.w / 2 - 0.5);
    const inner = wide ? end + 0.62 : end - side * 0.62;
    jar(b, out, ...front(end, 0.5), 0.78 + (i % 3) * 0.12, GLAZES[i % GLAZES.length]!);
    jar(b, out, ...front(inner, 0.72), 0.52 + (i % 2) * 0.1, GLAZES[(i + 2) % GLAZES.length]!);
    // A string of peppers on the wall between the door and the next window.
    const [pu, pv] = front(wide ? -0.1 : side * 0.98, 0.06);
    const pp = at(pu, 0, pv);
    box(b, 'cloth', pp.x, floor + 1.5, pp.z, 0.16, 0.62, 0.09, yaw, SS_PAINT.madder);
    box(b, 'cloth', pp.x, floor + 1.84, pp.z, 0.05, 0.08, 0.04, yaw, SS_PAINT.timber);
    // A plastered bench under the windows of every third front, a carpet aired over it.
    if (i % 3 === 1) {
      const [bu, bv] = front(wide ? h.w * 0.23 : -side * 1.8, 0.36);
      const bp = at(bu, 0, bv);
      const by = ground(bu, bv);
      box(b, 'plaster', bp.x, by + 0.2, bp.z, 1.7, 0.5, 0.5, yaw, h.tint);
      box(
        b,
        'cloth',
        bp.x,
        by + 0.465,
        bp.z,
        0.9,
        0.03,
        0.56,
        yaw,
        i % 2 ? SS_PAINT.indigo : SS_PAINT.madder,
      );
      out.colliders.push({
        x: bp.x,
        z: bp.z,
        hx: 0.85,
        hz: 0.25,
        rot: yaw,
        y0: by - 0.4,
        y1: by + 0.46,
        height: 0.46,
      });
    }
  }
  for (const [u, v, n, turn] of SACKS) sacks(b, out, u, v, n, yawAlong(1, 0) + turn);
  for (const [u, v] of BARRELS) barrel(b, out, u, v);
  for (const [u, v, s, turn, lift] of CRATES) crate(b, out, u, v, s, turn, lift);
  for (const [u, v, r, goods] of BASKETS) basket(b, out, u, v, r, goods);
  cart(b, out, -162.5, 22.4, 1, 0.3);
  cart(b, out, -126.5, 37.2, -0.4, 1);
  oven(b, out, -146.5, 71.5, 0, -1);
  oven(b, out, -205.5, 53.5, 1, 0);
  // Shade over the lane where it climbs from the quay, and over the square's west entrance.
  shade(b, out, -168, 31.1, -156, 34.4, 5.4, [SS_PAINT.saffron, SS_PAINT.canvas]);
  shade(b, out, -131, 42.3, -122.5, 45.2, 5.2, [SS_PAINT.madder, SS_PAINT.canvas]);
}

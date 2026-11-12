import { SphereGeometry } from 'three/webgpu';
import { paint } from '../../village/kit';
import { box, type Buckets } from '../../village/pieces';
import {
  at,
  cubeHouse,
  dome,
  ground,
  IW_PAINT,
  ubox,
  yawAlong,
  type IwOut,
  barrel,
  basket,
  cart,
  crate,
  jar,
} from './build';
import { HILL } from './layout';
import { HOUSES } from './town';

/**
 * The town's dressing (spec I13): what makes the white blocks a lived-in port. At a house with no
 * flower tub a glazed jar by its door, and at every third a plastered bench with a blue cushion; on
 * the quay barrels, fish crates, baskets and a hand cart. Every piece stands on the ground where it
 * is, clear of the doors and the lanes, and the big ones have colliders. Off on Lite. Into the kit's
 * buckets.
 */

const TERRACOTTA = 0xb86a44;
const GLAZES = [TERRACOTTA, 0xc98352, IW_PAINT.cobalt, IW_PAINT.whitewash, 0x8a5a3a] as const;

/** Barrels on the quay and by the taverna (frame u, v). */
const BARRELS: readonly (readonly [number, number])[] = [
  [-226, 23.6],
  [-224.6, 24.5],
  [-168.6, 23.2],
  [-160.4, 34.6],
];

/** Fish crates on the quay (frame u, v, size, turn, lift). */
const CRATES: readonly (readonly [number, number, number, number, number?])[] = [
  [-176, 23.4, 0.8, 0.2],
  [-175, 24.3, 0.7, -0.3],
  [-175.6, 23.8, 0.6, 0.5, 0.75],
  [-232, 20.5, 0.8, 0.1],
];

/** Baskets (frame u, v, radius, what's in them). */
const BASKETS: readonly (readonly [number, number, number, number])[] = [
  [-178, 22.2, 0.36, 0xb8c4c8],
  [-170.6, 24.6, 0.32, 0xe6b84a],
  [-116.5, 56.6, 0.34, IW_PAINT.whitewash],
  [-104.5, 66.4, 0.3, IW_PAINT.sky],
];

/** A fishing boat hauled up and turned over on the sand at frame (u, v): a white hull with a painted strake. */
function boat(b: Buckets, out: IwOut, u: number, v: number, du: number, dv: number, strake: number): void {
  const p = at(u, 0, v);
  const y = ground(u, v) - 0.05;
  const yaw = yawAlong(du, dv);
  for (const [k, colour] of [
    [1, IW_PAINT.whitewash],
    [1.03, strake],
  ] as const) {
    const g = new SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    // The strake: a wider, lower band under the hull's white.
    g.scale(2.3 * k, k === 1 ? 0.62 : 0.2, 0.78 * k);
    g.rotateY(yaw);
    g.translate(p.x, y, p.z);
    paint(g, colour);
    b.plaster.push(g);
  }
  out.colliders.push({ x: p.x, z: p.z, hx: 2.2, hz: 0.75, rot: yaw, y0: y - 0.4, y1: y + 0.6, height: 0.6 });
}

/**
 * The chapel on Olive Hill: a small white room with a blue dome and a bell arch, alone on the hill's
 * top (the skyline from the valley, the cove and the Kite Walk).
 */
export function chapel(b: Buckets, out: IwOut): void {
  const { roof } = cubeHouse(b, out, {
    u: HILL.u,
    v: HILL.v,
    fu: -1,
    fv: 0,
    w: 6,
    d: 7,
    storeys: 1,
    tint: IW_PAINT.whitewash,
    trim: IW_PAINT.cobalt,
    dome: true,
    lite: true,
  });
  // The bell arch over its door: two piers, a lintel and a brass bell.
  const fu = HILL.u - 3.3;
  for (const s of [-1, 1])
    ubox(b, 'plaster', fu, roof + 0.95, HILL.v + s * 0.75, 0.5, 1.9, 0.4, IW_PAINT.whitewash);
  ubox(b, 'plaster', fu, roof + 2.05, HILL.v, 0.5, 0.36, 1.9, IW_PAINT.whitewash);
  const bell = at(fu, roof + 1.25, HILL.v);
  dome(b, 'metal', bell.x, bell.y, bell.z, 0.32, IW_PAINT.brass, 1.2, 8);
  out.perches.push(at(fu, roof + 2.3, HILL.v));
}

/** Dresses the town: the houses' fronts, the quay's cargo, the baskets on the square. */
export function dressTown(b: Buckets, out: IwOut): void {
  for (const [i, h] of HOUSES.entries()) {
    if (!h.lite && i % 5 === 4) continue;
    // A point `t` m along its front (as `cubeHouse` counts it) and `off` m out from the wall.
    const alongU = h.fu === 0;
    const front = (t: number, off: number): [number, number] =>
      alongU ? [h.u + t, h.v + h.fv * (h.d / 2 + off)] : [h.u + h.fu * (h.d / 2 + off), h.v + t];
    const yaw = alongU ? yawAlong(1, 0) : yawAlong(0, 1);
    const wide = h.w >= 7;
    const side = i % 2 ? 1 : -1;
    // A jar at the front's far end from the door (a wide house's door is left of its middle).
    if (!h.tub) {
      const end = wide ? -h.w / 2 + 0.55 : side * (h.w / 2 - 0.5);
      jar(b, out, ...front(end, 0.5), 0.7 + (i % 3) * 0.12, GLAZES[i % GLAZES.length]!);
    }
    // A plastered bench under the windows of every third front, with a blue cushion.
    if (i % 3 === 1) {
      const [bu, bv] = front(wide ? h.w * 0.23 : -side * 1.8, 0.36);
      const bp = at(bu, 0, bv);
      const by = ground(bu, bv);
      box(b, 'plaster', bp.x, by + 0.2, bp.z, 1.7, 0.5, 0.5, yaw, h.tint);
      box(b, 'cloth', bp.x, by + 0.465, bp.z, 0.9, 0.03, 0.56, yaw, i % 2 ? IW_PAINT.cobalt : IW_PAINT.sky);
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
  for (const [u, v] of BARRELS) barrel(b, out, u, v);
  for (const [u, v, s, turn, lift] of CRATES) crate(b, out, u, v, s, turn, lift);
  for (const [u, v, r, goods] of BASKETS) basket(b, out, u, v, r, goods);
  cart(b, out, -166.5, 22.4, 1, 0.3);
  // Two boats turned over on the cove's beach.
  boat(b, out, -150, -91.5, 0.9, -0.4, IW_PAINT.cobalt);
  boat(b, out, -137, -79, 0.7, -0.7, IW_PAINT.madder);
}

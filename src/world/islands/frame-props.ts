import { box, rod, type Buckets } from '../village/pieces';
import { uvDeck } from '../village/walk-decks';
import type { StationSpot } from './anchor-kit';
import type { FrameBuilder, IslandOut } from './frame-build';

/**
 * The props every frame island's port shares, built in the island's frame with its own paints:
 * awnings and pennant lines for its houses and lanes, and the quay's jars, baskets, barrels, crates
 * and hand cart. An island makes its set once in its `build.ts` (`frameProps`) beside its frame
 * builder; what only it has (an oven, a hauled-up boat) stays in its own `dressing.ts`. Every piece
 * goes into the village kit's material buckets, stands on the ground where it is, and the ones a
 * walker would bump have colliders.
 */

/** The colours the props read from an island's palette. */
export interface PropPaint {
  paving: number;
  timber: number;
  darkTimber: number;
  iron: number;
  canvas: number;
  reed: number;
}

/** The sacking on the hand cart. */
const SACK = 0xcdb894;

/** The island's props: `cloths` are its pennants' colours, in the order a line uses them. */
export function frameProps<S extends string>(
  {
    at,
    ground,
    yawAlong,
    ubox,
    lampPost,
  }: Pick<FrameBuilder<S>, 'at' | 'ground' | 'yawAlong' | 'ubox' | 'lampPost'>,
  paints: PropPaint,
  cloths: readonly number[],
) {
  /**
   * An awning: a striped cloth from a wall (`fu`, `fv` point away from it) out and down to two poles,
   * `w` wide and `reach` m deep, its wall edge at `y`. The middle of its wall edge is (u, v) less half
   * its reach.
   */
  function awning(
    b: Buckets,
    u: number,
    v: number,
    y: number,
    fu: number,
    fv: number,
    w: number,
    reach: number,
    colour: number,
  ): void {
    const yaw = yawAlong(-fv, fu);
    const drop = 0.5;
    const pitch = Math.atan2(drop, reach);
    const stripes = Math.max(3, Math.round(w / 0.55));
    for (let k = 0; k < stripes; k++) {
      const t = -w / 2 + ((k + 0.5) * w) / stripes;
      const su = u - fv * t;
      const sv = v + fu * t;
      const p = at(su, y - drop / 2, sv);
      box(
        b,
        'cloth',
        p.x,
        p.y,
        p.z,
        w / stripes + 0.005,
        0.03,
        Math.hypot(reach, drop),
        yaw,
        k % 2 ? paints.canvas : colour,
        pitch,
      );
    }
    for (const side of [-1, 1]) {
      const pu = u - fv * side * (w / 2 - 0.1) + fu * (reach / 2 - 0.1);
      const pv = v + fu * side * (w / 2 - 0.1) + fv * (reach / 2 - 0.1);
      const g = ground(pu, pv);
      const foot = at(pu, g - 0.2, pv);
      rod(b, 'wood', foot, { x: foot.x, y: y - drop + 0.02, z: foot.z }, 0.05, 5, paints.timber);
    }
  }

  /** A line of pennants from a to b (frame u, v, y each), sagging `sag`, a flag every 0.9 m. */
  function pennants(
    b: Buckets,
    a: readonly [number, number, number],
    e: readonly [number, number, number],
    sag = 0.5,
  ): void {
    const len = Math.hypot(e[0] - a[0], e[1] - a[1]);
    const n = Math.max(2, Math.round(len / 0.9));
    const yaw = yawAlong(e[0] - a[0], e[1] - a[1]);
    let prev = at(a[0], a[2], a[1]);
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      const p = at(
        a[0] + (e[0] - a[0]) * t,
        a[2] + (e[2] - a[2]) * t - sag * 4 * t * (1 - t),
        a[1] + (e[1] - a[1]) * t,
      );
      rod(b, 'rope', prev, p, 0.01, 4, paints.timber, 0.01, true);
      if (k < n) box(b, 'cloth', p.x, p.y - 0.2, p.z, 0.34, 0.4, 0.015, yaw, cloths[k % cloths.length]!);
      prev = p;
    }
  }

  /** A clay jar on the ground at frame (u, v): foot, belly, shoulder, neck and lip, `h` tall. */
  function jar(b: Buckets, out: IslandOut<S>, u: number, v: number, h: number, colour: number): void {
    const p = at(u, 0, v);
    const y = ground(u, v) - 0.04;
    const R = h * 0.36;
    const ring = (t0: number, t1: number, r0: number, r1: number) =>
      rod(
        b,
        'plaster',
        { x: p.x, y: y + h * t0, z: p.z },
        { x: p.x, y: y + h * t1, z: p.z },
        R * r0,
        9,
        colour,
        R * r1,
      );
    ring(0, 0.36, 0.56, 1);
    ring(0.36, 0.76, 1, 0.74);
    ring(0.76, 0.92, 0.74, 0.4);
    ring(0.92, 1, 0.4, 0.52);
    out.circles.push({ x: p.x, z: p.z, r: R + 0.06, y0: y - 0.3, y1: y + h, height: h });
  }

  /** A lidded basket of goods at frame (u, v). */
  function basket(b: Buckets, out: IslandOut<S>, u: number, v: number, r: number, goods: number): void {
    const p = at(u, 0, v);
    const y = ground(u, v) - 0.03;
    rod(b, 'thatch', { x: p.x, y, z: p.z }, { x: p.x, y: y + 0.42, z: p.z }, r * 0.8, 9, paints.reed, r);
    rod(
      b,
      'cloth',
      { x: p.x, y: y + 0.42, z: p.z },
      { x: p.x, y: y + 0.52, z: p.z },
      r * 0.94,
      9,
      goods,
      r * 0.5,
    );
    out.circles.push({ x: p.x, z: p.z, r: r + 0.05, y0: y - 0.3, y1: y + 0.55, height: 0.55 });
  }

  /** A barrel standing at frame (u, v), with two bands. */
  function barrel(b: Buckets, out: IslandOut<S>, u: number, v: number): void {
    const p = at(u, 0, v);
    const y = ground(u, v);
    rod(b, 'wood', { x: p.x, y, z: p.z }, { x: p.x, y: y + 0.45, z: p.z }, 0.3, 10, paints.timber, 0.36);
    rod(
      b,
      'wood',
      { x: p.x, y: y + 0.45, z: p.z },
      { x: p.x, y: y + 0.9, z: p.z },
      0.36,
      10,
      paints.timber,
      0.3,
    );
    for (const t of [0.2, 0.7])
      rod(
        b,
        'metal',
        { x: p.x, y: y + t, z: p.z },
        { x: p.x, y: y + t + 0.05, z: p.z },
        0.365,
        10,
        paints.iron,
      );
    out.circles.push({ x: p.x, z: p.z, r: 0.4, y0: y - 0.3, y1: y + 0.9, height: 0.9 });
  }

  /** A crate at frame (u, v), `s` on a side, turned `turn`. */
  function crate(
    b: Buckets,
    out: IslandOut<S>,
    u: number,
    v: number,
    s: number,
    turn: number,
    lift = 0,
  ): void {
    const p = at(u, 0, v);
    const y = ground(u, v) + lift;
    const yaw = yawAlong(1, 0) + turn;
    box(b, 'wood', p.x, y + s / 2, p.z, s, s, s, yaw, 0x8a6a48);
    box(b, 'wood', p.x, y + s - 0.04, p.z, s + 0.04, 0.06, s + 0.04, yaw, paints.timber);
    box(b, 'wood', p.x, y + 0.04, p.z, s + 0.04, 0.06, s + 0.04, yaw, paints.timber);
    if (!lift) out.circles.push({ x: p.x, z: p.z, r: s * 0.72, y0: y - 0.3, y1: y + s, height: s });
  }

  /** A two-wheeled hand cart at frame (u, v), its handles toward frame direction (du, dv). */
  function cart(b: Buckets, out: IslandOut<S>, u: number, v: number, du: number, dv: number): void {
    const p = at(u, 0, v);
    const y = ground(u, v);
    const yaw = yawAlong(du, dv);
    const fx = Math.cos(yaw);
    const fz = -Math.sin(yaw);
    const sx = Math.sin(yaw);
    const sz = Math.cos(yaw);
    box(b, 'wood', p.x, y + 0.66, p.z, 1.7, 0.08, 0.96, yaw, paints.timber);
    for (const s of [-1, 1]) {
      box(b, 'wood', p.x + sx * s * 0.47, y + 0.82, p.z + sz * s * 0.47, 1.7, 0.26, 0.05, yaw, 0x8a6a48);
      // A wheel: a short fat cylinder on the axle, a hub in a darker timber.
      const a = { x: p.x + sx * s * 0.54, y: y + 0.44, z: p.z + sz * s * 0.54 };
      const e = { x: p.x + sx * s * 0.62, y: y + 0.44, z: p.z + sz * s * 0.62 };
      rod(b, 'wood', a, e, 0.44, 14, 0x8a6a48);
      rod(
        b,
        'wood',
        e,
        { x: e.x + sx * s * 0.05, y: e.y, z: e.z + sz * s * 0.05 },
        0.1,
        8,
        paints.darkTimber,
      );
      // Its handle, from the bed down to a rest on the ground.
      rod(
        b,
        'wood',
        { x: p.x + fx * 0.8 + sx * s * 0.4, y: y + 0.66, z: p.z + fz * 0.8 + sz * s * 0.4 },
        { x: p.x + fx * 1.9 + sx * s * 0.4, y: y + 0.06, z: p.z + fz * 1.9 + sz * s * 0.4 },
        0.035,
        5,
        paints.darkTimber,
      );
    }
    // Its load: two sacks and a jar's worth of melons.
    box(b, 'cloth', p.x - fx * 0.3, y + 0.84, p.z - fz * 0.3, 0.7, 0.28, 0.5, yaw + 0.2, SACK);
    box(b, 'cloth', p.x + fx * 0.35, y + 0.84, p.z + fz * 0.35, 0.6, 0.26, 0.5, yaw - 0.15, 0xbfa67c);
    out.circles.push({ x: p.x, z: p.z, r: 0.95, y0: y - 0.3, y1: y + 1.0, height: 1.0 });
  }

  /** A paved place: one slab 3 cm over its pad, with a walk deck on it. Returns the floor's height. */
  function pave(
    b: Buckets,
    out: IslandOut<S>,
    c: { u: number; v: number; halfU: number; halfV: number; y: number },
  ): number {
    ubox(b, 'paving', c.u, c.y - 0.07, c.v, c.halfU * 2, 0.2, c.halfV * 2, paints.paving);
    out.decks.push(uvDeck(c.u - c.halfU, c.u + c.halfU, c.v - c.halfV, c.v + c.halfV, c.y + 0.03, false));
    return c.y + 0.03;
  }

  /**
   * The circuits' stations' lamps (`<circuit>:<place>`, dark until the puzzle lights them): a post at
   * each, `side` m to one side of the station (its left for the places in `onLeft`) and `ahead` m
   * past it, clear of where the player stands and of what the station looks at, its arm toward that.
   * The camera's behind you to your right, so a lamp on the right sits at the shot's edge.
   */
  function stationLamps(
    b: Buckets,
    out: IslandOut<S>,
    spots: Readonly<Record<string, Readonly<Record<string, StationSpot>>>>,
    onLeft: ReadonlySet<string>,
    side = 2.4,
    ahead = 1.7,
  ): void {
    for (const [kind, places] of Object.entries(spots))
      for (const [place, s] of Object.entries(places)) {
        const du = s.look.u - s.u;
        const dv = s.look.v - s.v;
        const len = Math.hypot(du, dv) || 1;
        const off = onLeft.has(place) ? side : -side;
        const lu = s.u + (du / len) * ahead - (dv / len) * off;
        const lv = s.v + (dv / len) * ahead + (du / len) * off;
        lampPost(b, out, lu, lv, yawAlong(dv / len, -du / len), { lamp: `${kind}:${place}`, look: 'dark' });
      }
  }

  return { awning, pennants, jar, basket, barrel, crate, cart, pave, stationLamps };
}

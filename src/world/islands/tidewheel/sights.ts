import { cone, rod, type Buckets } from '../../village/pieces';
import { at, ground, TW_PAINT, uvSpan, type TwOut } from './build';
import { FUMAROLES, ROCK_LIGHT, SPRINGS, WHEEL } from './layout';

/** The Tide Wheel's width (m, along v) and its two piers' middles either side of it (frame v). */
export const WHEEL_SHAPE = { width: 4, piers: [WHEEL.v - 3.4, WHEEL.v + 3.4] } as const;

/**
 * Builds the island's far sights (spec T6, T15): the Tide Wheel's two stone piers on the breach's
 * north jaw with its axle's bearings (the wheel turns: the world's own mesh), the rock light on its
 * skerry outside the ring (its lamp is `rock:lamp`), the hot springs' three stepped pools and the
 * fumaroles' vents on the wall (their steam is `mist.ts`). Into the kit's buckets.
 */
export function* buildSights(b: Buckets, out: TwOut): Generator<void, void, void> {
  wheelPiers(b, out);
  rockLight(b, out);
  yield;
  springs(b, out);
}

function wheelPiers(b: Buckets, out: TwOut): void {
  for (const v of WHEEL_SHAPE.piers) {
    const bed = Math.min(ground(WHEEL.u - 2.5, v), ground(WHEEL.u + 2.5, v), ground(WHEEL.u, v)) - 1.5;
    uvSpan(b, 'stone', WHEEL.u - 2.6, WHEEL.u + 2.6, v - 1, v + 1, bed, WHEEL.y - 0.7, TW_PAINT.basalt);
    uvSpan(
      b,
      'stone',
      WHEEL.u - 2.9,
      WHEEL.u + 2.9,
      v - 1.2,
      v + 1.2,
      WHEEL.y - 0.7,
      WHEEL.y - 0.3,
      TW_PAINT.ash,
    );
    // The bearing: an iron block with a brass cap over the axle.
    uvSpan(
      b,
      'metal',
      WHEEL.u - 0.7,
      WHEEL.u + 0.7,
      v - 0.6,
      v + 0.6,
      WHEEL.y - 0.3,
      WHEEL.y + 0.55,
      TW_PAINT.iron,
    );
    uvSpan(
      b,
      'metal',
      WHEEL.u - 0.8,
      WHEEL.u + 0.8,
      v - 0.7,
      v + 0.7,
      WHEEL.y + 0.55,
      WHEEL.y + 0.7,
      TW_PAINT.brass,
    );
  }
  // The ship keeps off the wheel and its outer pier.
  const p = at(WHEEL.u, 0, WHEEL.v - 2);
  out.shipObstacles.push({ x: p.x, z: p.z, r: 12 });
}

function rockLight(b: Buckets, out: TwOut): void {
  const R = ROCK_LIGHT;
  const c = at(R.u, 0, R.v);
  const y = ground(R.u, R.v);
  const ring = (key: 'stone' | 'metal', y0: number, y1: number, r0: number, r1: number, colour: number) =>
    rod(b, key, { x: c.x, y: y0, z: c.z }, { x: c.x, y: y1, z: c.z }, r0, 12, colour, r1);
  ring('stone', y - 1.2, y + 5.6, 1.9, 1.4, TW_PAINT.basalt);
  ring('stone', y + 2.4, y + 2.9, 1.76, 1.72, TW_PAINT.ash);
  ring('metal', y + 5.6, y + 5.8, 1.9, 1.9, TW_PAINT.brass);
  const lamp = ring('metal', y + 5.8, R.lamp + 0.4, 1.0, 1.0, 0xffffff);
  b.metal.splice(b.metal.indexOf(lamp), 1);
  out.lamps.push({ key: 'rock:lamp', geo: lamp });
  cone(b, 'metal', c.x, R.lamp + 0.4, c.z, 1.6, 1.6, 10, TW_PAINT.copper);
  out.shipObstacles.push({ x: c.x, z: c.z, r: R.r + 8 });
  out.perches.push({ x: c.x, y: R.lamp + 2.05, z: c.z });
}

function springs(b: Buckets, out: TwOut): void {
  for (const p of SPRINGS) {
    const c = at(p.u, 0, p.v);
    // A rim of pale sinter round pale-blue water, a hand over the ground.
    rod(
      b,
      'stone',
      { x: c.x, y: p.y - 0.6, z: c.z },
      { x: c.x, y: p.y + 0.3, z: c.z },
      p.r + 0.5,
      20,
      TW_PAINT.sinter,
      p.r + 0.3,
    );
    rod(
      b,
      'cloth',
      { x: c.x, y: p.y + 0.2, z: c.z },
      { x: c.x, y: p.y + 0.33, z: c.z },
      p.r - 0.1,
      20,
      TW_PAINT.water,
      p.r - 0.1,
    );
    out.circles.push({ x: c.x, z: c.z, r: p.r + 0.6, y0: p.y - 0.8, y1: p.y + 0.6, height: 0.6 });
  }
  // The fumaroles: a low cone of sulphur-stained rock round each vent.
  for (const f of FUMAROLES) {
    const c = at(f.u, 0, f.v);
    const y = ground(f.u, f.v);
    cone(b, 'stone', c.x, y - 0.4, c.z, 1.6, 1.3, 9, TW_PAINT.ochre, 0.5);
    out.circles.push({ x: c.x, z: c.z, r: 1.5, y0: y - 0.6, y1: y + 1, height: 1 });
  }
}

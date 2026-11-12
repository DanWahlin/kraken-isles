import {
  BoxGeometry,
  CylinderGeometry,
  SphereGeometry,
  TorusGeometry,
  type BufferGeometry,
} from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { paint } from '../../village/kit';
import { gearGeometry, TW_PAINT } from './build';
import { WHEEL } from './layout';
import { WHEEL_SHAPE } from './sights';

/**
 * The geometry of Tidewheel's moving machines (spec §7): each is one mesh in one of the kit's
 * materials, painted by vertex, built round its own pivot so the world only turns or slides it. The
 * Tide Wheel, the music-box drums, the levers, the clock's hands and hour ring, the striking figures'
 * hammer arms, the ring's crank, the nine peg and the tide gauge's float.
 */

/** One painted geometry out of many (each painted as it is made). */
function merged(parts: BufferGeometry[]): BufferGeometry {
  const g = mergeGeometries(
    parts.map((p) => (p.index ? p.toNonIndexed() : p)),
    false,
  )!;
  for (const p of parts) p.dispose();
  return g;
}

const painted = <G extends BufferGeometry>(g: G, colour: number): G => {
  paint(g, colour);
  return g;
};

/** A painted gear (its axle along z). */
export function paintedGear(r: number, thick: number, teeth: number, colour: number): BufferGeometry {
  return painted(gearGeometry(r, thick, teeth), colour);
}

/**
 * The Tide Wheel: two iron rims, twelve timber spokes a side, twenty-four paddles between the rims,
 * and a brass hub. Its axle is its local z; the world turns it about z.
 */
export function wheelGeometry(): BufferGeometry {
  const r = WHEEL.r;
  const half = WHEEL_SHAPE.width / 2 - 0.3;
  const parts: BufferGeometry[] = [];
  for (const z of [-half, half]) {
    parts.push(painted(new TorusGeometry(r - 0.3, 0.26, 6, 40).translate(0, 0, z), TW_PAINT.iron));
    parts.push(painted(new TorusGeometry(r * 0.52, 0.16, 5, 28).translate(0, 0, z), TW_PAINT.iron));
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      const spoke = new BoxGeometry(r - 0.4, 0.3, 0.24);
      spoke.translate((r - 0.4) / 2, 0, z);
      spoke.rotateZ(a);
      parts.push(painted(spoke, 0xc8a878));
    }
  }
  for (let k = 0; k < 24; k++) {
    const a = ((k + 0.5) / 24) * Math.PI * 2;
    const paddle = new BoxGeometry(2.3, 0.14, half * 2 + 0.3);
    paddle.translate(r - 1.1, 0, 0);
    paddle.rotateZ(a);
    parts.push(painted(paddle, k % 6 === 0 ? TW_PAINT.ochre : TW_PAINT.timber));
  }
  parts.push(
    painted(
      new CylinderGeometry(0.75, 0.75, WHEEL_SHAPE.width + 4.4, 12).rotateX(Math.PI / 2),
      TW_PAINT.brass,
    ),
  );
  return merged(parts);
}

/**
 * A music-box drum, `len` long and `r` round, its axle along its local x: a brass cylinder with end
 * caps. `pins` adds the pattern's pins (a tune pinned on it): leave them off for the blank drum.
 */
export function drumGeometry(r: number, len: number, pins: boolean): BufferGeometry {
  const parts: BufferGeometry[] = [
    painted(new CylinderGeometry(r, r, len, 20).rotateZ(Math.PI / 2), TW_PAINT.brass),
    painted(
      new CylinderGeometry(r + 0.05, r + 0.05, 0.05, 20).rotateZ(Math.PI / 2).translate(-len / 2, 0, 0),
      TW_PAINT.bronze,
    ),
    painted(
      new CylinderGeometry(r + 0.05, r + 0.05, 0.05, 20).rotateZ(Math.PI / 2).translate(len / 2, 0, 0),
      TW_PAINT.bronze,
    ),
  ];
  if (pins)
    for (let k = 0; k < 46; k++) {
      // A fixed scatter that reads as a tune: runs along the drum with gaps.
      const a = ((k * 0.618) % 1) * Math.PI * 2;
      const x = (((k * 7) % 23) / 22 - 0.5) * (len - 0.16);
      const pin = new BoxGeometry(0.035, 0.07, 0.035);
      pin.translate(x, r + 0.03, 0);
      pin.rotateX(a);
      parts.push(painted(pin, TW_PAINT.ink));
    }
  return merged(parts);
}

/** A lever `h` tall on its pivot (the origin): an iron bar with a brass ball grip. It swings about its local x. */
export function leverGeometry(h: number): BufferGeometry {
  return merged([
    painted(new CylinderGeometry(0.045, 0.06, h, 8).translate(0, h / 2, 0), TW_PAINT.iron),
    painted(new SphereGeometry(0.14, 10, 8).translate(0, h, 0), TW_PAINT.brass),
    painted(new CylinderGeometry(0.11, 0.11, 0.3, 10).rotateZ(Math.PI / 2), TW_PAINT.brass),
  ]);
}

/**
 * A clock hand `len` long from its arbor (the origin) up its local y, in its face's plane (the face's
 * normal is its local z), with a short tail and a boss.
 */
export function handGeometry(len: number, width: number, colour: number): BufferGeometry {
  return merged([
    painted(new BoxGeometry(width, len, 0.05).translate(0, len / 2, 0), colour),
    painted(new BoxGeometry(width * 1.4, len * 0.22, 0.05).translate(0, -len * 0.11, 0), colour),
    painted(new CylinderGeometry(width * 1.3, width * 1.3, 0.1, 12).rotateX(Math.PI / 2), TW_PAINT.brass),
  ]);
}

/**
 * The clock's hour ring: a brass hoop `r` round with one ember-red marker at its top (local +y), in
 * the face's plane. The world turns it about z to set the hour the routine runs at.
 */
export function ringGeometry(r: number): BufferGeometry {
  return merged([
    painted(new TorusGeometry(r, 0.07, 6, 40), TW_PAINT.brass),
    painted(new BoxGeometry(0.34, 0.6, 0.12).translate(0, r - 0.05, 0.02), TW_PAINT.ember),
    painted(new BoxGeometry(0.5, 0.14, 0.12).translate(0, r + 0.3, 0.02), TW_PAINT.ember),
  ]);
}

/** A striking figure's arm: from its shoulder (the origin) along local x to a hammer's head. It swings about z. */
export function hammerGeometry(): BufferGeometry {
  return merged([
    painted(
      new CylinderGeometry(0.045, 0.05, 1.0, 6).rotateZ(Math.PI / 2).translate(0.5, 0, 0),
      TW_PAINT.bronze,
    ),
    painted(new CylinderGeometry(0.1, 0.1, 0.34, 8).translate(1.0, 0, 0), TW_PAINT.iron),
  ]);
}

/** The ring's crank: a brass hand wheel with a grip, flat on its pedestal (its axle is local y). */
export function crankGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [
    painted(new TorusGeometry(0.34, 0.035, 6, 20).rotateX(Math.PI / 2), TW_PAINT.brass),
    painted(new CylinderGeometry(0.05, 0.05, 0.1, 8), TW_PAINT.iron),
    painted(new CylinderGeometry(0.03, 0.03, 0.2, 6).translate(0.34, 0.1, 0), TW_PAINT.ember),
  ];
  for (let k = 0; k < 4; k++)
    parts.push(painted(new BoxGeometry(0.68, 0.03, 0.04).rotateY((k / 4) * Math.PI), TW_PAINT.brass));
  return merged(parts);
}

/** A peg for the peg board: a brass pin with an ember head (it sticks out along local −x). */
export function pegGeometry(): BufferGeometry {
  return merged([
    painted(
      new CylinderGeometry(0.03, 0.03, 0.22, 6).rotateZ(Math.PI / 2).translate(-0.11, 0, 0),
      TW_PAINT.brass,
    ),
    painted(new SphereGeometry(0.06, 8, 6).translate(-0.24, 0, 0), TW_PAINT.ember),
  ]);
}

/** The tide gauge's float: a copper ball in its tube. */
export function floatGeometry(): BufferGeometry {
  return painted(new SphereGeometry(0.11, 10, 8), TW_PAINT.ember);
}

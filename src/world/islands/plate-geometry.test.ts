import { describe, expect, it } from 'vitest';
import type { BufferGeometry } from 'three/webgpu';
import { plateGeometry } from './plate-geometry';
import { gearGeometry } from './tidewheel/build';

/** Each triangle's area by the way it faces (+z, −z, sideways), and how many are wound against their normal. */
function faces(g: BufferGeometry) {
  const p = g.getAttribute('position');
  const n = g.getAttribute('normal');
  const sum = { front: 0, back: 0, side: 0, wrong: 0 };
  for (let i = 0; i < p.count; i += 3) {
    const ux = p.getX(i + 1) - p.getX(i);
    const uy = p.getY(i + 1) - p.getY(i);
    const uz = p.getZ(i + 1) - p.getZ(i);
    const vx = p.getX(i + 2) - p.getX(i);
    const vy = p.getY(i + 2) - p.getY(i);
    const vz = p.getZ(i + 2) - p.getZ(i);
    const c = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx] as const;
    const area = Math.hypot(...c) / 2;
    if (c[0] * n.getX(i) + c[1] * n.getY(i) + c[2] * n.getZ(i) < 0) sum.wrong++;
    sum[n.getZ(i) > 0.9 ? 'front' : n.getZ(i) < -0.9 ? 'back' : 'side'] += area;
  }
  return sum;
}

describe('plate geometry', () => {
  it('cuts a plate with its outline’s area on each face and a wall round its edge', () => {
    // A 2 × 1 rectangle, 0.1 thick.
    const f = faces(
      plateGeometry(
        [
          [-1, -0.5],
          [1, -0.5],
          [1, 0.5],
          [-1, 0.5],
        ],
        0.1,
      ),
    );
    expect(f.front).toBeCloseTo(2, 6);
    expect(f.back).toBeCloseTo(2, 6);
    expect(f.side).toBeCloseTo(6 * 0.1, 6);
    expect(f.wrong).toBe(0);
  });

  it('cuts a gear to its radius, with windows between the spokes of a large one', () => {
    for (const [r, teeth] of [
      [1.9, 18],
      [0.4, 10],
    ] as const) {
      const g = gearGeometry(r, 0.2, teeth);
      const p = g.getAttribute('position');
      let reach = 0;
      for (let i = 0; i < p.count; i++) reach = Math.max(reach, Math.hypot(p.getX(i), p.getY(i)));
      expect(reach).toBeCloseTo(r, 6);
      const f = faces(g);
      expect(f.wrong).toBe(0);
      expect(f.front).toBeCloseTo(f.back, 6);
      // A large gear is mostly window; a small one is a disc less the gaps between its teeth.
      const share = f.front / (Math.PI * r * r);
      expect(share).toBeGreaterThan(r > 0.5 ? 0.45 : 0.75);
      expect(share).toBeLessThan(r > 0.5 ? 0.7 : 1);
    }
  });
});

import { Matrix4 } from 'three/webgpu';
import { describe, expect, it } from 'vitest';
import { dryHullCover } from './dry-hull';

/** A hull's two sides as triangles, upright from the keel (y 0) to the rail (y 1): its half breadth at each station. */
function hull(half: (z: number) => number, z0 = -2, z1 = 2, steps = 8): number[] {
  const out: number[] = [];
  for (let s = 0; s < steps; s++) {
    const a = z0 + ((z1 - z0) * s) / steps;
    const b = z0 + ((z1 - z0) * (s + 1)) / steps;
    for (const side of [-1, 1]) {
      const k = (z: number, y: number) => [side * half(z), y, z];
      out.push(...k(a, 0), ...k(b, 0), ...k(a, 1), ...k(a, 1), ...k(b, 0), ...k(b, 1));
    }
  }
  return out;
}

/** That hull's half breadth at any z: straight runs between its stations. */
function breadth(half: (z: number) => number, z: number, z0 = -2, z1 = 2, steps = 8): number {
  const f = Math.min(steps - 1e-9, Math.max(0, ((z - z0) / (z1 - z0)) * steps));
  const s = Math.floor(f);
  const a = half(z0 + ((z1 - z0) * s) / steps);
  const b = half(z0 + ((z1 - z0) * (s + 1)) / steps);
  return a + (b - a) * (f - s);
}

const points = (g: {
  getAttribute(n: string): {
    count: number;
    getX(i: number): number;
    getY(i: number): number;
    getZ(i: number): number;
  };
}) => {
  const p = g.getAttribute('position');
  return Array.from({ length: p.count }, (_, i) => ({ x: p.getX(i), y: p.getY(i), z: p.getZ(i) }));
};

describe('the cover that keeps the sea out of an open hull', () => {
  // Pointed at both ends, 1 m half breadth amidships.
  const lens = (z: number) => Math.max(0, 1 - (z / 2) ** 2);

  /** Every corner of the cover, and the middle of every edge, at least `clear` inside the hull. */
  const inside = (pts: { x: number; z: number }[], half: (z: number) => number, clear: number) => {
    for (let i = 0; i < pts.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        const a = pts[i + k]!,
          b = pts[i + ((k + 1) % 3)]!;
        for (const q of [a, { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 }])
          expect(Math.abs(q.x)).toBeLessThanOrEqual(breadth(half, q.z) - clear + 1e-6);
      }
    }
  };

  it('lies flat at its height and stays inside the hull there, drawn in from the planking', () => {
    const pts = points(dryHullCover(hull(lens), new Matrix4(), 0.8, { inset: 0.05 })!);
    expect(pts.length).toBeGreaterThan(30);
    for (const p of pts) expect(p.y).toBeCloseTo(0.8, 6);
    inside(pts, lens, 0.05);
    // It spans most of the opening: nearly the full breadth amidships and nearly the full length.
    expect(Math.max(...pts.map((p) => p.x))).toBeGreaterThan(0.85);
    expect(Math.max(...pts.map((p) => p.z)) - Math.min(...pts.map((p) => p.z))).toBeGreaterThan(3.2);
  });

  it('stays inside a hull with a waist, where a straight run between stations would cross it', () => {
    const waisted = (z: number) => (Math.abs(z) < 0.3 ? 0.4 : lens(z));
    const pts = points(dryHullCover(hull(waisted), new Matrix4(), 0.5, { inset: 0.03 })!);
    inside(pts, waisted, 0.03);
  });

  it('faces up, so it hides the sea from above', () => {
    const p = points(dryHullCover(hull(lens), new Matrix4(), 0.5)!);
    for (let i = 0; i < p.length; i += 3) {
      const [a, b, c] = [p[i]!, p[i + 1]!, p[i + 2]!];
      expect((b.z - a.z) * (c.x - a.x) - (b.x - a.x) * (c.z - a.z)).toBeGreaterThan(0);
    }
  });

  it("follows the hull where it's been turned, scaled and sunk into place", () => {
    // A hull modelled along x, fitted as a boat's model is: turned to lie along z, twice the size, 0.3 down.
    const alongX = hull(lens).map((_, i, all) =>
      i % 3 === 0 ? all[i + 2]! : i % 3 === 2 ? all[i - 2]! : all[i]!,
    );
    const fit = new Matrix4().makeRotationY(Math.PI / 2).multiply(new Matrix4().makeScale(2, 2, 2));
    fit.setPosition(0, -0.3, 0);
    const pts = points(dryHullCover(alongX, fit, 1, { inset: 0.05 })!);
    for (const p of pts) expect(p.y).toBeCloseTo(1, 6);
    expect(Math.max(...pts.map((p) => Math.abs(p.z)))).toBeGreaterThan(3.2);
    inside(
      pts.map((p) => ({ x: p.x / 2, z: p.z / 2 })),
      lens,
      0.025,
    );
  });

  it('gives nothing where the hull has no outline', () => {
    expect(dryHullCover(hull(lens), new Matrix4(), 1.5)).toBeNull();
    expect(dryHullCover([], new Matrix4(), 0.5)).toBeNull();
  });
});

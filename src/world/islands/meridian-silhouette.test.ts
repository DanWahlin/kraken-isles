import { Group } from 'three/webgpu';
import { describe, expect, it, vi } from 'vitest';
import { meridianHeight } from './meridian';
import type { SilhouetteOptions } from './silhouette';

// What the silhouette is built from, without building it.
const built = vi.hoisted(() => ({ options: null as SilhouetteOptions | null }));
vi.mock('./silhouette', async (original) => ({
  ...(await original<typeof import('./silhouette')>()),
  createIslandSilhouetteAsync: (options: SilhouetteOptions) => {
    built.options = options;
    return { group: new Group(), ready: Promise.resolve() };
  },
}));

const { createMeridianSilhouette } = await import('./meridian-silhouette');

describe("Port Meridian's silhouette", () => {
  it.each(['high', 'low'] as const)('has no block whose top lies in the ground under it (%s)', (tier) => {
    createMeridianSilhouette(tier, async () => {});
    const { blocks = [], height } = built.options!;
    expect(height).toBe(meridianHeight);
    expect(blocks.length).toBeGreaterThan(40);
    // A top at the ground's own height shares a face with it, and the two flicker (seen from above,
    // the quay, the east arm and the mole did: the bake's pads are at their heights).
    const shared: string[] = [];
    for (const b of blocks) {
      if (b.y1 === undefined) continue;
      const cos = Math.cos(b.rot),
        sin = Math.sin(b.rot);
      for (let i = -2; i <= 2; i++)
        for (let j = -1; j <= 1; j++) {
          const lx = (b.hx * 0.9 * i) / 2,
            lz = (b.hz * 0.9 * j) / 1;
          // Yaw about +y, three's convention.
          const x = b.x + lx * cos + lz * sin,
            z = b.z - lx * sin + lz * cos;
          const gap = Math.abs(meridianHeight(x, z) - b.y1);
          if (gap < 0.25)
            shared.push(
              `block at ${b.x.toFixed(0)}, ${b.z.toFixed(0)}: top ${b.y1}, ground ${gap.toFixed(2)} off`,
            );
        }
    }
    expect(shared).toEqual([]);
  });
});

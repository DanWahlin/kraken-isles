import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  bakeTerrainFrom,
  SUNS,
  type TerrainBakeSource,
  type TerrainBounds,
} from '../../src/world/terrain/bake';
import { sunState } from '../../src/world/sky/sun';
import { smoothSteepLight } from './steep-light';
import { writeTerrainPack } from './write-terrain-pack';
import { chartPack } from './bake-keelhaven';
import { guildcrestHeight, guildcrestMasks } from '../../src/world/islands/guildcrest/height';
import { GUILDCREST } from '../../src/world/islands/guildcrest/layout';
import { sunspireHeight, sunspireMasks } from '../../src/world/islands/sunspire/height';
import { SUNSPIRE } from '../../src/world/islands/sunspire/layout';
import { inkwellHeight, inkwellMasks } from '../../src/world/islands/inkwell/height';
import { INKWELL } from '../../src/world/islands/inkwell/layout';
import { tidewheelHeight, tidewheelMasks } from '../../src/world/islands/tidewheel/height';
import { TIDEWHEEL } from '../../src/world/islands/tidewheel/layout';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');

type HeightAt = (x: number, z: number) => number;

/** What the bake reads of a frame island (islands 04 on): its layout's box, sea and sky, and its ground. */
interface FrameIslandBake {
  /** The pack's folder under `public/packs`. */
  id: string;
  /** The island's name in the bake's log. */
  name: string;
  layout: {
    bounds: TerrainBounds;
    sky: { hours: number; azimuth: number };
    seabedRadius: number;
    deepDepth: number;
    chart: Parameters<typeof chartPack>[1];
  };
  heightAt: HeightAt;
  masksAt: (x: number, z: number, heightAt: HeightAt) => ReturnType<TerrainBakeSource['masksAt']>;
}

/** The frame islands, in voyage order. A new island adds its row here and nothing else in the bake. */
export const FRAME_ISLAND_BAKES: readonly FrameIslandBake[] = [
  {
    id: 'guildcrest',
    name: 'Guildcrest',
    layout: GUILDCREST,
    heightAt: guildcrestHeight,
    masksAt: guildcrestMasks,
  },
  { id: 'sunspire', name: 'Sunspire', layout: SUNSPIRE, heightAt: sunspireHeight, masksAt: sunspireMasks },
  { id: 'inkwell', name: 'Inkwell', layout: INKWELL, heightAt: inkwellHeight, masksAt: inkwellMasks },
  {
    id: 'tidewheel',
    name: 'Tidewheel',
    layout: TIDEWHEEL,
    heightAt: tidewheelHeight,
    masksAt: tidewheelMasks,
  },
];

/** The island's height on its own bake grid (bilinear), so the masks' many look-ups don't re-run the height. */
function gridHeights(b: TerrainBounds, heightAt: HeightAt): HeightAt {
  const nx = Math.round((b.maxX - b.minX) / b.cell) + 1;
  const nz = Math.round((b.maxZ - b.minZ) / b.cell) + 1;
  const grid = new Float32Array(nx * nz);
  for (let iz = 0; iz < nz; iz++)
    for (let ix = 0; ix < nx; ix++) grid[iz * nx + ix] = heightAt(b.minX + ix * b.cell, b.minZ + iz * b.cell);
  return (x, z) => {
    const gx = Math.min(nx - 1.001, Math.max(0, (x - b.minX) / b.cell));
    const gz = Math.min(nz - 1.001, Math.max(0, (z - b.minZ) / b.cell));
    const ix = Math.floor(gx);
    const iz = Math.floor(gz);
    const tx = gx - ix;
    const tz = gz - iz;
    const i = iz * nx + ix;
    const a = grid[i]! + (grid[i + 1]! - grid[i]!) * tx;
    const c = grid[i + nx]! + (grid[i + nx + 1]! - grid[i + nx]!) * tx;
    return a + (c - a) * tz;
  };
}

/**
 * Bakes a frame island's terrain pack and its coarse chart pack (the opening's chart reads that one,
 * never the full pack: O7). The second baked sun (the one the terrain material reads) is the island's
 * own sun from its layout's `sky`, so its baked shadows fall the same way as the sky's.
 */
export async function bakeFrameIsland(
  island: FrameIslandBake,
  outBase = resolve(root, `public/packs/${island.id}/terrain`),
) {
  const start = performance.now();
  const { layout, name } = island;
  const { hours, azimuth } = layout.sky;
  const heightOnGrid = gridHeights(layout.bounds, island.heightAt);
  const baked = bakeTerrainFrom({
    bounds: layout.bounds,
    heightAt: heightOnGrid,
    masksAt: (x, z) => island.masksAt(x, z, heightOnGrid),
    suns: [SUNS[0], sunState(hours, azimuth).sun],
  });
  smoothSteepLight(baked, { radius: 4, sigma: 2.6 });
  const sea = { seabedRadius: layout.seabedRadius, deepDepth: layout.deepDepth };
  const written = await writeTerrainPack(`${name} terrain`, baked, outBase, start, {
    ...sea,
    farSeabedRing: { innerRadius: 700, outerRadius: layout.seabedRadius, segments: 160 },
  });
  await writeTerrainPack(
    `${name} chart`,
    chartPack(baked, layout.chart),
    resolve(dirname(outBase), 'chart'),
    performance.now(),
    sea,
  );
  return written;
}

// `npx tsx tools/bake/bake-frame-island.ts [id …]` bakes the named islands (all of them with no id).
if (import.meta.url === `file://${process.argv[1]}`) {
  const only = process.argv.slice(2);
  const unknown = only.filter((id) => !FRAME_ISLAND_BAKES.some((i) => i.id === id));
  if (unknown.length) throw new Error(`No frame island named ${unknown.join(', ')}`);
  for (const island of FRAME_ISLAND_BAKES)
    if (!only.length || only.includes(island.id)) await bakeFrameIsland(island);
}

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bakeTerrainFrom, SUNS } from '../../src/world/terrain/bake';
import { sunState } from '../../src/world/sky/sun';
import { smoothSteepLight } from './steep-light';
import { writeTerrainPack } from './write-terrain-pack';
import { chartPack } from './bake-keelhaven';
import { guildcrestHeight, guildcrestMasks } from '../../src/world/islands/guildcrest/height';
import { GUILDCREST } from '../../src/world/islands/guildcrest/layout';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');

/** The island's height on its own bake grid (bilinear), so the masks' many look-ups don't re-run the height. */
function gridHeights(): (x: number, z: number) => number {
  const b = GUILDCREST.bounds;
  const nx = Math.round((b.maxX - b.minX) / b.cell) + 1;
  const nz = Math.round((b.maxZ - b.minZ) / b.cell) + 1;
  const grid = new Float32Array(nx * nz);
  for (let iz = 0; iz < nz; iz++)
    for (let ix = 0; ix < nx; ix++)
      grid[iz * nx + ix] = guildcrestHeight(b.minX + ix * b.cell, b.minZ + iz * b.cell);
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
 * Bakes Guildcrest's terrain pack (spec §3.2). The second baked sun (the one the terrain material
 * reads) is the island's own late-afternoon sun (16.5 h, bearing 250°), so the long shadows fall the
 * same way as the sky's; the steep-light smoothing takes 8 m (its slopes are gentle, §2.4).
 */
export async function bakeGuildcrestTerrain(outBase = resolve(root, 'public/packs/guildcrest/terrain')) {
  const start = performance.now();
  const { hours, azimuth } = GUILDCREST.sky;
  const heightOnGrid = gridHeights();
  const baked = bakeTerrainFrom({
    bounds: GUILDCREST.bounds,
    heightAt: heightOnGrid,
    masksAt: (x, z) => guildcrestMasks(x, z, heightOnGrid),
    suns: [SUNS[0], sunState(hours, azimuth).sun],
  });
  smoothSteepLight(baked, { radius: 4, sigma: 2.6 });
  const options = {
    seabedRadius: GUILDCREST.seabedRadius,
    deepDepth: GUILDCREST.deepDepth,
    farSeabedRing: { innerRadius: 700, outerRadius: GUILDCREST.seabedRadius, segments: 160 },
  };
  const written = await writeTerrainPack('Guildcrest terrain', baked, outBase, start, options);
  // The opening's chart reads a coarse pack of its own (O7), never the full one.
  await writeTerrainPack(
    'Guildcrest chart',
    chartPack(baked, GUILDCREST.chart),
    resolve(dirname(outBase), 'chart'),
    performance.now(),
    { seabedRadius: GUILDCREST.seabedRadius, deepDepth: GUILDCREST.deepDepth },
  );
  return written;
}

if (import.meta.url === `file://${process.argv[1]}`) await bakeGuildcrestTerrain();

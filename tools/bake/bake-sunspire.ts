import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bakeTerrainFrom, SUNS } from '../../src/world/terrain/bake';
import { sunState } from '../../src/world/sky/sun';
import { smoothSteepLight } from './steep-light';
import { writeTerrainPack } from './write-terrain-pack';
import { chartPack } from './bake-keelhaven';
import { sunspireHeight, sunspireMasks } from '../../src/world/islands/sunspire/height';
import { SUNSPIRE } from '../../src/world/islands/sunspire/layout';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');

/** The island's height on its own bake grid (bilinear), so the masks' many look-ups don't re-run the height. */
function gridHeights(): (x: number, z: number) => number {
  const b = SUNSPIRE.bounds;
  const nx = Math.round((b.maxX - b.minX) / b.cell) + 1;
  const nz = Math.round((b.maxZ - b.minZ) / b.cell) + 1;
  const grid = new Float32Array(nx * nz);
  for (let iz = 0; iz < nz; iz++)
    for (let ix = 0; ix < nx; ix++)
      grid[iz * nx + ix] = sunspireHeight(b.minX + ix * b.cell, b.minZ + iz * b.cell);
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
 * Bakes Sunspire's terrain pack (docs/specs/ISLAND-05-sunspire-sands.md §3). The second baked sun
 * (the one the terrain material reads) is the island's own morning sun (spec S3), so the tables'
 * shadows fall the same way as the sky's.
 */
export async function bakeSunspireTerrain(outBase = resolve(root, 'public/packs/sunspire/terrain')) {
  const start = performance.now();
  const { hours, azimuth } = SUNSPIRE.sky;
  const heightOnGrid = gridHeights();
  const baked = bakeTerrainFrom({
    bounds: SUNSPIRE.bounds,
    heightAt: heightOnGrid,
    masksAt: (x, z) => sunspireMasks(x, z, heightOnGrid),
    suns: [SUNS[0], sunState(hours, azimuth).sun],
  });
  smoothSteepLight(baked, { radius: 4, sigma: 2.6 });
  const options = {
    seabedRadius: SUNSPIRE.seabedRadius,
    deepDepth: SUNSPIRE.deepDepth,
    farSeabedRing: { innerRadius: 700, outerRadius: SUNSPIRE.seabedRadius, segments: 160 },
  };
  const written = await writeTerrainPack('Sunspire terrain', baked, outBase, start, options);
  // The opening's chart reads a coarse pack of its own (O7), never the full one.
  await writeTerrainPack(
    'Sunspire chart',
    chartPack(baked, SUNSPIRE.chart),
    resolve(dirname(outBase), 'chart'),
    performance.now(),
    { seabedRadius: SUNSPIRE.seabedRadius, deepDepth: SUNSPIRE.deepDepth },
  );
  return written;
}

if (import.meta.url === `file://${process.argv[1]}`) await bakeSunspireTerrain();

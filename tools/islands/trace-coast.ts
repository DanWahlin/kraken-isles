/**
 * Prints an island's sea-chart coast and its footprint, for its `waypoints.ts` and its registry entry
 * (docs/adding-an-island.md §2): where the island is too shallow for the ship (under 3.1 m), 18 m
 * wider, traced from its dry height on a 4 m grid and simplified to 8 m; and its land's reach along
 * 32 bearings (`measureFootprint`). The island's package must export `<id>HeightDry` from `height.ts`
 * and a layout object with `bounds` and `center`.
 *
 *   npx tsx tools/islands/trace-coast.ts sunspire
 */
const R = new URL('../../src/world/islands/', import.meta.url).pathname;
const [, , id] = process.argv;
if (!id || !/^[a-z-]+$/.test(id)) throw new Error('usage: trace-coast.ts <island id>');
const camel = id.replace(/-(.)/g, (_, c: string) => c.toUpperCase());
const mod = await import(`${R}${id}/height`);
const lay = await import(`${R}${id}/layout`);
const height: (x: number, z: number) => number = mod[`${camel}HeightDry`];
const b = Object.values(lay).find(
  (
    v,
  ): v is {
    bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
    center: { x: number; z: number };
  } => !!v && typeof v === 'object' && 'bounds' in v && 'center' in v,
)!;
const { minX, maxX, minZ, maxZ } = b.bounds;
const CELL = 4,
  GROW = 18,
  DRAFT = -3.1,
  TOL = 8;
const nx = Math.floor((maxX - minX) / CELL) + 1,
  nz = Math.floor((maxZ - minZ) / CELL) + 1;
const land = new Uint8Array(nx * nz);
for (let j = 0; j < nz; j++)
  for (let i = 0; i < nx; i++) land[j * nx + i] = height(minX + i * CELL, minZ + j * CELL) > DRAFT ? 1 : 0;
const g = Math.ceil(GROW / CELL);
const mask = new Uint8Array(nx * nz);
for (let j = 0; j < nz; j++)
  for (let i = 0; i < nx; i++) {
    if (!land[j * nx + i]) continue;
    for (let dj = -g; dj <= g; dj++)
      for (let di = -g; di <= g; di++) {
        if (di * di + dj * dj > g * g) continue;
        const a = i + di,
          c = j + dj;
        if (a >= 0 && c >= 0 && a < nx && c < nz) mask[c * nx + a] = 1;
      }
  }
// Label components, then trace each one's outer boundary (Moore neighbourhood).
const label = new Int32Array(nx * nz).fill(-1);
const comps: number[][] = [];
for (let s = 0; s < nx * nz; s++) {
  if (!mask[s] || label[s] >= 0) continue;
  const id2 = comps.length;
  const stack = [s];
  label[s] = id2;
  const cells = [];
  while (stack.length) {
    const c = stack.pop()!;
    cells.push(c);
    const i = c % nx,
      j = (c / nx) | 0;
    for (const [di, dj] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const a = i + di!,
        d = j + dj!;
      if (a < 0 || d < 0 || a >= nx || d >= nz) continue;
      const n = d * nx + a;
      if (mask[n] && label[n] < 0) {
        label[n] = id2;
        stack.push(n);
      }
    }
  }
  comps.push(cells);
}
const inside = (i: number, j: number, id2: number) =>
  i >= 0 && j >= 0 && i < nx && j < nz && label[j * nx + i] === id2;
function trace(id2: number, cells: number[]) {
  let start = cells[0]!;
  for (const c of cells) if (c < start) start = c;
  const si = start % nx,
    sj = (start / nx) | 0;
  const dirs = [
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [-1, -1],
    [0, -1],
    [1, -1],
  ];
  const pts: [number, number][] = [];
  let i = si,
    j = sj,
    dir = 6;
  let guard = 0;
  do {
    pts.push([i, j]);
    let found = false;
    for (let k = 0; k < 8; k++) {
      const d = (dir + 6 + k) % 8;
      const a = i + dirs[d]![0]!,
        c = j + dirs[d]![1]!;
      if (inside(a, c, id2)) {
        i = a;
        j = c;
        dir = d;
        found = true;
        break;
      }
    }
    if (!found) break;
  } while ((i !== si || j !== sj) && ++guard < 200000);
  return pts.map(([a, c]) => ({ x: minX + a * CELL, z: minZ + c * CELL }));
}
function simplify(p: { x: number; z: number }[], tol: number): { x: number; z: number }[] {
  if (p.length < 3) return p;
  let far = 0,
    idx = 0;
  const a = p[0]!,
    e = p[p.length - 1]!;
  const len = Math.hypot(e.x - a.x, e.z - a.z) || 1;
  for (let i = 1; i < p.length - 1; i++) {
    const d = Math.abs((e.x - a.x) * (a.z - p[i]!.z) - (a.x - p[i]!.x) * (e.z - a.z)) / len;
    if (d > far) {
      far = d;
      idx = i;
    }
  }
  if (far <= tol) return [a, e];
  return [...simplify(p.slice(0, idx + 1), tol).slice(0, -1), ...simplify(p.slice(idx), tol)];
}
for (const [k, cells] of comps.entries()) {
  if (cells.length < 20) continue;
  const ring = trace(k, cells);
  const half = (ring.length / 2) | 0;
  const s = [
    ...simplify(ring.slice(0, half + 1), TOL).slice(0, -1),
    ...simplify(ring.slice(half), TOL).slice(0, -1),
  ];
  console.log(`// component ${k}: ${cells.length} cells, ${s.length} points`);
  console.log('[' + s.map((q) => `{ x: ${q.x}, z: ${q.z} }`).join(', ') + '],');
}
const { measureFootprint } = await import(`${R}footprint`);
console.log('footprint', JSON.stringify(measureFootprint(height, b.center.x, b.center.z, 32, 900)));

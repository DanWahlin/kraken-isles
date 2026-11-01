import { BufferAttribute, BufferGeometry, Group, Matrix4, Quaternion, Vector3 } from 'three/webgpu';
import { sharedInstancedMesh } from '../../../engine/instancing';
import type { CircleObstacle, Tier } from '../../contracts';
import { ROCK_ASSETS } from '../../terrain/rock-assets';
import { createRockMaterial } from '../../terrain/terrain-material';
import { mulberry32 } from '../../../util/math';
import { guildcrestHeight, guildcrestMasks, guildcrestTrodden } from './height';
import { GUILDCREST as G, toFrame } from './layout';
import { inBuilt } from './town';

/**
 * Guildcrest's granite (spec §2.3): tors on the moor and Ben Scrivener's shoulders, boulders at the
 * crags' feet, and the sea cliffs' rubble in the surf. The shared rock kit, instanced, in the shared
 * granite look (Anchorage's and Meridian's rock material: no new shader).
 */

export interface RockSpot {
  asset: number;
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  yaw: number;
}

const F = { u: 0, v: 0 };

/** Where each rock goes (seeded and pure). Lite keeps the big ones. */
export function guildcrestRockSpots(lite = false): RockSpot[] {
  const rand = mulberry32(0x6c0c);
  const out: RockSpot[] = [];
  const add = (x: number, z: number, size: number, flat: number) => {
    if (lite && size < 2.4) return;
    if (out.some((o) => Math.hypot(o.x - x, o.z - z) < (Math.max(o.sx, o.sz) + size) * 0.5)) return;
    toFrame(x, z, F);
    if (inBuilt(F.u, F.v, 3) || guildcrestTrodden(F.u, F.v) > 0.05) return;
    const y = guildcrestHeight(x, z);
    out.push({
      asset: Math.floor(rand() * 3) % 3,
      x,
      y: y - size * flat * 0.3,
      z,
      sx: size * (0.8 + rand() * 0.5),
      sy: size * flat,
      sz: size * (0.8 + rand() * 0.5),
      yaw: rand() * Math.PI * 2,
    });
  };
  const b = G.bounds;
  // Tors: where the masks have bare rock up on the moor and the ben, a group of blocks each.
  for (let i = 0; i < 9000 && out.length < (lite ? 30 : 70); i++) {
    const x = b.minX + 120 + rand() * (b.maxX - b.minX - 240);
    const z = b.minZ + 120 + rand() * (b.maxZ - b.minZ - 240);
    const h = guildcrestHeight(x, z);
    if (h < 45) continue;
    const m = guildcrestMasks(x, z);
    if (m.rock < 0.55) continue;
    const size = 2 + rand() * rand() * 5;
    add(x, z, size, 0.7 + rand() * 0.3);
    for (let k = 0; k < 3; k++)
      if (rand() < 0.7)
        add(
          x + (rand() - 0.5) * size * 2.6,
          z + (rand() - 0.5) * size * 2.6,
          size * (0.4 + rand() * 0.4),
          0.75,
        );
  }
  // In the surf at the sea cliffs' feet.
  for (let i = 0; i < 4000 && out.length < (lite ? 50 : 120); i++) {
    const x = b.minX + 60 + rand() * (b.maxX - b.minX - 120);
    const z = b.minZ + 60 + rand() * (b.maxZ - b.minZ - 120);
    const h = guildcrestHeight(x, z);
    if (h < -1.4 || h > 1.2) continue;
    const up = Math.max(
      guildcrestHeight(x + 8, z),
      guildcrestHeight(x - 8, z),
      guildcrestHeight(x, z + 8),
      guildcrestHeight(x, z - 8),
    );
    if (up < h + 7) continue;
    add(x, z, 1.6 + rand() * rand() * 4.4, 0.55 + rand() * 0.3);
  }
  return out;
}

export interface GuildcrestRocks {
  group: Group;
  /** The rocks a walker can reach (over the sea), for its colliders. */
  circles: CircleObstacle[];
  dispose(): void;
}

const M = new Matrix4();
const Q = new Quaternion();
const P = new Vector3();
const S = new Vector3();
const Y = new Vector3(0, 1, 0);

export function createGuildcrestRocks(tier: Tier): GuildcrestRocks {
  const group = new Group();
  group.name = 'guildcrest-rocks';
  const material = createRockMaterial();
  const spots = guildcrestRockSpots(tier === 'lite');
  const circles: CircleObstacle[] = [];
  const geometries: BufferGeometry[] = [];
  for (let a = 0; a < 3; a++) {
    const asset = ROCK_ASSETS[a]!;
    const mine = spots.filter((s) => s.asset === a);
    if (mine.length === 0) continue;
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(asset.positions, 3));
    geometry.setAttribute('normal', new BufferAttribute(asset.normals, 3));
    geometry.setIndex(new BufferAttribute(asset.indices, 1));
    geometries.push(geometry);
    const mesh = sharedInstancedMesh(geometry, material, mine.length);
    mesh.name = `guildcrest-rocks-${asset.key}`;
    mine.forEach((s, i) => {
      Q.setFromAxisAngle(Y, s.yaw);
      mesh.setMatrixAt(i, M.compose(P.set(s.x, s.y, s.z), Q, S.set(s.sx, s.sy, s.sz)));
      if (s.y > -1)
        circles.push({
          x: s.x,
          z: s.z,
          r: Math.max(s.sx, s.sz) * 0.42,
          y0: s.y - 1,
          y1: s.y + s.sy,
          height: s.sy,
        });
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return {
    group,
    circles,
    dispose() {
      for (const g of geometries) g.dispose();
      material.dispose();
    },
  };
}

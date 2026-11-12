import { Color } from 'three/webgpu';
import type { HeightField, Tier } from '../../contracts';
import type { PlantInstance, PlantPatchLook, PlantSpecies } from '../../vegetation/types';
import { fbm2 } from '../../terrain/cove-height';
import { lowestOnRing } from '../../vegetation/scatter';
import { sinHash, smoothstep } from '../../../util/math';
import {
  sunspireHeight,
  sunspireMasks,
  sunspireNormal,
  sunspireOasis,
  sunspireTrodden,
  sunspireWater,
} from './height';
import { DUNES, SUNSPIRE as S, toFrame, toWorld } from './layout';
import { inBuilt } from './town';

/**
 * Sunspire's plants (spec S11): saguaro standing apart on the desert floor and the tables' skirts,
 * prickly pear and dry scrub in loose drifts, date palms and ferns only at the oasis and along the
 * falaj, and nothing on the dunes' crests, the beaches, the town's lanes or its pads. A desert is
 * mostly open ground: the plants are few and far apart. Seeded and pure.
 */

const CELL = 9;
const SPOTS = 2;
/** The plants' share per tier. */
const KEEP: Record<Tier, number> = { lite: 0.35, low: 0.55, medium: 0.8, high: 1, ultra: 1 };

/** How wide each species spreads (m, at scale 1). */
const SPREAD: Partial<Record<PlantSpecies, number>> = {
  saguaro: 1.3,
  cactus: 1.1,
  brush: 0.9,
  palmTall: 2.6,
  palmCluster: 3,
  palmYoung: 1.6,
  fern: 0.9,
};

/**
 * The town's own palms (frame), planted where the eye wants one: at the quay's ends, either side of
 * the caravanserai's gate, and at the square's corners. On every tier.
 */
const TOWN_PALMS: readonly (readonly [number, number, PlantSpecies, number])[] = [
  [-146, 24.5, 'palmTall', 1.05],
  [-238.5, 22, 'palmTall', 0.95],
  [-240.5, 25.5, 'palmYoung', 1],
  [-168.6, 39.2, 'palmTall', 0.9],
  [-155.4, 39.4, 'palmTall', 1],
  [-80.5, 67.5, 'palmTall', 1.1],
  [-78, 33.5, 'palmCluster', 0.9],
  [-123, 34.2, 'palmTall', 0.95],
  [-121.5, 66.8, 'palmYoung', 1.1],
  [-193.5, 40.5, 'palmYoung', 1],
];

/** The island's own functions as a height field (for the tests; the game passes its baked one). */
export const SUNSPIRE_HEIGHT_FIELD: HeightField = {
  heightAt: sunspireHeight,
  normalAt: (x, z, out) => sunspireNormal(x, z, out),
  masksAt: (x, z) => sunspireMasks(x, z),
};

const NORMAL = [0, 0, 0];
const F = { u: 0, v: 0 };

/** The plants, a row of cells per step (the caller spreads the work over frames). */
export function* sunspirePlantsSliced(
  tier: Tier,
  field: HeightField = SUNSPIRE_HEIGHT_FIELD,
): Generator<void, PlantInstance[], void> {
  const out: PlantInstance[] = [];
  const keep = KEEP[tier];
  const water = sunspireWater();
  const heightAt = (x: number, z: number) => field.heightAt(x, z);
  const { minX, maxX, minZ, maxZ } = S.bounds;
  for (let cz = Math.ceil((minZ + 80) / CELL); cz * CELL < maxZ - 80; cz++) {
    for (let cx = Math.ceil((minX + 80) / CELL); cx * CELL < maxX - 80; cx++) {
      for (let k = 0; k < SPOTS; k++) {
        const s = k * 16;
        const x = (cx + sinHash(cx, cz, s + 2)) * CELL;
        const z = (cz + sinHash(cx, cz, s + 3)) * CELL;
        const h = field.heightAt(x, z);
        if (h < 2.2 || h > 150) continue;
        toFrame(x, z, F);
        const oasis = sunspireOasis(F.u, F.v);
        const shore = water.shoreDistance(x, z, 16);
        const bank = 1 - smoothstep(1.5, 8, shore);
        const green = Math.max(oasis, bank * 0.9);
        // The dune field stays bare but for scrub in its hollows.
        const inDunes =
          F.v < DUNES.v1 - 10 && F.u > DUNES.u0 && F.u < DUNES.u1
            ? smoothstep(DUNES.v1 - 10, DUNES.v1 - 60, F.v)
            : 0;
        // Saguaro country: broad patches of the floor and the skirts, well back from the sea.
        const cactusLand =
          smoothstep(0.3, 0.6, fbm2(x / 90, z / 90, 2, 0x5a41) * 0.5 + 0.5) *
          smoothstep(4, 7, h) *
          (1 - inDunes);
        const scrub =
          smoothstep(0.25, 0.6, fbm2(x / 40, z / 40, 2, 0x5a42) * 0.5 + 0.5) * smoothstep(3, 5, h);
        const density = Math.max(green, cactusLand * 0.34, scrub * (0.3 - inDunes * 0.2));
        if (density <= 0.02) continue;
        field.normalAt(x, z, NORMAL);
        const slopeDeg = (Math.acos(Math.min(1, NORMAL[1]!)) * 180) / Math.PI;
        if (slopeDeg > 30) continue;
        const pick = sinHash(cx, cz, s + 4);
        let species: PlantSpecies;
        if (green > 0.3) {
          species =
            pick < 0.3
              ? 'palmTall'
              : pick < 0.5
                ? 'palmCluster'
                : pick < 0.62
                  ? 'palmYoung'
                  : pick < 0.9
                    ? 'fern'
                    : 'brush';
          if (shore < 4 && species !== 'fern') species = 'fern';
        } else if (cactusLand > 0.3 && pick < 0.34) species = 'saguaro';
        else if (pick < 0.62) species = 'brush';
        else species = 'cactus';
        const share = species.startsWith('palm') ? Math.max(0.6, keep) : keep;
        if (sinHash(cx, cz, s + 1) > share * density) continue;
        const m = field.masksAt(x, z);
        if (m.cliff > 0.3 || m.rock > 0.6) continue;
        const r = (SPREAD[species] ?? 1) * 1.1;
        if (shore < r * 0.5 + 0.9) continue;
        if (inBuilt(F.u, F.v, r + 1) || sunspireTrodden(F.u, F.v) > 0.05) continue;
        const scaleRand = sinHash(cx, cz, s + 5);
        const scale =
          species === 'saguaro'
            ? 0.7 + scaleRand * 0.6
            : species.startsWith('palm')
              ? 0.8 + scaleRand * 0.35
              : 0.6 + scaleRand * 0.7;
        const y = lowestOnRing(heightAt, x, z, h, Math.min(1, r * 0.3), 4);
        const tone = smoothstep(0.3, 0.7, fbm2(x * 0.02 - 5.3, z * 0.02 + 1.7, 2, 0x5a43) * 0.5 + 0.5);
        // The palms lean a little away from the prevailing wind (from the south-west).
        const lean = species.startsWith('palm') ? 0.05 + scaleRand * 0.05 : 0;
        out.push({
          species,
          x,
          y: y - 0.1,
          z,
          scale,
          rotation: sinHash(cx, cz, s + 6) * Math.PI * 2,
          leanX: 0.8 * lean + (sinHash(cx, cz, s + 7) - 0.5) * 0.02,
          leanZ: -0.6 * lean + (sinHash(cx, cz, s + 8) - 0.5) * 0.02,
          colorSeed: Math.min(1, Math.max(0, tone * 0.7 + sinHash(cx, cz, s + 9) * 0.3)),
          lodSeed: sinHash(cx, cz, s + 10),
          slopeDeg,
        });
      }
    }
    yield;
  }
  for (const [k, [u, v, species, scale]] of TOWN_PALMS.entries()) {
    const p = toWorld(u, v);
    const h = field.heightAt(p.x, p.z);
    out.push({
      species,
      x: p.x,
      y: lowestOnRing(heightAt, p.x, p.z, h, 0.6, 4) - 0.1,
      z: p.z,
      scale,
      rotation: sinHash(k, 7, 1) * Math.PI * 2,
      leanX: 0.05 + sinHash(k, 7, 2) * 0.04,
      leanZ: -0.04 + (sinHash(k, 7, 3) - 0.5) * 0.03,
      colorSeed: sinHash(k, 7, 4),
      lodSeed: sinHash(k, 7, 5),
      slopeDeg: 0,
    });
  }
  return out;
}

const TINT = new Color();

/**
 * Sunspire's greens: the scrub a dusty grey-olive (creosote and sage), the prickly pear a pale
 * blue-green; null (the shared greens, the saguaro's own and the palms') for the rest.
 */
function plantTint(p: PlantInstance): Color | null {
  if (p.species === 'brush') TINT.setHSL(0.19 + p.colorSeed * 0.05, 0.2, 0.36 + p.colorSeed * 0.1);
  else if (p.species === 'cactus') TINT.setHSL(0.3 + p.colorSeed * 0.04, 0.24, 0.42 + p.colorSeed * 0.08);
  else return null;
  return TINT.clone();
}

export const SUNSPIRE_PLANT_LOOK: PlantPatchLook = {
  handoff: 0.75,
  tint: plantTint,
  cardShade: true,
};

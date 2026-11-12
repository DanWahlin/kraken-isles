import { Color } from 'three/webgpu';
import type { HeightField, Tier } from '../../contracts';
import type { PlantInstance, PlantPatchLook, PlantSpecies } from '../../vegetation/types';
import { fbm2 } from '../../terrain/cove-height';
import { lowestOnRing } from '../../vegetation/scatter';
import { sinHash, smoothstep } from '../../../util/math';
import {
  tidewheelFloor,
  tidewheelHeight,
  tidewheelMasks,
  tidewheelNormal,
  tidewheelTown,
  tidewheelTrodden,
} from './height';
import { TIDEWHEEL as S, toFrame, toWorld } from './layout';
import { inBuilt } from './town';

/**
 * Tidewheel's plants (spec T13): young rock grows little. Dark pines and cypress in small stands on
 * the crater's floor behind the town and above the south shore, scrub and brush in patches, fireweed
 * (the flowering bush) at the stands' edges, and a pine here and there on the talus under the wall.
 * Nothing on the black beach, the town's lanes or its pads. Seeded and pure.
 */

const CELL = 9;
const SPOTS = 2;
/** The plants' share per tier. */
const KEEP: Record<Tier, number> = { lite: 0.35, low: 0.55, medium: 0.8, high: 1, ultra: 1 };

/** How wide each species spreads (m, at scale 1). */
const SPREAD: Partial<Record<PlantSpecies, number>> = {
  cypress: 1.0,
  pineTree: 2.2,
  flowerBush: 1.1,
  shrub: 1.0,
  brush: 0.9,
};

/**
 * The town's own plants (frame), set where the eye wants one: cypress by the Bandstand and at the
 * terraces' west ends, a pine behind the Works. On every tier.
 */
const TOWN_PLANTS: readonly (readonly [number, number, PlantSpecies, number])[] = [
  [-161, 45, 'cypress', 1.2],
  [-139.4, 45, 'cypress', 1.05],
  [-221, 40, 'cypress', 1.25],
  [-218, 62, 'pineTree', 0.8],
  [-214.5, 84, 'cypress', 1.15],
];

/** The island's own functions as a height field (for the tests; the game passes its baked one). */
export const TIDEWHEEL_HEIGHT_FIELD: HeightField = {
  heightAt: tidewheelHeight,
  normalAt: (x, z, out) => tidewheelNormal(x, z, out),
  masksAt: (x, z) => tidewheelMasks(x, z),
};

const NORMAL = [0, 0, 0];
const F = { u: 0, v: 0 };

/** The plants, a row of cells per step (the caller spreads the work over frames). */
export function* tidewheelPlantsSliced(
  tier: Tier,
  field: HeightField = TIDEWHEEL_HEIGHT_FIELD,
): Generator<void, PlantInstance[], void> {
  const out: PlantInstance[] = [];
  const keep = KEEP[tier];
  const heightAt = (x: number, z: number) => field.heightAt(x, z);
  const { minX, maxX, minZ, maxZ } = S.bounds;
  for (let cz = Math.ceil((minZ + 80) / CELL); cz * CELL < maxZ - 80; cz++) {
    for (let cx = Math.ceil((minX + 80) / CELL); cx * CELL < maxX - 80; cx++) {
      for (let k = 0; k < SPOTS; k++) {
        const s = k * 16;
        const x = (cx + sinHash(cx, cz, s + 2)) * CELL;
        const z = (cz + sinHash(cx, cz, s + 3)) * CELL;
        const h = field.heightAt(x, z);
        if (h < 2.6 || h > 150) continue;
        toFrame(x, z, F);
        if (tidewheelTown(F.u, F.v) > 0.2) continue;
        const inside = tidewheelFloor(F.u, F.v);
        // Stands of pine and cypress: broad patches of the floor; scrub between them.
        const stands = smoothstep(0.36, 0.62, fbm2(x / 70, z / 70, 2, 0x7d41) * 0.5 + 0.5) * inside;
        const scrub = smoothstep(0.3, 0.62, fbm2(x / 34, z / 34, 2, 0x7d42) * 0.5 + 0.5);
        const density = Math.max(stands * 0.6, scrub * 0.24, 0.06) * (0.35 + 0.65 * inside);
        field.normalAt(x, z, NORMAL);
        const slopeDeg = (Math.acos(Math.min(1, NORMAL[1]!)) * 180) / Math.PI;
        if (slopeDeg > 32) continue;
        const pick = sinHash(cx, cz, s + 4);
        let species: PlantSpecies;
        if (slopeDeg > 16) species = pick < 0.4 ? 'pineTree' : pick < 0.72 ? 'shrub' : 'brush';
        else if (stands > 0.3)
          species = pick < 0.42 ? 'pineTree' : pick < 0.62 ? 'cypress' : pick < 0.84 ? 'shrub' : 'flowerBush';
        else species = pick < 0.08 ? 'cypress' : pick < 0.2 ? 'flowerBush' : pick < 0.62 ? 'shrub' : 'brush';
        const tree = species === 'cypress' || species === 'pineTree';
        const share = tree ? Math.max(0.6, keep) : keep;
        if (sinHash(cx, cz, s + 1) > share * density) continue;
        const m = field.masksAt(x, z);
        if (m.cliff > 0.3 || m.rock > 0.6 || m.grass < 0.3) continue;
        const r = (SPREAD[species] ?? 1) * 1.1;
        if (inBuilt(F.u, F.v, r + 1.5) || tidewheelTrodden(F.u, F.v) > 0.05) continue;
        const scaleRand = sinHash(cx, cz, s + 5);
        const scale =
          species === 'cypress'
            ? 0.95 + scaleRand * 0.5
            : species === 'pineTree'
              ? 0.7 + scaleRand * 0.35
              : 0.6 + scaleRand * 0.6;
        const y = lowestOnRing(heightAt, x, z, h, Math.min(1, r * 0.3), 4);
        const tone = smoothstep(0.3, 0.7, fbm2(x * 0.02 - 5.3, z * 0.02 + 1.7, 2, 0x7d43) * 0.5 + 0.5);
        out.push({
          species,
          x,
          y: y - 0.1,
          z,
          scale,
          rotation: sinHash(cx, cz, s + 6) * Math.PI * 2,
          leanX: (sinHash(cx, cz, s + 7) - 0.5) * 0.03,
          leanZ: (sinHash(cx, cz, s + 8) - 0.5) * 0.03,
          colorSeed: Math.min(1, Math.max(0, tone * 0.7 + sinHash(cx, cz, s + 9) * 0.3)),
          lodSeed: sinHash(cx, cz, s + 10),
          slopeDeg,
        });
      }
    }
    yield;
  }
  for (const [k, [u, v, species, scale]] of TOWN_PLANTS.entries()) {
    const p = toWorld(u, v);
    const h = field.heightAt(p.x, p.z);
    out.push({
      species,
      x: p.x,
      y: lowestOnRing(heightAt, p.x, p.z, h, 0.6, 4) - 0.1,
      z: p.z,
      scale,
      rotation: sinHash(k, 7, 1) * Math.PI * 2,
      leanX: 0,
      leanZ: 0,
      colorSeed: sinHash(k, 7, 4),
      lodSeed: sinHash(k, 7, 5),
      slopeDeg: 0,
    });
  }
  return out;
}

const TINT = new Color();

/**
 * Tidewheel's greens: the pine and the cypress near black-green (dark against the last light), the
 * flowering bush fireweed's magenta, the scrub a dusty olive; null (the shared greens) for the rest.
 */
function plantTint(p: PlantInstance): Color | null {
  if (p.species === 'pineTree') TINT.setHSL(0.34 + p.colorSeed * 0.03, 0.28, 0.2 + p.colorSeed * 0.06);
  else if (p.species === 'cypress') TINT.setHSL(0.36 + p.colorSeed * 0.02, 0.3, 0.17 + p.colorSeed * 0.05);
  else if (p.species === 'flowerBush') TINT.setHSL(0.9 + p.colorSeed * 0.03, 0.62, 0.44 + p.colorSeed * 0.08);
  else if (p.species === 'brush' || p.species === 'shrub')
    TINT.setHSL(0.2 + p.colorSeed * 0.05, 0.22, 0.3 + p.colorSeed * 0.1);
  else return null;
  return TINT.clone();
}

export const TIDEWHEEL_PLANT_LOOK: PlantPatchLook = {
  handoff: 0.75,
  tint: plantTint,
  cardShade: true,
};

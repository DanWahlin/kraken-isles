import { Color } from 'three/webgpu';
import type { HeightField, Tier } from '../../contracts';
import type { PlantInstance, PlantPatchLook, PlantSpecies } from '../../vegetation/types';
import { fbm2 } from '../../terrain/cove-height';
import { lowestOnRing } from '../../vegetation/scatter';
import { sinHash, smoothstep } from '../../../util/math';
import {
  guildcrestHeight,
  guildcrestMasks,
  guildcrestNormal,
  guildcrestTrodden,
  guildcrestWater,
} from './height';
import { GUILDCREST as G, toFrame } from './layout';
import { PINE_STANDS } from './stands';
import { inBuilt } from './town';

/**
 * Guildcrest's plants (spec §2.2, G13, §10.7): stands of Scots pine on the glen's sides, the knoll's
 * north foot and the hills round the loch, a few broadleaf trees in the glen and by the burns, gorse
 * and broom (shrubs) in banks on the moor's edges, ferns under the pines and along the water, and the
 * moor itself open (its heather is the flora's). No tree high on the moor or the ben (the skyline is
 * hill, not trees), nothing on the town's lanes, its pads or in the abbey. Seeded and pure.
 */

const CELL = 8;
const SPOTS = 3;
/** The pines' share per tier (spec §10.7). */
const KEEP: Record<Tier, number> = { lite: 0.25, low: 0.45, medium: 0.7, high: 1, ultra: 1 };

/** How wide each species spreads (m, at scale 1). */
const SPREAD: Partial<Record<PlantSpecies, number>> = {
  pineTree: 2.6,
  broadleafTree: 3.4,
  shrub: 1.0,
  fern: 0.9,
  brush: 0.9,
};

/** The island's own functions as a height field (for the tests; the game passes its baked one). */
export const GUILDCREST_HEIGHT_FIELD: HeightField = {
  heightAt: guildcrestHeight,
  normalAt: (x, z, out) => guildcrestNormal(x, z, out),
  masksAt: (x, z) => guildcrestMasks(x, z),
};

const NORMAL = [0, 0, 0];
const F = { u: 0, v: 0 };

/** How much a frame point sits in a pine stand (0 out, 1 in its heart). */
function standAt(u: number, v: number, x: number, z: number): number {
  let best = 0;
  for (const s of PINE_STANDS) {
    const d = ((u - s.u) / s.ru) ** 2 + ((v - s.v) / s.rv) ** 2;
    best = Math.max(best, 1 - smoothstep(0.55, 1.1, d + 0.25 * fbm2(x / 30, z / 30, 2, 0x6c41)));
  }
  return best;
}

/** The plants, a row of cells per step (the caller spreads the work over frames). */
export function* guildcrestPlantsSliced(
  tier: Tier,
  field: HeightField = GUILDCREST_HEIGHT_FIELD,
): Generator<void, PlantInstance[], void> {
  const out: PlantInstance[] = [];
  const keep = KEEP[tier];
  const water = guildcrestWater();
  const heightAt = (x: number, z: number) => field.heightAt(x, z);
  const { minX, maxX, minZ, maxZ } = G.bounds;
  for (let cz = Math.ceil((minZ + 80) / CELL); cz * CELL < maxZ - 80; cz++) {
    for (let cx = Math.ceil((minX + 80) / CELL); cx * CELL < maxX - 80; cx++) {
      for (let k = 0; k < SPOTS; k++) {
        const s = k * 16;
        const x = (cx + sinHash(cx, cz, s + 2)) * CELL;
        const z = (cz + sinHash(cx, cz, s + 3)) * CELL;
        const h = field.heightAt(x, z);
        if (h < 1.6 || h > 120) continue;
        toFrame(x, z, F);
        const stand = standAt(F.u, F.v, x, z);
        const shore = water.shoreDistance(x, z, 16);
        const bank = 1 - smoothstep(2, 10, shore);
        // Gorse banks on the moor's lower slopes (broad patches), thin elsewhere.
        const gorse =
          smoothstep(0.35, 0.6, fbm2(x / 55, z / 55, 2, 0x6c42) * 0.5 + 0.5) * (1 - smoothstep(60, 90, h));
        const density = Math.max(stand, bank * 0.7, gorse * 0.35);
        if (density <= 0.02) continue;
        field.normalAt(x, z, NORMAL);
        const slopeDeg = (Math.acos(Math.min(1, NORMAL[1]!)) * 180) / Math.PI;
        if (slopeDeg > 38) continue;
        const pick = sinHash(cx, cz, s + 4);
        let species: PlantSpecies | null = null;
        if (stand > 0.3 && slopeDeg < 32 && h < 95)
          species = pick < 0.82 ? 'pineTree' : pick < 0.9 ? 'fern' : 'shrub';
        else if (bank > 0.3)
          species = pick < 0.25 && h < 50 ? 'broadleafTree' : pick < 0.75 ? 'fern' : 'shrub';
        else if (gorse > 0.3) species = pick < 0.7 ? 'shrub' : 'brush';
        if (!species) continue;
        const share =
          species === 'pineTree'
            ? keep
            : species === 'broadleafTree'
              ? Math.max(0.3, keep)
              : Math.min(1, keep + 0.2);
        if (sinHash(cx, cz, s + 1) > share * density) continue;
        const m = field.masksAt(x, z);
        if (m.cliff > 0.3 || m.rock > 0.55 || m.sand > 0.5) continue;
        const r = (SPREAD[species] ?? 1) * 1.1;
        if (shore < r * 0.6 + 1.2) continue;
        if (inBuilt(F.u, F.v, r + 1) || guildcrestTrodden(F.u, F.v) > 0.05) continue;
        const scaleRand = sinHash(cx, cz, s + 5);
        const scale =
          species === 'pineTree'
            ? 0.75 + scaleRand * 0.5
            : species === 'broadleafTree'
              ? 0.7 + scaleRand * 0.4
              : 0.7 + scaleRand * 0.6;
        const y = lowestOnRing(heightAt, x, z, h, Math.min(1, r * 0.3), 4);
        const tone = smoothstep(0.3, 0.7, fbm2(x * 0.02 - 5.3, z * 0.02 + 1.7, 2, 0x6c43) * 0.5 + 0.5);
        // The pines lean a little away from the prevailing wind (from the south-west).
        const lean = species === 'pineTree' ? 0.06 + scaleRand * 0.05 : 0;
        out.push({
          species,
          x,
          y: y - 0.12,
          z,
          scale,
          rotation: sinHash(cx, cz, s + 6) * Math.PI * 2,
          leanX: 0.8 * lean + (sinHash(cx, cz, s + 7) - 0.5) * 0.03,
          leanZ: -0.6 * lean + (sinHash(cx, cz, s + 8) - 0.5) * 0.03,
          colorSeed: Math.min(1, Math.max(0, tone * 0.7 + sinHash(cx, cz, s + 9) * 0.3)),
          lodSeed: sinHash(cx, cz, s + 10),
          slopeDeg,
        });
      }
    }
    yield;
  }
  return out;
}

export function guildcrestPlants(tier: Tier, field: HeightField = GUILDCREST_HEIGHT_FIELD): PlantInstance[] {
  const steps = guildcrestPlantsSliced(tier, field);
  for (;;) {
    const r = steps.next();
    if (r.done) return r.value;
  }
}

const TINT = new Color();

/**
 * Guildcrest's greens: the broadleaf a cool, slightly blue green; the shrubs as gorse (dark green with
 * a yellow cast) and broom; null (the shared greens, and the pines' own dark crowns) for the rest.
 */
function plantTint(p: PlantInstance): Color | null {
  if (p.species === 'broadleafTree') TINT.setHSL(0.3 + p.colorSeed * 0.05, 0.28, 0.3 + p.colorSeed * 0.12);
  else if (p.species === 'shrub') TINT.setHSL(0.19 + p.colorSeed * 0.04, 0.45, 0.32 + p.colorSeed * 0.12);
  else return null;
  return TINT.clone();
}

export const GUILDCREST_PLANT_LOOK: PlantPatchLook = {
  simplify: { broadleafTree: 0.12 },
  handoff: 0.75,
  tint: plantTint,
  cardShade: true,
};

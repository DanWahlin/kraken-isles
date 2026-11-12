import { Color } from 'three/webgpu';
import type { HeightField, Tier } from '../../contracts';
import type { PlantInstance, PlantPatchLook, PlantSpecies } from '../../vegetation/types';
import { fbm2 } from '../../terrain/cove-height';
import { lowestOnRing } from '../../vegetation/scatter';
import { sinHash, smoothstep } from '../../../util/math';
import {
  inkwellHeight,
  inkwellMasks,
  inkwellNormal,
  inkwellTown,
  inkwellTrodden,
  inkwellValley,
} from './height';
import { BLUFF, DOME_HEAD, INKWELL as S, toFrame, toWorld } from './layout';
import { inBuilt } from './town';

/**
 * Inkwell's plants (spec I12): olive (the broadleaf tree, small and grey-green) in loose groves in the
 * valley and on Olive Hill, dark cypress in ones and twos on the bluff's top and along the valley's
 * lanes, pines on the skirts under the wall, flowering bushes and scrub at the meadow's edges, and
 * palms only at the quay. Nothing on the beaches, the town's lanes or its pads. Seeded and pure.
 */

const CELL = 9;
const SPOTS = 2;
/** The plants' share per tier. */
const KEEP: Record<Tier, number> = { lite: 0.35, low: 0.55, medium: 0.8, high: 1, ultra: 1 };

/** How wide each species spreads (m, at scale 1). */
const SPREAD: Partial<Record<PlantSpecies, number>> = {
  broadleafTree: 2.6,
  cypress: 1.0,
  pineTree: 2.2,
  flowerBush: 1.1,
  shrub: 1.0,
  brush: 0.9,
  palmTall: 2.6,
  palmYoung: 1.6,
};

/**
 * The town's own plants (frame), set where the eye wants one: palms at the quay's ends, cypress by the
 * taverna, on the terraces' ends and round the Plaza, flowering bushes at the stair's landings. On
 * every tier.
 */
const TOWN_PLANTS: readonly (readonly [number, number, PlantSpecies, number])[] = [
  [-146, 24.5, 'palmTall', 1.0],
  [-238.5, 22, 'palmTall', 0.95],
  [-240.5, 25.5, 'palmYoung', 1],
  [-162.5, 44.5, 'cypress', 1.25],
  [-137.5, 44.5, 'cypress', 1.1],
  [-129, 64.5, 'cypress', 1.2],
  [-98.5, 66.5, 'flowerBush', 1.1],
  [-126.5, 55.5, 'flowerBush', 1.0],
  [-70, 86.5, 'cypress', 1.15],
  [-98, 84.5, 'flowerBush', 1.1],
  [-70.5, 113.5, 'cypress', 1.3],
  [-22, 110, 'cypress', 1.2],
  [-21.5, 142.5, 'cypress', 1.35],
  [-68, 144, 'cypress', 1.25],
  [-90.5, 125.5, 'cypress', 1.2],
  [-55, 152, 'flowerBush', 1.0],
  [106, 148.5, 'cypress', 1.3],
  [106.5, 116, 'cypress', 1.2],
  [161.5, 136, 'cypress', 1.15],
  [196, 92, 'cypress', 1.25],
  [215.5, 112.5, 'cypress', 1.2],
];

/** The island's own functions as a height field (for the tests; the game passes its baked one). */
export const INKWELL_HEIGHT_FIELD: HeightField = {
  heightAt: inkwellHeight,
  normalAt: (x, z, out) => inkwellNormal(x, z, out),
  masksAt: (x, z) => inkwellMasks(x, z),
};

const NORMAL = [0, 0, 0];
const F = { u: 0, v: 0 };

/** The plants, a row of cells per step (the caller spreads the work over frames). */
export function* inkwellPlantsSliced(
  tier: Tier,
  field: HeightField = INKWELL_HEIGHT_FIELD,
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
        if (inkwellTown(F.u, F.v) > 0.2) continue;
        // The bluff's top (and the Dome head's): open turf with a cypress here and there.
        let onTop = Math.hypot(F.u - DOME_HEAD.u, F.v - DOME_HEAD.v) < DOME_HEAD.r - 2;
        for (const d of BLUFF) if (Math.hypot(F.u - d.u, F.v - d.v) < d.r - 3) onTop = true;
        const valley = inkwellValley(F.u, F.v);
        // Olive groves: broad patches of the valley and the hill.
        const groves = smoothstep(0.3, 0.6, fbm2(x / 80, z / 80, 2, 0x1b41) * 0.5 + 0.5) * valley;
        const scrub = smoothstep(0.3, 0.62, fbm2(x / 38, z / 38, 2, 0x1b42) * 0.5 + 0.5);
        const density = onTop ? 0.07 : Math.max(groves * 0.75, scrub * 0.3, 0.1);
        field.normalAt(x, z, NORMAL);
        const slopeDeg = (Math.acos(Math.min(1, NORMAL[1]!)) * 180) / Math.PI;
        if (slopeDeg > 32) continue;
        const pick = sinHash(cx, cz, s + 4);
        let species: PlantSpecies;
        if (onTop) species = pick < 0.7 ? 'cypress' : 'flowerBush';
        else if (slopeDeg > 14) species = pick < 0.45 ? 'pineTree' : pick < 0.75 ? 'shrub' : 'brush';
        else if (groves > 0.3)
          species =
            pick < 0.5 ? 'broadleafTree' : pick < 0.64 ? 'cypress' : pick < 0.84 ? 'shrub' : 'flowerBush';
        else species = pick < 0.16 ? 'cypress' : pick < 0.3 ? 'pineTree' : pick < 0.7 ? 'shrub' : 'brush';
        const tree = species === 'broadleafTree' || species === 'cypress' || species === 'pineTree';
        const share = tree ? Math.max(0.6, keep) : keep;
        if (sinHash(cx, cz, s + 1) > share * density) continue;
        const m = field.masksAt(x, z);
        if (m.cliff > 0.3 || m.rock > 0.6 || m.grass < 0.3) continue;
        const r = (SPREAD[species] ?? 1) * 1.1;
        if (inBuilt(F.u, F.v, r + 1.5) || inkwellTrodden(F.u, F.v) > 0.05) continue;
        const scaleRand = sinHash(cx, cz, s + 5);
        const scale =
          species === 'broadleafTree'
            ? 0.5 + scaleRand * 0.22
            : species === 'cypress'
              ? 0.95 + scaleRand * 0.5
              : species === 'pineTree'
                ? 0.7 + scaleRand * 0.35
                : 0.6 + scaleRand * 0.6;
        const y = lowestOnRing(heightAt, x, z, h, Math.min(1, r * 0.3), 4);
        const tone = smoothstep(0.3, 0.7, fbm2(x * 0.02 - 5.3, z * 0.02 + 1.7, 2, 0x1b43) * 0.5 + 0.5);
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
      leanX: species.startsWith('palm') ? 0.05 + sinHash(k, 7, 2) * 0.04 : 0,
      leanZ: species.startsWith('palm') ? -0.04 + (sinHash(k, 7, 3) - 0.5) * 0.03 : 0,
      colorSeed: sinHash(k, 7, 4),
      lodSeed: sinHash(k, 7, 5),
      slopeDeg: 0,
    });
  }
  return out;
}

const TINT = new Color();

/**
 * Inkwell's greens: the olive a silver grey-green, the cypress near black-green, the flowering bush
 * bougainvillea's magenta, the scrub a dusty sage; null (the shared greens) for the rest.
 */
function plantTint(p: PlantInstance): Color | null {
  if (p.species === 'broadleafTree') TINT.setHSL(0.21 + p.colorSeed * 0.03, 0.18, 0.44 + p.colorSeed * 0.08);
  else if (p.species === 'cypress') TINT.setHSL(0.36 + p.colorSeed * 0.02, 0.3, 0.2 + p.colorSeed * 0.05);
  else if (p.species === 'flowerBush') TINT.setHSL(0.9 + p.colorSeed * 0.04, 0.6, 0.46 + p.colorSeed * 0.08);
  else if (p.species === 'brush' || p.species === 'shrub')
    TINT.setHSL(0.22 + p.colorSeed * 0.05, 0.24, 0.36 + p.colorSeed * 0.1);
  else return null;
  return TINT.clone();
}

export const INKWELL_PLANT_LOOK: PlantPatchLook = {
  handoff: 0.75,
  tint: plantTint,
  cardShade: true,
};

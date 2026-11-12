import {
  createFreshWater,
  type FreshWater,
  type FreshWaterSpec,
  type StreamSpec,
  type WaterBasinSpec,
} from '../meridian-water';
import { toWorld, WATER } from './layout';

/**
 * Sunspire's fresh water (`WATER` in layout.ts; spec S13): the cistern (a spring) by the Low Mesa's
 * south rim, a short run along a slot in the rim to the Weeping Wall's lip, the fall into the oasis
 * pool, and the falaj from the pool to the cove's head. Pure data and maths (no three.js), carved
 * into the island's uncarved height.
 */

export type SsBasin = 'cistern' | 'pool';

const xz = (u: number, v: number): [number, number] => {
  const p = toWorld(u, v);
  return [p.x, p.z];
};

function spec(): FreshWaterSpec<SsBasin> {
  const c = WATER.cistern;
  const p = WATER.pool;
  const [cx, cz] = xz(c.u, c.v);
  const [px, pz] = xz(p.u, p.v);
  const cistern: WaterBasinSpec = {
    x: cx,
    z: cz,
    rx: c.r,
    rz: c.r * 0.7,
    rot: 0.4,
    depth: 1.1,
    level: c.y,
    phase: 0.7,
    cut: 0.8,
    levee: 0.4,
  };
  const pool: WaterBasinSpec = {
    x: px,
    z: pz,
    rx: p.r,
    rz: p.r * 0.72,
    rot: -0.5,
    depth: 1.4,
    level: p.y,
    phase: 2.4,
    cut: 0.9,
    levee: 0.6,
  };
  const lip = WATER.fallLip;
  const streams: StreamSpec[] = [
    {
      // Out of the cistern, along the slot in the rim, over the Weeping Wall into the pool.
      points: [[cx, cz], ...WATER.canyon.map(([u, v]) => xz(u, v)), xz(lip.u, lip.v), [px, pz]],
      halfWidth: 1.5,
      depth: 0.4,
      minFall: 0.02,
      bank: 0.35,
      from: 'cistern',
      to: 'pool',
      levee: 3,
      course: {
        seed: 0x5a05,
        meander: 1.2,
        wavelength: 30,
        minHalf: 1.2,
        maxHalf: 1.8,
        grade: 1.6,
        // Straight over the lip (the wall weeps as one sheet).
        pins: [{ ...toWorld(lip.u, lip.v), r: 8, half: 1.5 }],
      },
    },
    {
      // The falaj: from the pool past the camp to the cove's head.
      points: [[px, pz], ...WATER.falaj.map(([u, v]) => xz(u, v))],
      halfWidth: 1.3,
      depth: 0.35,
      minFall: 0.01,
      bank: 0.3,
      from: 'pool',
      to: 'sea',
      course: { seed: 0x5a15, meander: 0.8, wavelength: 40, minHalf: 1.1, maxHalf: 1.5, grade: 0.25 },
    },
  ];
  return { basins: { cistern, pool }, streams };
}

export const SUNSPIRE_WATER_SPEC: FreshWaterSpec<SsBasin> = spec();

export type SunspireWater = FreshWater<SsBasin>;

export function createSunspireWater(dry: (x: number, z: number) => number): SunspireWater {
  return createFreshWater(SUNSPIRE_WATER_SPEC, dry);
}

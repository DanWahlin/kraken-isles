import {
  createFreshWater,
  type FreshWater,
  type FreshWaterSpec,
  type StreamSpec,
  type WaterBasinSpec,
} from '../meridian-water';
import { toWorld, WATER } from './layout';

/**
 * Guildcrest's fresh water (`WATER` in layout.ts; spec §3.3, as built §15): the lochan on the knoll's
 * back, the Scriptor's Burn down the glen to the linn's lip, the Copyist's Linn down its crag into the
 * pool at its foot, and the lower burn from the pool past the square to the loch's head. Pure data and
 * maths (no three.js), carved into the island's uncarved height.
 */

export type GcBasin = 'lochan' | 'linnPool';

const xz = (u: number, v: number): [number, number] => {
  const p = toWorld(u, v);
  return [p.x, p.z];
};

function spec(): FreshWaterSpec<GcBasin> {
  const l = WATER.lochan;
  const p = WATER.linnPool;
  const [lx, lz] = xz(l.u, l.v);
  const [px, pz] = xz(p.u, p.v);
  const lochan: WaterBasinSpec = {
    x: lx,
    z: lz,
    rx: l.r,
    rz: l.r * 0.75,
    rot: 0.5,
    depth: 1.2,
    level: l.y,
    phase: 0.7,
    cut: 0.7,
    levee: 0.5,
  };
  const linnPool: WaterBasinSpec = {
    x: px,
    z: pz,
    rx: p.r,
    rz: p.r * 0.8,
    rot: -0.3,
    depth: 1.3,
    level: p.y,
    phase: 2.4,
    cut: 0.9,
    levee: 0.6,
  };
  const lip = WATER.linnLip;
  const streams: StreamSpec[] = [
    {
      // The Scriptor's Burn: out of the lochan, down the glen, over the linn's crag into its pool.
      points: [[lx, lz], ...WATER.burn.map(([u, v]) => xz(u, v)), xz(lip.u, lip.v), [px, pz]],
      halfWidth: 1.8,
      depth: 0.4,
      minFall: 0.02,
      bank: 0.35,
      from: 'lochan',
      to: 'linnPool',
      levee: 3,
      course: {
        seed: 0x6c04,
        meander: 3,
        wavelength: 40,
        minHalf: 1.5,
        maxHalf: 2.5,
        grade: 1.6,
        // Straight over the lip (the linn falls as one sheet).
        pins: [{ ...pointAt(lip.u, lip.v), r: 8, half: 1.6 }],
      },
    },
    {
      // The lower burn: from the pool past the square's south-east corner to the loch's head.
      points: [[px, pz], ...WATER.lowerBurn.map(([u, v]) => xz(u, v))],
      halfWidth: 2,
      depth: 0.4,
      minFall: 0.01,
      bank: 0.35,
      from: 'linnPool',
      to: 'sea',
      course: { seed: 0x6c14, meander: 2.5, wavelength: 34, minHalf: 1.6, maxHalf: 2.4, grade: 0.25 },
    },
  ];
  return { basins: { lochan, linnPool }, streams };
}

function pointAt(u: number, v: number): { x: number; z: number } {
  return toWorld(u, v);
}

export const GUILDCREST_WATER_SPEC: FreshWaterSpec<GcBasin> = spec();

export type GuildcrestWater = FreshWater<GcBasin>;

export function createGuildcrestWater(dry: (x: number, z: number) => number): GuildcrestWater {
  return createFreshWater(GUILDCREST_WATER_SPEC, dry);
}

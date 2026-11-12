import type { HeightField } from '../world/contracts';
import type { TierSettings } from '../engine/quality';
import type { FloraRules } from '../world/flora/types';
import { createInkwellWorldAsync, type InkwellWorld } from '../world/islands/inkwell';
import { INKWELL_FLORA } from '../world/islands/inkwell/flora';
import { INKWELL, toWorld as iwWorld } from '../world/islands/inkwell/layout';
import { INKWELL_PLANT_LOOK } from '../world/islands/inkwell/vegetation';
import { createSunspireWorldAsync, type SunspireWorld } from '../world/islands/sunspire';
import { SUNSPIRE_FLORA } from '../world/islands/sunspire/flora';
import { sunspireTerrainWater } from '../world/islands/sunspire/height';
import { SUNSPIRE, toWorld as ssWorld } from '../world/islands/sunspire/layout';
import { SUNSPIRE_PLANT_LOOK } from '../world/islands/sunspire/vegetation';
import { createTidewheelWorldAsync, type TidewheelWorld } from '../world/islands/tidewheel';
import { RING_HOURS } from '../world/islands/tidewheel/circuit';
import { TIDEWHEEL_FLORA } from '../world/islands/tidewheel/flora';
import { TIDEWHEEL, toWorld as twWorld } from '../world/islands/tidewheel/layout';
import { TIDEWHEEL_PLANT_LOOK } from '../world/islands/tidewheel/vegetation';
import type { TerrainFreshWater } from '../world/terrain/water-caps';
import type { PlantPatchLook } from '../world/vegetation/types';
import type { VillageKit } from '../world/village/kit';

/**
 * The cove islands in the island viewer (src/dev/terrain.ts): each one's layout, its views in its own
 * frame, how its world is made, and what the viewer's URL can set on it. A new cove island adds its
 * row here; the viewer itself names none of them.
 */

/** A view in an island's frame: the eye at (u, v, y), looking at (u, v, y). */
type FrameView = readonly [eye: readonly [number, number, number], target: readonly [number, number, number]];
/** A view whose eye stands on the ground: the eye at (u, v), `above` the ground, looking at (u, v, y). */
type GroundView = readonly [
  eye: readonly [number, number, number],
  target: readonly [number, number, number],
];

/** What the viewer drives of an island's world. */
interface ViewedWorld {
  group: InkwellWorld['group'];
  frame: InkwellWorld['frame'];
  update(dt: number, t: number): void;
  birds: InkwellWorld['birds'];
  plants: InkwellWorld['plants'];
}

export interface FrameIslandView<W extends ViewedWorld = ViewedWorld> {
  layout: {
    sky: { hours: number; azimuth: number };
    mood: { fogScale: number; hazeTint: readonly [number, number, number]; fill?: number; exposure?: number };
    terrain: {
      prefilter: boolean;
      maxMergedTriangles: number;
      morphFrames: number;
      seabed: { below: number; level: number };
    };
  };
  toWorld(u: number, v: number): { x: number; z: number };
  /** Its fresh water for the terrain's far levels (none: left out). */
  freshWater?: () => TerrainFreshWater;
  views: Record<string, FrameView>;
  groundViews: Record<string, GroundView>;
  create(
    o: { tier: TierSettings; heightField: HeightField; kit: VillageKit },
    breathe: () => Promise<void>,
  ): Promise<W>;
  flora: FloraRules;
  plantLook: PlantPatchLook;
  /** Sets the world from the viewer's URL (`?show=`, `?aim=`, …). */
  apply?(world: W, q: URLSearchParams): void;
}

const view = <W extends ViewedWorld>(v: FrameIslandView<W>) => v as unknown as FrameIslandView;

/** `?show=a,b`: the story states to show. */
const shows = (q: URLSearchParams) => (q.get('show') ?? '').split(',').filter(Boolean);

export const FRAME_ISLAND_VIEWS: Readonly<Record<string, FrameIslandView>> = {
  // `?aim=<n>` turns the court's mirror to a bearing with its beam on.
  sunspire: view<SunspireWorld>({
    layout: SUNSPIRE,
    toWorld: ssWorld,
    freshWater: sunspireTerrainWater,
    views: {
      // The hero shots (spec §2.1) and the progress set.
      approach: [
        [-760, -40, 24],
        [60, 40, 50],
      ],
      harbour: [
        [-232, 8, 30],
        [-120, 46, 8],
      ],
      bazaar: [
        [-136, 30, 16],
        [-96, 52, 10],
      ],
      oasis: [
        [-52, -2, 16],
        [16, -24, 14],
      ],
      court: [
        [62, 78, 34],
        [130, 70, 50],
      ],
      spire: [
        [168, 66, 50],
        [206, 84, 74],
      ],
      aerial: [
        [-620, -260, 420],
        [40, 20, 20],
      ],
      top: [
        [4, 4, 1150],
        [0, 0, 0],
      ],
      'from-south': [
        [120, -760, 30],
        [80, 0, 50],
      ],
      'from-east': [
        [820, 40, 40],
        [200, 40, 60],
      ],
      horizon: [
        [-1250, -60, 30],
        [40, 40, 60],
      ],
      rock: [
        [-220, 380, 20],
        [-120, 520, 24],
      ],
    },
    groundViews: {
      landing: [
        [-192, 15, 1.7],
        [60, 70, 40],
      ],
      'quay-lane': [
        [-170, 30, 1.7],
        [-100, 50, 11],
      ],
      square: [
        [-116, 44, 1.7],
        [206, 84, 70],
      ],
      camp: [
        [-44, 2, 1.7],
        [22, -30, 20],
      ],
      stair: [
        [-76, 62, 1.7],
        [30, 92, 30],
      ],
      'mesa-top': [
        [40, 90, 1.7],
        [206, 84, 70],
      ],
      'sun-stair': [
        [138, 36, 1.7],
        [206, 84, 76],
      ],
      terrace: [
        [184, 78, 1.7],
        [206, 84, 80],
      ],
      dunes: [
        [-60, -150, 1.7],
        [120, -260, 12],
      ],
      beach: [
        [-250, -140, 1.7],
        [-60, -200, 10],
      ],
    },
    create: createSunspireWorldAsync,
    flora: SUNSPIRE_FLORA,
    plantLook: SUNSPIRE_PLANT_LOOK,
    apply(world, q) {
      if (!q.has('aim')) return;
      world.aim(Number(q.get('aim')), true);
      world.beam(true);
    },
  }),
  // `?show=<state>,…` shows story states (`borrowed`, `shared`, `inked`, `sealed`), and `?marker=<n>`
  // sets the rail's marker.
  inkwell: view<InkwellWorld>({
    layout: INKWELL,
    toWorld: iwWorld,
    views: {
      approach: [
        [-760, -40, 24],
        [60, 80, 36],
      ],
      harbour: [
        [-236, 2, 26],
        [-110, 70, 12],
      ],
      stair: [
        [-140, 34, 9],
        [-80, 90, 20],
      ],
      plaza: [
        [-84, 100, 38],
        [-40, 134, 24],
      ],
      walk: [
        [-30, 118, 34],
        [134, 136, 40],
      ],
      court: [
        [96, 104, 52],
        [150, 128, 40],
      ],
      dome: [
        [176, 124, 50],
        [226, 94, 70],
      ],
      cliff: [
        [40, 330, 18],
        [110, 180, 26],
      ],
      aerial: [
        [-620, -260, 420],
        [40, 20, 20],
      ],
      top: [
        [4, 4, 1150],
        [0, 0, 0],
      ],
      'from-south': [
        [120, -760, 30],
        [80, 0, 40],
      ],
      'from-east': [
        [820, 40, 40],
        [200, 60, 50],
      ],
      'from-north': [
        [-80, 760, 40],
        [40, 140, 30],
      ],
      horizon: [
        [-1250, -60, 30],
        [40, 60, 40],
      ],
    },
    groundViews: {
      landing: [
        [-192, 15, 1.7],
        [60, 110, 34],
      ],
      'quay-lane': [
        [-176, 28, 1.7],
        [-110, 62, 12],
      ],
      square: [
        [-120, 58, 1.7],
        [-70, 100, 24],
      ],
      'stair-top': [
        [-62, 104, 1.7],
        [-40, 130, 26],
      ],
      'plaza-view': [
        [-46, 112, 1.7],
        [-190, 0, 0],
      ],
      terrace: [
        [-40, 152, 1.7],
        [100, 266, 20],
      ],
      'kite-walk': [
        [10, 138, 1.7],
        [226, 94, 70],
      ],
      'chart-court': [
        [112, 138, 1.7],
        [226, 94, 72],
      ],
      'dome-terrace': [
        [203, 102, 1.7],
        [226, 94, 72],
      ],
      beach: [
        [-250, -140, 1.7],
        [-60, -200, 10],
      ],
      valley: [
        [-20, -20, 1.7],
        [134, 132, 44],
      ],
    },
    create: createInkwellWorldAsync,
    flora: INKWELL_FLORA,
    plantLook: INKWELL_PLANT_LOOK,
    apply(world, q) {
      for (const what of shows(q)) world.show(what as Parameters<InkwellWorld['show']>[0], true);
      if (q.has('marker')) world.marker(Number(q.get('marker')), true);
    },
  }),
  // `?show=<state>,…` shows story states (`ran`, `scheduled`, `sealed`; `sealed` lights the lamp),
  // `?ring=<hour>` sets the clock ring, and `?pull` runs the Works.
  tidewheel: view<TidewheelWorld>({
    layout: TIDEWHEEL,
    toWorld: twWorld,
    views: {
      approach: [
        [-800, -44, 20],
        [-34, -31, 56],
      ],
      breach: [
        [-600, -36, 12],
        [-34, -31, 50],
      ],
      wheel: [
        [-470, -20, 10],
        [-505, 33, 10],
      ],
      harbour: [
        [-262, -18, 18],
        [-130, 60, 16],
      ],
      town: [
        [-200, 8, 14],
        [-130, 70, 14],
      ],
      square: [
        [-124, 50, 17],
        [-110, 66, 13.5],
      ],
      works: [
        [-118, 100, 36],
        [-138, 124, 28],
      ],
      court: [
        [-84, 68, 44],
        [-60, 46, 38],
      ],
      light: [
        [-78, -10, 52],
        [-34, -31, 62],
      ],
      clock: [
        [-62, 44, 40],
        [-34, -31, 64],
      ],
      springs: [
        [-250, -196, 12],
        [-292, -232, 6],
      ],
      aerial: [
        [-700, -300, 380],
        [-262, -30, 10],
      ],
      top: [
        [-258, -26, 900],
        [-262, -30, 0],
      ],
      'from-south': [
        [-240, -720, 30],
        [-262, -30, 40],
      ],
      'from-east': [
        [420, -20, 40],
        [-262, -30, 40],
      ],
      'from-north': [
        [-300, 680, 40],
        [-262, -30, 40],
      ],
      horizon: [
        [-1350, -60, 30],
        [-262, -30, 40],
      ],
    },
    groundViews: {
      landing: [
        [-192, 15, 1.7],
        [-34, -20, 50],
      ],
      'quay-lane': [
        [-176, 28, 1.7],
        [-110, 62, 12],
      ],
      band: [
        [-150, 32, 1.7],
        [-150, 42, 5],
      ],
      'gear-square': [
        [-118, 57, 1.7],
        [-110, 68, 14],
      ],
      bounty: [
        [-100, 82, 1.7],
        [-108, 90, 21],
      ],
      'works-yard': [
        [-127, 115, 1.7],
        [-140, 126, 29],
      ],
      'clock-walk': [
        [-100, 116, 1.7],
        [-34, -31, 60],
      ],
      'clock-court': [
        [-70, 58, 1.7],
        [-34, -31, 64],
      ],
      terrace: [
        [-54, -20, 1.7],
        [-34, -31, 60],
      ],
      'terrace-view': [
        [-50, -24, 1.7],
        [-505, -30, 10],
      ],
      beach: [
        [-150, -108, 1.7],
        [-300, -40, 10],
      ],
      springs: [
        [-266, -212, 1.7],
        [-300, -236, 7],
      ],
    },
    create: createTidewheelWorldAsync,
    flora: TIDEWHEEL_FLORA,
    plantLook: TIDEWHEEL_PLANT_LOOK,
    apply(world, q) {
      for (const what of shows(q)) {
        world.show(what as Parameters<TidewheelWorld['show']>[0], true);
        if (what === 'sealed') world.setSealLit(true);
      }
      if (q.has('ring')) world.ring((RING_HOURS as readonly number[]).indexOf(Number(q.get('ring'))), true);
      if (q.has('pull')) world.pull(600);
    },
  }),
};

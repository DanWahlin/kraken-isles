import { BufferAttribute, Color, Group, type BufferGeometry, type Camera, type Material } from 'three/webgpu';
import type { TierSettings } from '../../engine/quality';
import type { IslandId } from '../../islands/registry';
import { islandCourseBoard } from '../../learn/course-board';
import { loadLodSimplifier } from '../characters/character-lod';
import { addCourseBoardNotices, addCourseBoardTimber } from '../sites/course-board';
import { SignSet } from '../sites/sign';
import { ChunkLods, chunkLodEdges, chunkLodFloor } from '../village/chunks';
import type { VillageKit } from '../village/kit';
import { LampSet, type LampLook } from '../village/lamp-set';
import { meshesFromBuckets, type Buckets } from '../village/pieces';
import { COURSE_BOARDS } from './course-boards';
import type { IslandOut } from './frame-build';
import { addIslandLettering } from './lettering';

/**
 * What every frame island's world does with its built pieces, in one place: the course notice board,
 * the lettering, the town's chunks with their levels of detail, and the lamps that change. An
 * island's `index.ts` builds its pieces into the kit's buckets, hands them here, and keeps only what
 * is its own (a mirror that turns, kites, a mill's sails).
 */

/** The circuits' lamps (the game's puzzle drives them; nothing here keeps time). */
export interface IslandCircuitWorld {
  lamp(key: string, look: LampLook): void;
  look(key: string): LampLook | null;
}

/** The island's standing works, raised from its buckets. */
export interface IslandWorks<S extends string> {
  /** The lamps that change, one mesh in the kit's glow. */
  lamps: LampSet;
  circuit: IslandCircuitWorld;
  /** Shows or hides the lettering the story shows (a hanging cloth unrolls with `unroll`). */
  show(what: S, on: boolean, unroll?: boolean): void;
  showing(what: S): boolean;
  /** Unrolls cloth. */
  update(dt: number): void;
  /** Picks the chunks' levels of detail for the camera (no allocation). */
  frame(camera: Camera): void;
  dispose(): void;
}

export interface IslandWorksOptions<S extends string> {
  /** The island: its sign set's name, its course board and its words. */
  id: IslandId;
  /** The town chunks' name (`ss-town`). */
  chunks: string;
  tier: TierSettings;
  kit: VillageKit;
  /** The world's group: the town, the signs and the lamps go into it. */
  group: Group;
  buckets: Buckets;
  out: IslandOut<S>;
}

/**
 * Raises the island's works from its buckets, a few milliseconds a frame: the course notice board
 * (docs/specs/COURSE-BOARDS.md: its timber in the town's chunks, its notices in the island's sign
 * set; none without a course, as on the dev page), the lettering, the town's meshes, and the lamps.
 */
export async function raiseIslandWorks<S extends string>(
  o: IslandWorksOptions<S>,
  breathe: () => Promise<void>,
): Promise<IslandWorks<S>> {
  const { id, group, buckets, out } = o;
  const signs = typeof document === 'undefined' ? null : new SignSet(`${id}-signs`);
  const courseBoard = signs ? islandCourseBoard(id) : null;
  const pose = COURSE_BOARDS[id];
  if (signs && courseBoard && pose) {
    const parts = addCourseBoardTimber(buckets, pose, courseBoard);
    addCourseBoardNotices(signs, pose, courseBoard);
    out.colliders.push(parts.box);
    out.cameraBoxes.push(parts.camera);
  }
  const lettering = signs ? addIslandLettering(id, signs, out.signs) : null;
  await breathe();
  const town = new Group();
  town.name = `${id}-town`;
  const chunkLods = new ChunkLods(chunkLodEdges(o.tier), chunkLodFloor(o.tier));
  const simplify = await loadLodSimplifier();
  const meshes = await meshesFromBuckets(buckets, o.kit, o.tier, o.chunks, town, breathe, true, {
    simplify,
    chunkLods,
    permissive: true,
  });
  group.add(town);
  if (signs?.count) group.add(await signs.finalizeAsync(breathe));
  const lamps = new LampSet(out.lamps, o.kit.materials.glow as Material);
  out.lamps.length = 0;
  if (lamps.mesh) {
    lamps.mesh.updateMatrixWorld(true);
    group.add(lamps.mesh);
  }
  await breathe();
  return {
    lamps,
    circuit: { lamp: (key, look) => lamps.set(key, look), look: (key) => lamps.look(key) },
    show: (what, on, unroll = false) => lettering?.show(what, on, unroll),
    showing: (what) => lettering?.showing(what) ?? false,
    update(dt) {
      if (lettering?.update(dt)) signs!.update();
    },
    frame(camera) {
      chunkLods.update(camera.position.x, camera.position.y, camera.position.z);
    },
    dispose() {
      for (const m of meshes) m.geometry.dispose();
      lamps.dispose();
      lettering?.release();
      signs?.dispose();
    },
  };
}

/**
 * Moves the bright pieces of one bucket to another (brass, bronze and green copper out of the kit's
 * metal, which reads brown under a low sun, into its cloth, which shows the paint): every geometry
 * whose first vertex's paint is brighter than `minLuma` (linear).
 */
export function moveBright(from: BufferGeometry[], to: BufferGeometry[], minLuma: number): void {
  for (let i = from.length - 1; i >= 0; i--) {
    const c = from[i]!.getAttribute('color');
    if (!c || 0.2126 * c.getX(0) + 0.7152 * c.getY(0) + 0.0722 * c.getZ(0) < minLuma) continue;
    to.push(from[i]!);
    from.splice(i, 1);
  }
}

/** Runs a sliced builder to its end, with a breath between its slices. */
export async function runSliced<T>(steps: Generator<unknown, T>, breathe: () => Promise<void>): Promise<T> {
  for (;;) {
    const r = steps.next();
    if (r.done) return r.value;
    await breathe();
  }
}

/** Paints a geometry one colour (the kit's materials read vertex colours). */
export function flatPaint<G extends BufferGeometry>(g: G, hex: number): G {
  const c = new Color(hex);
  const n = g.getAttribute('position').count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new BufferAttribute(a, 3));
  return g;
}

/**
 * Multiplies each geometry's vertex paint by `gain` (linear RGB), each channel capped at `cap`: turns
 * the kit's tan plaster and brown paving toward the colour a piece is painted, before the meshes are
 * made.
 */
export function repaint(
  list: readonly BufferGeometry[],
  gain: readonly [number, number, number],
  cap: number,
): void {
  for (const g of list) {
    const c = g.getAttribute('color') as BufferAttribute | undefined;
    if (!c) continue;
    for (let i = 0; i < c.count; i++)
      c.setXYZ(
        i,
        Math.min(cap, c.getX(i) * gain[0]),
        Math.min(cap, c.getY(i) * gain[1]),
        Math.min(cap, c.getZ(i) * gain[2]),
      );
  }
}

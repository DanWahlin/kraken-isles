import { CylinderGeometry, SphereGeometry, type BufferGeometry } from 'three/webgpu';
import { paint } from '../../village/kit';
import { lanternPaint, rod, type Buckets } from '../../village/pieces';
import { blockHouseBuilder, type BlockHouse } from '../block-house';
import { frameBuilder, makeIslandOut, type IslandOut } from '../frame-build';
import { frameProps } from '../frame-props';
import { flatTriangles } from '../plate-geometry';
import { tidewheelHeight } from './height';
import { FRAME } from './layout';

/**
 * Tidewheel's building helpers (the town, the Works and the Lighthouse share them): the shared frame
 * builders with the island's frame, ground and paints, the basalt-and-brass palette (spec §0 T14), and
 * its own pieces: gears, bells, and forge houses of dark stone with copper roofs, lit windows and a
 * lantern at every door. Every piece goes into the village kit's material buckets (no new shader).
 */

/**
 * What the story shows: the Works' lamps and the pinned drum (the report ran by hand), the clock
 * ring at eight with the Clock Walk's lamps (it is scheduled), the Seal's banners.
 */
export type TwShow = 'ran' | 'scheduled' | 'sealed';

export type TwOut = IslandOut<TwShow>;
export const makeOut = (): TwOut => makeIslandOut<TwShow>();

/** Tidewheel's colours, as vertex paint over the kit's materials. */
export const TW_PAINT = {
  basalt: 0x56524e,
  soot: 0x6a655f,
  ash: 0x858078,
  // The floors are paler than the walls, so a path reads at last light.
  paving: 0x9a948a,
  paleStone: 0x8f897f,
  rubble: 0x4a4744,
  wetStone: 0x2e2c2b,
  timber: 0x9a744e,
  darkTimber: 0x5e4432,
  iron: 0x3c3b3a,
  brass: 0xe0b040,
  bronze: 0xb07a3a,
  // Copper gone green: the roofs, the Lighthouse's cap.
  copper: 0x4f9a86,
  ochre: 0xd89a3a,
  rust: 0xb5532c,
  ember: 0xe8742c,
  canvas: 0xe9ddc6,
  parchment: 0xe2d4b0,
  enamel: 0xf2ead8,
  ink: 0x2a2623,
  // Hot-spring water: milky and pale (it goes in the cloth bucket, whose paint shows as it is).
  water: 0x86b4b0,
  sinter: 0xd8d0b8,
  // The Works' walls (a warm white, so brass and plates read in the wall's shade).
  limewash: 0xe6dcc6,
  leaf: 0x55784a,
  reed: 0x9a8a5a,
} as const;

/** The colours a row of cloth uses in turn (pennants, awnings). */
export const CLOTHS = [TW_PAINT.ochre, TW_PAINT.rust, TW_PAINT.canvas, TW_PAINT.copper] as const;

/** The island's frame builders as one set, for the shared builders that take it whole. */
export const B = frameBuilder<TwShow>(FRAME, tidewheelHeight, {
  iron: TW_PAINT.iron,
  stone: TW_PAINT.paleStone,
  rubble: TW_PAINT.rubble,
  door: TW_PAINT.ochre,
});

export const {
  YAW_U,
  signAt,
  yawAlong,
  at,
  ground,
  groundSpan,
  ubox,
  uvSpan,
  solid,
  rail,
  lowWall,
  flight,
  lampPost,
  hangLantern,
  door,
  windowPane,
} = B;

export { SIGN_CREAM } from '../frame-build';

/** The shared port props in this island's frame and paints. */
export const { awning, pennants, jar, basket, barrel, crate, cart, pave, stationLamps } = frameProps(
  B,
  TW_PAINT,
  CLOTHS,
);

/** The fractions of a tooth's pitch where its outline turns: up its flank, along its tip, down, then the root. */
const TOOTH = [0, 1 / 8, 3 / 8, 4 / 8] as const;

/**
 * A gear as one geometry: a toothed disc of radius `r` (to the teeth's tips) and thickness `thick`
 * in its own XY plane (its axle along z), with a hub and a window between each pair of its spokes (a
 * small gear is a solid disc). Unpainted. Built wedge by wedge about the axle (plate-geometry.ts).
 */
export function gearGeometry(r: number, thick: number, teeth: number, spokes = 5): BufferGeometry {
  const TAU = Math.PI * 2;
  const root = r * 0.86;
  const rim = r * 0.69;
  const hub = r * 0.31;
  const windows = r > 0.5;
  const pitch = TAU / teeth;
  /** Half a spoke's angle. */
  const spoke = 0.2;
  const inSpoke = (a: number) => {
    const t = ((a / TAU) * spokes) % 1;
    return Math.min(t, 1 - t) * (TAU / spokes) < spoke;
  };
  /** The outline's radius at angle `a`. */
  const edge = (a: number) => {
    const f = (a / pitch) % 1;
    if (f <= TOOTH[1]) return root + (r - root) * (f / TOOTH[1]);
    if (f <= TOOTH[2]) return r;
    if (f <= TOOTH[3]) return r + (root - r) * ((f - TOOTH[2]) / (TOOTH[3] - TOOTH[2]));
    return root;
  };
  // Where a wedge may start: every turn of the teeth's outline and every spoke's two edges.
  const cuts: number[] = [];
  for (let k = 0; k < teeth; k++) for (const f of TOOTH) cuts.push((k + f) * pitch);
  if (windows)
    for (let k = 0; k < spokes; k++)
      for (const d of [-spoke, spoke]) cuts.push(((((k / spokes) * TAU + d) % TAU) + TAU) % TAU);
  cuts.sort((x, y) => x - y);
  const angles = cuts.filter((a, i) => i === 0 || a - cuts[i - 1]! > 1e-5);

  const h = thick / 2;
  const { tri, quad, geometry } = flatTriangles();
  const at = (rad: number, a: number, z: number) => [Math.cos(a) * rad, Math.sin(a) * rad, z] as const;
  /** A wall across the gear's thickness between two points of its plan, facing (nx, ny). */
  const wall = (r0: number, a0: number, r1: number, a1: number, nx: number, ny: number) =>
    quad(at(r0, a0, -h), at(r1, a1, -h), at(r1, a1, h), at(r0, a0, h), nx, ny, 0);

  const solid = angles.map((a, i) => {
    const next = angles[(i + 1) % angles.length]! + (i + 1 === angles.length ? TAU : 0);
    return !windows || inSpoke((a + next) / 2);
  });
  for (let i = 0; i < angles.length; i++) {
    const a0 = angles[i]!;
    const a1 = angles[(i + 1) % angles.length]! + (i + 1 === angles.length ? TAU : 0);
    const am = (a0 + a1) / 2;
    const [mx, my] = [Math.cos(am), Math.sin(am)];
    const e0 = edge(a0);
    // (Just short of the next cut, so a tooth's last flank doesn't read the next tooth's foot.)
    const e1 = edge(a1 - 1e-7);
    for (const z of [h, -h]) {
      const n = Math.sign(z);
      if (solid[i]) tri(at(0, 0, z), at(e0, a0, z), at(e1, a1, z), 0, 0, n);
      else {
        tri(at(0, 0, z), at(hub, a0, z), at(hub, a1, z), 0, 0, n);
        quad(at(rim, a0, z), at(e0, a0, z), at(e1, a1, z), at(rim, a1, z), 0, 0, n);
      }
    }
    // The outline; a window's two arcs; and a spoke's side where a window begins or ends.
    wall(e0, a0, e1, a1, mx, my);
    if (!solid[i]) {
      wall(hub, a0, hub, a1, mx, my);
      wall(rim, a0, rim, a1, -mx, -my);
      if (solid[(i + angles.length - 1) % angles.length]) wall(hub, a0, rim, a0, -Math.sin(a0), Math.cos(a0));
      if (solid[(i + 1) % angles.length]) wall(hub, a1, rim, a1, Math.sin(a1), -Math.cos(a1));
    }
  }
  return geometry();
}

/**
 * A standing gear in the metal bucket: its middle at world (x, y, z), its axle turned `yaw` about y
 * from the world's z (so `yaw` 0 faces it along z), tilted `tilt` back.
 */
export function gear(
  b: Buckets,
  x: number,
  y: number,
  z: number,
  r: number,
  thick: number,
  teeth: number,
  yaw: number,
  colour: number,
  tilt = 0,
): BufferGeometry {
  const g = gearGeometry(r, thick, teeth);
  if (tilt) g.rotateX(tilt);
  g.rotateY(yaw);
  g.translate(x, y, z);
  paint(g, colour);
  b.metal.push(g);
  return g;
}

/** A bell hung from world (x, y, z) (its crown), `r` across its mouth, in the metal bucket. */
export function bell(b: Buckets, x: number, y: number, z: number, r: number, colour: number): void {
  const h = r * 1.5;
  const body = new CylinderGeometry(r * 0.42, r, h, 12, 1, true);
  body.translate(x, y - h / 2, z);
  paint(body, colour);
  b.metal.push(body);
  const crown = new SphereGeometry(r * 0.44, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2);
  crown.translate(x, y - 0.02, z);
  paint(crown, colour);
  b.metal.push(crown);
  rod(b, 'metal', { x, y: y - h * 0.5, z }, { x, y: y - h - r * 0.2, z }, r * 0.09, 5, TW_PAINT.iron);
}

/** A forge house: a block house with its door's paint and its dress. */
export interface ForgeHouse extends BlockHouse {
  /** Its door's paint (ochre, rust or copper green). */
  readonly trim: number;
  /** A chimney with smoke on its roof. */
  readonly chimney?: boolean;
  /** A jar of fireweed by its door. */
  readonly jar?: boolean;
}

/** A low parapet of the wall's own stone with a copper coping. */
function parapet(b: Buckets, u: number, v: number, su: number, sv: number, y: number, tint: number): void {
  const t = 0.3;
  const h = 0.4;
  const side = (u0: number, u1: number, v0: number, v1: number) => {
    uvSpan(b, 'plaster', u0, u1, v0, v1, y - 0.02, y + h, tint);
    uvSpan(b, 'metal', u0 - 0.04, u1 + 0.04, v0 - 0.04, v1 + 0.04, y + h, y + h + 0.06, TW_PAINT.copper);
  };
  side(u - su / 2, u + su / 2, v - sv / 2, v - sv / 2 + t);
  side(u - su / 2, u + su / 2, v + sv / 2 - t, v + sv / 2);
  side(u - su / 2, u - su / 2 + t, v - sv / 2 + t, v + sv / 2 - t);
  side(u + su / 2 - t, u + su / 2, v - sv / 2 + t, v + sv / 2 - t);
  // The roof inside it: sheets of green copper.
  uvSpan(
    b,
    'metal',
    u - su / 2 + t,
    u + su / 2 - t,
    v - sv / 2 + t,
    v + sv / 2 - t,
    y - 0.01,
    y + 0.05,
    TW_PAINT.copper,
  );
}

/** A lit window: warm glass in a stone frame (the town's windows glow at last light). */
function litWindow(b: Buckets, u: number, v: number, y: number, fu: number, fv: number): void {
  const yaw = yawAlong(-fv, fu) - YAW_U;
  const g = ubox(b, 'glow', u + fu * 0.02, y, v + fv * 0.02, 0.72, 0.95, 0.08, 0xffffff, yaw);
  lanternPaint(g, 1.5);
  ubox(b, 'stone', u + fu * 0.08, y - 0.54, v + fv * 0.08, 0.95, 0.12, 0.2, TW_PAINT.paleStone, yaw);
  ubox(b, 'stone', u + fu * 0.08, y + 0.54, v + fv * 0.08, 0.95, 0.12, 0.2, TW_PAINT.paleStone, yaw);
  // A glazing bar.
  ubox(b, 'metal', u + fu * 0.07, y, v + fv * 0.07, 0.05, 0.95, 0.03, TW_PAINT.iron, yaw);
}

/**
 * A forge house (spec T14): a block of dark stone on a rubble footing that takes up the slope, a flat
 * copper roof behind a low parapet, a painted door with a hanging lantern over it, lit windows, and
 * (on a two-storey house) a smaller upper room set back from the front. Its roof is a perch.
 */
export const forgeHouse = blockHouseBuilder<ForgeHouse, TwShow>(B, awning, {
  footing: TW_PAINT.rubble,
  wall: 3.3,
  parapetHeight: 0.46,
  parapet,
  door: [1.1, 2.15],
  doorPaint: (h) => h.trim,
  window: litWindow,
  // A stone step at the door.
  threshold(b, { h, base, door: [du, dv] }) {
    const alongU = h.fu === 0;
    ubox(
      b,
      'stone',
      du + h.fu * 0.4,
      base - 0.08,
      dv + h.fv * 0.4,
      alongU ? 1.5 : 0.8,
      0.2,
      alongU ? 0.8 : 1.5,
      TW_PAINT.paleStone,
    );
  },
  // A square chimney at the back of the highest roof: its smoke is the town's.
  crown(b, { h, top }) {
    if (!h.chimney) return undefined;
    const cu = top.u - h.fu * 1.2 + 0.9;
    const cv = top.v - h.fv * 1.2;
    uvSpan(
      b,
      'stone',
      cu - 0.35,
      cu + 0.35,
      cv - 0.35,
      cv + 0.35,
      top.roof - 0.02,
      top.roof + 1.5,
      TW_PAINT.rubble,
    );
    return undefined;
  },
  dress(b, out, { h, base, top, su, sv, door: [du, dv], across }) {
    // A lit window in each end wall: a row's end, or the gap at a stair, shows a home and not a blank block.
    const endU = h.fu === 0 ? 1 : 0;
    for (const s of [-1, 1]) {
      const fu = s * endU;
      const fv = s * (1 - endU);
      litWindow(b, h.u + fu * (su / 2 + 0.01), h.v + fv * (sv / 2 + 0.01), base + 1.7, fu, fv);
    }
    // The door's lantern, on an iron bracket over the lintel.
    const p = at(du + h.fu * 0.55, base + 2.95, dv + h.fv * 0.55);
    const root = at(du + h.fu * 0.05, base + 2.95, dv + h.fv * 0.05);
    rod(b, 'metal', root, p, 0.025, 4, TW_PAINT.iron);
    hangLantern(b, out, p.x, p.y, p.z, yawAlong(h.fu, h.fv));
    if (h.chimney) out.chimneys.push(at(top.u - h.fu * 1.2 + 0.9, top.roof + 1.55, top.v - h.fv * 1.2));
    if (h.jar) {
      const [ju, jv] = across(h.w >= 7 ? 0.7 : 1.6, 0.55);
      jar(b, out, ju, jv, 0.62, TW_PAINT.rust);
    }
  },
  perchOnTop: true,
});

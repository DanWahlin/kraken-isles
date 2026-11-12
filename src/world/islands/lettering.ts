import { islandSign, onCourse } from '../../course/active';
import type { SignSet, PaintedSign } from '../sites/sign';
import type { IslandSign } from './frame-build';

/**
 * An island's lettering in its sign set (one draw with the course board's notices): every sign's
 * words are the pack's, painted now and again whenever a course activates (an `onCourse` hook,
 * released with the world). A sign with no words is hidden; a `show` sign stays hidden until the
 * story shows it, and a hanging one unrolls from its rail. Shared by the islands built on
 * `frame-build.ts` (through `island-works.ts`).
 */

/** How long a hanging cloth takes to unroll (s). */
const UNROLL = 1.6;
/** A cloth that's rolled up: this much of its height shows (its rail's roll). */
const ROLLED = 0.04;

interface Lettered<S extends string> {
  readonly sign: IslandSign<S>;
  readonly board: PaintedSign;
  /** The story's say (a `show` sign), and how far it's unrolled (0-1). */
  on: boolean;
  open: number;
}

/**
 * The island's lettering in `signs` (one draw with the course board's notices): every sign's words are
 * the pack's, painted now and again whenever a course activates (an `onCourse` hook, released with the
 * world). A sign with no words is hidden; a `show` sign stays hidden until the story shows it, and a
 * hanging one unrolls from its rail.
 */
export function addIslandLettering<S extends string>(
  island: string,
  signs: SignSet,
  list: readonly IslandSign<S>[],
) {
  const words = (s: IslandSign<S>) => {
    const lines = s.lines.map((n) => islandSign(island, n));
    return s.wrap ? lines.flatMap((l) => l.split(' ')) : lines;
  };
  // One ink for every line (a wrapped name's lines too).
  const ink = (s: IslandSign<S>, lines: readonly string[]) =>
    s.colors ? lines.map(() => s.colors![0]) : undefined;
  const all: Lettered<S>[] = list.map((s) => {
    const lines = words(s);
    const board = signs.add(lines, s.w, s.h, {
      twoSided: s.twoSided,
      look: s.look,
      fill: s.fill,
      colors: ink(s, lines),
      size: s.size,
      offsetY: s.hang ? -s.h / 2 : 0,
      pixels: s.pixels,
    });
    board.object.position.set(s.x, s.y, s.z);
    board.object.rotation.set(-(s.tilt ?? 0), s.heading, s.roll ?? 0, 'YXZ');
    return { sign: s, board, on: !s.show, open: s.show ? 0 : 1 };
  });
  let moving = true;
  const place = (l: Lettered<S>) => {
    const o = l.board.object;
    const blank = l.sign.lines.some((n) => !islandSign(island, n));
    o.visible = !blank && l.open > 0;
    o.scale.y = l.sign.hang ? ROLLED + (1 - ROLLED) * l.open : 1;
    o.updateMatrix();
  };
  for (const l of all) place(l);
  const release = onCourse(() => {
    for (const l of all) {
      const lines = words(l.sign);
      l.board.redraw(lines, { colors: ink(l.sign, lines) });
      place(l);
    }
    moving = true;
  });
  return {
    show(what: S, on: boolean, unroll: boolean): void {
      for (const l of all) {
        if (l.sign.show !== what) continue;
        l.on = on;
        if (!on || !unroll || !l.sign.hang) l.open = on ? 1 : 0;
        place(l);
      }
      moving = true;
    },
    showing: (what: S) => all.some((l) => l.sign.show === what && l.on),
    /** Unrolls what's on its way; true when a board moved (the set uploads it). */
    update(dt: number): boolean {
      if (!moving) return false;
      let still = true;
      for (const l of all) {
        if (!l.on || l.open >= 1) continue;
        l.open = Math.min(1, l.open + Math.max(dt, 0) / UNROLL);
        place(l);
        still = false;
      }
      moving = !still;
      return true;
    },
    release,
  };
}

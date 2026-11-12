import { SIT } from '../characters/seat-fit';
import type { VillageAnchor } from '../village/kit';
import type { IslandFrameKit, Uv } from './frame';

/**
 * Where things stand on a frame island: anchors for the cast (the contract between the world and the
 * content), cameras, and the stations of its circuits. Plain data and maths (no three.js).
 */

/** The paving's rise over its pad (the builders lay it 3 cm up). */
export const PAVED = 0.03;

/** A camera: where it stands (x, y, z, its heading toward the target) and what it looks at. */
export interface CameraAnchor extends VillageAnchor {
  readonly target: { readonly x: number; readonly y: number; readonly z: number };
}

/** A circuit's station in the world. */
export interface StationSpot {
  /** Where the player stands to use it (island frame) and the walk's height there. */
  u: number;
  v: number;
  y: number;
  /** The lamp that answers for it, in the island's lamp set (`<circuit>:<place>`). */
  lamp: string;
  /** What the camera looks at while it's open (island frame, y). */
  look: { u: number; y: number; v: number };
}

/** A station of `circuit` at `place`: the player stands at (u, v) on floor `y` and looks at (lu, lv), `dy` over it. */
export function stationSpot(
  circuit: string,
  place: string,
  y: number,
  u: number,
  v: number,
  lu: number,
  lv: number,
  dy = 1,
): StationSpot {
  return { u, v, y, lamp: `${circuit}:${place}`, look: { u: lu, y: y + dy, v: lv } };
}

/** The anchor makers for one island: its frame and its ground. */
export function anchorKit(frame: IslandFrameKit, heightAt: (x: number, z: number) => number) {
  const { toWorld, headingBetween } = frame;
  /** An anchor at frame (u, v), `lift` m over the ground there (a paved deck's 3 cm), facing `look`. */
  function anchor(u: number, v: number, look?: Uv, lift = 0): VillageAnchor {
    const p = toWorld(u, v);
    return {
      x: p.x,
      y: heightAt(p.x, p.z) + lift,
      z: p.z,
      heading: look ? headingBetween({ u, v }, look) : 0,
    };
  }
  return {
    anchor,
    /** A station as an anchor: where the player stands, facing what its camera looks at. */
    spotAnchor: (s: StationSpot): VillageAnchor => anchor(s.u, s.v, { u: s.look.u, v: s.look.v }, PAVED),
    /** An anchor raised to the top of a seat block on its floor (seat-fit.ts `SIT.height`). */
    seated: (a: VillageAnchor): VillageAnchor => ({ ...a, y: a.y + SIT.height }),
    /** A camera at frame (u, v), height `y`, looking at (tu, tv) at height `ty`. */
    camera(u: number, v: number, y: number, tu: number, tv: number, ty: number): CameraAnchor {
      const p = toWorld(u, v);
      const t = toWorld(tu, tv);
      return {
        x: p.x,
        y,
        z: p.z,
        heading: headingBetween({ u, v }, { u: tu, v: tv }),
        target: { x: t.x, y: ty, z: t.z },
      };
    },
  };
}

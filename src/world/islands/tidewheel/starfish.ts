import type { StarfishSpot } from '../../starfish/spots';
import { toWorld } from './layout';

/**
 * Tidewheel's five starfish (spec §3): by the quay's water steps, at the bay's head, two on the black
 * sand of the south shore, and one below the hot springs. `y` picks the level where walk surfaces
 * stack.
 */
const SPOTS: readonly { id: string; name: string; u: number; v: number; y?: number }[] = [
  { id: 'sf.t.quay', name: "By the quay's water steps", u: -153, v: 9 },
  { id: 'sf.t.head', name: "At the bay's head", u: -103, v: -20 },
  { id: 'sf.t.beach', name: 'On the black sand', u: -150, v: -110 },
  { id: 'sf.t.far', name: 'Along the south shore', u: -232, v: -176 },
  { id: 'sf.t.springs', name: 'Below the hot springs', u: -266, v: -204 },
];

export const TIDEWHEEL_STARFISH: readonly (Omit<StarfishSpot, 'island'> & { island: 'tidewheel' })[] =
  SPOTS.map((s) => ({
    id: s.id,
    island: 'tidewheel' as const,
    name: s.name,
    ...toWorld(s.u, s.v),
    ...(s.y !== undefined ? { y: s.y } : {}),
  }));

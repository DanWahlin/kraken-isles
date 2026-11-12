import type { StarfishSpot } from '../../starfish/spots';
import { toWorld } from './layout';

/**
 * Inkwell's five starfish (spec §3): by the quay's water steps, at the cove's head, two on the cove's
 * crescent beach, and one in the valley's meadow under the bluff. `y` picks the level where walk
 * surfaces stack. Until the island is in the registry its id isn't an `IslandId`, so the list carries
 * its own.
 */
const SPOTS: readonly { id: string; name: string; u: number; v: number; y?: number }[] = [
  { id: 'sf.i.quay', name: "By the quay's water steps", u: -153, v: 9 },
  { id: 'sf.i.head', name: "At the cove's head", u: -104, v: -22 },
  { id: 'sf.i.beach', name: "On the cove's crescent beach", u: -158, v: -97 },
  { id: 'sf.i.far', name: "At the beach's far end", u: -224, v: -133 },
  { id: 'sf.i.valley', name: "In the valley's meadow", u: -40, v: -24 },
];

export const INKWELL_STARFISH: readonly (Omit<StarfishSpot, 'island'> & { island: 'inkwell' })[] = SPOTS.map(
  (s) => ({
    id: s.id,
    island: 'inkwell' as const,
    name: s.name,
    ...toWorld(s.u, s.v),
    ...(s.y !== undefined ? { y: s.y } : {}),
  }),
);

import type { StarfishSpot } from '../../starfish/spots';
import { toWorld } from './layout';

/**
 * Sunspire's five starfish (spec §3): by the quay's water steps, at the cove's head where the falaj
 * comes in, on the cove's crescent beach, in the first dune's hollow, and on the oasis pool's bank. `y` picks
 * the level where walk surfaces stack. Until the island is in the registry its id isn't an
 * `IslandId`, so the list carries its own.
 */
const SPOTS: readonly { id: string; name: string; u: number; v: number; y?: number }[] = [
  { id: 'sf.s.quay', name: "By the quay's water steps", u: -153, v: 9 },
  { id: 'sf.s.falaj', name: 'Where the falaj meets the cove', u: -103, v: -16 },
  { id: 'sf.s.beach', name: "On the cove's crescent beach", u: -230, v: -128 },
  { id: 'sf.s.dunes', name: "In the first dune's hollow", u: -70, v: -120 },
  { id: 'sf.s.oasis', name: "On the oasis pool's bank", u: -4, v: -18 },
];

export const SUNSPIRE_STARFISH: readonly (Omit<StarfishSpot, 'island'> & { island: 'sunspire' })[] =
  SPOTS.map((s) => ({
    id: s.id,
    island: 'sunspire' as const,
    name: s.name,
    ...toWorld(s.u, s.v),
    ...(s.y !== undefined ? { y: s.y } : {}),
  }));

import type { StarfishSpot } from '../../starfish/spots';
import { toWorld } from './layout';

/**
 * Guildcrest's five starfish (spec §3.10, as built §15): under the quay's slipway, behind the linn's
 * pool, on the cloister's well, at the far mill's foot, and on the pebble shore at the loch's head.
 * `y` picks the level where walk surfaces stack. The registry entry (stage 3) lists them; until the
 * island is in the registry its id isn't an `IslandId`, so the list carries its own.
 */
const SPOTS: readonly { id: string; name: string; u: number; v: number; y?: number }[] = [
  { id: 'sf.g.quay', name: "Under the quay's slipway", u: -153, v: 9.4 },
  { id: 'sf.g.linn', name: "Behind the linn's pool", u: -40, v: 50.5 },
  { id: 'sf.g.garth', name: "By the cloister's well", u: 22, v: 132.8 },
  { id: 'sf.g.mill', name: 'At the foot of the far mill', u: 172.5, v: 168 },
  { id: 'sf.g.cove', name: 'On the pebble shore at the head of the loch', u: -100, v: -30 },
];

export const GUILDCREST_STARFISH: readonly (Omit<StarfishSpot, 'island'> & { island: 'guildcrest' })[] =
  SPOTS.map((s) => ({
    id: s.id,
    island: 'guildcrest' as const,
    name: s.name,
    ...toWorld(s.u, s.v),
    ...(s.y !== undefined ? { y: s.y } : {}),
  }));

import type { WayLeg, WayPoint } from '../../../game/wayfinding/walk-graph';
import type { IslandWays } from '../waypoints';
import { SUNSPIRE_HARBOR as H } from './harbor';
import { sunspireHeight } from './height';
import { HIGH_MESA, LOW_MESA, toWorld } from './layout';

/**
 * Sunspire's routes for the compass (src/game/wayfinding/), in the island frame (spec §3): the quay
 * from the gangway to the caravanserai's gate and its court, the quay lane up to the bazaar square,
 * the path down to the oasis camp, the Signal Stair up the Low Mesa to the Signal House, the Mirror
 * Court (Mirror Beams' stations), the Crate Yard (the Sealed Crate's stations), the Sun Stair up the
 * High Mesa's wall to the Sundial Terrace, and the ways to the beach and the first dune. At sea: the
 * island's coast with the cove open from its mouth to the quay's face, Library Rock, and the lane in.
 */
const nodes: WayPoint[] = [];
const legs: WayLeg[] = [];
/** A waypoint at frame (u, v), on the ground there or at `y` (a deck or a stair). */
const at = (id: string, u: number, v: number, y?: number) => {
  const p = toWorld(u, v);
  nodes.push({ id, x: p.x, y: y ?? sunspireHeight(p.x, p.z), z: p.z });
};
const path = (...ids: string[]) => {
  for (let i = 1; i < ids.length; i++) legs.push([ids[i - 1]!, ids[i]!]);
};
const mesa = LOW_MESA.y + 0.03;
const top = HIGH_MESA.y + 0.03;

// The quay, from Yusuf's stall past the gangway to the water steps.
at('quay.stall', -212, 20, H.deck);
at('quay.gangway', -194, 17, H.deck);
at('quay.landing', -186, 18, H.deck);
at('quay.steps', -156, 14, H.deck);
path('quay.stall', 'quay.gangway', 'quay.landing', 'quay.steps');
// The quay lane: past the caravanserai's gate (Lyra plays in its court) up to the square.
at('lane.1', -172, 30);
at('serai.gate', -162, 38.5);
at('serai.court', -162, 46.5);
at('lane.2', -150, 36);
at('lane.3', -132, 42);
at('square.west', -118, 46);
at('square', -100, 45);
at('square.ne', -82, 60);
at('square.east', -81, 43);
path('quay.landing', 'lane.1', 'lane.2', 'lane.3', 'square.west', 'square', 'square.ne');
path('lane.1', 'serai.gate', 'serai.court');
path('serai.gate', 'lane.2');
path('square', 'square.east');
// The oasis: down from the square's east side to the camp, the well and the pool's bank.
at('oasis.1', -66, 28);
at('oasis.2', -48, 8);
at('camp', -32, -6);
at('well', -37.5, -17);
at('pool.bank', -6, -17);
path('square.east', 'oasis.1', 'oasis.2', 'camp', 'well');
path('camp', 'pool.bank');
// The Signal Stair up the Low Mesa, and the Signal House at its head.
at('stair.foot', -80, 62);
at('stair.1', -50, 84);
at('stair.2', -10, 96);
at('mesa.head', 31.5, 92, mesa);
at('signal.house', 50, 79, mesa);
path('square.ne', 'stair.foot', 'stair.1', 'stair.2', 'mesa.head', 'signal.house');
// The Mirror Court: in by its north gap, round its stations, out by its east side toward the yard.
at('court.north', 72, 76, mesa);
at('court', 80, 63, mesa);
at('court.mirror', 94.5, 60, mesa);
at('court.key', 90, 51.5, mesa);
at('court.tent', 74, 52.5, mesa);
at('court.east', 103.5, 54.5, mesa);
path('signal.house', 'court.north', 'court', 'court.mirror', 'court.key', 'court.tent', 'court');
path('court.key', 'court.east');
path('court.mirror', 'court.east');
// The Crate Yard and the Sun Stair's foot at its north-east corner.
at('yard.nw', 112, 34, mesa);
at('yard', 120, 21, mesa);
at('yard.south', 116, 13, mesa);
at('yard.east', 130, 19, mesa);
at('yard.ne', 133, 30, mesa);
path('court.east', 'yard.nw', 'yard', 'yard.south', 'yard.east', 'yard.ne', 'yard');
// The Sun Stair: up the High Mesa's west wall to the Sundial Terrace.
at('sun.foot', 136, 34, mesa);
at('sun.1', 144, 44, 31);
at('sun.2', 146, 70, 40);
at('sun.3', 146, 96, 50);
at('sun.top', 152, 110, top);
at('sun.head', 165, 104, top);
at('terrace', 173, 99.5, top);
path('yard.ne', 'sun.foot', 'sun.1', 'sun.2', 'sun.3', 'sun.top', 'sun.head', 'terrace');
// The cove's head (where the falaj comes in), its crescent beach, and the first dune's hollow.
at('falaj.1', -70, -18);
at('cove.head', -118, -10);
at('beach.1', -160, -72);
at('beach', -228, -126);
at('dune.1', -52, -52);
at('dune.hollow', -70, -118);
path('oasis.2', 'falaj.1', 'cove.head', 'beach.1', 'beach');
path('camp', 'dune.1', 'dune.hollow');

export const SUNSPIRE_WAYS: IslandWays = {
  walk: { nodes, legs },
  sea: {
    coasts: [
      // Where the island is too shallow for the ship (under 3.1 m), 18 m wider, traced from its height
      // (`npx tsx tools/islands/trace-coast.ts sunspire`), but for the cove's north-east side, which
      // runs on the quay's face: the cove stays open from its mouth to the quay, and the quay is land.
      [
        { x: 6447, z: 2909 },
        { x: 6627, z: 2953 },
        { x: 6767, z: 3033 },
        { x: 6839, z: 3105 },
        { x: 6863, z: 3149 },
        { x: 6919, z: 3193 },
        { x: 6983, z: 3353 },
        { x: 7007, z: 3453 },
        { x: 6987, z: 3553 },
        { x: 6963, z: 3573 },
        { x: 6951, z: 3625 },
        { x: 6887, z: 3717 },
        { x: 6795, z: 3769 },
        { x: 6747, z: 3777 },
        { x: 6707, z: 3833 },
        { x: 6635, z: 3865 },
        { x: 6519, z: 3841 },
        { x: 6471, z: 3817 },
        { x: 6427, z: 3793 },
        { x: 6307, z: 3677 },
        { x: 6279, z: 3625 },
        { x: 6183, z: 3513 },
        { x: 6119, z: 3365 },
        { x: 6103, z: 3285 },
        { x: 6103, z: 3257 },
        { x: 6143, z: 3157 },
        { x: 6191, z: 3117 },
        { x: 6271, z: 3185 },
        { x: 6411, z: 3273 },
        { x: 6443, z: 3281 },
        { x: 6467, z: 3261 },
        { x: 6483.6, z: 3251.0 },
        { x: 6433.0, z: 3183.9 },
        { x: 6413.7, z: 3165.9 },
        { x: 6299, z: 3009 },
        { x: 6319, z: 2981 },
      ],
      // Library Rock.
      [
        { x: 6899, z: 2929 },
        { x: 6935, z: 2937 },
        { x: 6951, z: 2961 },
        { x: 6943, z: 2997 },
        { x: 6915, z: 3009 },
        { x: 6883, z: 3009 },
        { x: 6863, z: 2969 },
        { x: 6875, z: 2941 },
      ],
    ],
    lanes: H.lane.slice(0, 4),
  },
};

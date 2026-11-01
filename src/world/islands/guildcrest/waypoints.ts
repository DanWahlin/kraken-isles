import type { WayLeg, WayPoint } from '../../../game/wayfinding/walk-graph';
import type { IslandWays } from '../waypoints';
import { GUILDCREST_HARBOR as H } from './harbor';
import { guildcrestHeight } from './height';
import { toWorld } from './layout';

/**
 * Guildcrest's routes for the compass (src/game/wayfinding/), in the island frame (spec §3.8, §3.11):
 * the quay from the gangway to the inn, the quay lane up to Guild Square, the Kirk Brae to the abbey's
 * gatehouse, the cloister's walks (the Pattern Book's stations), the east gate and the ridge path to
 * the guildhall yard (the Toolbelt's stations), the track on to the mills, and the tower stair down to
 * the bell tower's terrace. At sea: the island's coast with the loch open from its mouth to the quay's
 * face, and its lane in through the mouth.
 */
const nodes: WayPoint[] = [];
const legs: WayLeg[] = [];
/** A waypoint at frame (u, v), on the ground there or at `y` (a deck or a stair). */
const at = (id: string, u: number, v: number, y?: number) => {
  const p = toWorld(u, v);
  nodes.push({ id, x: p.x, y: y ?? guildcrestHeight(p.x, p.z), z: p.z });
};
const path = (...ids: string[]) => {
  for (let i = 1; i < ids.length; i++) legs.push([ids[i - 1]!, ids[i]!]);
};

// The quay, from Moira's stall past the gangway to the inn's porch (Lyra).
at('quay.stall', -212, 20, H.deck);
at('quay.gangway', -194, 17, H.deck);
at('quay.landing', -186, 18, H.deck);
at('inn', -166, 33);
path('quay.stall', 'quay.gangway', 'quay.landing', 'inn');
// The quay lane up the town to the square's west entrance, then across the square to the Charter Stone.
at('lane.1', -150, 37);
at('lane.2', -130, 41);
at('square.west', -114, 42);
at('square', -104, 49);
at('square.ne', -92, 58);
path('inn', 'lane.1', 'lane.2', 'square.west', 'square');
// The Kirk Brae: from the square's north-east corner, up its flights and switchback to the gatehouse.
at('brae.foot', -76, 58);
at('brae.1', -61, 70);
at('brae.turn', -48, 80);
at('brae.2', -33, 93);
at('gatehouse', -18, 106);
path('square', 'square.ne', 'brae.foot', 'brae.1', 'brae.turn', 'brae.2', 'gatehouse');
// The cloister's walks: in from the gatehouse to the scriptorium's door, then round the garth. The
// west and north walks' lines keep to the arcade's side of their middles: Brigid stands mid-walk on the
// west (8, 121), Ewan and Brother Cuthbert by the north range (v 144.6), and a walker heading straight
// at the next corner stopped head-on against her.
at('gate.w', -17, 118);
at('slype', 0, 118);
at('walk.w', 9, 118);
at('walk.sw', 9, 116);
at('walk.nw', 9, 143.2);
at('walk.ne', 36, 143.2);
at('walk.se', 36, 116);
path(
  'gatehouse',
  'gate.w',
  'slype',
  'walk.w',
  'walk.nw',
  'walk.ne',
  'walk.e',
  'walk.se',
  'walk.sw',
  'walk.w',
);
// Out of the east gate onto the ridge path, up to the guildhall yard.
at('walk.e', 36, 139);
at('east.gate', 42, 139);
at('gate.out', 49, 139.5);
at('ridge.1', 56, 146);
at('ridge.2', 70, 152);
at('yard.west', 78, 154);
at('yard', 92, 156);
at('yard.east', 104, 158);
path('walk.e', 'east.gate', 'gate.out', 'ridge.1', 'ridge.2', 'yard.west', 'yard', 'yard.east');
// The track on to the mills.
at('yard.gap', 104.5, 168.5);
at('track.1', 112, 176);
at('mill.1', 122, 184);
at('track.2', 140, 204);
at('mill.2', 150, 208);
at('mill.3', 172, 176);
path('yard.east', 'yard.gap', 'track.1', 'mill.1', 'track.2', 'mill.2');
path('mill.1', 'mill.3');
// The tower stair: from the yard's west side down past the tower to its terrace.
at('stair.top', 78.5, 146);
at('stair.1', 80, 134.5);
at('stair.land', 78.8, 130);
at('stair.2', 77.6, 125.5);
at('terrace', 72, 120);
path('yard.west', 'stair.top', 'stair.1', 'stair.land', 'stair.2', 'terrace');
// From the brae's switchback east over the moor, across the burn and up the glen to Kenna's seat.
at('glen.w', -10, 86);
at('glen.ford', 12, 62);
at('glen.seat', 40, 24);
path('brae.turn', 'glen.w', 'glen.ford', 'glen.seat');

export const GUILDCREST_WAYS: IslandWays = {
  walk: { nodes, legs },
  sea: {
    coasts: [
      // Where the island is too shallow for the ship (under 3.1 m), 18 m wider, traced from its height
      // (8 m tolerance). The loch stays open from its mouth to the quay's face, and the quay is land.
      [
        { x: 6304, z: 252 },
        { x: 6320, z: 304 },
        { x: 6308, z: 436 },
        { x: 6232, z: 560 },
        { x: 6196, z: 580 },
        { x: 6176, z: 568 },
        { x: 6144, z: 612 },
        { x: 6076, z: 644 },
        { x: 6088, z: 660 },
        { x: 6080, z: 668 },
        { x: 6016, z: 700 },
        { x: 5980, z: 700 },
        { x: 5912, z: 672 },
        { x: 5872, z: 676 },
        { x: 5792, z: 652 },
        { x: 5712, z: 600 },
        { x: 5680, z: 568 },
        { x: 5640, z: 488 },
        { x: 5600, z: 460 },
        { x: 5596, z: 420 },
        { x: 5528, z: 324 },
        { x: 5520, z: 272 },
        { x: 5480, z: 180 },
        { x: 5480, z: 132 },
        { x: 5516, z: 52 },
        { x: 5540, z: 4 },
        { x: 5576, z: -24 },
        { x: 5604, z: -24 },
        { x: 5688, z: 68 },
        { x: 5676, z: 84 },
        { x: 5720, z: 132 },
        { x: 5784, z: 164 },
        { x: 5808, z: 156 },
        { x: 5824, z: 136 },
        { x: 5820, z: 120 },
        { x: 5748, z: 24 },
        { x: 5728, z: 32 },
        { x: 5656, z: -96 },
        { x: 5724, z: -152 },
        { x: 5784, z: -160 },
        { x: 5832, z: -196 },
        { x: 5904, z: -196 },
        { x: 5936, z: -184 },
        { x: 5980, z: -144 },
        { x: 6016, z: -136 },
        { x: 6104, z: -40 },
        { x: 6144, z: -16 },
        { x: 6244, z: 124 },
      ],
    ],
    lanes: H.lane.slice(0, 4),
  },
};

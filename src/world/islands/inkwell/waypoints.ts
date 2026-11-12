import type { WayLeg, WayPoint } from '../../../game/wayfinding/walk-graph';
import type { IslandWays } from '../waypoints';
import { INKWELL_HARBOR as H } from './harbor';
import { inkwellHeight } from './height';
import { COURT, DOME_HEAD, PLAZA, SQUARE, TAVERNA, toWorld } from './layout';

/**
 * Inkwell's routes for the compass (src/game/wayfinding/), in the island frame (spec §3): the quay
 * from the gangway along the lane to the taverna and the Gossip Stair's foot, the three flights and
 * the Washing Square, the Plaza, the Loggia (the Borrowed Board's stations), the Draughting Terrace
 * (Two Hands' stations), the Kite Walk, the Chart Court (the Shared Chart's stations), the Dome Stair
 * to the terrace, and the ways to the cove's beach and the valley's meadow. At sea: the island's
 * coast (the Quills with it) with the cove open from its mouth to the quay's face, and the lane in.
 */
const nodes: WayPoint[] = [];
const legs: WayLeg[] = [];
/** A waypoint at frame (u, v), on the ground there or at `y` (a deck or a stair). */
const at = (id: string, u: number, v: number, y?: number) => {
  const p = toWorld(u, v);
  nodes.push({ id, x: p.x, y: y ?? inkwellHeight(p.x, p.z), z: p.z });
};
const path = (...ids: string[]) => {
  for (let i = 1; i < ids.length; i++) legs.push([ids[i - 1]!, ids[i]!]);
};
const tav = TAVERNA.y + 0.03;
const sq = SQUARE.y + 0.03;
const rim = PLAZA.y + 0.03;
const court = COURT.y + 0.03;
const head = DOME_HEAD.y + 0.03;

// The quay, from Kosta's stall past the gangway to the water steps.
at('quay.stall', -212, 20, H.deck);
at('quay.gangway', -194, 17, H.deck);
at('quay.landing', -186, 18, H.deck);
at('quay.steps', -156, 14, H.deck);
path('quay.stall', 'quay.gangway', 'quay.landing', 'quay.steps');
// The lane along the first terrace: past the taverna's way in (Lyra plays under its pergola) to the
// Gossip Stair's foot.
at('lane.0', -183, 24.5);
at('lane.1', -177, 28.6);
at('lane.2', -164, 30);
at('taverna.way', -150, 31.2);
at('taverna', -150, 36.6, tav);
at('taverna.east', -144.8, 39.6, tav);
at('lane.3', -140, 30);
at('stair.foot', -132, 42);
path('quay.landing', 'lane.0', 'lane.1', 'lane.2', 'taverna.way', 'lane.3', 'stair.foot');
path('taverna.way', 'taverna', 'taverna.east');
// The Gossip Stair: the first flight to the Washing Square, the second to the third terrace, the
// third through the bluff's wall to the Plaza.
at('square.west', -120, 60, sq);
at('square', -112, 60.5, sq);
at('square.east', -104, 62, sq);
at('flight.2', -92, 80);
at('landing.3', -76, 82);
at('flight.3', -64, 100);
at('stair.head', -60, 108);
path('stair.foot', 'square.west', 'square', 'square.east', 'flight.2', 'landing.3', 'flight.3', 'stair.head');
// The Plaza: in by its south side, round the armillary, out to the Loggia, the terrace and the walk.
at('plaza.south', -58, 111, rim);
at('plaza', -51, 117, rim);
at('plaza.west', -63, 129.5, rim);
at('plaza.north', -42, 138.5, rim);
at('plaza.east', -28, 128, rim);
path('stair.head', 'plaza.south', 'plaza', 'plaza.west');
path('plaza', 'plaza.north');
path('plaza', 'plaza.east');
path('plaza.west', 'plaza.north', 'plaza.east');
// The Loggia: its mouth, and inside it before the board.
at('loggia.mouth', -70.5, 132.5, rim);
at('loggia', -78, 134, rim);
at('loggia.board', -84, 134.4, rim);
path('plaza.west', 'loggia.mouth', 'loggia', 'loggia.board');
// The Draughting Terrace.
at('draught.way', -38, 150, rim);
at('draught', -40, 156.5, rim);
at('draught.east', -34, 157.5, rim);
at('draught.west', -45.6, 156.5, rim);
path('plaza.north', 'draught.way', 'draught', 'draught.east');
path('draught', 'draught.west');
// The Kite Walk along the cliff to the Chart Court.
at('walk.1', 20, 140);
at('walk.2', 70, 146);
at('court.west', 111, 138, court);
path('plaza.east', 'walk.1', 'walk.2', 'court.west');
// The Chart Court: round the Great Chart's stations.
at('court.desks', 115.2, 127.5, court);
at('chart', 132, 131, court);
at('court.rail', 132, 140.4, court);
at('court.bells', 149.6, 139, court);
at('court.east', 150, 130, court);
at('court.rack', 149.6, 121, court);
at('court.south', 134, 118, court);
at('court.se', 156.5, 126, court);
path(
  'court.west',
  'court.desks',
  'chart',
  'court.rail',
  'court.bells',
  'court.east',
  'court.rack',
  'court.south',
  'chart',
);
path('court.west', 'court.rail');
path('court.desks', 'court.south');
path('court.east', 'court.se');
path('chart', 'court.east');
// The Dome Stair up the head's wall to the terrace.
at('dome.1', 176, 116);
at('dome.2', 192, 110);
at('dome.top', 200, 104, head);
at('terrace', 205, 101, head);
path('court.se', 'dome.1', 'dome.2', 'dome.top', 'terrace');
// The cove's head and its crescent beach (the nodes keep to dry sand a metre and more over the sea),
// and the valley's meadow.
at('terrace.east', -110, 30);
at('cove.shore', -98, 14);
at('cove.head', -99, -13);
at('beach.1', -105, -36);
at('beach.2', -114, -50);
at('beach.3', -127, -64);
at('beach.4', -142, -80);
at('beach.5', -158, -100);
at('beach.6', -176, -118);
at('beach.7', -198, -128);
at('beach', -222, -136);
at('valley.1', -70, -18);
at('valley', -42, -22);
path(
  'lane.3',
  'terrace.east',
  'cove.shore',
  'cove.head',
  'beach.1',
  'beach.2',
  'beach.3',
  'beach.4',
  'beach.5',
  'beach.6',
  'beach.7',
  'beach',
);
path('cove.head', 'valley.1', 'valley');

export const INKWELL_WAYS: IslandWays = {
  walk: { nodes, legs },
  sea: {
    coasts: [
      // Where the island is too shallow for the ship (under 3.1 m), 18 m wider, traced from its height
      // (`npx tsx tools/islands/trace-coast.ts inkwell`), but for the cove's north-east side, which
      // runs on the quay's face: the cove stays open from its mouth to the quay, and the quay is land.
      // The Quills stand inside it.
      [
        { x: 7108, z: 5788 },
        { x: 7136, z: 5792 },
        { x: 7144, z: 5808 },
        { x: 7140, z: 5836 },
        { x: 7120, z: 5848 },
        { x: 7252, z: 5952 },
        { x: 7284, z: 6004 },
        { x: 7352, z: 6068 },
        { x: 7372, z: 6112 },
        { x: 7408, z: 6080 },
        { x: 7468, z: 6116 },
        { x: 7468, z: 6156 },
        { x: 7488, z: 6188 },
        { x: 7476, z: 6208 },
        { x: 7444, z: 6212 },
        { x: 7476, z: 6268 },
        { x: 7500, z: 6348 },
        { x: 7496, z: 6436 },
        { x: 7480, z: 6508 },
        { x: 7452, z: 6544 },
        { x: 7312, z: 6664 },
        { x: 7216, z: 6668 },
        { x: 7112, z: 6632 },
        { x: 7004, z: 6576 },
        { x: 6952, z: 6480 },
        { x: 6884, z: 6424 },
        { x: 6816, z: 6324 },
        { x: 6748, z: 6148 },
        { x: 6744, z: 6040 },
        { x: 6780, z: 5948 },
        { x: 6796, z: 5940 },
        { x: 6828, z: 5960 },
        { x: 6876, z: 6024 },
        { x: 7000, z: 6108 },
        { x: 7056, z: 6112 },
        { x: 7068, z: 6088 },
        { x: 7088.6, z: 6086.0 },
        { x: 7038.0, z: 6018.9 },
        { x: 7018.7, z: 6000.9 },
        { x: 6908, z: 5852 },
        { x: 6936, z: 5824 },
        { x: 6976, z: 5812 },
        { x: 7084, z: 5828 },
        { x: 7092, z: 5796 },
      ],
    ],
    lanes: H.lane.slice(0, 4),
  },
};

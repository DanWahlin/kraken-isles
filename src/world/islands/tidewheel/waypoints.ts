import type { WayLeg, WayPoint } from '../../../game/wayfinding/walk-graph';
import type { IslandWays } from '../waypoints';
import { TIDEWHEEL_HARBOR as H } from './harbor';
import { tidewheelHeight } from './height';
import { COURT, SQUARE, TERRACE, TERRACES, toWorld, WORKS } from './layout';

/**
 * Tidewheel's routes for the compass (src/game/wayfinding/), in the island frame (spec §3): the quay
 * from the gangway along the lane to the Bandstand and the Lamp Stair's foot, the two flights and Gear
 * Square, Bounty Corner, the Works Stair, the Wheel Works (the Lever's stations), the Clock Walk, the
 * Clock Court (Gears & Bells' stations) and the Bell Arch, the Light Walk to the Lighthouse's terrace,
 * and the way round the bay's head and along the black sand to the hot springs. At sea: the island's
 * coast with the breach and the bay open to the quay's face, and the lane in.
 */
const nodes: WayPoint[] = [];
const legs: WayLeg[] = [];
/** A waypoint at frame (u, v), on the ground there or at `y` (a deck or a stair). */
const at = (id: string, u: number, v: number, y?: number) => {
  const p = toWorld(u, v);
  nodes.push({ id, x: p.x, y: y ?? tidewheelHeight(p.x, p.z), z: p.z });
};
const path = (...ids: string[]) => {
  for (let i = 1; i < ids.length; i++) legs.push([ids[i - 1]!, ids[i]!]);
};
const t1 = TERRACES[0].y + 0.03;
const sq = SQUARE.y + 0.03;
const t3 = TERRACES[2].y + 0.03;
const works = WORKS.y + 0.03;
const court = COURT.y + 0.03;
const light = TERRACE.y + 0.03;

// The quay, from Dot's stall past the gangway to the water steps.
at('quay.west', -230, 16, H.deck);
// (Seaward of the booth: its frame stands on v 18.5 to 23.5.)
at('quay.pass', -213, 15, H.deck);
at('quay.stall', -207, 20.5, H.deck);
at('quay.gangway', -194, 17, H.deck);
at('quay.landing', -186, 18, H.deck);
at('quay.steps', -156, 14, H.deck);
path('quay.west', 'quay.pass', 'quay.gangway', 'quay.landing', 'quay.steps');
path('quay.gangway', 'quay.stall');
// The lane along the first terrace: past the Bandstand (Lyra plays on it) to the Lamp Stair's foot.
at('lane.0', -183, 24.5);
at('lane.1', -177, 28.6);
at('lane.2', -164, 30);
at('band.way', -150, 31.4);
at('band', -150, 34.2, t1);
at('lane.3', -140, 30);
at('stair.foot', -132, 42);
path('quay.landing', 'lane.0', 'lane.1', 'lane.2', 'band.way', 'lane.3', 'stair.foot');
path('band.way', 'band');
// The Lamp Stair: the first flight to Gear Square, the second to the third terrace and Bounty Corner.
at('square.west', -120, 60, sq);
at('square', -112, 60.5, sq);
at('square.east', -104, 62, sq);
at('square.basin', -105.4, 58.2, sq);
at('flight.2', -92, 80, t3);
at('t3.corner', -100, 84, t3);
at('bounty', -109.6, 85.4, t3);
at('works.foot', -118, 88, t3);
path('stair.foot', 'square.west', 'square', 'square.east', 'flight.2', 't3.corner', 'bounty', 'works.foot');
path('square', 'square.basin', 'square.east');
// The Works Stair and the Wheel Works: round the Lever's stations.
at('works.head', -126, 109.4);
at('works.gate', -126, 113.6, works);
at('works.south', -129, 116.4, works);
at('works.lever', -134.5, 119.2, works);
at('works.drum', -146.6, 118.4, works);
at('works.west', -145.6, 125.5, works);
at('works.gear', -144, 129.8, works);
at('works.switch', -137, 129.8, works);
at('works.desk', -130, 129.8, works);
at('works.east', -124.6, 124.2, works);
at('works.log', -125.4, 117.6, works);
path(
  'works.foot',
  'works.head',
  'works.gate',
  'works.south',
  'works.lever',
  'works.drum',
  'works.west',
  'works.gear',
  'works.switch',
  'works.desk',
  'works.east',
  'works.log',
  'works.south',
);
path('works.lever', 'works.switch');
// The Clock Walk along the wall to the Bell Arch and the Clock Court.
at('walk.0', -120.4, 124, works);
at('walk.1', -104, 118);
at('walk.2', -88, 102);
at('walk.3', -76, 78);
at('court.arch', -67.2, 63.4, court);
path('works.east', 'walk.0', 'walk.1', 'walk.2', 'walk.3', 'court.arch');
// The Clock Court: round Gears & Bells' stations.
at('court.north', -66, 57.6, court);
at('court', -66.5, 51.5, court);
at('court.desk', -57, 57.4, court);
at('court.gear', -57.2, 52.6, court);
at('court.pegs', -57, 47.4, court);
at('court.ring', -64.4, 45.1, court);
at('court.log', -74.6, 45.8, court);
at('court.tide', -75.2, 50.6, court);
at('court.bell', -75.2, 56.6, court);
at('court.spy', -74.6, 59.4, court);
path(
  'court.arch',
  'court.north',
  'court.desk',
  'court.gear',
  'court.pegs',
  'court.ring',
  'court.log',
  'court.tide',
  'court.bell',
  'court.spy',
  'court.north',
);
path('court.north', 'court', 'court.ring');
path('court', 'court.tide');
path('court', 'court.gear');
// The Light Walk up to the Lighthouse's terrace.
at('court.south', -66, 41.6, court);
at('light.1', -60, 18);
at('light.2', -54, -4);
at('terrace.head', -50.4, -16.6, light);
at('terrace', -49, -22.5, light);
at('terrace.lever', -46.6, -22.6, light);
at('terrace.west', -54.4, -27.4, light);
path('court.ring', 'court.south', 'light.1', 'light.2', 'terrace.head', 'terrace', 'terrace.lever');
path('court', 'court.south');
path('terrace', 'terrace.west');
// Round the bay's head and along the black sand of the south shore to the hot springs (the nodes keep
// to dry sand a metre and more over the sea).
at('head.1', -112, 22);
at('head.2', -99, 4);
at('head.3', -99, -36);
at('beach.1', -104, -64);
at('beach.2', -118, -82);
at('beach.3', -136, -98);
at('beach.4', -152, -114);
at('beach.5', -172, -132);
at('beach.6', -196, -152);
at('beach.7', -220, -168);
at('beach.8', -244, -182);
at('beach.9', -262, -196);
at('springs', -266.5, -212);
path(
  'lane.3',
  'head.1',
  'head.2',
  'head.3',
  'beach.1',
  'beach.2',
  'beach.3',
  'beach.4',
  'beach.5',
  'beach.6',
  'beach.7',
  'beach.8',
  'beach.9',
  'springs',
);

export const TIDEWHEEL_WAYS: IslandWays = {
  walk: { nodes, legs },
  sea: {
    coasts: [
      // Where the island is too shallow for the ship (under 3.1 m), 18 m wider, traced from its height
      // (`npx tsx tools/islands/trace-coast.ts tidewheel`), but for the bay's north-east side, which
      // runs on the quay's face: the breach and the bay stay open to the quay, and the quay is land.
      [
        { x: 7741, z: 8711 },
        { x: 7833, z: 8711 },
        { x: 7925, z: 8747 },
        { x: 8045, z: 8855 },
        { x: 8109, z: 9003 },
        { x: 8109, z: 9111 },
        { x: 8069, z: 9227 },
        { x: 8005, z: 9303 },
        { x: 7949, z: 9343 },
        { x: 7861, z: 9379 },
        { x: 7781, z: 9395 },
        { x: 7681, z: 9379 },
        { x: 7633, z: 9359 },
        { x: 7569, z: 9303 },
        { x: 7533, z: 9287 },
        { x: 7473, z: 9187 },
        { x: 7437, z: 9107 },
        { x: 7433, z: 9027 },
        { x: 7465, z: 8919 },
        { x: 7501, z: 8851 },
        { x: 7529, z: 8831 },
        { x: 7577, z: 8851 },
        { x: 7617, z: 8895 },
        { x: 7617, z: 8995 },
        { x: 7633, z: 9047 },
        { x: 7693, z: 9119 },
        { x: 7797, z: 9155 },
        { x: 7825, z: 9151 },
        { x: 7857, z: 9123 },
        { x: 7874.6, z: 9112.0 },
        { x: 7824.0, z: 9044.9 },
        { x: 7804.7, z: 9027.0 },
        { x: 7693, z: 8891 },
        { x: 7637, z: 8787 },
        { x: 7641, z: 8735 },
      ],
      // The rock light's skerry.
      [
        { x: 7593, z: 8667 },
        { x: 7625, z: 8695 },
        { x: 7601, z: 8727 },
        { x: 7581, z: 8723 },
        { x: 7569, z: 8703 },
        { x: 7577, z: 8675 },
      ],
    ],
    lanes: H.lane.slice(0, 4),
  },
};

import { marketStall } from './market/stalls';
import { withCourseVoices, type NpcSpec } from './npcs';

/**
 * Tidewheel's cast (Chapter 07), each at their anchor (docs/specs/ISLAND-07-tidewheel-caldera.md §4,
 * the places in src/world/islands/tidewheel/anchors.ts). Scripted in the course's order
 * (tidewheel-quests.ts). Each name holds the speaker word its voice lines use.
 */
export const TIDEWHEEL_NPCS: NpcSpec[] = withCourseVoices([
  { id: 'lyra_tidewheel', body: 'lyra', name: 'Lyra Wren', anchor: 'lyra', clip: 'idle' },
  { id: 'agnes', name: 'Keeper Agnes Voss', anchor: 'agnes', clip: 'idle' },
  { id: 'tobin', name: 'Tobin Marsh', anchor: 'tobin', clip: 'idle' },
  { id: 'ansel', name: 'Wheelwright Ansel Roe', anchor: 'ansel', clip: 'idle', talkRadius: 5.5 },
  { id: 'greta', name: 'Bellmaster Greta Hale', anchor: 'greta', clip: 'idle', talkRadius: 5.5 },
  { id: 'nerys', name: 'Nerys Calder', anchor: 'nerys', clip: 'idle' },
  { id: 'silas', name: 'Old Keeper Silas Thorne', anchor: 'silas', clip: 'idle' },
]);

/**
 * The islanders, with barks from the course pack (`quests/tidewheel.json` → `barks`): Lyra's two
 * players on their blocks on the Bandstand, a net mender and a fisher on the quay, a lamplighter on
 * the lane, a child at the basin on Gear Square, an oiler in the Wheel Works, a ringer in the Clock
 * Court, the springs' keeper by the pools, and a stargazer on the Lighthouse's terrace. Dot keeps the
 * Model Market's booth on the quay (her counter's E is the way to talk shop). Anyone whose anchor
 * isn't there is left out.
 */
export function tidewheelExtras(anchors: Readonly<Record<string, { x: number; z: number }>>): NpcSpec[] {
  const extras: NpcSpec[] = [
    // On their seat blocks (seat-fit.ts: the seat's top is the anchor).
    { id: 'tw_player_a', name: 'Old Hob', anchor: 'lyraPlayerA', clip: 'sit', keepY: true },
    { id: 'tw_player_b', name: 'Sefa', anchor: 'lyraPlayerB', clip: 'sit', keepY: true },
    { id: 'tw_mender', name: 'Netty Gull', anchor: 'extraMender', clip: 'idle' },
    { id: 'tw_fisher', name: 'Long Odo', anchor: 'extraFisher', clip: 'idle' },
    { id: 'tw_lamplighter', name: 'Wick', anchor: 'extraLamplighter', clip: 'idle' },
    { id: 'tw_child', name: 'Little Jory', anchor: 'extraChild', clip: 'idle' },
    { id: 'tw_oiler', name: 'Dabs', anchor: 'extraOiler', clip: 'idle' },
    { id: 'tw_ringer', name: 'Young Corwin', anchor: 'extraRinger', clip: 'idle' },
    { id: 'tw_keeper', name: 'Marta of the Springs', anchor: 'extraKeeper', clip: 'idle' },
    { id: 'tw_stargazer', name: 'Professor Quill', anchor: 'extraStargazer', clip: 'idle' },
  ];
  const stall = marketStall('tidewheel');
  extras.push({
    id: stall.keeper.npc,
    body: 'tw_market',
    name: stall.keeper.name,
    anchor: 'marketKeeper',
    clip: 'idle',
    keepY: true,
  });
  return extras.filter((e) => anchors[e.anchor]);
}

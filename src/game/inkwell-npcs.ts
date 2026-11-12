import { marketStall } from './market/stalls';
import { withCourseVoices, type NpcSpec } from './npcs';

/**
 * Inkwell's cast (Chapter 06), each at their anchor (docs/specs/ISLAND-06-inkwell-bluffs.md §4, the
 * places in src/world/islands/inkwell/anchors.ts). Scripted in the course's order
 * (inkwell-quests.ts). Each name holds the speaker word its voice lines use.
 */
export const INKWELL_NPCS: NpcSpec[] = withCourseVoices([
  { id: 'lyra_inkwell', body: 'lyra', name: 'Lyra Wren', anchor: 'lyra', clip: 'idle' },
  { id: 'thea', name: 'Thea Marinou', anchor: 'thea', clip: 'idle' },
  { id: 'nikos', name: 'Nikos Varga', anchor: 'nikos', clip: 'idle' },
  { id: 'calla', name: 'Envoy Calla Brandt', anchor: 'calla', clip: 'idle', talkRadius: 5.5 },
  { id: 'petra', name: 'Petra Lindqvist', anchor: 'petra', clip: 'idle', talkRadius: 5.5 },
  { id: 'doran', name: 'Chief Cartographer Doran Ashby', anchor: 'doran', clip: 'idle', talkRadius: 5.5 },
  { id: 'iris', name: 'Warden Iris Calloway', anchor: 'iris', clip: 'idle' },
]);

/**
 * The islanders, with barks from the course pack (`quests/inkwell.json` → `barks`): Lyra's two
 * players on their blocks under the pergola, a washerwoman at the fountain, an old fisher on the quay,
 * a porter on the lane, a child with a hoop and a painter on the Plaza, two kite flyers on the Kite
 * Walk, and a surveyor with a glass in the Chart Court. Kosta keeps the Model Market's booth on the
 * quay (his counter's E is the way to talk shop). Anyone whose anchor isn't there is left out.
 */
export function inkwellExtras(anchors: Readonly<Record<string, { x: number; z: number }>>): NpcSpec[] {
  const extras: NpcSpec[] = [
    // On their seat blocks (seat-fit.ts: the seat's top is the anchor).
    { id: 'iw_player_a', name: 'Old Stefan', anchor: 'lyraPlayerA', clip: 'sit', keepY: true },
    { id: 'iw_player_b', name: 'Dalia', anchor: 'lyraPlayerB', clip: 'sit', keepY: true },
    { id: 'iw_washer', name: 'Maro', anchor: 'extraWasher', clip: 'idle' },
    { id: 'iw_fisher', name: 'Barba Yorgo', anchor: 'extraFisher', clip: 'idle' },
    { id: 'iw_porter', name: 'Big Tasso', anchor: 'extraPorter', clip: 'idle' },
    { id: 'iw_child', name: 'Little Zoe', anchor: 'extraChild', clip: 'run', orbit: 2.6, speed: 2.2 },
    { id: 'iw_painter', name: 'Eleni of the Blue Doors', anchor: 'extraPainter', clip: 'idle' },
    { id: 'iw_flyer_a', name: 'Pavlos', anchor: 'extraFlyerA', clip: 'idle' },
    { id: 'iw_flyer_b', name: 'Ansa', anchor: 'extraFlyerB', clip: 'idle' },
    { id: 'iw_surveyor', name: 'Surveyor Kwame', anchor: 'extraSurveyor', clip: 'idle' },
  ];
  const stall = marketStall('inkwell');
  extras.push({
    id: stall.keeper.npc,
    body: 'iw_market',
    name: stall.keeper.name,
    anchor: 'marketKeeper',
    clip: 'idle',
    keepY: true,
  });
  return extras.filter((e) => anchors[e.anchor]);
}

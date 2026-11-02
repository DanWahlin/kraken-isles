import { marketStall } from './market/stalls';
import { withCourseVoices, type NpcSpec } from './npcs';

/**
 * Guildcrest's cast (Chapter 04), each at their anchor (docs/specs/ISLAND-04-guildcrest.md §4.3, the
 * as-built places in src/world/islands/guildcrest/anchors.ts). Scripted in the course's order
 * (guildcrest-quests.ts). Each name holds the speaker word its voice lines use.
 */
export const GUILDCREST_NPCS: NpcSpec[] = withCourseVoices([
  { id: 'lyra_guild', body: 'lyra', name: 'Lyra Wren', anchor: 'lyra', clip: 'idle' },
  { id: 'elspeth', name: 'Reeve Elspeth Galloway', anchor: 'elspeth', clip: 'idle' },
  { id: 'aidan', name: 'Brother Aidan Kerr', anchor: 'aidan', clip: 'idle' },
  { id: 'brigid', name: 'Sister Brigid Moran', anchor: 'brigid', clip: 'idle', talkRadius: 5.5 },
  { id: 'ewan', name: 'Brother Ewan Rhys', anchor: 'ewan', clip: 'idle' },
  { id: 'fergus', name: 'Guildmaster Fergus Munro', anchor: 'fergus', clip: 'idle', talkRadius: 5.5 },
  { id: 'seren', name: 'Abbess Seren Pryce', anchor: 'seren', clip: 'idle' },
]);

/**
 * The islanders, with barks from the course pack (`quests/guildcrest.json` → `barks`): Rory the
 * journeyman in the guildhall yard, Callum and Isla playing by the inn, Wee Ailsa running errands on
 * the square, Brother Cuthbert at the copy desk, Dougie the miller on the mill track, and Kenna the
 * shepherd sitting on the glen. Moira keeps the Model Market's booth on the quay (her counter's E is
 * the way to talk shop). Anyone whose anchor isn't there is left out.
 */
export function guildcrestExtras(anchors: Readonly<Record<string, { x: number; z: number }>>): NpcSpec[] {
  const extras: NpcSpec[] = [
    { id: 'rory', name: 'Rory Baird', anchor: 'rory', clip: 'idle' },
    { id: 'gc_fiddler', name: 'Callum', anchor: 'extraFiddler', clip: 'idle' },
    { id: 'gc_whistler', name: 'Isla', anchor: 'extraWhistler', clip: 'idle' },
    { id: 'gc_kid', name: 'Wee Ailsa', anchor: 'extraKids', clip: 'run', orbit: 2.6, speed: 2.2 },
    { id: 'gc_copyist', name: 'Brother Cuthbert', anchor: 'extraCopyist', clip: 'idle' },
    { id: 'gc_miller', name: 'Dougie the Miller', anchor: 'extraMiller', clip: 'idle' },
    // On her granite seat on the glen (seat-fit.ts: the seat's top is her anchor).
    { id: 'gc_shepherd', name: 'Kenna', anchor: 'extraShepherd', clip: 'sit', keepY: true },
  ];
  const stall = marketStall('guildcrest');
  extras.push({
    id: stall.keeper.npc,
    body: 'gc_market',
    name: stall.keeper.name,
    anchor: 'marketKeeper',
    clip: 'idle',
    keepY: true,
  });
  return extras.filter((e) => anchors[e.anchor]);
}

import { marketStall } from './market/stalls';
import { withCourseVoices, type NpcSpec } from './npcs';

/**
 * Sunspire's cast (Chapter 05), each at their anchor (docs/specs/ISLAND-05-sunspire-sands.md §4, the
 * places in src/world/islands/sunspire/anchors.ts). Scripted in the course's order
 * (sunspire-quests.ts). Each name holds the speaker word its voice lines use.
 */
export const SUNSPIRE_NPCS: NpcSpec[] = withCourseVoices([
  { id: 'lyra_sunspire', body: 'lyra', name: 'Lyra Wren', anchor: 'lyra', clip: 'idle' },
  { id: 'zahra', name: 'Zahra Benali', anchor: 'zahra', clip: 'idle' },
  { id: 'idris', name: 'Idris Okoye', anchor: 'idris', clip: 'idle' },
  { id: 'noor', name: 'Signal Master Noor Haddad', anchor: 'noor', clip: 'idle', talkRadius: 5.5 },
  { id: 'samir', name: 'Samir Castellanos', anchor: 'samir', clip: 'idle', talkRadius: 5.5 },
  { id: 'paloma', name: 'Warden Paloma Reyes', anchor: 'paloma', clip: 'idle' },
]);

/**
 * The islanders, with barks from the course pack (`quests/sunspire.json` → `barks`): Lyra's two
 * players on their blocks under the arcade, a trader and a weaver on the square, a water carrier on
 * the oasis path, a camper by the fire, a signaller in the court, a porter in the yard, a child with
 * a pinwheel, and an old fisher on the quay. Yusuf keeps the Model Market's booth on the quay (his
 * counter's E is the way to talk shop). Anyone whose anchor isn't there is left out.
 */
export function sunspireExtras(anchors: Readonly<Record<string, { x: number; z: number }>>): NpcSpec[] {
  const extras: NpcSpec[] = [
    // On their seat blocks (seat-fit.ts: the seat's top is the anchor).
    { id: 'ss_player_a', name: 'Rahel', anchor: 'lyraPlayerA', clip: 'sit', keepY: true },
    { id: 'ss_player_b', name: 'Old Tomas', anchor: 'lyraPlayerB', clip: 'sit', keepY: true },
    { id: 'ss_trader', name: 'Karim', anchor: 'extraTrader', clip: 'idle' },
    { id: 'ss_weaver', name: 'Leila', anchor: 'extraWeaver', clip: 'idle' },
    { id: 'ss_carrier', name: 'Obi the Carrier', anchor: 'extraCarrier', clip: 'idle' },
    { id: 'ss_camper', name: 'Mateo', anchor: 'extraCamper', clip: 'idle' },
    { id: 'ss_signaller', name: 'Inés of the Mirrors', anchor: 'extraSignaller', clip: 'idle' },
    { id: 'ss_porter', name: 'Big Dario', anchor: 'extraPorter', clip: 'idle' },
    { id: 'ss_child', name: 'Little Sami', anchor: 'extraChild', clip: 'run', orbit: 2.4, speed: 2.2 },
    { id: 'ss_fisher', name: 'Abuelo Rui', anchor: 'extraFisher', clip: 'idle' },
  ];
  const stall = marketStall('sunspire');
  extras.push({
    id: stall.keeper.npc,
    body: 'ss_market',
    name: stall.keeper.name,
    anchor: 'marketKeeper',
    clip: 'idle',
    keepY: true,
  });
  return extras.filter((e) => anchors[e.anchor]);
}

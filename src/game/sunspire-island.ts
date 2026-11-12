import type { SunspireWorld } from '../world/islands/sunspire/index';
import { SUNSPIRE } from '../world/islands/sunspire/layout';
import { SUNSPIRE_BOOTH } from '../world/islands/sunspire/market';
import { createSunspireStream } from '../world/islands/sunspire/stream';
import { SUNSPIRE_WAYS } from '../world/islands/sunspire/waypoints';
import { BOOTH_LAYOUT } from '../world/market-stall/booth';
import { streamedIslandCode } from './streamed-island-code';
import { SUNSPIRE_NPCS, sunspireExtras } from './sunspire-npcs';
import { SUNSPIRE_QUESTS as Q } from './sunspire-quests';
import { createSunspireContent, SUNSPIRE_CHEST_IDS, type SunspireContent } from './sunspire-session';

/**
 * Sunspire Sands' code (Chapter 05; its registry entry is src/islands/sunspire.ts): its stream, its
 * quest line, its quay, courts, stairs and terrace, and its content (src/game/sunspire-session.ts).
 */
export const SUNSPIRE_CODE = streamedIslandCode<SunspireWorld, SunspireContent>({
  id: 'sunspire',
  stream: createSunspireStream,
  chests: SUNSPIRE_CHEST_IDS,
  // The cast and every islander (they all can appear).
  cast: (anchors) => [...SUNSPIRE_NPCS, ...sunspireExtras(anchors)],
  ways: SUNSPIRE_WAYS,
  quests: {
    log: Q.log,
    tracker: Q.tracker,
    nextSail: () => Q.header.nextSail,
    target: Q.target,
    current: Q.current,
    optionalTargets: Q.optionalTargets,
  },
  // Its quay, courts, stairs and terrace.
  bounds: SUNSPIRE.bounds,
  ground: 'stone',
  content: createSunspireContent,
  // Yusuf's stall on the quay.
  market: () => ({ at: SUNSPIRE_BOOTH, layout: BOOTH_LAYOUT }),
});

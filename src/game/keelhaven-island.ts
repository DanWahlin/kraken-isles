import { KEELHAVEN_BOOTH } from '../world/islands/keelhaven/anchors';
import type { KeelhavenWorld } from '../world/islands/keelhaven/index';
import { KEELHAVEN } from '../world/islands/keelhaven/layout';
import { createKeelhavenStream } from '../world/islands/keelhaven/stream';
import { KEELHAVEN_WAYS } from '../world/islands/keelhaven/waypoints';
import { BOOTH_LAYOUT } from '../world/market-stall/booth';
import { KEELHAVEN_NPCS, keelhavenExtras } from './keelhaven-npcs';
import {
  keelhavenCurrent,
  keelhavenLog,
  keelhavenOptionalTargets,
  keelhavenTarget,
  keelhavenTracker,
  KEELHAVEN_TRACKER,
} from './keelhaven-quests';
import { createKeelhavenContent, KEELHAVEN_CHEST_IDS, type KeelhavenContent } from './keelhaven-session';
import { streamedIslandCode } from './streamed-island-code';

/**
 * Keelhaven's code (Chapter 03; its registry entry is src/islands/keelhaven.ts): its stream, its quest
 * line, its quay, copings, gates and stairs, and its content (src/game/keelhaven-session.ts).
 */
export const KEELHAVEN_CODE = streamedIslandCode<KeelhavenWorld, KeelhavenContent>({
  id: 'keelhaven',
  stream: createKeelhavenStream,
  chests: KEELHAVEN_CHEST_IDS,
  // The cast and every islander (they all can appear).
  cast: (anchors) => [...KEELHAVEN_NPCS, ...keelhavenExtras(anchors)],
  ways: KEELHAVEN_WAYS,
  quests: {
    log: keelhavenLog,
    tracker: keelhavenTracker,
    nextSail: () => KEELHAVEN_TRACKER.nextSail,
    target: keelhavenTarget,
    current: keelhavenCurrent,
    optionalTargets: keelhavenOptionalTargets,
  },
  // Its quay, copings, gates' walkways, verandas and the stair.
  bounds: KEELHAVEN.bounds,
  ground: 'stone',
  content: createKeelhavenContent,
  // Bram's stall on the Old Town quay.
  market: () => ({ at: KEELHAVEN_BOOTH, layout: BOOTH_LAYOUT }),
});

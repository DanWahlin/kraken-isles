import type { TidewheelWorld } from '../world/islands/tidewheel/index';
import { TIDEWHEEL } from '../world/islands/tidewheel/layout';
import { TIDEWHEEL_BOOTH } from '../world/islands/tidewheel/market';
import { createTidewheelStream } from '../world/islands/tidewheel/stream';
import { TIDEWHEEL_WAYS } from '../world/islands/tidewheel/waypoints';
import { BOOTH_LAYOUT } from '../world/market-stall/booth';
import { streamedIslandCode } from './streamed-island-code';
import { TIDEWHEEL_NPCS, tidewheelExtras } from './tidewheel-npcs';
import { TIDEWHEEL_QUESTS as Q } from './tidewheel-quests';
import { createTidewheelContent, TIDEWHEEL_CHEST_IDS, type TidewheelContent } from './tidewheel-session';

/**
 * Tidewheel Caldera' code (Chapter 07; its registry entry is src/islands/tidewheel.ts): its stream, its
 * quest line, its quay, terraces, yards, courts and stairs, and its content (src/game/tidewheel-session.ts).
 */
export const TIDEWHEEL_CODE = streamedIslandCode<TidewheelWorld, TidewheelContent>({
  id: 'tidewheel',
  stream: createTidewheelStream,
  chests: TIDEWHEEL_CHEST_IDS,
  // The cast and every islander (they all can appear).
  cast: (anchors) => [...TIDEWHEEL_NPCS, ...tidewheelExtras(anchors)],
  ways: TIDEWHEEL_WAYS,
  quests: {
    log: Q.log,
    tracker: Q.tracker,
    nextSail: () => Q.header.nextSail,
    target: Q.target,
    current: Q.current,
    optionalTargets: Q.optionalTargets,
  },
  // Its quay, terraces, yards, courts and stairs.
  bounds: TIDEWHEEL.bounds,
  ground: 'stone',
  content: createTidewheelContent,
  // Dot's stall on the quay.
  market: () => ({ at: TIDEWHEEL_BOOTH, layout: BOOTH_LAYOUT }),
});

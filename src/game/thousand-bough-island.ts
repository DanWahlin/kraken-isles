import type { ThousandBoughWorld } from '../world/islands/thousand-bough/index';
import { THOUSAND_BOUGH } from '../world/islands/thousand-bough/layout';
import { createThousandBoughStream } from '../world/islands/thousand-bough/stream';
import { THOUSAND_BOUGH_WAYS } from '../world/islands/thousand-bough/waypoints';
import { BOOTH_LAYOUT } from '../world/market-stall/booth';
import { streamedIslandCode } from './streamed-island-code';
import { THOUSAND_BOUGH_NPCS, thousandBoughExtras } from './thousand-bough-npcs';
import {
  THOUSAND_BOUGH_ISLAND,
  thousandBoughCurrent,
  thousandBoughLog,
  thousandBoughOptionalTargets,
  thousandBoughTarget,
  thousandBoughTracker,
} from './thousand-bough-quests';
import { createThousandBoughContent, type ThousandBoughContent } from './thousand-bough-session';

/**
 * Thousand-Bough Isle's code (Chapter 02; its registry entry is src/islands/thousand-bough.ts): its
 * stream, its quest line, its decks and pools, and its content (src/game/thousand-bough-session.ts).
 */
export const THOUSAND_BOUGH_CODE = streamedIslandCode<ThousandBoughWorld, ThousandBoughContent>({
  id: 'thousand-bough',
  stream: createThousandBoughStream,
  chests: [...THOUSAND_BOUGH.chests, ...THOUSAND_BOUGH.bottles].map((c) => c.id),
  // The extras after the Spire's twist too (they all can appear).
  cast: (anchors) => [...THOUSAND_BOUGH_NPCS, ...thousandBoughExtras(anchors, true)],
  ways: THOUSAND_BOUGH_WAYS,
  quests: {
    log: thousandBoughLog,
    tracker: thousandBoughTracker,
    nextSail: () => THOUSAND_BOUGH_ISLAND.nextSail,
    target: thousandBoughTarget,
    current: thousandBoughCurrent,
    optionalTargets: thousandBoughOptionalTargets,
  },
  // Its decks, the stair and its pools.
  bounds: THOUSAND_BOUGH.bounds,
  ground: 'wood',
  content: createThousandBoughContent,
  // Lani's stall on Bough Landing.
  market: (world) => {
    const at = world.anchors.modelMarket;
    return at ? { at, layout: BOOTH_LAYOUT } : null;
  },
});

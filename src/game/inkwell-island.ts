import type { InkwellWorld } from '../world/islands/inkwell/index';
import { INKWELL } from '../world/islands/inkwell/layout';
import { INKWELL_BOOTH } from '../world/islands/inkwell/market';
import { createInkwellStream } from '../world/islands/inkwell/stream';
import { INKWELL_WAYS } from '../world/islands/inkwell/waypoints';
import { BOOTH_LAYOUT } from '../world/market-stall/booth';
import { streamedIslandCode } from './streamed-island-code';
import { INKWELL_NPCS, inkwellExtras } from './inkwell-npcs';
import { INKWELL_QUESTS as Q } from './inkwell-quests';
import { createInkwellContent, INKWELL_CHEST_IDS, type InkwellContent } from './inkwell-session';

/**
 * Inkwell Bluffs' code (Chapter 06; its registry entry is src/islands/inkwell.ts): its stream, its
 * quest line, its quay, terraces, plaza, courts and stairs, and its content (src/game/inkwell-session.ts).
 */
export const INKWELL_CODE = streamedIslandCode<InkwellWorld, InkwellContent>({
  id: 'inkwell',
  stream: createInkwellStream,
  chests: INKWELL_CHEST_IDS,
  // The cast and every islander (they all can appear).
  cast: (anchors) => [...INKWELL_NPCS, ...inkwellExtras(anchors)],
  ways: INKWELL_WAYS,
  quests: {
    log: Q.log,
    tracker: Q.tracker,
    nextSail: () => Q.header.nextSail,
    target: Q.target,
    current: Q.current,
    optionalTargets: Q.optionalTargets,
  },
  // Its quay, terraces, plaza, courts and stairs.
  bounds: INKWELL.bounds,
  ground: 'stone',
  content: createInkwellContent,
  // Kosta's stall on the quay.
  market: () => ({ at: INKWELL_BOOTH, layout: BOOTH_LAYOUT }),
});

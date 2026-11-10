import type { GuildcrestWorld } from '../world/islands/guildcrest/index';
import { GUILDCREST } from '../world/islands/guildcrest/layout';
import { GUILDCREST_BOOTH } from '../world/islands/guildcrest/market';
import { createGuildcrestStream } from '../world/islands/guildcrest/stream';
import { GUILDCREST_WAYS } from '../world/islands/guildcrest/waypoints';
import { BOOTH_LAYOUT } from '../world/market-stall/booth';
import { GUILDCREST_NPCS, guildcrestExtras } from './guildcrest-npcs';
import {
  guildcrestCurrent,
  guildcrestLog,
  guildcrestOptionalTargets,
  guildcrestTarget,
  guildcrestTracker,
  GUILDCREST_TRACKER,
} from './guildcrest-quests';
import { createGuildcrestContent, GUILDCREST_CHEST_IDS, type GuildcrestContent } from './guildcrest-session';
import { streamedIslandCode } from './streamed-island-code';

/**
 * Guildcrest's code (Chapter 04; its registry entry is src/islands/guildcrest.ts): its stream, its
 * quest line, its quay, stairs, terrace and walks, and its content (src/game/guildcrest-session.ts).
 */
export const GUILDCREST_CODE = streamedIslandCode<GuildcrestWorld, GuildcrestContent>({
  id: 'guildcrest',
  stream: createGuildcrestStream,
  chests: GUILDCREST_CHEST_IDS,
  // The cast and every islander (they all can appear).
  cast: (anchors) => [...GUILDCREST_NPCS, ...guildcrestExtras(anchors)],
  ways: GUILDCREST_WAYS,
  quests: {
    log: guildcrestLog,
    tracker: guildcrestTracker,
    nextSail: () => GUILDCREST_TRACKER.nextSail,
    target: guildcrestTarget,
    current: guildcrestCurrent,
    optionalTargets: guildcrestOptionalTargets,
  },
  // Its quay, stairs, terrace and walks.
  bounds: GUILDCREST.bounds,
  ground: 'stone',
  content: createGuildcrestContent,
  // Moira's stall on the quay.
  market: () => ({ at: GUILDCREST_BOOTH, layout: BOOTH_LAYOUT }),
});

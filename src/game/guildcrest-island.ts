import type { IslandCode, IslandContent } from './island-code';
import type { GuildcrestWorld } from '../world/islands/guildcrest/index';
import { createGuildcrestStream } from '../world/islands/guildcrest/stream';
import { GUILDCREST_WAYS } from '../world/islands/guildcrest/waypoints';
import { GUILDCREST_BOOTH } from '../world/islands/guildcrest/market';
import { GUILDCREST } from '../world/islands/guildcrest/layout';
import { BOOTH_LAYOUT } from '../world/market-stall/booth';
import { ISLAND_LIST } from '../islands/registry';
import { islandOpen } from '../islands/open';
import { storyHolds } from './story';
import {
  guildcrestCurrent,
  guildcrestLog,
  guildcrestOptionalTargets,
  guildcrestTarget,
  guildcrestTracker,
  GUILDCREST_TRACKER,
} from './guildcrest-quests';
import { createGuildcrestContent, GUILDCREST_CHEST_IDS, type GuildcrestContent } from './guildcrest-session';
import { GUILDCREST_NPCS, guildcrestExtras } from './guildcrest-npcs';

/** The island Guildcrest's Seal opens (the next in the voyage), once the game has it. */
const NEXT_ISLAND = ISLAND_LIST.find((e) => e.open?.after?.island === 'guildcrest') ?? null;

/** Each session's content, for its walk surfaces (made before the content, read once it's there). */
const own = new WeakMap<IslandContent, GuildcrestContent>();

/**
 * Guildcrest's code (Chapter 04; its registry entry is src/islands/guildcrest.ts): its stream, its
 * quest line, its quay, stairs, terrace and walks, and its content (src/game/guildcrest-session.ts).
 */
export const GUILDCREST_CODE: IslandCode = {
  stream: createGuildcrestStream,
  chests: GUILDCREST_CHEST_IDS,
  // The cast and every islander (they all can appear).
  cast: (anchors) => [...GUILDCREST_NPCS, ...guildcrestExtras(anchors)],
  ways: GUILDCREST_WAYS,
  quests: {
    log: guildcrestLog,
    // The task list points on to the next island once it's open.
    tracker: (q) => {
      const t = guildcrestTracker(q);
      const sail = GUILDCREST_TRACKER.nextSail;
      return sail && NEXT_ISLAND && islandOpen(NEXT_ISLAND.id) ? { ...t, next: sail } : t;
    },
    target: guildcrestTarget,
    current: guildcrestCurrent,
    optionalTargets: guildcrestOptionalTargets,
    hintTask: (q) => guildcrestTracker(q).tasks.find((t) => t.status === 'active' && !t.optional),
    // Once Keelhaven's Seal is won, the compass points on to Guildcrest.
    sailHere: (q) => storyHolds('keelhaven', 'sealed', q),
  },
  // Its quay, stairs, terrace and walks, live once its world has streamed in and its content is up.
  walk: ({ content }) => {
    const gc = () => {
      const c = content();
      return c ? (own.get(c) ?? null) : null;
    };
    return {
      box: GUILDCREST.bounds,
      surfaces: [
        {
          heightAt: (x, z, y) => gc()?.surface.heightAt(x, z, y) ?? null,
          kind: (x, z) => {
            const k = gc()?.surface.kind ?? 'stone';
            return typeof k === 'function' ? k(x, z) : k;
          },
        },
      ],
      inland: (x, z, g, out) => gc()?.inland(x, z, g, out) ?? false,
    };
  },
  content: (host) => {
    const gc = createGuildcrestContent(host);
    const content: IslandContent = {
      get npcs() {
        return gc.npcs;
      },
      owns: (id) => gc.ids.has(id),
      script: (id) => gc.script(id),
      setup: (world) => gc.setup(world as GuildcrestWorld),
      // Moira's stall on the quay.
      market: () => ({ at: GUILDCREST_BOOTH, layout: BOOTH_LAYOUT }),
      bottles: () => gc.bottles(),
      teardown: () => gc.teardown(),
      updateNpcs: (dt, at, eye) => gc.updateNpcs(dt, at, eye),
      update: (dt, t) => gc.update(dt, t),
      debug: gc.debug,
      dispose: () => gc.dispose(),
    };
    own.set(content, gc);
    return content;
  },
};

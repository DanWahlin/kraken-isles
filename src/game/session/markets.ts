import type { Object3D } from 'three/webgpu';
import { puzzleOn } from '../../course/puzzles';
import type { CoveScene } from '../../world/cove-scene';
import { BOOTH_LAYOUT } from '../../world/market-stall/booth';
import type { MarketStallLayout } from '../../world/market-stall/layout';
import { createModelMarketSigns, type ModelMarketSite } from '../../world/sites/model-market';
import type { VillageAnchor } from '../../world/village/kit';
import type { IslandId } from '../arrivals';
import { CATEGORY_PRICE, JOBS as MARKET_JOBS } from '../market/jobs';
import { BOARDS as MARKET_BOARDS } from '../market/models';
import { MARKET_PUZZLE, marketStall } from '../market/stalls';
import { createModelMarket, type MarketHost } from '../puzzles/model-market';
import type { Puzzle } from '../puzzles/types';

export interface MarketsHost {
  scene: Object3D;
  detail: CoveScene['detail'];
  /** Where Anchorage's stall stands on the quay (it's built with the world), if the village has one. */
  anchor: VillageAnchor | undefined;
  market: MarketHost;
  /** The session's puzzles: each stall's market joins them while its island's in. */
  puzzles: Puzzle[];
}

/**
 * The Model Market's stalls (docs/specs/MODEL-MARKET.md): Anchorage's, which is the session's from
 * the start, and each streamed island's, which comes and goes with the island.
 */
export type Markets = ReturnType<typeof createMarkets>;

export function createMarkets(host: MarketsHost) {
  const { scene, detail, puzzles } = host;
  /**
   * A Model Market stall's lettering (its boards, plaques and job notes) at its island's anchor; the
   * stall itself is part of the island's town (docs/specs/MODEL-MARKET.md §2).
   */
  function marketSigns(origin: VillageAnchor, layout: MarketStallLayout, island: IslandId): ModelMarketSite {
    return createModelMarketSigns({
      origin,
      layout,
      keeper: marketStall(island).keeper.name,
      boards: MARKET_BOARDS.map((b) => ({
        category: b.category,
        price: CATEGORY_PRICE[b.category],
        names: b.shown.map((m) => m.name),
        more: b.more.length,
      })),
      jobs: MARKET_JOBS.map((j) => ({ id: j.id, note: j.note, size: j.size })),
      done: [],
    });
  }
  // Anchorage's stall on the quay (built with the world, so its market is the session's from the start;
  // it sleeps with the island's cast).
  const anchorageMarket =
    host.anchor && puzzleOn(MARKET_PUZZLE) ? marketSigns(host.anchor, BOOTH_LAYOUT, 'anchorage') : null;
  /** The market stalls' lettering besides Port Meridian's (freed with the session, or with their island). */
  const marketSites: ModelMarketSite[] = [];
  if (anchorageMarket) {
    marketSites.push(anchorageMarket);
    scene.add(anchorageMarket.group);
    detail.anchorage.add(anchorageMarket.group);
    puzzles.push(createModelMarket(host.market, anchorageMarket, marketStall('anchorage')));
  }

  /** Each streamed island's Model Market stall (its lettering and market), while the island's in. */
  const islandMarkets = new Map<IslandId, { site: ModelMarketSite; puzzle: Puzzle }>();
  const addIslandMarket = (id: IslandId, stall: { at: VillageAnchor; layout: MarketStallLayout } | null) => {
    if (islandMarkets.has(id) || !stall || !puzzleOn(MARKET_PUZZLE)) return null;
    const site = marketSigns(stall.at, stall.layout, id);
    site.group.visible = false;
    scene.add(site.group);
    detail[id].add(site.group);
    marketSites.push(site);
    const puzzle = createModelMarket(host.market, site, marketStall(id));
    puzzles.push(puzzle);
    islandMarkets.set(id, { site, puzzle });
    return site.group;
  };
  const removeIslandMarket = (id: IslandId) => {
    const m = islandMarkets.get(id);
    if (!m) return;
    islandMarkets.delete(id);
    const { site, puzzle } = m;
    puzzles.splice(puzzles.indexOf(puzzle), 1);
    puzzle.dispose();
    marketSites.splice(marketSites.indexOf(site), 1);
    site.group.removeFromParent();
    site.dispose();
  };

  return {
    /** Anchorage's stall lettering (it sleeps with the island's cast), or null without one. */
    anchorage: (anchorageMarket?.group ?? null) as Object3D | null,
    /** A streamed island's stall, hidden until its island is shown; null when it has none. */
    add: addIslandMarket,
    remove: removeIslandMarket,
    dispose(): void {
      for (const site of marketSites) {
        site.group.removeFromParent();
        site.dispose();
      }
    },
  };
}

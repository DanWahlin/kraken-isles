import type { IslandChartTerrain } from '../../../islands/types';
import { guildcrestHeight, guildcrestMasks } from './height';

/**
 * Guildcrest's terrain for its 3D chart miniature (loaded on demand by its registry entry). The chart
 * reads its coarse chart pack (`guildcrest/chart`); these only fill in past that pack's edge.
 */
export const GUILDCREST_CHART_TERRAIN: IslandChartTerrain = {
  height: guildcrestHeight,
  masks: guildcrestMasks,
};

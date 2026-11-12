import type { IslandChartTerrain } from '../../../islands/types';
import { sunspireHeight, sunspireMasks } from './height';

/**
 * Sunspire's terrain for its 3D chart miniature (loaded on demand by its registry entry). The chart
 * reads its coarse chart pack (`sunspire/chart`); these only fill in past that pack's edge.
 */
export const SUNSPIRE_CHART_TERRAIN: IslandChartTerrain = {
  height: sunspireHeight,
  masks: sunspireMasks,
};
